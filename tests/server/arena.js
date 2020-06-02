import test from "ava";
import Arena from "../../server/arena.js";
import { connectTestRedis, fakeGames } from "../_setup.js";
import { createPlayer, createMatch } from "../../server/game.js";

function* getPlayers(game) {
  for (let i = 0; i < game.numPlayers; i++) {
    yield createPlayer(`player-${game.id}-${i}`, game.id, "fake");
  }
}

test.before(async (t) => {
  const redis = await connectTestRedis();
  t.context.redis = redis;
});

test.beforeEach(async (t) => {
  const { redis } = t.context;
  const games = fakeGames;
  const arena = new Arena({ redis, games });
  t.context.arena = arena;
});

test.afterEach.always(async (t) => {
  await t.context.arena.clear();
});

test.serial("able to create, save, get, and delete players", async (t) => {
  const { arena } = t.context;
  const player = createPlayer("player0", "fake1p", "fake");
  await arena.savePlayer(player);
  t.deepEqual(player, await arena.getPlayer(player.id));
  await arena.deletePlayer(player.id);
  t.falsy(await arena.getPlayer(player.id));
});

test.serial("new players can be added to queue", async (t) => {
  const { arena } = t.context;
  const playerID = "player0";
  await arena.addPlayer(playerID);
  t.is(playerID, await arena.nextPlayer());
});

test.serial("unable to join an invalid game", async (t) => {
  const { arena, redis } = t.context;
  const playerID = "player0";
  await t.throwsAsync(
    async () => {
      await arena.join(playerID, "bogus", "fake");
    },
    { message: "game does not exist" }
  );
  t.falsy(await arena.getPlayer(playerID));
  await new Promise((resolve) => {
    redis.llen("joined", (err, res) => {
      t.is(res, 0);
      resolve();
    });
  });
});

test.serial("invalid player unable to make move", async (t) => {
  const { arena } = t.context;
  await t.throwsAsync(
    async () => {
      await arena.move("foo", {});
    },
    { message: "player does not exist" }
  );
});

test.serial("player unable to make move if not in a match", async (t) => {
  const { arena } = t.context;
  const player = createPlayer("player0", "fake1p", "fake");
  await arena.savePlayer(player);
  await t.throwsAsync(
    async () => {
      await arena.move(player.id, {});
    },
    { message: "player is not in a match" }
  );
});

test.serial("player able to make move on a match", async (t) => {
  const { arena } = t.context;
  for (const game of fakeGames.values()) {
    const playerIDs = [];
    for (let i = 0; i < game.numPlayers; i++) {
      const playerID = `player-${game.id}-${i}`;
      playerIDs.push(playerID);
      await arena.join(playerID, game.id, "fake");
      await arena.sortNextPlayer();
    }
    for (const playerID of playerIDs) {
      await arena.move(playerID, { exists: true });
      const player = await arena.getPlayer(playerID);
      const match = await arena.getMatch(player.match);
      const move = match.moves[match.moves.length - 1];
      t.is(move.player, player.index);
      t.true(move.exists);
    }
  }
});

test.serial("parting a match clears relevant data", async (t) => {
  const { arena } = t.context;
  for (const game of fakeGames.values()) {
    const playerIDs = [];
    for (let i = 0; i < game.numPlayers; i++) {
      const playerID = `player-${game.id}-${i}`;
      playerIDs.push(playerID);
      await arena.join(playerID, game.id, "fake");
      await arena.sortNextPlayer();
    }
    // Once any player parts, the match is deleted.
    // Should not matter which player parts.
    const index = Math.trunc(Math.random() * game.numPlayers);
    const playerID = playerIDs[index];
    const player = await arena.getPlayer(playerID);
    t.is(player.id, playerID);
    t.truthy(player.match);
    const match = await arena.getMatch(player.match);
    t.is(player.match, match.id);
    for (const playerID of playerIDs) {
      await arena.part(playerID, "testing");
      t.falsy(await arena.getPlayer(playerID));
      t.falsy(await arena.getMatch(player.match));
    }
  }
});

test.serial("parting a match sends end command to all players", async (t) => {
  const { arena } = t.context;
  const reason = "testing";
  const expected = new Set();
  const seen = new Set();
  const promise = new Promise((resolve) => {
    let count = 0;
    arena.on("command", (channel, playerID, command) => {
      if (command.action == "end") {
        t.is(command.reason, reason);
        t.false(seen.has(playerID));
        t.true(expected.has(playerID));
        seen.add(playerID);
        if (expected.size == ++count) {
          return resolve();
        }
      }
    });
  });
  const parting = [];
  for (const game of fakeGames.values()) {
    const playerIDs = [];
    for (let i = 0; i < game.numPlayers; i++) {
      const playerID = `player-${game.id}-${i}`;
      expected.add(playerID);
      playerIDs.push(playerID);
      await arena.join(playerID, game.id, "fake");
      await arena.sortNextPlayer();
    }
    // Should not matter which player parts.
    const index = Math.trunc(Math.random() * game.numPlayers);
    parting.push(playerIDs[index]);
  }
  for (const playerID of parting) {
    await arena.part(playerID, reason);
  }
  await promise;
});

test.serial("player unable to make move on invalid match", async (t) => {
  const { arena } = t.context;
  const player = createPlayer("player0", "fake1p", "fake");
  player.match = "bogus";
  await arena.savePlayer(player);
  await t.throwsAsync(
    async () => {
      await arena.move(player.id, {});
    },
    { message: "match does not exist" }
  );
});

