import fs from "fs";
import { cpus } from "os";
import http from "http";
import throng from "throng";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import pino from "pino";
import pinoHttp from "pino-http";
import redis from "redis";

import Arena from "./arena.js";
import Switch from "./switch.js";
import { load } from "./games.js";

import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(fs.readFileSync(join(__dirname, "..", "package.json"), "utf8"));

const port = process.env.PORT || 3000;
const logLevel = process.env.LOG_LEVEL || "info";

const logger = pino({ level: logLevel });

export const app = express();

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

app.get("/games/", (req, res) => {
  return res.render("games");
});

app.get("/games/:id/", (req, res) => {
  const { id } = req.params;
  const { name } = app.games.get(id);
  return res.render("game", { id, name });
});

app.use((req, res) => {
  return res.status(404).render("404");
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).render("500");
  return next();
});

export function connectRedis(options = {}) {
  return redis.createClient(process.env.REDIS_URL, options);
}

export async function startServer(redis = null) {
  if (redis === null) redis = connectRedis();

  const games = await load();
  const arena = new Arena({ redis, games });

  // Games accessible to router.
  app.games = games;

  // Games accessible to templates.
  app.locals.games = Array.from(games.values());

  app.server = http.createServer(app);
  app.switch = new Switch({ server: app.server, arena });

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

  let closing = false
  async function onProcessExit() {
    if (closing) return;
    closing = true;
    logger.info("closing http server");
    for (const id of app.switch.clients.keys()) {
      await app.switch.close(id);
    }
    app.server.close(() => {
      process.exit();
    });
  }

  process.on('SIGINT', onProcessExit);
  process.on('SIGQUIT', onProcessExit);
  process.on('SIGTERM', onProcessExit);
}

export async function startCluster(redis = null) {
  const numCPUs = cpus().length;
  const workers = process.env.WEB_CONCURRENCY || numCPUs;

  throng({ workers }, async () => {
    await startServer(redis);
  });
}

export async function startLobby(redis = null) {
  if (redis === null) redis = connectRedis();

  const games = await load();
  const arena = new Arena({ redis, games });

  arena.on("match", (game, match, players) => {
    logger.info({ game, match, players }, "match started");
  });

  arena.on("error", (err) => {
    logger.error(err);
  });

  logger.info("waiting for players");

  await arena.listen();
}
