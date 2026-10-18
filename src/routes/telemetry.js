const express = require("express");
const Telemetry = require("../models/Telemetry");
const Alert = require("../models/Alert");
const deviceAuth = require("../middleware/deviceAuth");
const router = express.Router();

function finiteOrUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
function booleanOr(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

router.post("/", deviceAuth, async (req, res) => {
  try {
    const b = req.body || {};
    const data = {
      deviceId: String(b.deviceId || "smart-shoe-01").slice(0, 80),
      distanceCm: finiteOrUndefined(b.distanceCm),
      groundDistanceCm: finiteOrUndefined(b.groundDistanceCm),
      gasRaw: finiteOrUndefined(b.gasRaw),
      accelerationG: finiteOrUndefined(b.accelerationG),
      fallDetected: booleanOr(b.fallDetected),
      pressure: finiteOrUndefined(b.pressure),
      moisture: finiteOrUndefined(b.moisture),
      latitude: finiteOrUndefined(b.latitude),
      longitude: finiteOrUndefined(b.longitude),
      batteryPercent: finiteOrUndefined(b.batteryPercent),
      deviceOnline: booleanOr(b.deviceOnline, true),
      hazardFlags: {
        obstacle: booleanOr(b.hazardFlags?.obstacle),
        dropOff: booleanOr(b.hazardFlags?.dropOff),
        gas: booleanOr(b.hazardFlags?.gas),
        wetFloor: booleanOr(b.hazardFlags?.wetFloor),
        fall: booleanOr(b.hazardFlags?.fall, booleanOr(b.fallDetected))
      }
    };
    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) return res.status(400).json({ error: "Invalid latitude" });
    if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) return res.status(400).json({ error: "Invalid longitude" });

    const saved = await Telemetry.create(data);
    const hazards = [
      ["obstacle", data.hazardFlags.obstacle, "warning", "Obstacle detected ahead", data.distanceCm],
      ["dropOff", data.hazardFlags.dropOff, "critical", "Possible stair or drop-off detected", data.groundDistanceCm],
      ["gas", data.hazardFlags.gas, "critical", "Gas or smoke threshold exceeded", data.gasRaw],
      ["wetFloor", data.hazardFlags.wetFloor, "warning", "Wet surface detected", data.moisture],
      ["fall", data.hazardFlags.fall, "critical", "Possible fall detected", data.accelerationG]
    ];
    const createdAlerts = [];
    for (const [type, active, severity, message, sensorValue] of hazards) {
      if (active) {
        const recent = await Alert.findOne({ deviceId: data.deviceId, type, createdAt: { $gte: new Date(Date.now() - 15000) } });
        if (!recent) createdAlerts.push(await Alert.create({ deviceId: data.deviceId, type, severity, message, latitude: data.latitude, longitude: data.longitude, sensorValue }));
      }
    }
    res.status(201).json({ ok: true, telemetry: saved, alertsCreated: createdAlerts.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save telemetry. Check MongoDB connection." });
  }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "30", 10), 1), 200);
    const items = await Telemetry.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json(items);
  } catch (error) { res.status(500).json({ error: "Could not load telemetry" }); }
});

module.exports = router;