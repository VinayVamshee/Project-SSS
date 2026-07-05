require('dotenv').config();
const mongoose = require('mongoose');

const migrateStudentAcademicYearRef = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URL environment variable is missing.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const targetYearId = new mongoose.Types.ObjectId("6a49704e31d281a6130aa86b");
    const db = mongoose.connection.db;
    const studentsCol = db.collection('students');

    const students = await studentsCol.find().toArray();
    let updatedCount = 0;

    for (const stud of students) {
      let modified = false;
      if (stud.academicYears && stud.academicYears.length > 0) {
        stud.academicYears.forEach(entry => {
          // Force set to ObjectId type directly in database
          entry.academicYear = targetYearId;
          modified = true;
        });
      } else {
        stud.academicYears = [{
          academicYear: targetYearId,
          class: "1",
          status: "Active"
        }];
        modified = true;
      }
      
      if (modified) {
        await studentsCol.updateOne(
          { _id: stud._id },
          { $set: { academicYears: stud.academicYears } }
        );
        updatedCount++;
      }
    }

    console.log(`🎉 Direct MongoDB Update: Successfully converted academicYear to ObjectId references in ${updatedCount} Student documents!`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrateStudentAcademicYearRef();
