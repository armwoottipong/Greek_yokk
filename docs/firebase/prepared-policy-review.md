# ผลตรวจทานกฎชุดเตรียมราคา

23 ตุลาคม 2026 — ตรวจ source และทดสอบโจมตีเฉพาะจุดแล้ว ยังไม่ตรึง public protocol
การตรวจนี้ไม่ใช่การ deploy หรือนำเข้าข้อมูลร้านจริง `firestore.rules` ยังคง deny-all

## ช่องโหว่ที่พบและแก้

ระดับสูง: หลักฐาน material ที่ใช้ร่วมกันตรวจเพียง `lastOpId` และ `lastOpIndex`
แต่ orders และ operations เป็นคนละคอลเลกชัน จึงสร้างเอกสารที่ใช้ ID เดียวกันได้
หลังตรวจนับ 15 material ด้วย ID X ผู้ใช้ที่ login สามารถสร้างบิล X โดยไม่เขียน material ทั้งชุด
ร่องรอยจากการตรวจนับเก่าผ่าน fence ของบิลใหม่ ทำให้บิลถูกบันทึกโดยไม่มีการตัดสต็อก
ทิศกลับกันจากขาย X ไปแก้ catalog X หรือตรวจนับ X ก็ละ material writes ได้
ไม่มี role ใดแก้ปัญหานี้ได้ ต้องผูกหลักฐานกับคำสั่งที่ถูกต้อง

แก้ `touchedAt` ใน candidate ให้เปรียบเทียบชุด
`[lastOpId, lastOpKind, lastOpIndex] == [opId, kind, index]`
ดังนั้นร่องรอยจาก sale_set ไม่แทน catalog/stock_count และกลับกัน
receipt ในแต่ละ namespace ยังสร้างซ้ำไม่ได้ และ global revision ยังเพิ่มตามคำสั่งจริง
ไม่ห้ามใช้ ID เดียวกันข้าม namespace โดยพลการ: หากเขียน material ครบและผ่านกฎแต่ละคำสั่งยังบันทึกได้

กรณีทดสอบ `summaryPolicyReviewProof.test.js`:

| กรณี | กฎเดิม | กฎหลังแก้ |
| --- | --- | --- |
| count X → sale X โดยละ material ทั้งหมด | ยอมรับผิดพลาด | ปฏิเสธ |
| sale X → catalog X โดยละ material ทั้งหมด แต่มี shape proof ที่จำเป็น | ยอมรับผิดพลาด | ปฏิเสธ |
| sale X → count X โดยละ material ทั้งหมด | ยอมรับผิดพลาด | ปฏิเสธ |
| count X → sale X เขียน material ครบ | ผ่าน | ผ่าน |
| sale X → catalog X เขียน material ครบ | ผ่าน | ผ่าน |

RED จริงก่อนแก้คือ 3 กรณีที่ยอมรับผิดพลาด และ 2 positive controls ผ่าน
ตอนแรก catalog fixture ลืม shape proof จึงถูกปฏิเสธด้วยเหตุอื่น แก้ fixture ให้ครบก่อนอ้าง RED
การเพิ่ม conjunction ตรวจชนิดตรง ๆ ทำให้ positive sale เกิน 1,000 expressions
เปลี่ยนเป็น tuple equality ที่มีเงื่อนไขเท่ากันแล้วทั้ง 5 ผ่าน ไม่ถอดการตรวจชนิดหรือจำกัดขอบบิลลง
การตรวจซ้ำทั้ง candidate 723 กรณีต่อมาพบ positive source workflow ขั้น clear addon เกินงบอีกหนึ่งจุด
แก้เฉพาะ catalogRoot/catalogOperation ให้เรียก touchedAt ทั้ง 15 ตำแหน่งโดยตรง แทน touched ที่มีทางเลือกข้ามช่องเกินจำนวน
การตัดทางเลือก OR นี้เข้มขึ้นเสมอ และให้ผลเท่ากันกับเดิมเมื่อมี 15 สมาชิกตาม profile
จึงรักษาการตรวจชนิดและอ้างอิงสูตรครบ โดยไม่เพิ่มค่า access หรือถอด validation ของ receipt
กฎ `summary.rules` เก็บไว้เป็น reference เก่า ไม่ได้แก้ในรอบนี้และห้ามนำไปใช้แทน candidate ที่ตรวจแล้ว

