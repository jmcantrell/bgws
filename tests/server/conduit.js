import test from "ava";
import { connectTestRedis } from "../_setup.js";
import Conduit from "../../server/conduit.js";
import { ready as redisReady } from "../../server/redis.js";

test("one conduit can communicate with another", async (t) => {
  const hello1 = { message: "hello from conduit1" };
  const player1 = "player1";
  const redis1 = await connectTestRedis();
  const conduit1 = new Conduit({ redis: redis1 });
  await redisReady(conduit1.subscriber);
  const promise1 = new Promise((resolve) => {
    conduit1.on("command", (id, command) => {
      t.is(id, player1);
      t.deepEqual(command, hello2);
      return resolve();
    });
  });
  const hello2 = { message: "hello from conduit2" };
  const player2 = "player2";
  const redis2 = await connectTestRedis();
  const conduit2 = new Conduit({ redis: redis2 });
  await redisReady(conduit2.subscriber);
  const promise2 = new Promise((resolve) => {
    conduit2.on("command", (id, command) => {
      t.is(id, player2);
      t.deepEqual(command, hello1);
      return resolve();
    });
  });
  await conduit1.send(conduit2.channel, player2, hello1);
  await conduit2.send(conduit1.channel, player1, hello2);
  await Promise.all([promise1, promise2]);
});
