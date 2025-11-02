/**
 * Custom error handler middleware
 * Catches and formats errors in a consistent way
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      statusCode: 404,
      error: {
        code: 'NOT_FOUND',
        message
      }
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = {
      statusCode: 400,
      error: {
        code: 'DUPLICATE_ENTRY',
        message,
        field
      }
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    error = {
      statusCode: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details
      }
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      error: {
        code: 'AUTH_FAILED',
        message: 'Invalid token'
      }
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      error: {
        code: 'AUTH_FAILED',
        message: 'Token expired'
      }
    };
  }

  // Default error response
  const statusCode = error.statusCode || err.statusCode || 500;
  const errorResponse = error.error || {
    code: 'SERVER_ERROR',
    message: error.message || 'Internal server error'
  };

  res.status(statusCode).json({
    success: false,
    error: errorResponse
  });
};

module.exports = errorHandler;
