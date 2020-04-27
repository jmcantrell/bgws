const uuid = require("uuid");
const websockets = require("./websockets");
const models = require("./models");

const connections = new Map();
const channels = new Map();

module.exports.setup = (app, server) => {
  const wss = websockets.setup(server);

  const db = app.mongodb.database;
  const matches = new models.Matches(db);

  const redis = app.redis.client;
  const subscriber = app.redis.subscriber;

  const localChannel = uuid.v4();

  subscriber.subscribe(localChannel);

  subscriber.on("message", (channel, message) => {
    const { id, command } = JSON.parse(message);
    if (channel == localChannel) {
      switch (command.action) {
        case "channel":
          channels.set(id, command.channel);
          break;
        default:
          deliver(id, command);
          break;
      }
    }
  });

  async function startMatch(match, id) {
    console.log(`starting match: ${match.player1.id} vs ${id}`);

    const player1 = match.player1;
    const player2 = { id, channel: localChannel };
    match = await matches.start(match, player2);

    channels.set(player2.id, player1.channel);

    // If the application spans multiple server processes,
    // the players will be communicating over a redis pubsub channel.
    // In that case, tell player1 what channel they should talk to.
    if (player1.channel != player2.channel) {
      publish(player1.id, { action: "channel", channel: player2.channel });
    } else {
      channels.set(player1.id, player2.channel);
    }

    // Let player1 know that the match is ready for first move.
    send(player1.id, { action: "start", piece: "X" });
    send(player1.id, { action: "play" });

    // Let player2 know that the match has started, but waiting for
    // player 1 to make the first move.
    send(player2.id, { action: "start", piece: "O" });
    send(player2.id, { action: "wait" });
  }

  // This function decides whether or not to communicate over the pubsub
  // channel or to deliver directly to a websocket.
  function send(id, command) {
    const channel = channels.get(id);
    if (channel == localChannel) {
      return deliver(id, command);
    } else {
      return publish(id, command);
    }
  }

  function broadcast(match, command) {
    send(match.player1.id, command);
    send(match.player2.id, command);
  }

  function deliver(id, command) {
    const ws = connections.get(id);
    return ws.send(JSON.stringify(command));
  }

  function publish(id, command) {
    const channel = channels.get(id);
    return redis.publish(channel, JSON.stringify({ id, command }));
  }

  async function queueMatch(id) {
    console.log(`queuing match: ${id} vs ???`);
    const player1 = { id, channel: localChannel };
    return matches.queue(player1);
  }

  async function initMatch(id) {
    console.log(`player joined: ${id}`);
    const match = await matches.nextAvailable();
    if (match) {
      // There's a player waiting, so match them.
      return await startMatch(match, id);
    }
    // No one is waiting, so wait for opponent.
    return await queueMatch(id);
  }

  function removePlayer(id) {
    const ws = connections.get(id);
    ws.close();
    connections.delete(id);
    channels.delete(id);
  }

  async function closeMatchForPlayer(id) {
    console.log(`closing match for player: ${id}`);
    const match = await matches.deleteForPlayer(id);
    if (match) {
      removePlayer(match.player1.id);
      if (match.player2) {
        removePlayer(match.player2.id);
      }
    }
  }

  async function closeMatches() {
    return await Promise.all(
      Array.from(connections.keys()).map((id) => closeMatchForPlayer(id))
    );
  }

  function createBoard() {
    const board = [];
    for (let row = 0; row < 3; row++) {
      board.push([]);
      for (let col = 0; col < 3; col++) {
        board[row].push(null);
      }
    }
    return board;
  }

  function whichPlayer(match, id) {
    if (match.player1.id == id) {
      return {
        piece: "X",
        player: match.player1,
        opponent: match.player2,
      };
    } else {
      return {
        piece: "O",
        player: match.player2,
        opponent: match.player1,
      };
    }
  }

  async function commandMove(id, move) {
    const match = await matches.findForPlayer(id);

    // Disallow move if match doesn't exist.
    if (!match) return;

    // Initialize board.
    if (!match.board) {
      match.board = createBoard();
      match.moves = [];
    }

    const { board, moves } = match;
    const { piece, player, opponent } = whichPlayer(match, id);

    // Disallow move if wrong player is going first.
    if (moves.length == 0 && piece == "O") {
      return;
    }

    // Disallow move if not player's turn.
    if (moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      if (lastMove.piece == piece) {
        return;
      }
    }

    const { row, col } = move;

    // Disallow move if space is taken.
    if (board[row][col]) {
      return;
    }

    board[row][col] = piece;
    const nextMove = { row, col, piece };
    moves.push(nextMove);

    // Notify players of changes.
    broadcast(match, { action: "move", move: nextMove });

    const win = detectWin(board);

    if (win) {
      match.win = win;
      match.winner = board[win[0][0]][win[0][1]];

      const [winner, loser] =
        match.winner == "X"
          ? [match.player1, match.player2]
          : [match.player2, match.player1];

      broadcast(match, { action: "finish" });
      send(winner.id, { action: "win" });
      send(loser.id, { action: "lose" });
    } else {
      send(player.id, { action: "wait" });
      send(opponent.id, { action: "play" });
    }

    await matches.update(match);
  }

  function detectWin(board) {
    function cell([row, col]) {
      return board[row][col];
    }
    function same([c1, c2, c3]) {
      const a = cell(c1);
      const b = cell(c2);
      const c = cell(c3);
      return a && a == b && b == c;
    }
    const checks = [
      [
        // row 1
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      [
        // row 2
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [
        // row 3
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      [
        // column 1
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [
        // column 2
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        // column 3
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      [
        // diagonal 1
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        // diagonal 2
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    ];
    for (const check of checks) {
      if (same(check)) {
        return check;
      }
    }
    return null;
  }

  wss.on("connection", async (ws) => {
    const id = uuid.v4();
    connections.set(id, ws);
    await initMatch(id);

    ws.on("message", async (message) => {
      const command = JSON.parse(message);
      switch (command.action) {
        case "move":
          commandMove(id, command.move);
          break;
      }
    });

    ws.on("close", async () => {
      await closeMatchForPlayer(id);
    });
  });

  wss.on("close", async () => {
    return await closeMatches();
  });
};
