const test = require("ava");
const games = require("../../lib/games");
const server = require("../_server");

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

for (const id of games.keys()) {
  const url = `games/${id}/`;

  test(`/${url}`, async (t) => {
    const dom = await server.getDom(t, url);
    const { document } = dom;

    // there is a breadcrumb trail
    t.truthy(document.querySelector("a[href='/']"));
    t.truthy(document.querySelector("a[href='/games/']"));
    t.truthy(document.querySelector(`a[href='/${url}']`));

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
}
