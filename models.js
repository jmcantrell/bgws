const ttt = require("./ttt")

class Model {
  constructor(db, collectionName) {
    this.db = db;
    this.collection = db.collection(collectionName);
  }
}

class Matches extends Model {
  constructor(db) {
    super(db, "matches");
  }

  async init(player) {
    let match = await this.start(player);
    if (!match) {
      return await this.create(player);
    }
    return match;
  }

  async create(player1) {
    const match = ttt.createMatch();
    player1.piece = "x";
    match.player1 = player1;
    match.createdOn = new Date();
    const r = await this.collection.insertOne(match);
    return r.ops[0];
  }

  async start(player2) {
    player2.piece = "o";
    const r = await this.collection.findOneAndUpdate(
      { player2: null, finishedOn: null },
      {
        $set: {
          player2,
          startedOn: new Date(),
        },
      },
      { sort: { createdOn: 1 }, returnOriginal: false }
    );
    return r.value;
  }

  static whoseTurn(match) {
    const { player1, player2 } = match;
    // match hasn't started
    if (!player2) return null;
    // match already ended
    if (match.finishedOn) return null;
    const piece = ttt.whoseTurn(match);
    return piece == "x" ? player1 : player2;
  }

  async addMove(match, move) {
    const finished = ttt.addMove(match, move);
    if (finished) match.finishedOn = new Date();
    await this.update(match);
    return finished;
  }

  async update(match) {
    return await this.collection.replaceOne({ _id: match._id }, match);
  }

  async findForPlayer(player) {
    return await this.collection.findOne({
      finishedOn: null,
      $or: [{ "player1.id": player.id }, { "player2.id": player.id }],
    });
  }

  async deleteForPlayer(player) {
    const r = await this.collection.findOneAndDelete({
      finishedOn: null,
      $or: [{ "player1.id": player.id }, { "player2.id": player.id }],
    });
    return r.value;
  }
}

module.exports = { Matches };
