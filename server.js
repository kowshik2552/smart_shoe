require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const telemetryRoutes = require("./src/routes/telemetry");
const alertRoutes = require("./src/routes/alerts");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "StrideGuard API", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", time: new Date().toISOString() });
});
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/alerts", alertRoutes);
app.get("/api/latest", async (req, res) => {
  try {
    const Telemetry = require("./src/models/Telemetry");
    const latest = await Telemetry.findOne().sort({ createdAt: -1 }).lean();
    res.json(latest || {});
  } catch (error) { res.status(500).json({ error: "Could not load latest telemetry" }); }
});
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const port = process.env.PORT || 3000;
async function start() {
  if (process.env.MONGO_URI) {
    try { await mongoose.connect(process.env.MONGO_URI); console.log("MongoDB connected"); }
    catch (err) { console.error("MongoDB connection failed:", err.message); }
  } else {
    console.warn("MONGO_URI is not set. API starts, but database-backed endpoints will fail.");
  }
  app.listen(port, () => console.log(`StrideGuard running on http://localhost:${port}`));
}
start();