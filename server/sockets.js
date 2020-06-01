import { v4 as uuid } from "uuid";
import EventEmitter from "events";
import WebSocket from "ws";

export default class Sockets extends EventEmitter {
  constructor({ server }) {
    super();

    // Each client that is connected to this server process via a
    // websocket will get a unique identifier. This will map the
    // identifiers to the websocket object.
    this.clients = new Map();
    this.wss = new WebSocket.Server({ server, clientTracking: false });

    this.wss.on("connection", async (ws) => {
      const id = uuid();
      this.clients.set(id, ws);

      this.emit("connect", id);

      ws.on("message", async (message) => {
        const command = JSON.parse(message);
        this.emit("command", id, command);
      });

      // If this websocket responds to a ping, keep it alive.
      ws.active = true;
      ws.on("pong", () => {
        ws.active = true;
      });

      ws.on("close", () => {
        this.emit("disconnect", id);
        this.clients.delete(id);
      });
    });

    // This will terminate inactive websocket connections.
    setInterval(() => {
      for (const [id, ws] of this.clients.entries()) {
        if (!ws.active) {
          this.emit("disconnect", id);
          this.clients.delete(id);
          return ws.terminate();
        }
        ws.active = false;
        ws.ping();
      }
    }, process.env.WS_PING_TIMEOUT || 30000);
  }

  async close() {
    for (const id of this.clients.keys()) {
      await this.disconnect(id);
    }
  }

  async disconnect(id) {
    const ws = this.clients.get(id);
    if (ws) ws.close();
  }

  send(id, command) {
    const ws = this.clients.get(id);
    if (ws) ws.send(JSON.stringify(command));
  }
}
