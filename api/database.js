const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
};

// Validate required environment variables
const requiredVars = [
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_PORT",
];
const missing = requiredVars.filter((varName) => !process.env[varName]);

if (missing.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missing.join(", "),
  );
  console.error("💡 Make sure to create and configure .env");
  process.exit(1);
}

let pool;

async function initDB() {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${maxRetries}...`);

      pool = mysql.createPool({
        ...DB_CONFIG,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        // Additional MySQL 8.0 compatibility
        authPlugins: {
          mysql_native_password: () => () => Buffer.alloc(0),
        },
      });

      // Test the connection
      const connection = await pool.getConnection();
      console.log("Database connected successfully");
      console.log(
        `Connected to MySQL database: ${DB_CONFIG.database} on ${DB_CONFIG.host}:${DB_CONFIG.port}`,
      );
      connection.release();

      // Clean up expired tokens periodically (every hour)
      setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

      return; // Success, exit retry loop
    } catch (error) {
      console.error(
        `Database connection attempt ${attempt}/${maxRetries} failed:`,
        {
          message: error.message,
          code: error.code,
          errno: error.errno,
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          database: DB_CONFIG.database,
          user: DB_CONFIG.user,
        },
      );

      if (attempt === maxRetries) {
        console.error("Database connection failed after all retries:", error);
        throw error;
      }

      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

async function cleanupExpiredTokens() {
  try {
    if (!pool) {
      console.warn("Database pool not available for token cleanup");
      return;
    }

    const [result] = await pool.execute(
      "DELETE FROM access_tokens WHERE expires_at < NOW()",
    );

    if (result.affectedRows > 0) {
      console.log(`Cleaned up ${result.affectedRows} expired tokens`);
    }
  } catch (error) {
    console.error("Failed to cleanup expired tokens:", error);
    // Non-critical error, don't throw
  }
}

function getPool() {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initDB() first.");
  }
  return pool;
}

async function testConnection() {
  try {
    const testPool = getPool();
    const [rows] = await testPool.execute("SELECT 1 as test");
    return rows[0].test === 1;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

async function closeConnection() {
  try {
    if (pool) {
      await pool.end();
      console.log("Database connection closed");
    }
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

module.exports = {
  initDB,
  getPool,
  cleanupExpiredTokens,
  testConnection,
  closeConnection,
};
