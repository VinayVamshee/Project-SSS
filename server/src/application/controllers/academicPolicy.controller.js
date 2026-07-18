const mongoose = require('mongoose');
const { sendSuccess } = require('../../core/errors/apiResponse');
const AppError = require('../../core/errors/AppError');

// Create new Policy
exports.createPolicy = async (req, res, next) => {
  try {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    const { name, academicYearId, effectiveFrom, effectiveUntil } = req.body;

    if (!academicYearId || !name || !effectiveFrom || !effectiveUntil) {
      throw new AppError('Missing required parameters: name, academicYearId, effectiveFrom, effectiveUntil', 400);
    }

    // Enforce schoolId matching tenant
    const policy = await AcademicPolicy.create({
      ...req.body,
      schoolId: req.schoolId
    });

    sendSuccess(res, policy, 201);
  } catch (error) {
    next(error);
  }
};

// Update active policy
exports.updatePolicy = async (req, res, next) => {
  try {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    const policy = await AcademicPolicy.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!policy) {
      throw new AppError('Academic policy not found or access denied.', 404);
    }

    sendSuccess(res, policy);
  } catch (error) {
    next(error);
  }
};

// List all policies for the active tenant
exports.listPolicies = async (req, res, next) => {
  try {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    const { academicYearId } = req.query;

    const filter = { schoolId: req.schoolId };
    if (academicYearId) {
      filter.academicYearId = academicYearId;
    }

    const policies = await AcademicPolicy.find(filter).sort({ createdAt: -1 });
    sendSuccess(res, policies);
  } catch (error) {
    next(error);
  }
};

// Get single policy details
exports.getPolicy = async (req, res, next) => {
  try {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    const policy = await AcademicPolicy.findOne({ _id: req.params.id, schoolId: req.schoolId });

    if (!policy) {
      throw new AppError('Academic policy not found.', 404);
    }

    sendSuccess(res, policy);
  } catch (error) {
    next(error);
  }
};

// Delete draft policy
exports.deletePolicy = async (req, res, next) => {
  try {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    const policy = await AcademicPolicy.findOne({ _id: req.params.id, schoolId: req.schoolId });

    if (!policy) {
      throw new AppError('Academic policy not found.', 404);
    }

    if (policy.status === 'active') {
      throw new AppError('Cannot delete an active policy. Demote or archive it first.', 400);
    }

    await AcademicPolicy.deleteOne({ _id: req.params.id });
    sendSuccess(res, { message: 'Academic policy deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Get default active policy
exports.getActivePolicy = async (req, res, next) => {
  try {
    const AcademicPolicyEngine = require('../services/AcademicPolicyEngine');
    const { academicYearId } = req.query;

    if (!academicYearId) {
      throw new AppError('academicYearId is required to fetch active policy.', 400);
    }

    const policy = await AcademicPolicyEngine.getActivePolicy(req.schoolId, academicYearId);
    sendSuccess(res, policy);
  } catch (error) {
    next(error);
  }
};
