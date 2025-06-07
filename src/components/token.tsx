"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/token.css"; 

export default function AssignRobot() {
  const router = useRouter();
  const [robotToken, setRobotToken] = useState("");
  const [robotName, setRobotName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!robotToken || !robotName) {
      alert("กรุณากรอก token และชื่อหุ่นยนต์ให้ครบถ้วน");
      return;
    }

    const userToken = localStorage.getItem("token");

    if (!userToken) {
      alert("ไม่พบ token กรุณาเข้าสู่ระบบใหม่");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/robot/connect-robot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          token: robotToken,
          robot_name: robotName,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message || "เชื่อมต่อสำเร็จ!");
        router.refresh();
        router.push("/home");
      } else {
        alert(data.message || "ไม่สามารถเชื่อมต่อหุ่นยนต์ได้");
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      alert("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assign-robot-container">
      <div className="assign-robot-card">
        <div className="assign-robot-form">
          <h2>Assign Robot</h2>

          <form onSubmit={handleAssign}>
            <input
              type="text"
              placeholder="Robot Token"
              value={robotToken}
              onChange={(e) => setRobotToken(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Robot Name"
              value={robotName}
              onChange={(e) => setRobotName(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "กำลังบันทึก..." : "Assign Robot"}
            </button>
          </form>

          <p className="back-to-home" onClick={() => router.push("/home")}>
            <i className="fas fa-arrow-left"></i>
            Back to Home
          </p>
        </div>

        <div className="assign-robot-image">
          <h1>Welcome ATJ Robot</h1>
          <img src="/logomine1.png" alt="Robot" />
        </div>
      </div>
    </div>
  );
}
