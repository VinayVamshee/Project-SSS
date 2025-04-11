const mongoose = require("mongoose");

const receiptBookSchema = new mongoose.Schema({
  bookName: {
    type: String,
    required: true,
  },
  currentNumber: {
    type: Number,
    required: true,
    default: 1,
  },
});

module.exports = mongoose.model("ReceiptBook", receiptBookSchema);
