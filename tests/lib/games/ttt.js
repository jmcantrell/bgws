import test from "ava";

import * as grid from "../../../lib/grid.js";
import * as game from "../../../lib/games/ttt.js";

test(`board is a ${game.rows}x${game.columns} grid`, (t) => {
  t.deepEqual(
    game.createBoard(),
    grid.create(game.rows, game.columns)
  );
});

test("can only move if space isn't occupied", (t) => {
  const board = game.createBoard();
  const move = { row: 0, column: 0 };
  game.setMove(board, 0, move);

  // Ensure same move cannot be made by opponent.
  t.throws(
    () => {
      game.setMove(board, 1, move);
    },
    { message: "space already occupied" }
  );
});

test("move must be within board bounds", (t) => {
  const board = game.createBoard();

  checkSpace({ row: -1, column: 0 });
  checkSpace({ row: 0, column: -1 });
  checkSpace({ row: game.rows, column: 0 });
  checkSpace({ row: 0, column: game.columns });

  function checkSpace(space) {
    t.throws(
      () => {
        game.setMove(board, 0, space);
      },
      { message: "space is outside bounds of board" }
    );
  }
});

test("able to set move", (t) => {
  const board = game.createBoard();
  for (const space of game.getSpaces()) {
    game.setMove(board, 0, space);
    const piece = grid.getValue(board, space);
    t.is(piece.player, 0);
  }
});

test("able to detect a draw", (t) => {
  const board = [
    [{ player: 0 }, { player: 1 }, { player: 1 }],
    [{ player: 1 }, { player: 0 }, { player: 0 }],
    [{ player: 0 }, { player: 0 }, { player: 1 }],
  ];
  t.true(game.isDraw(board));
  t.falsy(game.getWinner(board));
});

test("able to detect a win", (t) => {
  const piece = { player: 0 };
  for (const line of game.winningLines) {
    const board = game.createBoard();
    for (const space of line) {
      grid.setValue(board, space, piece);
    }
    const winner = game.getWinner(board);
    t.deepEqual(winner.line, line);
    t.is(winner.player, piece.player);
    t.false(game.isDraw(board));
  }
});
