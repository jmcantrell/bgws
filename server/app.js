import fs from "fs";
import express from "express";
import helmet from "helmet";
import compression from "compression";

import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(join(root, "package.json"), "utf8"));

export default function create({ games, logger }) {
  const app = express();

  app.set("view engine", "pug");

  app.locals.pretty = true;
  app.locals.title = pkg.title;
  app.locals.homepage = pkg.homepage;
  app.locals.description = pkg.description;
  app.locals.games = Array.from(games.values());

  app.use(helmet());
  app.use(compression());
  app.use(express.static(join(root, "client")));
  app.use('/lib', express.static(join(root, "lib")));

  app.get("/", (req, res) => {
    return res.render("index");
  });

  app.get("/games/", (req, res) => {
    return res.render("games");
  });

  app.get("/games/:id/", (req, res) => {
    const { id } = req.params;
    const { name } = games.get(id);
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

  return app;
}
