import Lobby from "./server/lobby.js";
import loadGames from "./server/games.js";
import connectRedis from "./server/redis.js";
import createLogger from "./server/logger.js";

loadGames().then(async (games) => {
  const redis = await connectRedis();
  const logger = createLogger({ name: "lobby" });
  const lobby = new Lobby({ redis, games, logger });
  await lobby.listen();
});
