# Yoggie invitation mailer (owner setup required)

ตัวเว็บสร้างคำขอส่งคำเชิญเมื่อผู้ดูแลเพิ่มอีเมลที่อนุญาต ส่วนตัวส่งเป็น Google Apps Script ส่วนตัวของ `armwoottipong@gmail.com` ใช้ MailApp ส่งในชื่อ **Yoggie** ทุกประมาณ 5 นาที ไม่มี Cloud Functions, service-account key, webhook หรือข้อมูลรับรองในเว็บ จึงไม่ต้องเปิด Firebase billing เพื่อใช้ตัวส่งนี้

**สถานะ:** เตรียมโค้ดและทดสอบแบบจำลองแล้ว ยังไม่ได้ติดตั้ง trigger, อนุมัติ OAuth หรือส่งอีเมลจริง การ deploy หน้าเว็บเพียงอย่างเดียวยังไม่เปิดการส่งอีเมล เจ้าของต้องทำขั้นตอนด้านล่าง

## สัญญาข้อมูล

ฐานข้อมูลคือ `projects/yoggie-db/databases/(default)` เอกสารร้าน `shops/greek-yogg` คำขอคือ `shops/greek-yogg/invitations/{operationId}`:

```js
{
  email: 'recipient@gmail.com', // lowercase; single recipient
  role: 'viewer',              // viewer | manager | admin
  createdBy: 'firebase-auth-uid',
  createdAt: serverTimestamp(),
  status: 'pending'
}
```

Rules ต้องอนุญาตเฉพาะ admin สร้างคำขอซึ่งตรงกับ allowlist และสิทธิ์ปัจจุบัน ห้าม client เปลี่ยนหรือลบคำขอ การเพิ่มสิทธิ์และสร้างคำขอต้องสำเร็จใน transaction เดียว ไม่ใช้คำขออีเมลเป็นหลักฐานสิทธิ์เข้าเว็บ

Worker ตรวจ `allowedEmails[email] === true` และ `userRoles[email] === role` จากเอกสารร้านอีกครั้งหลัง claim ก่อนส่ง บัญชีเก่าที่ไม่มี `userRoles[email]` ถือเป็น `viewer` ถ้าถอดสิทธิ์หรือเปลี่ยน role ก่อนตรวจ จะบันทึก `cancelled` ไม่ส่ง การตรวจสิทธิ์กับบริการอีเมลไม่สามารถเป็น transaction เดียวกันได้ การถอดสิทธิ์หลังตรวจอาจหยุดอีเมลไม่ทัน แต่ผู้รับยังต้องผ่านการตรวจสิทธิ์ตอนเข้าเว็บตามปกติ

สถานะที่ worker เขียน:

| Status | ความหมาย |
| --- | --- |
| `pending` | ยังไม่เริ่มส่ง / รอโควตา |
| `processing` | claim สำเร็จ มี `leaseToken`, `leasedAt` (timestamp), `leaseUntil` (epoch milliseconds) |
| `sent` | MailApp รับคำขอแล้ว; ไม่ใช่การยืนยันว่าเข้ากล่องจดหมาย |
| `cancelled` | รูปแบบไม่ถูกต้อง หรือสิทธิ์ปัจจุบันไม่ตรง |
| `unknown` | อาจส่งแล้ว ต้องตรวจสอบเอง ไม่มีการส่งซ้ำอัตโนมัติ |

สถานะสุดท้ายมี `finishedAt` (timestamp) และ `outcome` (รหัสเหตุผล ไม่มีข้อมูลรับรอง) Claim/finish ใช้ Firestore `currentDocument.updateTime` เพื่อให้มีผู้ชนะคนเดียวต่อ operation ID และใช้ ScriptLock ลดการรันซ้อนภายใน script

Lease ยาว 10 นาที งาน `processing` ที่หมดเวลาจะเป็น `unknown` โดยไม่ reclaim เพื่อส่งอีก การส่งอีเมลกับการบันทึกสถานะไม่สามารถรับประกัน exactly-once ได้ หาก MailApp โยนข้อผิดพลาดหรือบันทึกผลไม่ได้ จะไม่ retry การส่งอัตโนมัติ หากเขียน `unknown` ไม่สำเร็จ งานจะค้าง `processing` จน worker รอบถัดไปตรวจ lease

## ติดตั้งโดยเจ้าของ

