# วงจรร่างคำสั่ง — 25 ตุลาคม 2026

สถานะ: พิสูจน์ในโมเดลทดสอบของ prepared candidate แล้ว ยังไม่เชื่อมหน้าร้านหรือ deploy
ไฟล์ deploy `firestore.rules` ยังคง deny-all และยังไม่ตรึง public protocol

## สถานะและการกู้ผล

`preparations/{kindprefix_opId}` เก็บชนิดคำสั่ง เจ้าของ จำนวนขั้น/หลักฐาน และเวลาเซิร์ฟเวอร์
ใช้ namespace แยก sale / inventory / platform รหัสคำสั่งห้ามนำกลับมาใช้หลังปิด
manifest เริ่ม `open` แล้วเปลี่ยนได้ครั้งเดียวเป็น `committed`, `abandoned` หรือ `expired`
ห้ามเปลี่ยน descriptor เปิดคืน หรือลบ manifest; เก็บเป็น tombstone แม้ล้างข้อมูลเตรียมแล้ว

ค้นแบบแบ่งหน้าไม่เกิน 20 manifest ตาม createdAt และ document ID ใน generation ปัจจุบัน
อ่าน receipt จากเซิร์ฟเวอร์ก่อนลองคำสั่งเดิมใหม่ หากชนิด/ID/เจ้าของตรง ให้คืนผลที่บันทึกไว้จริง
และปิด manifest เป็น committed แม้ผลตอบกลับครั้งแรกหายไป
หาก operations ใช้ ID เดียวกันกับคำสั่งคนละชนิด/เจ้าของ ให้รายงาน conflict ไม่ถือว่าร่างนี้สำเร็จ
ร่างที่ชน ID แบบนี้ยังยกเลิกและล้างข้อมูลเตรียมของตัวเองได้ โดยเก็บ receipt ของอีกคำสั่งไว้

## ปิดร่างและคำขอที่ชนกัน

ผู้สร้างยกเลิกร่างได้ ส่วนทุกบัญชีที่ login สามารถปิดเป็น expired ได้เมื่อครบ 7 วัน
นี่เป็นการผูกเจ้าของคำสั่ง ไม่ใช่ role หรือสิทธิ์สมาชิกเพิ่มเติม
7 วันเป็นเกณฑ์อนุญาตให้ปิดร่าง ไม่ใช่เวลาที่ final commit ถูกหยุดโดยอัตโนมัติ

การปิด abandoned/expired ต้องบันทึกสถานะพร้อมลบ compulsory proof ใน batch เดียว:
sale ใช้ lineProofs/0, inventory ใช้ proof สุดท้ายของขั้นสุดท้าย, platform ใช้ columnProof สุดท้าย
กฎตรวจว่าไม่มี receipt ของคำสั่งนี้หลัง batch และ preparation writes ทุกชนิดต้องเห็น manifest open ด้วย getAfter
จึงเติมหลักฐานใหม่ใน batch ที่ปิดร่างไม่ได้ และสร้างกลับหลังปิดไม่ได้
final commit ใช้หลักฐานบังคับเดิม จึงไม่เพิ่ม document dependency ของการขายสูงสุด 20 รายการ
หรือจำนวน 17 final writes ของการขาย

เมื่อคำขอชนกัน ยอมรับผลธุรกิจได้ไม่เกินหนึ่งทาง ไม่รับรองว่าคำขอหนึ่งจะสำเร็จเสมอ
ในการทดสอบสอง connection แยกกัน Emulator เคยปฏิเสธทั้งสองด้วย permission-denied / Rules service-read error
ผลที่ตรวจได้คือ root/receipt/proof/manifest ไม่เปลี่ยน ก่อนตรวจสถานะจากเซิร์ฟเวอร์แล้วลองปิดใหม่อย่างชัดเจน
ทดสอบ final ชนะก่อน close และ close ชนะก่อน final แยกไว้ด้วย
adapter จริงยังต้องกู้สถานะและคงร่างเมื่อคำขอผิดพลาด ห้ามแจ้งว่าสำเร็จหรือเริ่มขาย ID ใหม่แทนทันที

## ล้างข้อมูลอย่างมีขอบเขต

