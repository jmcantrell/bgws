import test from "ava";
import { startRealWeb, getDom } from "./_setup.js";

test.before(async (t) => {
  await startRealWeb(t);
});

test("404", async (t) => {
  const dom = await getDom(t, "bogus", 404);
  const { document } = dom;

  // there is a breadcrumb trail
  t.truthy(document.querySelector("a[href='/']"));
  t.truthy(document.querySelector("a[href='/games/']"));
});

test("/", async (t) => {
  const dom = await getDom(t, "");
  const { document } = dom;

  // there is a link to the games
  t.truthy(document.querySelector("a[href='/games/']"));
});

test("/games/", async (t) => {
  const { games } = t.context.web;
  const dom = await getDom(t, "games/");
  const { document } = dom;

  // there is a breadcrumb trail
  t.truthy(document.querySelector("a[href='/']"));
  t.truthy(document.querySelector("a[href='/games/']"));

  // there is a link for each game
  for (const id of games.keys()) {
    t.truthy(document.querySelector(`a[href='/games/${id}/']`));
  }
});

test("/games/:id/", async (t) => {
  const { games } = t.context.web;
  for (const id of games.keys()) {
    const url = `games/${id}/`;
    const dom = await getDom(t, url);
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

    // there is a container for the canvases
    const container = document.getElementById("container");
    t.truthy(container);
  }
});
