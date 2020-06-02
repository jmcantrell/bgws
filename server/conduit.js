import { v4 as uuid } from "uuid";
import EventEmitter from "events";

export default class Conduit extends EventEmitter {
  constructor({ redis }) {
    super();

    this.redis = redis;
    this.subscriber = redis.duplicate();

    this.channel = uuid();
    this.subscriber.subscribe(this.channel);

    this.subscriber.on("message", (channel, message) => {
      if (channel == this.channel) {
        const { id, command } = JSON.parse(message);
        this.emit("command", id, command);
      }
    });
  }

  send(channel, id, command) {
    const message = JSON.stringify({ id, command });
    return new Promise((resolve, reject) => {
      this.redis.publish(channel, message, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    });
  }
}