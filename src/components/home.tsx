'use client';

import { useSelectedRobot } from "@/app/contexts/SelectedRobotContext";
import "@/styles/home.css";
import 'animate.css';

import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function DonutChart({ label, value, color }) {
    const data = {
        labels: [label, 'เหลือ'],
        datasets: [
            {
                label,
                data: [value, 100 - value],
                backgroundColor: [
                    color,
                    'rgba(211, 211, 211, 0.3)', 
                ],
                borderWidth: 0,
                cutout: '70%',
            },
        ],
    };

    const options = {
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
        maintainAspectRatio: false,
    };

    return (
        <div style={{ width: '100px', height: '100px', position: 'relative' }}>
            <Doughnut data={data} options={options} />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color,
                    userSelect: 'none',
                }}
            >
                {value}%
            </div>
        </div>
    );
}

export default function Home() {
    const { selectedRobot } = useSelectedRobot();


    const batteryPercent = selectedRobot?.batteryLevel ?? 0;
    const flowRatePercent = selectedRobot?.flowRate ?? 0;
    const waterLevelPercent = selectedRobot?.waterLevel ?? 0;

    return (
        <main className='main-home'>
            <div className="dashboard">
                <h1>Dashboard</h1>
                {selectedRobot ? (
                    <div className="selected-robot-info">
                        <p>หุ่นยนต์ที่เลือก: {selectedRobot.robot_name}</p>
                    </div>
                ) : (
                    <p>โปรดเลือกหุ่นยนต์จากเมนูด้านข้าง</p>
                )}
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
                                <DonutChart label="อัตราการไหล" value={flowRatePercent} color="rgba(54, 162, 235, 0.7)" />
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
                                    <div className="robot-state">{selectedRobot?.robotStatus ? "ON" : "OFF"}</div>
                                </div>
                            </div>

                            <div className="status-item">
                                <span className="material-symbols-outlined pump-icon">water_pump</span>
                                <div className="status-info">
                                    <p>ปั๊มน้ำ</p>
                                    <div className="pump-state">{selectedRobot?.pumpStatus ? "ON" : "OFF"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="graph-box">
                    <div className="haeder-graph-contens">
                        <div className="graph-contens">
                            <h2>กราฟแสดงสถานะ</h2>
                        </div>
                        <div className="data">
                            <h2>ข้อมูลการฉีดพ่น</h2>
                            <div className="sub-data">
                                <p>ชนิดพืช :</p>
                                <p>ประของของเหลว :</p>
                                <p>ชื่อสารเคมี :</p>
                                <p>ปริมาณการใช้สาเคมี :</p>
                                <p>พื้นที่ :</p>
                                <p>ระยะวลา :</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
