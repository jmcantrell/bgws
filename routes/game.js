const path = require("path");
const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  return router.render(res, "index");
});

module.exports.setup = (app, prefix) => {
  app.use(prefix, router);
  router.render = (res, view, options, cb) => {
    view = path.join(prefix.slice(1), view);
    return res.render(view, options, cb);
  };
};
