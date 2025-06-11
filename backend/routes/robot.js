const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

const app = express();

// Config MongoDB
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/esp32_db';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// Config PostgreSQL
const pgPool = new Pool({
  connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`
});

// Mongo Schema: สำหรับสถานะอุปกรณ์
const statusSchema = new mongoose.Schema({
  device_id: String,
  token: String,
  status: String,
  last_update: { type: Date, default: Date.now }
});
const Status = mongoose.model('Status', statusSchema);

// Mongo Schema: สำหรับ sensor data (เพิ่มส่วนนี้)
const esp32SensorSchema = new mongoose.Schema({
  device_id: String,
  battery: Number,
  sprayRate: Number,
  waterLevel: Number,
  pumpStatus: String,
  timestamp: { type: Date, default: Date.now }
});
const Esp32Sensor = mongoose.model('Esp32Sensor', esp32SensorSchema);

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });

  const tokenJWT = authHeader.split(' ')[1];
  if (!tokenJWT) return res.status(401).json({ message: 'Token not found' });

  jwt.verify(tokenJWT, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// POST /connect-robot
router.post('/connect-robot', authenticateJWT, async (req, res) => {
  const { token, robot_name } = req.body;
  const user_id = req.user.id;

  if (!token || !robot_name) {
    return res.status(400).json({ success: false, message: 'Token and robot_name required' });
  }

  try {
    const device = await Status.findOne({ token });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    const pgClient = await pgPool.connect();
    try {
      const selectQuery = 'SELECT * FROM robots WHERE token = $1';
      const selectResult = await pgClient.query(selectQuery, [token]);

      if (selectResult.rows.length === 0) {
        const insertQuery = `
          INSERT INTO robots (user_id, token, robot_name)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        const insertResult = await pgClient.query(insertQuery, [user_id, token, robot_name]);
        res.json({ success: true, message: 'เชื่อมต่อสำเร็จ', data: insertResult.rows[0] });
      } else {
        const existing = selectResult.rows[0];
        if (existing.robot_name !== robot_name) {
          const updateQuery = `
            UPDATE robots SET robot_name = $1, user_id = $2 WHERE token = $3
            RETURNING *
          `;
          const updateResult = await pgClient.query(updateQuery, [robot_name, user_id, token]);
          res.json({ success: true, message: 'อัปเดตชื่อหุ่นยนต์สำเร็จ', data: updateResult.rows[0] });
        } else {
          res.json({ success: true, message: 'เชื่อมต่อสำเร็จ', data: existing });
        }
      }
    } finally {
      pgClient.release();
    }
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /my-robots 
router.get('/my-robots', authenticateJWT, async (req, res) => {
  const user_id = req.user.id;

  try {
    const pgClient = await pgPool.connect();
    try {
      // ดึงข้อมูลครบ รวม token และ device_id
      const query = `
        SELECT id, robot_name, token, device_id 
        FROM robots 
        WHERE user_id = $1
      `;
      const result = await pgClient.query(query, [user_id]);
      
      // เช็คสถานะล่าสุดจาก MongoDB สำหรับแต่ละหุ่นยนต์
      const robotsWithStatus = await Promise.all(
        result.rows.map(async (robot) => {
          try {
            // ดึงสถานะล่าสุดจาก MongoDB
            const status = await Status.findOne({ 
              device_id: robot.device_id,
              token: robot.token 
            });
            
            // ดึงข้อมูล sensor ล่าสุด
            const sensorData = await Esp32Sensor.findOne({ 
              device_id: robot.device_id 
            }).sort({ timestamp: -1 });

            return {
              ...robot,
              isOnline: status ? (new Date() - status.last_update < 300000) : false, // online ถ้าอัปเดตใน 5 นาทีที่แล้ว
              lastSeen: status?.last_update,
              hasSensorData: !!sensorData
            };
          } catch (err) {
            console.error(`Error checking status for robot ${robot.id}:`, err);
            return {
              ...robot,
              isOnline: false,
              lastSeen: null,
              hasSensorData: false
            };
          }
        })
      );

      res.json({ 
        success: true, 
        robots: robotsWithStatus 
      });
    } finally {
      pgClient.release();
    }
  } catch (err) {
    console.error('Error fetching robots:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get("/sensor-data/:robot_id", authenticateJWT, async (req, res) => {
  const { robot_id } = req.params;
  const user_id = req.user.id;

  try {
    const pgClient = await pgPool.connect();
    try {
      // ดึงข้อมูล robot และตรวจสอบสิทธิ์ความเป็นเจ้าของ
      const robotQuery = `
        SELECT device_id, token 
        FROM robots 
        WHERE id = $1 AND user_id = $2
      `;
      const robotResult = await pgClient.query(robotQuery, [robot_id, user_id]);

      if (robotResult.rows.length === 0) {
        return res.status(403).json({ error: "คุณไม่ได้เป็นเจ้าของหุ่นยนต์ตัวนี้" });
      }

      const { device_id, token } = robotResult.rows[0];

      // ตรวจสอบว่าอุปกรณ์มีอยู่ใน MongoDB หรือไม่
      const device = await Status.findOne({ device_id, token });
      if (!device) {
        return res.status(404).json({ error: "ไม่พบอุปกรณ์ในระบบ" });
      }

      // ดึงข้อมูล sensor ล่าสุดของอุปกรณ์
      const sensorData = await Esp32Sensor.findOne({ device_id }).sort({ timestamp: -1 });

      if (!sensorData) {
        return res.status(404).json({ error: "ยังไม่มีข้อมูล sensor" });
      }

      const normalizedPumpStatus =
        sensorData.pumpStatus === true ||
        sensorData.pumpStatus === "on" ||
        sensorData.pumpStatus === 1;

      // ส่ง response กลับไปให้ frontend
      return res.json({
        device_id,
        battery: sensorData.battery,
        sprayRate: sensorData.sprayRate,
        waterLevel: sensorData.waterLevel,
        pumpStatus: normalizedPumpStatus,
        timestamp: sensorData.timestamp,
        deviceStatus: device.status,
        lastUpdate: device.last_update,
      });

    } finally {
      pgClient.release();
    }
  } catch (error) {
    console.error("Sensor data error:", error);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});
// GET /api/sensor-data/:device_id/latest10
router.get('/sensor-data/:device_id/latest10', authenticateJWT, async (req, res) => {
  const deviceIdParam = req.params.device_id;   
  const userId = req.user.id;                   

  try {
    const pgClient = await pgPool.connect();
    try {
      // แปลง deviceIdParam เป็น integer (ถ้าไม่ใช่ตัวเลขจะเกิด NaN)
      const robotId = parseInt(deviceIdParam, 10);

      if (isNaN(robotId)) {
        return res.status(400).json({ error: "device_id ต้องเป็นตัวเลข" });
      }

      // Query หา robot โดยเช็ค id กับ user_id (ownership)
      const robotQuery = `SELECT device_id FROM robots WHERE id = $1 AND user_id = $2`;
      const robotResult = await pgClient.query(robotQuery, [robotId, userId]);

      if (robotResult.rows.length === 0) {
        return res.status(403).json({ error: "คุณไม่ได้เป็นเจ้าของอุปกรณ์นี้" });
      }

      // ดึง device_id จริง (string) จากผล query
      const actualDeviceId = robotResult.rows[0].device_id;

      // ดึงข้อมูล sensor โดยใช้ device_id จริง
      const sensorDataList = await Esp32Sensor.find({ device_id: actualDeviceId })
        .sort({ timestamp: -1 })
        .limit(10)
        .select('battery sprayRate waterLevel timestamp -_id')
        .lean();

      // ส่งกลับข้อมูลเรียงจากเก่าถึงใหม่
      return res.json(sensorDataList.reverse());

    } finally {
      pgClient.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});



module.exports = router;
