const app = require("./app");
const logger = require("./logger");
const { PORT } = require("./config");

app.listen(PORT, () => {
  logger.info("http server listening on port ${PORT}");
});
