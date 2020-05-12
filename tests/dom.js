const test = require("ava");
const games = require("../lib/games");
const server = require("./_server");

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

test("/", async (t) => {
  const dom = await server.getDom(t, "");
  const { document } = dom;

  // there is a link to the games
  t.truthy(document.querySelector("a[href='/games/']"));
});

test("/games/", async (t) => {
  const dom = await server.getDom(t, "games/");
  const { document } = dom;

  // there is a breadcrumb trail
  t.truthy(document.querySelector("a[href='/']"));
  t.truthy(document.querySelector("a[href='/games/']"));

  // there is a link for each game
  for (const id of games.keys()) {
    t.truthy(document.querySelector(`a[href='/games/${id}/']`));
  }
});

test("404", async (t) => {
  const dom = await server.getDom(t, "bogus", 404);
  const {document} = dom;

  // there is a breadcrumb trail
  t.truthy(document.querySelector("a[href='/']"));
  t.truthy(document.querySelector("a[href='/games/']"));
});
