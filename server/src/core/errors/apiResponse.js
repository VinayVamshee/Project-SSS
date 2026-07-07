const sendSuccess = (res, data, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    data
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

const sendError = (res, message, statusCode = 500, status = 'error') => {
  return res.status(statusCode).json({
    success: false,
    status,
    message
  });
};

module.exports = {
  sendSuccess,
  sendError
};
