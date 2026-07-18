const mongoose = require('mongoose');
const AssessmentConfiguration = require('../../domain/academics/models/AssessmentConfiguration');
const StudentAssessmentMark = require('../../domain/academics/models/StudentAssessmentMark');
const AssessmentHandler = require('../handlers/AssessmentHandler');
const AcademicYear = require('../../domain/academics/models/AcademicYear');
const Class = require('../../domain/academics/models/Classes');
const ClassSubjectLink = require('../../domain/academics/models/ClassSubjectLink');
const Template = require('../../domain/metadata/models/Template');
const Student = require('../../domain/student/models/Student');

// ==========================================
// 1. ASSESSMENT CONFIGURATION CONTROLLER
// ==========================================
exports.saveConfiguration = async (req, res) => {
  try {
    const schoolId = req.schoolId || req.user?.schoolId;
    const result = await AssessmentHandler.handle(schoolId, { AssessmentConfiguration: req.body }, req.body, null, null);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getConfigurations = async (req, res) => {
  try {
    const { academicYearId, classId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;
    const filter = { schoolId };
    
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    } else if (academicYearId) {
      // If query has invalid academicYearId, return empty list instead of throwing CastError
      return res.json({ success: true, data: [] });
    }

    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = classId;
    } else if (classId) {
      // If query has invalid classId, return empty list instead of throwing CastError
      return res.json({ success: true, data: [] });
    }

    const configs = await AssessmentConfiguration.find(filter).populate('subjects.subjectId');
    res.json({ success: true, data: configs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Deletions are processed via Dispatcher / Metadata engine.

// ==========================================
// 2. RESULTS CONFIGURATION API
// ==========================================
exports.getResultsConfig = async (req, res) => {
  try {
    const { academicYear, classId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    let yearDoc = null;
    if (academicYear) {
      yearDoc = await AcademicYear.findOne({ name: academicYear });
    }

    let classDoc = null;
    if (classId) {
      if (mongoose.Types.ObjectId.isValid(classId)) {
        classDoc = await Class.findById(classId);
      } else {
        classDoc = await Class.findOne({ class: classId });
      }
    }

    let exams = [];
    let subjects = [];
    if (classDoc && yearDoc) {
      const configs = await AssessmentConfiguration.find({
        academicYearId: yearDoc._id,
        classId: classDoc._id,
        schoolId
      }).populate('subjects.subjectId');

      exams = configs.map(c => ({ _id: c._id, name: c.assessmentName }));

      // Fallback: load all available subjects from linkage if config has none
      const link = await ClassSubjectLink.findOne({ classId: classDoc._id }).populate('subjectIds');
      if (link && Array.isArray(link.subjectIds)) {
        subjects = link.subjectIds.map(sub => ({ _id: sub._id, name: sub.name }));
      }
    }

    const template = await Template.findOne({
      status: 'active',
      key: { $regex: 'result', $options: 'i' }
    }) || await Template.findOne({ status: 'active' }) || null;

    res.json({
      academicYear: yearDoc ? yearDoc.name : academicYear,
      class: classDoc ? { _id: classDoc._id, class: classDoc.class } : null,
      exams,
      subjects,
      template
    });
  } catch (err) {
    console.error("Error fetching results config:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
};

// ==========================================
// 3. STUDENT MARKS CONTROLLER
// ==========================================
exports.bulkSaveMarks = async (req, res) => {
  try {
    const { assessmentConfigurationId, subjectId, marks } = req.body;
    const schoolId = req.schoolId || req.user?.schoolId;

    const config = await AssessmentConfiguration.findById(assessmentConfigurationId);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Assessment configuration not found.' });
    }

    const subSetup = config.subjects.find(s => {
      const sId = s.subjectId?._id || s.subjectId;
      return sId && sId.toString() === subjectId.toString();
    });
    const maxMarks = subSetup ? subSetup.maximumMarks : 100;

    for (const record of marks) {
      const { studentId, obtainedMarks, attendanceStatus, remarks } = record;

      const percentage = attendanceStatus === 'absent' ? 0 : (obtainedMarks / maxMarks) * 100;
      const grade = attendanceStatus === 'absent' ? 'E' : AssessmentHandler.calculateGrade(percentage);

      await StudentAssessmentMark.findOneAndUpdate(
        { assessmentConfigurationId, studentId, subjectId, schoolId },
        {
          obtainedMarks: attendanceStatus === 'absent' ? 0 : obtainedMarks,
          attendanceStatus,
          percentage,
          grade,
          remarks,
          schoolId
        },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, message: 'Marks saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMarksRegister = async (req, res) => {
  try {
    const { assessmentConfigurationId, subjectId, classId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    // Load students
    const studentsList = await Student.find({ schoolId });
    const savedMarks = await StudentAssessmentMark.find({ assessmentConfigurationId, subjectId, schoolId });

    res.json({
      success: true,
      data: {
        students: studentsList,
        savedMarks
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 4. CLONING / SETUP CONTROLLER
// ==========================================
exports.copyPreviousYear = async (req, res) => {
  try {
    const { fromYearId, toYearId } = req.body;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!fromYearId || !toYearId) {
      return res.status(400).json({ success: false, message: 'Source and Target Academic Years are required.' });
    }

    const result = await AssessmentHandler.copyPreviousYearConfig(schoolId, fromYearId, toYearId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 5. ANALYTICS CONTROLLER
// ==========================================
exports.getSubjectReport = async (req, res) => {
  try {
    const { assessmentConfigurationId, subjectId } = req.query;
    const schoolId = req.schoolId || req.user?.schoolId;

    const stats = await AssessmentHandler.getSubjectAnalytics(schoolId, assessmentConfigurationId, subjectId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.copyConfiguration = async (req, res) => {
  try {
    const {
      sourceAcademicYearId,
      targetAcademicYearId,
      assessmentIds,
      copySubjects,
      copyChapters,
      copyMarks,
      copyDuration,
      copyExamDates,
      copyStatus
    } = req.body;

    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?._id || req.user?.username || 'system';

    if (!sourceAcademicYearId || !targetAcademicYearId) {
      return res.status(400).json({ success: false, message: 'Source and Target Academic Years are required.' });
    }

    if (sourceAcademicYearId === targetAcademicYearId) {
      return res.status(400).json({ success: false, message: 'Source and Target Academic Years cannot be the same.' });
    }

    if (!Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No assessments selected to copy.' });
    }

    // Load source configurations
    const sourceConfigs = await AssessmentConfiguration.find({
      _id: { $in: assessmentIds.map(id => new mongoose.Types.ObjectId(id)) },
      schoolId
    });

    if (sourceConfigs.length === 0) {
      return res.status(404).json({ success: false, message: 'No source configurations found.' });
    }

    // Load existing configs in target year for duplicate prevention
    const targetConfigs = await AssessmentConfiguration.find({
      academicYearId: new mongoose.Types.ObjectId(targetAcademicYearId),
      schoolId
    });

    const existingKeys = new Set(targetConfigs.map(c => `${c.classId.toString()}_${c.assessmentName.toLowerCase().trim()}`));

    const newConfigsArray = [];
    let skippedCount = 0;

    for (const config of sourceConfigs) {
      const uniqueKey = `${config.classId.toString()}_${config.assessmentName.toLowerCase().trim()}`;
      if (existingKeys.has(uniqueKey)) {
        skippedCount++;
        continue;
      }

      const newConfig = {
        schoolId,
        academicYearId: new mongoose.Types.ObjectId(targetAcademicYearId),
        classId: config.classId,
        assessmentName: config.assessmentName,
        displayOrder: config.displayOrder || 1,
        weightage: config.weightage || 100,
        status: copyStatus ? config.status : 'Draft',
        subjects: (config.subjects || []).map(sub => {
          const newSub = {
            subjectId: sub.subjectId,
            selectedChapterIds: copyChapters ? sub.selectedChapterIds : [],
            maximumMarks: copyMarks ? sub.maximumMarks : 100,
            passingMarks: copyMarks ? sub.passingMarks : 35
          };

          if (copyDuration && typeof sub.duration === 'number') {
            newSub.duration = sub.duration;
          }
          if (copyExamDates && sub.examDate) {
            newSub.examDate = sub.examDate;
          }

          return newSub;
        })
      };

      newConfigsArray.push(newConfig);
    }

    if (newConfigsArray.length > 0) {
      await AssessmentConfiguration.insertMany(newConfigsArray);
    }

    // Audit Log
    console.log(`[AUDIT] Assessment Configuration Copy:
      Source Academic Year: ${sourceAcademicYearId}
      Target Academic Year: ${targetAcademicYearId}
      User: ${userId}
      Timestamp: ${new Date().toISOString()}
      Total Copied: ${newConfigsArray.length}
      Total Skipped: ${skippedCount}
    `);

    res.status(201).json({
      success: true,
      created: newConfigsArray.length,
      skipped: skippedCount,
      message: 'Assessment configuration copied successfully.'
    });
  } catch (err) {
    console.error('Error copying configuration:', err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
};

exports.deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId || req.user?.schoolId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid configuration ID.' });
    }

    // Delete associated student marks
    await StudentAssessmentMark.deleteMany({ assessmentConfigurationId: id, schoolId });

    const deleted = await AssessmentConfiguration.findOneAndDelete({ _id: id, schoolId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Assessment configuration not found.' });
    }

    res.json({ success: true, message: 'Assessment configuration and associated marks deleted successfully.' });
  } catch (err) {
    console.error('Error deleting configuration:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
