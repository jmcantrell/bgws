const uuid = require("uuid");
const WebSocket = require("ws");
const { Matches } = require("./models");
const logger = require("./logger");

// mapping player id -> websocket
const connections = new Map();

module.exports.setup = (app, server) => {
  const wss = new WebSocket.Server({ server });

  const db = app.mongodb.database;
  const matches = new Matches(db);

  const { publisher, subscriber } = app.redis;

  // Give this process a unique pubsub channel.
  // For a given match record, there will be a channel name associated
  // with each player, representing the web process from which their
  // websocket connection originated.
  const localChannel = uuid.v4();
  subscriber.subscribe(localChannel);

  subscriber.on("message", (channel, message) => {
    if (channel == localChannel) {
      // Any message received on this channel should be a command.
      // It should have an id representing a player on this node.
      const { player, command } = JSON.parse(message);
      deliver(player, command);
    }
  });

  // This function decides whether or not to communicate over the pubsub
  // channel or to deliver directly to a websocket.
  function send(player, command) {
    if (connections.has(player.id)) {
      return deliver(player, command);
    } else {
      return publish(player, command);
    }
  }

  // Deliver message to a websocket connection.
  function deliver(player, command) {
    const { id } = player;
    const ws = connections.get(id);
    const message = JSON.stringify(command);
    logger.debug(`sending to player ${id}: ${message}`);
    return ws.send(message);
  }

  // Publish message over a redis pubsub channel.
  function publish(player, command) {
    const { channel } = player;
    const message = JSON.stringify({ player, command });
    logger.debug(`sending to channel ${channel}: ${message}`);
    return publisher.publish(channel, message);
  }

  async function setupMatch(id) {
    logger.debug(`new player: ${id}`);
    const match = await matches.nextAvailable();
    if (match) {
      // There's a player waiting, so match them.
      return await joinMatch(match, id);
    }
    // No one is waiting, so wait for opponent.
    return await startMatch(id);
  }

  async function startMatch(id) {
    logger.debug(`starting match: ${id} vs ???`);
    const player1 = newPlayer(id);
    return matches.start(player1);
  }

  async function joinMatch(match, id) {
    const player1 = match.player1;
    const player2 = newPlayer(id);

    logger.debug(`joining match: ${player1.id} vs ${player2.id}`);

    match = await matches.join(match, player2);

    return broadcastUpdate(match);
  }

  // Get an update response for a given player and match.
  // Should allow client to reflect the current game state.
  function getUpdate(player, match) {
    const { board, winner } = match;
    const finished = Boolean(match.finishedOn);
    const { piece } = player;
    const update = { piece, board, finished };
    if (winner) {
      update.won = piece == winner.piece;
      update.winner = winner;
    } else {
      const next = Matches.whoseTurn(match);
      update.turn = next.id == player.id;
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
    return send(player, { action: "update", update });
  }

  function newPlayer(id) {
    return { id, channel: localChannel };
  }

  // Cleanup any references to a given player.
  function removePlayer(id) {
    connections.get(id).close();
    connections.delete(id);
  }

  function removePlayers() {
    for (const id of connections.keys()) {
      removePlayer(id);
    }
  }

  async function closeMatch(id) {
    logger.debug(`closing match for player: ${id}`);
    const match = await matches.deleteForPlayer(id);
    if (match) {
      const opponent = Matches.getOpponent(match, id);
      if (opponent) {
        send(opponent, {
          action: "close",
          reason: "Opponent left the game.",
        });
      }
    }
  }

  async function closeMatches() {
    return await Promise.all(
      Array.from(connections.keys()).map((id) => closeMatch(id))
    );
  }

  async function clientMove(id, move) {
    const match = await matches.findForPlayer(id);
    if (!match) {
      logger.debug(`player ${id} is not in a match`);
      return;
    }
    const player = Matches.getPlayer(match, id);
    move.piece = player.piece;
    try {
      matches.addMove(match, move);
    } catch (error) {
      logger.error(error);
    }
    return broadcastUpdate(match);
  }

  wss.on("listening", () => {
    logger.info("websocket server listening");
  });

  wss.on("connection", async (ws) => {
    // Give this player's connection a unique id.
    const id = uuid.v4();
    connections.set(id, ws);

    logger.debug(`player ${id} connected`);

    await setupMatch(id);

    ws.on("message", async (message) => {
      logger.debug(`received from player ${id}: ${message}`);
      const command = JSON.parse(message);
      switch (command.action) {
        case "move":
          await clientMove(id, command.move);
          break;
      }
    });

    // This connection will be pinged periodically.
    // If a reply is received, mark it as active.
    ws.active = true;
    ws.on("pong", () => {
      ws.active = true;
    });

    ws.on("close", async function () {
      logger.debug(`player ${id} disconnected`);
      await closeMatch(id);
      removePlayer(id);
    });
  });

  wss.on("close", async () => {
    logger.info("closing websocket server");
    clearInterval(pingInterval);
    await closeMatches();
    removePlayers();
  });

  // Periodically ping websocket clients to cleanup stale connections.
  const pingInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.active) {
        logger.info("terminating unresponsive websocket client");
        return ws.terminate();
      }
      ws.active = false;
      ws.ping();
    }
  }, 30000);
};
