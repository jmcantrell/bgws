import Game from "../game.js";

export default class TicTacToe extends Game {
  constructor() {
    super("ttt");
    this.numPlayers = 2;
  }

  createMatch() {
    return {
      moves: [],
      next: 0,
      board: this.createBoard(),
    };
  }

  getState(match, player) {
    const { board, finished, winner } = match;
    const state = { player: player.index, board, finished, winner };
    state.turn = finished ? null : match.next == player.index;
    state.won = winner ? winner.player == player.index : null;
    return state;
  }

  createBoard() {
    const board = [];
    for (let row = 0; row < 3; row++) {
      board.push([]);
      for (let column = 0; column < 3; column++) {
        board[row].push(null);
      }
    }
    return board;
  }

  addMove(match, player, move) {
    const { board, moves } = match;

    if (match.finished) {
      throw new Error("match already finished");
    }

    if (moves.length == 0 && player.index > 0) {
      throw new Error("only player one can move first");
    }

    if (moves.length > 0) {
      const last = moves[moves.length - 1];
      if (last.player == player.index) {
        throw new Error("player already moved");
      }
    }

    const { row, column } = move;

    if (board[row][column] !== null) {
      throw new Error("space already occupied");
    }

    board[row][column] = player.index;

    move.player = player.index;
    moves.push(move);

    match.winner = this.getWinner(match);
    match.finished = Boolean(match.winner) || this.isDraw(match);

    const next = (player.index + 1) % this.numPlayers;
    match.next = match.finished ? null : next;
  }

  isDraw(match) {
    return match.moves.length == 9;
  }

  getWinner(match) {
    const { board } = match;

    function cell({ row, column }) {
      return board[row][column];
    }

    function same([c1, c2, c3]) {
      const a = cell(c1);
      const b = cell(c2);
      const c = cell(c3);
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
        return {
          line,
          player: board[line[0].row][line[0].column],
        };
      }
    }

    return null;
  }
}
