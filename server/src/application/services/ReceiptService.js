const ReceiptBookRepository = require('../../domain/finance/repositories/ReceiptBookRepository');
const CounterRepository = require('../../domain/shared/repositories/CounterRepository');

class ReceiptService {
  async getReceiptBook(schoolId) {
    let receiptBook = await ReceiptBookRepository.findOne({ schoolId });
    if (!receiptBook) {
      receiptBook = await ReceiptBookRepository.create({
        schoolId,
        name: "Default Book",
        prefix: "REC",
        counterKey: `receipt_counter_${schoolId}`,
        active: true
      });
    }
    return receiptBook;
  }

  async generateReceiptNumber(schoolId) {
    const book = await this.getReceiptBook(schoolId);
    const seq = await CounterRepository.getNextSequence(book.counterKey);
    const paddedSeq = String(seq).padStart(book.paddingLength, '0');
    return `${book.prefix}${book.separator || '-'}${paddedSeq}${book.suffix || ''}`;
  }
}

module.exports = new ReceiptService();
