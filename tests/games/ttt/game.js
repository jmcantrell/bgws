const fs = require("fs");
const path = require("path");
const test = require("ava");
const game = require("../../../lib/games/ttt");

const matches = JSON.parse(
  fs.readFileSync(path.join(__dirname, "matches.json"), "utf8")
);

test.beforeEach((t) => {
  t.context.players = [{ piece: "x" }, { piece: "o" }];
  t.context.match = game.createMatch();
});

for (const [name, matchExpected] of Object.entries(matches)) {
  test(`match: ${name}`, (t) => {
    testMatch(t, matchExpected);
  });
}

test("no moves allowed after finish", (t) => {
  const { match, players } = t.context;
  const { moves } = match;
  t.is(moves.length, 0);
  match.finished = true;
  const command = { action: "move", move: { row: 0, column: 0 } };
  t.throws(
    () => {
      game.command(match, players[0], command);
    },
    { message: "match already finished" }
  );
  t.is(moves.length, 0);
});

test("only one move per turn allowed", (t) => {
  const { match, players } = t.context;
  const { moves } = match;
  t.is(moves.length, 0);
  const command = { action: "move", move: { row: 0, column: 0 } };
  game.command(match, players[0], command);
  t.is(moves.length, 1);
  command.move.row = 1;
  t.throws(
    () => {
      game.command(match, players[0], command);
    },
    { message: "player already moved" }
  );
  t.is(moves.length, 1);
});

test("only player 1 allowed to go first", (t) => {
  const { match, players } = t.context;
  const { moves } = match;
  t.is(moves.length, 0);
  const command = { action: "move", move: { row: 0, column: 0 } };
  t.throws(
    () => {
      game.command(match, players[1], command);
    },
    { message: "only player one can move first" }
  );
  t.is(moves.length, 0);
  game.command(match, players[0], command);
  t.is(moves.length, 1);
});

test("can only move if space isn't occupied", (t) => {
  const { match, players } = t.context;
  const { moves } = match;
  t.is(moves.length, 0);
  const command = { action: "move", move: { row: 0, column: 0 } };
  game.command(match, players[0], command);
  t.is(moves.length, 1);
  t.throws(
    () => {
      game.command(match, players[1], command);
    },
    { message: "space already occupied" }
  );
  t.is(moves.length, 1);
});

function testMatch(t, matchExpected) {
  const { match, players } = t.context;
  const { board, moves } = match;

  // Check that board exists and is empty.
  t.truthy(board);
  t.truthy(board.length == 3);
  for (const row of board) {
    t.truthy(row.length == 3);
    for (const column of row) {
      t.truthy(column == null);
    }
  }

  // Check that there have been no moves.
  t.truthy(moves && moves.length == 0);

  for (let i = 0; i < matchExpected.moves.length; i++) {
    const move = matchExpected.moves[i];
    const player = players[i % game.numPlayers];
    const finished = testMove(t, player, move);

    // Check that match is finished when test moves have been exhausted.
    if (i == matchExpected.moves.length - 1) {
      t.true(finished);
    } else {
      t.false(finished);
    }
  }

  const { winner } = t.context.match;

  t.deepEqual(matchExpected.board, board);
  t.deepEqual(matchExpected.moves, moves);
  t.deepEqual(matchExpected.winner, winner);
}

function testMove(t, player, move) {
  const { match } = t.context;
  const { moves, board } = match;
  const n = moves.length;

  delete move.piece;
  const command = { action: "move", move };
  const { row, column } = move;

  game.command(match, player, command);

  // After the server processes the move, it will be assigned the piece.
  t.is(board[row][column], move.piece);

  // Ensure there is one more move recorded.
  t.true(moves.length == n + 1);

  // Ensure that it was the move that was just made.
  t.deepEqual(moves[n], move);

  return match.finished;
}
