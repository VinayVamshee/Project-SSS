const mongoose = require('mongoose');
const StudentAssessmentMark = require('../../domain/academics/models/StudentAssessmentMark');
const AssessmentConfiguration = require('../../domain/academics/models/AssessmentConfiguration');
const Student = require('../../domain/student/models/Student');

class AssessmentAnalyticsService {
  // Helper to calculate median
  calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // Helper to calculate standard deviation
  calculateStdDev(arr, mean) {
    if (arr.length <= 1) return 0;
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  // Helper to fetch student name map
  async getStudentNameMap(schoolId) {
    const StudentEnrollment = mongoose.model('StudentEnrollment');
    const enrollments = await StudentEnrollment.find({ schoolId }).populate('dynamicFields.fieldId');
    const studentMap = {};
    enrollments.forEach(e => {
      const sid = e.studentId?.toString() || e.studentId?._id?.toString();
      if (sid) {
        const nameField = e.dynamicFields?.find(f => f.fieldId?.key === 'fullname' || f.fieldId?.key === 'firstname');
        if (nameField) {
          studentMap[sid] = nameField.value;
        }
      }
    });
    return studentMap;
  }

  // Helper to calculate student averages across a set of marks
  calculateStudentAverages(marks, enrolledStudents, studentNameMap) {
    return enrolledStudents.map(st => {
      const stMarks = marks.filter(m => m.studentId.toString() === st._id.toString() && m.attendanceStatus !== 'absent');
      const total = stMarks.reduce((a, b) => a + (b.obtainedMarks || 0), 0);
      const avg = stMarks.length > 0 ? (total / stMarks.length) : 0;

      // Attendance rate for this student in the exams
      const totalExams = marks.filter(m => m.studentId.toString() === st._id.toString()).length;
      const presentExams = marks.filter(m => m.studentId.toString() === st._id.toString() && m.attendanceStatus === 'present').length;
      const attendance = totalExams > 0 ? Number(((presentExams / totalExams) * 100).toFixed(1)) : 100;

      // Simple mock delta for improvement
      const midPoint = Math.floor(stMarks.length / 2);
      const firstHalf = stMarks.slice(0, midPoint);
      const secondHalf = stMarks.slice(midPoint);
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + (b.obtainedMarks || 0), 0) / firstHalf.length : avg;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + (b.obtainedMarks || 0), 0) / secondHalf.length : avg;
      const delta = Number((secondAvg - firstAvg).toFixed(1));

      return {
        id: st._id.toString(),
        name: studentNameMap[st._id.toString()] || st.studentCode || 'Student',
        rollNumber: st.studentCode,
        average: Number(avg.toFixed(1)),
        attendance,
        improvementDelta: delta
      };
    }).sort((a, b) => b.average - a.average);
  }

  // 1. EXECUTIVE DASHBOARD
  async getDashboardData(schoolId, academicYearId, classId, assessmentConfigurationId, subjectId) {
    const configs = await AssessmentConfiguration.find({ academicYearId, classId, schoolId }).sort({ displayOrder: 1 });
    const configIds = configs.map(c => c._id);

    const marks = await StudentAssessmentMark.find({ assessmentConfigurationId: { $in: configIds }, schoolId }).populate('subjectId');
    const students = await Student.find({ schoolId });
    const enrolledStudents = students.filter(st => {
      return st.enrollments?.some(e => e.class?._id?.toString() === classId || e.class?.toString() === classId);
    });

    const studentNameMap = await this.getStudentNameMap(schoolId);
    const studentAverages = this.calculateStudentAverages(marks, enrolledStudents, studentNameMap);

    const totalStudents = enrolledStudents.length;
    const totalAssessments = configs.length;

    // Filter valid scores
    const presentMarks = marks.filter(m => m.attendanceStatus !== 'absent' && m.obtainedMarks !== undefined);
    const scores = presentMarks.map(m => m.obtainedMarks || 0);

    const overallAverage = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Pass rate
    const passingMarks = 33;
    const passedCount = presentMarks.filter(m => (m.obtainedMarks || 0) >= passingMarks).length;
    const passPercentage = presentMarks.length > 0 ? (passedCount / presentMarks.length) * 100 : 100;

    const totalAttendanceMarks = marks.length;
    const presentCount = marks.filter(m => m.attendanceStatus === 'present').length;
    const averageAttendance = totalAttendanceMarks > 0 ? (presentCount / totalAttendanceMarks) * 100 : 100;

    // Best & worst Performing Student
    const topPerformingStudent = studentAverages.length > 0 ? `${studentAverages[0].name} (${studentAverages[0].average}%)` : 'N/A';
    const sortedByImprovement = [...studentAverages].sort((a, b) => b.improvementDelta - a.improvementDelta);
    const mostImprovedStudent = sortedByImprovement.length > 0 && sortedByImprovement[0].improvementDelta > 0 
      ? `${sortedByImprovement[0].name} (+${sortedByImprovement[0].improvementDelta}%)` 
      : 'N/A';

    // Risk levels
    const studentsAtRiskList = studentAverages.filter(s => s.average < 45 || s.attendance < 75).map(s => {
      let reason = 'Low Performance';
      if (s.attendance < 75 && s.average < 45) reason = 'Critical (Low Attendance + Performance)';
      else if (s.attendance < 75) reason = 'Low Attendance';
      return {
        name: s.name,
        rollNumber: s.rollNumber,
        average: s.average,
        attendance: s.attendance,
        riskLevel: s.average < 35 ? 'High' : 'Medium',
        trend: s.improvementDelta >= 0 ? 'Improving' : 'Declining',
        reason
      };
    });
    const studentsAtRisk = studentsAtRiskList.length;

    // Averages per subject
    const subjectMap = {};
    presentMarks.forEach(m => {
      const subName = m.subjectId?.name || 'Unknown';
      if (!subjectMap[subName]) subjectMap[subName] = { total: 0, count: 0 };
      subjectMap[subName].total += m.obtainedMarks || 0;
      subjectMap[subName].count += 1;
    });

    const subjectAverageComparison = Object.entries(subjectMap).map(([name, data]) => ({
      subject: name,
      average: Number((data.total / data.count).toFixed(1))
    })).sort((a, b) => b.average - a.average);

    const bestPerformingSubject = subjectAverageComparison.length > 0 ? `${subjectAverageComparison[0].subject} (${subjectAverageComparison[0].average}%)` : 'N/A';
    const mostDifficultSubject = subjectAverageComparison.length > 0 ? `${subjectAverageComparison[subjectAverageComparison.length - 1].subject} (${subjectAverageComparison[subjectAverageComparison.length - 1].average}%)` : 'N/A';

    // Grade counts
    const gradeMap = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0, 'D': 0, 'E': 0 };
    presentMarks.forEach(m => {
      if (m.grade && gradeMap[m.grade] !== undefined) {
        gradeMap[m.grade]++;
      }
    });
    const gradeDistribution = Object.entries(gradeMap).map(([grade, count]) => ({ grade, count }));

    // Recent assessments list
    const recentAssessments = configs.slice(-5).map(c => {
      const cMarks = presentMarks.filter(m => m.assessmentConfigurationId.toString() === c._id.toString());
      const cScores = cMarks.map(m => m.obtainedMarks || 0);
      const avg = cScores.length > 0 ? cScores.reduce((a, b) => a + b, 0) / cScores.length : 0;
      const passed = cMarks.filter(m => (m.obtainedMarks || 0) >= 33).length;
      const passRate = cMarks.length > 0 ? (passed / cMarks.length) * 100 : 100;
      return {
        assessment: c.assessmentName,
        status: c.status,
        average: Number(avg.toFixed(1)),
        passPercentage: Number(passRate.toFixed(1)),
        publishedDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A'
      };
    });

    // Performance Timeline Line chart data
    const performanceTimeline = configs.map(c => {
      const cMarks = presentMarks.filter(m => m.assessmentConfigurationId.toString() === c._id.toString());
      const cScores = cMarks.map(m => m.obtainedMarks || 0);
      const avg = cScores.length > 0 ? cScores.reduce((a, b) => a + b, 0) / cScores.length : 0;
      return {
        assessmentName: c.assessmentName,
        average: Number(avg.toFixed(1))
      };
    });

    return {
      kpis: {
        totalStudents,
        overallClassAverage: Number(overallAverage.toFixed(1)),
        passPercentage: Number(passPercentage.toFixed(1)),
        attendancePercentage: Number(averageAttendance.toFixed(1)),
        totalAssessmentsConducted: totalAssessments,
        highestScore,
        lowestScore,
        topPerformingStudent,
        mostImprovedStudent,
        studentsAtAcademicRisk: studentsAtRisk,
        mostDifficultSubject,
        bestPerformingSubject
      },
      charts: {
        subjectAverageComparison,
        gradeDistribution,
        performanceTimeline
      },
      studentsAtRiskList,
      topPerformers: studentAverages.slice(0, 5).map((s, idx) => ({
        rank: idx + 1,
        student: s.name,
        average: s.average,
        improvementDelta: s.improvementDelta
      })),
      recentAssessments
    };
  }

  // 2. STUDENT ANALYTICS
  async getStudentAnalytics(schoolId, academicYearId, classId, studentId) {
    const student = await Student.findById(studentId);
    if (!student) throw new Error('Student not found');

    const StudentEnrollment = mongoose.model('StudentEnrollment');
    const enrollment = await StudentEnrollment.findOne({ studentId, schoolId }).populate('dynamicFields.fieldId');
    const nameField = enrollment?.dynamicFields?.find(f => f.fieldId?.key === 'fullname' || f.fieldId?.key === 'firstname');
    const studentName = nameField ? nameField.value : (student.studentCode || 'Unknown Student');

    const configs = await AssessmentConfiguration.find({ academicYearId, classId, schoolId }).sort({ displayOrder: 1 });
    const configIds = configs.map(c => c._id);

    const marks = await StudentAssessmentMark.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      assessmentConfigurationId: { $in: configIds },
      schoolId
    }).populate('subjectId assessmentConfigurationId');

    // Chronological Timeline Multi-line data builder
    const timeline = configs.map(c => {
      const entry = { assessmentName: c.assessmentName };
      const subMarks = marks.filter(m => m.assessmentConfigurationId?._id.toString() === c._id.toString());
      subMarks.forEach(sm => {
        if (sm.attendanceStatus !== 'absent') {
          entry[sm.subjectId?.name || 'Unknown'] = sm.obtainedMarks || 0;
        }
      });
      return entry;
    });

    // Subject comparisons
    const subTotals = {};
    marks.forEach(m => {
      const subName = m.subjectId?.name || 'Unknown';
      if (!subTotals[subName]) subTotals[subName] = { total: 0, count: 0 };
      subTotals[subName].total += m.obtainedMarks || 0;
      subTotals[subName].count += 1;
    });

    const subjectAverages = Object.entries(subTotals).map(([name, data]) => ({
      subject: name,
      average: Number((data.total / data.count).toFixed(1))
    }));

    // Strengths & Weaknesses
    let highestSubject = 'N/A';
    let weakestSubject = 'N/A';
    let bestScore = -1;
    let worstScore = 9999;

    subjectAverages.forEach(sa => {
      if (sa.average > bestScore) {
        bestScore = sa.average;
        highestSubject = sa.subject;
      }
      if (sa.average < worstScore) {
        worstScore = sa.average;
        weakestSubject = sa.subject;
      }
    });

    // Rank Calculation inside the class
    const allClassStudents = await Student.find({ schoolId });
    const enrolledStudents = allClassStudents.filter(st => {
      return st.enrollments?.some(e => e.class?._id?.toString() === classId || e.class?.toString() === classId);
    });

    const studentScoreMap = [];
    for (const st of enrolledStudents) {
      const stMarks = await StudentAssessmentMark.find({
        studentId: st._id,
        assessmentConfigurationId: { $in: configIds },
        schoolId
      });
      const validMarks = stMarks.filter(m => m.attendanceStatus !== 'absent' && m.obtainedMarks !== undefined);
      const total = validMarks.reduce((a, b) => a + (b.obtainedMarks || 0), 0);
      const avg = validMarks.length > 0 ? (total / validMarks.length) : 0;
      studentScoreMap.push({ id: st._id.toString(), avg });
    }

    studentScoreMap.sort((a, b) => b.avg - a.avg);
    const rank = studentScoreMap.findIndex(item => item.id === studentId.toString()) + 1;

    // Overall metrics
    const studentPresentMarks = marks.filter(m => m.attendanceStatus !== 'absent');
    const studentTotal = studentPresentMarks.reduce((a, b) => a + (b.obtainedMarks || 0), 0);
    const overallPercentage = studentPresentMarks.length > 0 ? (studentTotal / (studentPresentMarks.length * 100)) * 100 : 0;

    // Mock delta improvement
    const midPoint = Math.floor(studentPresentMarks.length / 2);
    const firstHalf = studentPresentMarks.slice(0, midPoint);
    const secondHalf = studentPresentMarks.slice(midPoint);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + (b.obtainedMarks || 0), 0) / firstHalf.length : overallPercentage;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + (b.obtainedMarks || 0), 0) / secondHalf.length : overallPercentage;
    const improvementDelta = Number((secondAvg - firstAvg).toFixed(1));

    // Subject table breakdown
    const subjectTable = subjectAverages.map(sa => {
      const subMarks = marks.filter(m => m.subjectId?.name === sa.subject && m.obtainedMarks !== undefined);
      const highest = subMarks.length > 0 ? Math.max(...subMarks.map(m => m.obtainedMarks)) : 0;
      const lowest = subMarks.length > 0 ? Math.min(...subMarks.map(m => m.obtainedMarks)) : 0;
      const grade = this.calculateGrade(sa.average);
      return {
        subject: sa.subject,
        average: sa.average,
        highest,
        lowest,
        grade
      };
    });

    // Assessment history
    const assessmentHistory = configs.map(c => {
      const cMarks = studentPresentMarks.filter(m => m.assessmentConfigurationId?._id.toString() === c._id.toString());
      const totalObtained = cMarks.reduce((a, b) => a + (b.obtainedMarks || 0), 0);
      const pct = cMarks.length > 0 ? (totalObtained / (cMarks.length * 100)) * 100 : 0;
      return {
        assessment: c.assessmentName,
        percentage: Number(pct.toFixed(1)),
        grade: this.calculateGrade(pct),
        status: c.status
      };
    });

    // Chapter performance list compiled from configuration chapters covered
    const chapterPerformance = [];
    configs.forEach(c => {
      c.subjects?.forEach(sub => {
        const subName = sub.subjectId?.name || 'Subject';
        sub.selectedChapterIds?.forEach(chapId => {
          // Find if student has score in this configuration subject
          const sm = marks.find(m => m.assessmentConfigurationId?._id.toString() === c._id.toString() && m.subjectId?._id?.toString() === sub.subjectId?._id?.toString());
          if (sm) {
            chapterPerformance.push({
              subject: subName,
              chapter: `Chapter Ref #${String(chapId).slice(-4)}`,
              average: sm.obtainedMarks || 0,
              correctPercent: sm.obtainedMarks || 0,
              weakness: (sm.obtainedMarks || 0) < 50 ? 'Needs Focus' : 'Strong'
            });
          }
        });
      });
    });

    const totalAttendance = marks.length;
    const presentCount = marks.filter(m => m.attendanceStatus === 'present').length;
    const attendancePercentage = totalAttendance > 0 ? Number(((presentCount / totalAttendance) * 100).toFixed(1)) : 100;

    return {
      summary: {
        name: studentName,
        rollNumber: student.studentCode,
        admissionNumber: student.studentCode,
        classId,
        academicYearId,
        overallPercentage: Number(overallPercentage.toFixed(1)),
        overallGrade: this.calculateGrade(overallPercentage),
        rank,
        attendancePercentage,
        passStatus: overallPercentage >= 33 ? 'Passed' : 'Needs Improvement'
      },
      timeline,
      subjectAverages,
      subjectTable,
      assessmentHistory,
      chapterPerformance: chapterPerformance.slice(0, 8),
      insights: {
        highestSubject,
        weakestSubject,
        improvementDelta,
        assessmentsAppeared: presentCount,
        assessmentsMissed: marks.filter(m => m.attendanceStatus === 'absent').length,
        overallTrend: overallPercentage >= 75 ? 'Excellent Performance' : overallPercentage >= 50 ? 'Steady Progress' : 'Requires Focus'
      }
    };
  }

  // 3. SUBJECT ANALYTICS
  async getSubjectAnalytics(schoolId, academicYearId, classId, subjectId) {
    const configs = await AssessmentConfiguration.find({ academicYearId, classId, schoolId });
    const configIds = configs.map(c => c._id);

    const studentNameMap = await this.getStudentNameMap(schoolId);

    const marks = await StudentAssessmentMark.find({
      assessmentConfigurationId: { $in: configIds },
      subjectId: new mongoose.Types.ObjectId(subjectId),
      schoolId
    }).populate('studentId');

    const presentMarks = marks.filter(m => m.attendanceStatus !== 'absent' && m.obtainedMarks !== undefined);
    const scores = presentMarks.map(m => m.obtainedMarks || 0);

    const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const median = this.calculateMedian(scores);
    const stdDev = this.calculateStdDev(scores, average);

    const passed = presentMarks.filter(m => (m.obtainedMarks || 0) >= 33).length;
    const passPercentage = presentMarks.length > 0 ? (passed / presentMarks.length) * 100 : 100;
    const failPercentage = 100 - passPercentage;

    // Difficulty score based on average mark
    const difficultyIndex = average >= 75 ? 'Easy' : average >= 50 ? 'Medium' : 'Hard';

    // Top & Weak performers lists
    const studentPerformanceList = presentMarks.map(m => {
      const sidStr = m.studentId?._id?.toString() || m.studentId?.toString();
      return {
        name: studentNameMap[sidStr] || m.studentId?.studentCode || 'Student',
        obtainedMarks: m.obtainedMarks || 0
      };
    }).sort((a, b) => b.obtainedMarks - a.obtainedMarks);

    const topPerformers = studentPerformanceList.slice(0, 5);
    const weakPerformers = studentPerformanceList.slice(-5).reverse();

    // Grade Distribution
    const gradeMap = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0, 'D': 0, 'E': 0 };
    presentMarks.forEach(m => {
      if (m.grade && gradeMap[m.grade] !== undefined) {
        gradeMap[m.grade]++;
      }
    });

    // Assessment trend comparison
    const assessmentTrend = configs.map(c => {
      const cMarks = presentMarks.filter(m => m.assessmentConfigurationId.toString() === c._id.toString());
      const cScores = cMarks.map(m => m.obtainedMarks || 0);
      const cAvg = cScores.length > 0 ? (cScores.reduce((a, b) => a + b, 0) / cScores.length) : 0;
      return {
        assessmentName: c.assessmentName,
        average: Number(cAvg.toFixed(1))
      };
    });

    // Chapter coverage metrics inside subject
    const chapterPerformanceList = [];
    configs.forEach(c => {
      const subSetup = c.subjects?.find(s => s.subjectId?.toString() === subjectId.toString());
      if (subSetup) {
        subSetup.selectedChapterIds?.forEach(chapId => {
          const cMarks = presentMarks.filter(m => m.assessmentConfigurationId.toString() === c._id.toString());
          const cScores = cMarks.map(m => m.obtainedMarks || 0);
          const cAvg = cScores.length > 0 ? cScores.reduce((a, b) => a + b, 0) / cScores.length : 0;
          chapterPerformanceList.push({
            chapter: `Chapter #${String(chapId).slice(-4)}`,
            average: Number(cAvg.toFixed(1)),
            passPercentage: passPercentage.toFixed(1),
            studentsCovered: presentMarks.length
          });
        });
      }
    });

    return {
      stats: {
        average: Number(average.toFixed(1)),
        highest,
        lowest,
        median: Number(median.toFixed(1)),
        stdDev: Number(stdDev.toFixed(1)),
        passPercentage: Number(passPercentage.toFixed(1)),
        failPercentage: Number(failPercentage.toFixed(1)),
        difficultyIndex
      },
      topPerformers,
      weakPerformers,
      gradeDistribution: Object.entries(gradeMap).map(([grade, count]) => ({ grade, count })),
      assessmentTrend,
      chapterPerformanceList
    };
  }

  // 4. CLASS ANALYTICS
  async getClassAnalytics(schoolId, academicYearId, classId) {
    const configs = await AssessmentConfiguration.find({ academicYearId, classId, schoolId });
    const configIds = configs.map(c => c._id);

    const studentNameMap = await this.getStudentNameMap(schoolId);

    const students = await Student.find({ schoolId });
    const enrolledStudents = students.filter(st => {
      return st.enrollments?.some(e => e.class?._id?.toString() === classId || e.class?.toString() === classId);
    });

    const marks = await StudentAssessmentMark.find({
      assessmentConfigurationId: { $in: configIds },
      schoolId
    }).populate('subjectId');

    // Aggregate averages per student
    const studentRankings = enrolledStudents.map(st => {
      const stMarks = marks.filter(m => m.studentId.toString() === st._id.toString() && m.attendanceStatus !== 'absent');
      const total = stMarks.reduce((a, b) => a + (b.obtainedMarks || 0), 0);
      const avg = stMarks.length > 0 ? (total / stMarks.length) : 0;

      const totalEx = marks.filter(m => m.studentId.toString() === st._id.toString()).length;
      const presEx = marks.filter(m => m.studentId.toString() === st._id.toString() && m.attendanceStatus === 'present').length;
      const attendance = totalEx > 0 ? Number(((presEx / totalEx) * 100).toFixed(1)) : 100;

      return {
        id: st._id.toString(),
        name: studentNameMap[st._id.toString()] || st.studentCode || 'Student',
        rollNumber: st.studentCode,
        average: Number(avg.toFixed(1)),
        attendance,
        passStatus: avg >= 33 ? 'Passed' : 'Needs Focus'
      };
    }).sort((a, b) => b.average - a.average);

    // Subject wise averages
    const subjectTotals = {};
    marks.filter(m => m.attendanceStatus !== 'absent').forEach(m => {
      const subName = m.subjectId?.name || 'Unknown';
      if (!subjectTotals[subName]) subjectTotals[subName] = { total: 0, count: 0 };
      subjectTotals[subName].total += m.obtainedMarks || 0;
      subjectTotals[subName].count += 1;
    });

    const subjectAverages = Object.entries(subjectTotals).map(([subject, data]) => ({
      subject,
      average: Number((data.total / data.count).toFixed(1))
    }));

    // Perform student categorization (Top 10%, Middle, Bottom)
    const categorised = studentRankings.map((r, idx) => {
      let category = 'Middle Tier';
      if (idx < studentRankings.length * 0.2) category = 'Top Performers';
      else if (idx > studentRankings.length * 0.8) category = 'Academic Support Required';
      return { ...r, category };
    });

    return {
      studentRankings: categorised,
      subjectAverages,
      topPerformers: categorised.slice(0, 5),
      weakPerformers: categorised.slice(-5).reverse()
    };
  }

  // 5. ASSESSMENT ANALYTICS
  async getAssessmentAnalytics(schoolId, academicYearId, classId, assessmentConfigurationId) {
    if (!assessmentConfigurationId || !mongoose.Types.ObjectId.isValid(assessmentConfigurationId)) {
      return { stats: { average: 0, highest: 0, lowest: 0, passPercentage: 100 }, subjectComparison: [] };
    }

    const config = await AssessmentConfiguration.findById(assessmentConfigurationId);
    if (!config) throw new Error('Assessment configuration not found');

    const studentNameMap = await this.getStudentNameMap(schoolId);

    const marks = await StudentAssessmentMark.find({
      assessmentConfigurationId: new mongoose.Types.ObjectId(assessmentConfigurationId),
      schoolId
    }).populate('subjectId');

    const presentMarks = marks.filter(m => m.attendanceStatus !== 'absent' && m.obtainedMarks !== undefined);
    const scores = presentMarks.map(m => m.obtainedMarks || 0);

    const average = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const median = this.calculateMedian(scores);
    const variance = scores.length > 0 ? scores.reduce((sq, val) => sq + Math.pow(val - average, 2), 0) / scores.length : 0;

    const passed = presentMarks.filter(m => (m.obtainedMarks || 0) >= 33).length;
    const passPercentage = presentMarks.length > 0 ? (passed / presentMarks.length) * 100 : 100;

    // Subject-wise breakdown for this assessment
    const subjectBreakdown = {};
    presentMarks.forEach(m => {
      const subName = m.subjectId?.name || 'Unknown';
      if (!subjectBreakdown[subName]) subjectBreakdown[subName] = { total: 0, count: 0 };
      subjectBreakdown[subName].total += m.obtainedMarks || 0;
      subjectBreakdown[subName].count += 1;
    });

    const subjectComparison = Object.entries(subjectBreakdown).map(([subject, data]) => ({
      subject,
      average: Number((data.total / data.count).toFixed(1))
    }));

    // Student rankings inside this assessment
    const studentStandings = presentMarks.map(m => {
      const sid = m.studentId?.toString();
      return {
        name: studentNameMap[sid] || 'Student',
        obtainedMarks: m.obtainedMarks || 0
      };
    }).sort((a, b) => b.obtainedMarks - a.obtainedMarks);

    // Chapter Coverage mappings
    const chapterCoverage = [];
    config.subjects?.forEach(s => {
      s.selectedChapterIds?.forEach(chapId => {
        chapterCoverage.push({
          subject: s.subjectId?.name || 'Subject',
          chapter: `Chapter #${String(chapId).slice(-4)}`,
          average: average.toFixed(1)
        });
      });
    });

    return {
      stats: {
        average: Number(average.toFixed(1)),
        highest,
        lowest,
        passPercentage: Number(passPercentage.toFixed(1)),
        difficultyScore: average >= 75 ? 'Low' : average >= 50 ? 'Medium' : 'High',
        median: Number(median.toFixed(1)),
        variance: Number(variance.toFixed(1)),
        totalAppeared: presentMarks.length,
        totalAbsent: marks.filter(m => m.attendanceStatus === 'absent').length
      },
      subjectComparison,
      studentStandings,
      chapterCoverage
    };
  }

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
}

module.exports = new AssessmentAnalyticsService();
