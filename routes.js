module.exports.setup = (app) => {
  app.get("/", (req, res) => {
    return res.render("index");
  });

  app.get("/game", (req, res) => {
    return res.render("game");
  });
};
