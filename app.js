const express = require("express");
const helmet = require("helmet");
const logger = require("./logger");
const routes = require("./routes");
const pkg = require("./package.json");

const app = express();

app.set("view engine", "pug");

app.locals.pretty = true;
app.locals.title = pkg.title;
app.locals.homepage = pkg.homepage;

app.use(helmet());
app.use(logger.middleware);
app.use(express.static("static"));

routes.setup(app);

module.exports = app;
