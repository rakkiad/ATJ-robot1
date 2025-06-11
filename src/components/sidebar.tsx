"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "@/styles/sidebar.css";
import { useSelectedRobot, RobotInfo } from "@/app/contexts/SelectedRobotContext";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showRobots, setShowRobots] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [robots, setRobots] = useState<RobotInfo[]>([]);
    const [loadingRobots, setLoadingRobots] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const { setSelectedRobot } = useSelectedRobot();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const toggleRobots = () => {
        const next = !showRobots;
        setShowRobots(next);
        if (next) {
            setHasFetched(false);
        }
    };

    useEffect(() => {
        function handleUserChange() {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            } else {
                setUser(null);
            }
            setHasFetched(false);
            setRobots([]);
            setShowRobots(false);
        }

        handleUserChange();
        window.addEventListener("userChanged", handleUserChange);
        return () => window.removeEventListener("userChanged", handleUserChange);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const fetchRobots = async () => {
            const token = localStorage.getItem("token");
            if (!user || !showRobots || !token || hasFetched) return;

            setLoadingRobots(true);

            try {
                const res = await fetch("http://localhost:5000/robot/my-robots", {
                    method: "GET",
                    signal: controller.signal,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.status === 204) {
                    setRobots([]);
                    setHasFetched(true);
                    return;
                }

                const data = await res.json();

                if (data.success && Array.isArray(data.robots)) {
                    setRobots(data.robots);
                } else {
                    console.warn("API ตอบกลับไม่สำเร็จ", data);
                    setRobots([]);
                }

                setHasFetched(true);
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    console.error("Fetch robots ผิดพลาด:", err);
                }
                setRobots([]);
            } finally {
                setLoadingRobots(false);
            }
        };

        fetchRobots();

        return () => controller.abort();
    }, [user, showRobots, hasFetched]);

    const goToTokenPage = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push("/token");
    };

    const handleSelectRobot = (robot: RobotInfo) => {
        setSelectedRobot(robot);
        setIsSidebarOpen(false);
        if (pathname !== "/home") router.push("/home");
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("userChanged"));
        router.push("/");
    };

    return (
        <div className="container">
            <div className={`menu-icon ${isSidebarOpen ? "active" : ""}`} onClick={toggleSidebar}>
                <span className="material-symbols-outlined">menu</span>
            </div>

            <aside className={isSidebarOpen ? "active" : ""}>
                <div className="top">
                    <div className="logo">
                        <img src="/logomine1.png" alt="ATJ Robot Logo" />
                        <h2>ATJ <span className="danger">Robot</span></h2>
                    </div>
                    <div className="close" onClick={toggleSidebar}>
                        <span className="material-symbols-outlined">close</span>
                    </div>
                </div>

                <div className="sidebar">
                    <Link href="/home" className={pathname === "/home" ? "active" : ""}>
                        <span className="material-symbols-outlined">grid_view</span>
                        <div className="tooltip">Dashboard</div>
                        <h3>Dashboard</h3>
                    </Link>

                    <Link href="/graph" className={pathname === "/graph" ? "active" : ""}>
                        <span className="material-symbols-outlined">monitoring</span>
                        <div className="tooltip">แสดงกราฟ</div>
                        <h3>แสดงกราฟ</h3>
                    </Link>

                    <Link href="/history" className={pathname === "/history" ? "active" : ""}>
                        <span className="material-symbols-outlined">history</span>
                        <div className="tooltip">ประวัติการทำงาน</div>
                        <h3>ประวัติการทำงาน</h3>
                    </Link>

                    <Link href="/settings" className={pathname === "/settings" ? "active" : ""}>
                        <span className="material-symbols-outlined">settings</span>
                        <div className="tooltip">ตั้งค่า</div>
                        <h3>ตั้งค่า</h3>
                    </Link>

                    <div className="robots-section">
                        <div className="robots-toggle" onClick={toggleRobots}>
                            <div className="robots-title">
                                <span className="material-symbols-outlined">smart_toy</span>
                                <h3>หุ่นยนต์ของฉัน</h3>
                            </div>
                            <button onClick={goToTokenPage}>
                                <span className="material-symbols-outlined">add</span>
                            </button>
                        </div>

                        {showRobots && (
                            <div className="robot-list">
                                {loadingRobots ? (
                                    <p>กำลังโหลด...</p>
                                ) : robots.length > 0 ? (
                                    robots.map((robot) => (
                                        <p
                                            key={robot.id}
                                            className="robot-item"
                                            onClick={() => handleSelectRobot(robot)}
                                        >
                                            {robot.robot_name}
                                        </p>
                                    ))
                                ) : (
                                    <p>ไม่มีหุ่นยนต์</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="sidebar-footer">
                        <div className="user-profile">
                            <img src="/avatar.jpg" alt="User Profile" className="profile-pic" />
                            <div>
                                <h3>{user?.name ?? "ชื่อผู้ใช้"}</h3>
                            </div>
                        </div>

                        <button onClick={handleLogout} className="logout-button">
                            <span className="material-symbols-outlined">logout</span>
                            <h3>Logout</h3>
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
