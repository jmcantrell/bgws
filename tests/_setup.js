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

export async function createWeb(options) {
  options.redis = await connectTestRedis();
  options.logger = createLogger({ name: "web" });
  const web = new Web(options);
  await web.listen();
  return web;
}

export async function createLobby(options) {
  options.redis = await connectTestRedis();
  options.logger = createLogger({ name: "lobby" });
  const lobby = new Lobby(options);
  await lobby.listen();
  return lobby;
}

export async function createRealWeb() {
  return await createWeb({ games: await loadGames() });
}

export async function createRealLobby() {
  return await createLobby({ games: await loadGames() });
}

export async function createFakeWeb() {
  return await createWeb({ games: fakeGames });
}

export async function createFakeLobby() {
  return await createLobby({ games: fakeGames });
}

export function connect(server) {
  const { port } = server.address();
  const ws = new WebSocket(`ws://localhost:${port}`);
  return new Promise((resolve) => {
    ws.on("open", () => {
      return resolve(ws);
    });
  });
}

export function send(ws, message) {
  ws.send(JSON.stringify(message));
}

export async function receive(ws) {
  const events = await once(ws, "message");
  return JSON.parse(events[0].data);
}

export function getDocument(res) {
  const dom = new jsdom.JSDOM(res.body);
  return dom.window.document;
}

export async function getResponse(server, path) {
  const { port } = server.address();
  const prefixUrl = `http://localhost:${port}`;
  return await got(path, { prefixUrl, throwHttpErrors: false });
}
