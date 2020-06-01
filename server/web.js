import http from "http";
import EventEmitter from "events";
import Arena from "./arena.js";
import createApp from "./app.js";
import Conduit from "./conduit.js";
import Sockets from "./sockets.js";

export default class Web extends EventEmitter {
  constructor({ redis, games, logger }) {
    super();

    this.redis = redis;
    this.games = games;
    this.logger = logger;

    this.app = createApp({ games: this.games, logger: this.logger });
    this.arena = new Arena({ redis: this.redis, games: this.games });
    this.server = http.createServer(this.app);
    this.conduit = new Conduit({ redis: this.redis });
    this.sockets = new Sockets({ server: this.server });

    this.sockets.on("connect", (player) => {
      this.logger.info({ player }, "player connected");
    });

    this.sockets.on("disconnect", async (player) => {
      this.logger.info({ player }, "player disconnected");
      await this.arena.part(player, "Player left the game.");
    });

    this.sockets.on("command", async (player, command) => {
      this.logger.debug({ player, command }, "player sent command");
      try {
        switch (command.action) {
          case "join":
            return await this.arena.join(
              player,
              command.game,
              this.conduit.channel
            );
          case "move":
            return await this.arena.move(player, command.move);
          default:
            throw new Error("invalid command");
        }
      } catch (err) {
        this.logger.error(err);
        this.sockets.send(player, { error: "unable to perform command" });
      }
    });

    this.arena.on("command", (channel, player, command) => {
      this.logger.trace({ channel, player, command }, "sending command");
      this.conduit.send(channel, player, command);
    });

    this.conduit.on("command", (player, command) => {
      this.logger.trace({ player, command }, "relaying command");
      this.sockets.send(player, command);
    });

    this.server.on("close", () => {
      this.logger.info("http server closing");
    });
  }

  listen() {
    const port = process.env.PORT || 3000;
    this.server.listen(port, async () => {
      const { port } = this.server.address();
      this.logger.info({ port }, "http server listening");
      for (const signal of ["SIGINT", "SIGQUIT", "SIGTERM"]) {
        process.on(signal, async () => {
          await this.close();
        });
      }
    });
  }

  async close() {
    if (this.closing) return;
    this.closing = true;
    this.logger.info("closing http server");
    for (const id of this.sockets.clients.keys()) {
      await this.arena.part(id, "Server shutting down.");
    }
    await this.sockets.close();
    this.server.close(() => {
      process.exit();
    });
  }
}
