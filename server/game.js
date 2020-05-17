class Game {
  constructor(id, name, numPlayers) {
    this.id = id;
    this.name = name;
    this.numPlayers = numPlayers;
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

  command(match, player, command) {
    switch (command.action) {
      case "move":
        return this.addMove(match, player, command.move);
      default:
        throw new Error("invalid command");
    }
  }
}

module.exports = Game;