1. เข้า [Apps Script](https://script.google.com/) ด้วย `armwoottipong@gmail.com` สร้าง standalone project ส่วนตัวชื่อ `Yoggie Invitations` ห้ามแชร์สิทธิ์แก้ไขแก่ผู้ใช้ร้าน เพราะ OAuth ให้สิทธิ์ Firestore ตาม IAM ของเจ้าของ ไม่ถูกจำกัดด้วย Rules ฝั่งเว็บ
2. เพิ่ม `Core.gs` โดยคัดลอกเนื้อหา `scripts/invitation-mailer/Core.js` และเพิ่ม `Code.gs` จากโฟลเดอร์เดียวกัน ไม่ใส่ `import`/`export` เปิด Project Settings → Show appsscript.json แล้วใช้ manifest ที่เตรียมไว้
3. ใช้ **standard Google Cloud project** สำหรับ script เพื่อจัดการ OAuth/API ได้ชัดเจน แนะนำแยกจาก OAuth ของเว็บร้าน: สร้าง project สำหรับ worker โดยไม่ผูก billing เปิด Cloud Firestore API ใน project นี้ แล้วตั้งหมายเลข project ใน Apps Script Project Settings → Google Cloud Platform Project → Change project ห้ามสร้างฐานข้อมูลร้านอีกชุด Google อธิบายขั้นตอนสลับ project และตั้ง consent ใน [เอกสาร Cloud projects](https://developers.google.com/apps-script/guides/cloud-platform-projects)
4. ตั้ง OAuth consent ของ project worker ให้บัญชีเจ้าของอนุญาต scope ใน manifest ได้ หากเป็น External/Testing ให้เพิ่มเจ้าของเป็น test user; OAuth สำหรับ scopes นอกโปรไฟล์พื้นฐานอาจหมดอายุใน 7 วัน จึงใช้ Testing ได้เฉพาะตรวจติดตั้ง สำหรับ trigger ระยะยาวต้องตั้ง publishing status ให้เหมาะสมกับแอปส่วนตัวของเจ้าของ หรือใช้ project ที่อนุมัติใช้งานถาวรแล้ว ตาม [OAuth token expiration](https://developers.google.com/identity/protocols/oauth2#expiration) ไม่ต้องทำเว็บแอปหรือเผยแพร่ script ให้ผู้อื่นใช้งาน
5. ตรวจว่าบัญชีเจ้าของมี IAM อ่าน/เขียน Firestore บน **`yoggie-db`** อยู่แล้ว หากไม่มี ให้ผู้ดูแลโครงการตรวจและมอบสิทธิ์เท่าที่จำเป็น เช่น `roles/datastore.user`; ไม่เพิ่ม IAM ให้ผู้ใช้ร้าน Script ใช้ OAuth ของเจ้าของผ่าน `ScriptApp.getOAuthToken()` ตาม [Apps Script authentication](https://developers.google.com/apps-script/guides/service-account) ส่วน Firestore รับ Google OAuth โดยตรวจ IAM และข้าม Security Rules ตาม [Firestore REST authentication](https://firebase.google.com/docs/firestore/use-rest-api)
6. ตรวจ client/Rules และ outbox ที่ค้างอยู่ก่อนเปิด: `pending` เดิมทั้งหมดอาจถูกส่งในรอบแรก ห้ามเปิดจากข้อมูลทดลองหรือรายการที่ยังไม่ต้องการส่ง ตั้ง Script Property **`MAILER_ENABLED=true`** เมื่อพร้อม ค่าเริ่มต้นไม่มี property จึงไม่ทำงาน
7. รัน **`checkYoggieMailer`** เอง อนุมัติ OAuth บัญชีเจ้าของ ตรวจ log ว่าอ่านร้านได้และมีโควตา ฟังก์ชันนี้ไม่ส่งเมลและไม่เปลี่ยนข้อมูลร้าน หากขึ้น 401/403 ให้ตรวจ project/API, consent scopes และ IAM; ห้ามแก้ Rules ให้กว้างขึ้นเพื่อแก้ปัญหานี้
8. รัน **`installYoggieInvitationTrigger`** เพื่อสร้าง trigger ทุก 5 นาที ฟังก์ชันจะลบ trigger handler เดียวกันของบัญชีนี้ก่อนสร้างใหม่ แต่ละ trigger รันด้วยบัญชีผู้สร้างตาม [Installable triggers](https://developers.google.com/apps-script/guides/triggers/installable) ไม่ต้องกด Deploy และห้ามสร้าง public web app
9. เมื่อพร้อมทดสอบจริง ให้เพิ่มอีเมลทดสอบที่เจ้าของควบคุมผ่าน Settings ของเว็บ ตรวจ outbox, Apps Script Executions, ผู้ส่ง **Yoggie**, โลโก้, สิทธิ์ที่ระบุ และลิงก์เปิดเว็บ จากนั้นตรวจว่า trigger รอบต่อไปไม่ส่งคำขอเดิมซ้ำ ตรวจอีกกรณีโดยถอนสิทธิ์ก่อนรอบส่ง ต้องได้ `cancelled` และบัญชีนั้นเข้าเว็บไม่ได้

อีเมลมาจากบัญชี Gmail ของเจ้าของโดยใช้ display name `Yoggie` ไม่สามารถปลอมที่อยู่ผู้ส่งอื่นได้ Worker ดาวน์โหลดโลโก้จาก URL คงที่ `https://armwoottipong.github.io/Greek_yokk/brand/mascot.png` ครั้งเดียวต่อรอบที่มีการส่ง ตรวจ HTTP 200, MIME `image/png`, PNG signature และขนาด 32 bytes–2 MiB ก่อนแนบเป็น `inlineImages` ผ่าน `cid:yoggieLogo` ตาม [MailApp inline images](https://developers.google.com/apps-script/reference/mail/mail-app#sendEmail(Object)) ผู้รับจึงไม่ต้องโหลดภาพจากเซิร์ฟเวอร์ภายนอกเมื่อเปิดเมล ไม่มีภาพติดตามการเปิดอ่าน หากโหลดหรือตรวจโลโก้ไม่ผ่านจะไม่เรียกส่งอีเมลและงานจะเข้าสู่การตรวจสอบตามสถานะ `unknown` ใช้ลิงก์เปิดเว็บ `https://armwoottipong.github.io/Greek_yokk/` เท่านั้น ไม่อ่าน URL/หัวเรื่อง/HTML จาก outbox

## โควตาและการดูแล

MailApp consumer account มีขีดจำกัดผู้รับอีเมลรายวัน (เอกสารปัจจุบันระบุ 100 คน) และ trigger/runtime มีโควตาของตัวเอง ตัวส่งตรวจ `getRemainingDailyQuota()` ก่อน claim เมื่อเหลือศูนย์ งานยัง `pending` ไม่มีการเปิด billing อัตโนมัติ โควตาอาจเปลี่ยนตาม Google และการใช้งานอื่นของบัญชี ดู [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) และ [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)

แต่ละรอบ query สถานะ `processing` และ `pending` อย่างละไม่เกิน 10 งาน ใช้ single-field index ของ `status` ตามค่าเริ่มต้น จึงไม่มี composite index ใหม่ Worker ใช้เวลาไม่เกินประมาณ 4 นาทีก่อนหยุดเริ่มงานใหม่; คำสั่ง network ที่กำลังทำยังอาจนานกว่านั้น การ polling ใช้ Firestore reads/writes และ UrlFetch quota ควรดู usage ใน console ไม่มีคำรับประกันการส่งถึงหรือ SLA

เมื่องานเป็น `unknown` ให้ตรวจ Executions และถามผู้รับ/ตรวจหลักฐานการส่งก่อนตัดสินใจส่งใหม่ **อย่าแก้สถานะกลับ `pending` อัตโนมัติ** หากยืนยันว่าต้องส่งใหม่ ให้ทำคำขอใหม่อย่างตั้งใจโดยตรวจสิทธิ์ปัจจุบันก่อน เพราะอาจเกิดอีเมลซ้ำได้ คำขอใหม่คนละ operation ID เป็นคนละการส่ง

หยุดระบบโดยตั้ง `MAILER_ENABLED=false` และลบ trigger ใน Apps Script Triggers งานที่กำลังส่งอาจเสร็จได้ การปิดตัวส่งไม่ถอนสิทธิ์ผู้ใช้ร้าน หาก owner token ถูกเพิกถอน trigger จะล้มเหลว ต้องอนุญาตใหม่ด้วยเจ้าของ

ทดสอบโค้ดโดยไม่ส่งเมลจริง:

```powershell
npx vitest run tests/cloud/invitationMailer.test.js
```

ชุดทดสอบใช้ core และ Apps Script adapter จริงใน VM โดยจำลองเฉพาะ HTTP/MailApp ไม่มีการเชื่อมต่อ Firebase หรือ Gmail จริง

## Session preparation (28 October 2026)

A private Apps Script draft named Yoggie Invitations was created and linked to yoggie-db (411310411447). Gmail authorization and trigger activation are pending. Before activation, replace its code with the latest Core.js + Code.gs in this repository (including CID logo adapter), verify manifest, then run checkYoggieMailer and installYoggieInvitationTrigger after owner authorization. Browser access was disabled during preparation, so no email was sent and no trigger was created.
