const AcademicService = require('../services/AcademicService');

exports.getAcademicYears = async (req, res) => {
  try {
    const years = await AcademicService.getAcademicYears();
    res.json(years);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const classes = await AcademicService.getClasses();
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await AcademicService.getSubjects();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCurriculums = async (req, res) => {
  try {
    const links = await AcademicService.getCurriculums();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
