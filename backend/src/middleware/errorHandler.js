function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error("[error]", err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || "Something went wrong on our end. Please try again."
  });
}

module.exports = { notFound, errorHandler };
