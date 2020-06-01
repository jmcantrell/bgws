import test from "ava";
import { startFakeWeb, connectWebSocket } from "./_setup.js";

process.env.WS_PING_TIMEOUT = 100;

test.before(async (t) => {
  await startFakeWeb(t);
});

// Ensure a player is pinged.
test.serial("websocket pong", (t) => {
  const { sockets } = t.context.web;
  const client = connectWebSocket(t);
  return new Promise((resolve) => {
    client.addEventListener("open", function () {
      for (const ws of sockets.clients.values()) {
        ws.on("pong", () => {
          t.pass();
          client.close();
          resolve();
        });
      }
    });
  });
});

// Ensure a stale connection is terminated.
test.serial("websocket timeout", (t) => {
  const { sockets } = t.context.web;
  const client = connectWebSocket(t);
  return new Promise((resolve) => {
    client.on("open", ()=> {
      for (const ws of sockets.clients.values()) {
        ws.active = false;
      }
    });
    client.on("close", () => {
      t.pass();
      resolve();
    });
  });
});
