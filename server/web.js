import http from "http";
import EventEmitter from "events";
import createApp from "./app.js";
import Arena from "./arena.js";
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

    this.sockets.on("connect", (client) => {
      this.logger.info({ client }, "player connected");
    });

    this.sockets.on("disconnect", async (client) => {
      this.logger.info({ client }, "player disconnected");
      await this.arena.part(client, "Player left the game.");
    });

    this.sockets.on("command", async (client, command) => {
      this.logger.debug({ client, command }, "player sent command");
      try {
        switch (command.action) {
          case "join":
            return await this.arena.join(
              client,
              command.game,
              this.conduit.channel
            );
          case "move":
            return await this.arena.move(client, command.move);
          default:
            throw new Error("invalid command");
        }
      } catch (err) {
        this.logger.error(err);
        this.sockets.send(client, { error: "unable to perform command" });
      }
    });

    this.arena.on("command", async (channel, client, command) => {
      this.logger.trace({ channel, client, command }, "relaying command");
      await this.conduit.send(channel, client, command);
    });

    this.arena.on("error", (err) => {
      this.logger.error(err);
    });

    this.conduit.on("command", (client, command) => {
      this.logger.trace({ client, command }, "sending command to client");
      this.sockets.send(client, command);
    });

    this.server.on("close", async () => {
      this.logger.info("http server closing");
    });
  }

  listen() {
    this.server.listen(process.env.PORT, async () => {
      const { port } = this.server.address();
      this.logger.info({ port }, "http server listening");
    });
  }

  async close() {
    const command = { action: "end", reason: "Server shutting down." };
    for (const id of this.sockets.clients.keys()) {
      this.sockets.send(id, command);
    }
    await this.sockets.close();
    await new Promise((resolve) => {
      this.server.close(resolve);
    });
  }
}
