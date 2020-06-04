import test from "ava";
import http from "http";

import createApp from "../server/app.js";
import createLogger from "../server/logger.js";
import {
  getResponse,
  getDocument,
  createRealWeb,
  createFakeGames,
} from "./_setup.js";

async function assertResponse(t, server, path, status = 200) {
  const res = await getResponse(server, path);
  t.is(res.statusCode, status);
  return res;
}

function testHeader(t, document, text) {}

function testLayout(t, document) {
  t.truthy(document.querySelector("a[href='/']"));
  t.truthy(document.querySelector("a[href='/games/']"));
}

function testMessageDialog(t, document) {
  const parent = document.getElementById("message");
  t.truthy(parent);

  // The thing is a dialog box.
  t.true(parent.classList.contains("dialog"));

  // The dialog is hidden by default.
  t.true(parent.classList.contains("hide"));

  // There is a text area.
  const text = document.getElementById("message-text");
  t.truthy(text);
  t.true(parent.contains(text));

  // There is an actions area.
  const actions = document.getElementById("message-actions");
  t.truthy(actions);
  t.true(parent.contains(actions));

  // There is an okay button.
  const okay = document.getElementById("message-okay");
  t.truthy(okay);
  t.true(parent.contains(okay));
}

function testLoadingDialog(t, document) {
  const parent = document.getElementById("loading");
  t.truthy(parent);

  // The thing is a dialog box.
  t.true(parent.classList.contains("dialog"));

  // The dialog is hidden by default.
  t.true(parent.classList.contains("hide"));

  // There is a text area.
  const text = document.getElementById("loading-text");
  t.truthy(text);
  t.true(parent.contains(text));

  // There is a busy spinner.
  const spinner = document.getElementById("loading-spinner");
  t.truthy(spinner);
  t.true(parent.contains(spinner));
}

test.before(async (t) => {
  t.context.web = await createRealWeb(t);
});

test("404", async (t) => {
  const { server, app } = t.context.web;
  const res = await assertResponse(t, server, "bogus", 404);
  const document = getDocument(res);
  testLayout(t, document);
  testHeader(t, document, app.locals.title);
});

test("500", async (t) => {
  const logger = createLogger();
  const games = createFakeGames();
  const app = createApp({ games, logger });

  // Create a condition that will result in an uncaught exception.
  app.locals.games = null;

  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, async () => {
      const res = await assertResponse(t, server, "games/", 500);
      const document = getDocument(res);
      testLayout(t, document);
      testHeader(t, document, app.locals.title);
      server.close();
      t.pass();
      resolve();
    });
  });
});

test("/", async (t) => {
  const { server, app } = t.context.web;
  const res = await assertResponse(t, server, "");
  const document = getDocument(res);
  testLayout(t, document);
  testHeader(t, document, app.locals.title);
});

test("/games/", async (t) => {
  const { server, app, games } = t.context.web;
  const res = await assertResponse(t, server, "games/");
  const document = getDocument(res);
  testLayout(t, document);
  testHeader(t, document, app.locals.title);

  // there is a link for each game
  for (const id of games.keys()) {
    t.truthy(document.querySelector(`a[href='/games/${id}/']`));
  }
});

test("/games/:id/", async (t) => {
  const { server, games } = t.context.web;
  for (const game of games.values()) {
    const url = `games/${game.id}/`;
    const res = await assertResponse(t, server, url);
    const document = getDocument(res);
    testLayout(t, document);
    testHeader(t, document, game.name);
    testMessageDialog(t, document);
    testLoadingDialog(t, document);

    t.truthy(document.querySelector(`a[href='/${url}']`));

    // there is a container for the canvases
    t.truthy(document.getElementById("container"));
  }
});
