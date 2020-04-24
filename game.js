const express = require("express");
const express_ws = require("express-ws");
const logger = require("./logger");

const router = express.Router();

const wss = express_ws(router).getWss();

const sockets = new Set();

const intervals = [];

function every(ms, cb) {
  intervals.push(setInterval(cb, ms));
}

every(30000, () => {
  for (const socket of sockets) {
    if (!socket.active) {
      logger.info("terminating inactive websocket connection");
      return socket.terminate();
    }
    socket.active = false;
    socket.ping(() => {
      logger.trace("pinging websocket client");
    });
  }
});

wss.on("close", () => {
  logger.info("closing websocket server");
  for (const interval of intervals) {
    clearInterval(interval);
  }
});

router.ws("/", (socket, req) => {
  logger.info("client connected to websocket");
  socket.request = req;
  sockets.add(socket);

  socket.active = true;
  socket.on("pong", () => {
    logger.trace("websocket client ponged");
    socket.active = true;
  });

  socket.on("message", (message) => {
    logger.debug(`websocket client sent "${message}"`);
  });

  socket.on("close", () => {
    logger.info("client disconnected from websocket");
    sockets.delete(socket);
  });
});

module.exports = router;
