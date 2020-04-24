const pino = require("pino");
const pino_http = require("pino-http");
const { LOG_LEVEL } = require("./config");

const logger = pino({ level: LOG_LEVEL });
const middleware = pino_http({ logger });

module.exports = logger;
module.exports.middleware = middleware;
