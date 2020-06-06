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
  const board = createEmptyBoard();

  const spaces = Array.from(getSpaces());

  for (const space of spaces.slice(0, 12)) {
    const piece = { player: 0 };
    grid.setValue(board, space, piece);
  }

  for (const space of spaces.slice(spaces.length - 12)) {
    const piece = { player: 1 };
    grid.setValue(board, space, piece);
  }

  return board;
}

export function createEmptyBoard() {
  return grid.create(rows, columns);
}

export function isInside(space) {
  return grid.isInside(rows, columns, space);
}

export function isPlayableSpace(space) {
  return isInside(space) && space.row % 2 != space.column % 2;
}

export function* getSpaces() {
  for (const space of grid.getSpaces(rows, columns)) {
    if (isPlayableSpace(space)) yield space;
  }
}

export function setMove(board, player, move) {
  const { from } = move;

  if (!isPlayableSpace(from)) {
    throw new Error("invalid space");
  }

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

    if (
      Math.abs(from.row - hop.row) != 1 ||
      Math.abs(from.column - hop.column) != 1
    ) {
      throw new Error("hop must be only one space");
    }

    if (!isInside(hop)) {
      throw new Error("space outside of board");
    }

    if (!piece.king && hop.row - from.row != orientation) {
      throw new Error("unable to move regular piece backwards");
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

      const jumpedSpace = getAdjacentSpace(prev, direction);

      if (!jumpedSpace) {
        throw new Error("unable to jump outside of the board");
      }

      const jumpedPiece = grid.getValue(board, jumpedSpace);

      if (!jumpedPiece) {
        throw new Error("unable to jump an empty space");
      }

      if (jumpedPiece.player == player) {
        throw new Error("must only jump an opponent piece");
      }

      if (grid.getValue(board, space)) {
        throw new Error("space already occupied");
      }

      grid.setValue(board, jumpedSpace, null);
      prev = space;
    }

    to = prev;
  } else {
    throw new Error("invalid move");
  }

  grid.moveValue(board, from, to);

  if (isKingable(to, player)) piece.king = true;
}

export function isKingable(space, player) {
  const orientation = getOrientation(player);
  const endRow = orientation > 0 ? rows - 1 : 0;
  return space.row == endRow;
}

export function isDraw(board) {
  for (const space of getSpaces()) {
    const piece = grid.getValue(board, space);
    if (piece) {
      const hops = getHops(board, space, piece);
      const jumps = getJumps(board, space, piece);
      if (hops.length > 0 || jumps.length > 0) {
        return false;
      }
    }
  }
  return true;
}

export function getWinner(board, player) {
  const opponent = (player + 1) % numPlayers;
  for (const space of getSpaces()) {
    const piece = grid.getValue(board, space);
    if (piece && piece.player == opponent) {
      const hops = getHops(board, space, piece);
      const jumps = getJumps(board, space, piece);
      if (hops.length > 0 || jumps.length > 0) {
        return null;
      }
    }
  }
  return { player };
}

export function getOrientation(player) {
  return player == 0 ? 1 : -1;
}

export function* getDirections(piece) {
  const orientation = getOrientation(piece.player);
  yield { row: orientation, column: 1 };
  yield { row: orientation, column: -1 };
  if (piece.king) {
    yield { row: -orientation, column: 1 };
    yield { row: -orientation, column: -1 };
  }
}

export function getHops(board, space, piece) {
  const hops = [];
  for (const direction of getDirections(piece)) {
    const hop = getAdjacentSpace(space, direction);
    if (hop && !grid.getValue(board, hop)) {
      hops.push(hop);
    }
  }
  return hops;
}

export function getJumps(board, space, piece) {
  const jumps = [];
  for (const direction of getDirections(piece)) {
    const capture = { space: getAdjacentSpace(space, direction) };
    if (capture.space) {
      capture.piece = grid.getValue(board, capture.space);
      if (capture.piece && capture.piece.player != piece.player) {
        const target = getAdjacentSpace(capture.space, direction);
        if (target && !grid.getValue(board, target)) {
          jumps.push({ space: target, capture });
        }
      }
    }
  }
  return jumps;
}

export function getAdjacentSpace(from, direction) {
  const space = grid.addSpace(from, direction);
  return isInside(space) ? space : null;
}
