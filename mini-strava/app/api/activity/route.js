// app/api/activity/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // รับข้อมูลที่หน้าบ้านประมวลผล สรุป และบีบอัดมาให้เสร็จสรรพแล้ว
    const { encodedPolyline, distance, duration, gpxData } = body;

    if (!encodedPolyline) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลเส้นทาง' }, { status: 400 });
    }

    // 🔥 บันทึกเข้าคลังข้อมูลเซิร์ฟเวอร์ทันทีโดยไม่ต้องคำนวณอะไรซ้ำซ้อน
    console.log('=== [SERVER DB] บันทึกกิจกรรมสำเร็จ (กินทรัพยากรต่ำมาก) ===');
    console.log(`ระยะทางรวม: ${distance} เมตร | เวลา: ${duration} วินาที`);
    console.log(`ขนาดตัวอักษรเส้นทาง: ${encodedPolyline.length} ตัวอักษร`);

    return NextResponse.json({
      success: true,
      message: 'เซิร์ฟเวอร์บันทึกกิจกรรมลงโกดังข้อมูลเรียบร้อยแล้ว!',
      distance,
      duration,
      encodedPolyline
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
