// type สำหรับข้อมูลปัจจุบันของ sensor (1 ค่า)
export type SensorDataType = {
  battery: number;
  sprayRate: number;
  waterLevel: number;
  deviceStatus: "online" | "offline";
  pumpStatus: boolean;
};

// type สำหรับข้อมูลล่าสุด 10 ค่า (มี timestamp)
export type RawSensorData = {
  battery: number;
  sprayRate: number;
  waterLevel: number;
  timestamp: string;
};

export async function fetchLatestSensorData(deviceId: string, token: string): Promise<RawSensorData[]> {
  const res = await fetch(`http://localhost:5000/robot/sensor-data/${deviceId}/latest10`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch sensor data");
  }
  const data: RawSensorData[] = await res.json();
  return data;
}



export async function fetchMyRobots(token: string) {
  const res = await fetch('http://localhost:5000/robot/my-robots', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch robots');
  return res.json();
}

export async function fetchSensorData(token: string, robotId: number): Promise<SensorDataType> {
  const res = await fetch(`http://localhost:5000/robot/sensor-data/${robotId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch sensor data');
  return res.json();
}
