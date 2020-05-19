import fs from "fs";
import test from "ava";
import * as games from "../server/games.js";
import * as server from "./_server.js";

import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

for (const id of Object.keys(games.metadata)) {
  const filename = join(__dirname, "games", `${id}.json`);
  if (!fs.existsSync(filename)) continue;
  const matches = JSON.parse(fs.readFileSync(filename));
  for (const [name, matchExpected] of Object.entries(matches)) {
    test.serial(`${id}: ${name}`, async (t) => {
      const game = t.context.app.games.get(id);
      await testMatch(t, game, matchExpected);
    });
  }

  test.serial(`${id}: invalid command`, async (t) => {
    const ws1 = t.context.createWebSocket();
    const ws2 = t.context.createWebSocket();
    return new Promise((resolve) => {
      ws1.on("open", async () => {
        setTimeout(async () => {
          server.send(ws1, { action: "join", game: id });
          await server.receive(ws1);
          server.send(ws1, { action: "bogus" });
          const update = await server.receive(ws1);
          t.is(update.error, "unable to perform command");
          ws1.close();
          resolve();
        }, 0);
      });
      ws2.on("open", async () => {
        setTimeout(async () => {
          server.send(ws2, { action: "join", game: id });
          await server.receive(ws2);
          await server.receive(ws2);
          ws2.close();
          resolve();
        }, 100);
      });
    });
  });
}

test.serial("first command must be join", (t) => {
  const ws = t.context.createWebSocket();
  return new Promise((resolve) => {
    ws.on("open", async () => {
      setTimeout(async () => {
        server.send(ws, { action: "bogus" });
        const update = await server.receive(ws);
        t.is(update.error, "unable to perform command");
        ws.close();
        resolve();
      }, 0);
    });
  });
});

async function waitForTurn(t, ws, playerIndex) {
  let ready = false;
  let state;
  while (!ready) {
    const command = await server.receive(ws);
    state = command.state;
    t.truthy(state);
    ready = state.next == state.player || state.finished;
  }
  t.is(state.player, playerIndex);
  return state;
}

async function testMatch(t, game, match) {
  t.context.game = game;
  const sessions = [];
  let delay = 0;
  t.context.match = match;
  for (let i = 0; i < game.numPlayers; i++) {
    const moves = match.moves.filter((move) => move.player == i);
    const ws = t.context.createWebSocket();
    sessions.push(testMatchSession(t, ws, moves, i, delay));
    delay += 500;
  }
  await Promise.all(sessions);
}

function testMatchSession(t, ws, moves, playerIndex, delay) {
  const { game, match } = t.context;
  return new Promise((resolve) => {
    ws.on("open", async () => {
      setTimeout(async () => {
        server.send(ws, { action: "join", game: game.id });

        let update = await waitForTurn(t, ws, playerIndex);

        for (const move of moves) {
          delete move.player;
          t.falsy(update.finished);
          server.send(ws, { action: "move", move });
          update = await waitForTurn(t, ws, playerIndex);
        }

        t.falsy(update.next);
        t.true(update.finished);
        t.deepEqual(update.winner, match.winner);

        ws.close();
        resolve();
      }, delay);
    });
  });
}
