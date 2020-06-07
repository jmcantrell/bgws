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
  let kinged = false;

  if (move.hop) {
    const { from, hop: to } = move;
    kinged = setHop(board, player, from, to);
  } else if (move.jump) {
    let { from } = move;
    for (const to of move.jump) {
      kinged = setJump(board, player, from, to);
      from = to;
    }
  } else {
    throw new Error("invalid move");
  }

  if (kinged) move.kinged = true;
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
    const targetSpace = getAdjacentSpace(space, direction);
    if (targetSpace && !grid.getValue(board, targetSpace)) {
      hops.push(targetSpace);
    }
  }
  return hops;
}

export function getJumps(board, space, piece) {
  const jumps = [];
  for (const direction of getDirections(piece)) {
    const captureSpace = getAdjacentSpace(space, direction);
    if (captureSpace) {
      const capturePiece = grid.getValue(board, captureSpace);
      if (capturePiece && capturePiece.player != piece.player) {
        const targetSpace = getAdjacentSpace(captureSpace, direction);
        if (targetSpace && !grid.getValue(board, targetSpace)) {
          jumps.push(targetSpace);
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

export function checkMove(board, player, from, to) {
  if (!isPlayableSpace(from)) {
    throw new Error("invalid space");
  }

  if (grid.isSameSpace(from, to)) {
    throw new Error("piece must move");
  }

  const piece = grid.getValue(board, from);

  if (!piece) {
    throw new Error("piece not found");
  }

  if (piece.player != player) {
    throw new Error("piece does not belong to player");
  }

  if (!isInside(to)) {
    throw new Error("space is outside of board");
  }

  if (from.row == to.row || from.column == to.column) {
    throw new Error("piece is not moving diagonally");
  }

  const orientation = Math.sign(to.row - from.row);

  if (!piece.king && orientation != getOrientation(player)) {
    throw new Error("piece is not allowed to move backwards");
  }

  if (grid.getValue(board, to)) {
    throw new Error("space already occupied");
  }
}

export function movePiece(board, from, to) {
  const piece = grid.moveValue(board, from, to);

  if (!piece.king && isKingable(to, piece.player)) {
    piece.king = true;
    return true;
  }

  return false;
}

export function setHop(board, player, from, to) {
  checkMove(board, player, from, to);

  const distance = grid.getDistance(from, to);

  if (Math.abs(distance.row) != 1 || Math.abs(distance.column) != 1) {
    throw new Error("piece must travel one space");
  }

  return movePiece(board, from, to);
}

export function setJump(board, player, from, to) {
  checkMove(board, player, from, to);

  const distance = grid.getDistance(from, to);
  const direction = grid.getDirection(from, to);

  if (Math.abs(distance.row) != 2 || Math.abs(distance.column) != 2) {
    throw new Error("piece must travel two spaces");
  }

  const captureSpace = getAdjacentSpace(from, direction);
  const capturePiece = grid.getValue(board, captureSpace);

  if (!capturePiece || capturePiece.player == player) {
    throw new Error("piece must jump an opponent piece");
  }

  grid.setValue(board, captureSpace, null);

  return movePiece(board, from, to);
}
