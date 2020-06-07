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
      // Depending on the player, forward can mean different values.
      const orientation = game.getOrientation(player);
      const directions = Array.from(game.getDirections({ player, king }));

      // If the piece is a king, there should be two additional
      // directions in the backwards directions.
      if (king) {
        t.is(directions.length, 4);
      } else {
        t.is(directions.length, 2);
      }

      // In order to ensure that every direction is returned, use some
      // counters that will balance to predictable values.
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
    const ne = game.getAdjacentSpace(space, grid.direction.northeast);
    const nw = game.getAdjacentSpace(space, grid.direction.northwest);
    const se = game.getAdjacentSpace(space, grid.direction.southeast);
    const sw = game.getAdjacentSpace(space, grid.direction.southwest);

    // Check northwest direction.
    if (row == 0 || column == 0) {
      t.is(nw, null);
    } else {
      t.is(nw.row, row - 1);
      t.is(nw.column, column - 1);
    }

    // Check northeast direction.
    if (row == 0 || column == game.columns - 1) {
      t.is(ne, null);
    } else {
      t.is(ne.row, row - 1);
      t.is(ne.column, column + 1);
    }

    // Check southwest direction.
    if (row == game.rows - 1 || column == 0) {
      t.is(sw, null);
    } else {
      t.is(sw.row, row + 1);
      t.is(sw.column, column - 1);
    }

    // Check southeast direction.
    if (row == game.rows - 1 || column == game.columns - 1) {
      t.is(se, null);
    } else {
      t.is(se.row, row + 1);
      t.is(se.column, column + 1);
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

        const adjacentSpaces = [];
        for (const direction of game.getDirections(piece)) {
          const adjacentSpace = game.getAdjacentSpace(space, direction);
          if (adjacentSpace) {
            adjacentSpaces.push(adjacentSpace);
          }
        }

        // All hops are available if the adjacent spaces are empty.
        t.deepEqual(adjacentSpaces, game.getHops(board, space, piece));

        // Fill the adjacent spaces with pieces to block hops.
        for (const adjacentSpace of adjacentSpaces) {
          grid.setValue(board, adjacentSpace, { player: opponent });
        }

        // No hops are available if the adjacent spaces are occupied.
        t.deepEqual([], game.getHops(board, space, piece));
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
        t.deepEqual([], game.getJumps(board, space, piece));

        // Fill adjacent spaces with same pieces to block jumps.
        for (const direction of game.getDirections(piece)) {
          const adjacentSpace = game.getAdjacentSpace(space, direction);
          if (adjacentSpace) {
            grid.setValue(board, adjacentSpace, { player });
          }
        }

        // No jumps are available if the adjacent spaces are occupied by
        // the same player's pieces.
        t.deepEqual([], game.getJumps(board, space, piece));

        // Fill adjacent spaces with opponent pieces to allow jumps.
        const expectedJumps = [];
        for (const direction of game.getDirections(piece)) {
          const captureSpace = game.getAdjacentSpace(space, direction);
          if (captureSpace) {
            grid.setValue(board, captureSpace, { player: opponent });
            const targetSpace = game.getAdjacentSpace(captureSpace, direction);
            if (targetSpace) {
              expectedJumps.push(targetSpace);
            }
          }
        }

        // Jumps are available if the adjacent spaces are occupied by an
        // opponent piece, and the space directly beyond it is empty.
        t.deepEqual(expectedJumps, game.getJumps(board, space, piece));
      }
    }
  }
});

test("move must be either a hop or a jump", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 1 };

  t.throws(
    () => {
      game.setMove(board, 0, { from });
    },
    { message: "invalid move" }
  );
});

test("move must travel some distance", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 1 };
  const to = { row: 0, column: 1 };

  t.throws(
    () => {
      game.checkMove(board, 0, from, to);
    },
    { message: "piece must move" }
  );
});

test("move space must be a valid space", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 0 };
  const to = { row: 1, column: 0 };

  t.throws(
    () => {
      game.checkMove(board, 0, from, to);
    },
    { message: "invalid space" }
  );
});

test("move space must contain a piece", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 1 };
  const to = { row: 1, column: 0 };

  t.throws(
    () => {
      game.checkMove(board, 0, from, to);
    },
    { message: "piece not found" }
  );
});

test("move piece must belong to player", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 1 };
  const to = { row: 1, column: 0 };

  grid.setValue(board, from, { player: 1 });

  t.throws(
    () => {
      game.checkMove(board, 0, from, to);
    },
    { message: "piece does not belong to player" }
  );
});

