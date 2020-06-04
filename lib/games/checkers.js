import * as grid from "../grid.js";

export const id = "checkers";
export const numPlayers = 2;

export const rows = 8;
export const columns = 8;

export const name = "Checkers";
export const description = `
Checkers is a game for <u>two players</u>, identified with <b
style="color:red">red</b> and <b style="color:white">white</b> pieces.
The game is played on a grid of <u>eight columns</u> and <u>eight
rows</u>. Each player starts with <u>twelve pieces</u> placed on the
dark tiles of the first three rows of their side of the board. The
players take turns moving diagonally toward the other end of the board.
Gameplay continues until all of a player's pieces are captured. Pieces
are captured when a player "jumps" an opponent's piece.
`;

export function createBoard() {
  const board = createGrid();

  const spaces = Array.from(getSpaces());

  for (const space of spaces.slice(0, 12)) {
    const piece = { player: 1 };
    grid.setValue(board, space, piece);
  }

  for (const space of spaces.slice(spaces.length - 12)) {
    const piece = { player: 0 };
    grid.setValue(board, space, piece);
  }

  return board;
}

export function createGrid() {
  return grid.create(rows, columns);
}

export function isInside(space) {
  return grid.isInside(rows, columns, space);
}

export function* getSpaces() {
  for (const space of grid.getSpaces(rows, columns)) {
    if (space.row % 2 != space.column % 2) {
      yield space;
    }
  }
}

export function setMove(board, player, move) {
  const { from } = move;
  const piece = grid.getValue(board, from);

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

    if (!isInside(hop)) {
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

    if (grid.getValue(board, hop)) {
      throw new Error("space already occupied");
    }

    to = hop;
  } else if (move.jump) {
    const { jump } = move;

    let prev = from;

    for (const space of jump) {
      if (!isInside(space)) {
        throw new Error("space outside of board");
      }

      const rowDistance = space.row - prev.row;
      const columnDistance = space.column - prev.column;

      if (!piece.king && rowDistance / Math.abs(rowDistance) != orientation) {
        throw new Error("unable to move regular piece backward");
      }

      if (prev.row == space.row || prev.column == space.column) {
        throw new Error("piece must move diagonally");
      }

      if (Math.abs(rowDistance) != 2 || Math.abs(columnDistance) != 2) {
        throw new Error("jump step must be only two spaces");
      }

      const direction = {
        row: prev.row < space.row ? 1 : -1,
        column: prev.column < space.column ? 1 : -1,
      };

      const jumped = getAdjacent(board, prev, direction);

      if (!jumped.piece) {
        throw new Error("unable to jump an empty space");
      }

      if (jumped.piece.player == player) {
        throw new Error("must only jump an opponent piece");
      }

      grid.setValue(board, jumped.space, null);

      if (grid.getValue(board, space)) {
        throw new Error("space already occupied");
      }

      prev = space;
    }

    to = prev;
  } else {
    throw new Error("invalid move");
  }

  movePiece(board, from, to);

  if ((player == 0 && to.row == 0) || (player == 1 && to.row == rows - 1)) {
    piece.king = true;
  }
}

export function isDraw(board) {
  for (const space of getSpaces()) {
    if (getMoves(board, space)) return false;
  }
  return true;
}

export function getWinner(board, player) {
  const opponent = (player + 1) % numPlayers;
  for (const space of getSpaces()) {
    const piece = grid.getValue(board, space);
    if (piece && piece.player == opponent) return null;
  }
  return { player };
}

export function movePiece(board, from, to) {
  const piece = grid.getValue(board, from);
  grid.setValue(board, to, piece);
  grid.setValue(board, from, null);
  return piece;
}

export function getOrientation(player) {
  return player == 0 ? -1 : 1;
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

export function getMoves(board, space) {
  const piece = grid.getValue(board, space);
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
  for (const direction of getDirections(board, piece)) {
    const adjacent = getAdjacent(board, space, direction);
    if (adjacent && !adjacent.piece) yield adjacent.space;
  }
}

export function* getJumps(board, piece, space, path = null) {
  if (!path) path = [];
  let more = false;
  for (const direction of getDirections(board, piece)) {
    const capture = getAdjacent(board, space, direction);
    if (capture && capture.piece && capture.piece.player != piece.player) {
      const target = getAdjacent(board, capture.space, direction);
      if (target && !target.piece) {
        const seen = path.some((jump) =>
          grid.isSameSpace(jump.space, target.space)
        );
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

export function getAdjacent(board, from, direction) {
  const space = {
    row: from.row + direction.row,
    column: from.column + direction.column,
  };
  if (isInside(space)) {
    const piece = grid.getValue(board, space);
    return { space, piece };
  } else {
    return null;
  }
}
