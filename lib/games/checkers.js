export const id = "checkers";
export const numPlayers = 2;
export const rows = 8;
export const columns = 8;

export const name = "Checkers";
export const description = `
Checkers is a game for <u>two players</u>, identified with <b
style="color:red">red</b> and <b style="color:white">white</b> pieces.
The game is played on a grid of <u>eight columns</u> and <u>eight
rows</u>.  Each player starts with <u>twelve pieces</u> placed on the
dark tiles of the first three rows of their side of the board.  The
players take turns moving diagonally toward the other end of the board.
Gameplay continues until all of a player's pieces are captured.  Pieces
are captured when a player "jumps" an opponent's piece.
`;

export function createState() {
  return { turn: 0, board: createBoard() };
}

export function createBoard() {
  const board = createGrid();
  for (let row = 0; row < 3; row++) {
    const even = Boolean(row % 2);
    const start = even ? 0 : 1;
    for (let i = 0; i < 4; i++) {
      const column = start + 2 * i;
      setCell(board, { row, column }, { player: 1 });
    }
  }
  for (let row = rows - 3; row < rows; row++) {
    const even = Boolean(row % 2);
    const start = even ? 0 : 1;
    for (let i = 0; i < 4; i++) {
      const column = start + 2 * i;
      setCell(board, { row, column }, { player: 0 });
    }
  }
  return board;
}

export function setMove(state, player, move) {
  const { board } = state;
  const { from } = move;
  const piece = getCell(board, from);

  if (!piece) {
    throw new Error("no piece at that space");
  }

  if (piece.player != player) {
    throw new Error("piece does not belong to player");
  }

  let to;
  const orientation = getOrientation(player);

  if (move.hop) {
    const { hop } = move;
    if (!checkInBoard(hop)) {
      throw new Error("space outside of board");
    }
    if (!piece.king && hop.row - from.row != orientation) {
      throw new Error("unable to move regular piece backwards");
    }
    if (from.row == hop.row || from.column == hop.column) {
      throw new Error("piece must move diagonally");
    }
    if (
      Math.abs(from.row - hop.row) != 1 ||
      Math.abs(from.column - hop.column) != 1
    ) {
      throw new Error("hop must be only one space");
    }
    if (getCell(board, hop)) {
      throw new Error("space already occupied");
    }
    to = hop;
  } else if (move.jump) {
    let prev = from;
    for (const space of move.jump) {
      if (!checkInBoard(space)) {
        throw new Error("space outside of board");
      }
      const rowDiff = space.row - prev.row;
      const columnDiff = space.column - prev.column;
      if (!piece.king && rowDiff / Math.abs(rowDiff) != orientation) {
        throw new Error("unable to move regular piece backward");
      }
      if (prev.row == space.row || prev.column == space.column) {
        throw new Error("piece must move diagonally");
      }
      if (Math.abs(rowDiff) != 2 || Math.abs(columnDiff) != 2) {
        throw new Error("jump step must be only two spaces");
      }
      const direction = getDirection(prev, space);
      const jumped = getAdjacent(board, prev, direction);
      if (!jumped.piece) {
        throw new Error("unable to jump an empty space");
      }
      if (jumped.piece.player == player) {
        throw new Error("must only jump an opponent piece");
      }
      setCell(board, jumped.space, null);
      if (getCell(board, space)) {
        throw new Error("space already occupied");
      }
      prev = space;
    }
    to = prev;
  } else {
    throw new Error("invalid move");
  }

  moveCell(board, from, to);

  if ((player == 0 && to.row == 0) || (player == 1 && to.row == rows - 1)) {
    piece.king = true;
  }
}

export function isDraw(state) {
  const { board } = state;
  for (const { space } of getAllPieces(board)) {
    if (getMoves(board, space)) return false;
  }
  return true;
}

export function getWinner(state, player) {
  const { board } = state;
  const opponent = (player + 1) % numPlayers;
  const pieces = Array.from(getPieces(board, opponent));
  if (pieces.length === 0) return { player }
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

export function* getSpaces() {
  for (let row = 0; row < rows; row++) {
    const evenRow = Boolean(row % 2);
    for (let column = 0; column < columns; column++) {
      const evenColumn = Boolean(column % 2);
      if ((evenRow && !evenColumn) || (!evenRow && evenColumn)) {
        yield { row, column };
      }
    }
  }
}

export function checkInBoard(space) {
  const { row, column } = space;
  return row >= 0 && row < rows && column >= 0 && column < columns;
}

export function sameSpace(a, b) {
  return a.row == b.row && a.column == b.column;
}

export function setCell(grid, space, value) {
  const { row, column } = space;
  grid[row][column] = value;
}

export function getCell(grid, space) {
  const { row, column } = space;
  return grid[row][column];
}

export function moveCell(grid, from, to) {
  const value = getCell(grid, from);
  setCell(grid, to, value);
  setCell(grid, from, null);
  return value;
}

export function getOrientation(player) {
  return player == 0 ? -1 : 1;
}

export function getDirection(from, to) {
  const row = from.row < to.row ? 1 : -1;
  const column = from.column < to.column ? 1 : -1;
  return { row, column };
}

export function isInBounds({ row, column }) {
  return row >= 0 && row < rows && column >= 0 && column < columns;
}

export function* getDirections(board, piece) {
  const orientation = getOrientation(piece.player);
  yield { row: orientation, column: 1 };
  yield { row: orientation, column: -1 };
  if (piece.king) {
    yield { row: -orientation, column: 1 };
    yield { row: -orientation, column: -1 };
  }
}

export function* getAllPieces(board) {
  for (const space of getSpaces()) {
    const piece = getCell(board, space);
    if (piece) yield { piece, space };
  }
}

export function* getPieces(board, player) {
  for (const { piece, space } of getAllPieces(board)) {
    if (piece.player == player) {
      yield { piece, space };
    }
  }
}

export function getMoves(board, space) {
  const piece = getCell(board, space);
  if (piece) {
    const hops = Array.from(getHops(board, piece, space));
    const jumps = Array.from(getJumps(board, piece, space));
    if (hops.length > 0 || jumps.length > 0) {
      const moves = {};
      if (hops.length > 0) moves.hops = hops;
      if (jumps.length > 0) moves.jumps = jumps;
      return moves;
    }
  }
  return null;
}

export function* getHops(board, piece, space) {
  for (const dir of getDirections(board, piece)) {
    const adj = getAdjacent(board, space, dir);
    if (adj && !adj.piece) yield adj.space;
  }
}

export function* getJumps(board, piece, space, path = null) {
  if (!path) path = [];
  let more = false;
  for (const dir of getDirections(board, piece)) {
    const capture = getAdjacent(board, space, dir);
    if (capture && capture.piece && capture.piece.player != piece.player) {
      const target = getAdjacent(board, capture.space, dir);
      if (target && !target.piece) {
        const seen = path.some((jump) => sameSpace(jump.space, target.space));
        if (!seen) {
          more = true;
          const jump = { space: target.space, capture };
          yield* getJumps(board, piece, jump.space, path.concat([jump]));
        }
      }
    }
  }
  if (!more && path.length > 0) yield path;
}

export function addSpace(a, b) {
  return {
    row: a.row + b.row,
    column: a.column + b.column,
  };
}

export function getAdjacent(grid, from, direction) {
  const space = addSpace(from, direction);
  if (isInBounds(space)) {
    const piece = getCell(grid, space);
    return { piece, space };
  } else {
    return null;
  }
}
