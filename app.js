const fs = require("fs");
const http = require("http");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const pino = require("pino");
const pinoHttp = require("pino-http");
const redis = require("redis");

const Arena = require("./lib/arena");
const Switch = require("./lib/switch");
const games = require("./lib/games");

const logLevel = process.env.LOG_LEVEL || "info";
const logger = pino({ level: logLevel });

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));

const app = express();

app.set("view engine", "pug");

app.locals.pretty = true;
app.locals.title = pkg.title;
app.locals.homepage = pkg.homepage;

app.use(helmet());
app.use(compression());
app.use(pinoHttp({ logger }));
app.use(express.static("client"));

app.get("/", (req, res) => {
  return res.render("index");
});

const gameNames = [];
for (const [id, game] of games.entries()) {
  gameNames.push({ id, name: game.name });
}
app.get("/games/", (req, res) => {
  return res.render("games", { games: gameNames });
});

app.get("/games/:id/", (req, res) => {
  const { id } = req.params;
  const { name } = games.get(id);
  return res.render(`games/${id}`, { id, name });
});

app.use((req, res) => {
  return res.status(404).render("404");
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).render("500");
  return next();
});

app.connectRedis = () => {
  return redis.createClient(process.env.REDIS_URL);
};

app.startServer = () => {
  const redis = app.connectRedis();
  const port = process.env.PORT || 3000;

  app.server = http.createServer(app);
  app.switch = new Switch({ redis, server: app.server });

  app.switch.on("connection", (id) => {
    logger.info({ player: id }, "player connected");
  });

  app.switch.on("data", (id, data) => {
    logger.debug({ player: id, command: data }, "player sent command");
  });

  app.switch.on("disconnection", (id) => {
    logger.info({ player: id }, "player disconnected");
  });

  app.switch.on("error", (err) => {
    logger.error(err);
  });

  app.server.listen(port, () => {
    const { port } = app.server.address();
    logger.info({ port }, "http server listening");
  });

  app.server.on("close", () => {
    logger.info("http server closing");
  });
};

app.startLobby = async () => {
  const redis = app.connectRedis();
  const arena = new Arena({ redis });

  arena.on("match", (game, match, players) => {
    logger.info({ game, match, players }, "match started");
  });

  arena.on("error", (err) => {
    logger.error(err);
  });

  try {
    await arena.clear();
    await arena.listen();
    logger.info("waiting for players");
  } catch (err) {
    logger.error(err);
  }
};

module.exports = app;
