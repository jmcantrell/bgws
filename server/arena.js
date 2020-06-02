import EventEmitter from "events";
import { createPlayer, createMatch, addMove } from "../server/game.js";

export default class Arena extends EventEmitter {
  constructor({ redis, games }) {
    super();
    this.redis = redis;
    this.games = games;
  }

  async clear() {
    const keys = ["joined", "players", "matches"];
    for (const gameID of this.games.keys()) {
      keys.push(this.getQueue(gameID));
    }
    const deletes = keys.map((key) => this.redis.del(key));
    return await Promise.all(deletes);
  }

  async listen() {
    setImmediate(async () => {
      await this.sortNextPlayer();
      await this.listen();
    });
  }

  async sortNextPlayer() {
    const playerID = await this.nextPlayer();
    const player = await this.getPlayer(playerID);
    if (player && player.game) {
      await this.sortPlayer(player.game, playerID);
      const players = await this.matchPlayers(player.game);
      if (players) {
        await this.startMatch(player.game, players);
      }
    }
  }

  async nextPlayer() {
    const res = await this.redis.brpop("joined", 0);
    return res[1];
  }

  async sortPlayer(gameID, playerID) {
    const queue = this.getQueue(gameID);
    return await this.redis.lpush(queue, playerID);
  }

  async nextWaitingPlayer(gameID) {
    const queue = this.getQueue(gameID);
    return await this.redis.rpop(queue);
  }

  async numWaitingPlayers(gameID) {
    const queue = this.getQueue(gameID);
    return await this.redis.llen(queue);
  }

  async matchPlayers(gameID) {
    const game = this.games.get(gameID);
    const count = await this.numWaitingPlayers(gameID);
    if (count >= game.numPlayers) {
      const playerIDs = [];
      for (let i = 0; i < game.numPlayers; i++) {
        playerIDs.push(await this.nextWaitingPlayer(gameID));
      }
      return await this.getPlayers(playerIDs);
    }
  }

  async startMatch(gameID, players) {
    // If any players disconnected before this point, their player data
    // will be missing, so re-queue the other players;
    if (players.includes(null)) {
      for (const player of players) {
        if (player) await this.addPlayer(player.id);
      }
      return;
    }
    const game = this.games.get(gameID);
    const match = createMatch(game, players);

    await this.savePlayers(players);
    await this.saveMatch(match);
    await this.update(match, players);

    this.emit("match", game.id, match.id, match.players);
  }

  async join(playerID, gameID, channel) {
    if (!this.games.has(gameID)) {
      throw new Error("game does not exist");
    }
    if (await this.getPlayer(playerID)) {
      throw new Error("player has already joined a game");
    }
    const player = createPlayer(playerID, gameID, channel);
    await this.savePlayer(player);
    await this.addPlayer(playerID);
  }

  async move(playerID, move) {
    const player = await this.getPlayer(playerID);
    if (!player) {
      throw new Error("player does not exist");
    }
    if (!player.match) {
      throw new Error("player is not in a match");
    }
    const match = await this.getMatch(player.match);
    if (!match) {
      throw new Error("match does not exist");
    }
    const game = this.games.get(match.game);
    addMove(game, match, player, move);
    await this.saveMatch(match);
    const players = await this.getPlayers(match.players);
    await this.update(match, players);
  }

  async part(playerID, reason) {
    const player = await this.getPlayer(playerID);
    if (player) {
      if (player.match) {
        const match = await this.getMatch(player.match);
        if (match) {
          if (!match.state.finished) {
            const players = await this.getPlayers(match.players);
            const command = { action: "end", reason };
            for (const player of players) {
              this.emit("command", player.channel, player.id, command);
            }
          }
          await this.deleteMatch(match.id);
        }
      }
      await this.deletePlayer(playerID);
    }
  }

  update(match, players) {
    for (const player of players) {
      this.emit("command", player.channel, player.id, {
        action: "update",
        player: player.index,
        state: match.state,
      });
    }
  }

  getQueue(gameID) {
    return `waiting:${gameID}`;
  }

  async getMatch(matchID) {
    const value = await this.redis.hget("matches", matchID);
    return value ? JSON.parse(value) : null;
  }

  async saveMatch(match) {
    const value = JSON.stringify(match);
    return await this.redis.hset("matches", match.id, value);
  }

  async deleteMatch(matchID) {
    return await this.redis.hdel("matches", matchID);
  }

  async addPlayer(playerID) {
    return await this.redis.lpush("joined", playerID);
  }

  async getPlayer(playerID) {
    const value = await this.redis.hget("players", playerID);
    return value ? JSON.parse(value) : null;
  }

  async getPlayers(playerIDs) {
    return await Promise.all(playerIDs.map((id) => this.getPlayer(id)));
  }

  async savePlayer(player) {
    const value = JSON.stringify(player);
    return await this.redis.hset("players", player.id, value);
  }

  async savePlayers(players) {
    return await Promise.all(players.map((player) => this.savePlayer(player)));
  }

  async deletePlayer(playerID) {
    return await this.redis.hdel("players", playerID);
  }
}
