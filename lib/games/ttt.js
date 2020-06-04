import * as grid from "../grid.js";

export const id = "ttt";
export const numPlayers = 2;

export const rows = 3;
export const columns = 3;

export const name = "Tic-Tac-Toe";
export const description = `
Tic-Tac-Toe is a game for <u>two players</u>, indentified with <u>X</u>
and <u>O</u>. The game is played on a grid of <u>three rows</u> and
<u>three columns</u>. The Players take turns marking spaces until a
winner is identified or the game ends in a draw. A player wins by
marking <u>three spaces</u> in a row, <u>vertically</u>,
<u>horizontally</u>, or <u>diagonally</u>.
`;

export function createBoard() {
  return createGrid();
}

export function createGrid() {
  return grid.create(rows, columns);
}

export function isInside(space) {
  return grid.isInside(rows, columns, space);
}

export function* getSpaces() {
  yield* grid.getSpaces(rows, columns);
}

export function setMove(board, player, space) {
  if (!isInside(space)) {
    throw new Error("space is outside bounds of board");
  }
  if (grid.getValue(board, space)) {
    throw new Error("space already occupied");
  }
  const piece = { player };
  grid.setValue(board, space, piece);
}

export function isDraw(board) {
  for (const space of getSpaces()) {
    if (!grid.getValue(board, space)) return false;
  }
  return true;
}

export const winningLines = [
  [
    // row 1
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 0, column: 2 },
  ],
  [
    // row 2
    { row: 1, column: 0 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
  ],
  [
    // row 3
    { row: 2, column: 0 },
    { row: 2, column: 1 },
    { row: 2, column: 2 },
  ],
  [
    // column 1
    { row: 0, column: 0 },
    { row: 1, column: 0 },
    { row: 2, column: 0 },
  ],
  [
    // column 2
    { row: 0, column: 1 },
    { row: 1, column: 1 },
    { row: 2, column: 1 },
  ],
  [
    // column 3
    { row: 0, column: 2 },
    { row: 1, column: 2 },
    { row: 2, column: 2 },
  ],
  [
    // diagonal 1
    { row: 0, column: 0 },
    { row: 1, column: 1 },
    { row: 2, column: 2 },
  ],
  [
    // diagonal 2
    { row: 0, column: 2 },
    { row: 1, column: 1 },
    { row: 2, column: 0 },
  ],
];

export function getWinner(board) {
  function value(c) {
    const piece = grid.getValue(board, c);
    if (!piece) return null;
    return piece.player;
  }

  function same([c1, c2, c3]) {
    const a = value(c1);
    const b = value(c2);
    const c = value(c3);
    return a !== null && a === b && b === c;
  }

  for (const line of winningLines) {
    if (same(line)) {
      return { line, player: value(line[0]) };
    }
  }

  return null;
}
