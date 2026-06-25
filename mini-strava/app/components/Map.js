'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ป้องกันระบบแสดงผลแชทกลืนตัวเลขในวงเล็บเหลี่ยมด้วยคลาส L.point ดั้งเดิม
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com',
    shadowUrl: 'https://unpkg.com',
    iconSize: L.point(25, 41),     
    iconAnchor: L.point(12, 41)    
});
L.Marker.prototype.options.icon = DefaultIcon;

// 🎯 กลไกอัจฉริยะ: สั่งจัดระเบียบกล้องแผนที่ให้ดึงตัวเส้นวิ่งมาไว้ตรงกลางภาพ (Center Lock)
function MapLayerController({ points, currentPos }) {
  const map = useMap();

  useEffect(() => {
    const tilePane = map.getPane('tilePane');
    if (tilePane) tilePane.setAttribute('id', 'map-tile-pane');
    
    const overlayPane = map.getPane('overlayPane');
    if (overlayPane) overlayPane.setAttribute('id', 'map-overlay-pane');
  }, [map]);

  useEffect(() => {
    // 💡 ถ้ามีการกดสั่งประมวลผลเซฟ (ระบบจะดึงพิกัดทั้งหมดมาจัดระเบียบให้อยู่กึ่งกลางหน้าแคนวาส)
    if (points && points.length > 1) {
      const polylineBounds = L.polyline(points).getBounds();
      map.fitBounds(polylineBounds, { padding: [30, 30] }); // บีบขอบเขตให้เส้นวิ่งมาอยู่ตรงกลางพอดี
    } else if (currentPos) {
      map.panTo(currentPos);
    }
  }, [points, currentPos, map]);

  return (
    <TileLayer
      attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

export default function Map({ points, currentPos }) {
  const defaultCenter = [13.7563, 100.5018];

  return (
    <MapContainer 
      center={currentPos || defaultCenter} 
      zoom={16} 
      preferCanvas={true} // 💡 เคล็ดลับสำคัญ: บังคับให้ Leaflet วาดเส้นแบบ Canvas เพื่อให้ html2canvas สแนปรูปตรงตำแหน่งกึ่งกลางจอ
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      <MapLayerController points={points} currentPos={currentPos} />
      <Polyline positions={points} color="#fc4c02" weight={8} />
      {currentPos && <Marker position={currentPos} />}
    </MapContainer>
  );
}
