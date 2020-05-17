const path = require("path");
const glob = require("glob");

const games = new Map();
const filenames = glob.sync(path.join(__dirname, "games", "*.js"));

for (const filename of filenames) {
  const Game = require(filename);
  const game = new Game();
  games.set(game.id, game);
}

module.exports = games;
