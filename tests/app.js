const test = require("ava");
const request = require("supertest");
const { once } = require("events");

process.env.PORT = 0;
process.env.LOG_LEVEL = "silent";

const app = require("../app");

app.get("/next", (req, res, next) => {
  next(new Error("should be caught by express"));
});

app.get("/error", () => {
  throw new Error("should be caught by express");
});

async function get(t, url, status = 200) {
  return await request(app)
    .get(url)
    .expect(status)
    .then(() => t.pass())
    .catch(() => t.fail());
}

test("server next error handler", async (t) => {
  return await get(t, "/next", 500);
});

test("server default error handler", async (t) => {
  return await get(t, "/error", 500);
});

test("server should listen", async (t) => {
  const server = await app.start();
  await once(server, "listening");
  t.pass();
});
