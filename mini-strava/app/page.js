'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTracking } from './hooks/useTracking';

const Map = dynamic(() => import('./components/Map'), { ssr: false });

export default function Home() {
  const {
    tracking, statusMode, points, currentPos, localDistance, durationSeconds, currentPace, setPoints, setStatusMode,
    startGPS, startSimulateNormal, startSimulateIndoor, packageDataForServer
  } = useTracking();

  const [targetPace, setTargetPace] = useState(5.5); 
  const [paceJitter, setPaceJitter] = useState(30); 
  const [showShareOptions, setShowShareOptions] = useState(false);

  const handleStopAndSave = async () => {
    const localPayload = packageDataForServer();
    if (!localPayload || localPayload.distance === 0) return alert('ไม่พบข้อมูลสถิติตอนวิ่ง');

    setStatusMode('processing');
    setShowShareOptions(true);

    const response = await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localPayload),
    });

    await response.json();
    setStatusMode('ready');
  };

  const exportStravaShareCard = async () => {
    const snapshotDistance = (localDistance / 1000).toFixed(2);
    const snapshotTime = formatTime(durationSeconds);
    const snapshotPace = currentPace;

    const leafletCanvas = document.querySelector('#pure-line-canvas-zone canvas');
    
    try {
      setStatusMode('generating-image');

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 800;
      finalCanvas.height = 500;
      const ctx = finalCanvas.getContext('2d');

      if (leafletCanvas && points.length > 0) {
        ctx.drawImage(leafletCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
      } else {
        ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      }

      const w = finalCanvas.width;
      const h = finalCanvas.height;

      ctx.fillStyle = 'rgba(23, 23, 23, 0.92)';
      ctx.strokeStyle = 'rgba(82, 82, 82, 0.6)';
      ctx.lineWidth = 2;
      
      const boxW = w - 60;
      const boxH = 100;
      const boxX = 30;
      const boxY = h - boxH - 30;
      
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      
      // DISTANCE
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('DISTANCE', boxX + boxW * 0.18, boxY + 32);
      ctx.font = 'black 26px sans-serif';
      ctx.fillStyle = '#fc4c02'; 
      ctx.fillText(`${snapshotDistance} km`, boxX + boxW * 0.18, boxY + 68);

      // TIME
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('TIME', boxX + boxW * 0.5, boxY + 32);
      ctx.font = 'black 26px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(snapshotTime, boxX + boxW * 0.5, boxY + 68);

      // AVG PACE
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#a3a3a3';
      ctx.fillText('AVG PACE', boxX + boxW * 0.82, boxY + 32);
      ctx.font = 'black 26px sans-serif';
      ctx.fillStyle = '#10b981'; 
      ctx.fillText(snapshotPace, boxX + boxW * 0.82, boxY + 68);

      // โลโก้แบรนด์
      ctx.fillStyle = '#fc4c02';
      ctx.font = 'black 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MINI STRAVA', 35, 40);

      ctx.fillStyle = '#a3a3a3';
      ctx.font = 'normal 12px sans-serif';
      ctx.fillText(points.length > 0 ? 'OUTDOOR RUN' : 'INDOOR TREADMILL RUN', 35, 60);

      const imageURL = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `strava_sharable_card_${Date.now()}.png`;
      link.click();
      
      setStatusMode('ready');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อขัดข้องในการเขียนโครงสร้างภาพแคนวาส');
      setStatusMode('ready');
    }
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-5 text-gray-800">
      <h1 className="text-3xl font-bold text-[#fc4c02] mb-5">🏃‍♂️ Advanced Strava Local Dev-App</h1>
      
      <div className="bg-white p-4 rounded-xl border mb-5 grid grid-cols-2 gap-4 text-sm shadow-sm">
        <div>
          <label className="block font-semibold text-gray-600 mb-1">🎯 ตั้งค่าเพซวิ่งบอท (นาที/กม.):</label>
          <input 
            type="number" 
            step="0.1" 
            value={Number.isNaN(targetPace) ? "" : targetPace} 
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setTargetPace(Number.isNaN(val) ? "" : val);
            }} 
            className="w-full p-2 border rounded" 
          />
        </div>
        <div>
          <label className="block font-semibold text-gray-600 mb-1">⚡ ค่าสุ่มความผันผวนเพซแกว่ง (บวกลบ/วินาที):</label>
          <input 
            type="number" 
            value={Number.isNaN(paceJitter) ? "" : paceJitter} 
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setPaceJitter(Number.isNaN(val) ? "" : val);
            }} 
            className="w-full p-2 border rounded" 
          />
        </div>
      </div>

      <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl mb-5">
        <div id="pure-line-canvas-zone" className="h-[400px] w-full bg-transparent rounded-xl overflow-hidden relative z-0">
          <Map points={points} currentPos={currentPos} />
        </div>

        {/* แดชบอร์ดตัวเลขสรุปผลบนหน้าเว็บปกติ (ปรับ Label เป็น เพซเฉลี่ยรวม เรียบร้อยครับ) */}
        <div className="grid grid-cols-3 gap-3 text-white mt-4 text-center">
          <div className="bg-neutral-800 p-2.5 rounded-xl border border-neutral-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ระยะทางวิ่งสด</span>
            <span className="text-xl font-black text-[#fc4c02]">{(localDistance / 1000).toFixed(2)} กม.</span>
          </div>
          <div className="bg-neutral-800 p-2.5 rounded-xl border border-neutral-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">เวลาจับสถานะ</span>
            <span className="text-xl font-black text-white">{formatTime(durationSeconds)}</span>
          </div>
          <div className="bg-neutral-800 p-2.5 rounded-xl border border-neutral-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">เพซเฉลี่ยรวม (Avg Pace)</span>
            <span className="text-xl font-black text-emerald-400">{currentPace}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={startGPS} disabled={tracking} className="bg-[#fc4c02] text-white px-4 py-2 rounded-md font-semibold disabled:bg-gray-300">
          เริ่มวิ่งจริง (GPS)
        </button>

        <button 
          onClick={() => startSimulateNormal(targetPace || 5.5, paceJitter || 0)} 
          disabled={tracking} 
          className="bg-emerald-600 text-white px-4 py-2 rounded-md font-semibold disabled:bg-gray-300"
        >
          🏃‍♂️ บอทสุ่มวิ่งปกติ (Outdoor)
        </button>

        <button 
          onClick={() => startSimulateIndoor(targetPace || 5.5)} 
          disabled={tracking} 
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold disabled:bg-gray-300"
        >
          🏠 บอทวิ่งกับที่ (Indoor/Treadmill)
        </button>

        <button onClick={handleStopAndSave} disabled={!tracking} className="bg-gray-800 text-white px-4 py-2 rounded-md font-semibold disabled:bg-gray-400">
          หยุดและเซฟข้อมูล (Stop & Save)
        </button>
        
        {showShareOptions && (
          <button onClick={exportStravaShareCard} className="bg-amber-500 text-white px-5 py-2 rounded-md font-bold shadow hover:bg-amber-600 transition-colors">
            📸 โหลดภาพแชร์เส้นทางพร้อมสถิติ (Transparent Overlay Card)
          </button>
        )}
      </div>

      <div className="text-xs bg-gray-100 p-3 rounded border text-gray-600">
        <strong>มอนิเตอร์:</strong> {statusMode === 'gps' && '🟢 เปิด GPS ลากเส้นจริง'}
        {statusMode === 'sim-normal' && `🔵 บอทเอาท์ดอร์กำลังวิ่งด้วยเพซกลาง ${targetPace || 5.5} แกว่งสวิงสุ่ม ±${paceJitter || 0} วินาที`}
        {statusMode === 'sim-indoor' && `🏠 โหมดวิ่งลู่วิ่งไฟฟ้าในร่ม: สถิติกิโลเมตรขยับปกติแต่แผนที่ดินจะว่างเปล่าไร้พิกัดเด้งตามสไตล์ Strava`}
        {statusMode === 'generating-image' && '📸 ระบบดึงข้อมูลสรุปตัวเลขสถิติ ปิดอาการ NaN เรียบร้อย...'}
        {statusMode === 'ready' && '⚪ พร้อมรันทดสอบระบบ'}
      </div>
    </div>
  );
}
