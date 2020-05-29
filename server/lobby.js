import Arena from "./arena.js";
import { logger } from "./logger.js";

export default async function start({ redis, games }) {
  const arena = new Arena({ redis, games });

  arena.on("match", (game, match, players) => {
    logger.info({ game, match, players }, "match started");
  });

  arena.on("error", (err) => {
    logger.error(err);
  });

  logger.info("waiting for players");

  await arena.clear();
  await arena.listen();

  async function close() {
    await arena.close();
  }

  return close;
}
