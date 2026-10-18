# StrideGuard — ESP32 Smart Shoe Safety Dashboard

A dark gradient dashboard and Node.js/Express + MongoDB API for the ESP32-based Smart Shoe Real-Time Hazard Detection project.

## Features
- Animated dark navy / blue / teal dashboard
- Sensor telemetry: HC-SR04, VL53L0X, MQ-2, MPU6050, FSR 402 and moisture sensor
- GPS map using Leaflet + OpenStreetMap, plus Google Maps link
- Alert history, acknowledgement and clearing
- Express API for telemetry ingestion and MongoDB persistence
- Optional device API key protection
- Demo mode until real ESP32 telemetry is connected

## Important hardware notes
Your component list does not mention the ESP32 DevKit, but the project PDF specifies it as the main controller. The ESP32 is required to read the sensors and send telemetry. TP4056 and MT3608 are power modules, not data sensors. The dashboard cannot read sensor values directly from the charging module, boost converter, buzzer or vibration motor. Battery percentage requires a battery-voltage measurement circuit/sensor and firmware calculation; it is shown as unavailable unless provided.

**Electrical safety:** HC-SR04 Echo is commonly 5 V and must not connect directly to an ESP32 GPIO. Use a suitable voltage divider/level shifter. Check each module's output voltage and the ESP32's 3.3 V limits. Use a transistor driver for the vibration motor/buzzer as needed; do not power motors directly from GPIO. Validate battery charging, protection and boost-converter wiring before wearable use. The MQ-2 is a heated sensor and may draw substantial current; evaluate power and placement before mounting on footwear. Prototype alerts are not a substitute for certified safety equipment.

## Run locally
1. Install Node.js 18+ and MongoDB, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`.
3. Set `MONGO_URI`. For production, also set a long random `DEVICE_API_KEY`.
4. Install dependencies and start:

   ```bash
   npm install
   npm start
   ```

5. Open `http://localhost:3000`.
6. Click **Connect device**, choose **Live API**, and use `http://localhost:3000` as the API base URL for local testing.

## API endpoints
- `GET /api/health` — API and database status
- `GET /api/latest` — latest telemetry document
- `GET /api/telemetry?limit=30` — recent telemetry
- `POST /api/telemetry` — ingest ESP32 JSON; include `x-device-key` if `DEVICE_API_KEY` is set
- `GET /api/alerts?limit=50` — alert history
- `PATCH /api/alerts/:id/acknowledge` — acknowledge an alert
- `DELETE /api/alerts` — clear alert history (protect this endpoint before exposing it publicly)

### Telemetry JSON schema
```json
{
  "deviceId": "smart-shoe-01",
  "distanceCm": 84,
  "groundDistanceCm": 12.4,
  "gasRaw": 186,
  "accelerationG": 1.02,
  "fallDetected": false,
  "pressure": 68,
  "moisture": 18,
  "latitude": 11.0168,
  "longitude": 76.9558,
  "batteryPercent": 82,
  "deviceOnline": true,
  "hazardFlags": {
    "obstacle": false,
    "dropOff": false,
    "gas": false,
    "wetFloor": false,
    "fall": false
  }
}
```

Example POST with curl:
```bash
curl -X POST http://localhost:3000/api/telemetry \\
  -H "Content-Type: application/json" \\
  -H "x-device-key: replace_with_a_long_random_secret" \\
  -d '{"distanceCm":84,"groundDistanceCm":12.4,"gasRaw":186,"accelerationG":1.02,"fallDetected":false,"pressure":68,"moisture":18,"latitude":11.0168,"longitude":76.9558,"batteryPercent":82,"deviceOnline":true,"hazardFlags":{"obstacle":false,"dropOff":false,"gas":false,"wetFloor":false,"fall":false}}'
```

## Thresholds
The UI has illustrative defaults (obstacle below 100 cm, gas raw value 500, moisture 60). These are not validated medical or safety thresholds. Calibrate on the actual sensors, account for false positives, and prefer firmware-generated `hazardFlags` after testing. Drop-off detection should compare against a learned/calibrated ground-distance baseline.

## Deploy
- Push the project to GitHub.
- Deploy as a Node web service on Render.
- Build command: `npm install`
- Start command: `npm start`
- Set environment variables: `MONGO_URI`, `DEVICE_API_KEY`, and `FRONTEND_ORIGIN`.
- Keep `.env` out of Git. Restrict destructive/admin endpoints and use HTTPS in production.

The NEO-6M GPS may not get a fix indoors. The map initially shows a clearly labelled demo point in Coimbatore; live coordinates replace it when telemetry arrives.
