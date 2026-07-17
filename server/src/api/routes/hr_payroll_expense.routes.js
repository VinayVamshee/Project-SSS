const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middlewares/authMiddleware');
const DispatcherService = require('../../application/services/DispatcherService');
const Template = require('../../domain/metadata/models/Template');

// Ensure models are registered
require('../../domain/hr/models/Employee');
require('../../domain/hr/models/EmployeeAttendance');
require('../../domain/hr/models/SalaryStructure');
require('../../domain/finance/models/Expense');

const Employee = mongoose.model('Employee');
const EmployeeAttendance = mongoose.model('EmployeeAttendance');
const SalaryStructure = mongoose.model('SalaryStructure');
const Expense = mongoose.model('Expense');

router.use(protect);

// ==========================================
// EMPLOYEE ROUTES
// ==========================================

router.get('/hr/employees', async (req, res) => {
  try {
    const list = await Employee.find({ schoolId: req.schoolId });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/hr/employees', async (req, res) => {
  const { templateId, payload } = req.body;
  try {
    const result = await DispatcherService.dispatch(req.schoolId, templateId, payload);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ATTENDANCE ROUTES
// ==========================================

router.get('/hr/attendance', async (req, res) => {
  const { date } = req.query;
  try {
    const list = await EmployeeAttendance.find({
      schoolId: req.schoolId,
      date: new Date(date)
    }).populate('employeeId');
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/hr/attendance', async (req, res) => {
  const { records } = req.body; // array of { employeeId, date, status, remarks }
  try {
    const saved = [];
    for (const rec of records) {
      const query = { employeeId: rec.employeeId, date: new Date(rec.date), schoolId: req.schoolId };
      const update = { status: rec.status, remarks: rec.remarks || '' };
      const doc = await EmployeeAttendance.findOneAndUpdate(query, update, { upsert: true, new: true });
      saved.push(doc);
    }
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SALARY STRUCTURE ROUTES
// ==========================================

router.get('/payroll/salary-structures', async (req, res) => {
  try {
    const list = await SalaryStructure.find({ schoolId: req.schoolId }).populate('employeeId');
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/payroll/salary-structures', async (req, res) => {
  const { templateId, payload } = req.body;
  try {
    const result = await DispatcherService.dispatch(req.schoolId, templateId, payload);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// EXPENSE ROUTES
// ==========================================

router.get('/finance/expenses', async (req, res) => {
  try {
    const list = await Expense.find({ schoolId: req.schoolId });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/finance/expenses', async (req, res) => {
  const { templateId, payload } = req.body;
  try {
    const result = await DispatcherService.dispatch(req.schoolId, templateId, payload);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
