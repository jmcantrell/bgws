const game = require("./game");

module.exports.setup = (app) => {
  app.use("/game", game);
};
