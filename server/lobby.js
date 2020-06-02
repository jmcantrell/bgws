import EventEmitter from "events";
import Arena from "./arena.js";
import Conduit from "./conduit.js";

export default class Lobby extends EventEmitter {
  constructor({ redis, games, logger }) {
    super();

    this.redis = redis;
    this.games = games;
    this.logger = logger;

    this.arena = new Arena({ redis: this.redis, games: this.games });
    this.conduit = new Conduit({ redis: this.redis });

    this.arena.on("match", (game, match, players) => {
      this.logger.info({ game, match, players }, "match started");
    });

    this.arena.on("command", (channel, player, command) => {
      this.logger.trace({ channel, player, command }, "sending command");
      this.conduit.send(channel, player, command);
    });

    this.arena.on("error", (err) => {
      this.logger.error(err);
    });
  }

  async listen() {
    this.logger.info("waiting for players");
    await this.arena.clear();
    await this.arena.listen();
  }
}
