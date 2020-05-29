import loadGames from "./server/games.js";
import startLobby from "./server/lobby.js";
import connectRedis from "./server/redis.js";

loadGames().then(async (games) => {
  const redis = connectRedis();
  await startLobby({ redis, games });
});
