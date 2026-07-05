require('dotenv').config();
const mongoose = require('mongoose');

const PersonalInformationList = require('./Models/PersonalInformationList');
const Student = require('./Models/Student');

const DEFAULT_FIELDS = [
  { sno: 1,  fieldKey: 'admissionNo',    fieldName: 'Admission Number',    fieldType: 'text',     required: true,  isUnique: true },
  { sno: 2,  fieldKey: 'nameHindi',      fieldName: 'Name (Hindi)',         fieldType: 'text',     required: false, isUnique: false },
  { sno: 3,  fieldKey: 'fatherName',     fieldName: "Father's Name",        fieldType: 'text',     required: false, isUnique: false },
  { sno: 4,  fieldKey: 'motherName',     fieldName: "Mother's Name",        fieldType: 'text',     required: false, isUnique: false },
  { sno: 5,  fieldKey: 'gender',         fieldName: 'Gender',               fieldType: 'select',   required: true,  isUnique: false, options: ['Male', 'Female', 'Other'] },
  { sno: 6,  fieldKey: 'dob',            fieldName: 'Date of Birth',        fieldType: 'date',     required: false, isUnique: false },
  { sno: 7,  fieldKey: 'dobInWords',     fieldName: 'DOB In Words',         fieldType: 'text',     required: false, isUnique: false },
  { sno: 8,  fieldKey: 'bloodGroup',     fieldName: 'Blood Group',          fieldType: 'select',   required: false, isUnique: false, options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
  { sno: 9,  fieldKey: 'aadharNo',       fieldName: 'Aadhar Number',        fieldType: 'text',     required: false, isUnique: false },
  { sno: 10, fieldKey: 'category',       fieldName: 'Category',             fieldType: 'select',   required: false, isUnique: false, options: ['General', 'OBC', 'SC', 'ST', 'EWS'] },
  { sno: 11, fieldKey: 'caste',          fieldName: 'Caste',                fieldType: 'text',     required: false, isUnique: false },
  { sno: 12, fieldKey: 'casteHindi',     fieldName: 'Caste (Hindi)',        fieldType: 'text',     required: false, isUnique: false },
  { sno: 13, fieldKey: 'freeStudent',    fieldName: 'Free Student',         fieldType: 'select',   required: false, isUnique: false, options: ['Yes', 'No'] },
  { sno: 14, fieldKey: 'phoneNo',        fieldName: 'Phone Number',         fieldType: 'phone',    required: false, isUnique: false },
  { sno: 15, fieldKey: 'address',        fieldName: 'Address',              fieldType: 'textarea', required: false, isUnique: false },
  { sno: 16, fieldKey: 'oldAdmissionNo', fieldName: 'Old Admission Number', fieldType: 'text',     required: false, isUnique: false },
  { sno: 17, fieldKey: 'religion',       fieldName: 'Religion',             fieldType: 'text',     required: false, isUnique: false },
  { sno: 18, fieldKey: 'nationality',    fieldName: 'Nationality',          fieldType: 'text',     required: false, isUnique: false },
];

const migrateDynamicFields = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) throw new Error("MONGODB_URL environment variable is missing.");

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    // 1. Seed PersonalInformationList with default field definitions
    console.log("\n--- Seeding PersonalInformationList field definitions ---");
    const fieldMap = {}; // fieldKey -> _id

    for (const fieldDef of DEFAULT_FIELDS) {
      let existing = await PersonalInformationList.findOne({ fieldKey: fieldDef.fieldKey }).setOptions({ bypassTenant: true });
      if (!existing) {
        existing = await PersonalInformationList.create({ ...fieldDef, schoolId: null });
        console.log(`  ✅ Created field: ${fieldDef.fieldName}`);
      } else {
        // Update the schema to include fieldKey if it was an older record
        if (!existing.fieldKey) {
          existing.fieldKey = fieldDef.fieldKey;
          existing.fieldType = fieldDef.fieldType || 'text';
          existing.options = fieldDef.options || [];
          await existing.save({ validateBeforeSave: false });
          console.log(`  🔄 Updated legacy field: ${fieldDef.fieldName}`);
        } else {
          console.log(`  ⏭  Already exists: ${fieldDef.fieldName}`);
        }
      }
      fieldMap[fieldDef.fieldKey] = existing._id;
    }

    // 2. Migrate existing Student documents to EAV dynamicFields structure
    console.log("\n--- Migrating existing student records to EAV dynamicFields ---");
    const db = mongoose.connection.db;
    const studentsCol = db.collection('students');
    const academicYearId = new mongoose.Types.ObjectId("6a49704e31d281a6130aa86b");

    const students = await studentsCol.find().toArray();
    let migratedCount = 0;

    for (const stud of students) {
      // Build dynamicFields array from existing legacy fields
      const dynamicFields = [];
      const addField = (key, value) => {
        if (value && fieldMap[key]) {
          dynamicFields.push({ fieldId: fieldMap[key], value: String(value) });
        }
      };

      addField('admissionNo',    stud.AdmissionNo);
      addField('nameHindi',      stud.nameHindi);
      addField('gender',         stud.gender);
      addField('dob',            stud.dob ? (stud.dob instanceof Date ? stud.dob.toISOString().split('T')[0] : String(stud.dob).split('T')[0]) : '');
      addField('dobInWords',     stud.dobInWords);
      addField('bloodGroup',     stud.bloodGroup);
      addField('aadharNo',       stud.aadharNo);
      addField('category',       stud.category);
      addField('caste',          stud.Caste);
      addField('casteHindi',     stud.CasteHindi);
      addField('freeStudent',    stud.FreeStud);
      addField('oldAdmissionNo', stud.oldAdmissionNo);

      // Build enrollments from legacy academicYears array
      const enrollments = [];
      if (stud.academicYears && stud.academicYears.length > 0) {
        for (const entry of stud.academicYears) {
          enrollments.push({
            academicYear: academicYearId,
            class: entry.class || '',
            status: entry.status || 'Active'
          });
        }
      } else {
        enrollments.push({ academicYear: academicYearId, class: '', status: 'Active' });
      }

      await studentsCol.updateOne(
        { _id: stud._id },
        {
          $set: {
            dynamicFields,
            enrollments,
            academicYearId,
            // Remove legacy fields
            AdmissionNo: undefined,
            nameHindi: undefined,
            gender: undefined,
            dob: undefined,
            dobInWords: undefined,
            bloodGroup: undefined,
            aadharNo: undefined,
            category: undefined,
            Caste: undefined,
            CasteHindi: undefined,
            FreeStud: undefined,
            oldAdmissionNo: undefined,
            previousStudentId: undefined,
            additionalInfo: undefined,
            academicYears: undefined
          }
        }
      );
      migratedCount++;
    }

    console.log(`\n✅ Migrated ${migratedCount} student documents to EAV structure.`);
    console.log("🎉 Dynamic Fields migration completed successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err.message || err);
    process.exit(1);
  }
};

migrateDynamicFields();
