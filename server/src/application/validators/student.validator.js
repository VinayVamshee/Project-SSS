exports.validateAddStudent = (req, res, next) => {
  const { academicYearId, enrollmentClass } = req.body;
  if (!academicYearId) {
    return res.status(400).json({ message: 'Academic Year ID is required.' });
  }
  if (!enrollmentClass) {
    return res.status(400).json({ message: 'Enrollment Class is required.' });
  }
  next();
};
