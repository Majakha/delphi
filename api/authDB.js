const { getPool } = require("./database.js");
const jwt = require("jsonwebtoken");
const {
  AuthenticationError,
  InvalidTokenError,
  MissingTokenError,
  SessionExpiredError,
  DatabaseError,
} = require("./errors/CustomErrors.js");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * Execute internal system query (no auth required for system operations)
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise} Query results
 */
async function executeSystemQuery(query, params = []) {
  try {
    const pool = getPool();
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error("System query execution failed:", {
      query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
      error: error.message,
    });
    throw new DatabaseError("System query execution failed", {
      originalError: error.message,
      query: query.substring(0, 100),
    });
  }
}

/**
 * Verify JWT token and return user context
 * @param {string} token - JWT token
 * @returns {Promise<object>} User context with userId
 */
async function verifyToken(token) {
  if (!token?.trim()) {
    throw new MissingTokenError();
  }

  try {
    // Verify JWT token structure and signature
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token exists in database and is valid (using system query)
    const rows = await executeSystemQuery(
      "SELECT user_id, expires_at FROM access_tokens WHERE token = ? AND expires_at > NOW()",
      [token],
    );

    if (rows.length === 0) {
      // Check if token exists but is expired
      const expiredTokenRows = await executeSystemQuery(
        "SELECT user_id, expires_at FROM access_tokens WHERE token = ?",
        [token],
      );

      if (expiredTokenRows.length > 0) {
        throw new SessionExpiredError();
      } else {
        throw new InvalidTokenError();
      }
    }

    return {
      userId: rows[0].user_id,
      token: token,
      expiresAt: rows[0].expires_at,
    };
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new InvalidTokenError("Invalid token format or signature");
    } else if (error.name === "TokenExpiredError") {
      throw new SessionExpiredError();
    } else if (error instanceof AuthenticationError) {
      // Re-throw our custom auth errors
      throw error;
    } else {
      console.error("Token verification error:", error);
      throw new AuthenticationError("Token verification failed", {
        originalError: error.message,
      });
    }
  }
}

/**
 * Authenticated query execution - requires valid token
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @param {string} token - Authentication token
 * @returns {Promise} Query results
 */
async function executeAuthQuery(query, params = [], token) {
  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [rows] = await pool.execute(query, params);

    // Log query execution for audit (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(`Query executed by user ${userContext.userId}:`, {
        query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
        timestamp: new Date().toISOString(),
      });
    }

    return rows;
  } catch (error) {
    console.error("Authenticated query execution failed:", {
      userId: userContext.userId,
      query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
      error: error.message,
    });

    // Let MySQL errors bubble up to be handled by the error handler
    throw error;
  }
}

/**
 * Execute authenticated query and return first row
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @param {string} token - Authentication token
 * @returns {Promise} First row or null
 */
async function executeAuthQueryOne(query, params = [], token) {
  const rows = await executeAuthQuery(query, params, token);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute authenticated INSERT query
 * @param {string} query - SQL INSERT query
 * @param {array} params - Query parameters
 * @param {string} token - Authentication token
 * @returns {Promise} Insert ID
 */
async function executeAuthInsert(query, params = [], token) {
  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [result] = await pool.execute(query, params);

    if (process.env.NODE_ENV === "development") {
      console.log(`Insert executed by user ${userContext.userId}:`, {
        insertId: result.insertId,
        timestamp: new Date().toISOString(),
      });
    }

    return result.insertId;
  } catch (error) {
    console.error("Authenticated insert failed:", {
      userId: userContext.userId,
      error: error.message,
    });

    // Let MySQL errors bubble up to be handled by the error handler
    throw error;
  }
}

/**
 * Execute authenticated UPDATE/DELETE query
 * @param {string} query - SQL UPDATE/DELETE query
 * @param {array} params - Query parameters
 * @param {string} token - Authentication token
 * @returns {Promise} Affected rows count
 */
async function executeAuthUpdate(query, params = [], token) {
  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [result] = await pool.execute(query, params);

    if (process.env.NODE_ENV === "development") {
      console.log(`Update executed by user ${userContext.userId}:`, {
        affectedRows: result.affectedRows,
        timestamp: new Date().toISOString(),
      });
    }

    return result.affectedRows;
  } catch (error) {
    console.error("Authenticated update failed:", {
      userId: userContext.userId,
      error: error.message,
    });

    // Let MySQL errors bubble up to be handled by the error handler
    throw error;
  }
}

/**
 * Execute authenticated transaction
 * @param {array} queries - Array of {query, params} objects
 * @param {string} token - Authentication token
 * @returns {Promise} Array of results
 */
async function executeAuthTransaction(queries, token) {
  const userContext = await verifyToken(token);
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params = [] } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }

    await connection.commit();

    if (process.env.NODE_ENV === "development") {
      console.log(`Transaction executed by user ${userContext.userId}:`, {
        queryCount: queries.length,
        timestamp: new Date().toISOString(),
      });
    }

    return results;
  } catch (error) {
    await connection.rollback();
    console.error("Authenticated transaction failed:", {
      userId: userContext.userId,
      error: error.message,
    });

    throw new DatabaseError("Transaction failed", {
      originalError: error.message,
      userId: userContext.userId,
      queryCount: queries.length,
    });
  } finally {
    connection.release();
  }
}

/**
 * Middleware to extract and validate token from request headers
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function requireAuth(req, res, next) {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.headers["x-access-token"] ||
      req.query.token ||
      req.body?.token ||
      req.body?.access_token ||
      req.body?.["x-access-token"];

    if (!token?.trim()) {
      throw new MissingTokenError();
    }

    req.token = token;
    next();
  } catch (error) {
    // Pass the error to the error handler middleware
    next(error);
  }
}

/**
 * Get user context from token (without database verification)
 * Used for quick token decoding when database check is not needed
 * @param {string} token - JWT token
 * @returns {object} Decoded token data
 */
function getUserContext(token) {
  try {
    if (!token?.trim()) {
      throw new MissingTokenError();
    }

    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new InvalidTokenError("Invalid token format or signature");
    } else if (error.name === "TokenExpiredError") {
      throw new SessionExpiredError();
    } else if (error instanceof AuthenticationError) {
      throw error;
    } else {
      throw new AuthenticationError("Failed to decode token", {
        originalError: error.message,
      });
    }
  }
}

/**
 * Async wrapper for auth middleware - catches async auth errors
 * @param {function} fn - Async middleware function
 * @returns {function} Express middleware
 */
function asyncAuthWrapper(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function optionalAuth(req, res, next) {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.headers["x-access-token"] ||
      req.query.token ||
      req.body?.token ||
      req.body?.access_token ||
      req.body?.["x-access-token"];

    if (token?.trim()) {
      req.token = token;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail - just continue without token
    next();
  }
}

module.exports = {
  executeSystemQuery,
  verifyToken,
  executeAuthQuery,
  executeAuthQueryOne,
  executeAuthInsert,
  executeAuthUpdate,
  executeAuthTransaction,
  requireAuth,
  getUserContext,
  asyncAuthWrapper,
  optionalAuth,
};
