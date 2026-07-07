const FinanceService = require('../services/FinanceService');
const ReceiptService = require('../services/ReceiptService');

exports.saveFees = async (req, res) => {
  try {
    const payment = await FinanceService.saveFees(req.schoolId, req.body);
    res.json({ message: "Payment recorded successfully", paymentEntry: payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFees = async (req, res) => {
  try {
    const fees = await FinanceService.getFees(req.schoolId, req.query.studentId, req.query.academicYear);
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveClassFees = async (req, res) => {
  try {
    const classFees = await FinanceService.saveClassFees(req.schoolId, req.body);
    res.status(201).json({ message: "Class fees updated", data: classFees });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getClassFees = async (req, res) => {
  try {
    const classFees = await FinanceService.getClassFees();
    res.status(200).json(classFees);
  } catch (error) {
    res.status(500).json({ message: "Error fetching fees", error: error.message });
  }
};

exports.copyClassFees = async (req, res) => {
  try {
    const result = await FinanceService.copyClassFees(req.schoolId, req.body);
    res.status(200).json({ message: `Successfully copied fee structure!`, data: result });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.getReceiptBook = async (req, res) => {
  try {
    const receiptBook = await ReceiptService.getReceiptBook(req.schoolId);
    res.json(receiptBook);
  } catch (err) {
    res.status(500).json({ message: "Error fetching receipt book" });
  }
};

exports.updateReceiptBook = async (req, res) => {
  try {
    const receiptBook = await ReceiptService.getReceiptBook(req.schoolId);
    receiptBook.name = req.body.bookName || receiptBook.name;
    await receiptBook.save();
    res.json(receiptBook);
  } catch (err) {
    res.status(500).json({ message: "Error updating receipt book" });
  }
};
