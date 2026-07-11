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

exports.bulkImportFees = async (req, res) => {
  try {
    const { schoolId, academicYearId, fileContent } = req.body;
    if (!schoolId || !academicYearId || !fileContent) {
      return res.status(400).json({ message: 'schoolId, academicYearId, and fileContent are required.' });
    }

    const mongoose = require('mongoose');
    const FieldRegistry = mongoose.model('FieldRegistry');
    const Class = mongoose.model('Class');
    
    // 1. Get all fields (to resolve fee key to fieldId)
    const fields = await FieldRegistry.find({});
    const fieldMap = {};
    for (const f of fields) {
      fieldMap[f.key.toLowerCase()] = f._id.toString();
    }

    // 2. Get all classes for the school to resolve class name to classId
    const classes = await Class.find({ schoolId });
    const classMap = {};
    for (const c of classes) {
      classMap[c.class.toLowerCase()] = c._id.toString();
    }

    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      return res.status(400).json({ message: 'No fee data found in the uploaded file.' });
    }

    // Detect separator (tab or comma)
    const headerLine = lines[0];
    const isTab = headerLine.includes('\t');
    const headers = headerLine.split(isTab ? '\t' : ',').map(h => h.trim().toLowerCase());

    // First column must be 'class'
    if (headers[0] !== 'class') {
      return res.status(400).json({ message: "First column of the file must be 'class'" });
    }

    let successCount = 0;
    let failCount = 0;
    const logs = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(isTab ? '\t' : ',').map(v => v.trim());
      const className = values[0];
      if (!className) continue;

      const classId = classMap[className.toLowerCase()];
      if (!classId) {
        failCount++;
        logs.push(`[ERROR] Class '${className}' not found at row ${i}`);
        continue;
      }

      const fees = [];
      for (let j = 1; j < headers.length; j++) {
        const header = headers[j];
        const amountStr = values[j];
        if (!header || amountStr === undefined || amountStr === '') continue;

        const fieldId = fieldMap[header];
        if (!fieldId) {
          logs.push(`[WARNING] Fee component '${header}' not found in registry at row ${i}, skipping this column`);
          continue;
        }

        const amount = Number(amountStr) || 0;
        fees.push({ fieldId, amount });
      }

      try {
        await FinanceService.saveClassFees(schoolId, {
          academicYear: academicYearId,
          class_id: classId,
          fees
        });
        successCount++;
        logs.push(`[OK] Imported fee structure for class: ${className}`);
      } catch (err) {
        failCount++;
        logs.push(`[ERROR] Failed class ${className}: ${err.message}`);
      }
    }

    res.status(200).json({
      message: `Import complete. Success: ${successCount}, Failed: ${failCount}`,
      data: { successCount, failCount, logs }
    });
  } catch (error) {
    res.status(500).json({ message: 'Bulk import of fees failed', error: error.message });
  }
};

