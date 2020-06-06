import test from "ava";
import * as grid from "../../../lib/grid.js";
import * as game from "../../../lib/games/checkers.js";

function decodeBoard(data) {
  const board = game.createEmptyBoard();
  const lines = data.trim().split("\n");
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row].trim();
    for (let column = 0; column < line.length; column++) {
      const space = { row, column };
      const letter = line[column];
      if (letter != "-") {
        if (!game.isPlayableSpace(space)) {
          throw new Error("invalid space");
        }
        const player = letter.toLowerCase() == "b" ? 0 : 1;
        const king = letter == "R" || letter == "B";
        const piece = { player, king };
        grid.setValue(board, space, piece);
      }
    }
  }
  return board;
}

function encodeBoard(board) {
  const lines = [];
  for (const row of board) {
    const line = [];
    for (const piece of row) {
      if (piece) {
        const letter = piece.player == 0 ? "b" : "r";
        line.push(piece.king ? letter.toUpperCase() : letter);
      } else {
        line.push("-");
      }
    }
    lines.push(line.join(""));
  }
  return lines.join("\n");
}

function getRandomInteger(max = game.rows) {
  return Math.trunc(Math.random() * max);
}

test(`board is a ${game.rows}x${game.columns} grid`, (t) => {
  t.deepEqual(game.createEmptyBoard(), grid.create(game.rows, game.columns));
});

test("able to determine a players' movement direction", (t) => {
  t.is(game.getOrientation(0), 1);
  t.is(game.getOrientation(1), -1);
});

test("able to determine the directions a piece can move", (t) => {
  for (const player of [0, 1]) {
    for (const king of [false, true]) {
      const piece = { player };
      if (king) piece.king = true;

      // Depending on the player, forward can mean different values.
      const orientation = game.getOrientation(player);
      const directions = Array.from(game.getDirections(piece));

      // If the piece is a king, there should be two additional
      // directions in the backwards directions.
      if (king) {
        t.is(directions.length, 4);
      } else {
        t.is(directions.length, 2);
      }

      // In order to ensure that every direction is returned, use some
      // counters, that will balance to predictable values.
      let rowChange = 0;
      let columnChange = 0;

      for (const direction of directions) {
        // Magnitude should never be greater than one.
        t.is(Math.abs(direction.row), 1);
        t.is(Math.abs(direction.column), 1);

        rowChange += direction.row;
        columnChange += direction.column;

        // If the direction is backwards, ensure the piece is a king.
        if (direction.row != orientation) {
          t.true(king);
        }
      }

      // Should balance to 0
      t.is(columnChange, 0);

      // If the piece is a king, rowChange should have encountered four
      // directions, two of one orientation, two of the opposite, so it
      // will balance to zero. If the piece is regular, rowChange
      // encounted two directions of the same value, both of one sign or
      // the other.
      t.is(Math.abs(rowChange), king ? 0 : 2);
    }
  }
});

test("able to determine a playable space", (t) => {
  for (const space of grid.getSpaces(game.rows, game.columns)) {
    if (space.row % 2 != space.column % 2) {
      t.true(game.isPlayableSpace(space));
    } else {
      t.false(game.isPlayableSpace(space));
    }
  }
});

test("able to get all playable spaces", (t) => {
  const spaces = Array.from(game.getSpaces());

  // Should be half of the available grid spaces.
  t.is(spaces.length, (game.rows * game.columns) / 2);

  // A space is one that is an even row or even column, but not both.
  for (const space of spaces) {
    t.true(game.isPlayableSpace(space));
  }
});

test("player pieces are arranged at either end of the board", (t) => {
  const board = game.createBoard();
  const spaces = Array.from(game.getSpaces());

  // First twelve playable spaces are player one's side.
  const playerOneSpaces = spaces.slice(0, 12);
  const playerOnePiece = { player: 0 };
  t.is(playerOneSpaces.length, 12);

  for (const space of playerOneSpaces) {
    t.deepEqual(grid.getValue(board, space), playerOnePiece);
  }

  // The two rows separating the sides should be empty.
  const divideSpaces = spaces.slice(12, spaces.length - 12);

  for (const space of divideSpaces) {
    t.is(grid.getValue(board, space), null);
  }

  // Last twelve playable spaces are player two's side.
  const playerTwoSpaces = spaces.slice(spaces.length - 12);
  const playerTwoPiece = { player: 1 };
  t.is(playerTwoSpaces.length, 12);

  for (const space of playerTwoSpaces) {
    t.deepEqual(grid.getValue(board, space), playerTwoPiece);
  }
});

