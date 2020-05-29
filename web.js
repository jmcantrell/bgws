import { cpus } from "os";
import throng from "throng";
import startWeb from "./server/web.js";
import loadGames from "./server/games.js";
import connectRedis from "./server/redis.js";

const numCPUs = cpus().length;
const workers = process.env.WEB_CONCURRENCY || numCPUs;

throng({ workers }, async () => {
  const redis = connectRedis();
  const games = await loadGames();
  await startWeb({ redis, games });
});
