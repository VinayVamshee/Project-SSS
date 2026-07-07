const AcademicYear = require('../../domain/academics/models/AcademicYear');
const Classes = require('../../domain/academics/models/Classes');
const Subject = require('../../domain/academics/models/Subject');
const ClassSubjectLink = require('../../domain/academics/models/ClassSubjectLink');

class AcademicService {
  async getAcademicYears() {
    return AcademicYear.find({});
  }

  async getClasses() {
    return Classes.find({});
  }

  async getSubjects() {
    return Subject.find({});
  }

  async getCurriculums() {
    return ClassSubjectLink.find({}).populate('classId').populate('subjectIds');
  }
}

module.exports = new AcademicService();
