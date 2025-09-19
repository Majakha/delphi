const express = require("express");
const { initDB } = require("./database.js");

// Import middleware
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/errorHandler.js");
const { attachResponseHelpers } = require("./utils/responseHelper.js");

// Import route modules
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/users.js");
const sensorRoutes = require("./routes/sensors.js");
const taskRoutes = require("./routes/tasks.js");
const domainRoutes = require("./routes/domains.js");
const protocolRoutes = require("./routes/protocols.js");

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 3001;

// Request parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy for proper IP handling
app.set("trust proxy", true);

// Attach response helpers to all routes
app.use(attachResponseHelpers);

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
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

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.success(
    {
      status: "OK",
      timestamp: new Date().toISOString(),
      service: "Delphi API v2",
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    },
    "Service is healthy",
  );
});

// Mount routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/sensors", sensorRoutes);
app.use("/tasks", taskRoutes);
app.use("/domains", domainRoutes);
app.use("/protocols", protocolRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.success(
    {
      message: "Delphi API v2 - New Schema",
      version: "2.0.0",
      documentation: "https://docs.delphi-api.com",
      endpoints: {
        auth: "/auth",
        users: "/users",
        sensors: "/sensors",
        tasks: "/tasks",
        domains: "/domains",
        protocols: "/protocols",
        health: "/health",
      },
      features: [
        "Authentication & Authorization with bcryptjs",
        "User Registration & Login",
        "Protocol-based Task Management",
        "Global Templates with User Customization",
        "Comprehensive Error Handling",
        "Input Validation",
        "Structured API Responses",
        "Database Transaction Support",
      ],
    },
    "Welcome to Delphi API v2 - New Schema Implementation",
  );
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handler (must be last middleware)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    await initDB();
    console.log("✅ Database initialized successfully");

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Delphi API v2 server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API endpoints: http://localhost:${PORT}/`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

      if (process.env.NODE_ENV === "development") {
        console.log(`🔧 Development mode: Enhanced logging enabled`);
      }
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", error);
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n⚡ Received ${signal}. Shutting down gracefully...`);

  try {
    const { closeConnection } = require("./database.js");
    await closeConnection();
    console.log("✅ Database connections closed");

    console.log("✅ Server shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start the server
startServer();
