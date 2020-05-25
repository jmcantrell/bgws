export const id = "c4";
export const numPlayers = 2;
export const rows = 6;
export const columns = 7;

export const name = "Connect Four";
export const description = `
Connect Four is a game for <u>two players</u>, identified with <b
style="color:yellow">yellow</b> and <b style="color:red">red</b> discs.
The game is played on a grid of <u>seven columns</u> and <u>six
rows</u>.  The players take turns dropping discs into a column until a
winner is identified or the game ends in a draw.  A player wins by
getting <u>four discs</u> in a row, <u>vertically</u>,
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
  const { column } = move;
  const row = getNextRow(board, column);
  if (row === null) {
    throw new Error("no spaces available in column");
  }
  move.row = row;
  const space = { row, column };
  const piece = { player };
  setCell(board, space, piece);
}

export function isDraw(state) {
  const { board } = state;
  for (let column = 0; column < columns; column++) {
    if (getNextRow(board, column) >= 0) return false;
  }
  return true;
}

export function getWinner(state, player, move) {
  const { board } = state;
  const { column, row } = move;

  // Calculate the starting positions for lines to check for a win.
  const heads = [
    // Since the last move will always be the topmost piece of a column,
    // there's only one line to check for the vertical direction.
    { start: { column, row: row - 3 }, direction: { column: 0, row: 1 } },
  ];

  // For the remaining directons, there will be four lines to check,
  // incrementing the the direction by one cell each time.
  for (let i = 0; i < 4; i++) {
    const c = column - i;
    let r;

    // Ensure the check is in bounds.
    if (c < 0) continue;

    // The horizonal direction.
    heads.push({
      start: { column: c, row },
      direction: { column: 1, row: 0 },
    });

    // The diagonal direction southwest to northeast.
    r = row - i;
    if (r >= 0) {
      heads.push({
        start: { column: c, row: r },
        direction: { column: 1, row: 1 },
      });
    }

    // The diagonal direction northwest to southeast.
    r = row + i;
    if (r < rows) {
      heads.push({
        start: { column: c, row: r },
        direction: { column: 1, row: -1 },
      });
    }
  }

  for (const head of heads) {
    const line = make(head);
    if (valid(line) && check(line)) {
      return { line, player };
    }
  }

  return null;

  // Ensure the line is in bounds.
  function valid(line) {
    const head = line[0];
    const tail = line[3];
    return (
      head.column >= 0 &&
      head.row >= 0 &&
      tail.column < columns &&
      tail.row < rows
    );
  }

  // Check that the line is all the same player.
  function check(line) {
    for (const space of line) {
      const piece = getCell(board, space);
      if (!piece || piece.player !== player) return false;
    }
    return true;
  }

  // Build a line starting at `head.start` and ending four cells in the
  // direction `head.direction`.
  function make(head) {
    const line = [];
    const { column: c, row: r } = head.start;
    const { column: dc, row: dr } = head.direction;
    for (let i = 0; i < 4; i++) {
      line.push({ column: c + i * dc, row: r + i * dr });
    }
    return line;
  }
}

export function createGrid() {
  const grid = [];
  for (let column = 0; column < columns; column++) {
    grid.push([]);
    for (let row = 0; row < rows; row++) {
      grid[column].push(null);
    }
  }
  return grid;
}

export function getCell(grid, space) {
  const { row, column } = space;
  return grid[column][row];
}

export function setCell(grid, space, value) {
  const { row, column } = space;
  grid[column][row] = value;
}

export function* getSpaces() {
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      yield { row, column };
    }
  }
}

export function* getAllPieces(board) {
  for (const space of getSpaces()) {
    const piece = getCell(board, space);
    if (piece) yield { piece, space };
  }
}

export function* getPieces(board, player) {
  for (const { piece, space } of getAllPieces()) {
    if (piece.player == player) {
      yield { piece, space };
    }
  }
}

export function getNextRow(board, column) {
  const row = board[column].findIndex((p) => p === null);
  if (row < 0) return null;
  return row;
}
