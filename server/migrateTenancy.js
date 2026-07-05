require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const School = require('./Models/School');
const User = require('./Models/User');
const Student = require('./Models/Student');
const Classes = require('./Models/Classes');
const Subject = require('./Models/Subject');
const ClassSubjectLink = require('./Models/ClassSubjectLink');
const Chapter = require('./Models/Chapter');
const PersonalInformationList = require('./Models/PersonalInformationList');
const Exam = require('./Models/Exam');
const AcademicYear = require('./Models/AcademicYear');
const Marks = require('./Models/Marks');
const Payment = require('./Models/Payment');
const ClassFees = require('./Models/ClassFees');
const ReceiptBook = require('./Models/ReceiptBook');
const QuestionPaper = require('./Models/QuestionPaper');
const InstructionTemplate = require('./Models/InstructionTemplate');

const migrateTenancy = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URL environment variable is missing.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    // 1. Create or update School tenant with exact requested details
    let defaultSchool = await School.findOne({ slug: "primary" });
    if (!defaultSchool) {
      defaultSchool = new School({
        name: "Vamshee Techno School",
        slug: "primary",
        logoUrl: "",
        address: "Kurnool",
        phoneNo: "9000000000",
        email: "vamsheetechnoschool@gmail.com",
        theme: {
          primaryColor: '#FE4F2D',
          secondaryColor: '#FDFBEE',
          themeName: 'light'
        },
        status: "active"
      });
      await defaultSchool.save();
      console.log(`Created default School tenant: ${defaultSchool.name} (${defaultSchool._id})`);
    } else {
      defaultSchool.name = "Vamshee Techno School";
      defaultSchool.email = "vamsheetechnoschool@gmail.com";
      defaultSchool.phoneNo = "9000000000";
      defaultSchool.address = "Kurnool";
      defaultSchool.theme = {
        primaryColor: '#FE4F2D',
        secondaryColor: '#FDFBEE',
        themeName: 'light'
      };
      await defaultSchool.save();
      console.log(`Updated default School tenant: ${defaultSchool.name} (${defaultSchool._id})`);
    }

    const schoolId = defaultSchool._id;

    // 2. Define collections that need schoolId assignment (excluding QuestionPaper)
    const collectionsToMigrate = [
      { model: User, name: 'User' },
      { model: Student, name: 'Student' },
      { model: Classes, name: 'Classes' },
      { model: Subject, name: 'Subject' },
      { model: ClassSubjectLink, name: 'ClassSubjectLink' },
      { model: Chapter, name: 'Chapter' },
      { model: PersonalInformationList, name: 'PersonalInformationList' },
      { model: Exam, name: 'Exam' },
      { model: AcademicYear, name: 'AcademicYear' },
      { model: Marks, name: 'Marks' },
      { model: Payment, name: 'Payment' },
      { model: ClassFees, name: 'ClassFees' },
      { model: ReceiptBook, name: 'ReceiptBook' },
      { model: InstructionTemplate, name: 'InstructionTemplate' }
    ];

    // 3. Force backfill schoolId on all matching existing documents
    for (const item of collectionsToMigrate) {
      console.log(`Backfilling schoolId in ${item.name}...`);
      const result = await item.model.updateMany(
        {}, // Force update all documents to reference the main school ID
        { $set: { schoolId } }
      );
      console.log(`Updated ${result.modifiedCount || result.nModified || 'all'} documents in ${item.name}.`);
    }

    console.log("🎉 Tenancy migration completed successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrateTenancy();
