# แบบ index และการรับคำสั่งตามขนาดข้อมูล

22 ตุลาคม 2026; ปรับจำนวนตาม lifecycle 25 ต.ค. — ยังไม่ deploy และยังไม่ใช่ public protocol
แนะนำให้ใช้ `tests/firestore/candidates/prepared.rules` เป็นชุดเข้าตรวจทานขั้นสุดท้าย
เพราะครอบคลุมการเตรียมราคาของบิลหลายบรรทัดและคำสั่งสต็อกที่ทดลองแล้ว
`summary.rules` คงเป็นตัวเทียบผล ไม่เลือกกลับมาใช้แทนข้อกำหนดบิลซับซ้อน
`firestore.rules` สำหรับ deploy ยังคง deny-all

## แบบ index ที่เตรียมไว้

`firestore.indexes.json` ปิด automatic field indexes ด้วย wildcard ของ 13 collection IDs
เปิดเฉพาะ createdAt สองทิศทางแบบ COLLECTION ใน orders, operations, preparedInventory, preparedPlatforms และ preparations
รวม 18 field configurations ไม่มี composite index, collection-group index หรือ TTL
กฎนี้ครอบคลุมทุก collection ชื่อเดียวกันใน project จึงต้องตรวจชื่อชนกันก่อน deploy จริง
แนวทาง wildcard และการเปิดบาง field อ้างอิง [Google Cloud index overview](https://docs.cloud.google.com/firestore/native/docs/standard-index-overview)
และรูปแบบไฟล์ตาม [Firebase index definition](https://firebase.google.com/docs/reference/firestore/indexes)

| ข้อมูล | วิธีอ่านที่ออกแบบไว้ | field index |
| --- | --- | --- |
| shops / generations | อ่าน document ตาม ID | ไม่มี |
| materials | อ่านตาม ID หรือเฝ้าคอลเลกชันใน generation ปัจจุบัน ขนาดทะเบียนจำกัด | ไม่มี |
| catalog / recipe / lots | อยู่ใน root/material อ่านพร้อม document; ไม่ query nested payload | ไม่มี |
| orders / operations | ช่วงเวลา createdAt, เรียงเวลาและ ID ทิศเดียวกัน, limit และ snapshot cursor | createdAt ASC/DESC |
| preparedInventory / preparedPlatforms | อ่านตาม opId; สแกนตามอายุด้วย createdAt แบบแบ่งหน้าใน generation ที่กำหนด | createdAt ASC/DESC |
| preparations | ค้น manifest ทั้งสามชนิดตามอายุ แบบแบ่งหน้าไม่เกิน 20 พร้อม snapshot cursor | createdAt ASC/DESC |
| preparedSales / lineProofs / steps / proofs / columnProofs | อ่าน ID ที่คำสั่งระบุไว้ | ไม่มี |

ไม่มี query status/uid/kind ร่วมกับช่วงเวลาในสัญญานี้ หากเพิ่มภายหลังต้องทบทวน index และค่าอ่าน
ไม่ต้องใช้ role หรือ membership เพื่ออ่าน: บัญชีที่ login ทุกบัญชีอ่านร้านเดียวกันตามกฎเดิม
การอ่านข้าม generation ที่ไม่ active และระหว่าง maintenance ถูกปฏิเสธ
การแบ่งหน้าด้วยเวลาเท่ากันต้องใช้ cursor ที่รวม document ID เพื่อไม่ข้ามรายการ
การระบุ documentId เป็นตัวเรียงอย่างชัดแจ้งอาจมีผลต่อการคิด index-entry reads จึงไม่รวมเป็นความจุฟรีที่รับรอง
ดู [Firestore pricing](https://firebase.google.com/docs/firestore/pricing)

index createdAt ช่วยค้นร่างตามอายุ แต่ **ไม่ได้เพิ่มสิทธิ์ลบร่าง**
รุ่น 25 ต.ค. เพิ่ม manifest/cleanup/reconciliation ตาม [วงจรร่าง](preparation-lifecycle.md)
ต้องใช้ Rules ที่อนุญาตเฉพาะข้อมูลเตรียมตามสถานะ ห้ามลบ receipt หรือประวัติธุรกิจเพื่อคืนโควตา
บิลประวัติที่นำเข้าต้องมี canonical createdAt ชนิด Timestamp และเก็บเวลาเดิมไว้ใน provenance
ห้ามปล่อยข้อมูลที่ไม่มี field นี้แล้วคาดว่าจะปรากฏใน query ประวัติ

## ตรวจขนาดร่วมกันก่อนเริ่มงาน

ตัวตรวจต้นแบบ `tests/firestore/summaryAdmission.js` กำหนดขอบเขตเผื่อ:

- storage ต่อ document ไม่เกิน **800,000 bytes**
- Commit แบบจำลองต่อ request ไม่เกิน **8 MiB**
- ยังต้องผ่านขนาด/ความลึก/field path ของ Firestore และข้อจำกัดธุรกิจเดิมทั้งหมด
- ร่างผสมยังมี guard UTF-8 JSON 400,000 bytes เพิ่มเติม ไม่ยกเลิกเพียงเพราะผ่าน guard นี้

ตรวจทุก preparation request และ final atomic batch ก่อนส่ง request แรก
ไม่รวม preparation ต่าง request เป็นก้อนเดียว แต่ต้องตรวจ final write set ทั้งก้อน
หากขั้นตอนท้ายเกินขนาด ให้ปฏิเสธทั้ง workflow โดยไม่เตรียมบางส่วน ไม่ตัดบรรทัด สูตร ล็อตหรือข้อความ
saleBatches, inventoryBatches และ platformBatches สร้างรายการ request ให้ตรวจได้ตาม helper ที่มีอยู่
คำสั่งอื่นใช้ admitBatches กับ write set จริง ไม่ใช่อาศัยผลของตัวอย่างขายแทน

ขอบเขตเหล่านี้เป็น **การรับข้อมูลแบบมีเงื่อนไขตาม bytes จริง** ไม่ใช่คำรับรองว่าขอบจำนวนทุกตัวใช้พร้อมข้อความยาวสุดได้
ทดสอบผ่านกรณี 64 menu/addon/group, 45 offered choices, 4 platforms, 4 working lots และบิล 6 บรรทัดที่มีโน้ตไทย
ทดสอบเตรียมเพิ่มช่องทางที่ 4 ใน catalog หนาแน่น: ปัจจุบัน 35 requests / 36 writes รวม manifest ผ่าน
อีกกรณี 200 historical lots ต่อ material พร้อมโน้ตไทย 1,000 ตัวอักษร
แต่ละ material ยังต่ำกว่า 800,000 bytes แต่ final sale รวมใหญ่เกิน request guard จึงถูกปฏิเสธทั้งชุด
ก่อนหน้านี้ยังพิสูจน์แล้วว่า material 1,000 ล็อตอาจเก็บได้ แต่สำเนาในร่างผสมเกินขนาดได้

รวมการตรวจ escaped field path แล้ว: จำกัดตาม UTF-8 ของ path หลัง quote/escape ไม่ใช่ดูความยาวชื่อแต่ละ field อย่างเดียว
ตัวอย่างข้อมูลสำรองจริงผ่าน admission ทั้งขายกลุ่ม ขาย 11 addon และร่างรับเข้า/ผลิต/ตรวจนับ
ปัจจุบันรวม manifest: บิล 6 บรรทัดใช้ 8 requests / 24 writes; ร่างตัวอย่าง 4 ขั้น / 3 material ใช้ 43 requests / 47 writes
ตัวนำเข้าและ adapter จริงต้องตรวจ namespace/path และ write set ที่จะส่งจริงทั้งหมดอีกครั้ง

## สิ่งที่ผลทดสอบรับรองและยังไม่รับรอง

ผ่าน unit 54 กรณีใน 3 ไฟล์ (admission13 / metrics22 / source19) และ Emulator 110 กรณีใน 3 ไฟล์
ในจำนวน Emulator มี query/auth/cursor ใหม่ 6 กรณี รวมสองบัญชีอ่านหน้าต่อกันและเวลาเดียวกัน
Firebase CLI ที่ติดตั้งตรวจ schema ของ index config ผ่านแบบ local โดยไม่เรียก API
candidate Rules ไม่เปลี่ยนในรอบนี้ ผลผ่านไม่ใช่การรันทั้งชุดเก่าทั้งหมดใหม่

[Emulator ไม่บังคับ index/limits เหมือน production ทุกกรณี](https://firebase.google.com/docs/emulator-suite/connect_firestore)
จึงยังต้องตรวจ index build และ query กับสภาพแวดล้อมจริงที่อนุมัติก่อนเปิดร้าน
แบบจำลอง Commit ไม่รวม token/preconditions/index deltas หรือ capture transport จริงของ SDK
headroom 2 MiB ไม่ใช่หลักฐานแทนการตรวจ transaction envelope ขั้นสุดท้าย
การยกเว้น payload index แก้การเติบโตของ index จาก map/lot/proof ในแบบที่เสนอ แต่ยังไม่รับรอง storage หรือโควตารวมจริง

guard นี้ยังอยู่ใน test helpers ไม่ได้บังคับใน Rules และยังไม่ได้เชื่อมทุกเส้นทางเขียนของหน้าร้าน
ต้องเรียกจาก codec/import admission และ online adapter อย่างครบถ้วนก่อนใช้งาน
นี่ไม่ใช่การเลื่อนต้นแบบเป็น protocol โดยอัตโนมัติ และไม่ใช่การยืนยันความจุรายวัน

## ข้อเสนอการเลือกชุดหลัก

นำ prepared successor + index/admission profile นี้เข้าตรวจทานร่วมกับ invariants ของ importer
ก่อนตรึง protocol ต้องทบทวนกฎทุกคำสั่งทั้งชุด, compiled rules budget, request/index envelope,
นโยบาย 15 protected materials และการเชื่อม lifecycle ที่ไม่กระทบประวัติ
snapshot ร้านปัจจุบันอยู่ในชุด 15 ที่ตรวจได้ แต่ไม่ถือว่าผู้ใช้อนุมัติขีดจำกัดผลิตภัณฑ์ถาวร
เมื่อปิดประตูนี้แล้วจึงทำ codec และเชื่อม login/online adapter/หน้าร้านต่อไป
