import test from "ava";
import { createFakeWeb, connect } from "../_setup.js";

process.env.WS_PING_TIMEOUT = 100;

test.before(async (t) => {
  t.context.web = await createFakeWeb();
});

test.beforeEach(async (t) => {
  const { server } = t.context.web;
  t.context.client = await connect(server);
});

// Ensure a player is pinged.
test.serial("websocket pong", async (t) => {
  const { web, client } = t.context;
  return new Promise((resolve) => {
    for (const ws of web.sockets.clients.values()) {
      ws.on("pong", () => {
        t.pass();
        client.close();
        resolve();
      });
    }
  });
});

// Ensure a stale connection is terminated.
test.serial("websocket timeout", async (t) => {
  const { web, client } = t.context;
  return new Promise((resolve) => {
    for (const ws of web.sockets.clients.values()) {
      ws.active = false;
    }
    client.on("close", () => {
      t.pass();
      resolve();
    });
  });
});
