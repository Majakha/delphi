const { getPool } = require("./database.js");
const jwt = require("jsonwebtoken");
const DatabaseQueries = require("./queries.js");
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
 * Execute system query using DatabaseQueries structure
 * @param {object} queryObj - Query object from DatabaseQueries
 * @returns {Promise} Query results
 */
async function executeSystemQueryObj(queryObj) {
  return executeSystemQuery(queryObj.query, queryObj.params);
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

    // Check if token exists in database and is valid
    const queryObj = DatabaseQueries.tokens.getByValue(token);
    const rows = await executeSystemQueryObj(queryObj);

    if (rows.length === 0) {
      // Check if token exists but is expired
      const expiredTokenQuery = `SELECT user_id, expires_at FROM access_tokens WHERE token = ?`;
      const expiredTokenRows = await executeSystemQuery(expiredTokenQuery, [
        token,
      ]);

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
 * Execute authenticated query using DatabaseQueries structure
 * @param {object} queryObj - Query object from DatabaseQueries
 * @param {string} token - Authentication token
 * @returns {Promise} Query results
 */
async function executeAuthQueryObj(queryObj, token) {
  return executeAuthQuery(queryObj.query, queryObj.params, token);
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
 * Execute authenticated query (object version) and return first row
 * @param {object} queryObj - Query object from DatabaseQueries
 * @param {string} token - Authentication token
 * @returns {Promise} First row or null
 */
async function executeAuthQueryOneObj(queryObj, token) {
  const rows = await executeAuthQueryObj(queryObj, token);
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
 * Execute authenticated INSERT query using DatabaseQueries structure
 * @param {object} queryObj - Query object from DatabaseQueries
 * @param {string} token - Authentication token
 * @returns {Promise} Insert ID or affected rows
 */
async function executeAuthInsertObj(queryObj, token) {
  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [result] = await pool.execute(queryObj.query, queryObj.params);

    if (process.env.NODE_ENV === "development") {
      console.log(`Insert executed by user ${userContext.userId}:`, {
        insertId: result.insertId,
        affectedRows: result.affectedRows,
        timestamp: new Date().toISOString(),
      });
    }

    return result.insertId || result.affectedRows;
  } catch (error) {
    console.error("Authenticated insert failed:", {
      userId: userContext.userId,
      error: error.message,
    });

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
 * Execute authenticated UPDATE/DELETE query using DatabaseQueries structure
 * @param {object} queryObj - Query object from DatabaseQueries
 * @param {string} token - Authentication token
 * @returns {Promise} Affected rows count
 */
async function executeAuthUpdateObj(queryObj, token) {
  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [result] = await pool.execute(queryObj.query, queryObj.params);

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
 * Execute authenticated transaction using DatabaseQueries objects
 * @param {array} queryObjs - Array of query objects from DatabaseQueries
 * @param {string} token - Authentication token
 * @returns {Promise} Array of results
 */
async function executeAuthTransactionObjs(queryObjs, token) {
  const queries = queryObjs.map((obj) => ({
    query: obj.query,
    params: obj.params,
  }));
  return executeAuthTransaction(queries, token);
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

/**
 * Helper function to generate UUIDs
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = {
  executeSystemQuery,
  executeSystemQueryObj,
  verifyToken,
  executeAuthQuery,
  executeAuthQueryObj,
  executeAuthQueryOne,
  executeAuthQueryOneObj,
  executeAuthInsert,
  executeAuthInsertObj,
  executeAuthUpdate,
  executeAuthUpdateObj,
  executeAuthTransaction,
  executeAuthTransactionObjs,
  requireAuth,
  getUserContext,
  asyncAuthWrapper,
  optionalAuth,
  generateUUID,
};
