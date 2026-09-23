// server.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const app = express();
const LOOPBACK_HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;

// middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100mb" }));

// mount routes
app.use("/api/sequences", require("./routes/sequences"));
app.use("/api/haplotypes", require("./routes/haplotypes"));
// app.use("/api/files", require("./routes/files"));

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal Server Error" });
});

const server = app.listen(PORT, LOOPBACK_HOST, () => {
  console.log(`Server running at http://${LOOPBACK_HOST}:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`EADDRINUSE: Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});
