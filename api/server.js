const http = require("http");
const mysql = require("mysql2/promise");

// Environment variables
const PORT = 3001;
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "example",
  database: process.env.DB_NAME || "mydatabase",
};

let connection;

// Initialize database connection with retry
async function initDB() {
  const maxRetries = 10;
  const retryDelay = 3000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      connection = await mysql.createConnection(DB_CONFIG);
      console.log("Database connected successfully");
      return;
    } catch (error) {
      console.log(
        `Database connection attempt ${i + 1}/${maxRetries} failed. Retrying in ${retryDelay}ms...`,
      );
      if (i === maxRetries - 1) {
        console.error("Database connection failed after all retries:", error);
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

// Parse JSON from request body
function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        if (body.trim() === "") {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

// CORS headers
function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Handle password check
async function handlePasswordCheck(req, res) {
  try {
    console.log("Handling password check request");

    const data = await parseJSON(req);
    console.log("Parsed data:", data);

    const { password } = data;
    if (!password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Password required");
      return;
    }

    const [rows] = await connection.execute(
      "SELECT id, password FROM access_passwords WHERE password = ?",
      [password],
    );

    if (Array.isArray(rows) && rows.length === 0) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain");
      res.end("Invalid password");
      return;
    }

    const user = rows[0];
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Password accepted",
        userId: user.id,
        password: user.password,
      }),
    );
  } catch (error) {
    console.error("Password check error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Internal server error");
  }
}

// Handle uploads list
async function handleUploadsList(req, res) {
  try {
    console.log("Handling uploads list request");

    const data = await parseJSON(req);
    const { password } = data;

    if (!password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Password required");
      return;
    }

    // Verify password and get user ID
    const [userRows] = await connection.execute(
      "SELECT id FROM access_passwords WHERE password = ?",
      [password],
    );

    if (Array.isArray(userRows) && userRows.length === 0) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain");
      res.end("Invalid password");
      return;
    }

    const userId = userRows[0].id;

    const [rows] = await connection.execute(
      "SELECT id, protocol_id, protocol_name, protocol_data, created_at, updated_at FROM protocols WHERE password_id = ? ORDER BY updated_at DESC",
      [userId],
    );

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(rows));
  } catch (error) {
    console.error("Uploads list error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Failed to fetch uploads");
  }
}

// Handle protocol data upload
async function handleProtocolUpload(req, res) {
  try {
    console.log("Handling protocol upload request");

    const data = await parseJSON(req);
    console.log("Parsed data:", data);

    const { password, protocol } = data;

    if (!password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Password required for upload");
      return;
    }

    if (!protocol) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Protocol data required");
      return;
    }

    // Verify password and get user ID
    const [userRows] = await connection.execute(
      "SELECT id FROM access_passwords WHERE password = ?",
      [password],
    );

    if (Array.isArray(userRows) && userRows.length === 0) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain");
      res.end("Invalid password");
      return;
    }

    const userId = userRows[0].id;
    const protocolJson = JSON.stringify(protocol);

    await connection.execute(
      "INSERT INTO protocols (password_id, protocol_id, protocol_name, protocol_data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE protocol_name = VALUES(protocol_name), protocol_data = VALUES(protocol_data), updated_at = CURRENT_TIMESTAMP",
      [userId, protocol.id, protocol.name || "Untitled Protocol", protocolJson],
    );

    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Protocol uploaded successfully",
        protocolId: protocol.id,
        protocolName: protocol.name,
        size: protocolJson.length,
        userId: userId,
      }),
    );
  } catch (error) {
    console.error("Protocol upload error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Protocol upload failed");
  }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  try {
    console.log(`${req.method} ${req.url}`);

    setCORSHeaders(res);

    // Handle OPTIONS requests for CORS
    if (req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }

    const url = req.url;
    const method = req.method;

    if (url === "/api/check-password" && method === "POST") {
      await handlePasswordCheck(req, res);
    } else if (url === "/api/uploads" && method === "POST") {
      await handleUploadsList(req, res);
    } else if (url === "/api/upload" && method === "POST") {
      await handleProtocolUpload(req, res);
    } else {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain");
      res.end("Not Found");
    }
  } catch (error) {
    console.error("Server error:", error);
    try {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end("Internal Server Error");
    } catch (writeError) {
      console.error("Failed to send error response:", writeError);
    }
  }
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});

// Start server
async function startServer() {
  try {
    await initDB();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Clean API server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle process errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer().catch(console.error);
