import WebSocket from "ws";
import got from "got";
import { once } from "events";
import jsdom from "jsdom";

import { app, connectRedis, startServer, startLobby } from "../server/app.js";

export function send(ws, message) {
  ws.send(JSON.stringify(message));
}

export async function receive(ws) {
  const events = await once(ws, "message");
  return JSON.parse(events[0].data);
}

export async function getDom(t, path, status = 200) {
  const res = await get(t, path, status);
  const dom = new jsdom.JSDOM(res.body);
  dom.document = dom.window.document;
  return dom;
}

export async function get(t, path, status = 200) {
  const { prefixUrl } = t.context;
  const res = await got(path, { prefixUrl, throwHttpErrors: false });
  t.is(res.statusCode, status);
  return res;
}

export async function start(t) {
  const redisClient = connectRedis({ db: 1 });
  await startLobby(redisClient);
  await startServer(redisClient);
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

export async function close(t) {
  await t.context.close();
}
