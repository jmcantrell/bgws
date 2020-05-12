const test = require("ava");
const server = require("../../_server");

const url = "games/ttt/";

test.beforeEach(async (t) => {
  await server.start(t);
});

test.afterEach.always(async (t) => {
  await server.close(t);
});

test(`/${url}`, async (t) => {
  const dom = await server.getDom(t, url);
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
});
