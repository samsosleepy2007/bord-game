# Skill Canvas: จับคู่สมรรถนะ ทะลุมิติวิชาชีพ

เว็บบอร์ดเกมออนไลน์แบบ real-time สำหรับผู้เล่น 2–8 คน พัฒนาด้วย Node.js + Express + Socket.IO

## ฟีเจอร์
- สร้างห้องพร้อม Room Code 6 ตัว
- เข้าห้องด้วยโค้ด
- Host เริ่มเกม / ยุบห้อง / เตะผู้เล่น
- Reconnect ด้วย session id เมื่อรีเฟรชหน้า
- แจก Competency Cards คนละ 5 ใบ
- ตลาด Profession 4 ใบ
- Upskill: จั่ว 2 ใบ
- Apply Job: ใช้การ์ดตามเงื่อนไข รับ VP
- Networking: เสนอ 2 ใบ แลกกับผู้เล่นอื่น 1 ใบ และมีสิทธิ์ปฏิเสธ
- Crisis: เลือก 1–2 สมรรถนะ + Pitch + โหวตแบบ real-time
- ตารางคะแนน VP และ Game Log
- Responsive UI สำหรับมือถือ/แท็บเล็ต/คอม

## รันในเครื่อง
```bash
npm install
npm start
```
เปิด http://localhost:3000

## Deploy บน Render
1. อัปโหลดโปรเจกต์ขึ้น GitHub
2. Render > New > Web Service
3. เลือก Repository
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy

Socket.IO ต้องใช้โฮสต์ที่รองรับ WebSocket/Long-lived Node server เช่น Render, Railway, Fly.io หรือ VPS

## หมายเหตุ
สถานะห้องเก็บใน RAM ของเซิร์ฟเวอร์ เหมาะสำหรับเวอร์ชันต้นแบบ/ห้องเรียน หากต้องการ production ที่รองรับหลาย instance ควรย้าย state ไป Redis/Database และเพิ่มระบบล็อกอิน
