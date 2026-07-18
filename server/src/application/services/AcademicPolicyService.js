const mongoose = require('mongoose');

class AcademicPolicyService {
  // Get active default policy for tenant & year
  async getActivePolicy(schoolId, academicYearId) {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    let policy = await AcademicPolicy.findOne({
      schoolId,
      academicYearId,
      status: 'active',
      isDefault: true
    });
    
    // Fallback: if no active default exists, return a default mock configuration matching the legacy hardcoded logic
    if (!policy) {
      policy = this.getFallbackPolicy(schoolId, academicYearId);
    }
    return policy;
  }

  // Calculate grade based on score and policy range rules
  calculateGrade(score, gradingPolicy) {
    if (!gradingPolicy || !Array.isArray(gradingPolicy.gradeRanges) || gradingPolicy.gradeRanges.length === 0) {
      // Legacy Fallback
      if (score >= 91) return 'A1';
      if (score >= 81) return 'A2';
      if (score >= 71) return 'B1';
      if (score >= 61) return 'B2';
      if (score >= 51) return 'C1';
      if (score >= 41) return 'C2';
      if (score >= 33) return 'D';
      return 'E';
    }

    const match = gradingPolicy.gradeRanges.find(r => score >= r.minScore && score <= r.maxScore);
    return match ? match.grade : 'E';
  }

  // Calculate student standing (Excellent, Good, Critical) based on average
  calculateStanding(average, standingRules) {
    if (!standingRules || !Array.isArray(standingRules) || standingRules.length === 0) {
      // Legacy Fallback
      if (average >= 75) return { standing: 'Excellent', displayColor: '#10b981', icon: 'fa-star' };
      if (average >= 60) return { standing: 'Good', displayColor: '#3b82f6', icon: 'fa-thumbs-up' };
      if (average >= 45) return { standing: 'Average', displayColor: '#f59e0b', icon: 'fa-circle' };
      return { standing: 'Needs Improvement', displayColor: '#ef4444', icon: 'fa-triangle-exclamation' };
    }

    const match = standingRules.find(r => average >= r.minAverage && average <= r.maxAverage);
    return match ? {
      standing: match.standing,
      displayColor: match.displayColor,
      icon: match.icon,
      remarks: match.remarks
    } : { standing: 'Needs Improvement', displayColor: '#ef4444', icon: 'fa-triangle-exclamation' };
  }

  // Determine at-risk status based on average, attendance, and failed subjects
  calculateRiskStatus(studentAverage, attendanceRate, failedSubjectsCount, consecutiveAbsences, riskPolicy) {
    if (!riskPolicy || !riskPolicy.enabled || !Array.isArray(riskPolicy.levels) || riskPolicy.levels.length === 0) {
      // Legacy Fallback
      if (studentAverage < 45 || attendanceRate < 75) {
        let reason = 'Low Performance';
        if (attendanceRate < 75 && studentAverage < 45) reason = 'Critical (Low Attendance + Performance)';
        else if (attendanceRate < 75) reason = 'Low Attendance';
        return {
          isAtRisk: true,
          riskLevel: studentAverage < 35 ? 'High' : 'Medium',
          reason
        };
      }
      return { isAtRisk: false, riskLevel: 'Low', reason: 'Normal' };
    }

    // Evaluate risk levels: check High Risk first, then Medium, then Low
    const sortedLevels = [...riskPolicy.levels].sort((a, b) => {
      // High risk thresholds generally trigger more easily
      const levelMap = { 'high': 3, 'medium': 2, 'low': 1 };
      return (levelMap[b.level.toLowerCase()] || 0) - (levelMap[a.level.toLowerCase()] || 0);
    });

    for (const rule of sortedLevels) {
      let isMatch = false;
      let reasonParts = [];

      if (rule.minAverage && studentAverage < rule.minAverage) {
        isMatch = true;
        reasonParts.push('Low Performance');
      }
      if (rule.minAttendance && attendanceRate < rule.minAttendance) {
        isMatch = true;
        reasonParts.push('Low Attendance');
      }
      if (rule.maxFailedSubjects && failedSubjectsCount > rule.maxFailedSubjects) {
        isMatch = true;
        reasonParts.push('Failed Subjects');
      }
      if (rule.maxConsecutiveAbsentDays && consecutiveAbsences > rule.maxConsecutiveAbsentDays) {
        isMatch = true;
        reasonParts.push('Consecutive Absences');
      }

      if (isMatch) {
        return {
          isAtRisk: true,
          riskLevel: rule.level,
          reason: reasonParts.join(' + ')
        };
      }
    }

    return { isAtRisk: false, riskLevel: 'Low', reason: 'Normal' };
  }

