import Game from "../game.js";

export default class ConnectFour extends Game {
  constructor() {
    super("c4");
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
    for (let column = 0; column < 7; column++) {
      board.push([]);
      for (let row = 0; row < 6; row++) {
        board[column].push(null);
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

    const { column } = move;
    const row = board[column].findIndex((p) => p === null);

    if (row < 0) {
      throw new Error("no spaces available in column");
    }

    move.row = row;
    board[column][row] = player.index;

    move.player = player.index;
    moves.push(move);

    match.winner = this.getWinner(match);
    match.finished = Boolean(match.winner) || this.isDraw(match);

    const next = (player.index + 1) % this.numPlayers;
    match.next = match.finished ? null : next;
  }

  getWinner(match) {
    return null;
  }

  isDraw(match) {
    return false;
  }
}
