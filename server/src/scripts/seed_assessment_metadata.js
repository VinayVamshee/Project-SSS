const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const EntityRegistry = require('../domain/metadata/models/EntityRegistry');
const FieldRegistry = require('../domain/metadata/models/FieldRegistry');
const Template = require('../domain/metadata/models/Template');

async function seed() {
  const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017/sss_v2';
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  console.log('Seeding metadata...');

  // 1. Create or update Subject entity registry
  let subjectEntity = await EntityRegistry.findOne({ key: 'subject' });
  if (!subjectEntity) {
    subjectEntity = new EntityRegistry({
      key: 'subject',
      label: 'Subject Database',
      description: 'Academics core subjects reference database',
      collection: 'subjects',
      model: 'Subject',
      handler: 'GenericHandler',
      category: 'Academics',
      icon: 'fa-book'
    });
    await subjectEntity.save();
    console.log('Subject Entity registered.');
  }

  // 2. Create or update Chapter entity registry
  let chapterEntity = await EntityRegistry.findOne({ key: 'chapter' });
  if (!chapterEntity) {
    chapterEntity = new EntityRegistry({
      key: 'chapter',
      label: 'Chapter Syllabus',
      description: 'Academics chapter syllabus reference database',
      collection: 'chapters',
      model: 'Chapter',
      handler: 'GenericHandler',
      category: 'Academics',
      icon: 'fa-bookmark'
    });
    await chapterEntity.save();
    console.log('Chapter Entity registered.');
  }

  // 3. Create or update Assessment Configuration entity registry
  let assessmentEntity = await EntityRegistry.findOne({ key: 'assessment_configuration' });
  if (!assessmentEntity) {
    assessmentEntity = new EntityRegistry({
      key: 'assessment_configuration',
      label: 'Assessment Configuration',
      description: 'Configurable academic evaluations, marks structures, and weighting schedules',
      collection: 'assessmentconfigurations',
      model: 'AssessmentConfiguration',
      handler: 'AssessmentHandler',
      category: 'Academics',
      icon: 'fa-graduation-cap'
    });
    await assessmentEntity.save();
    console.log('Assessment Configuration Entity registered.');
  }

  // 3b. Create or update Student Assessment Marks entity registry
  let marksEntity = await EntityRegistry.findOne({ key: 'student_assessment_mark' });
  if (!marksEntity) {
    marksEntity = new EntityRegistry({
      key: 'student_assessment_mark',
      label: 'Student Assessment Marks',
      description: 'Academics student grades and score registrations',
      collection: 'studentassessmentmarks',
      model: 'StudentAssessmentMark',
      handler: 'AssessmentHandler',
      category: 'Academics',
      icon: 'fa-file-lines'
    });
    await marksEntity.save();
    console.log('Student Assessment Mark Entity registered.');
  }

  // 4. Create Field registries for Assessment Configuration
  const fieldsData = [
    { key: 'assessment_name', label: 'Assessment Name', type: 'text', category: 'Academics' },
    { key: 'weightage', label: 'Weightage %', type: 'number', category: 'Academics' },
    { key: 'status', label: 'Status', type: 'select', category: 'Academics', options: [
      { label: 'Draft', value: 'Draft' },
      { label: 'Active', value: 'Active' },
      { label: 'Locked', value: 'Locked' },
      { label: 'Published', value: 'Published' }
    ]}
  ];

  const fieldIds = [];
  for (const fd of fieldsData) {
    let field = await FieldRegistry.findOne({ key: fd.key });
    if (!field) {
      field = new FieldRegistry(fd);
      await field.save();
      console.log(`Field registered: ${fd.key}`);
    }
    fieldIds.push(field._id);
  }

  // Seed Lookup Fields for Subject and Chapter Entity references
  let subjectLookup = await FieldRegistry.findOne({ key: 'subject_lookup' });
  if (!subjectLookup) {
    subjectLookup = new FieldRegistry({
      key: 'subject_lookup',
      label: 'Subject Lookup',
      description: 'Selects a subject from core database',
      type: 'lookup',
      category: 'Academics',
      lookup: {
        entity: subjectEntity._id,
        displayField: {
          field: 'name'
        }
      }
    });
    await subjectLookup.save();
    console.log('Subject Lookup Field registered.');
  }

  let chapterLookup = await FieldRegistry.findOne({ key: 'chapter_lookup' });
  if (!chapterLookup) {
    chapterLookup = new FieldRegistry({
      key: 'chapter_lookup',
      label: 'Chapter Lookup',
      description: 'Selects a chapter syllabus coverage',
      type: 'lookup',
      category: 'Academics',
      lookup: {
        entity: chapterEntity._id,
        displayField: {
          field: 'name'
        }
      }
    });
    await chapterLookup.save();
    console.log('Chapter Lookup Field registered.');
  }

  // 4b. Create Field registries for Marks Entry
  const marksFieldsData = [
    { key: 'obtained_marks', label: 'Obtained Marks', type: 'number', category: 'Academics' },
    { key: 'attendance_status', label: 'Attendance Status', type: 'select', category: 'Academics', options: [
      { label: 'Present', value: 'present' },
      { label: 'Absent', value: 'absent' }
    ]},
    { key: 'remarks', label: 'Remarks', type: 'text', category: 'Academics' }
  ];

  const marksFieldIds = [];
  for (const fd of marksFieldsData) {
    let field = await FieldRegistry.findOne({ key: fd.key });
    if (!field) {
      field = new FieldRegistry(fd);
      await field.save();
      console.log(`Field registered: ${fd.key}`);
    }
    marksFieldIds.push(field._id);
  }

  // 5. Create default Template for Assessment Configuration
  const templateKey = 'assessment_configuration_template';
  let template = await Template.findOne({ key: templateKey });
  if (!template) {
    template = new Template({
      key: templateKey,
      label: 'Default Assessment Configuration Form',
      description: 'Standard parameters layout for creating and editing assessments',
      isGlobalRegistry: true,
      entity: assessmentEntity._id,
      purpose: 'assessment_setup',
      sections: [
        {
          label: 'Basic Assessment Parameters',
          icon: 'fa-sliders',
          order: 1,
          fields: fieldIds.map((id, index) => ({
            fieldId: id,
            width: index === 0 ? 6 : 3,
            order: index + 1
          }))
        }
      ]
    });
    await template.save();
    console.log('Default Assessment Configuration template registered.');
  }

  // 5b. Create default Template for Student Marks Entry
  const marksTemplateKey = 'student_marks_entry_template';
  let marksTemplate = await Template.findOne({ key: marksTemplateKey });
  if (!marksTemplate) {
    marksTemplate = new Template({
      key: marksTemplateKey,
      label: 'Default Marks Entry Template',
      description: 'Form layout for scoring academic assessments',
      isGlobalRegistry: true,
      entity: marksEntity._id,
      purpose: 'student_marks',
      sections: [
        {
          label: 'Student Marks Parameter',
          icon: 'fa-file-signature',
          order: 1,
          fields: marksFieldIds.map((id, index) => ({
            fieldId: id,
            width: index === 1 ? 4 : (index === 0 ? 4 : 4),
            order: index + 1
          }))
        }
      ]
    });
    await marksTemplate.save();
    console.log('Default Student Marks Entry template registered.');
  }

  await mongoose.disconnect();
  console.log('Seed completed successfully!');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
