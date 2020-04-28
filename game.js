const uuid = require("uuid");
const WebSocket = require("ws");
const { Matches } = require("./models");
const logger = require("./logger");

// mapping player id -> websocket
const connections = new Map();

// mapping player id -> opponent channel
const channels = new Map();

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
      const { id, command } = JSON.parse(message);
      switch (command.action) {
        case "channel":
          // This node has been instructed to map a channel to a player
          // on another node.
          channels.set(id, command.channel);
          break;

        default:
          // By default, just send the command to a player on this node.
          deliver(id, command);
          break;
      }
    }
  });

  // This function decides whether or not to communicate over the pubsub
  // channel or to deliver directly to a websocket.
  function send(id, command) {
    const channel = channels.get(id);
    if (channel && channel == localChannel) {
      return deliver(id, command);
    } else {
      return publish(id, command);
    }
  }

  // Deliver message to a websocket connection.
  function deliver(id, command) {
    const message = JSON.stringify(command);
    logger.trace(`sending to player ${id}: ${message}`);
    const ws = connections.get(id);
    return ws.send(message);
  }

  // Publish message over a redis pubsub channel.
  function publish(id, command) {
    const channel = channels.get(id);
    const message = JSON.stringify({ id, command });
    logger.trace(`sending to channel ${channel}: ${message}`);
    return publisher.publish(channel, message);
  }

  async function setupMatch(id) {
    logger.trace(`new player: ${id}`);
    const match = await matches.nextAvailable();
    if (match) {
      // There's a player waiting, so match them.
      return await joinMatch(match, id);
    }
    // No one is waiting, so wait for opponent.
    return await startMatch(id);
  }

  async function startMatch(id) {
    logger.trace(`starting match: ${id} vs ???`);
    const player1 = newPlayer(id);
    return matches.start(player1);
  }

  async function joinMatch(match, id) {
    const player1 = match.player1;
    const player2 = newPlayer(id);

    logger.trace(`joining match: ${player1.id} vs ${player2.id}`);

    match = await matches.join(match, player2);

    // Create channel from player1 to player2.
    channels.set(player2.id, player1.channel);

    // Create channel from player2 to player1.
    if (player1.channel == player2.channel) {
      // The players are on the same server process.
      // The channel communication can be bypassed.
      channels.set(player1.id, player2.channel);
    } else {
      // The players are on separate server processes.
      // Tell the other process which channel represents this player.
      publish(player1.id, { action: "channel", channel: player2.channel });
    }

    return broadcastUpdate(match);
  }

  // Get an update response for a given player and match.
  // Should allow client to reflect the current game state.
  function getUpdate(id, match) {
    const player = Matches.getPlayer(match, id);
    const { board, winner } = match;
    const finished = Boolean(match.finishedOn);
    const update = { board, finished };
    if (winner) {
      update.won = player.piece == winner.piece;
      update.winner = winner;
    } else {
      const next = Matches.whoseTurn(match);
      update.turn = next.id == player.id;
    }
    return update;
  }

  async function broadcastUpdate(match) {
    return Promise.all([
      sendUpdate(match.player1.id, match),
      sendUpdate(match.player2.id, match),
    ]);
  }

  async function sendUpdate(id, match) {
    const update = getUpdate(id, match);
    return send(id, { action: "update", update });
  }

  function newPlayer(id) {
    return { id, channel: localChannel };
  }

  // Cleanup any references to a given player.
  function removePlayer(id) {
    connections.get(id).close();
    connections.delete(id);
    channels.delete(id);
  }

  async function removeMatches() {
    return await Promise.all(
      Array.from(connections.keys()).map((id) => removeMatch(id))
    );
  }

  async function removeMatch(id) {
    logger.trace(`closing match for player: ${id}`);
    const match = await matches.deleteForPlayer(id);
    if (match) {
      const opponent = Matches.getOpponent(match);
      send(opponent.id, { action: "close", reason: "Opponent left the game." });
      removePlayer(match.player1.id);
      if (match.player2) {
        removePlayer(match.player2.id);
      }
    }
  }

  async function clientMove(id, move) {
    const match = await matches.findForPlayer(id);
    const player = Matches.getPlayer(match, id);
    move.piece = player.piece;
    try {
      matches.addMove(match, move);
    } catch (error) {
      console.error(error);
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

    logger.trace(`player ${id} connected`);

    await setupMatch(id);

    ws.on("message", async (message) => {
      logger.trace(`received from player ${id}: ${message}`);
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
      logger.trace(`player ${id} disconnected`);
      await removeMatch(id);
    });
  });

  wss.on("close", async () => {
    logger.info("closing websocket server");
    clearInterval(pingInterval);
    return await removeMatches();
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
