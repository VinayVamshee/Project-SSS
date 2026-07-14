require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/sss_v2';

// Import Schemas
require('../domain/shared/models/School.js');
require('../domain/academics/models/AcademicYear.js');
require('../domain/academics/models/Classes.js');
require('../domain/academics/models/Subject.js');
require('../domain/academics/models/Chapter.js');
require('../domain/academics/models/ClassSubjectLink.js');
require('../domain/academics/models/AssessmentConfiguration.js');
require('../domain/metadata/models/FieldRegistry.js');
require('../domain/student/models/Student.js');
require('../domain/student/models/StudentEnrollment.js');
require('../domain/academics/models/StudentAssessmentMark.js');

async function seed() {
  console.log(`Connecting to database at ${uri}...`);
  await mongoose.connect(uri);

  const School = mongoose.model('School');
  const AcademicYear = mongoose.model('AcademicYear');
  const Class = mongoose.model('Class');
  const Subject = mongoose.model('Subject');
  const Chapter = mongoose.model('Chapter');
  const ClassSubjectLink = mongoose.model('ClassSubjectLink');
  const AssessmentConfiguration = mongoose.model('AssessmentConfiguration');
  const FieldRegistry = mongoose.model('FieldRegistry');
  const Student = mongoose.model('Student');
  const StudentEnrollment = mongoose.model('StudentEnrollment');
  const StudentAssessmentMark = mongoose.model('StudentAssessmentMark');

  // 1. Get or create school
  let school = await School.findOne();
  if (!school) {
    school = new School({ name: 'Scholastic High School' });
    await school.save();
  }
  console.log(`School: ${school.name} (${school._id})`);

  // 2. Get or create active Year
  let year = await AcademicYear.findOne({ active: true, schoolId: school._id });
  if (!year) {
    year = await AcademicYear.findOne({ schoolId: school._id });
  }
  if (!year) {
    year = new AcademicYear({ name: '2026-27', active: true, schoolId: school._id });
    await year.save();
  }
  console.log(`Academic Year: ${year.name} (${year._id})`);

  // Clean up duplicate KG I class
  await Class.deleteOne({ class: 'KG I', schoolId: school._id });

  // 3. Find or create Class KG-1
  let kgClass = await Class.findOne({ class: 'KG-1', schoolId: school._id });
  if (!kgClass) {
    kgClass = new Class({ class: 'KG-1', schoolId: school._id });
    await kgClass.save();
  }
  console.log(`Class: ${kgClass.class} (${kgClass._id})`);

  // 4. Create 6 subjects
  const subjectNames = ['English Literacy', 'Mathematics Foundation', 'Environmental Studies', 'Art & Craft', 'Social Interaction', 'Cognitive Skill'];
  const subjectsList = [];
  for (const sName of subjectNames) {
    let sub = await Subject.findOne({ name: sName, schoolId: school._id });
    if (!sub) {
      sub = new Subject({ name: sName, schoolId: school._id });
      await sub.save();
    }
    subjectsList.push(sub);
  }
  console.log(`Created/found 6 subjects.`);

  // 5. Link subjects to KG I class
  let classLink = await ClassSubjectLink.findOne({ classId: kgClass._id });
  if (!classLink) {
    classLink = new ClassSubjectLink({
      classId: kgClass._id,
      subjectIds: subjectsList.map(s => s._id),
      schoolId: school._id
    });
    await classLink.save();
  } else {
    classLink.subjectIds = subjectsList.map(s => s._id);
    await classLink.save();
  }
  console.log(`Linked subjects to Class KG I.`);

  // 6. Create chapters (3 chapters for each subject)
  const chaptersMap = {};
  for (const sub of subjectsList) {
    chaptersMap[sub._id] = [];
    for (let cNum = 1; cNum <= 3; cNum++) {
      const chName = `${sub.name} - Chapter ${cNum}`;
      let ch = await Chapter.findOne({ name: chName, classId: kgClass._id, subjectId: sub._id });
      if (!ch) {
        ch = new Chapter({ name: chName, classId: kgClass._id, subjectId: sub._id, schoolId: school._id });
        await ch.save();
      }
      chaptersMap[sub._id].push(ch);
    }
  }
  console.log(`Created 3 syllabus chapters per subject.`);

  // 7. Get/create fullname registry
  let fullnameField = await FieldRegistry.findOne({ key: 'fullname' });
  if (!fullnameField) {
    fullnameField = new FieldRegistry({ key: 'fullname', label: 'Full Name', type: 'text', required: true, schoolId: school._id });
    await fullnameField.save();
  }

  // 8. Create 8 assessment configs (Weekly I to VIII)
  const exams = [];
  for (let eNum = 1; eNum <= 8; eNum++) {
    const examName = `Weekly ${eNum === 1 ? 'I' : eNum === 2 ? 'II' : eNum === 3 ? 'III' : eNum === 4 ? 'IV' : eNum === 5 ? 'V' : eNum === 6 ? 'VI' : eNum === 7 ? 'VII' : 'VIII'}`;
    let config = await AssessmentConfiguration.findOne({
      assessmentName: examName,
      classId: kgClass._id,
      academicYearId: year._id
    });

    if (config) {
      await AssessmentConfiguration.deleteOne({ _id: config._id });
    }

    config = new AssessmentConfiguration({
      academicYearId: year._id,
      classId: kgClass._id,
      assessmentName: examName,
      weightage: 10,
      status: 'Published',
      schoolId: school._id,
      subjects: subjectsList.map(sub => {
        const subChs = chaptersMap[sub._id];
        return {
          subjectId: sub._id,
          selectedChapterIds: subChs.map(c => c._id),
          maximumMarks: 100,
          passingMarks: 35,
          duration: 60,
          examDate: new Date(Date.now() - (8 - eNum) * 24 * 60 * 60 * 1000) // progressive dates
        };
      })
    });
    await config.save();
    exams.push(config);
  }
  console.log(`Created 8 assessment configurations (Weekly I - VIII).`);

  // 9. Fetch actual students enrolled in KG-1
  const existingEnrollments = await StudentEnrollment.find({
    classId: kgClass._id,
    academicYearId: year._id,
    schoolId: school._id
  });

  console.log(`Found ${existingEnrollments.length} actual students enrolled in KG-1 class.`);

  // Clean up STU101-STU110 dummy students
  const dummyCodes = ['STU101','STU102','STU103','STU104','STU105','STU106','STU107','STU108','STU109','STU110'];
  const dummyStudents = await Student.find({ studentCode: { $in: dummyCodes }, schoolId: school._id });
  const dummyStudentIds = dummyStudents.map(d => d._id);
  await StudentEnrollment.deleteMany({ studentId: { $in: dummyStudentIds } });
  await Student.deleteMany({ studentCode: { $in: dummyCodes }, schoolId: school._id });
  console.log(`Cleaned up temporary seeder student documents.`);

  const studentsList = [];
  for (let i = 0; i < existingEnrollments.length; i++) {
    const enrollment = existingEnrollments[i];
    const student = await Student.findById(enrollment.studentId);
    if (!student) continue;

    // Distribute performance profiles
    let type = 'average';
    if (i < 5) type = 'topper';
    else if (i < 10) type = 'failing';
    else if (i < 15) type = 'improving';
    else if (i < 20) type = 'declining';

    studentsList.push({
      student,
      enrollment,
      name: `Student ${student.studentCode}`,
      type
    });
  }
  console.log(`Mapped performance profiles across all ${studentsList.length} actual students.`);

  // 10. Clear old marks for these assessments and seed marks
  await StudentAssessmentMark.deleteMany({
    assessmentConfigurationId: { $in: exams.map(e => e._id) }
  });

  for (let examIndex = 0; examIndex < exams.length; examIndex++) {
    const exam = exams[examIndex];
    for (const st of studentsList) {
      for (const sub of subjectsList) {
        // ABSENTEEISM MODEL
        // Topper is never absent, failing/average/progressing might be absent on 8% chance
        let isAbsent = false;
        if (st.type !== 'topper') {
          isAbsent = Math.random() < 0.08;
        }

        let score = 0;
        if (st.type === 'topper') {
          score = Math.floor(90 + Math.random() * 10); // 90-100
        } else if (st.type === 'failing') {
          score = Math.floor(15 + Math.random() * 19); // 15-34
        } else if (st.type === 'improving') {
          // starts around 40, grows to ~85 by Weekly VIII
          const base = 35 + Math.floor(Math.random() * 12);
          score = Math.min(95, base + (examIndex * 7));
        } else if (st.type === 'declining') {
          // starts around 85, drops to ~30 by Weekly VIII
          const base = 80 + Math.floor(Math.random() * 15);
          score = Math.max(12, base - (examIndex * 7));
        } else { // average
          score = Math.floor(52 + Math.random() * 24); // 52-76
        }

        const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : score >= 35 ? 'E' : 'F';

        const mark = new StudentAssessmentMark({
          schoolId: school._id,
          assessmentConfigurationId: exam._id,
          studentId: st.student._id,
          subjectId: sub._id,
          obtainedMarks: isAbsent ? 0 : score,
          attendanceStatus: isAbsent ? 'absent' : 'present',
          percentage: isAbsent ? 0 : score,
          grade: isAbsent ? 'F' : grade,
          remarks: isAbsent ? 'Absent' : (score >= 75 ? 'Excellent Performance' : score >= 45 ? 'Good Effort' : 'Needs Guidance')
        });
        await mark.save();
      }
    }
  }

  console.log('Dummy dataset successfully seeded! Terminating...');
  await mongoose.connection.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
