# ขอบเขตข้อมูลและโควตา — 22 ตุลาคม 2026 (ปรับงบ lifecycle 25 ต.ค.)

สถานะ: ตรวจตัวอย่างต้นแบบแล้ว ยังไม่รับรองการย้ายข้อมูลหรือเลือกกฎ production
ไม่มีการแก้ข้อมูลร้านจริง เปิด billing หรือ deploy ส่วนหน้าร้านเดิมยังไม่ใช้ Firebase

## ขอบเขตที่ใช้ตัดสินใจ

| ประเด็น | ขอบเขตต้นแบบ / ผลตรวจ |
| --- | --- |
| วัตถุดิบ | ทะเบียนได้ 64 รวมรายการเก็บถาวร; ชุดที่กฎตรวจทุกการขายมี 15 รายการ |
| เกิน 15 รายการขาย | ยังไม่รองรับพร้อมกัน; สลับเข้าได้เฉพาะสมาชิกเดิมที่ไม่มีสูตรขายอ้างอิง ห้ามตัดสูตรหรือวัตถุดิบออกเพื่อให้ผ่าน |
| ล็อต | ทำงานพร้อมกันไม่เกิน 4 ช่อง; ประวัติต้องคง ID/ต้นทุน/วันที่เดิมไว้ |
| ประวัติล็อต | ordinal ใหม่ต้องต่ำกว่า 1,000; ทดสอบรับล็อตที่ 1,000 ผ่าน และล็อตที่ 1,001 ถูกปฏิเสธ โดยเอกสารเดิมไม่เปลี่ยน |
| ร่างผสม | 1–6 ขั้นตอน รวมวัตถุดิบต่างกันไม่เกิน 6 รายการ; ผลิตใช้ 1–2 วัตถุดิบตั้งต้น |
| ปริมาณ | หน่วยย่อย 1/100; ยอดและค่าความต้องการที่บังคับใช้สูงสุด 1,000,000,000; ไม่ปัดค่าที่นำเข้าเพื่อให้พอดี |
| ต้นทุน | Baht/unit แบบ IEEE เดิม ช่วง 0–100,000 ทั้งค่าเฉลี่ยและทุกล็อต รวมล็อตเหลือศูนย์ |
| ราคา/ยอดเงิน | จำนวนเต็มสตางค์; ต้องผ่านขอบเขตแต่ละคำสั่งและยอดรวม ไม่ใช่เพียงราคาแต่ละรายการ |
| วันที่ | วันจริงช่วง 0–100,000 หรือ sentinel 999999 ตามชนิดข้อมูล; การผลิต/ร่างผสมผูกวันไทยของเซิร์ฟเวอร์ |
| ความแม่นยำ | ตัวนำเข้าต้องใช้ toScaledExact และตรวจ sum ทุก lotQty ตรง stock; ต้องตรวจทั้ง snapshot ก่อนเผยแพร่ |

**1,000 ล็อตไม่ใช่คำรับรองว่าทุกข้อมูลขนาดนั้นบันทึกได้** ความยาวโน้ตและข้อมูลเดิมมีผล
ตัวอย่างสังเคราะห์ 1,000 ล็อตยังเก็บเป็น material document ได้ แต่สำเนา before/after ในร่างผสม
เกิน guard JSON 400,000 bytes แล้ว ระบบต้องปฏิเสธก่อนเตรียม ไม่ลบประวัติหรือแบ่งยืนยันแบบซ่อนผู้ใช้
การเก็บล็อตนอก material document หรือหมุนประวัติอย่างปลอดภัยยังต้องออกแบบก่อนอ้างการเติบโตไม่จำกัด

ชุดขาย 15 รายการเป็นข้อจำกัดสถาปัตยกรรมปัจจุบัน: กฎตรวจ 15 material guards + root + receipt
และเตรียมราคาได้ถึง 3 เอกสาร แตะขอบ 20 dependencies ของคำขอรวมแล้ว การเพิ่มรายการที่ 16
ต้องเปลี่ยนและพิสูจน์การจัดการตรวจทั้งหมด ไม่ใช่เพิ่มค่าคงที่ ตัวอย่างร้านนี้มีวัตถุดิบทั้งหมด 18
แต่ชุดสูตรขายที่ต้นแบบใช้มี 15 จึงไม่ต้องลบอีก 3 รายการออกจากทะเบียน
นี่เป็นผลตรวจ snapshot นี้ ไม่ใช่การอนุมัติจำกัดความสามารถผลิตภัณฑ์ถาวร

