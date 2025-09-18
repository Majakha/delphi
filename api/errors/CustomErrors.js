/**
 * Custom Error Classes for Delphi API
 * Provides structured error handling with proper HTTP status codes
 */

class BaseAPIError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        type: this.name,
        message: this.message,
        code: this.errorCode,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details })
      }
    };
  }
}

class ValidationError extends BaseAPIError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends BaseAPIError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

class AuthorizationError extends BaseAPIError {
  constructor(message = 'Access forbidden', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

class NotFoundError extends BaseAPIError {
  constructor(resource = 'Resource', details = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends BaseAPIError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

class DatabaseError extends BaseAPIError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

class ExternalServiceError extends BaseAPIError {
  constructor(service, message = 'External service unavailable', details = null) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

class RateLimitError extends BaseAPIError {
  constructor(message = 'Rate limit exceeded', details = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
  }
}

class InvalidTokenError extends AuthenticationError {
  constructor(details = null) {
    super('Invalid or expired access token', details);
    this.errorCode = 'INVALID_TOKEN';
  }
}

class MissingTokenError extends AuthenticationError {
  constructor() {
    super('Access token required');
    this.errorCode = 'MISSING_TOKEN';
  }
}

class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid credentials provided');
    this.errorCode = 'INVALID_CREDENTIALS';
  }
}

class SessionExpiredError extends AuthenticationError {
  constructor() {
    super('Session has expired');
    this.errorCode = 'SESSION_EXPIRED';
  }
}

module.exports = {
  BaseAPIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  InvalidTokenError,
  MissingTokenError,
  InvalidCredentialsError,
  SessionExpiredError
};
