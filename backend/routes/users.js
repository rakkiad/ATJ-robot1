const express = require("express");
const router = express.Router();
const pool = require("../postgres");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');

//REGISTER USER
router.post("/register", async (req, res) => {
  const { firstName, lastName, passWord, phoneNumber, email } = req.body;
  try {
    const checkEmail = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email นี้มีผู้ใช้แล้ว" });
    }

    const hashedPassword = await bcrypt.hash(passWord, 10);
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, phone, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [firstName, lastName, phoneNumber, email, hashedPassword]
    );

    res.status(201).json({
      message: "ลงทะเบียนสำเร็จ",
      user: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด" });
  }
});

//LOGIN USER
router.post("/login", async (req, res) => {
  const { email, passWord } = req.body;
  try {
    const userResult = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(passWord, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const payload = { id: user.id, email: user.email, isAdmin: user.is_admin || false };
    const tokenJWT = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret_key', {
      expiresIn: '1d', 
    });
    console.log("Generated token:", tokenJWT);

    await pool.query(
      `INSERT INTO login_history (user_id, is_admin) VALUES ($1, $2)`,
      [user.id, user.is_admin || false]
    );

    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      tokenJWT, 
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        isAdmin: user.is_admin || false,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
});

// ส่ง OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({ message: "ไม่พบอีเมลนี้ในระบบ" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3 * 60000);

    await pool.query(
      `INSERT INTO otp_requests (email, otp_code, expires_at) VALUES ($1, $2, $3)`,
      [email, otp, expiresAt]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ATJRobot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP สำหรับรีเซ็ตรหัสผ่าน",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background-color: #f2f4f8; color: #333;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
            <h2 style="color: #2c3e50; margin-bottom: 10px; text-align: center;">รีเซ็ตรหัสผ่านของคุณ</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">คุณได้รับรหัส OTP สำหรับการรีเซ็ตรหัสผ่านบัญชีของคุณ</p>
            <div style="text-align: center; font-size: 36px; font-weight: bold; color: #1a73e8; letter-spacing: 4px; background: #e8f0fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #555;">รหัสนี้จะหมดอายุใน <strong>3 นาที</strong> นับจากเวลาที่ส่ง</p>
            <p style="font-size: 14px; color: #888;">หากคุณไม่ได้ร้องขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #aaa; text-align: center;">ระบบจัดการสมาชิก • ${new Date().getFullYear()}</p>
          </div>
        </div>
      `,
    });

    res.status(200).json({ message: "ส่ง OTP สำเร็จ" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่ง OTP" });
  }
});

// ยืนยัน OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE email = $1 AND otp_code = $2 AND verified = false AND expires_at > NOW()`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "OTP ไม่ถูกต้องหรือหมดอายุ" });
    }

    await pool.query(`UPDATE otp_requests SET verified = true WHERE id = $1`, [
      result.rows[0].id,
    ]);

    res.status(200).json({ message: "OTP ถูกต้อง สามารถเปลี่ยนรหัสผ่านได้" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบ OTP" });
  }
});

//เปลี่ยน PASSWORD
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const otpVerified = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE email = $1 AND verified = true 
       ORDER BY expires_at DESC LIMIT 1`,
      [email]
    );

    if (otpVerified.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "ยังไม่ได้ยืนยัน OTP หรือหมดอายุแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE users SET password = $1 WHERE email = $2`, [
      hashedPassword,
      email,
    ]);

    res.status(200).json({ message: "รีเซ็ตรหัสผ่านสำเร็จ" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" });
  }
});


module.exports = router;

