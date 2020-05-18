export default class Game {
  constructor(id) {
    this.id = id;
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
