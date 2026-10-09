# 🥣 Greek Yogurt POS & Inventory Management System

ระบบบริหารจัดการร้านกรีกโยเกิร์ต (Point of Sale, Bill of Materials, Real-time Stock Deduction & Raw Material Cost Valuation)  
พัฒนาด้วย **Vue 3 (Composition API) + Vite + Tailwind CSS + Pinia**

---

## ✨ ไฮไลต์ฟังก์ชันสำคัญ (Key Features)

1. **💰 งบต้นทุนโดยรวมของวัตถุดิบ & มูลค่าคลัง (Raw Material Budget & Inventory Valuation):**
   - คำนวณมูลค่าคงเหลือของวัตถุดิบและบรรจุภัณฑ์ทั้งหมดในร้านตามจริง (`คงเหลือ x ต้นทุน/หน่วย`)
   - แจกแจงงบต้นทุนตามหมวดหมู่ (Base Yogurt, Fruits, Toppings, Packaging)
   - แนะนำงบประมาณการสั่งซื้อเติมสต็อกล่วงหน้า (Reorder Budget Needed) เพื่อคงระดับความปลอดภัย 2x Min Buffer
2. **🥣 จัดการสูตรและวัตถุดิบ (Bill of Materials & Packaging):**
   - ผูกสูตรเมนูกับวัตถุดิบหลายรายการ (กรัม/มล./ชิ้น)
   - สวิตช์แยกเปิด/ปิดการใช้วัตถุดิบบรรจุภัณฑ์ (Packaging)
   - ผูกท็อปปิ้ง Add-on กับการตัดสต็อกวัตถุดิบจริง
3. **📦 บริหารคลังสินค้า (Stock Management):**
   - **รับเข้าสินค้า (Stock In):** บันทึกจำนวนรับและปรับปรุงต้นทุนต่อหน่วยล่าสุด
   - **ปรับปรุงยอดจริง (Stock Adjust):** ตรวจนับจริงและคำนวณผลต่างพร้อมบันทึกสาเหตุ
   - **ซ่อน/กู้คืน (Soft Delete / Restore):** ปลอดภัยต่อประวัติยอดขายย้อนหลัง
4. **🛍️ ระบบแคชเชียร์หน้าร้าน (POS Cashier):**
   - สลับช่องทางการขาย (หน้าร้าน, ทานที่ร้าน, GrabFood, LINE MAN, Robinhood) พร้อมคำนวณหักเปอร์เซ็นต์ GP และกำไรสุทธิอัตโนมัติ
   - หน้าต่างจัดแต่งโบวล์ (Custom Greek Yogurt Bowl) แบบเลือกท็อปปิ้งสด
   - **ระบบป้องกันสินค้าหมด (Strict Out-of-Stock Validation):** บล็อกการขายทันทีเมื่อวัตถุดิบไม่เพียงพอ
   - **ระบบแจ้งเตือนสต็อกใกล้หมด (Low Stock Warning Popup):** แจ้งเตือนก่อนกดยืนยันออเดอร์
   - ใบเสร็จความร้อนขนาด 80mm พร้อมปุ่มพิมพ์ทันที
5. **⚙️ เชื่อมต่อภายนอกและการสำรองข้อมูล (Integrations & Backup):**
   - ซิงค์ประวัติการขายและสต็อกกับ **Google Sheets (Google Apps Script Web App)**
   - ส่งออกและนำเข้าไฟล์สำรองฐานข้อมูล `.json`
   - กู้คืนชุดข้อมูลตัวอย่าง (Reset Demo Data)

---

## 🚀 การติดตั้งและเปิดใช้งานในเครื่อง (Local Setup)

```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้น Local Development Server
npm run dev

# ทดสอบ Build สำหรับ Production
npm run build

# พรีวิว Production Build
npm run preview
```

---

## 🌐 การตั้งค่า GitHub Pages สำหรับ Auto-Deploy

โปรเจกต์นี้มี CI/CD ผ่าน GitHub Actions อัตโนมัติ (`.github/workflows/deploy.yml`):
1. ไปที่ GitHub Repository: **Settings** -> **Pages**
2. ภายใต้หัวข้อ **Build and deployment** > **Source**:
   - เลือก **Deploy from a branch**
   - Branch: **gh-pages**, Folder: **/(root)**
3. ทุกครั้งที่มีการ `git push` ขึ้น Branch `main` ระบบจะทำการ Build และ Deploy เวอร์ชันล่าสุดให้ทันที
4. เข้าใช้งานได้ที่: `https://armwoottipong.github.io/Greek_yokk/`


## Audit remediation verification

Run `npm test`, `npm run lint`, and `npm run build` before release. Active application entry is `src/main.js`; root `app.js`, `app_legacy.js`, and `index_legacy.html` are inactive historical references.

Local data is saved as a validated schema-3 snapshot in `GY_DATABASE_V3`. Legacy keys and `GY_LEGACY_RECOVERY_V3` are preserved. Invalid data blocks saving until reviewed/restored; it is never reset automatically. Export JSON before migration or production upgrades. Google Sheets is an optional full snapshot backup, not a realtime multi-device database. Sync reports success only after readable committed acknowledgement; an unreadable/CORS response is an error.

For the updated backend deploy `google_apps_script/Code.gs` to a **test** deployment first, follow [recovery notes](docs/superpowers/specs/2026-10-09-gas-recovery.md), and verify snapshot round-trip before changing the production URL. No deployment is performed by local tests.
