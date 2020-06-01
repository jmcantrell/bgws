import got from "got";
import jsdom from "jsdom";
import WebSocket from "ws";
import { once } from "events";
import Web from "../server/web.js";
import Lobby from "../server/lobby.js";
import loadGames from "../server/games.js";
import connectRedis from "../server/redis.js";
import createLogger from "../server/logger.js";

process.env.PORT = 0;
process.env.LOG_LEVEL = "silent";

export function createFakeGame(id, numPlayers = 1) {
  return {
    id,
    name: `Fake ${numPlayers}-Player Game`,
    description: `A fake game for ${numPlayers} players.`,
    numPlayers,
    createState: () => {
      return { turn: 0 };
    },
    setMove: () => {},
    isDraw: () => {
      return false;
    },
    getWinner: () => {
      return null;
    },
  };
}

export const fakeGames = new Map();

// Create a set of fake games ranging from 1 to 4 players.
for (let i = 1; i <= 4; i++) {
  const id = `fake${i}p`;
  fakeGames.set(id, createFakeGame(id, i));
}

export function connectTestRedis() {
  return connectRedis({ db: 1 });
}

export async function startWeb(t, options) {
  options.redis = await connectTestRedis();
  options.logger = createLogger({ name: "web" });
  const web = new Web(options);
  await web.listen();
  t.context.web = web;
}

export async function startLobby(t, options) {
  options.redis = await connectTestRedis();
  options.logger = createLogger({ name: "lobby" });
  const lobby = new Lobby(options);
  await lobby.listen();
  t.context.lobby = lobby;
}

export async function startRealWeb(t) {
  await startWeb(t, { games: await loadGames() });
}

export async function startRealLobby(t) {
  await startLobby(t, { games: await loadGames() });
}

export async function startFakeWeb(t) {
  await startWeb(t, { games: fakeGames });
}

export async function startFakeLobby(t) {
  await startLobby(t, { games: fakeGames });
}

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
  const { port } = t.context.web.server.address();
  const prefixUrl = `http://localhost:${port}`;
  const res = await got(path, { prefixUrl, throwHttpErrors: false });
  t.is(res.statusCode, status);
  return res;
}

export function connectWebSocket(t) {
  const { port } = t.context.web.server.address();
  return new WebSocket(`ws://localhost:${port}`);
}
