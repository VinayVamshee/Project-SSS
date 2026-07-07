const ReceiptBook = require('../models/ReceiptBook');

class ReceiptBookRepository {
  async findOne(query = {}) {
    return ReceiptBook.findOne(query);
  }

  async create(data) {
    const receiptBook = new ReceiptBook(data);
    return receiptBook.save();
  }
}

module.exports = new ReceiptBookRepository();
