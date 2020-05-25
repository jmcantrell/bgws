import fs from "fs";
import test from "ava";
import * as game from "../../lib/games/c4.js";
import { createMatch, addMove } from "../../server/match.js";

import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filename = join(__dirname, `${game.id}.json`);
const matchData = fs.readFileSync(filename);

test.beforeEach((t) => {
  const matches = JSON.parse(matchData);
  const players = [];
  for (let i = 0; i < game.numPlayers; i++) {
    players.push({ index: i });
  }
  t.context.match = createMatch(game, players);
  t.context.players = players;
  t.context.move = matches[Object.keys(matches)[0]].moves[0];
});

test(`${game.id}: no moves allowed after finish`, (t) => {
  const { match, players, move } = t.context;
  t.is(match.moves.length, 0);
  match.state.finished = true;
  t.throws(
    () => {
      addMove(game, match, players[0], move);
    },
    { message: "match already finished" }
  );
  t.is(match.moves.length, 0);
});

test(`${game.id}: only one move per turn allowed`, (t) => {
  const { match, players, move } = t.context;
  t.is(match.moves.length, 0);
  addMove(game, match, players[0], move);
  t.is(match.moves.length, 1);
  move.row = 1;
  t.throws(
    () => {
      addMove(game, match, players[0], move);
    },
    { message: "player already moved" }
  );
  t.is(match.moves.length, 1);
});

test(`${game.id}: only player one allowed to go first`, (t) => {
  const { match, players, move } = t.context;
  t.is(match.moves.length, 0);
  t.throws(
    () => {
      addMove(game, match, players[1], move);
    },
    { message: "only player one can move first" }
  );
  t.is(match.moves.length, 0);
  addMove(game, match, players[0], move);
  t.is(match.moves.length, 1);
});

test(`${game.id}: can only move if column isn't full`, (t) => {
  const { match, players, move } = t.context;
  t.is(match.moves.length, 0);
  for (let i = 0; i < 6; i++) {
    const index = i % game.numPlayers
    addMove(game, match, players[index], move);
  }
  t.is(match.moves.length, 6);
  t.throws(
    () => {
      addMove(game, match, players[0], move);
    },
    { message: "no spaces available in column" }
  );
  t.is(match.moves.length, 6);
});
