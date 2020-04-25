const http = require("http");
const app = require("./app");
const logger = require("./logger");
const websockets = require('./websockets');
const { PORT } = require("./config");

const server = http.createServer(app);

websockets.setup(server);

server.listen(PORT, () => {
  logger.info(`http server listening on port ${PORT}`);
});
