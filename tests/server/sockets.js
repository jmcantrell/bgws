import test from "ava";
import http from "http";
import WebSocket from "ws";
import { fakeGames } from "../_setup.js";
import createApp from "../../server/app.js";
import createLogger from "../../server/logger.js";
import Sockets from "../../server/sockets.js";

test.beforeEach(async (t) => {
  const games = fakeGames;
  const logger = createLogger();
  const app = createApp({ games, logger });
  const server = http.createServer(app);
  const sockets = new Sockets({ server });
  server.listen(0);
  const { port } = server.address();
  const ws = new WebSocket(`ws://localhost:${port}`);

  // Ensure properly connected.
  await Promise.all([
    new Promise((resolve) => {
      sockets.on("connect", (id) => {
        t.truthy(id);
        return resolve();
      });
    }),
    new Promise((resolve) => {
      ws.on("open", () => {
        return resolve();
      });
    })
  ]);

  t.context = { ws, sockets };
});

test.afterEach.always(async (t) => {
  const { ws, sockets } = t.context;

  ws.close();

  // Ensure completely closed.
  await Promise.all([
    new Promise((resolve) => {
      sockets.on("disconnect", (id) => {
        t.truthy(id);
        return resolve();
      });
    }),
    new Promise((resolve) => {
      ws.on("close", () => {
        return resolve();
      });
    })
  ]);
});

test("client can communicate with server", async (t) => {
  const { ws, sockets } = t.context;
  const clientIDs = Array.from(sockets.clients.keys());
  const clientID = clientIDs[0];
  const clientCommand = { fake: true, client: true };

  const promise = new Promise((resolve) => {
    sockets.on("command", (id, command) => {
      t.is(id, clientID);
      t.deepEqual(command, clientCommand);
      return resolve();
    });
  });

  ws.send(JSON.stringify(clientCommand));

  await promise;
});

test("server can communicate with client", async (t) => {
  const { ws, sockets } = t.context;
  const clientIDs = Array.from(sockets.clients.keys());
  const clientID = clientIDs[0];
  const serverCommand = { fake: true, server: true };

  const promise = new Promise((resolve) => {
    ws.on("message", (message) => {
      const command = JSON.parse(message);
      t.deepEqual(command, serverCommand);
      return resolve();
    });
  });

  sockets.send(clientID, serverCommand);

  await promise;
});
