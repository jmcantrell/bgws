const fs = require("fs");
const path = require("path");
const test = require("ava");
const WebSocket = require("ws");
const { once } = require("events");
const ttt = require("../ttt");

process.env.PORT = 0;
process.env.LOG_LEVEL = "silent";

const app = require("../app");

const examples = JSON.parse(
  fs.readFileSync(path.join(__dirname, "examples.json"), "utf8")
);

const emptyBoard = ttt.createBoard();

test.beforeEach(async (t) => {
  const server = await app.start();
  const { port } = server.address();
  t.context.server = server;
  t.context.ws1 = new WebSocket(`ws://localhost:${port}`);
  t.context.ws2 = new WebSocket(`ws://localhost:${port}`);
  // t.context.ws1 = new WebSocket(`ws://localhost:3000`);
  // t.context.ws2 = new WebSocket(`ws://localhost:3000`);
});

test.afterEach.always(async (t) => {
  t.context.server.close();
});

for (const [name, match] of Object.entries(examples)) {
  test.serial(`match: ${name}`, async (t) => {
    return testMatch(t, match);
  });
}

test.serial("match: x forfeits", async (t) => {
  t.context.close = "x";
  return testMatch(t, {});
});

test.serial("match: o forfeits", async (t) => {
  t.context.close = "o";
  return testMatch(t, {});
});

function testMatch(t, match) {
  const { ws1, ws2 } = t.context;
  t.context.match = match;
  return Promise.all([
    testMatchSession(t, ws1, "x", 0),
    testMatchSession(t, ws2, "o", 500),
  ]);
}

function testMatchSession(t, ws, piece, ms) {
  const { match, close } = t.context;
  return new Promise((resolve) => {
    ws.addEventListener("open", async function () {
      // A race condition exists when two players initiate a match
      // at the same time. Two match records will be created with
      // each player as player 1. This isn't "wrong", necessarily,
      // but it does mean that, when testing, player 2 needs to be
      // delayed a little bit.
      setTimeout(async () => {
        await testInit(t, this, piece);
        if (close) {
          if (close == piece) {
            send(ws, { action: "close" });
          } else {
            let { action, reason } = await receive(ws);
            t.is(action, "close");
            t.is(reason, "Opponent left the game.");
          }
        } else {
          for (let i = 0; i < match.moves.length; i++) {
            if (await testMove(t, this, i, piece)) {
              break;
            }
          }
        }
        this.close();
        resolve();
      }, ms);
    });
  });
}

async function testInit(t, ws, piece) {
  send(ws, { action: "init" });
  let command = await receive(ws);
  const { update } = command;
  t.is(update.piece, piece);
  t.deepEqual(update.board, emptyBoard);
  t.falsy(update.finished);
  if (piece == "x") {
    t.true(update.turn);
  } else {
    t.falsy(update.turn);
  }
}

async function testMove(t, ws, i, piece) {
  let command;
  const { match } = t.context;
  const { board, moves, winner } = match;
  const move = moves[i];
  const { row, column } = move;

  if (piece == move.piece) {
    send(ws, { action: "move", move: { row, column } });
  }

  command = await receive(ws);
  const { update } = command;

  t.truthy(update);
  t.is(update.piece, piece);
  t.is(update.board[row][column], move.piece);
  t.is(update.board[row][column], board[row][column]);

  if (update.finished) {
    if (update.winner) {
      t.deepEqual(update.winner, winner);
    }
    t.falsy(update.turn);
  } else {
    if (piece == move.piece) {
      t.falsy(update.turn);
    } else {
      t.true(update.turn);
    }
  }
  t.context.previousUpdate = update;
  return update.finished;
}

function send(ws, message) {
  ws.send(JSON.stringify(message));
}

async function receive(ws) {
  const events = await once(ws, "message");
  return JSON.parse(events[0].data);
}
