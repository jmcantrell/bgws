const numPlayers = 2;
const name = "Tic-Tac-Toe";
const pieces = ["x", "o"];

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
  for (let row = 0; row < 3; row++) {
    board.push([]);
    for (let column = 0; column < 3; column++) {
      board[row].push(null);
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
  const { row, column } = move;
  const { moves, board } = match;

  if (match.finished) {
    throw new Error("match already finished");
  }

  const i = pieces.indexOf(piece);

  if (moves.length == 0 && i > 0) {
    throw new Error("only player one can move first");
  }

  // Disallow move if same player previously moved
  if (moves.length > 0) {
    const last = moves[moves.length - 1];
    if (last.piece == piece) {
      throw new Error("player already moved");
    }
  }

  // Disallow move if space already occupied
  if (board[row][column]) {
    throw new Error("space already occupied");
  }

  board[row][column] = piece;

  move.piece = piece;
  moves.push(move);

  match.winner = getWinner(match);
  match.finished = Boolean(match.winner) || isFinished(match);

  const next = pieces[(i + 1) % pieces.length];
  match.next = match.finished ? null : next;
}

function isFinished(match) {
  return match.moves.length == 9;
}

function getWinner(match) {
  const { board } = match;

  function cell([row, column]) {
    return board[row][column];
  }

  function same([c1, c2, c3]) {
    const a = cell(c1);
    const b = cell(c2);
    const c = cell(c3);
    return a && a == b && b == c;
  }

  const lines = [
    [
      // row 1
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      // row 2
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      // row 3
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    [
      // column 1
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      // column 2
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      // column 3
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    [
      // diagonal 1
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      // diagonal 2
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ];

  for (const line of lines) {
    if (same(line)) {
      return {
        line,
        piece: board[line[0][0]][line[0][1]],
      };
    }
  }

  return null;
}
