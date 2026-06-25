'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const sizeArray = JSON.parse("[25, 41]");
const anchorArray = JSON.parse("[12, 41]");
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com',
    shadowUrl: 'https://unpkg.com',
    iconSize: sizeArray,
    iconAnchor: anchorArray
});
L.Marker.prototype.options.icon = DefaultIcon;

function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.panTo(center);
  }, [center, map]);
  return null;
}

// สร้างคอมโพเนนต์ย่อยเพื่อแอบไปดักใส่ ID หรือคลาสให้กับ Grid แผนที่ OpenStreetMap
function TileLayerWithId() {
  const map = useMap();
  useEffect(() => {
    // ดึงคลาสคอนเทนเนอร์ของแผ่นกระเบื้องแผนที่มาใส่ไอดีเพื่อให้สคริปต์หน้าบ้านสั่งซ่อนได้
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.setAttribute('id', 'map-tile-pane');
    }
  }, [map]);

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
      style={{ height: '100%', width: '100%', background: 'transparent' }} // ตั้งพื้นหลัง container ให้โปร่งแสงรอไว้
    >
      <TileLayerWithId />
      <Polyline positions={points} color="#fc4c02" weight={6} />
      {currentPos && <Marker position={currentPos} />}
      {currentPos && <ChangeMapView center={currentPos} />}
    </MapContainer>
  );
}
