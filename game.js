const uuid = require("uuid");
const WebSocket = require("ws");
const { Matches } = require("./models");
const logger = require("./logger");

// mapping player id -> websocket
const connections = new Map();

module.exports.setup = function (app, server) {
  const wss = new WebSocket.Server({ server });

  const db = app.mongodb.database;
  const matches = new Matches(db);

  const { redis, subscriber } = app.redis;

  // Give this process a unique pubsub channel.
  // For a given match record, there will be a channel name associated
  // with each player, representing the web process from which their
  // websocket connection originated.
  const localChannel = uuid.v4();
  subscriber.subscribe(localChannel);

  subscriber.on("message", (channel, message) => {
    // Any message received on this channel should be a command.
    // It should have an id representing a player on this node.
    const { player, command } = JSON.parse(message);
    deliver(player, command);
  });

  // Deliver message to a websocket connection.
  function deliver(player, command) {
    const { id } = player;
    const ws = connections.get(id);
    const message = JSON.stringify(command);
    logger.trace(`sending to player ${id}: ${message}`);
    return ws.send(message);
  }

  // Publish message over a redis pubsub channel.
  function publish(player, command) {
    const { channel } = player;
    const message = JSON.stringify({ player, command });
    logger.trace(`sending to channel ${channel}: ${message}`);
    return redis.publish(channel, message);
  }

  // Get an update response for a given player and match.
  // Should allow client to reflect the current game state.
  function getUpdate(player, match) {
    const { board, winner } = match;
    const { piece } = player;
    const update = { piece, board };
    if (match.finishedOn) {
      update.finished = true;
      if (winner) {
        update.won = piece == winner.piece;
        update.winner = winner;
      }
    } else {
      const next = Matches.whoseTurn(match);
      if (next.id == player.id) {
        update.turn = true;
      }
    }
    return update;
  }

  async function broadcastUpdate(match) {
    return Promise.all([
      sendUpdate(match.player1, match),
      sendUpdate(match.player2, match),
    ]);
  }

  async function sendUpdate(player, match) {
    const update = getUpdate(player, match);
    return publish(player, { action: "update", update });
  }

  // Cleanup any references to a given player.
  function removePlayer(id) {
    const ws = connections.get(id);
    if (ws) {
      ws.close();
      connections.delete(id);
    }
  }

  async function closeMatch(id) {
    const match = await matches.deleteForPlayer({ id });
    if (match) {
      logger.info(`closing match for player ${id}`);
      const { player1, player2 } = match;
      const opponent = id == player1.id ? player2 : player1;
      publish(opponent, {
        action: "close",
        reason: "Opponent left the game.",
      });
    }
    removePlayer(id);
  }

  async function clientInit(id) {
    const player = { id, channel: localChannel };
    const match = await matches.init(player);
    const { player1, player2 } = match;
    if (player2) {
      logger.info(`starting match: ${player1.id} vs ${player2.id}`);
      broadcastUpdate(match);
    } else {
      logger.info(`creating match for player ${player.id}`);
    }
  }

  async function clientMove(id, move) {
    const { row, column} = move;
    const match = await matches.findForPlayer({ id });
    const { player1, player2 } = match;
    move.piece = (id == player1.id ? player1 : player2).piece;
    logger.info(`player ${id} moved piece ${move.piece} at row ${row} column ${column}`);
    await matches.addMove(match, move);
    return broadcastUpdate(match);
  }

  async function clientClose(id) {
    logger.info(`player ${id} closed match`);
    await closeMatch(id);
  }

  wss.on("connection", async (ws) => {
    // Give this player's connection a unique id.
    const id = uuid.v4();
    connections.set(id, ws);

    logger.info(`player ${id} connected`);

    ws.on("message", async (message) => {
      logger.trace(`received from player ${id}: ${message}`);
      const command = JSON.parse(message);
      switch (command.action) {
        case "init":
          await clientInit(id);
          break;
        case "move":
          await clientMove(id, command.move);
          break;
        case "close":
          await clientClose(id);
          break;
      }
    });

    ws.on("close", async function () {
      logger.info(`player ${id} disconnected`);
      await closeMatch(id);
    });
  });

  wss.on("listening", () => {
    logger.info("websocket server listening");
  });

};
