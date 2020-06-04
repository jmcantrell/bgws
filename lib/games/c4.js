import * as grid from "../grid.js";

export const id = "c4";
export const numPlayers = 2;

export const rows = 6;
export const columns = 7;

export const name = "Connect Four";
export const description = `
Connect Four is a game for <u>two players</u>, identified with <b
style="color:yellow">yellow</b> and <b style="color:red">red</b> discs.
The game is played on a grid of <u>seven columns</u> and <u>six
rows</u>. The players take turns dropping discs into a column until a
winner is identified or the game ends in a draw. A player wins by
getting <u>four discs</u> in a row, <u>vertically</u>,
<u>horizontally</u>, or <u>diagonally</u>.
`;

export function createBoard() {
  return grid.create(rows, columns);
}

export function isInside(space) {
  return grid.isInside(rows, columns, space);
}

export function* getSpaces() {
  yield* grid.getSpaces(rows, columns);
}

export function setMove(board, player, move) {
  const { column } = move;
  if (column < 0 || column >= columns) {
    throw new Error("space is outside bounds of board");
  }
  const space = getPlayableSpace(board, column);
  if (!space) {
    throw new Error("no spaces available in column");
  }
  move.row = space.row;
  const piece = { player };
  grid.setValue(board, space, piece);
}

export function isDraw(board) {
  for (let column = 0; column < columns; column++) {
    if (getPlayableSpace(board, column)) return false;
  }
  return true;
}

export function getWinner(board, player, space) {
  const { row, column } = space;

  // Calculate the starting positions for lines to check for a win.
  function* getHeads() {
    // Since the last move will always be the topmost piece of a column,
    // there's only one line to check for the vertical direction.
    yield { start: { row: row - 3, column }, direction: { row: 1, column: 0 } };

    // For the remaining directons, there will be four lines to check,
    // incrementing the the direction by one cell each time.
    for (let i = 0; i < 4; i++) {
      const c = column - i;
      let r;

      // Ensure the check is in bounds.
      if (c < 0) continue;

      // The horizonal direction.
      yield {
        start: { row, column: c },
        direction: { row: 0, column: 1 },
      };

      // The diagonal direction southwest to northeast.
      r = row - i;
      if (r >= 0) {
        yield {
          start: { row: r, column: c },
          direction: { row: 1, column: 1 },
        };
      }

      // The diagonal direction northwest to southeast.
      r = row + i;
      if (r < rows) {
        yield {
          start: { row: r, column: c },
          direction: { row: -1, column: 1 },
        };
      }
    }
  }

  // Build a line starting at `start` and ending `length` cells in the
  // direction of `direction`.
  function getLine(start, direction) {
    const line = [];
    for (let i = 0; i < 4; i++) {
      line.push({
        row: start.row + i * direction.row,
        column: start.column + i * direction.column,
      });
    }
    return line;
  }

  for (const { start, direction } of getHeads()) {
    const line = getLine(start, direction);
    if (isInside(line[0]) && isInside(line[3])) {
      const pieces = line.map((space) => grid.getValue(board, space));
      if (!pieces.includes(null)) {
        if (pieces.every((piece) => piece.player == player)) {
          return { line, player };
        }
      }
    }
  }

  return null;
}

export function getPlayableSpace(board, column) {
  for (let row = 0; row < rows; row++) {
    const space = { row, column };
    const value = grid.getValue(board, space);
    if (!value) return space;
  }
  return null;
}
