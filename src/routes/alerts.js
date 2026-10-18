const express = require("express");
const Alert = require("../models/Alert");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
    const query = {};
    if (req.query.acknowledged === "true") query.acknowledged = true;
    if (req.query.acknowledged === "false") query.acknowledged = false;
    res.json(await Alert.find(query).sort({ createdAt: -1 }).limit(limit).lean());
  } catch (error) { res.status(500).json({ error: "Could not load alerts" }); }
});

router.patch("/:id/acknowledge", async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true }, { new: true });
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (error) { res.status(400).json({ error: "Invalid alert ID" }); }
});

router.delete("/", async (req, res) => {
  try { await Alert.deleteMany({}); res.json({ ok: true }); }
  catch (error) { res.status(500).json({ error: "Could not clear alerts" }); }
});
module.exports = router;