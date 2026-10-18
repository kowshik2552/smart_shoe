const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  deviceId: { type: String, default: "smart-shoe-01", index: true },
  type: { type: String, required: true, enum: ["obstacle", "dropOff", "gas", "wetFloor", "fall", "device"] },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "warning" },
  message: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  sensorValue: mongoose.Schema.Types.Mixed,
  acknowledged: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Alert", alertSchema);