ใช้ reviewer อิสระหนึ่งตัวอ่านกฎทั้งไฟล์โดยไม่สืบทอดประวัติ แล้วผู้ทำหลักสร้าง fixture และรันทดสอบเอง
reviewer ตรวจ patch และ fixture อีกครั้ง ไม่พบช่องโหว่อิสระระดับสูงเพิ่มเติมจากการอ่านรอบนี้
นี่ไม่ใช่หลักฐานว่าไม่มีข้อผิดพลาดเหลือ ต้องใช้ร่วมกับ regression และ preconditions ของข้อมูลนำเข้า

## ขอบเขตการตรวจเส้นทางคำสั่ง

| กลุ่มคำสั่ง | สิ่งที่ตรวจจาก source / หลักฐานที่ต้องรักษา |
| --- | --- |
| sale_set | 15 material guards; receipt และ root ผูก revision; ราคาเตรียมผูก author/catalogRevision/platform; shortage และต้นทุนตรวจใน leaf |
| catalog/menu/addon/group | อัปเดต reverse indexes/cache และบังคับ leaf ทั้งชุดผ่าน touchedAt ที่แก้แล้ว; shape/reference proof ตามชนิดคำสั่ง |
| count/waste/cancel | marker ต้องตรงชนิดคำสั่ง; ปรับล็อตเดิมตาม delta; cancellation ผูกสถานะบิล committed → cancelled และ receipt สร้างครั้งเดียว |
| receive/package receive/produce/switch | specialized links ตรวจ kind/author/revision; ผลิตต้องตัด input และเพิ่ม output ใน commit เดียว; provenance ของล็อตเดิมคงอยู่ |
| material create/archive/metadata/details/measure/recipe/type/enrol | whitelist field diff; target revision/registry/references; type/enrol ต้องรักษาสมาชิกและ cache ของชุดขาย |
| platform | immutable proposal/proof chain เมื่อเพิ่มช่องทาง; ผูก root revision; ไม่ปิดช่องทางสุดท้าย |
| inventory_batch | immutable chain ทีละขั้น/ทีละ material; final bind initial snapshot และ final shadow; วันไทย/revision เปลี่ยนทำให้ร่างเก่าใช้ไม่ได้ |
| read/query | login และ active generation; index/cursor profile แยกจากข้อเท็จจริงว่า Emulator ไม่บังคับ index production |

ไม่ได้เพิ่มสิทธิ์หรือยกเลิกข้อจำกัดเดิมในคำสั่งใด และไม่ได้รับรองการจัดการผลตอบกลับหาย/ออฟไลน์จาก Rules อย่างเดียว
online adapter ยังต้องรอผล server, เก็บตะกร้า/ร่าง และ reconcile receipt เดิมก่อน retry

## ผลตรวจรอบสุดท้าย

- หลังแก้ marker แบบ tuple รัน candidate ครบ 16 ไฟล์: 722 ผ่าน / 1 ล้ม จาก 723 กรณี
  กรณีล้มคือ source clear-addon เกินงบ Rules ที่อธิบายด้านบน
- หลังแก้เฉพาะการเรียก fence ของ catalog รันส่วนที่เกี่ยวข้องใหม่ 3 ไฟล์: **67 ผ่าน**
  ได้แก่ source9, prepared sale53 และ collision5
- ตรวจ enrol ขอบ 64 เมนู/64 addon, cost-rank ต้นแถว และ native workflow อีก **3 ผ่าน**
  อีก 175 กรณีในไฟล์นั้นกรองออกโดยตั้งใจ ไม่ได้อ้างว่ารันทั้ง 723 ใหม่หลังแก้ catalog
- Unit ที่เกี่ยวข้อง **60 ผ่าน** (metrics28 / admission13 / source19) รวมข้อมูลสำรองจริงแบบ opt-in
- lint ทั้ง src/tests/config และสคริปต์ตรวจผ่าน; diff check ผ่าน ไฟล์สำรอง SHA ไม่เปลี่ยน และ active app ไม่เปลี่ยน

ไม่มีกรณีล้มค้างในชุดที่รันซ้ำหลังแก้ แต่หลักฐานยังเป็น Emulator/ต้นแบบ ไม่ใช่ production certification

## สมมติฐานของข้อมูลเริ่มต้น