test("able to get a playable adjacent space", (t) => {
  for (const space of game.getSpaces()) {
    const { row, column } = space;
    const northeast = game.getAdjacentSpace(space, { row: -1, column: 1 });
    const northwest = game.getAdjacentSpace(space, { row: -1, column: -1 });
    const southeast = game.getAdjacentSpace(space, { row: 1, column: 1 });
    const southwest = game.getAdjacentSpace(space, { row: 1, column: -1 });

    // Check northwest direction.
    if (row == 0 || column == 0) {
      t.is(northwest, null);
    } else {
      t.is(northwest.row, row - 1);
      t.is(northwest.column, column - 1);
    }

    // Check northeast direction.
    if (row == 0 || column == game.columns - 1) {
      t.is(northeast, null);
    } else {
      t.is(northeast.row, row - 1);
      t.is(northeast.column, column + 1);
    }

    // Check southwest direction.
    if (row == game.rows - 1 || column == 0) {
      t.is(southwest, null);
    } else {
      t.is(southwest.row, row + 1);
      t.is(southwest.column, column - 1);
    }

    // Check southeast direction.
    if (row == game.rows - 1 || column == game.columns - 1) {
      t.is(southeast, null);
    } else {
      t.is(southeast.row, row + 1);
      t.is(southeast.column, column + 1);
    }
  }
});

test("able to find hops for a piece", (t) => {
  for (const player of [0, 1]) {
    const opponent = (player + 1) % game.numPlayers;
    for (const king of [false, true]) {
      for (const space of game.getSpaces()) {
        const board = game.createEmptyBoard();
        const piece = { player, king };

        grid.setValue(board, space, piece);

        // All hops are available if the adjacent spaces are empty.
        const hops = game.getHops(board, space, piece);
        for (const direction of game.getDirections(piece)) {
          const adjacentSpace = game.getAdjacentSpace(space, direction);
          if (adjacentSpace) {
            t.true(hops.some((hop) => grid.isSameSpace(hop, adjacentSpace)));
          }
        }

        // Fill the adjacent spaces with pieces to block hops.
        for (const direction of game.getDirections(piece)) {
          const adjacentSpace = game.getAdjacentSpace(space, direction);
          if (adjacentSpace) {
            grid.setValue(board, adjacentSpace, { player: opponent });
          }
        }

        // No hops are available if the adjacent spaces are occupied.
        t.is(game.getHops(board, space, piece).length, 0);
      }
    }
  }
});

test("able to find jumps for a piece", (t) => {
  for (const player of [0, 1]) {
    const opponent = (player + 1) % game.numPlayers;
    for (const king of [false, true]) {
      for (const space of game.getSpaces()) {
        const board = game.createEmptyBoard();
        const piece = { player, king };

        grid.setValue(board, space, piece);

        // No jumps are available if the adjacent spaces are empty.
        t.is(game.getJumps(board, space, piece).length, 0);

        // Fill adjacent spaces with same pieces to block jumps.
        for (const direction of game.getDirections(piece)) {
          const adjacentSpace = game.getAdjacentSpace(space, direction);
          if (adjacentSpace) {
            grid.setValue(board, adjacentSpace, { player });
          }
        }
        t.is(game.getJumps(board, space, piece).length, 0);

        // Fill adjacent spaces with opponent pieces to allow jumps.
        const expectedJumps = [];
        for (const direction of game.getDirections(piece)) {
          const capture = { space: game.getAdjacentSpace(space, direction) };
          if (capture.space) {
            capture.piece = { player: opponent };
            grid.setValue(board, capture.space, capture.piece);
            const target = game.getAdjacentSpace(capture.space, direction);
            if (target) {
              expectedJumps.push({ space: target, capture });
            }
          }
        }

        t.deepEqual(expectedJumps, game.getJumps(board, space, piece));
      }
    }
  }
});

test("move space must be a valid space", (t) => {
  const board = game.createEmptyBoard();
  t.throws(
    () => {
      game.setMove(board, 0, { from: { row: 0, column: 0 } });
    },
    { message: "invalid space" }
  );
});

test("move space must contain a piece", (t) => {
  const board = game.createEmptyBoard();
  t.throws(
    () => {
      game.setMove(board, 0, { from: { row: 0, column: 1 } });
    },
    { message: "no piece at that space" }
  );
});

test("move piece must belong to player", (t) => {
  const board = game.createEmptyBoard();
  const space = { row: 0, column: 1 };
  grid.setValue(board, space, { player: 1 });
  t.throws(
    () => {
      game.setMove(board, 0, { from: space });
    },
    { message: "piece does not belong to player" }
  );
});

test("move must be either a hop or a jump", (t) => {
  const board = game.createEmptyBoard();
  const space = { row: 0, column: 1 };
  grid.setValue(board, space, { player: 0 });
  t.throws(
    () => {
      game.setMove(board, 0, { from: space });
    },
    { message: "invalid move" }
  );
});

