const express = require("express");
const helmet = require("helmet");
const logger = require("./logger");
const routes = require("./routes");

const app = express();

app.use(helmet());
app.use(logger.middleware);
app.use(express.static("static"));

routes.setup(app);

module.exports = app;
