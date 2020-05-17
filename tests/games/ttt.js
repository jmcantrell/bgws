const fs = require("fs");
const path = require("path");
const test = require("ava");
const TicTacToe = require("../../server/games/ttt");

const game = new TicTacToe();

const filename = path.join(__dirname, "matches", `${game.id}.json`);
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

test(`${game.id}: can only move if space isn't occupied`, (t) => {
  t.is(match.moves.length, 0);
  const command = { action: "move", move };
  game.command(match, players[0], command);
  t.is(match.moves.length, 1);
  t.throws(
    () => {
      game.command(match, players[1], command);
    },
    { message: "space already occupied" }
  );
  t.is(match.moves.length, 1);
});
