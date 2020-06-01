import test from "ava";
import * as game from "../../lib/games/c4.js";
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

test(`${game.id}: can only move if column isn't full`, (t) => {
  const { match, players } = t.context;
  const move = { column: 0 };
  for (let i = 0; i < game.rows; i++) {
    const index = i % game.numPlayers;
    addMove(game, match, players[index], move);
  }
  t.is(match.moves.length, game.rows);
  t.throws(
    () => {
      addMove(game, match, players[0], move);
    },
    { message: "no spaces available in column" }
  );
  t.is(match.moves.length, game.rows);
});
