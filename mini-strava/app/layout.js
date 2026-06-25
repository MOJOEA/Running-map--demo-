'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTracking } from './hooks/useTracking';
import html2canvas from 'html2canvas';

const Map = dynamic(() => import('./components/Map'), { ssr: false });

export default function Home() {
  const {
    tracking, statusMode, points, currentPos, localDistance, setPoints, setStatusMode,
    startGPS, startSimulateNormal, packageDataForServer
  } = useTracking();

  const [showShareOptions, setShowShareOptions] = useState(false);

  const handleStopAndSave = async () => {
    const localPayload = packageDataForServer();
    if (!localPayload) return alert('ไม่มีพิกัดบันทึกไว้');

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

  // 🔥 ฟังก์ชันเสกภาพเส้นส้มล้วนลอยแบบไม่มีสถิติและไม่มีแผนหลังดาวเทียม
  const exportPureTransparentLine = async () => {
    // ดักจับเฉพาะโซนแผนที่ที่มีพิกัดเส้น Polyline เกาะอยู่
    const mapElement = document.getElementById('pure-line-canvas-zone');
    const tilePane = document.getElementById('map-tile-pane');
    const markers = document.querySelectorAll('.leaflet-marker-pane, .leaflet-shadow-pane, .leaflet-control-container');

    if (!mapElement) return;

    try {
      setStatusMode('generating-image');
      
      // 1. สั่งซ่อนสิ่งกีดขวางรอบตัวแผนที่ (ซ่อนตึก ซ่อนหมุดไอคอน ซ่อนปุ่มซูม +/-)
      if (tilePane) tilePane.style.setProperty('display', 'none', 'important');
      markers.forEach(m => m.style.setProperty('display', 'none', 'important'));

      // 2. แชะภาพเฉพาะบริเวณกรอบแผนที่ด้วยค่าโปร่งใสไร้สีพื้นหลัง
      const canvas = await html2canvas(mapElement, {
        backgroundColor: null, // บังคับพื้นหลังใสกิ๊ง 100%
        useCORS: true,
        scale: 2 // เพิ่มมิติความคมชัดไฟล์ PNG
      });

      // 3. เรียกเลเยอร์กระเบื้องตึกและไอคอนหมุดกลับมาโชว์บนบราวเซอร์หน้าเว็บทันทีหลังแชะเสร็จ
      if (tilePane) tilePane.style.display = 'block';
      markers.forEach(m => m.style.display = 'block');

      // 4. แปลงผลลัพธ์ยิงไฟล์ภาพ .png ลอยใสออกสู่เครื่อง
      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `pure_route_transparent_${Date.now()}.png`;
      link.click();
      
      setStatusMode('ready');
    } catch (err) {
      console.error('สแนปภาพพัง:', err);
      if (tilePane) tilePane.style.display = 'block';
      markers.forEach(m => m.style.display = 'block');
      setStatusMode('ready');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-5">
      <h1 className="text-3xl font-bold text-[#fc4c02] mb-5">🏃‍♂️ Strava Pure Line Exporter</h1>
      
      {/* 📸 กรอบสีดำนี้อยู่บนเว็บเพื่อให้คุณมองเห็นเส้นส้มเฉยๆ แต่ตอนกดโหลดภาพมันจะดึงออกไป */}
      <div className="bg-neutral-900 p-4 rounded-2xl shadow-xl border border-neutral-800 mb-5">
        
        {/* 🎯 ID เป้าหมาย: บล็อกแผนที่ที่จะถูกลอกพิกัดเอาเฉพาะเส้นส้มตรงนี้ไปส่งออก */}
        <div id="pure-line-canvas-zone" className="h-[400px] w-full bg-transparent rounded-xl overflow-hidden relative z-0">
          <Map points={points} currentPos={currentPos} />
        </div>

        {/* แดชบอร์ดตัวเลขคำนวณสถิติสดบนหน้าเว็บ */}
        <div className="grid grid-cols-2 gap-3 text-white mt-4">
          <div className="bg-neutral-800 p-3 rounded-xl text-center border border-neutral-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ระยะทางวิ่งรวม</span>
            <span className="text-2xl font-black text-[#fc4c02]">{(localDistance / 1000).toFixed(2)}</span> <span className="text-xs text-gray-400">กม.</span>
          </div>
          <div className="bg-neutral-800 p-3 rounded-xl text-center border border-neutral-700">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">พิกัดสะสม</span>
            <span className="text-2xl font-black text-white">{points.length}</span> <span className="text-xs text-gray-400">จุด</span>
          </div>
        </div>

      </div>

      {/* แผงปุ่มควบคุมระบบหน้าเว็บ */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={startSimulateNormal} disabled={tracking} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold disabled:bg-gray-300">
          🤖 บอทสุ่มวิ่งจำลอง
        </button>

        <button onClick={handleStopAndSave} disabled={!tracking} className="bg-gray-800 text-white px-5 py-2.5 rounded-lg font-semibold disabled:bg-gray-400">
          หยุดและเซฟข้อมูล (Stop & Save)
        </button>
        
        {/* แสดงผลปุ่มดาวน์โหลดเฉพาะเส้นใสเมื่อเซฟเรียบร้อย */}
        {showShareOptions && (
          <button onClick={exportPureTransparentLine} className="bg-[#fc4c02] text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-orange-600 transition-colors animate-bounce">
            📸 ดาวน์โหลดภาพเส้นวิ่งใส (Pure Transparent Line)
          </button>
        )}
      </div>

      <div className="text-sm bg-gray-100 p-3 rounded border text-gray-500">
        <strong>สถานะตัวคุม:</strong> {statusMode === 'sim-normal' && '🔵 บอทกำลังวิ่งสะสมเส้นทางทางคณิตศาสตร์...'}
        {statusMode === 'generating-image' && '📸 กำลังกรองตัดสิ่งแปลกปลอมและดึงภาพเฉพาะเส้นส้มใส...'}
        {statusMode === 'ready' && '⚪ รอดักจับคำสั่งใหม่'}
      </div>
    </div>
  );
}
