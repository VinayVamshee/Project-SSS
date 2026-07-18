const express = require('express');
const router = express.Router();
const financeController = require('../../application/controllers/finance.controller');
const { protect } = require('../middlewares/authMiddleware');
const dynamicValidator = require('../middlewares/dynamicValidator');
const { validateSaveFees } = require('../../application/validators/finance.validator');

// Register models
require('../../domain/finance/models/StudentFeeAssignment');
require('../../domain/finance/models/StudentPaymentLedger');
require('../../domain/finance/models/ReceiptSeries');
require('../../domain/finance/models/FinancialTransaction');

router.use(protect);

router.post('/saveFees', validateSaveFees, dynamicValidator('Payment'), financeController.saveFees);
router.get('/getFees', financeController.getFees);
router.get('/transactions', financeController.getTransactions);

router.post('/class-fees', financeController.saveClassFees);
router.get('/class-fees', financeController.getClassFees);
router.post('/copy-class-fees', financeController.copyClassFees);
router.post('/dev/bulk-import-fees', financeController.bulkImportFees);


router.get('/receiptBook', financeController.getReceiptBook);
router.post('/updateReceiptBook', financeController.updateReceiptBook);
router.patch('/incrementReceipt', financeController.incrementReceipt);

module.exports = router;