test.serial("new players are saved and queued", async (t) => {
  const { arena } = t.context;
  const playerID = "player0";
  const gameID = "fake1p";
  const channel = "fake";
  await arena.join(playerID, gameID, channel);
  t.is(playerID, await arena.nextPlayer());
  const player = await arena.getPlayer(playerID);
  t.is(player.id, playerID);
  t.is(player.game, gameID);
  t.is(player.channel, channel);
});

test.serial("new players are dequeued in fifo order", async (t) => {
  const { arena } = t.context;
  const playerIDs = ["player0", "player1", "player2"];
  for (const playerID of playerIDs) {
    await arena.addPlayer(playerID);
  }
  t.deepEqual(
    playerIDs,
    await Promise.all(playerIDs.map(() => arena.nextPlayer()))
  );
});

test.serial("players can be sorted into game-specific queues", async (t) => {
  const { arena } = t.context;
  const args = [
    ["fake1p", "player0"],
    ["fake2p", "player1"],
    ["fake2p", "player2"],
  ];
  for (const [gameID, playerID] of args) {
    await arena.sortPlayer(gameID, playerID);
  }
  for (const [gameID, playerID] of args) {
    t.is(playerID, await arena.nextWaitingPlayer(gameID));
  }
});

test.serial("able to recover from players parting before start", async (t) => {
  const { arena } = t.context;
  const game = fakeGames.get("fake2p");
  const players = Array.from(getPlayers(game));
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    await arena.join(player.id, game.id, "fake");
    await arena.sortNextPlayer();
    // Simulate player one leaving before start.
    if (i == 0) {
      await arena.part(player.id, "testing");
    }
  }
  // All players should have been picked up from the main queue.
  // Since player one left early, player two was re-added.
  t.is(players[1].id, await arena.nextPlayer());
});

test.serial("players will be matched when enough have joined", async (t) => {
  const { arena } = t.context;
  for (const game of fakeGames.values()) {
    // There will be more players than necessary. They should remain in
    // the game's queue after the first group of players are matched,
    // waiting for the next group.
    game.numPlayers++;
    const players = Array.from(getPlayers(game));
    game.numPlayers--;

    let count = 0;
    for (const player of players) {
      await arena.join(player.id, game.id, player.channel);
      await arena.sortPlayer(game.id, player.id);
      t.is(++count, await arena.numWaitingPlayers(game.id));
    }

    const enough = players.slice(0, game.numPlayers);
    t.deepEqual(enough, await arena.matchPlayers(game.id));
    const remain = players.slice(game.numPlayers);
    for (const player of remain) {
      t.is(player.id, await arena.nextWaitingPlayer(game.id));
    }
  }
});

test.serial("able to create, save, get, and delete matches", async (t) => {
  const { arena } = t.context;
  const game = fakeGames.get("fake1p");
  const players = Array.from(getPlayers(game));
  const match = createMatch(game, players);
  await arena.saveMatch(match);
  t.deepEqual(match, await arena.getMatch(match.id));
  await arena.deleteMatch(match.id);
  t.falsy(await arena.getMatch(match.id));
});

test.serial("able to update players with match state", async (t) => {
  const { arena } = t.context;
  const game = fakeGames.get("fake1p");
  const players = Array.from(getPlayers(game));
  const match = createMatch(game, players);
  const promise = new Promise((resolve) => {
    const seen = new Set();
    arena.on("command", (channel, playerID, command) => {
      if (command.action == "update") {
        const index = players.findIndex((player) => player.id == playerID);
        t.is(command.action, "update");
        t.is(command.player, index);
        t.deepEqual(command.state, match.state);
        seen.add(command.player);
        if (seen.size == players.length) {
          return resolve();
        }
      }
    });
  });
  await arena.update(match, players);
  await promise;
});

test.serial("match starts when enough players have joined", async (t) => {
  const { arena } = t.context;
  const channel = "fake";
  const fakePlayerIDs = new Map();
  for (const game of fakeGames.values()) {
    const playerIDs = [];
    for (let i = 0; i < game.numPlayers; i++) {
      playerIDs.push(`player-${game.id}-${i}`);
    }
    fakePlayerIDs.set(game.id, playerIDs);
  }
  const promise = new Promise((resolve) => {
    let count = 0;
    arena.on("match", async (gameID, matchID, playerIDs) => {
      t.deepEqual(fakePlayerIDs.get(gameID), playerIDs);
      if (++count == fakePlayerIDs.size) {
        return resolve();
      }
    });
  });
  for (const [gameID, playerIDs] of fakePlayerIDs.entries()) {
    for (const playerID of playerIDs) {
      await arena.join(playerID, gameID, channel);
      await arena.sortNextPlayer();
    }
  }
  await promise;
});

test.serial("able to listen for new players", async (t) => {
  const { arena } = t.context;
  const games = fakeGames;
  // Lobby needs a dedicated redis connection.
  const redis = await connectTestRedis();
  const lobby = new Arena({ redis, games });
  const promise = new Promise((resolve) => {
    let seen = new Set();
    lobby.on("match", (gameID) => {
      seen.add(gameID);
      if (seen.size == games.size) {
        t.pass();
        return resolve();
      }
    });
  });
  await lobby.listen();
  for (const game of fakeGames.values()) {
    const playerIDs = [];
    for (let i = 0; i < game.numPlayers; i++) {
      const playerID = `player-${game.id}-${i}`;
      playerIDs.push(playerID);
      await arena.join(playerID, game.id, "fake");
    }
  }
  await promise;
});
