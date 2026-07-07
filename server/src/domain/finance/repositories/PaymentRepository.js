const Payment = require('../models/Payment');

class PaymentRepository {
  async findOne(query) {
    return Payment.findOne(query);
  }

  async find(query = {}) {
    return Payment.find(query).populate('academicYears.academicYear', 'name year');
  }

  async create(data) {
    const payment = new Payment(data);
    return payment.save();
  }
}

module.exports = new PaymentRepository();
