const WebSocket = require("ws");
const redis = require("redis-mock");
const got = require("got");
const { once } = require("events");
const { JSDOM } = require("jsdom");

process.on("warning", (e) => console.warn(e.stack));

process.env.PORT = 0;
process.env.LOG_LEVEL = "silent";

const app = require("../server/app");

function send(ws, message) {
  ws.send(JSON.stringify(message));
}

async function receive(ws) {
  const events = await once(ws, "message");
  return JSON.parse(events[0].data);
}

async function getDom(t, path, status = 200) {
  const res = await get(t, path, status);
  const dom = new JSDOM(res.body);
  dom.document = dom.window.document;
  return dom;
}

async function get(t, path, status = 200) {
  const { prefixUrl } = t.context;
  const res = await got(path, { prefixUrl, throwHttpErrors: false });
  t.is(res.statusCode, status);
  return res;
}

async function start(t) {
  const redisClient = redis.createClient();
  await app.startLobby({ redis: redisClient });
  await app.startServer({ redis: redisClient });
  t.context.close = async () => {
    await redisClient.quit();
    await app.server.close();
  };
  t.context.app = app;
  const { port } = app.server.address();
  t.context.prefixUrl = `http://localhost:${port}`;
  t.context.createWebSocket = () => {
    return new WebSocket(`ws://localhost:${port}`);
  };
}

async function close(t) {
  await t.context.close();
}

module.exports = { start, close, get, getDom, send, receive };
