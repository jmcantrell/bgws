const logger = require("loglevel");
const { LOG_LEVEL } = require("./config");

logger.setLevel(LOG_LEVEL);

module.exports = logger;
