import test from "ava";
import {
  createFakeWeb,
  createFakeLobby,
  createFakeGames,
  connect,
  send,
  receive,
} from "../_setup.js";

test.before(async (t) => {
  t.context.web = await createFakeWeb();
  t.context.lobby = await createFakeLobby();
});

test.beforeEach(async (t) => {
  const { server } = t.context.web;
  t.context.client = await connect(server);
  t.context.games = createFakeGames();
});

test.afterEach.always(async (t) => {
  t.context.client.close();
});

test.after.always(async (t) => {
  await t.context.web.close();
});

test("server is able to gracefully shutdown", async (t) => {
  const web = await createFakeWeb();
  t.is(web.sockets.clients.size, 0);
  await connect(web.server);
  t.is(web.sockets.clients.size, 1);
  await web.close();
  // Ensure all clients were disconnected.
  t.is(web.sockets.clients.size, 0);
});

test("invalid command returns an error", async (t) => {
  const { client } = t.context;
  send(client, { bogus: true });
  const res = await receive(client);
  t.is(res.error, "unable to perform command");
});

test("first command must be to join a game", async (t) => {
  const { client } = t.context;
  send(client, { action: "move" });
  const res = await receive(client);
  t.is(res.error, "unable to perform command");
});

test("must specify a game to join", async (t) => {
  const { client } = t.context;
  send(client, { action: "join" });
  const res = await receive(client);
  t.is(res.error, "unable to perform command");
});

test("able to join a game", async (t) => {
  const { client, games } = t.context;
  const game = games.get("fake1p");
  send(client, { action: "join", game: game.id });
  const res = await receive(client);
  t.is(res.action, "update");
  t.is(res.player, 0);
  t.deepEqual(res.state.board, game.createBoard());
});

test("disallow joining a game if already in a match", async (t) => {
  const { client } = t.context;
  send(client, { action: "join", game: "fake1p" });
  await receive(client);
  send(client, { action: "join", game: "fake1p" });
  const res = await receive(client);
  t.is(res.error, "unable to perform command");
});

test("move command must contain move data", async (t) => {
  const { client, games } = t.context;
  const game = games.get("fake1p");
  send(client, { action: "join", game: game.id });
  await receive(client);
  send(client, { action: "move" });
  const res = await receive(client);
  t.is(res.error, "unable to perform command");
});

test("move command data must be an object", async (t) => {
  const { client, games } = t.context;
  const game = games.get("fake1p");
  send(client, { action: "join", game: game.id });
  await receive(client);
  send(client, { action: "move", move: "fake" });
  const res = await receive(client);
  t.is(res.error, "unable to perform command");
});

test("able to make a move", async (t) => {
  const { client, games } = t.context;
  const game = games.get("fake1p");
  send(client, { action: "join", game: game.id });
  await receive(client);
  send(client, { action: "move", move: {} });
  const res = await receive(client);
  t.is(res.action, "update");
});
