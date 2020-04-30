const http = require("http");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");

const config = require("./config");
const routes = require("./routes");
const game = require("./game");
const logger = require("./logger");

function connectRedis(app) {
  app.redis = {
    redis: config.connectRedis(),
    subscriber: config.connectRedis(),
  };
  logger.info("connected to redis");
}

function connectMongoDB(app) {
  return config.connectMongoDB().then((client) => {
    app.mongodb = {
      client: client,
      database: client.db(config.name),
    };
    logger.info("connected to mongodb");
  });
}

const app = express();
app.set("view engine", "pug");
app.locals.pretty = true;
app.locals.title = config.title;
app.locals.homepage = config.homepage;
app.use(helmet());
app.use(express.static("static"));
app.use(compression());
routes.setup(app);

app.start = async function () {
  await connectMongoDB(this);
  connectRedis(this);
  const server = http.createServer(this);
  game.setup(this, server);
  server.listen(config.PORT, () => {
    logger.info(`http server listening on port ${config.PORT}`);
  });
  return server;
};

module.exports = app;
