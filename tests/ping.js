import test from "ava";
import * as server from "./_server.js";

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

process.env.WS_PING_TIMEOUT = 100;

// Ensure a player is pinged.
test.serial("websocket pong", (t) => {
  const ws = t.context.createWebSocket();
  const { wss } = t.context.app.switch;
  return new Promise((resolve) => {
    ws.addEventListener("open", function () {
      wss.clients.forEach((client) => {
        client.on("pong", () => {
          t.pass();
          client.close();
          resolve();
        });
      });
    });
  });
});

// Ensure a stale connection is terminated.
test.serial("websocket timeout", (t) => {
  const ws = t.context.createWebSocket();
  const { wss } = t.context.app.switch;
  return new Promise((resolve) => {
    ws.on("open", ()=> {
      wss.clients.forEach((client) => {
        client.active = false;
      });
    });
    ws.on("close", () => {
      t.pass();
      resolve();
    });
  });
});