test("move hop must be a single space", (t) => {
  const board = game.createEmptyBoard();
  const space = { row: 0, column: 1 };
  const player = 0;
  const move = { from: space, hop: { row: 2, column: 3 } };
  grid.setValue(board, space, { player });
  t.throws(
    () => {
      game.setMove(board, player, move);
    },
    { message: "hop must be only one space" }
  );
});

test("move hop must be within the board", (t) => {
  const board = game.createEmptyBoard();
  const space = { row: 1, column: 0 };
  const player = 0;
  const move = { from: space, hop: { row: 2, column: -1 } };
  grid.setValue(board, space, { player });
  t.throws(
    () => {
      game.setMove(board, player, move);
    },
    { message: "space outside of board" }
  );
});

test("regular piece cannot hop backwards", (t) => {
  const board = game.createEmptyBoard();
  const space = { row: 1, column: 0 };
  const player = 0;
  const move = { from: space, hop: { row: 0, column: 1 } };
  grid.setValue(board, space, { player });
  t.throws(
    () => {
      game.setMove(board, player, move);
    },
    { message: "unable to move regular piece backwards" }
  );
});

test("move hop space must be empty", (t) => {
  for (const king of [false, true]) {
    const board = game.createEmptyBoard();
    const player = 0;
    const piece = { player, king };
    const space = { row: 2, column: 3 };
    grid.setValue(board, space, piece);
    for (const direction of game.getDirections(piece)) {
      const adjacentSpace = game.getAdjacentSpace(space, direction);
      grid.setValue(board, adjacentSpace, { player });
      t.throws(
        () => {
          game.setMove(board, player, { from: space, hop: adjacentSpace });
        },
        { message: "space already occupied" }
      );
    }
  }
});

test("able to determine king piece elligibility", (t) => {
  for (const player of [0, 1]) {
    for (const space of game.getSpaces()) {
      const orientation = game.getOrientation(player);
      if (
        (orientation > 0 && space.row == game.rows - 1) ||
        (orientation < 0 && space.row == 0)
      ) {
        t.true(game.isKingable(space, player));
      } else {
        t.false(game.isKingable(space, player));
      }
    }
  }
});

test("able to set a hop move", (t) => {
  for (const player of [0, 1]) {
    for (const king of [false, true]) {
      for (const space of game.getSpaces()) {
        for (const direction of game.getDirections({ player, king })) {
          const adjacentSpace = game.getAdjacentSpace(space, direction);
          if (adjacentSpace) {
            const board = game.createEmptyBoard();
            const piece = { player, king };
            grid.setValue(board, space, piece);
            game.setMove(board, player, { from: space, hop: adjacentSpace });
            t.is(grid.getValue(board, space), null);
            t.is(grid.getValue(board, adjacentSpace), piece);
            if (!king) {
              t.is(piece.king, game.isKingable(adjacentSpace, player));
            }
          }
        }
      }
    }
  }
});

test("able to set a jump move", (t) => {
  for (const player of [0, 1]) {
    const opponent = (player + 1) % game.numPlayers;
    for (const king of [false, true]) {
      for (const space of game.getSpaces()) {
        for (const direction of game.getDirections({ player, king })) {
          const capture = { space: game.getAdjacentSpace(space, direction) };
          if (capture.space) {
            const targetSpace = game.getAdjacentSpace(capture.space, direction);
            if (targetSpace) {
              const board = game.createEmptyBoard();
              const piece = { player, king };
              grid.setValue(board, space, piece);
              grid.setValue(board, capture.space, { player: opponent });
              game.setMove(board, player, { from: space, jump: [targetSpace] });
              t.is(grid.getValue(board, space), null);
              t.is(grid.getValue(board, capture.space), null);
              t.is(grid.getValue(board, targetSpace), piece);
              if (!king) {
                t.is(piece.king, game.isKingable(targetSpace, player));
              }
            }
          }
        }
      }
    }
  }
});

test.skip("able to detect a draw", (t) => {
  // TODO: I'm not sure how to simulate a game state that's a draw.
});

test("able to detect a win", (t) => {
  for (const player of [0, 1]) {
    const opponent = (player + 1) % game.numPlayers;
    for (const space of game.getSpaces()) {
      const board = game.createEmptyBoard();
      grid.setValue(board, space, { player });
      t.is(game.getWinner(board, player).player, player);

      // Easy way to set another space that is not the current one.
      const inverseSpace = { row: space.column, column: space.row };
      grid.setValue(board, inverseSpace, { player: opponent, king: true });

      t.is(game.getWinner(board, player), null);
    }
  }
});
