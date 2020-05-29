import redis from "redis";

export default function connect(options = {}) {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return redis.createClient(url, options);
}
