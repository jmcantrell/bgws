import { cpus } from "os";
import throng from "throng";
import Web from "./server/web.js";
import loadGames from "./server/games.js";
import connectRedis from "./server/redis.js";
import createLogger from "./server/logger.js";
import shutdown from "./shutdown.js";

const numCPUs = cpus().length;
const workers = process.env.WEB_CONCURRENCY || numCPUs;

throng({ workers }, async (worker) => {
  const games = await loadGames();
  const redis = await connectRedis();
  const logger = createLogger({ name: "web", worker });
  const web = new Web({ redis, games, logger });

  await web.listen();

  await shutdown(async () => {
    try {
      await web.close();
    } catch (err) {
      logger.error(err);
    }
  });
});
