exports.validateClassInput = (req, res, next) => {
  const { className } = req.body;
  if (!className) {
    return res.status(400).json({ message: 'className is required' });
  }
  next();
};
