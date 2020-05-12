const uuid = require("uuid");
const EventEmitter = require("events");
const { promisify } = require("util");
const games = require("./games");

class Arena extends EventEmitter {
  constructor({ redis }) {
    super();
    this.redis = redis;
    this.brpop = promisify(redis.brpop).bind(redis);
    this.del = promisify(redis.del).bind(redis);
    this.hdel = promisify(redis.hdel).bind(redis);
    this.hget = promisify(redis.hget).bind(redis);
    this.hset = promisify(redis.hset).bind(redis);
    this.llen = promisify(redis.llen).bind(redis);
    this.lpush = promisify(redis.lpush).bind(redis);
    this.publish = promisify(redis.publish).bind(redis);
    this.rpop = promisify(redis.rpop).bind(redis);
  }

  async listen() {
    setImmediate(async () => {
      const res = await this.brpop("joined", 0);
      const playerID = res[1];
      const player = await this.getPlayer(playerID);
      if (player) {
        const game = games.get(player.game);
        const waiting = `waiting:${player.game}`;
        const count = await this.llen(waiting);
        if (count >= game.numPlayers - 1) {
          const playerIDs = [];
          for (let i = 0; i < game.numPlayers - 1; i++) {
            playerIDs.push(await this.rpop(waiting));
          }
          const players = await this.getPlayers(playerIDs);
          players.push(player);
          const match = game.createMatch();
          match.id = uuid.v4();
          match.game = player.game;
          match.start = Date.now();
          match.players = [];
          for (let i = 0; i < players.length; i++) {
            const player = players[i];
            player.index = i;
            player.match = match.id;
            player.piece = game.pieces[i];
            match.players.push(player.id);
            await this.savePlayer(player);
          }
          this.emit("match", player.game, match.id, match.players);
          await this.saveMatch(match);
          await this.updatePlayers(game, match, players);
        } else {
          await this.lpush(waiting, playerID);
        }
      }
      await this.listen();
    });
  }

  async clear() {
    await this.del("joined");
    await this.del("players");
    for (const gameID of games.keys()) {
      await this.del(`waiting:${gameID}`);
    }
  }

  async join(playerID, gameID, channel) {
    const player = { id: playerID, game: gameID, channel };
    await this.savePlayer(player);
    await this.lpush("joined", playerID);
    this.emit("join", player);
  }

  async command(playerID, command) {
    const player = await this.getPlayer(playerID);
    if (!player) {
      throw new Error("unable to find player");
    }
    const match = await this.getMatch(player.match);
    if (!match) {
      throw new Error("unable to find match");
    }
    const game = games.get(player.game);
    game.command(match, player, command);
    await this.saveMatch(match);
    const players = await this.getPlayers(match.players);
    await this.updatePlayers(game, match, players);
  }

  async close(playerID) {
    const player = await this.getPlayer(playerID);
    if (player) {
      if (player.match) {
        const match = await this.getMatch(player.match);
        if (match) {
          if (!match.finished) {
            const players = await this.getPlayers(match.players);
            const command = {
              action: "end",
              reason: `player ${player.index + 1} left the match`,
            };
            await Promise.all(players.map((p) => this.send(p, command)));
          }
          await this.hdel("matches", match.id);
        }
      }
      await this.hdel("players", playerID);
    }
  }

  async updatePlayers(game, match, players) {
    await Promise.all(
      players.map((player) => {
        const state = game.getState(match, player.piece);
        return this.send(player, { action: "update", state });
      })
    );
  }

  async send(player, command) {
    const message = JSON.stringify({ id: player.id, data: command });
    await this.publish(player.channel, message);
  }

  async getMatch(matchID) {
    const value = await this.hget("matches", matchID);
    return value ? JSON.parse(value) : null;
  }

  async saveMatch(match) {
    const value = JSON.stringify(match);
    await this.hset("matches", match.id, value);
  }

  async getPlayer(id) {
    const value = await this.hget("players", id);
    return value ? JSON.parse(value) : null;
  }

  async getPlayers(playerIDs) {
    return await Promise.all(playerIDs.map((id) => this.getPlayer(id)));
  }

  async savePlayer(player) {
    const value = JSON.stringify(player);
    await this.hset("players", player.id, value);
  }
}

module.exports = Arena;