กฎขายตรวจ delta ของล็อต ไม่สามารถไล่ตรวจทุกประวัติล็อตใหม่ในทุกบิลได้
ความถูกต้องจึงเริ่มจาก snapshot ที่ตัวนำเข้าตรวจ และแต่ละคำสั่งต้องรักษา invariants ต่อไป
audit เดิมตรวจยอดรวม/ต้นทุนได้ แต่ยังปล่อย costRank ซ้ำ, slotIds ผิด และ registry ไม่ครบผ่าน
เพิ่ม negative cases แล้วแก้ตัวตรวจต้นแบบให้จับได้ พร้อม activeLotId และ sentinel วันที่ผิด
หกกรณีใหม่มี RED 5 และกรณี hidden-positive เดิมถูกจับได้อยู่แล้ว

สิ่งที่ต้องตรวจใน **ตัวนำเข้าจริง** ก่อนเผยแพร่ generation:

| ส่วน | invariant ที่ต้องตรวจ |
| --- | --- |
| ทะเบียน | materialIds เท่ากับเอกสารทั้งหมดแบบไม่ซ้ำ; IDs/path namespace ถูกต้อง; costRank ไม่ซ้ำและลำดับสมาชิกชุดขายถูกต้อง |
| ยอด | stock เท่ากับ sum ทุก lotQty; จำนวนเต็มหน่วย 1/100 อยู่ในขอบ; lotIds/lots/lotQty มี key ชุดเดียวกัน ยกเว้น sentinel |
| ล็อต | slotIds ตรง allocationIds + padding; ครอบคลุมล็อตบวก/ธงล็อตศูนย์; วันที่/ordinal/sortKey และลำดับเลือกถูกต้อง |
| ค่าและ provenance | ต้นทุนเฉลี่ยและทุกล็อตในขอบ; ข้อมูลเดิม qty/isInUse/วันที่/initialQty ไม่ถูกแปลงทิ้ง; sentinel คงค่าที่กฎใช้ |
| สูตร | rawRecipe/hasPackage → effective recipe สอดคล้องกัน; recipeIndex ของทั้ง 15 material ตรง catalog และ revision |
| อ้างอิงย้อนกลับ | group.menuIds/multiMenuIds, productionUsers และทะเบียนช่องทาง/ราคาไม่มี orphan หรือข้อมูลเกินจริง |
| ประวัติและคำสั่ง | receipt/lot allocations และ cancelled state ไม่คำนวณใหม่; ห้ามมี lastOpId หรือ proof links ที่เป็นร่องรอยคำสั่งปลอม |
| ขนาดและ index | ตรวจทุกเอกสาร/ทุก request ที่จะส่งจริงก่อน IO; index profile และ timestamps สำหรับ query ต้องพร้อม |

ตัวตรวจปัจจุบันเป็น audit บาง invariant เท่านั้น ไม่ใช่ validator ครบตารางนี้ และยังไม่ใช่ codec/importer
ผล `sampleFits` ของไฟล์สำรองไม่เลื่อนเป็นใบอนุญาตนำเข้าจริง

## ประตูตรึงโครงสร้างข้อมูลกลาง

**ยังไม่ผ่านประตูตรึง protocol** แม้แก้ช่องโหว่ที่พิสูจน์ได้แล้ว

- byte guard อยู่ใน test helpers ต้องต่อเข้าทุกเส้นทางเขียนของ online adapter และ importer
- preparedSales ยังไม่มี parent manifest; ต้องกำหนดการค้นหา/ลบร่างค้างโดยไม่แตะ receipt หรือประวัติธุรกิจ
- ต้องปิดข้อจำกัด transaction token/preconditions/index delta และตรวจ index build/query จริงเมื่ออนุมัติขั้น staging
- ต้องตัดสินใจรองรับชุดขาย 15 material ให้ชัด snapshot ปัจจุบันพอดีแต่ไม่ใช่ข้อจำกัดถาวรที่ผู้ใช้ยอมรับแล้ว
- ยังไม่มีตัวตรวจ initial snapshot/reverse indexes และประวัติแบบ lossless ครบทั้งตาราง
- ต้องตรวจ compiled production ruleset และทั้งชุดคำสั่งอีกครั้งก่อน deploy

ข้อเสนอ ณ 23 ต.ค.: ออกแบบ lifecycle ของ preparation (manifest, abandon/expire, reconciliation และ bounded cleanup)
พร้อม invariants และแยก business receipt ออกจากข้อมูลเตรียมที่ลบได้ แล้วพิสูจน์ด้วย Emulator ก่อนตรึง protocol
ไม่เริ่ม deploy หรือ codec สาธารณะจากผล review นี้โดยอัตโนมัติ