  // Verify promotion status
  checkPromotionStatus(studentAverage, attendanceRate, failedSubjectsCount, promotionPolicy) {
    const policy = promotionPolicy || { minAttendance: 75, minAverage: 35, maxFailedSubjects: 1 };
    
    const meetsAttendance = attendanceRate >= policy.minAttendance;
    const meetsAverage = studentAverage >= policy.minAverage;
    const meetsFailsLimit = failedSubjectsCount <= (policy.maxFailedSubjects || 0);

    const promoted = meetsAttendance && meetsAverage && meetsFailsLimit;
    
    let decision = 'Promoted';
    if (!promoted) {
      if (!meetsAttendance) decision = 'Detained (Low Attendance)';
      else if (!meetsAverage) decision = 'Detained (Low Average Marks)';
      else decision = 'Detained (Failed too many subjects)';
    }

    return {
      promoted,
      decision,
      details: { meetsAttendance, meetsAverage, meetsFailsLimit }
    };
  }

  // Returns fallback configuration mimicking legacy rules
  getFallbackPolicy(schoolId, academicYearId) {
    return {
      schoolId,
      academicYearId,
      name: 'Legacy Default Policy',
      description: 'Legacy academic defaults policy fallback',
      status: 'active',
      isDefault: true,
      effectiveFrom: new Date(),
      effectiveUntil: new Date(),
      grading: {
        strategy: 'percentage',
        passPercentage: 33,
        gradeRanges: [
          { grade: 'A1', minScore: 91, maxScore: 100, gradePoint: 10, remarks: 'Outstanding', displayColor: '#10b981' },
          { grade: 'A2', minScore: 81, maxScore: 90, gradePoint: 9, remarks: 'Excellent', displayColor: '#3b82f6' },
          { grade: 'B1', minScore: 71, maxScore: 80, gradePoint: 8, remarks: 'Very Good', displayColor: '#60a5fa' },
          { grade: 'B2', minScore: 61, maxScore: 70, gradePoint: 7, remarks: 'Good', displayColor: '#34d399' },
          { grade: 'C1', minScore: 51, maxScore: 60, gradePoint: 6, remarks: 'Above Average', displayColor: '#fbbf24' },
          { grade: 'C2', minScore: 41, maxScore: 50, gradePoint: 5, remarks: 'Average', displayColor: '#f59e0b' },
          { grade: 'D', minScore: 33, maxScore: 40, gradePoint: 4, remarks: 'Fair Pass', displayColor: '#f97316' },
          { grade: 'E', minScore: 0, maxScore: 32, gradePoint: 0, remarks: 'Needs Improvement', displayColor: '#ef4444' }
        ]
      },
      ranking: {
        enabled: true,
        strategy: 'highest_average',
        tieBreaker: 'attendance',
        style: 'competition'
      },
      standing: [
        { standing: 'Excellent', minAverage: 75, maxAverage: 100, remarks: 'Outstanding Standing', displayColor: '#10b981', icon: 'fa-star' },
        { standing: 'Good', minAverage: 60, maxAverage: 74.9, remarks: 'Good Standing', displayColor: '#3b82f6', icon: 'fa-thumbs-up' },
        { standing: 'Average', minAverage: 45, maxAverage: 59.9, remarks: 'Average Standing', displayColor: '#fbbf24', icon: 'fa-circle' },
        { standing: 'Needs Improvement', minAverage: 0, maxAverage: 44.9, remarks: 'Assistance Needed', displayColor: '#ef4444', icon: 'fa-triangle-exclamation' }
      ],
      risk: {
        enabled: true,
        levels: [
          { level: 'High', minAttendance: 75, minAverage: 35, maxFailedSubjects: 2, maxConsecutiveAbsentDays: 5, feeDueThreshold: 0 },
          { level: 'Medium', minAttendance: 85, minAverage: 45, maxFailedSubjects: 1, maxConsecutiveAbsentDays: 3, feeDueThreshold: 0 }
        ]
      },
      promotion: {
        minAttendance: 75,
        minAverage: 35,
        mandatorySubjects: [],
        maxFailedSubjects: 1,
        graceMarksLimit: 5,
        condonationLimit: 5
      },
      gpa: {
        enabled: false,
        scale: 10,
        passingGradePoints: 4
      },
      awards: {
        mostImprovedMinDelta: 5,
        perfectAttendancePercent: 100
      },
      reportCard: {
        showRank: true,
        showGPA: false,
        showGrade: true,
        showRemarks: true,
        showGraphs: true
      },
      transcript: {
        showCredits: false,
        showCGPA: false,
        classificationSystem: 'GPA Scale'
      }
    };
  }
}

module.exports = new AcademicPolicyService();
