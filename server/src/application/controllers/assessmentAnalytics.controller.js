const AssessmentAnalyticsService = require('../services/AssessmentAnalyticsService');

exports.getDashboard = async (req, res) => {
  try {
    const { academicYearId, classId, assessmentConfigurationId, subjectId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!academicYearId || !classId) {
      return res.status(400).json({ success: false, message: 'Academic Year and Class filters are required.' });
    }

    const data = await AssessmentAnalyticsService.getDashboardData(
      schoolId,
      academicYearId,
      classId,
      assessmentConfigurationId,
      subjectId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStudentAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYearId, classId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!academicYearId || !classId) {
      return res.status(400).json({ success: false, message: 'Academic Year and Class are required filters.' });
    }

    const data = await AssessmentAnalyticsService.getStudentAnalytics(
      schoolId,
      academicYearId,
      classId,
      studentId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubjectAnalytics = async (req, res) => {
  try {
    const { academicYearId, classId, subjectId, assessmentConfigurationId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!academicYearId || !classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Academic Year, Class, and Subject are required.' });
    }

    const data = await AssessmentAnalyticsService.getSubjectAnalytics(
      schoolId,
      academicYearId,
      classId,
      subjectId,
      assessmentConfigurationId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClassAnalytics = async (req, res) => {
  try {
    const { academicYearId, classId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!academicYearId || !classId) {
      return res.status(400).json({ success: false, message: 'Academic Year and Class are required.' });
    }

    const data = await AssessmentAnalyticsService.getClassAnalytics(
      schoolId,
      academicYearId,
      classId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAssessmentAnalytics = async (req, res) => {
  try {
    const { academicYearId, classId, assessmentConfigurationId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!academicYearId || !classId || !assessmentConfigurationId) {
      return res.status(400).json({ success: false, message: 'Academic Year, Class, and Assessment Configuration ID are required.' });
    }

    const data = await AssessmentAnalyticsService.getAssessmentAnalytics(
      schoolId,
      academicYearId,
      classId,
      assessmentConfigurationId
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
