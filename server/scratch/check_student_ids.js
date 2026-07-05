const mongoose = require('mongoose');

async function checkIds() {
    try {
        await mongoose.connect('mongodb://localhost:27017/SSS');
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');
        const PersonalInformationList = require('../Models/PersonalInformationList');

        const student = await Student.findById('6879d97191f842bb485f8d2d');
        console.log('\n--- Student Daksh Ray ---');
        console.log('Name:', student.name);
        console.log('dynamicFields:');
        student.dynamicFields.forEach((df, idx) => {
            console.log(`[${idx}] fieldId: ${df.fieldId}, value: ${df.value}`);
        });

        console.log('\n--- Active Field Definitions in Database ---');
        const fields = await PersonalInformationList.find({});
        fields.forEach(f => {
            console.log(`_id: ${f._id}, fieldKey: ${f.fieldKey}, fieldName: ${f.fieldName}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkIds();
