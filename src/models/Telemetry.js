const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema({
  deviceId: { type: String, default: "smart-shoe-01", index: true },
  distanceCm: Number,
  groundDistanceCm: Number,
  gasRaw: Number,
  accelerationG: Number,
  fallDetected: { type: Boolean, default: false },
  pressure: Number,
  moisture: Number,
  latitude: Number,
  longitude: Number,
  batteryPercent: Number,
  deviceOnline: { type: Boolean, default: true },
  hazardFlags: {
    obstacle: { type: Boolean, default: false },
    dropOff: { type: Boolean, default: false },
    gas: { type: Boolean, default: false },
    wetFloor: { type: Boolean, default: false },
    fall: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model("Telemetry", telemetrySchema);