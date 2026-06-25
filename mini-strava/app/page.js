'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTracking } from './hooks/useTracking';

const Map = dynamic(() => import('./components/Map'), { ssr: false });

export default function Home() {
  const {
    tracking, statusMode, points, currentPos, localDistance, setPoints, setStatusMode,
    startGPS, startSimulateNormal, packageDataForServer
  } = useTracking();

  const [result, setResult] = useState(null);
  const [localGpx, setLocalGpx] = useState(null); // เก็บไฟล์ GPX ไว้ให้กดดาวน์โหลดที่หน้าบ้านได้ด้วย

  const handleStopAndSave = async () => {
    // 1. เรียกเอาข้อมูลก้อนสรุปที่มัดรวมและคำนวณเสร็จแล้วจากบนเครื่องผู้ใช้
    const localPayload = packageDataForServer();
    if (!localPayload) return alert('ไม่มีพิกัดบันทึกไว้');

    setLocalGpx(localPayload.gpxData);
    setStatusMode('processing');

    // 2. ยิง API ส่งก้อนข้อมูลสรุปขึ้นไปฝากที่เซิร์ฟเวอร์หลังบ้านในรอบเดียว
    const response = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localPayload),
    });

    const data = await response.json();
    setResult(data);
    setStatusMode('ready');
  };

  // ฟังก์ชันดาวน์โหลดไฟล์ GPX บนบราวเซอร์เครื่องผู้ใช้โดยตรงแบบไม่ต้องพึ่งพาเซิร์ฟเวอร์
  const downloadGpxFile = () => {
    if (!localGpx) return;
    const blob = new Blob([localGpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_${Date.now()}.gpx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-5">
      <h1 className="text-3xl font-bold text-[#fc4c02] mb-5">🏃‍♂️ Pure Client-Side Strava</h1>
      
      <div className="h-[450px] w-full bg-gray-200 rounded-xl overflow-hidden shadow-md mb-5">
        <Map points={points} currentPos={currentPos} />
      </div>

      {/* แดชบอร์ดคำนวณสดแบบ Local บนหน้าจอผู้ใช้ระหว่างวิ่ง */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">ระยะทางวิ่งสด (Local Calc)</span>
          <span className="text-3xl font-black text-gray-800">{(localDistance / 1000).toFixed(2)}</span> <span className="text-sm font-semibold text-gray-500">กม.</span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">ความแม่นยำและการเก็บข้อมูล</span>
          <span className="text-3xl font-black text-emerald-600">{points.length}</span> <span className="text-sm font-semibold text-gray-500">จุดพิกัดใน RAM</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={startGPS} disabled={tracking} className="bg-[#fc4c02] text-white px-5 py-2.5 rounded-lg font-semibold disabled:bg-gray-300">
          เริ่มวิ่งจริง (GPS)
        </button>

        <button onClick={startSimulateNormal} disabled={tracking} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold disabled:bg-gray-300">
          🤖 บอทสุ่มวิ่งจำลอง
        </button>

        <button onClick={handleStopAndSave} disabled={!tracking} className="bg-gray-800 text-white px-5 py-2.5 rounded-lg font-semibold disabled:bg-gray-400">
          หยุดและเซฟข้อมูล (Stop & Save)
        </button>
        
        {localGpx && (
          <button onClick={downloadGpxFile} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:bg-blue-700">
            📥 ดาวน์โหลดไฟล์แผนที่ดิบ (.gpx)
          </button>
        )}
      </div>

      <div className="text-sm bg-gray-100 p-3 rounded mb-5 border border-gray-200">
        <strong>สถานะเครื่องผู้ใช้:</strong> {statusMode === 'gps' && '🟢 กำลังคุยกับชิปดาวเทียมตรงอยู่นอกตัวตึก'}
        {statusMode === 'sim-normal' && '🔵 บอทกำลังวิ่งสะสมระยะทางบน RAM มือถือ'}
        {statusMode === 'processing' && '⏳ กำลังยิงก้อนข้อมูลขึ้นไปเก็บที่ฐานข้อมูลหลังบ้าน...'}
        {statusMode === 'ready' && '⚪ พร้อมรันทดสอบระบบไร้ภาระเซิร์ฟเวอร์'}
      </div>

      {result && (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-green-200">
          <h2 className="text-lg font-bold text-green-600 mb-1">✅ {result.message}</h2>
          <p className="text-xs text-gray-500 mb-3">เซิร์ฟเวอร์ทำงานเสร็จภายในเวลาไม่ถึง 1 มิลลิวินาที เนื่องจากไม่ต้องคำนวณวิเคราะห์อะไรเลย</p>
          <textarea readOnly value={result.encodedPolyline} className="w-full h-16 p-2 bg-gray-50 border text-xs font-mono rounded text-gray-400" />
        </div>
      )}
    </div>
  );
}
