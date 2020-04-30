const fs = require("fs");
const path = require("path");
const test = require("ava");
const ttt = require("../ttt");

const examples = JSON.parse(
  fs.readFileSync(path.join(__dirname, "examples.json"), "utf8")
);

for (const [name, match] of Object.entries(examples)) {
  test(`match: ${name}`, (t) => {
    testMatch(t, match);
  });
}

function testMatch(t, matchExpected) {
  const match = ttt.createMatch();
  testEmptyMatch(t, match);
  const { moves, board, winner } = matchExpected;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const finished = testMove(t, match, move);
    if (i == moves.length - 1) {
      t.true(finished);
    } else {
      t.false(finished);
    }
  }
  t.deepEqual(match.board, board);
  t.deepEqual(match.moves, moves);
  t.deepEqual(match.winner, winner);
}

function testEmptyMatch(t, match) {
  t.truthy(match.board);
  testEmptyBoard(t, match.board);
  t.truthy(match.moves && match.moves.length == 0);
}

function testEmptyBoard(t, board) {
  t.truthy(board.length == 3);
  for (const row of board) {
    t.truthy(row.length == 3);
    for (const column of row) {
      t.truthy(column == null);
    }
  }
}

function testMove(t, match, move) {
  const n = match.moves.length;
  const finished = ttt.addMove(match, move);
  t.is(match.board[move.row][move.column], move.piece);
  t.true(match.moves.length == n + 1);
  t.deepEqual(match.moves[n], move);
  return finished;
}

test("errors", (t) => {
  const match = ttt.createMatch();
  const move = { piece: "o", row: 0, column: 0 };

  // player moving out of turn
  ttt.addMove(match, move);
  t.deepEqual(match, ttt.createMatch());

  move.piece = "x";
  ttt.addMove(match, move);
  const clone = JSON.parse(JSON.stringify(match));

  // player making invalid move
  move.piece = "o";
  ttt.addMove(match, move);
  t.deepEqual(match, clone);
});
