const fs = require("fs");
const redis = require("redis");
const { MongoClient } = require("mongodb");

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));

const config = {
  name: pkg.name,
  title: pkg.title,
  homepage: pkg.homepage,
  PORT: process.env.PORT || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
  connectMongoDB, connectRedis
};

function connectRedis() {
  return redis.createClient(config.REDIS_URL);
}

function connectMongoDB() {
  return MongoClient.connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
}

module.exports = config;
