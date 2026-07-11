const StudentService = require('../services/StudentService');

exports.addStudent = async (req, res) => {
  try {
    const result = await StudentService.registerStudent(req.schoolId, req.body);
    res.status(201).json({ message: 'Student registered successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Error adding student', error: error.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await StudentService.getAllStudents();
    res.status(200).json({ students });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const result = await StudentService.updateStudent(req.params.id, req.schoolId, req.body);
    res.status(200).json({ message: 'Student updated successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
};

exports.updateAcademicYearStatus = async (req, res) => {
  try {
    const enrollment = await StudentService.updateAcademicYearStatus(req.params.id, req.body);
    res.status(200).json({ message: 'Enrollment status updated.', data: enrollment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update enrollment status.', error: error.message });
  }
};

exports.passStudentsTo = async (req, res) => {
  try {
    await StudentService.promoteStudents(req.schoolId, req.body);
    res.status(200).json({ message: 'Students promoted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

exports.dropAcademicYear = async (req, res) => {
  try {
    await StudentService.dropAcademicYear(req.body);
    res.status(200).json({ message: 'Students updated successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

exports.bulkImportStudents = async (req, res) => {
  try {
    const { schoolId, academicYearId, fileContent } = req.body;
    if (!schoolId || !academicYearId || !fileContent) {
      return res.status(400).json({ message: 'schoolId, academicYearId, and fileContent are required.' });
    }

    const mongoose = require('mongoose');
    const FieldRegistry = mongoose.model('FieldRegistry');
    const fields = await FieldRegistry.find({});
    const fieldMap = {};
    for (const f of fields) {
      fieldMap[f.key.toLowerCase()] = f._id.toString();
    }

    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      return res.status(400).json({ message: 'No student data found in the uploaded file.' });
    }

    // Detect separator (tab or comma)
    const headerLine = lines[0];
    const isTab = headerLine.includes('\t');
    const headers = headerLine.split(isTab ? '\t' : ',').map(h => h.trim().toLowerCase());

    let successCount = 0;
    let failCount = 0;
    const logs = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(isTab ? '\t' : ',').map(v => v.trim());
      const studentData = {
        academicYearId,
        dynamicFields: []
      };

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const val = values[j];
        if (!header || val === undefined || val === '') continue;

        if (header === 'class') {
          if (!studentData.enrollmentClass) {
            studentData.enrollmentClass = val;
          }
        } else if (header === 'section') {
          studentData.sectionId = val;
        } else if (header === 'admissionnumber') {
          studentData.admissionNumber = val;
        } else if (header === 'rollnumber') {
          studentData.rollNumber = val;
        } else if (header === 'lifecycle_status') {
          studentData.lifecycleStatus = val;
        } else if (header === 'academic_status') {
          studentData.academicStatus = val === 'No' ? 'Active' : val;
        } else {
          const fId = fieldMap[header.toLowerCase()];
          if (fId) {
            studentData.dynamicFields.push({ fieldId: fId, value: val });
          }
        }
      }

      try {
        await StudentService.registerStudent(schoolId, studentData);
        successCount++;
        const nameVal = values[headers.indexOf('fullname')] || 'Student';
        logs.push(`[OK] Imported student: ${nameVal}`);
      } catch (err) {
        failCount++;
        const nameVal = values[headers.indexOf('fullname')] || `Row ${i}`;
        logs.push(`[ERROR] Failed row ${i} (${nameVal}): ${err.message}`);
      }
    }

    res.status(200).json({
      message: `Import complete. Success: ${successCount}, Failed: ${failCount}`,
      data: { successCount, failCount, logs }
    });
  } catch (error) {
    res.status(500).json({ message: 'Bulk import failed', error: error.message });
  }
};

