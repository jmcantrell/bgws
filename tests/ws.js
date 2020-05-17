const fs = require("fs");
const path = require("path");
const test = require("ava");
const server = require("./_server");
const games = require("../server/games");

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

for (const [id, game] of games) {
  const filename = path.join(__dirname, "games", "matches", `${id}.json`);
  if (!fs.existsSync(filename)) continue;
  const matches = JSON.parse(fs.readFileSync(filename));
  for (const [name, matchExpected] of Object.entries(matches)) {
    test.serial(`${id}: ${name}`, async (t) => {
      await testMatch(t, game, matchExpected);
    });
  }
}

test.serial("first command must be join", (t) => {
  const ws = t.context.createWebSocket();

  return new Promise((resolve) => {
    ws.on("open", () => {
      server.send(ws, { action: "bogus" });
    });

    ws.on("message", (message) => {
      const data = JSON.parse(message);
      t.is(data.error, "unable to perform command");
      ws.close();
      resolve();
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
    ready = state.turn || state.finished;
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

        t.falsy(update.turn);
        t.true(update.finished);
        t.deepEqual(update.winner, match.winner);

        ws.close();
        resolve();
      }, delay);
    });
  });
}
