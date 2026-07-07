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
