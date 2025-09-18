/**
 * Response Helper Utilities
 * Provides consistent API response formatting
 */

class ResponseHelper {
  /**
   * Send success response
   */
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...(data !== null && { data }),
      ...(meta && { meta })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created(res, data, message = 'Resource created successfully', meta = null) {
    return this.success(res, data, message, 201, meta);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    const meta = {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrevPage: pagination.page > 1
      }
    };

    return this.success(res, data, message, 200, meta);
  }

  /**
   * Send list response with count
   */
  static list(res, items, message = 'List retrieved successfully') {
    const meta = {
      count: Array.isArray(items) ? items.length : 0
    };

    return this.success(res, items, message, 200, meta);
  }

  /**
   * Send validation error response
   */
  static validationError(res, errors, message = 'Validation failed') {
    const response = {
      success: false,
      error: {
        type: 'ValidationError',
        message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        details: {
          errors: Array.isArray(errors) ? errors : [errors]
        }
      }
    };

    return res.status(400).json(response);
  }

  /**
   * Send authentication error response
   */
  static authError(res, message = 'Authentication required') {
    const response = {
      success: false,
      error: {
        type: 'AuthenticationError',
        message,
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(401).json(response);
  }

  /**
   * Send authorization error response
   */
  static forbidden(res, message = 'Access forbidden') {
    const response = {
      success: false,
      error: {
        type: 'AuthorizationError',
        message,
        code: 'AUTHORIZATION_ERROR',
        statusCode: 403,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(403).json(response);
  }

  /**
   * Send not found error response
   */
  static notFound(res, resource = 'Resource', message = null) {
    const response = {
      success: false,
      error: {
        type: 'NotFoundError',
        message: message || `${resource} not found`,
        code: 'NOT_FOUND',
        statusCode: 404,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(404).json(response);
  }

  /**
   * Send conflict error response
   */
  static conflict(res, message = 'Resource conflict') {
    const response = {
      success: false,
      error: {
        type: 'ConflictError',
        message,
        code: 'CONFLICT_ERROR',
        statusCode: 409,
        timestamp: new Date().toISOString()
      }
    };

    return res.status(409).json(response);
  }

  /**
   * Send rate limit error response
   */
  static rateLimit(res, retryAfter = 60) {
    const response = {
      success: false,
      error: {
        type: 'RateLimitError',
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        details: {
          retryAfter
        }
      }
    };

    return res.status(429).json(response);
  }

  /**
   * Send internal server error response
   */
  static serverError(res, message = 'Internal server error', details = null) {
    const response = {
      success: false,
      error: {
        type: 'InternalServerError',
        message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        ...(details && { details })
      }
    };

    return res.status(500).json(response);
  }

  /**
   * Send custom error response
   */
  static error(res, statusCode, message, errorCode = 'CUSTOM_ERROR', details = null) {
    const response = {
      success: false,
      error: {
        type: 'CustomError',
        message,
        code: errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(details && { details })
      }
    };

    return res.status(statusCode).json(response);
  }
}

/**
 * Express middleware to attach response helpers to res object
 */
const attachResponseHelpers = (req, res, next) => {
  // Attach helper methods to response object
  res.success = (data, message, meta) => ResponseHelper.success(res, data, message, 200, meta);
  res.created = (data, message, meta) => ResponseHelper.created(res, data, message, meta);
  res.noContent = () => ResponseHelper.noContent(res);
  res.paginated = (data, pagination, message) => ResponseHelper.paginated(res, data, pagination, message);
  res.list = (items, message) => ResponseHelper.list(res, items, message);
  res.validationError = (errors, message) => ResponseHelper.validationError(res, errors, message);
  res.authError = (message) => ResponseHelper.authError(res, message);
  res.forbidden = (message) => ResponseHelper.forbidden(res, message);
  res.notFound = (resource, message) => ResponseHelper.notFound(res, resource, message);
  res.conflict = (message) => ResponseHelper.conflict(res, message);
  res.rateLimit = (retryAfter) => ResponseHelper.rateLimit(res, retryAfter);
  res.serverError = (message, details) => ResponseHelper.serverError(res, message, details);
  res.error = (statusCode, message, errorCode, details) => ResponseHelper.error(res, statusCode, message, errorCode, details);

  next();
};

module.exports = {
  ResponseHelper,
  attachResponseHelpers
};
