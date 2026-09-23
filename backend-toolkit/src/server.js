// src/server.js
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import analysisRoutes from "./routes/analysis.js";
import dockerRoutes from "./routes/docker.js";
import fileRoutes from "./routes/files.js";
import indexRoutes from "./routes/index.js";
import outputRoutes from "./routes/outputs.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const FRONTEND_ORIGIN = "http://127.0.0.1:5173";

console.log("=== SERVER.JS STARTING ===", process.argv);

// Middleware
app.use(
  helmet({
    // Disable some restrictions for SSE to work properly
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

app.use(compression());

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving uses a writable per-user directory in packaged builds.
const dataRoot =
  process.env.NODE_ENV === "production"
    ? path.join(os.homedir(), ".dna-barcode-toolkit")
    : path.join(__dirname, "..");
const uploadsPath = path.join(dataRoot, "uploads");
const outputsPath = path.join(dataRoot, "outputs");

app.use("/uploads", express.static(uploadsPath));
app.use("/outputs", express.static(outputsPath));

// Routes
app.use("/api", indexRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/outputs", outputRoutes);
app.use("/api/docker", dockerRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

const LOOPBACK_HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, LOOPBACK_HOST, () => {
  logger.info(`Server running at http://${LOOPBACK_HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`Frontend URL: ${FRONTEND_ORIGIN}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`EADDRINUSE: Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error(`Server error: ${err.message}`);
    process.exit(1);
  }
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;
