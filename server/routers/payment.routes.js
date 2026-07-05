const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Fees
router.post('/saveFees', paymentController.saveFees);
router.get('/getFees', paymentController.getFees);

// Class Fees scales
router.post('/class-fees', paymentController.saveClassFees);
router.get('/class-fees', paymentController.getClassFees);
router.post('/copy-class-fees', paymentController.copyClassFees);

// Receipt Books
router.get('/receiptBook', paymentController.getReceiptBook);
router.post('/updateReceiptBook', paymentController.updateReceiptBook);
router.patch('/incrementReceipt', paymentController.incrementReceipt);

module.exports = router;
