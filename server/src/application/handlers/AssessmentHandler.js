const mongoose = require('mongoose');
const AssessmentConfiguration = require('../../domain/academics/models/AssessmentConfiguration');
const StudentAssessmentMark = require('../../domain/academics/models/StudentAssessmentMark');

class AssessmentHandler {
  // Calculate CBSE/Generic letter grade
  calculateGrade(percentage) {
    if (percentage >= 90) return 'A1';
    if (percentage >= 80) return 'A2';
    if (percentage >= 70) return 'B1';
    if (percentage >= 60) return 'B2';
    if (percentage >= 50) return 'C1';
    if (percentage >= 40) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E';
  }

  // Copy Previous Year Config (duplicate AssessmentConfiguration documents)
  async copyPreviousYearConfig(schoolId, fromYearId, toYearId) {
    const sourceConfigs = await AssessmentConfiguration.find({ academicYearId: fromYearId, schoolId });
    const copiedCount = 0;

    for (const config of sourceConfigs) {
      // Check if already exists in target
      const exists = await AssessmentConfiguration.findOne({
        academicYearId: toYearId,
        classId: config.classId,
        assessmentName: config.assessmentName,
        schoolId
      });

      if (!exists) {
        const newConfig = new AssessmentConfiguration({
          schoolId,
          academicYearId: toYearId,
          classId: config.classId,
          assessmentName: config.assessmentName,
          displayOrder: config.displayOrder,
          weightage: config.weightage,
          status: 'Draft', // reset status to Draft
          subjects: config.subjects.map(sub => ({
            subjectId: sub.subjectId,
            selectedChapterIds: sub.selectedChapterIds,
            maximumMarks: sub.maximumMarks,
            passingMarks: sub.passingMarks,
            duration: sub.duration
          }))
        });
        await newConfig.save();
      }
    }

    return { success: true, message: 'Assessment configurations copied successfully!' };
  }

  // Aggregate Subject Statistics (Average, High, Low, Median, Std Dev, Pass/Fail %)
  async getSubjectAnalytics(schoolId, assessmentConfigurationId, subjectId) {
    const config = await AssessmentConfiguration.findById(assessmentConfigurationId);
    if (!config) return null;

    const subSetup = config.subjects.find(s => s.subjectId.toString() === subjectId.toString());
    if (!subSetup) return null;

    const marks = await StudentAssessmentMark.find({ assessmentConfigurationId, subjectId, schoolId });
    if (marks.length === 0) return null;

    const values = marks.map(m => m.obtainedMarks || 0);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;

    const highest = Math.max(...values);
    const lowest = Math.min(...values);

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const variance = values.reduce((sq, val) => sq + Math.pow(val - avg, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    const passedCount = marks.filter(m => (m.obtainedMarks || 0) >= subSetup.passingMarks && m.attendanceStatus !== 'absent').length;
    const passPercentage = (passedCount / count) * 100;

    return {
      totalStudents: count,
      average: Number(avg.toFixed(2)),
      highest,
      lowest,
      median: Number(median.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      passPercentage: Number(passPercentage.toFixed(2)),
      failPercentage: Number((100 - passPercentage).toFixed(2))
    };
  }

  // Handle incoming template dispatch submissions
  async handle(schoolId, mappedModels, payload, template, entity) {
    const configData = { ...mappedModels.AssessmentConfiguration, schoolId };

    // Resolve Class and Academic Year lookups if they are strings
    if (configData.classId && !mongoose.Types.ObjectId.isValid(configData.classId)) {
      const ClassModel = mongoose.model('Class');
      const classDoc = await ClassModel.findOne({ class: configData.classId, schoolId });
      if (classDoc) configData.classId = classDoc._id;
    }
    if (configData.academicYearId && !mongoose.Types.ObjectId.isValid(configData.academicYearId)) {
      const YearModel = mongoose.model('AcademicYear');
      const yearDoc = await YearModel.findOne({
        $or: [{ name: configData.academicYearId }, { year: configData.academicYearId }],
        schoolId
      });
      if (yearDoc) configData.academicYearId = yearDoc._id;
    }

    let configDoc;
    const configId = payload.assessmentConfigurationId || payload._id || configData._id;

    if (configId && mongoose.Types.ObjectId.isValid(configId)) {
      // Validate lifecyle status constraints before updating
      const original = await AssessmentConfiguration.findOne({ _id: configId, schoolId });
      if (original && original.status === 'Published') {
        throw new Error('This assessment is already Published. Modification or changes are not permitted.');
      }
      configDoc = await AssessmentConfiguration.findOneAndUpdate(
        { _id: configId, schoolId },
        configData,
        { new: true, runValidators: true }
      );
    } else {
      configDoc = new AssessmentConfiguration(configData);
      await configDoc.save();
    }

    return { success: true, data: configDoc };
  }
}

module.exports = new AssessmentHandler();
