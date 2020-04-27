const http = require("http");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const redis = require("redis");
const { MongoClient } = require("mongodb");

const routes = require("./routes");
const game = require("./game");
const pkg = require("./package.json");

const config = require("./config");

function redisClient() {
  return redis.createClient(config.REDIS_URL);
}

function connectRedis(app) {
  app.redis = {
    client: redisClient(),
    subscriber: redisClient(),
  };
  console.log("connected to redis");
}

function connectMongoDB(app) {
  return MongoClient.connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then((client) => {
      app.mongodb = {
        client: client,
        database: client.db(pkg.name),
      };
      console.log("connected to mongodb");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

function createApp() {
  const app = express();
  app.set("view engine", "pug");
  app.locals.pretty = true;
  app.locals.title = pkg.title;
  app.locals.homepage = pkg.homepage;
  app.use(helmet());
  app.use(express.static("static"));
  app.use(compression());
  routes.setup(app);
  return app;
}

module.exports.start = () => {
  const app = createApp();
  connectMongoDB(app).then(() => {
    connectRedis(app);
    const server = http.createServer(app);
    game.setup(app, server);
    server.listen(config.PORT, () => {
      console.log(`http server listening on port ${config.PORT}`);
    });
  });
};
