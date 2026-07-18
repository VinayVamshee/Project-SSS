const mongoose = require('mongoose');

class AcademicPolicyEngine {
  // Get active default policy for tenant & year
  async getActivePolicy(schoolId, academicYearId) {
    const AcademicPolicy = mongoose.model('AcademicPolicy');
    let policy = await AcademicPolicy.findOne({
      schoolId,
      academicYearId,
      status: 'active',
      isDefault: true
    });
    
    if (!policy) {
      policy = this.getFallbackPolicy(schoolId, academicYearId);
    }
    return policy;
  }

  // Calculate grade based on score and policy range rules
  getGrade(score, gradingPolicy) {
    if (!gradingPolicy || !Array.isArray(gradingPolicy.gradeRanges) || gradingPolicy.gradeRanges.length === 0) {
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

  // Verify passing status
  isPassed(score, gradingPolicy) {
    const passPct = gradingPolicy?.passPercentage !== undefined ? gradingPolicy.passPercentage : 33;
    return score >= passPct;
  }

  // Calculate student standing (Excellent, Good, Average, etc.)
  getStanding(average, standingPolicy) {
    const rules = standingPolicy || [];
    if (rules.length === 0) {
      if (average >= 75) return { standing: 'Excellent', displayColor: '#10b981', icon: 'fa-star' };
      if (average >= 60) return { standing: 'Good', displayColor: '#3b82f6', icon: 'fa-thumbs-up' };
      if (average >= 45) return { standing: 'Average', displayColor: '#f59e0b', icon: 'fa-circle' };
      return { standing: 'Needs Improvement', displayColor: '#ef4444', icon: 'fa-triangle-exclamation' };
    }

    const match = rules.find(r => average >= r.minAverage && average <= r.maxAverage);
    return match ? {
      standing: match.standing,
      displayColor: match.displayColor,
      icon: match.icon,
      remarks: match.remarks
    } : { standing: 'Needs Improvement', displayColor: '#ef4444', icon: 'fa-triangle-exclamation' };
  }

  // Determine at-risk status based on average, attendance, and failed subjects
  getRisk(studentAverage, attendanceRate, failedSubjectsCount, consecutiveAbsences, riskPolicy) {
    if (!riskPolicy || !riskPolicy.enabled || !Array.isArray(riskPolicy.levels) || riskPolicy.levels.length === 0) {
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

    const sortedLevels = [...riskPolicy.levels].sort((a, b) => {
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

  // Calculate ranks sorting strategy
  calculateRank(students, rankingPolicy) {
    const isEnabled = rankingPolicy?.enabled !== false;
    if (!isEnabled) {
      return students.map((s, idx) => ({ ...s, rank: idx + 1 }));
    }

    const sorted = [...students].sort((a, b) => {
      // Sorting based on average or custom strategy
      const diff = (b.average || 0) - (a.average || 0);
      if (diff !== 0) return diff;

      // Apply Tie-Breakers
      const tb = rankingPolicy?.tieBreaker || 'attendance';
      if (tb === 'attendance') {
        return (b.attendance || 0) - (a.attendance || 0);
      }
      if (tb === 'age') {
        return (a.age || 0) - (b.age || 0); // Younger first
      }
      if (tb === 'alphabetical') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    // Apply ranking styles (dense, competition, ordinal)
    const style = rankingPolicy?.style || 'competition';
    let currentRank = 1;
    let skipCount = 0;

    return sorted.map((student, idx) => {
      if (idx > 0) {
        const prev = sorted[idx - 1];
        if (student.average === prev.average) {
          if (style === 'ordinal') {
            currentRank = idx + 1;
          } else if (style === 'competition') {
            skipCount++;
          }
          // dense does not change currentRank or skipCount
        } else {
          if (style === 'competition') {
            currentRank += skipCount + 1;
            skipCount = 0;
          } else {
            currentRank++;
          }
        }
      }
      return {
        ...student,
        rank: currentRank
      };
    });
  }

  // Verify promotion status
  isPromoted(studentAverage, attendanceRate, failedSubjectsCount, promotionPolicy) {
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

  // Determine topper performing student
  calculateTopper(students, rankingPolicy) {
    const ranked = this.calculateRank(students, rankingPolicy);
    return ranked.length > 0 ? ranked[0] : null;
  }

  // Determine most improved student
  calculateMostImproved(students, awardsPolicy) {
    const minDelta = awardsPolicy?.mostImprovedMinDelta !== undefined ? awardsPolicy.mostImprovedMinDelta : 5;
    const sorted = [...students]
      .filter(s => s.improvementDelta !== undefined)
      .sort((a, b) => b.improvementDelta - a.improvementDelta);
    return sorted.length > 0 && sorted[0].improvementDelta >= minDelta ? sorted[0] : null;
  }

  // Determine subject difficulty
  calculateDifficulty(average) {
    if (average >= 75) return 'Easy';
    if (average >= 50) return 'Medium';
    return 'Hard';
  }

  // Get fallback default settings
  getFallbackPolicy(schoolId, academicYearId) {
    return {
      schoolId,
      academicYearId,
      name: 'Fallback Policy',
      status: 'active',
      isDefault: true,
      grading: { strategy: 'percentage', passPercentage: 33, gradeRanges: [] },
      ranking: { enabled: true, strategy: 'highest_average', tieBreaker: 'attendance', style: 'competition' },
      standing: [],
      risk: { enabled: true, levels: [] },
      promotion: { minAttendance: 75, minAverage: 35, maxFailedSubjects: 1 },
      gpa: { enabled: false, scale: 10, passingGradePoints: 4 },
      awards: { mostImprovedMinDelta: 5, perfectAttendancePercent: 100 },
      reportCard: { showRank: true, showGPA: false, showGrade: true, showRemarks: true, showGraphs: true },
      transcript: { showCredits: false, showCGPA: false, classificationSystem: 'GPA Scale' }
    };
  }
}

module.exports = new AcademicPolicyEngine();
