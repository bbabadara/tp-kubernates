const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      errors: err.errors.map((e) => e.message),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      errors: ['Ce produit existe déjà'],
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Erreur interne du serveur';

  res.status(statusCode).json({
    success: false,
    errors: [message],
  });
};

module.exports = errorHandler;
