import fs from "fs";
import test from "ava";
import ConnectFour from "../../server/games/c4.js";

import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const game = new ConnectFour();

const filename = join(__dirname, `${game.id}.json`);
const matches = JSON.parse(fs.readFileSync(filename));
const move = matches[Object.keys(matches)[0]].moves[0];
const match = game.createMatch();

const players = [];
for (let i = 0; i < game.numPlayers; i++) {
  players.push({ index: i });
}

test(`${game.id}: no moves allowed after finish`, (t) => {
  const match = game.createMatch();
  t.is(match.moves.length, 0);
  match.finished = true;
  const command = { action: "move", move };
  t.throws(
    () => {
      game.command(match, players[0], command);
    },
    { message: "match already finished" }
  );
  t.is(match.moves.length, 0);
});

test(`${game.id}: only one move per turn allowed`, (t) => {
  const match = game.createMatch();
  t.is(match.moves.length, 0);
  const command = { action: "move", move };
  game.command(match, players[0], command);
  t.is(match.moves.length, 1);
  command.move.row = 1;
  t.throws(
    () => {
      game.command(match, players[0], command);
    },
    { message: "player already moved" }
  );
  t.is(match.moves.length, 1);
});

test(`${game.id}: only player one allowed to go first`, (t) => {
  const match = game.createMatch();
  t.is(match.moves.length, 0);
  const command = { action: "move", move };
  t.throws(
    () => {
      game.command(match, players[1], command);
    },
    { message: "only player one can move first" }
  );
  t.is(match.moves.length, 0);
  game.command(match, players[0], command);
  t.is(match.moves.length, 1);
});

test(`${game.id}: can only move if column isn't full`, (t) => {
  t.is(match.moves.length, 0);
  const command = { action: "move", move };
  for (let i = 0; i < 6; i++) {
    const index = i % game.numPlayers
    game.command(match, players[index], command);
  }
  t.is(match.moves.length, 6);
  t.throws(
    () => {
      game.command(match, players[0], command);
    },
    { message: "no spaces available in column" }
  );
  t.is(match.moves.length, 6);
});
