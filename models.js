const ttt = require("./ttt");

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

  async start(player1) {
    const match = ttt.createMatch();
    player1.piece = "x";
    match.player1 = player1;
    match.createdOn = new Date();
    return await this.collection.insertOne(match);
  }

  async join(match, player2) {
    player2.piece = "o";
    const r = await this.collection.findOneAndUpdate(
      { _id: match._id },
      {
        $set: {
          player2,
          startedOn: new Date(),
        },
      },
      { returnOriginal: false }
    );
    return r.value;
  }

  async addMove(match, move) {
    const finished = ttt.addMove(match, move);
    if (finished) match.finishedOn = new Date();
    await this.update(match);
    return finished;
  }

  static getPlayer(match, id) {
    if (match.player1.id == id) return match.player1;
    if (match.player2.id == id) return match.player2;
    return null;
  }

  static getOpponent(match, id) {
    if (match.player1.id == id) return match.player2;
    if (match.player2.id == id) return match.player1;
    return null;
  }

  static whoseTurn(match) {
    const piece = ttt.whoseTurn(match);
    return piece == "x" ? match.player1 : match.player2;
  }

  async nextAvailable() {
    const docs = await this.collection
      .find({ player2: null, finishedOn: null })
      .sort({ createdOn: 1 })
      .limit(1)
      .toArray();
    if (docs.length == 0) return null;
    return docs[0];
  }

  async findForPlayer(id) {
    return await this.collection.findOne({
      finishedOn: null,
      $or: [{ "player1.id": id }, { "player2.id": id }],
    });
  }

  async deleteForPlayer(id) {
    const r = await this.collection.findOneAndDelete({
      finishedOn: null,
      $or: [{ "player1.id": id }, { "player2.id": id }],
    });
    return r.value;
  }

  async update(match) {
    return await this.collection.replaceOne({ _id: match._id }, match);
  }
}

module.exports = { Matches };
