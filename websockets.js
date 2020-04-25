const WebSocket = require("ws");
const logger = require("./logger");

const clients = new Set();

const intervals = [];

function every(ms, cb) {
  intervals.push(setInterval(cb, ms));
}

every(30000, () => {
  for (const ws of clients) {
    if (!ws.active) {
      logger.info("terminating inactive websocket client");
      return ws.terminate();
    }
    ws.active = false;
    ws.ping(() => {
      logger.trace("pinging websocket client");
    });
  }
});

module.exports.setup = (server) => {

  const wss = new WebSocket.Server({ server, clientTracking: false });

  wss.on("connection", (ws) => {
    logger.info("client connected to websocket");
    clients.add(ws);

    ws.active = true;
    ws.on("pong", () => {
      logger.trace("websocket client ponged");
      ws.active = true;
    });

    ws.on("message", function (message) {
      logger.info(`websocket client sent message "${message}"`);
    });

    ws.on("close", function () {
      logger.info("client disconnected from websocket");
      clients.delete(ws);
    });
  });

  wss.on("close", () => {
    logger.info("closing websocket server");
    for (const interval of intervals) {
      clearInterval(interval);
    }
  });

};
