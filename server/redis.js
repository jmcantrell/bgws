import Redis from "ioredis";

export function ready(client) {
  return new Promise((resolve) => {
    client.on("ready", () => {
      return resolve(client);
    });
  });
}

export default async function connect(options = {}) {
  const url = process.env.REDIS_URL;
  const client = new Redis(url, options);
  return await ready(client);
}
