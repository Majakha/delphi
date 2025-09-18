const { BaseAPIError } = require('../errors/CustomErrors');

/**
 * Centralized Error Handler Middleware
 * Catches all errors and formats them into consistent API responses
 */

const errorHandler = (err, req, res, next) => {
  // Log error details for debugging (but don't expose sensitive info in response)
  console.error('API Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });

  // Handle custom API errors
  if (err instanceof BaseAPIError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        type: 'InvalidTokenError',
        message: 'Invalid access token',
        code: 'INVALID_TOKEN',
        statusCode: 401,
        timestamp: new Date().toISOString()
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        type: 'SessionExpiredError',
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        details: {
          expiredAt: err.expiredAt
        }
      }
    });
  }

  // Handle MySQL/Database errors
  if (err.code && err.code.startsWith('ER_')) {
    let message = 'Database operation failed';
    let statusCode = 500;
    let errorCode = 'DATABASE_ERROR';

    // Map common MySQL errors to user-friendly messages
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        message = 'Resource already exists';
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        break;
      case 'ER_NO_REFERENCED_ROW_2':
        message = 'Referenced resource does not exist';
        statusCode = 400;
        errorCode = 'INVALID_REFERENCE';
        break;
      case 'ER_ROW_IS_REFERENCED_2':
        message = 'Cannot delete resource that is being used';
        statusCode = 409;
        errorCode = 'RESOURCE_IN_USE';
        break;
      case 'ER_ACCESS_DENIED_ERROR':
        message = 'Database access denied';
        statusCode = 500;
        errorCode = 'DATABASE_ACCESS_DENIED';
        break;
      case 'ER_BAD_DB_ERROR':
        message = 'Database not found';
        statusCode = 500;
        errorCode = 'DATABASE_NOT_FOUND';
        break;
    }

    return res.status(statusCode).json({
      error: {
        type: 'DatabaseError',
        message,
        code: errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            mysqlCode: err.code,
            sqlMessage: err.sqlMessage
          }
        })
      }
    });
  }

  // Handle validation errors (from express-validator or similar)
  if (err.name === 'ValidationError' || (err.errors && Array.isArray(err.errors))) {
    return res.status(400).json({
      error: {
        type: 'ValidationError',
        message: 'Request validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: {
          errors: err.errors || [{ message: err.message }]
        }
      }
    });
  }

  // Handle multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: {
        type: 'ValidationError',
        message: 'File size exceeds limit',
        code: 'FILE_TOO_LARGE',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: {
          maxSize: err.limit,
          field: err.field
        }
      }
    });
  }

  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: {
        type: 'CORSError',
        message: 'Cross-origin request blocked',
        code: 'CORS_ERROR',
        statusCode: 403,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle syntax errors (malformed JSON, etc.)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        type: 'SyntaxError',
        message: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        statusCode: 400,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle rate limiting errors (from express-rate-limit)
  if (err.statusCode === 429 || err.status === 429) {
    return res.status(429).json({
      error: {
        type: 'RateLimitError',
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        details: {
          retryAfter: err.retryAfter || 60
        }
      }
    });
  }

  // Default fallback for unexpected errors
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'development'
    ? err.message
    : 'An unexpected error occurred';

  res.status(statusCode).json({
    error: {
      type: 'InternalServerError',
      message,
      code: 'INTERNAL_ERROR',
      statusCode,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          originalError: err.name,
          stack: err.stack
        }
      })
    }
  });
};

/**
 * 404 Handler for unmatched routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      type: 'NotFoundError',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      code: 'ENDPOINT_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      details: {
        method: req.method,
        path: req.originalUrl,
        availableEndpoints: {
          auth: ['/auth/login', '/auth/logout', '/auth/refresh'],
          users: ['/users'],
          sensors: ['/sensors'],
          sections: ['/sections'],
          subsections: ['/subsections'],
          protocols: ['/protocols'],
          health: ['/health']
        }
      }
    }
  });
};

/**
 * Async wrapper to catch async route errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
