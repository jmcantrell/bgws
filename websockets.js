const WebSocket = require("ws");

module.exports.setup = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("client connected to websocket");

    ws.active = true;
    ws.on("pong", () => {
      ws.active = true;
    });

    ws.on("close", function () {
      console.log("client disconnected from websocket");
    });
  });

  wss.on("close", () => {
    console.log("closing websocket server");
    clearInterval(pingInterval);
  });

  const pingInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.active) {
        console.log("terminating inactive websocket client");
        return ws.terminate();
      }
      ws.active = false;
      ws.ping();
    }
  }, 30000);

  return wss;
};
