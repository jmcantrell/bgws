/*

A bunch of functions to enable a tic-tac-toe game.

For example:

  To start a match:

    const match = createMatch()
    match == { board: [row1, row2, row3], moves: [] }

  Where each row variable looks like: ["x", "o", null]

  To make a move:

    const finished = addMove(match, { piece: "x", row: 1, column: 1 });
    match.board[1][1] == "x"
    match.moves[0] == { piece: "x", row: 1, column: 1 }

  An error will be thrown with the reason if an invalid move is made.

  The variable `finished` will be set to true if the the last move or a
  winning move was made.

  If a winning move was made then the following will be present:

    match.winner = { piece: "x", line: [cell1, cell2, cell3] }

  Where each cell variable looks like: [0, 1]
  And corresponds to a series of cells indicating a winning line.

*/


function addMove(match, move) {
  const { board, moves } = match;
  const { piece, row, column } = move;

  const turn = moves.length - 1;

  const wrongFirstPlayer = moves.length == 0 && piece == "o";
  const playerAlreadyMoved = moves.length > 0 && moves[turn].piece == piece;

  if (wrongFirstPlayer || playerAlreadyMoved) {
    throw new Error("player moving out of turn");
  }

  // Disallow move if space is taken.
  if (board[row][column]) {
    throw new Error("player making invalid move");
  }

  board[row][column] = piece;

  const nextMove = { row, column, piece };
  moves.push(nextMove);

  const winner = detectWinner(match);

  if (winner) match.winner = winner;

  return isFinished(match);
}

function isFinished(match) {
  return match.winner || match.moves.length == 9;
}

function detectWinner(match) {
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

function lastMove(match) {
  return match.moves[match.moves.length - 1];
}

function whoseTurn(match) {
  const move = lastMove(match);
  if (!move) return "x";
  return move.piece == "x" ? "o" : "x";
}

function createMatch() {
  return {
    board: createBoard(),
    moves: [],
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

module.exports = {
  addMove,
  createMatch,
  detectWinner,
  isFinished,
  lastMove,
  whoseTurn,
};
