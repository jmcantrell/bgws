const game = require("./game");

module.exports.setup = (app) => {
  app.get("/", (req, res) => {
    res.render("index");
  });
  game.setup(app, "/game");
};
