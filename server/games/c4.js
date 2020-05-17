const numPlayers = 2;
const name = "Connect Four";
const pieces = ["yellow", "red"];

module.exports = {
  name,
  pieces,
  numPlayers,
  createMatch,
  getState,
  command,
};

function createMatch() {
  return {
    moves: [],
    next: pieces[0],
    board: createBoard(),
  };
}

function createBoard() {
  const board = [];
  for (let column = 0; column < 7; column++) {
    board.push([]);
    for (let row = 0; row < 6; row++) {
      board[column].push(null);
    }
  }
  return board;
}

function getState(match, piece) {
  const { board, finished, winner } = match;
  const update = { piece, board, finished, winner };
  update.turn = finished ? null : match.next == piece;
  update.won = winner ? winner.piece == piece : null;
  return update;
}

function command(match, player, command) {
  switch (command.action) {
    case "move":
      return addMove(match, player.piece, command.move);
    default:
      throw new Error("invalid command");
  }
}

function addMove(match, piece, move) {
  const { column } = move;
  const { moves, board } = match;

  if (match.finished) {
    throw new Error("match already finished");
  }

  const i = pieces.indexOf(piece);

  if (moves.length == 0 && i > 0) {
    throw new Error("only player one can move first");
  }

  // Disallow move if same player previously moved.
  if (moves.length > 0) {
    const last = moves[moves.length - 1];
    if (last.piece == piece) {
      throw new Error("player already moved");
    }
  }

  const row = board[column].findIndex((p) => p === null);

  // Disallow move if no spaces left in column.
  if (row < 0) {
    throw new Error(`no space available in column ${column + 1}`);
  }

  board[column][row] = piece;

  move.piece = piece;
  moves.push(move);

  match.winner = getWinner(match);
  match.finished = Boolean(match.winner) || isFinished(match);

  const next = pieces[(i + 1) % pieces.length];
  match.next = match.finished ? null : next;
}

function isFinished(match) {
  return false;
}

function getWinner(match) {
  return null;
}
