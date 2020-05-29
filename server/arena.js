import EventEmitter from "events";
import { createMatch, addMove } from "./match.js";

export default class Arena extends EventEmitter {
  constructor({ redis, games }) {
    super();
    this.redis = redis;
    this.games = games;
  }

  clear() {
    return new Promise((resolve, reject) => {
      this.redis.del("joined");
      this.redis.del("players");
      this.redis.del("matches");
      this.redis.keys("waiting:*", (err, keys) => {
        if (err) return reject(err);
        for (const key of keys) {
          this.redis.del(key);
        }
      });
      return resolve();
    });
  }

  async listen() {
    setImmediate(async () => {
      await this.sortNextPlayer();
      await this.listen();
    });
  }

  async sortNextPlayer() {
    try {
      const playerID = await this.nextPlayer();
      const player = await this.getPlayer(playerID);
      if (!player) throw new Error("player disappeared");
      const gameID = player.game;
      await this.sortPlayer(gameID, playerID);
      const players = await this.matchPlayers(gameID);
      if (players) await this.startMatch(gameID, players);
    } catch (err) {
      this.emit("error", err);
    }
  }

  nextPlayer() {
    return new Promise((resolve, reject) => {
      this.redis.brpop("joined", 0, (err, res) => {
        if (err) return reject(err);
        return resolve(res[1]);
      });
    });
  }

  sortPlayer(gameID, playerID) {
    const waiting = `waiting:${gameID}`;
    return new Promise((resolve, reject) => {
      this.redis.lpush(waiting, playerID, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  nextWaitingPlayer(gameID) {
    const waiting = `waiting:${gameID}`;
    return new Promise((resolve, reject) => {
      this.redis.rpop(waiting, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  numWaitingPlayers(gameID) {
    const waiting = `waiting:${gameID}`;
    return new Promise((resolve, reject) => {
      this.redis.llen(waiting, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
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
    const player = this.createPlayer(playerID, gameID, channel);
    await this.savePlayer(player);
    await this.addPlayer(playerID);
  }

  async move(playerID, move) {
    const player = await this.getPlayer(playerID);
    if (!player) {
      throw new Error("unable to find player");
    }
    const match = await this.getMatch(player.match);
    if (!match) {
      throw new Error("unable to find match");
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
            await this.broadcast(players, command);
          }
          await this.deleteMatch(match.id);
        }
      }
      await this.deletePlayer(playerID);
    }
  }

  update(match, players) {
    return this.broadcast(players, { action: "update", state: match.state });
  }

  send(player, command) {
    command.player = player.index;
    const message = JSON.stringify({ id: player.id, command });
    return new Promise((resolve, reject) => {
      this.redis.publish(player.channel, message, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  broadcast(players, command) {
    return Promise.all(players.map((p) => this.send(p, command)));
  }

  getMatch(matchID) {
    return new Promise((resolve, reject) => {
      this.redis.hget("matches", matchID, (err, res) => {
        if (err) return reject(err);
        return resolve(res ? JSON.parse(res) : null);
      });
    });
  }

  saveMatch(match) {
    const value = JSON.stringify(match);
    return new Promise((resolve, reject) => {
      this.redis.hset("matches", match.id, value, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  deleteMatch(matchID) {
    return new Promise((resolve, reject) => {
      this.redis.hdel("matches", matchID, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  createPlayer(playerID, gameID, channel) {
    return { id: playerID, game: gameID, channel };
  }

  addPlayer(playerID) {
    return new Promise((resolve, reject) => {
      this.redis.lpush("joined", playerID, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  getPlayer(playerID) {
    return new Promise((resolve, reject) => {
      this.redis.hget("players", playerID, (err, res) => {
        if (err) return reject(err);
        return resolve(res ? JSON.parse(res) : null);
      });
    });
  }

  getPlayers(playerIDs) {
    return Promise.all(playerIDs.map((id) => this.getPlayer(id)));
  }

  savePlayer(player) {
    const value = JSON.stringify(player);
    return new Promise((resolve, reject) => {
      this.redis.hset("players", player.id, value, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }

  savePlayers(players) {
    return Promise.all(players.map((player) => this.savePlayer(player)));
  }

  deletePlayer(playerID) {
    return new Promise((resolve, reject) => {
      this.redis.hdel("players", playerID, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }
}
