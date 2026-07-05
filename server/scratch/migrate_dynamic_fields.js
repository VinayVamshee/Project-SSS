const mongoose = require('mongoose');
require('dotenv').config();

// Mappings of Vamshee Techno School's hardcoded old ObjectIds to standard fieldKeys
const oldIdToKey = {
    '6a49768db11d37d05562a6c2': 'admissionNo',
    '6a49768db11d37d05562a6c3': 'nameHindi',
    '6a49768db11d37d05562a6c4': 'fatherName',
    '6a49768db11d37d05562a6c5': 'motherName',
    '6a49768db11d37d05562a6c6': 'gender',
    '6a49768db11d37d05562a6c7': 'dob',
    '6a49768db11d37d05562a6c8': 'dobInWords',
    '6a49768db11d37d05562a6c9': 'bloodGroup',
    '6a49768db11d37d05562a6ca': 'aadharNo',
    '6a49768db11d37d05562a6cb': 'category',
    '6a49768db11d37d05562a6cc': 'caste',
    '6a49768db11d37d05562a6cd': 'casteHindi',
    '6a49768db11d37d05562a6ce': 'freeStudent',
    '6a49768db11d37d05562a6cf': 'phoneNo',
    '6a49768db11d37d05562a6d0': 'address',
    '6a49768db11d37d05562a6d1': 'oldAdmissionNo',
    '6a49768db11d37d05562a6d2': 'religion',
    '6a49768db11d37d05562a6d3': 'nationality'
};

async function migrate() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');
        const PersonalInformationList = require('../Models/PersonalInformationList');

        // Fetch all current fields
        const allFields = await PersonalInformationList.find({});
        console.log(`Loaded ${allFields.length} field definitions from Database.`);

        // Map fieldKey to its current ObjectId
        const keyToCurrentId = {};
        allFields.forEach(f => {
            keyToCurrentId[f.fieldKey] = f._id;
        });

        // Load all students
        const students = await Student.find({});
        console.log(`Scanning ${students.length} students for incorrect dynamicFields mappings...`);

        let updatedCount = 0;

        for (const student of students) {
            let modified = false;
            const migratedFields = [];

            if (student.dynamicFields && Array.isArray(student.dynamicFields)) {
                for (const df of student.dynamicFields) {
                    // 1. Resolve fieldKey if it was saved directly (e.g. from JSON import)
                    let resolvedKey = df.fieldKey;

                    // 2. Resolve fieldKey from incorrect/old fieldId
                    if (df.fieldId) {
                        const idStr = df.fieldId.toString();
                        if (oldIdToKey[idStr]) {
                            resolvedKey = oldIdToKey[idStr];
                        }
                    }

                    // 3. Map to true target field definition ObjectId
                    if (resolvedKey && keyToCurrentId[resolvedKey]) {
                        migratedFields.push({
                            fieldId: keyToCurrentId[resolvedKey],
                            value: df.value || ''
                        });
                        modified = true;
                    } else if (df.fieldId) {
                        // Check if the current fieldId is valid in the database
                        const isValid = allFields.some(f => f._id.toString() === df.fieldId.toString());
                        if (isValid) {
                            migratedFields.push(df);
                        } else {
                            console.log(`Removing orphan/invalid fieldId ${df.fieldId} for student ${student.name}`);
                        }
                    }
                }
            }

            if (modified) {
                student.dynamicFields = migratedFields;
                // Temporarily disable tenant plugin validation to let database fix-up run globally
                await Student.updateOne(
                    { _id: student._id },
                    { $set: { dynamicFields: migratedFields } }
                );
                updatedCount++;
            }
        }

        console.log(`Migration Complete: Successfully updated EAV ObjectIds for ${updatedCount} students.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
