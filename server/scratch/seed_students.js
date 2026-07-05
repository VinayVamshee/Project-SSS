require('dotenv').config();
const mongoose = require('mongoose');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URL);
    const db = mongoose.connection.db;
    const schoolId = new mongoose.Types.ObjectId('6a4a2532c34e5731d437606d');

    const fields = await db.collection('personalinformationlists').find().toArray();
    const getFId = (key) => fields.find(f => f.fieldKey === key)?._id;

    const makeEAV = (data) => {
        return Object.entries(data).map(([key, val]) => {
            const fId = getFId(key);
            return { fieldId: fId, value: String(val) };
        }).filter(df => df.fieldId);
    };

    const aaravFields = makeEAV({
        admissionNo: 'BPS-001',
        nameHindi: 'आरव शर्मा',
        fatherName: 'Rajesh Sharma',
        motherName: 'Sunita Sharma',
        gender: 'Male',
        dob: '2018-05-15',
        dobInWords: 'Fifteenth May Two Thousand Eighteen',
        bloodGroup: 'O+',
        aadharNo: '123456789012',
        category: 'General',
        caste: 'Brahmin',
        casteHindi: 'ब्राह्मण',
        freeStudent: 'No',
        phoneNo: '9876543210',
        address: 'Seepat Road, Bilaspur, CG',
        religion: 'Hindu',
        nationality: 'Indian'
    });

    const ananyaFields = makeEAV({
        admissionNo: 'BPS-002',
        nameHindi: 'अनन्या अय्यर',
        fatherName: 'Suresh Iyer',
        motherName: 'Lakshmi Iyer',
        gender: 'Female',
        dob: '2018-09-20',
        dobInWords: 'Twentieth September Two Thousand Eighteen',
        bloodGroup: 'A+',
        aadharNo: '987654321098',
        category: 'General',
        caste: 'Iyer',
        casteHindi: 'अय्यर',
        freeStudent: 'No',
        phoneNo: '8765432109',
        address: 'Ganesh Nagar, Bilaspur, CG',
        religion: 'Hindu',
        nationality: 'Indian'
    });

    const kabirFields = makeEAV({
        admissionNo: 'BPS-003',
        nameHindi: 'कबीर वर्मा',
        fatherName: 'Alok Verma',
        motherName: 'Meena Verma',
        gender: 'Male',
        dob: '2018-03-10',
        dobInWords: 'Tenth March Two Thousand Eighteen',
        bloodGroup: 'B+',
        aadharNo: '567890123456',
        category: 'OBC',
        caste: 'Kurmi',
        casteHindi: 'कुर्मी',
        freeStudent: 'No',
        phoneNo: '7654321098',
        address: 'Annpurna Colony, Bilaspur, CG',
        religion: 'Hindu',
        nationality: 'Indian'
    });

    const diyaFields = makeEAV({
        admissionNo: 'BPS-004',
        nameHindi: 'दिया सेन',
        fatherName: 'Amit Sen',
        motherName: 'Rina Sen',
        gender: 'Female',
        dob: '2017-11-05',
        dobInWords: 'Fifth November Two Thousand Seventeen',
        bloodGroup: 'AB+',
        aadharNo: '345678901234',
        category: 'General',
        caste: 'Bengali',
        casteHindi: 'बंगाली',
        freeStudent: 'Yes',
        phoneNo: '6543210987',
        address: 'Rajendra Nagar, Bilaspur, CG',
        religion: 'Hindu',
        nationality: 'Indian'
    });

    const vivaanFields = makeEAV({
        admissionNo: 'BPS-005',
        nameHindi: 'विवान रॉय',
        fatherName: 'Joy Roy',
        motherName: 'Pooja Roy',
        gender: 'Male',
        dob: '2019-01-22',
        dobInWords: 'Twenty Second January Two Thousand Nineteen',
        bloodGroup: 'O-',
        aadharNo: '789012345678',
        category: 'General',
        caste: 'Roy',
        casteHindi: 'रॉय',
        freeStudent: 'No',
        phoneNo: '5432109876',
        address: 'Link Road, Bilaspur, CG',
        religion: 'Hindu',
        nationality: 'Indian'
    });

    await db.collection('students').updateOne({ name: 'Aarav Sharma', schoolId }, { $set: { dynamicFields: aaravFields } });
    await db.collection('students').updateOne({ name: 'Ananya Iyer', schoolId }, { $set: { dynamicFields: ananyaFields } });
    await db.collection('students').updateOne({ name: 'Kabir Verma', schoolId }, { $set: { dynamicFields: kabirFields } });
    await db.collection('students').updateOne({ name: 'Diya Sen', schoolId }, { $set: { dynamicFields: diyaFields } });
    await db.collection('students').updateOne({ name: 'Vivaan Roy', schoolId }, { $set: { dynamicFields: vivaanFields } });

    console.log('✅ Student dynamic profiles updated successfully!');
    await mongoose.disconnect();
}

seed().catch(err => console.error(err));