## วัดข้อมูลสำรองจริงแบบอ่านอย่างเดียว

ต้นฉบับ 88,755 bytes; SHA-256 ยังคง
DBA6C3C792E746223331ECDA12BC438648ECFDC1DF911581E67BDDBD50B8F3BA
ตัวอย่างมี 18 material / 15 protected / สูงสุด 1 historical และ 1 working lot ต่อรายการ
ค่าด้านล่างเป็น bytes ของชุดเอกสารที่ฉายด้วย test adapter ไม่ใช่ข้อมูลนำเข้า production

| ตัวอย่าง | เอกสารใหญ่สุดตามสูตร storage | Commit protobuf แบบจำลอง |
| --- | ---: | ---: |
| root + วัตถุดิบเริ่มต้น 19 เอกสาร | 39,380 | 94,508 |
| ขายกลุ่มเลือก 6 บรรทัด 17 เอกสาร | 39,410 | 113,838 |
| ขายเลือก 11 addon / 6 บรรทัด 17 เอกสาร | 68,723 | 154,887 |
| ยืนยันร่างรับเข้า → ผลิต → ตรวจนับ 5 เอกสาร | 39,422 | 49,573 |

เอกสารเตรียมราคาที่ใหญ่สุด 19,354 bytes; header ขั้นตอนร่างผสมใหญ่สุด 20,825 bytes
ความลึกสูงสุดของตัวอย่าง 5 ระดับ ตรวจยอดล็อต/ต้นทุน/ขนาดในตัวอย่างไม่พบ violations
ประวัติบิล 4 รายการและ activity logs 29 รายการ **ไม่อยู่ในการฉายข้อมูลนี้**
ยังต้อง codec ที่รักษาบิลยกเลิก snapshot ราคา/ต้นทุน เวลาและข้อมูลเดิมโดยไม่คำนวณประวัติใหม่

รันซ้ำใน worktree ด้วย `node scripts/firebase-profile-audit.mjs --input <backup.json>`
สคริปต์พิมพ์เฉพาะจำนวน ขนาด และรหัสปัญหา ไม่มี ID ร้าน/รายการหรือ URL ในรายงาน
ไม่สร้าง Firebase app ไม่อ่าน credentials ไม่เรียกเซิร์ฟเวอร์และไม่แก้ต้นฉบับ
`sampleFits: true` หมายถึงตัวอย่างที่ตรวจผ่านเท่านั้น พร้อม `productionReady: false` เสมอ

## วิธีวัดและช่องว่าง