test("move must be within the board", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 1, column: 0 };
  const to = { row: 2, column: -1 };
  const player = 0;

  grid.setValue(board, from, { player });

  t.throws(
    () => {
      game.checkMove(board, player, from, to);
    },
    { message: "space is outside of board" }
  );
});

test("move must be diagonal", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 1, column: 0 };
  const to = { row: 1, column: 1 };
  const player = 0;

  grid.setValue(board, from, { player });

  t.throws(
    () => {
      game.checkMove(board, player, from, to);
    },
    { message: "piece is not moving diagonally" }
  );
});

test("regular piece cannot move backwards", (t) => {
  for (const player of [0, 1]) {
    const board = game.createEmptyBoard();
    const orientation = game.getOrientation(player);
    const from = { row: 3, column: 4 };
    const to = { row: from.row - orientation, column: 3 };

    grid.setValue(board, from, { player });

    t.throws(
      () => {
        game.checkMove(board, player, from, to);
      },
      { message: "piece is not allowed to move backwards" }
    );
  }
});

test("move space must be empty", (t) => {
  for (const king of [false, true]) {
    const board = game.createEmptyBoard();
    const from = { row: 2, column: 3 };
    const player = 0;
    const piece = { player, king };

    grid.setValue(board, from, piece);

    for (const direction of game.getDirections(piece)) {
      const to = game.getAdjacentSpace(from, direction);

      grid.setValue(board, to, { player });

      t.throws(
        () => {
          game.checkMove(board, player, from, to);
        },
        { message: "space already occupied" }
      );
    }
  }
});

test("hop move must be one space", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 1 };
  const to = { row: 2, column: 3 };
  const player = 0;

  grid.setValue(board, from, { player });

  t.throws(
    () => {
      game.setHop(board, player, from, to);
    },
    { message: "piece must travel one space" }
  );
});

test("jump move must be two spaces", (t) => {
  const board = game.createEmptyBoard();
  const from = { row: 0, column: 1 };
  const tos = [
    { row: 1, column: 0 },
    { row: 3, column: 4 },
  ];
  const player = 0;

  grid.setValue(board, from, { player });

  for (const to of tos) {
    t.throws(
      () => {
        game.setJump(board, player, from, to);
      },
      { message: "piece must travel two spaces" }
    );
  }
});

test("able to move piece from one space to another", (t) => {
  for (const player of [0, 1]) {
    for (const king of [false, true]) {
      for (const from of game.getSpaces()) {
        for (const direction of game.getDirections({ player, king })) {
          const to = game.getAdjacentSpace(from, direction);
          if (to) {
            const board = game.createEmptyBoard();
            const piece = { player, king };

            grid.setValue(board, from, piece);

            // If piece moved to the other end, it should be kinged.
            const kinged = game.movePiece(board, from, to);

            if (!king && game.isKingable(to, player)) {
              t.true(kinged);
            } else {
              t.false(kinged);
            }
          }
        }
      }
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
      for (const from of game.getSpaces()) {
        for (const direction of game.getDirections({ player, king })) {
          const hop = game.getAdjacentSpace(from, direction);
          if (hop) {
            const board = game.createEmptyBoard();
            const piece = { player, king };
            grid.setValue(board, from, piece);
            game.setMove(board, player, { from, hop });
            t.is(grid.getValue(board, from), null);
            t.is(grid.getValue(board, hop), piece);
            if (!king) {
              t.is(piece.king, game.isKingable(hop, player));
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
      for (const from of game.getSpaces()) {
        for (const direction of game.getDirections({ player, king })) {
          const captureSpace = game.getAdjacentSpace(from, direction);
          if (captureSpace) {
            const targetSpace = game.getAdjacentSpace(captureSpace, direction);
            if (targetSpace) {
              const board = game.createEmptyBoard();
              const piece = { player, king };
              grid.setValue(board, from, piece);
              grid.setValue(board, captureSpace, { player: opponent });
              game.setMove(board, player, { from, jump: [targetSpace] });
              t.is(grid.getValue(board, from), null);
              t.is(grid.getValue(board, captureSpace), null);
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
      t.deepEqual({ player }, game.getWinner(board, player));

      // Easy way to set another space that is not the current one.
      const otherSpace = { row: space.column, column: space.row };
      grid.setValue(board, otherSpace, { player: opponent, king: true });

      t.is(game.getWinner(board, player), null);
    }
  }
});
