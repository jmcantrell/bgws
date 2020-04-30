const test = require("ava");
const got = require("got");
const { JSDOM } = require("jsdom");

process.env.PORT = 0;
process.env.LOG_LEVEL = "silent";

const app = require("../app");

test.beforeEach(async (t) => {
  const server = await app.start();
  const { port } = server.address();
  t.context.server = server;
  t.context.prefixUrl = `http://localhost:${port}`;
});

test.afterEach.always((t) => {
  t.context.server.close();
});

test("/", async (t) => {
  const dom = await getDom(t, "");
  const { document } = dom;

  // there is a link to start a new game
  t.truthy(document.querySelector("a[href='/game']"));
});

test("/game", async (t) => {
  const dom = await getDom(t, "game");
  const { document } = dom;

  // there is a 3x3 game board
  const game = document.getElementById("game");
  t.truthy(game);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const cell = document.getElementById(`cell-${row}${column}`);
      t.truthy(cell);
      t.true(game.contains(cell));
      t.true(cell.classList.contains("cell"));
    }
  }

  // there is a link to start a new game
  t.truthy(document.querySelector("a[href='/game']"));

  // there is a hidden message dialog
  const message = document.getElementById("message");
  t.truthy(message);
  t.true(message.classList.contains("hide"));
  t.true(message.classList.contains("dialog"));
  const messageText = document.getElementById("message-text");
  t.truthy(messageText);
  t.true(message.contains(messageText));
  const messageActions = document.getElementById("message-actions");
  t.truthy(messageActions);
  t.true(message.contains(messageActions));
  const messageOkay = document.getElementById("message-okay");
  t.truthy(messageOkay);
  t.true(message.contains(messageOkay));

  // there is a hidden loading dialog
  const loading = document.getElementById("loading");
  t.truthy(loading);
  t.true(loading.classList.contains("hide"));
  t.true(loading.classList.contains("dialog"));
  const loadingText = document.getElementById("loading-text");
  t.truthy(loadingText);
  t.true(loading.contains(loadingText));
  const loadingSpinner = document.getElementById("loading-spinner");
  t.truthy(loadingSpinner);
  t.true(loading.contains(loadingSpinner));
});

async function getDom(t, path) {
  const res = await get(t, path);
  const dom = new JSDOM(res.body);
  dom.document = dom.window.document;
  return dom;
}

async function get(t, path) {
  const { prefixUrl } = t.context;
  const res = await got(path, { prefixUrl });
  t.is(res.statusCode, 200);
  return res;
}
