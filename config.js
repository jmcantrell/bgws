module.exports = {
  PORT: process.env.PORT || 3000,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017"
};
