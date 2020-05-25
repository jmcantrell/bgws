import { v4 as uuid } from "uuid";
import EventEmitter from "events";
import WebSocket from "ws";

export default class Switch extends EventEmitter {
  constructor({ server, arena }) {
    super();

    this.arena = arena;
    this.wss = new WebSocket.Server({ server });

    // Each websocket connection is given a unique ID.
    // This is a mapping of those IDs to their websocket.
    this.clients = new Map();

    this.arena.on("message", (id, message) => {
      this.send(id, message);
    });

    this.wss.on("connection", async (ws) => {
      const id = uuid();
      this.clients.set(id, ws);

      this.emit("connection", id);

      ws.on("message", async (message) => {
        const command = JSON.parse(message);
        this.emit("command", id, command);
        const { action, data } = command;
        try {
          switch (action) {
            case "join":
              return await this.arena.join(id, data.game);
            case "move":
              return await this.arena.move(id, data.move);
            default:
              throw new Error("invalid command");
          }
        } catch (err) {
          this.emit("error", err);
          this.send(id, { error: "unable to perform command" });
        }
      });

      // If this websocket responds to a ping, keep it alive.
      ws.active = true;
      ws.on("pong", () => {
        ws.active = true;
      });

      ws.on("close", async () => {
        await this.close(id, "Player left the game.");
      });
    });

    // This will terminate inactive websocket connections.
    setInterval(() => {
      for (const [id, ws] of this.clients.entries()) {
        if (!ws.active) {
          this.clients.delete(id);
          return ws.terminate();
        }
        ws.active = false;
        ws.ping();
      }
    }, process.env.WS_PING_TIMEOUT || 30000);
  }

  async close(id, reason) {
    await this.arena.close(id, reason);
    const ws = this.clients.get(id);
    if (ws) ws.close();
    this.clients.delete(id);
    this.emit("disconnection", id);
  }

  send(id, message) {
    const ws = this.clients.get(id);
    if (ws) ws.send(JSON.stringify(message));
  }
}
