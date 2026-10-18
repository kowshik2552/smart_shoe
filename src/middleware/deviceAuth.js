module.exports = function deviceAuth(req, res, next) {
  const expected = process.env.DEVICE_API_KEY;
  if (!expected) return next(); // Set DEVICE_API_KEY in production to protect ingestion.
  const provided = req.header("x-device-key");
  if (provided !== expected) return res.status(401).json({ error: "Invalid device key" });
  next();
};