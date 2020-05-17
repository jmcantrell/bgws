const path = require("path");
const glob = require("glob");

const games = new Map();
const filenames = glob.sync(path.join(__dirname, "games", "*.js"));

for (const filename of filenames) {
  const id = path.basename(filename, ".js");
  const game = require(filename);
  game.id = id;
  games.set(id, game);
}

module.exports = games;
