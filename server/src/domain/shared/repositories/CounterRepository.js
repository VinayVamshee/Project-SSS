const Counter = require('../models/Counter');

class CounterRepository {
  async getNextSequence(name) {
    const ret = await Counter.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return ret.seq;
  }
}

module.exports = new CounterRepository();
