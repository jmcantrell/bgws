const fs = require("fs");
const path = require("path");
const test = require("ava");
const games = require("../../server/games");

for (const [id, game] of games.entries()) {
  const filename = path.join(__dirname, "matches", `${id}.json`);
  if (!fs.existsSync(filename)) continue;
  const matches = JSON.parse(fs.readFileSync(filename));
  const move = matches[Object.keys(matches)[0]].moves[0];
  const players = game.pieces.map((p) => ({ piece: p }));

  test(`${id}: no moves allowed after finish`, (t) => {
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

  test(`${id}: only one move per turn allowed`, (t) => {
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

  test(`${id}: only player one allowed to go first`, (t) => {
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

  test(`${id}: can only move if space isn't occupied`, (t) => {
    const match = game.createMatch();
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
}
