require('dotenv').config();
const mongoose = require('mongoose');

require('../domain/shared/models/School.js');
require('../domain/academics/models/AcademicYear.js');
require('../domain/academics/models/Classes.js');
require('../domain/student/models/Student.js');
require('../domain/student/models/StudentEnrollment.js');
require('../domain/metadata/models/FieldRegistry.js');

async function inspect() {
  const uri = process.env.MONGODB_URL;
  console.log(`Connecting to: ${uri}`);
  await mongoose.connect(uri);

  const StudentEnrollment = mongoose.model('StudentEnrollment');
  const FieldRegistry = mongoose.model('FieldRegistry');

  const fullnameField = await FieldRegistry.findOne({ key: 'fullname' });

  // KG-1 Class ID: 6877b144c3d53fa80a3e9035
  // Year ID: 6a49704e31d281a6130aa86b
  const enrollments = await StudentEnrollment.find({ 
    classId: '6877b144c3d53fa80a3e9035', 
    academicYearId: '6a49704e31d281a6130aa86b' 
  }).populate('studentId');

  console.log(`\n--- STUDENTS IN KG-1 (${enrollments.length} total) ---`);
  enrollments.forEach(e => {
    const nameField = e.dynamicFields.find(f => String(f.fieldId) === String(fullnameField?._id));
    console.log(`Student: ${nameField ? nameField.value : 'N/A'} [Code: ${e.studentId?.studentCode}] [EnrollmentID: ${e._id}] [StudentID: ${e.studentId?._id}]`);
  });

  await mongoose.connection.close();
}

inspect().catch(console.error);
