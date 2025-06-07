const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const pool = require("../postgres");


const router = express.Router();


const statusSchema = new mongoose.Schema({
  device_id: String,
  token: String,
  status: String,
  last_update: { type: Date, default: Date.now },
});

const esp32DataSchema = new mongoose.Schema({
  device_id: { type: String, required: true },
  plantType: { type: String, required: true },
  liquidType: { type: String, required: true },
  chemicalName: { type: String, required: true },
  area: { type: String, required: true },
  other: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
});

const esp32SensorSchema = new mongoose.Schema({
  device_id: { type: String, required: true },
  battery: { type: String, required: true },
  pumpStatus: { type: String, required: true },
  sprayRate: { type: String, required: true },
  waterLevel: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Mongo Models (แก้ไขเพื่อไม่ให้เกิด OverwriteModelError)
const Status = mongoose.models.Status || mongoose.model("Status", statusSchema);
const Esp32Data =
  mongoose.models.Esp32Data || mongoose.model("Esp32Data", esp32DataSchema);
const Esp32Sensor =
  mongoose.models.Esp32Sensor ||
  mongoose.model("Esp32Sensor", esp32SensorSchema);

// Middleware: Authentication
const authenticateDevice = async (req, res, next) => {
  const { device_id, token } = req.headers;

  if (!device_id || !token) {
    return res.status(401).send("Authentication required!");
  }

  try {
    const device = await Status.findOne({ device_id, token });
    if (!device) {
      return res.status(403).send("Invalid token or device ID!");
    }
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    res.status(500).send("Server error!");
  }
};

// POST: /generate-token
router.post("/generate-token", async (req, res) => {
  const { device_id } = req.body;
  console.log("Received Request:", req.body);

  if (!device_id) {
    return res
      .status(400)
      .json({ success: false, message: "Device ID is required." });
  }

  try {
    const token = crypto.randomBytes(16).toString("hex");

    const result = await Status.findOneAndUpdate(
      { device_id },
      { token, $setOnInsert: { status: "offline" } },
      { upsert: true, new: true }
    );

    await pool.query(`
  INSERT INTO robots (token)
  VALUES ($1)
  ON CONFLICT (token)
  DO NOTHING;
`, [token]);


    res.json({
      success: true,
      token,
      status: result.status,
    });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST: /esp32-status
router.post("/esp32-status", async (req, res) => {
  const { device_id, token, status } = req.body;

  if (!device_id || !token) {
    return res
      .status(400)
      .json({ success: false, message: "Device ID and Token are required." });
  }

  try {
    const device = await Status.findOne({ device_id, token });
    if (!device) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Token." });
    }

    device.status = status;
    device.last_update = new Date();
    await device.save();

    res.json({ success: true, data: device });
  } catch (err) {
    console.error("Error updating MongoDB:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST: /esp32-data
router.post("/esp32-data", async (req, res) => {
  const { device_id, plantType, liquidType, chemicalName, area, other } =
    req.body;

  if (!device_id || !plantType || !liquidType || !chemicalName || !area) {
    return res.status(400).send("Missing required fields!");
  }

  try {
    const newData = new Esp32Data({
      device_id,
      plantType,
      liquidType,
      chemicalName,
      area,
      other: other || "",
    });
    await newData.save();
    res.status(200).send("Data saved successfully!");
  } catch (err) {
    console.error("Error saving data:", err);
    res.status(500).send("Server error!");
  }
});

// POST: /esp32-sensor
router.post("/esp32-sensor", authenticateDevice, async (req, res) => {
  const { device_id, battery, pumpStatus, sprayRate, waterLevel } = req.body;

  if (
    !device_id ||
    battery == null ||
    pumpStatus == null ||
    sprayRate == null ||
    waterLevel == null
  ) {
    return res.status(400).send("Missing required fields!");
  }

  try {
    const newSensorData = new Esp32Sensor({
      device_id,
      battery,
      pumpStatus,
      sprayRate,
      waterLevel,
    });

    await newSensorData.save();
    res.status(200).send("Sensor data saved successfully!");
  } catch (err) {
    console.error("Error saving sensor data:", err);
    res.status(500).send("Server error!");
  }
});

// ตรวจสอบสถานะและปรับ offline
const CHECK_INTERVAL = 60000; 
const TIMEOUT_LIMIT = 2 * 10000; 

setInterval(async () => {
  const now = new Date();
  try {
    const result = await Status.updateMany(
      { last_update: { $lt: new Date(now - TIMEOUT_LIMIT) }, status: "online" },
      { $set: { status: "offline" } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} devices to offline.`);
    }
  } catch (err) {
    console.error("Error checking device statuses:", err);
  }
}, CHECK_INTERVAL);

module.exports = router;
