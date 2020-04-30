const fs = require("fs");
const path = require("path");
const test = require("ava");
const uuid = require("uuid");
const config = require("../config");
const { Matches } = require("../models");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);

const examples = JSON.parse(
  fs.readFileSync(path.join(__dirname, "examples.json"), "utf8")
);

test.beforeEach(async (t) => {
  const client = await config.connectMongoDB();
  const id = uuid.v4();
  const db = client.db(`${pkg.name}-test-${id}`);
  t.context.db = db;
  t.context.matches = new Matches(db);
  t.context.player1 = { id: 1 };
  t.context.player2 = { id: 2 };
});

for (const [name, match] of Object.entries(examples)) {
  test(`match: ${name}`, async (t) => {
    await testMatch(t, match);
  });
}

async function testMatch(t, matchExpected) {
  const { moves, board, winner } = matchExpected;
  const { matches, player1, player2 } = t.context;
  await matches.init(player1);
  const match = await matches.init(player2);
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const finished = await testMove(t, match, move);
    if (i == moves.length - 1) {
      t.true(finished);
    } else {
      t.false(finished);
    }
  }
  t.falsy(Matches.whoseTurn(match));
  t.deepEqual(match.board, board);
  t.deepEqual(match.moves, moves);
  t.deepEqual(match.winner, winner);
}

async function testMove(t, match, move) {
  const n = match.moves.length;
  const finished = await t.context.matches.addMove(match, move);
  t.is(match.board[move.row][move.column], move.piece);
  t.true(match.moves.length == n + 1);
  t.deepEqual(match.moves[n], move);
  return finished;
}

test("matches.createMatch()", async (t) => {
  const { matches, player1 } = t.context;
  t.falsy(player1.piece);
  const match = await matches.create(player1);
  t.truthy(match._id);
  t.is(player1.piece, "x");
  t.deepEqual(player1, match.player1);
  t.true(typeof match.createdOn.getYear == "function");
  t.falsy(match.player2);
  t.falsy(match.startedOn);
});

test("matches.startMatch()", async (t) => {
  const { matches, player1, player2 } = t.context;
  t.falsy(await matches.start(player2));
  const match1 = await matches.create(player1);
  const match2 = await matches.start(player2);
  t.falsy(match1.player2);
  t.falsy(match1.startedOn);
  t.is(match1._id.toString(), match2._id.toString());
  t.deepEqual(match1.player1, match2.player1);
  t.truthy(match2.player2);
  t.truthy(match2.startedOn);
});

test("matches.{find,delete}ForPlayer()", async (t) => {
  const { matches, player1, player2 } = t.context;
  t.falsy(await matches.findForPlayer(player1));
  t.falsy(await matches.findForPlayer(player2));
  await matches.init(player1);
  const match = await matches.init(player2);
  t.deepEqual(match, await matches.findForPlayer(player1));
  t.deepEqual(match, await matches.findForPlayer(player2));
  t.deepEqual(match, await matches.deleteForPlayer(player1));
  t.falsy(await matches.deleteForPlayer(player2));
  t.falsy(await matches.findForPlayer(player1));
  t.falsy(await matches.findForPlayer(player2));
});

test("Matches.whoseTurn()", async (t) => {
  const { matches, player1, player2 } = t.context;
  const match1 = await matches.init(player1);
  t.falsy(Matches.whoseTurn(match1));
  const match2 = await matches.init(player2);
  t.is(Matches.whoseTurn(match2), match2.player1);
  await matches.addMove(match2, { piece: "x", row: 0, column: 0 });
  t.is(Matches.whoseTurn(match2), match2.player2);
  await matches.addMove(match2, { piece: "o", row: 1, column: 1 });
  t.is(Matches.whoseTurn(match2), match2.player1);
});

test.afterEach.always(async (t) => {
  await t.context.db.dropDatabase();
});
