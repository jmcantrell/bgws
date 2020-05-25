import fs from "fs";
import glob from "glob";
import test from "ava";
import * as server from "./_server.js";

import { fileURLToPath } from "url";
import { join, basename, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

const filenames = join(__dirname, "games", "*.json");
for (const filename of glob.sync(filenames)) {
  const matches = JSON.parse(fs.readFileSync(filename));
  const id = basename(filename, ".json");

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
          server.send(ws1, { action: "join", data: { game: id } });
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
          server.send(ws2, { action: "join", data: { game: id } });
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
  let state, player;
  // TODO: predict number of updates between turns
  while (!ready) {
    const command = await server.receive(ws);
    player = command.player;
    state = command.state;
    t.truthy(state);
    ready = state.turn == player || state.finished;
  }
  t.is(player, playerIndex);
  return state;
}

async function testMatch(t, game, match) {
  t.context.game = game;
  t.context.match = match;
  const sessions = [];
  let delay = 0;
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
        server.send(ws, { action: "join", data: { game: game.id } });

        let update = await waitForTurn(t, ws, playerIndex);

        for (const move of moves) {
          delete move.player;
          t.falsy(update.finished);
          server.send(ws, { action: "move", data: { move } });
          update = await waitForTurn(t, ws, playerIndex);
        }

        t.falsy(update.turn);
        t.true(update.finished);
        t.deepEqual(update.winner, match.winner);

        ws.close();
        resolve();
      }, delay);
    });
  });
}
