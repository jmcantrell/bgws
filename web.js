import { cpus } from "os";
import throng from "throng";
import Web from "./server/web.js";
import loadGames from "./server/games.js";
import connectRedis from "./server/redis.js";
import createLogger from "./server/logger.js";

const numCPUs = cpus().length;
const workers = process.env.WEB_CONCURRENCY || numCPUs;

throng({ workers }, async (worker) => {
  const redis = await connectRedis();
  const games = await loadGames();
  const logger = createLogger({ name: "web", worker });
  const web = new Web({ redis, games, logger });
  await web.listen();
});
