import { v4 as uuid } from "uuid";
import EventEmitter from "events";
import WebSocket from "ws";

export default class CommandServer extends EventEmitter {
  constructor({ redis, server }) {
    super();

    this.redis = redis;
    this.wss = new WebSocket.Server({ server });

    this.clients = new Map();

    this.channel = uuid();

    this.subscriber = redis.duplicate();
    this.subscriber.subscribe(this.channel);

    this.subscriber.on("message", (channel, message) => {
      const delivery = JSON.parse(message);
      const { id: clientID, command } = delivery;
      this.send(clientID, command);
    });

    this.wss.on("connection", async (ws) => {
      const clientID = uuid();
      this.clients.set(clientID, ws);

      this.emit("connect", clientID);

      ws.on("message", async (message) => {
        const command = JSON.parse(message);
        this.emit("command", clientID, command);
      });

      // If this websocket responds to a ping, keep it alive.
      ws.active = true;
      ws.on("pong", () => {
        ws.active = true;
      });

      ws.on("close", () => {
        this.emit("disconnect", clientID);
        this.clients.delete(clientID);
      });
    });

    // This will terminate inactive websocket connections.
    setInterval(() => {
      for (const [clientID, ws] of this.clients.entries()) {
        if (!ws.active) {
          this.clients.delete(clientID);
          return ws.terminate();
        }
        ws.active = false;
        ws.ping();
      }
    }, process.env.WS_PING_TIMEOUT || 30000);
  }

  async close() {
    for (const clientID of this.clients.keys()) {
      await this.disconnect(clientID);
    }
  }

  async disconnect(clientID) {
    const ws = this.clients.get(clientID);
    this.clients.delete(clientID);
    if (ws) ws.close();
  }

  send(clientID, command) {
    const ws = this.clients.get(clientID);
    if (ws) ws.send(JSON.stringify(command));
  }
}
