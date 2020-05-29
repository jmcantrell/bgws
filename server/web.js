import http from "http";
import Arena from "./arena.js";
import CommandServer from "./commands.js";
import createApp from "./app.js";
import { logger } from "./logger.js";

export default async function start({ redis, games }) {
  const app = createApp({ games });
  const server = http.createServer(app);
  const arena = new Arena({ redis, games });
  const commands = new CommandServer({ redis, server });

  commands.on("connect", (player) => {
    logger.info({ player }, "player connected");
  });

  commands.on("disconnect", async (player) => {
    logger.info({ player }, "player disconnected");
    await arena.part(player, "Player left the game.");
  });

  commands.on("command", async (player, command) => {
    logger.debug({ player, command }, "player sent command");
    try {
      switch (command.action) {
        case "join":
          return await arena.join(player, command.game, commands.channel);
        case "move":
          return await arena.move(player, command.move);
        default:
          throw new Error("invalid command");
      }
    } catch (err) {
      logger.error(err);
      commands.send(player, { error: "unable to perform command" });
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    const { port } = server.address();
    logger.info({ port }, "http server listening");
  });

  server.on("close", () => {
    logger.info("http server closing");
  });

  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    logger.info("closing http server");
    for (const id of commands.clients.keys()) {
      await arena.part(id, "Server shutting down.");
    }
    await commands.close();
    server.close(() => {
      process.exit();
    });
  }

  process.on("SIGINT", close);
  process.on("SIGQUIT", close);
  process.on("SIGTERM", close);

  return close;
}
