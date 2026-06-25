'use client';
import { useState, useRef } from 'react';
import polyline from '@mapbox/polyline';

// 📐 สูตรคำนวณระยะห่างระหว่าง 2 จุดแบบเรียลไทม์บนเครื่องผู้ใช้ (Haversine Formula)
function calculateLocalDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // รัศมีโลก (เมตร)
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

export function useTracking() {
  const [tracking, setTracking] = useState(false);
  const [statusMode, setStatusMode] = useState('ready');
  const [points, setPoints] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  
  // สถิติที่คำนวณสดๆ แบบ Local บนเครื่องผู้ใช้
  const [localDistance, setLocalDistance] = useState(0); // เมตร
  const [startTime, setStartTime] = useState(null);

  const watchId = useRef(null);
  const intervalId = useRef(null);
  const pointsRef = useRef([]); // ใช้เรฟคุมค่าพิกัดล่าสุดเพื่อกันปัญหาสเตตรีโหลดไม่ทันตอนคำนวณระยะทาง

  const clearAllProcesses = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (intervalId.current !== null) clearInterval(intervalId.current);
    watchId.current = null;
    intervalId.current = null;
  };

  const handleNewPoint = (lat, lng) => {
    const newPt = [lat, lng];
    const prevPt = pointsRef.current[pointsRef.current.length - 1];

    if (prevPt) {
      // 📱 คำนวณระยะทางสะสมเพิ่มเข้าไปสดๆ บนเครื่องเครื่องผู้ใช้ทันทีเมื่อก้าวเดิน
      const newSegmentDist = calculateLocalDistance(prevPt[0], prevPt[1], lat, lng);
      setLocalDistance((prev) => prev + newSegmentDist);
    }

    pointsRef.current.push(newPt);
    setPoints([...pointsRef.current]);
    setCurrentPos(newPt);
  };

  // 1. ปุ่มรันวิ่งจริง (GPS)
  const startGPS = () => {
    clearAllProcesses();
    setPoints([]);
    pointsRef.current = [];
    setLocalDistance(0);
    setStartTime(new Date());
    setTracking(true);
    setStatusMode('gps');

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        handleNewPoint(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 2. ปุ่มรันบอทจำลองวิ่งสุ่ม
  const startSimulateNormal = () => {
    clearAllProcesses();
    setPoints([]);
    pointsRef.current = [];
    setLocalDistance(0);
    setStartTime(new Date());
    setTracking(true);
    setStatusMode('sim-normal');

    let lat = 13.7468;
    let lng = 100.5348;
    handleNewPoint(lat, lng);

    intervalId.current = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.00015;
      lng += (Math.random() - 0.5) * 0.00015;
      handleNewPoint(lat, lng);
    }, 1000);
  };

  // 📦 3. ฟังก์ชันสร้างไฟล์โครงสร้าง .GPX บนเครื่องผู้ใช้ (Local Packaging)
  const generateGPX = (routePoints) => {
    let gpxTracks = routePoints.map((pt, idx) => {
      // จำลองเวลาเพิ่มขึ้นทีละ 1 วินาทีต่อจุด
      const pointTime = new Date(startTime?.getTime() + idx * 1000).toISOString();
      return `      <trkpt lat="${pt[0]}" lon="${pt[1]}"><time>${pointTime}</time></trkpt>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MiniStravaLocal" xmlns="http://topografix.com">
  <metadata>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>Local Running Activity</name>
    <trkseg>
${gpxTracks}
    </trkseg>
  </trk>
</gpx>`;
  };

  // 🛠️ 4. ฟังก์ชันจัดการมัดรวมข้อมูลทั้งหมดฝั่ง Client ก่อนยิงขึ้นเซิร์ฟเวอร์
  const packageDataForServer = () => {
    clearAllProcesses();
    setTracking(false);

    if (pointsRef.current.length === 0) return null;

    // บีบอัดพิกัดเป็น String ยาวบรรทัดเดียวตั้งแต่บนเครื่องผู้ใช้เลย!
    const encodedPolyline = polyline.encode(pointsRef.current);
    
    // แปลงพิกัดในหน่วยความจำออกมาเป็นไฟล์ข้อมูลแผนที่ .gpx ทันทีบนหน้าบ้าน
    const gpxData = generateGPX(pointsRef.current);
    
    // คำนวณเวลารวมที่ใช้ (วินาที)
    const duration = Math.round((new Date() - startTime) / 1000);

    return {
      encodedPolyline,
      distance: Math.round(localDistance),
      duration,
      gpxData
    };
  };

  return {
    tracking, statusMode, points, currentPos, localDistance, setPoints, setStatusMode,
    startGPS, startSimulateNormal, packageDataForServer
  };
}
