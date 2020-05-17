const test = require("ava");
const Game = require("../server/game");

const game = new Game("test", "Test Game", 2);
const match = game.createMatch();

const players = [];
for (let i = 0; i < game.numPlayers; i++) {
  players.push({ index: i });
}

test("no moves allowed after finish", (t) => {
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

test("only one move per turn allowed", (t) => {
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

test("only player one allowed to go first", (t) => {
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

test("can only move if column isn't full", (t) => {
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
