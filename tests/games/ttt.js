import test from "ava";
import * as game from "../../lib/games/ttt.js";
import { createMatch, addMove } from "../../server/game.js";

test.beforeEach((t) => {
  const players = [];
  for (let i = 0; i < game.numPlayers; i++) {
    players.push({ id: i });
  }
  const match = createMatch(game, players);
  t.is(match.moves.length, 0);
  t.context.match = match;
  t.context.players = players;
});

test(`${game.id}: can only move if space isn't occupied`, (t) => {
  const { match, players } = t.context;
  t.is(match.moves.length, 0);
  const move = { row: 0, column: 0 };
  addMove(game, match, players[0], move);
  t.is(match.moves.length, 1);
  t.throws(
    () => {
      addMove(game, match, players[1], move);
    },
    { message: "space already occupied" }
  );
  t.is(match.moves.length, 1);
});
