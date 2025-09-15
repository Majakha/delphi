const { getPool } = require("./database.js");
const jwt = require("jsonwebtoken");

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
    throw error;
  }
}

/**
 * Verify JWT token and return user context
 * @param {string} token - JWT token
 * @returns {Promise<object>} User context with userId
 */
async function verifyToken(token) {
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token exists in database and is valid (using system query)
    const rows = await executeSystemQuery(
      "SELECT user_id FROM access_tokens WHERE token = ? AND expires_at > NOW()",
      [token],
    );

    if (rows.length === 0) {
      throw new Error("Token not found or expired");
    }

    return {
      userId: rows[0].user_id,
      token: token,
    };
  } catch (error) {
    throw new Error("Invalid or expired token");
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
  if (!token) {
    throw new Error("Authentication token required");
  }

  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [rows] = await pool.execute(query, params);

    // Log query execution for audit
    console.log(`Query executed by user ${userContext.userId}:`, {
      query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
      timestamp: new Date().toISOString(),
    });

    return rows;
  } catch (error) {
    console.error("Authenticated query execution failed:", {
      userId: userContext.userId,
      query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
      error: error.message,
    });
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
  if (!token) {
    throw new Error("Authentication token required");
  }

  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [result] = await pool.execute(query, params);

    console.log(`Insert executed by user ${userContext.userId}:`, {
      insertId: result.insertId,
      timestamp: new Date().toISOString(),
    });

    return result.insertId;
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
  if (!token) {
    throw new Error("Authentication token required");
  }

  const userContext = await verifyToken(token);

  try {
    const pool = getPool();
    const [result] = await pool.execute(query, params);

    console.log(`Update executed by user ${userContext.userId}:`, {
      affectedRows: result.affectedRows,
      timestamp: new Date().toISOString(),
    });

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
  if (!token) {
    throw new Error("Authentication token required");
  }

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

    console.log(`Transaction executed by user ${userContext.userId}:`, {
      queryCount: queries.length,
      timestamp: new Date().toISOString(),
    });

    return results;
  } catch (error) {
    await connection.rollback();
    console.error("Authenticated transaction failed:", {
      userId: userContext.userId,
      error: error.message,
    });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Middleware to extract token from request headers
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function requireAuth(req, res, next) {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-access-token"] ||
    req.query.token ||
    req.body?.token ||
    req.body?.access_token ||
    req.body?.["x-access-token"];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  req.token = token;
  next();
}

/**
 * Get user context from token (without database verification)
 * @param {string} token - JWT token
 * @returns {object} Decoded token data
 */
function getUserContext(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token format");
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
};