- ลบครั้งละไม่เกิน 20 paths ตาม cursor ที่คำนวณได้ ห้าม recursive delete
- ร่าง inventory ที่ไม่สำเร็จมีได้สูงสุด 115 paths สำหรับ proof/step/proposal; manifest คงอยู่
- inventory ที่ committed ล้างได้เฉพาะ proof สูงสุด 108 ฉบับ ต้องเก็บ proposal และ steps เป็นประวัติการเคลื่อนไหว
  เพราะ receipt ยังไม่ได้บรรจุลำดับคำสั่งและข้อมูลก่อน/หลังทั้งหมด
- platform ที่ committed เก็บ proposal ไว้เป็นที่มา ล้างได้เฉพาะ column proofs
- sale ที่ committed ล้าง price proofs ที่ซ้ำกับ receipt ได้ หลัง reconcile
- กฎตรวจสถานะและขนาดจาก manifest จริง ไม่เชื่อค่า terminal ที่ caller อ้างเอง
  ไม่เพิ่มสิทธิ์ลบ orders, operations, materials หรือล็อต

ไม่มี TTL, managed backup หรือการล้างอัตโนมัติที่ deploy ในรอบนี้
manifest ถาวรและ audit ที่เก็บไว้ยังใช้พื้นที่ ต้องรวมในการวัดความจุจริง

## ต้นทุนและผลตรวจ

เพิ่ม manifest write หนึ่งครั้งต่อ workflow ที่ต้องเตรียม และการอ่าน transaction เพื่อสร้าง/ตรวจ manifest
ขาย 6 บรรทัดจึงเป็น 7 preparation writes + 17 final writes = 24 writes
inventory สูงสุดเป็น 116 preparation writes + 8 final writes = 124 writes
ยังไม่รวมการอ่านเพื่อค้น/กู้ผล การเขียนปิด manifest การลบ cleanup, listeners และคำขอที่ลองใหม่
ตัวเลขเหล่านี้ไม่ใช่จำนวนบิลต่อวันบนแผนฟรีที่รับรอง

เพิ่ม index config สำหรับ preparations: wildcard exemption และ createdAt ASC/DESC แบบ COLLECTION
รวม 13 wildcard + 5 createdAt = 18 field configurations; local CLI validateSpec ผ่าน ไม่มี deploy

ผลตรวจสุดท้ายของรอบนี้:

- Unit 4 ไฟล์ 67 กรณีผ่าน รวม lifecycle 7; เปิดใช้ไฟล์สำรองจริงสำหรับ source tests ไม่มี skipped
- Native regression 6 ไฟล์ 189 กรณีผ่าน (sale53 / inventory51 / platform65 / source9 / collision5 / query6)
- Native lifecycle รันสุดท้าย 24 กรณีผ่าน รวมสอง connection, expiry, collision, atomic close,
  retained audit และการปลอมข้อมูล input ของการผลิต 7 แบบ
- ก่อนแก้ oracle การชนกัน รอบ 211 กรณีผ่าน 209 / ไม่ผ่าน 2 เพราะคาดว่าต้องสำเร็จหนึ่งคำขอเสมอ
  แก้เฉพาะการตรวจผลและเพิ่ม deterministic controls แล้วรัน lifecycle ทั้งไฟล์ใหม่ ไม่อ้างว่ารันทั้ง 213 ในครั้งเดียว
- ช่วงพัฒนาพบ expression budget ใน dense sale และ four-lot production: ผูกเงื่อนไขเดิมด้วย tuple
  และย้ายการตรวจต้นทุน input ไป phase ถัดไปที่บังคับผ่านอยู่แล้ว ไม่ตัด validation
  reviewer อิสระตรวจการผูก identity, receipt collision, getAfter และการแบ่ง phase แล้ว

ยังเหลือ initial snapshot/reverse-index validator, codec ประวัติแบบ lossless,
ข้อตกลงชุดขาย 15 material, compiled/request/index envelope และ live index validation ก่อนเลือกกฎ production
จากนั้นจึงเชื่อม online adapter/journal/login/หน้าร้าน รายงาน ย้ายข้อมูล และซ้อมสองเครื่อง
