import test from "ava";
import { createFakeGame, fakeGames } from "../_setup.js";
import { createPlayer, createMatch, addMove } from "../../server/game.js";

function* getPlayers(game) {
  for (let i = 0; i < game.numPlayers; i++) {
    yield { id: `player-${game.id}-${i}` };
  }
}

test("able to create a player object", (t) => {
  const playerID = "player0";
  const gameID = "fake1p";
  const channel = "fake";
  const player = createPlayer(playerID, gameID, channel);
  t.is(player.id, playerID);
  t.is(player.game, gameID);
  t.is(player.channel, channel);
});

test("able to create a match object", (t) => {
  // Ensure logic works for any number of players.
  for (const game of fakeGames.values()) {
    const players = Array.from(getPlayers(game));
    const playerIDs = players.map((player) => player.id);
    const ts = Date.now();
    const match = createMatch(game, players);

    // Match has an id.
    t.truthy(match.id);

    // Is the correct game.
    t.is(match.game, game.id);

    // Players were added.
    t.deepEqual(match.players, playerIDs);

    // Has a reasonable start time.
    t.true(ts <= match.start && match.start <= Date.now());

    // Has no moves yet.
    t.is(match.moves.length, 0);

    // Has the correct game state.
    t.deepEqual(match.state, game.createState());

    for (let i = 0; i < game.numPlayers; i++) {
      const player = players[i];

      // Players were assigned an order.
      t.is(player.index, i);

      // Players were assigned to the game.
      t.is(player.match, match.id);
    }
  }
});

test("no moves allowed after finish", (t) => {
  const game = fakeGames.get("fake1p");
  const players = Array.from(getPlayers(game));
  const match = createMatch(game, players);

  // Simulate a match-ending event.
  match.state.finished = true;

  // Any move after should throw an error.
  t.throws(
    () => {
      addMove(game, match, players[0], {});
    },
    { message: "match already finished" }
  );
  t.is(match.moves.length, 0);
});

test("only one move per turn allowed", (t) => {
  // Need at least two players for this exception to be visible.
  const game = fakeGames.get("fake2p");
  const players = Array.from(getPlayers(game));
  const match = createMatch(game, players);

  // Everything is normal so far.
  addMove(game, match, players[0], {});
  t.is(match.moves.length, 1);

  // The same player cannot move again immediately after.
  t.throws(
    () => {
      addMove(game, match, players[0], {});
    },
    { message: "player already moved" }
  );
  t.is(match.moves.length, 1);
});

test("only player one allowed to go first", (t) => {
  // Need at least two players to be able to test this exception.
  const game = fakeGames.get("fake2p");
  const players = Array.from(getPlayers(game));
  const match = createMatch(game, players);

  // Any player other than player one will throw an error.
  t.throws(
    () => {
      addMove(game, match, players[1], {});
    },
    { message: "only player one can move first" }
  );
  t.is(match.moves.length, 0);

  // Player one should be able to make a move.
  addMove(game, match, players[0], {});
  t.is(match.moves.length, 1);
});

test("able to add move to a match", (t) => {
  const game = createFakeGame("fake");
  const player = { id: "player0" };
  const match = createMatch(game, [player]);

  // Ensure the obvious.
  t.is(match.moves.length, 0);

  addMove(game, match, player, { test: true });

  // Ensure move was added.
  t.is(match.moves.length, 1);
  const lastMove = match.moves[match.moves.length - 1];

  // Ensure data made it through.
  t.true(lastMove.test);

  // Move should be tagged with the player.
  t.is(lastMove.player, player.index);
});

test("adding a move sets the next player's turn", (t) => {
  // Ensure logic works for any number of players.
  for (const game of fakeGames.values()) {
    const players = Array.from(getPlayers(game));
    const match = createMatch(game, players);

    // Add a move for each player.
    for (let i = 0; i < game.numPlayers; i++) {
      // Should be the last player + 1.
      t.is(match.state.turn, i);
      addMove(game, match, players[i], {});
    }

    // After the last player moves, it's player one's turn again.
    t.is(match.state.turn, 0);
  }
});

test("match will end if there's a draw", (t) => {
  const game = createFakeGame("fake");
  const player = { id: "player0" };
  const match = createMatch(game, [player]);
  const move = { fake: true };

  // Ensure the obvious.
  t.falsy(match.state.finished);

  // Fake games never find a draw, unless...
  addMove(game, match, player, move);
  t.falsy(match.state.finished);

  // The right method is overridden.
  // Next move will trigger a draw.
  game.isDraw = () => true;
  addMove(game, match, player, move);
  t.true(match.state.finished);
});

test("match will end if there's a winner", (t) => {
  const game = createFakeGame("fake");
  const player = { id: "player0" };
  const match = createMatch(game, [player]);
  const move = { fake: true };

  // Ensure the obvious.
  t.falsy(match.state.finished);
  t.falsy(match.state.winner);

  // Fake games never find a winner, unless...
  addMove(game, match, player, move);
  t.falsy(match.state.finished);
  t.falsy(match.state.winner);

  // The right method is overridden.
  // Next move will trigger a winner.
  game.getWinner = () => ({ player: player.index });
  addMove(game, match, player, move);
  t.true(match.state.finished);
  t.is(match.state.winner.player, player.index);
});
