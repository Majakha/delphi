const express = require("express");
const { initDB } = require("./database.js");

// Import route modules
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/users.js");
const sensorRoutes = require("./routes/sensors.js");
const subsectionRoutes = require("./routes/subsections.js");
const sectionRoutes = require("./routes/sections.js");
const protocolRoutes = require("./routes/protocols.js");

const app = express();
const PORT = process.env.PORT || 3101;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (if needed)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-access-token",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Delphi API v2",
  });
});

// Mount routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/sensors", sensorRoutes);
app.use("/subsections", subsectionRoutes);
app.use("/sections", sectionRoutes);
app.use("/protocols", protocolRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Delphi API v2",
    version: "2.0.0",
    endpoints: {
      auth: "/auth",
      users: "/users",
      sensors: "/sensors",
      subsections: "/subsections",
      sections: "/sections",
      protocols: "/protocols",
      health: "/health",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await initDB();
    console.log("Database initialized successfully");

    // Start the server
    app.listen(PORT, () => {
      console.log(`Delphi API v2 server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoints: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down server gracefully...");
  const { closeConnection } = require("./database.js");
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down server gracefully...");
  const { closeConnection } = require("./database.js");
  await closeConnection();
  process.exit(0);
});

// Start the server
startServer();
