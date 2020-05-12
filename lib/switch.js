const uuid = require("uuid");
const EventEmitter = require("events");
const WebSocket = require("ws");
const Arena = require("./arena");

class Switch extends EventEmitter {
  constructor({ redis, server }) {
    super({ redis, server });

    // Each websocket connection is given a unique ID.
    // This is a mapping of those IDs to their websocket.
    this.clients = new Map();

    // Each server node has a dedicated pubsub channel.
    this.channel = uuid.v4();

    this.subscriber = redis.duplicate();
    this.subscriber.subscribe(this.channel);

    this.subscriber.on("message", (channel, message) => {
      const delivery = JSON.parse(message);
      const { id, data } = delivery;
      this.send(id, data);
    });

    this.arena = new Arena({ redis });

    this.wss = new WebSocket.Server({ server });

    this.wss.on("connection", async (ws) => {
      const id = uuid.v4();
      this.clients.set(id, ws);

      this.emit("connection", id);

      ws.on("message", async (message) => {
        const data = JSON.parse(message);
        this.emit("data", id, data);
        try {
          if (data.action == "join") {
            await this.arena.join(id, data.game, this.channel);
          } else {
            await this.arena.command(id, data);
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
        this.emit("disconnection", id);
        try {
          await this.arena.close(id);
        } catch (err) {
          this.emit("error", err);
        } finally {
          this.clients.delete(id);
        }
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

  send(id, data) {
    const ws = this.clients.get(id);
    if (ws) {
      ws.send(JSON.stringify(data));
    } else {
    }
  }
}

module.exports = Switch;
