const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const Template = require('../domain/metadata/models/Template');

async function run() {
  const uri = process.env.MONGODB_URL;
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const collection = db.collection('templates');

  const template = await collection.findOne({ key: 'student_registration_vamshee' });
  if (!template) {
    console.log("Template student_registration_vamshee not found");
    await mongoose.disconnect();
    return;
  }

  // Define custom sections mapping with fields grouped by their fieldId
  const sectionsData = [
    {
      label: "Basic Details",
      icon: "fa-user-graduate",
      description: "Student profile, photo, identification and contact information",
      order: 1,
      collapsible: false,
      collapsedByDefault: false,
      fields: [
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f612"), order: 1, required: false, unique: false, readOnly: false, hidden: false, width: 8, placeholder: "Full Name", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f61d"), order: 2, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Upload Photo", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a500001eadc5b0215503c5f"), order: 3, required: false, unique: false, readOnly: false, hidden: false, width: 8, placeholder: "नाम (हिंदी में)", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a500001eadc5b0215503c5e"), order: 4, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Type", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f613"), order: 5, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Gender", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f614"), order: 6, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f615"), order: 7, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Blood Group", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f61b"), order: 8, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "12-digit Aadhaar", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f616"), order: 9, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Religion", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f61a"), order: 10, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Mother Tongue", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f61c"), order: 11, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Birth Certificate No", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f61e"), order: 12, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Mobile Number", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f620"), order: 13, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Email Address", helperText: "" }
      ]
    },
    {
      label: "Academic Info",
      icon: "fa-book-open",
      description: "Class admission, enrollment history and status tracking",
      order: 2,
      collapsible: false,
      collapsedByDefault: false,
      fields: [
        { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f637"), order: 1, required: true, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Class", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f638"), order: 2, required: true, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Year", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f639"), order: 3, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Section Key", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b652200d469885f60d"), order: 4, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Admission Number", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b652200d469885f60e"), order: 5, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Roll Number", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f63a"), order: 6, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a5122e41a15f1aaa0263a4e"), order: 7, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Status", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4ff6a9eadc5b0215503c5d"), order: 8, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Status", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f63b"), order: 9, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "", helperText: "" }
      ]
    },
    {
      label: "Parental Info",
      icon: "fa-users",
      description: "Father and Mother details, contact information and Aadhaar numbers",
      order: 3,
      collapsible: false,
      collapsedByDefault: false,
      fields: [
        { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f621"), order: 1, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Father Name", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a5120cb8a7642b047ba2be1"), order: 2, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Phone Number", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a5120cb8a7642b047ba2be3"), order: 3, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Aadhaar", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b952200d469885f627"), order: 4, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Mother Name", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a5120cb8a7642b047ba2be2"), order: 5, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Phone Number", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a5120cc8a7642b047ba2be4"), order: 6, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Aadhaar", helperText: "" }
      ]
    },
    {
      label: "Social Details",
      icon: "fa-id-card",
      description: "Category, caste certificate and registration records",
      order: 4,
      collapsible: true,
      collapsedByDefault: false,
      fields: [
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f618"), order: 1, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Select Category", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f617"), order: 2, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Caste Subcategory", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a500001eadc5b0215503c60"), order: 3, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "जाति (हिंदी में)", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a500001eadc5b0215503c61"), order: 4, required: false, unique: false, readOnly: false, hidden: false, width: 4, placeholder: "Certificate Number", helperText: "" }
      ]
    },
    {
      label: "Address Details",
      icon: "fa-map-location-dot",
      description: "Residential address and postal area",
      order: 5,
      collapsible: false,
      collapsedByDefault: false,
      fields: [
        { fieldId: new mongoose.Types.ObjectId("6a4f93ba52200d469885f630"), order: 1, required: false, unique: false, readOnly: false, hidden: false, width: 12, placeholder: "Full Street Address", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93ba52200d469885f631"), order: 2, required: false, unique: false, readOnly: false, hidden: false, width: 3, placeholder: "City / Town", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f632"), order: 3, required: false, unique: false, readOnly: false, hidden: false, width: 3, placeholder: "District Name", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f633"), order: 4, required: false, unique: false, readOnly: false, hidden: false, width: 3, placeholder: "State", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f635"), order: 5, required: false, unique: false, readOnly: false, hidden: false, width: 3, placeholder: "Pincode", helperText: "" }
      ]
    },
    {
      label: "Previous History",
      icon: "fa-graduation-cap",
      description: "Previous school enrollment and Transfer Certificate details",
      order: 6,
      collapsible: true,
      collapsedByDefault: true,
      fields: [
        { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f63c"), order: 1, required: false, unique: false, readOnly: false, hidden: false, width: 6, placeholder: "School Name", helperText: "" },
        { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f63d"), order: 2, required: false, unique: false, readOnly: false, hidden: false, width: 6, placeholder: "TC Serial Number", helperText: "" }
      ]
    }
  ];

  await collection.updateOne(
    { _id: template._id },
    { $set: { sections: sectionsData } }
  );

  console.log("Successfully partitioned 'student_registration_vamshee' into 6 logical sections!");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Failed to run custom partition:", err);
});
