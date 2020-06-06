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

    this.arena.on("match", (game, match, clients) => {
      this.logger.info({ game, match, clients }, "match started");
    });

    this.arena.on("command", async (channel, client, command) => {
      this.logger.trace({ channel, client, command }, "sending command");
      await this.conduit.send(channel, client, command);
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
