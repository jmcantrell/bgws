import Game from "../game.js";

const COLUMNS = 7;
const ROWS = 6;

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

  createBoard() {
    const board = [];
    for (let column = 0; column < COLUMNS; column++) {
      board.push([]);
      for (let row = 0; row < ROWS; row++) {
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

    match.winner = this.getWinner(board, player, move);
    match.finished = Boolean(match.winner) || this.isDraw(match);

    const next = (player.index + 1) % this.numPlayers;
    match.next = match.finished ? null : next;
  }

  getState(match, player) {
    const { board, finished, winner, next } = match;
    const state = { player: player.index, board, finished, winner, next };
    return state;
  }

  isDraw(match) {
    return match.moves.length == 42;
  }

  getWinner(board, player, move) {
    const { column, row } = move;

    function valid(line) {
      const head = line[0];
      const tail = line[3];
      return (
        head.column >= 0 &&
        head.row >= 0 &&
        tail.column < COLUMNS &&
        tail.row < ROWS
      );
    }

    function check(line) {
      for (const space of line) {
        const { column: c, row: r } = space;
        if (player.index !== board[c][r]) return false;
      }
      return true;
    }

    function make(head) {
      const line = [];
      const { column: c, row: r } = head.start;
      const { column: dc, row: dr } = head.direction;
      for (let i = 0; i < 4; i++) {
        line.push({ column: c + i * dc, row: r + i * dr });
      }
      return line;
    }

    const heads = [
      { start: { column, row: row - 3 }, direction: { column: 0, row: 1 } },
    ];

    for (let i = 0; i < 4; i++) {
      const c = column - i;
      let r;

      if (c < 0) continue;

      heads.push({
        start: { column: c, row },
        direction: { column: 1, row: 0 },
      });

      r = row - i;
      if (r >= 0) {
        heads.push({
          start: { column: c, row: r },
          direction: { column: 1, row: 1 },
        });
      }

      r = row + i;
      if (r < ROWS) {
        heads.push({
          start: { column: c, row: r },
          direction: { column: 1, row: -1 },
        });
      }
    }

    for (const head of heads) {
      const line = make(head);
      if (valid(line) && check(line)) {
        return { line, player: player.index };
      }
    }
    return null;
  }
}
