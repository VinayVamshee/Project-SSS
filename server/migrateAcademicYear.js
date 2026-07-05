require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Student = require('./Models/Student');
const Payment = require('./Models/Payment');
const ClassFees = require('./Models/ClassFees');
const Marks = require('./Models/Marks');

const migrateAcademicYear = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URL environment variable is missing.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const targetYear = "2025-26";
    const targetYearId = "6a49704e31d281a6130aa86b";

    // 1. Update Student academicYears array
    console.log("Updating Student academicYears...");
    const students = await Student.find();
    let studentCount = 0;
    for (const stud of students) {
      let modified = false;
      if (!stud.academicYears || stud.academicYears.length === 0) {
        stud.academicYears = [{
          academicYear: targetYear,
          class: "1",
          status: "Active"
        }];
        modified = true;
      } else {
        stud.academicYears.forEach(entry => {
          if (entry.academicYear !== targetYear) {
            entry.academicYear = targetYear;
            modified = true;
          }
        });
      }
      if (modified) {
        await stud.save({ validateBeforeSave: false });
        studentCount++;
      }
    }
    console.log(`Updated ${studentCount} student records.`);

    // 2. Update Payment academicYears array
    console.log("Updating Payment academicYears...");
    const payments = await Payment.find();
    let paymentCount = 0;
    for (const pay of payments) {
      let modified = false;
      if (pay.academicYears && pay.academicYears.length > 0) {
        pay.academicYears.forEach(entry => {
          if (entry.academicYear !== targetYear) {
            entry.academicYear = targetYear;
            modified = true;
          }
        });
      }
      if (modified) {
        await pay.save({ validateBeforeSave: false });
        paymentCount++;
      }
    }
    console.log(`Updated ${paymentCount} payment records.`);

    // 3. Update ClassFees carefully (merging documents due to unique academicYear index constraint)
    console.log("Updating ClassFees academicYear...");
    const allClassFeesDocs = await ClassFees.find();
    if (allClassFeesDocs.length > 0) {
      // Find the one that matches targetYear, or default to the first one
      let primaryDoc = allClassFeesDocs.find(d => d.academicYear === targetYear);
      if (!primaryDoc) {
        primaryDoc = allClassFeesDocs[0];
        primaryDoc.academicYear = targetYear;
      }

      // Merge class arrays from all other documents into the primary document
      const seenClassIds = new Set(primaryDoc.classes.map(c => c.class_id?.toString()));
      for (const doc of allClassFeesDocs) {
        if (doc._id.toString() === primaryDoc._id.toString()) continue;
        for (const cls of doc.classes) {
          const cidStr = cls.class_id?.toString();
          if (cidStr && !seenClassIds.has(cidStr)) {
            primaryDoc.classes.push(cls);
            seenClassIds.add(cidStr);
          }
        }
        // Delete the extra document to prevent duplicate key constraint
        await ClassFees.deleteOne({ _id: doc._id });
      }
      await primaryDoc.save({ validateBeforeSave: false });
      console.log(`Merged and updated ClassFees documents successfully.`);
    }

    // 4. Update Marks
    console.log("Updating Marks academicYear...");
    const marksRes = await Marks.updateMany(
      {},
      { $set: { academicYear: targetYear } }
    );
    console.log(`Updated ${marksRes.modifiedCount || marksRes.nModified || 'all'} Marks records.`);

    console.log("🎉 Academic Year migration completed successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrateAcademicYear();
