const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const Template = require('../domain/metadata/models/Template');
const EntityRegistry = require('../domain/metadata/models/EntityRegistry');

async function run() {
  const uri = process.env.MONGODB_URL;
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const templatesColl = db.collection('templates');
  const entitiesColl = db.collection('entityregistries');

  // Find student_enrollment entity
  const studentEntity = await entitiesColl.findOne({ key: 'student_enrollment' });
  if (!studentEntity) {
    console.error("Student Enrollment EntityRegistry record not found!");
    await mongoose.disconnect();
    return;
  }
  console.log(`Found Student Entity: ID=${studentEntity._id}`);

  const templateKey = "student_information_vamshee";
  const existing = await templatesColl.findOne({ key: templateKey });

  const templateData = {
    key: templateKey,
    label: "Vamshee Techno School Student Information",
    description: "Student profile view and edit layout",
    isGlobalRegistry: true,
    entity: studentEntity._id,
    scope: "selectedSchools",
    schools: [
      new mongoose.Types.ObjectId("6a496928e7b5f329b94a0775") // Vamshee school ID
    ],
    purpose: "student_information",
    sections: [
      {
        label: "",
        icon: "",
        description: "",
        order: 1,
        collapsible: false,
        collapsedByDefault: false,
        fields: [
          { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f61d"), width: 3, order: 1 }, // Profile Photo
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f612"), width: 6, order: 2 }, // Full Name
          { fieldId: new mongoose.Types.ObjectId("6a4f93b652200d469885f60d"), width: 3, order: 3 }, // Admission Number
          { fieldId: new mongoose.Types.ObjectId("6a4f93b652200d469885f60e"), width: 3, order: 4 }, // Roll Number
          { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f637"), width: 3, order: 5 }, // Class
          { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f639"), width: 3, order: 6 }, // Section
          { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f638"), width: 3, order: 7 }, // Academic Year
          { fieldId: new mongoose.Types.ObjectId("6a4ff6a9eadc5b0215503c5d"), width: 3, order: 8 }  // Academic Status
        ]
      },
      {
        label: "Personal Information",
        icon: "fa-user",
        description: "Student identity, background and contact details",
        order: 2,
        collapsible: false,
        collapsedByDefault: false,
        fields: [
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f613"), width: 4, order: 1 }, // Gender
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f614"), width: 4, order: 2 }, // Date Of Birth
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f615"), width: 4, order: 3 }, // Blood Group
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f616"), width: 4, order: 4 }, // Religion
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f61a"), width: 4, order: 5 }, // Mother Tongue
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f61b"), width: 4, order: 6 }, // Aadhaar
          { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f61c"), width: 6, order: 7 }, // Birth Certificate
          { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f61e"), width: 3, order: 8 }, // Mobile Number
          { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f620"), width: 3, order: 9 }  // Email
        ]
      },
      {
        label: "Parents Information",
        icon: "fa-users",
        description: "Father and Mother details, contact information",
        order: 3,
        collapsible: false,
        collapsedByDefault: false,
        fields: [
          { fieldId: new mongoose.Types.ObjectId("6a4f93b852200d469885f621"), width: 4, order: 1 }, // Father Name
          { fieldId: new mongoose.Types.ObjectId("6a5120cb8a7642b047ba2be1"), width: 4, order: 2 }, // Father Phone
          { fieldId: new mongoose.Types.ObjectId("6a5120cb8a7642b047ba2be3"), width: 4, order: 3 }, // Father Aadhaar
          { fieldId: new mongoose.Types.ObjectId("6a4f93b952200d469885f627"), width: 4, order: 4 }, // Mother Name
          { fieldId: new mongoose.Types.ObjectId("6a5120cb8a7642b047ba2be2"), width: 4, order: 5 }, // Mother Phone
          { fieldId: new mongoose.Types.ObjectId("6a5120cc8a7642b047ba2be4"), width: 4, order: 6 }  // Mother Aadhaar
        ]
      },
      {
        label: "Category & Social Details",
        icon: "fa-id-card",
        description: "Socio-demographic categorization",
        order: 4,
        collapsible: true,
        collapsedByDefault: false,
        fields: [
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f618"), width: 4, order: 1 }, // Category
          { fieldId: new mongoose.Types.ObjectId("6a4f93b752200d469885f617"), width: 4, order: 2 }, // Caste
          { fieldId: new mongoose.Types.ObjectId("6a500001eadc5b0215503c60"), width: 4, order: 3 }, // Caste Hindi
          { fieldId: new mongoose.Types.ObjectId("6a500001eadc5b0215503c61"), width: 4, order: 4 }  // Caste Certificate
        ]
      },
      {
        label: "Address",
        icon: "fa-location-dot",
        description: "Residential contact address",
        order: 5,
        collapsible: false,
        collapsedByDefault: false,
        fields: [
          { fieldId: new mongoose.Types.ObjectId("6a4f93ba52200d469885f630"), width: 12, order: 1 }, // Address
          { fieldId: new mongoose.Types.ObjectId("6a4f93ba52200d469885f631"), width: 3, order: 2 },  // City
          { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f632"), width: 3, order: 3 },  // District
          { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f633"), width: 3, order: 4 },  // State
          { fieldId: new mongoose.Types.ObjectId("6a4f93bb52200d469885f635"), width: 3, order: 5 }   // Pincode
        ]
      },
      {
        label: "Previous Academic History",
        icon: "fa-school",
        description: "Prior educational records",
        order: 6,
        collapsible: true,
        collapsedByDefault: true,
        fields: [
          { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f63c"), width: 6, order: 1 }, // Previous School
          { fieldId: new mongoose.Types.ObjectId("6a4f93bc52200d469885f63d"), width: 6, order: 2 }  // Transfer Certificate
        ]
      }
    ],
    settings: {
      allowCreate: true,
      allowEdit: true,
      allowDelete: true,
      allowExport: true
    },
    status: "active",
    version: 1
  };

  if (existing) {
    console.log(`Template already exists. Updating template...`);
    await templatesColl.updateOne({ key: templateKey }, { $set: templateData });
  } else {
    console.log(`Creating template...`);
    await templatesColl.insertOne(templateData);
  }

  console.log("Template successfully set up!");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Error setting up template:", err);
});
