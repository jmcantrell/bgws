import test from "ava";
import * as grid from "../../../lib/grid.js";
import * as game from "../../../lib/games/c4.js";

test(`board is a ${game.rows}x${game.columns} grid`, (t) => {
  t.deepEqual(game.createBoard(), grid.create(game.rows, game.columns));
});

test("move must be within board bounds", (t) => {
  const board = game.createBoard();

  checkSpace({ column: -1 });
  checkSpace({ column: game.columns });

  function checkSpace(space) {
    t.throws(
      () => {
        game.setMove(board, 0, space);
      },
      { message: "space is outside bounds of board" }
    );
  }
});

test("can only move if column isn't full", (t) => {
  const board = game.createBoard();
  const move = { column: 0 };
  for (let row = 0; row < game.rows; row++) {
    game.setMove(board, 0, move);
  }
  t.throws(
    () => {
      game.setMove(board, 0, move);
    },
    { message: "no spaces available in column" }
  );
});

test("able to get the playable space in a column", (t) => {
  const board = game.createBoard();
  const piece = { player: 0 };
  for (let column = 0; column < game.columns; column++) {
    for (let row = 0; row < game.rows; row++) {
      const space = { row, column };
      t.true(grid.isSameSpace(space, game.getPlayableSpace(board, column)));
      grid.setValue(board, space, piece);
    }
    // Column is full, so should return null.
    t.falsy(game.getPlayableSpace(board, column));
  }
});

test("able to detect a draw", (t) => {
  const board = game.createBoard();

  // FIXME: Relies on an invalid game condition to simulate a draw.
  let playerID = 0;
  for (const space of game.getSpaces()) {
    grid.setValue(board, space, { player: playerID++ });
  }

  // Ensure there's no win.
  for (let column = 0; column < game.columns; column++) {
    t.falsy(game.getWinner(board, 0, { row: game.rows - 1, column }));
  }

  t.true(game.isDraw(board));
});

test("able to detect a win", (t) => {
  function setLine(board, line, player) {
    for (const space of line) {
      grid.setValue(board, space, { player });
    }
  }

  function testLine(line) {
    for (const player of [0, 1]) {
      const board = game.createBoard();
      setLine(board, line, player);
      for (const space of line) {
        testWinner(board, player, line, space);
      }
    }
  }

  function testWinner(board, player, line, space) {
    const winner = game.getWinner(board, player, space);
    t.truthy(winner);
    t.false(game.isDraw(board));
    t.is(winner.player, player);
    t.deepEqual(winner.line, line);
  }

  // All possible vertical lines.
  for (let column = 0; column < game.columns; column++) {
    for (let row = 0; row < game.rows - 3; row++) {
      const line = [];
      for (let i = 0; i < 4; i++) {
        line.push({ row: row + i, column });
      }
      for (const player of [0, 1]) {
        const board = game.createBoard();
        setLine(board, line, player);
        testWinner(board, player, line, line[3]);
      }
    }
  }

  // All possible horizontal lines.
  for (let column = 0; column < game.columns - 3; column++) {
    for (let row = 0; row < game.rows; row++) {
      const line = [];
      for (let i = 0; i < 4; i++) {
        line.push({ row, column: column + i });
      }
      testLine(line);
    }
  }

  for (let column = 0; column < game.columns - 3; column++) {
    // All possible diagonal lines directed southwest to northeast.
    for (let row = 0; row < game.rows - 3; row++) {
      const line = [];
      for (let i = 0; i < 4; i++) {
        line.push({ row: row + i, column: column + i });
      }
      testLine(line);
    }

    // All possible diagonal lines directed northwest to southeast.
    for (let row = 3; row < game.rows; row++) {
      const line = [];
      for (let i = 0; i < 4; i++) {
        line.push({ row: row - i, column: column + i });
      }
      testLine(line);
    }
  }
});

test("able to set move", (t) => {
  const board = game.createBoard();
  for (let column = 0; column < game.columns; column++) {
    for (let row = 0; row < game.rows; row++) {
      const move = { column };
      game.setMove(board, 0, move);
      const space = { row, column };
      const piece = grid.getValue(board, space);
      t.is(move.row, row);
      t.is(piece.player, 0);
    }
  }
});
