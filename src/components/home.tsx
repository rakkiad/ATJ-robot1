'use client';

import { useEffect, useState } from "react";
import { useSelectedRobot } from "@/app/contexts/SelectedRobotContext";
import "@/styles/home.css";
import 'animate.css';
import SystemChart from "@/components/SystemChart";
import { fetchSensorData , SensorDataType } from "@/app/api/robot"; 
import DonutChart from "@/components/donutChart";

export default function Home() {
  const { selectedRobot, token } = useSelectedRobot();
  const [sensorData, setSensorData] = useState<SensorDataType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRobot) {
      setSensorData(null);
      return;
    }

    async function loadSensor() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSensorData(token, selectedRobot.id);
        setSensorData(data);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
        setSensorData(null);
      } finally {
        setLoading(false);
      }
    }
    loadSensor();
  }, [selectedRobot, token]);

  // คำนวณเปอร์เซ็นต์สำหรับ DonutChart จาก sensorData
  const batteryPercent = sensorData?.battery ?? 0;
  const flowRatePercent = sensorData?.sprayRate ?? 0;
  const waterLevelPercent = sensorData?.waterLevel ?? 0;

  return (
    <main className='main-home'>
      <div className="dashboard">
        <h1>Dashboard</h1>

        {!selectedRobot ? (
          <p>โปรดเลือกหุ่นยนต์จากเมนูด้านข้าง</p>
        ) : loading ? (
          <p>กำลังโหลดข้อมูล...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : !sensorData ? (
          <p>ยังไม่มีข้อมูล sensor สำหรับหุ่นยนต์นี้</p>
        ) : (
          <>
            <div className="selected-robot-info">
              <p>หุ่นยนต์ที่เลือก: {selectedRobot.robot_name}</p>
            </div>

            <div className="card-container">

              <div className="card">
                <div className="battery-header-icons">
                  <span className="material-symbols-outlined">battery_android_bolt</span>
                </div>
                <div className="box-battery">
                  <div className="battery-text">
                    <p>แบตเตอรี่</p>
                    <p>Total</p>
                  </div>
                  <div className="batter-value">
                    <DonutChart label="แบตเตอรี่" value={batteryPercent} color="rgba(0, 200, 83, 0.7)" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flow-water-header-icons">
                  <span className="material-symbols-outlined">water</span>
                </div>
                <div className="box-flow-water">
                  <div className="flow-water-text">
                    <p>อัตราการไหล</p>
                    <p>Total</p>
                  </div>
                  <div className="flow-water-value">
                    <DonutChart label="อัตราไหล" value={flowRatePercent} color="rgba(54, 162, 235, 0.7)" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="leval-water-header-icons">
                  <span className="material-symbols-outlined">water_drop</span>
                </div>
                <div className="box-leval-water">
                  <div className="leval-water-text">
                    <p>ระดับน้ำ</p>
                    <p>Total</p>
                  </div>
                  <div className="leval-water-value">
                    <DonutChart label="ระดับน้ำ" value={waterLevelPercent} color="rgba(255, 193, 7, 0.7)" />
                  </div>
                </div>
              </div>

              <div className="card status-card">
                <div className="status-header">
                  <div className="status-item">
                    <span className="material-symbols-outlined robot-icon">smart_toy</span>
                    <div className="status-info">
                      <p>หุ่นยนต์</p>
                      <div className="robot-state">{sensorData.deviceStatus === "online" ? "ON" : "OFF"}</div>
                    </div>
                  </div>

                  <div className="status-item">
                    <span className="material-symbols-outlined pump-icon">water_pump</span>
                    <div className="status-info">
                      <p>ปั๊มน้ำ</p>
                      <div className="pump-state">{sensorData.pumpStatus ? "ON" : "OFF"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* กราฟ และข้อมูลการฉีดพ่น */}
            <div className="graph-box">
              <div className="haeder-graph-contens">
                <div className="graph-contens">
                  <h2>กราฟแสดงสถานะ</h2>
                  <SystemChart deviceId={selectedRobot.id} />
                </div>

                <div className="data">
                  <h2>ข้อมูลการฉีดพ่น</h2>
                  <div className="sub-data">
                    <p>ชนิดพืช :</p>
                    <p>ประเภทของของเหลว :</p>
                    <p>ชื่อสารเคมี :</p>
                    <p>ปริมาณการใช้สารเคมี :</p>
                    <p>พื้นที่ :</p>
                    <p>ระยะเวลา :</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
