export const id = "ttt";
export const numPlayers = 2;
export const rows = 3;
export const columns = 3;

export const name = "Tic-Tac-Toe";
export const description = `
Tic-Tac-Toe is a game for <u>two players</u>, indentified with <u>X</u>
and <u>O</u>.  The game is played on a grid of <u>three rows</u> and
<u>three columns</u>.  The Players take turns marking spaces until a
winner is identified or the game ends in a draw.  A player wins by
marking <u>three spaces</u> in a row, <u>vertically</u>,
<u>horizontally</u>, or <u>diagonally</u>.
`;

export function createState() {
  return { turn: 0, board: createBoard() };
}

export function createBoard() {
  return createGrid();
}

export function setMove(state, player, move) {
  const { board } = state;
  if (getCell(board, move)) {
    throw new Error("space already occupied");
  }
  const piece = { player };
  setCell(board, move, piece);
}

export function isDraw(state) {
  const { board } = state;
  for (const space of getSpaces()) {
    if (!getCell(board, space)) return false;
  }
  return true;
}

export function getWinner(state, player) {
  const { board } = state;

  function value(c) {
    const piece = getCell(board, c);
    if (!piece) return null;
    return piece.player;
  }

  function same([c1, c2, c3]) {
    const a = value(c1);
    const b = value(c2);
    const c = value(c3);
    return a !== null && a === b && b === c;
  }

  const lines = [
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

  for (const line of lines) {
    if (same(line)) {
      return { line, player };
    }
  }

  return null;
}

export function createGrid() {
  const grid = [];
  for (let row = 0; row < rows; row++) {
    grid.push([]);
    for (let column = 0; column < columns; column++) {
      grid[row].push(null);
    }
  }
  return grid;
}

export function setCell(grid, space, value) {
  const { row, column } = space;
  grid[row][column] = value;
}

export function getCell(grid, space) {
  const { row, column } = space;
  return grid[row][column];
}

export function* getSpaces() {
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      yield { row, column };
    }
  }
}

export function* getAllPieces(board) {
  for (const space of getSpaces()) {
    const piece = getCell(board, space);
    if (piece) yield { space, piece };
  }
}
