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


// Mongo Schema
const statusSchema = new mongoose.Schema({
  device_id: String,
  token: String,
  status: String,
  last_update: { type: Date, default: Date.now }
});

const Status = mongoose.model('Status', statusSchema);

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; 

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });

  const tokenJWT = authHeader.split(' ')[1]; 
  console.log('Token from header:', tokenJWT);

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


// API สำหรับ user เชื่อมต่อกับหุ่นยนต์
router.post('/connect-robot', authenticateJWT, async (req, res) => {
  const { token, robot_name } = req.body;
  const user_id = req.user.id; 

  if (!token || !robot_name) {
    return res.status(400).json({ success: false, message: 'Token and robot_name required' });
  }

  try {
    // 1. เช็ค token ใน MongoDB ว่ามีหรือไม่
    const device = await Status.findOne({ token });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    // 2. เช็คว่ามี record นี้ใน PostgreSQL หรือยัง
    const pgClient = await pgPool.connect();

    try {
      const selectQuery = 'SELECT * FROM robots WHERE token = $1';
      const selectResult = await pgClient.query(selectQuery, [token]);

      if (selectResult.rows.length === 0) {
        // ถ้ายังไม่มีให้ insert ใหม่
        const insertQuery = `
          INSERT INTO robots (user_id, token, robot_name)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
        const insertResult = await pgClient.query(insertQuery, [user_id, token, robot_name]);

        res.json({ success: true, message: 'เชื่อมต่อสำเร็จ', data: insertResult.rows[0] });
      } else {
        // ถ้ามีแล้ว ตรวจสอบชื่อหุ่นยนต์
        const existing = selectResult.rows[0];
        if (existing.robot_name !== robot_name) {
          // อัพเดตชื่อหุ่นยนต์
          const updateQuery = `
            UPDATE robots SET robot_name = $1, user_id = $2 WHERE token = $3
            RETURNING *
          `;
          const updateResult = await pgClient.query(updateQuery, [robot_name, user_id, token]);

          res.json({ success: true, message: 'อัปเดตชื่อหุ่นยนต์สำเร็จ', data: updateResult.rows[0] });
        } else {
          // ชื่อไม่เปลี่ยน แค่ตอบกลับว่าต่อแล้ว
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

// GET /my-robots - ดึงรายชื่อหุ่นยนต์ของผู้ใช้
router.get('/my-robots', authenticateJWT, async (req, res) => {
  const user_id = req.user.id;

  try {
    const pgClient = await pgPool.connect();
    try {
      const query = 'SELECT id, robot_name FROM robots WHERE user_id = $1';
      const result = await pgClient.query(query, [user_id]);

      res.json({ success: true, robots: result.rows });
    } finally {
      pgClient.release();
    }
  } catch (err) {
    console.error('Error fetching robots:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



module.exports = router;