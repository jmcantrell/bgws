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

  async start(match, player2) {
    // Complete the db record for match.
    const r = await this.collection.findOneAndUpdate(
      { _id: match._id },
      {
        $set: {
          player2,
          started_on: new Date(),
        },
      },
      { returnOriginal: false }
    );
    return r.value;
  }

  async queue(player1) {
    return await this.collection.insertOne({
      player1,
      created_on: new Date(),
    });
  }

  async nextAvailable() {
    const docs = await this.collection
      .find({ player2: null })
      .sort({ created_on: 1 })
      .limit(1)
      .toArray();
    if (docs.length == 0) return null;
    return docs[0];
  }

  async findForPlayer(id) {
    return await this.collection.findOne({
      $or: [{ "player1.id": id }, { "player2.id": id }],
    });
  }

  async deleteForPlayer(id) {
    const r = await this.collection.findOneAndDelete({
      $or: [{ "player1.id": id }, { "player2.id": id }],
    });
    return r.value;
  }

  async update(match) {
    return await this.collection.replaceOne({ _id: match._id }, match);
  }
}

module.exports = { Matches };