Storage ใช้ UTF-8 + overhead ตาม [สูตรทางการ](https://firebase.google.com/docs/firestore/storage-size)
รวมชื่อ path, field names, map overhead และ timestamp 8 bytes ทดสอบเทียบตัวอย่าง 147 bytes ของเอกสารทางการแล้ว
Commit ใช้จำนวน bytes ของ tag/varint/length ตาม [Document/Value proto](https://github.com/googleapis/googleapis/blob/master/google/firestore/v1/document.proto),
[Write proto](https://github.com/googleapis/googleapis/blob/master/google/firestore/v1/write.proto) และ
[CommitRequest proto](https://github.com/googleapis/googleapis/blob/master/google/firestore/v1/firestore.proto)
สำหรับ full-set และ serverTimestamp ชั้นบน; Date ใช้ขอบบน timestamp แบบอนุรักษนิยม
รองรับชนิดที่ต้นแบบใช้เท่านั้น ชนิดอื่น/NaN/Infinity/จำนวนเต็มไม่ปลอดภัย/nested arrays ถูกปฏิเสธ
จำนวนนี้ไม่ใช่การจับ payload จริงของ SDK และไม่รวม transaction token, masks, preconditions หรือ index deltas

เกณฑ์อ้างอิงคือ document 1 MiB, request 10 MiB และ map/array depth 20
จาก [Firestore limits](https://firebase.google.com/docs/firestore/quotas) ซึ่งยังระบุขอบ index แยกต่างหาก
รอบถัดมาเตรียม exemptions และ createdAt indexes ใน `firestore.indexes.json` แบบ local แล้ว ยังไม่ deploy
ดู [index-and-admission-profile.md](index-and-admission-profile.md) สำหรับ query contract และ guard ร่วม
ตัววัดเพิ่ม escaped field-path checks แล้ว แต่ยังไม่รับรอง index entries/bytes หรือ transaction index delta
หรือ encoded byte envelope ทุกข้อมูลที่สร้างได้ตามขอบจำนวน จึงยังไม่ผ่านประตู production ทั้งหมด
Rules source ปัจจุบัน 150,820 bytes; การโหลด Emulator ผ่านไม่ใช่การรับรอง compiled production ruleset ขั้นสุดท้าย

## งบโควตา

โควตาฟรีปัจจุบันอ่าน 50,000 / เขียน 20,000 / ลบ 20,000 ต่อวัน และ storage 1 GiB
มีค่า transfer แยก รายวัน reset ตาม Pacific time ไม่ใช่เที่ยงคืนไทย และใช้ร่วมทั้งฐานข้อมูล
อ้างอิง [โควตาทางการ](https://firebase.google.com/docs/firestore/quotas)

| งาน | เขียนเตรียม | เขียนยืนยัน | รวมเขียน | allowance อ่าน Rules ที่เผื่อไว้ |
| --- | ---: | ---: | ---: | ---: |
| ขาย 1 บรรทัด | 2 | 17 | 19 | 40 |
| ขาย 6 บรรทัด | 7 | 17 | 24 | 90 |
| ร่างผสม 6 ขั้น / 6 material | 116 | 8 | 124 | 1,180 |

allowance ใช้ 10 dependencies ต่อ preparation request และ 20 ต่อ final batch
เป็นเพดานเผื่อสำหรับประเมิน ไม่ใช่ billable reads ที่วัดได้จริง และไม่รวม client reads/listeners
ปัจจุบันรวม manifest: ร่างผสมเก็บ 116 ฉบับ ส่วนราคาขาย 6 บรรทัดเขียนเตรียม 7 ครั้งแต่เก็บ 4 ฉบับ
ยังไม่รวม transaction read ของ manifest, ค้นร่าง, reconcile write และ cleanup deletes
ร่างถูกทิ้งยังใช้พื้นที่และโควตาที่เขียนไป มีต้นแบบ [cleanup/reconciliation](preparation-lifecycle.md) แล้วแต่ยังไม่เชื่อมใช้งาน
TTL และ managed backup ต้องใช้ billing จึงไม่ใช้แทน cleanup/สำรองในแผนฟรีนี้

หากใช้เฉพาะโควตาเขียนทั้งวันกับขาย 6 บรรทัด จะได้เพดานทางคณิตศาสตร์ 833 บิล
หรือใช้กับร่างผสมสูงสุดอย่างเดียว 161 ชุด **ไม่ใช่จำนวนใช้งานจริงที่รับรอง**
ยังมีขายแข่งกัน/ลองใหม่ รายงาน เปิดเครื่องใหม่ ล้างร่าง เปลี่ยน catalog และข้อมูลที่ sync ไปทุกเครื่อง
การแก้ root+15 materials หนึ่งบิลอาจส่งการเปลี่ยนเอกสาร 16 ฉบับให้ listener ต่อเครื่องที่เฝ้าทั้งชุด
อ่านเพื่อประเมิน Rules ก็ใช้โควตา และการ reconnect อาจอ่านชุดใหม่ ตาม [เอกสาร billing](https://firebase.google.com/docs/firestore/pricing)
จึงต้องวัดกับ online adapter และจำนวนเครื่องจริงก่อนประกาศความจุรายวัน

## ข้อสรุปสำหรับประตูถัดไป

ตัวอย่างร้านปัจจุบันอยู่ในขอบจำนวน/ต้นทุน/ขนาดที่ตรวจ แต่ **full import และ free-tier capacity ยังไม่ certified**
เตรียมแบบ index/exemptions, dynamic byte admission และ lifecycle ในโมเดลแล้ว เหลือตรวจ build/query จริงและเชื่อม lifecycle, ปิดข้อจำกัด encoded/request ทั้งชุด,
ยืนยันนโยบายชุดขาย 15 รายการหรือออกแบบใหม่ และ codec ประวัติแบบ lossless ก่อนเลือก production policy
จากนั้นจึงเชื่อม login/online adapter/หน้าร้าน/รายงาน และซ้อมย้ายข้อมูลกับสองเครื่อง
