exports.validateSaveFees = (req, res, next) => {
  const { studentId, academicYear, totalFees } = req.body;
  if (!studentId) {
    return res.status(400).json({ message: 'studentId is required' });
  }
  if (!academicYear) {
    return res.status(400).json({ message: 'academicYear is required' });
  }
  if (totalFees === undefined || totalFees === null) {
    return res.status(400).json({ message: 'totalFees is required' });
  }
  next();
};
