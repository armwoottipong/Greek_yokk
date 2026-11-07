# Firebase Save-System Audit and Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้การบันทึกจากทุกหน้าของ Yoggie สอดคล้องกับ Firebase และข้ามหน้าได้ โดยเริ่มจากการกำหนดตัวเลือกเสริมผ่านหน้าจัดการเมนูที่ผู้ใช้รายงานว่ายังทำไม่ได้

**Architecture:** ใช้หน้าและแบบฟอร์มเดิม เชื่อมผ่าน model → commands/journal → transport → Firestore Rules → server readback ตามระบบปัจจุบัน แยก agent ตรวจรายหน้า แต่รวมการแก้ส่วนกลางและตรวจความสัมพันธ์ผ่านผู้ประสานงานหนึ่งคน ผลผ่านต้องพิสูจน์ทั้งพฤติกรรมหน้าเว็บ ข้อมูลที่บันทึกจริง และการอ่านจาก session อีกชุด

**Tech Stack:** Vue 3, Pinia, Firebase JS SDK, Firestore Rules, Vitest, Vue Test Utils, Firebase Auth/Firestore Emulator, GitHub Pages

**Spec:** คำขอผู้ใช้วันที่ 7 พฤศจิกายน 2026; `AGENTS.md`; เหตุการณ์เดิมใน `docs/firebase/catalog-save-after-ordering.md`

**Status:** ผู้ใช้อนุมัติวันที่ 7 พฤศจิกายน 2026 ด้วยข้อความ ดำเนินการได้; เริ่มดำเนินการใน isolated worktree แล้ว

## Global Constraints

- รักษา layout/template/style เดิม; ไม่แทน StockView หรือแบบฟอร์มเดิมด้วย workspace ทดสอบ
- Firebase Spark; Google login; allowed email; Viewer อ่าน Dashboard เท่านั้น; Manager ทุกส่วนยกเว้น Settings; Admin ทุกส่วน
- ปกป้อง owner Admin `armwoottipong@gmail.com` ทั้ง UI และ Rules
- ยืนยันการเชื่อมต่อ server ก่อนเขียน; คง cart/draft/pending commands; ไม่มี offline sales queue และไม่ fallback เป็น local
- ไม่ผ่อน Rules ไม่เปิด billing ไม่เปิด backend ที่ยังไม่พร้อม และไม่ import/ซ่อมข้อมูล production โดยอัตโนมัติ
- snapshot และข้อมูลวินิจฉัยจริงเก็บเป็นไฟล์ส่วนตัวที่ไม่เข้า Git; ต้องรักษา Timestamp/ชนิดข้อมูล Firebase
- เก็บงานผู้ใช้ที่ค้างใน `src/components/catalog/CatalogOrderDialog.vue` แยกจากงานนี้
- ส่ง release เฉพาะ work package ที่ dependency ครบและผ่าน gate; commit/push/Pages ตามอำนาจที่มีอยู่แล้ว
- ไม่สรุปว่าทั้งระบบสมบูรณ์จากจำนวน tests หรือการกดบันทึกค่าคงเดิมเพียงครั้งเดียว

## Approaches and recommendation

1. แก้เฉพาะหน้าเมนู: ปิดปัญหาปัจจุบันเร็ว แต่ยังไม่มีหลักฐานเรื่องความสัมพันธ์กับหน้ากลุ่ม, POS และสต็อก
2. **แนะนำ: ตรวจแยกรายหน้าด้วย sub-agent แล้วรวมตรวจข้ามหน้าและส่วนกลาง** — ใช้ระบบเดิม ลดขอบเขตการเปลี่ยนพร้อมเพิ่มหลักฐานตรงเส้นทางใช้งานจริง
3. เขียนระบบบันทึกใหม่ทั้งชุด: กระทบ Rules, pending commands และข้อมูลเก่าเป็นวงกว้าง ยังไม่มีหลักฐานว่าจำเป็น จึงไม่เสนอให้ทำในรอบนี้

แผนนี้เสนอแนวทาง 2; ยังรอการยืนยันจากผู้ใช้

## Review Focus

1. เลือกกลุ่มใน picker ได้ แต่ `hasAddons`, การกดเสร็จสิ้น หรือ payload ทำให้ความสัมพันธ์ไม่ถูกบันทึก — งาน A ต้องเปิดกลับและตรวจทั้ง menu/group
2. ธุรกรรมข้อมูลเมนูสำเร็จ แต่รูปหรือคำสั่งขั้นถัดไปล้มเหลว — งาน A/B และส่วนกลางต้องไม่แจ้งสำเร็จทั้งชุดและไม่ทำขั้นที่ยืนยันแล้วซ้ำ
3. Metadata-only update หรือ Timestamp เปลี่ยนขณะเปิดฟอร์ม — งาน A/B และส่วนกลางต้องไม่ทำลำดับ รูป ราคา หรือสูตรหาย และไม่ปฏิเสธฟอร์มที่ยังใช้ได้โดยไม่จำเป็น
4. Retry หลัง timeout/reload หรือสลับบัญชี — งาน POS/ส่วนกลางต้องพิสูจน์ receipt และ identity; ไม่บันทึกซ้ำหรือส่งคำสั่งข้ามบัญชี/generation
5. เปลี่ยนกลุ่ม/สูตรหลังขาย แล้วคืนบิลเก่า — งาน POS/Stock/Reports ต้องคืนตามหลักฐานบิลเดิม และไม่ใช้สูตรหรือราคาปัจจุบันแทน

## Delegation and ownership

ทำงานพร้อมกันสูงสุด 3 sub-agents และผู้ประสานงาน 1 คน เพื่อไม่เกิน slot ที่มี

| รอบ | Agent/หน้า | ขอบเขตหลัก | ผลส่งมอบ |
|---|---|---|---|
| 1 | A — จัดการเมนู | MenuView, MenuEditModal, group picker, รูป/ลำดับ/สถานะ | ขั้นตอนทำซ้ำปัญหาที่รายงาน, จุดที่ข้อมูลหลุด, failing tests, ผลอ่านกลับ |
| 1 | B — กลุ่มและตัวเลือกเสริม | AddonGroupManager, ราคา, สูตร, availability, ผูกหลายเมนู | ตรวจสองทางกับเมนู, ราคา 0/ว่าง, rename/retire, failing tests |
| 1 | C — คลังวัตถุดิบและการผลิต | StockView, รับเข้า, นับ, ล็อต, สูตรผลิต, จัดเก็บ | ความถูกต้องของ stock/lot/cost และ reference จากเมนู/ตัวเลือก |
| 2 | D — POS และประวัติบิล | cart, checkout, ยกเลิก/คืนบิล, pending/retry | หลักฐานคำนวณราคา/ตัดคืนสต็อกและไม่สร้างคำสั่งซ้ำ |
| 2 | E — Settings และการเข้าถึง | allowed emails/roles, platform settings, backup, สถานะเชื่อมต่อ | UI/Rules ตรงกันและไม่ยกระดับสิทธิ์; mail ไม่เท่ากับ access สำเร็จ |
| 2 | F — Dashboard/รายงาน | อ่านยอดขาย/ต้นทุน/ประวัติ/legacy | อ่านจากข้อมูลที่ commit จริง, ไม่ซ้ำ/ขาด, ไม่อ่านเพิ่มเกินสิทธิ์ Viewer |
| ทุกช่วง | ผู้ประสานงาน | commands, journal, transport, revision, Rules, integration | ข้อตกลงข้อมูลร่วม, รวม fixes, รัน emulator และ production, ตัดสิน gate |

ข้อกำหนดการทำงานร่วมกัน:

- ส่ง context เฉพาะงาน พร้อมชื่อไฟล์/สัญญาข้อมูล/ข้อจำกัด ไม่ส่งประวัติแชททั้งหมดซ้ำ
- ใช้รุ่นเล็กสุดที่เพียงพอ; ปัญหา transaction/Rules ซับซ้อนค่อยเพิ่มระดับเมื่อจำเป็น
- รอบสำรวจแต่ละ agent อ่านโค้ดและทำ reproduction/test ในไฟล์ของตนก่อน ไม่แก้ shared files พร้อมกัน
- `catalogBindings.js`, `inventoryModel.js`, `commands.js`, `transport.js`, `journal.js`, Rules/generators และ shared configs มีผู้ประสานงานเป็นเจ้าของการแก้
- Browser จริงใช้ทีละผู้ควบคุม; emulator หลักรันแบบ serial เนื่องจาก tests มี clearFirestore และเปลี่ยน Rules ร่วมกัน
- ห้ามหลาย agent รัน full suite หรือ seed/reset emulator เดียวกันพร้อมกัน; รวมรายการทดสอบแล้วรันครั้งเดียวต่อชุดเปลี่ยน
- ให้ reviewer ใหม่ตรวจผลหลังรวม fixes โดยไม่ให้ผู้เขียนรับรองงานตัวเองเพียงคนเดียว

## Task 0: Baseline, evidence and shared contracts

**Files:** `AGENTS.md`, `.env.production`, `firebase.json`, `firestore.rules`, `scripts/core-policy.mjs`, `src/cloud/core/workspace.js`, `src/cloud/core/commands.js`, `src/cloud/core/transport.js`, `src/cloud/journal.js`

**Produces:** baseline ของ commit/asset/Rules, บัญชีและ generation ที่ทดสอบ, snapshot ส่วนตัวที่รักษาชนิด SDK, test matrix, รายการไฟล์ที่ agent แต่ละคนเป็นเจ้าของ

- [ ] ตรวจ remote และ diff งานค้าง; บันทึก commit/Pages asset/active Rules ก่อนเริ่ม
- [ ] อ่าน production แบบ read-only เพื่อบันทึก revision, catalogRevision, รูปแบบ menu/group/addon และ pending-state ที่เกี่ยวข้อง โดยไม่พิมพ์ credentials
- [ ] ทำแผนผัง collection และ authoritative/derived fields จากโค้ดและ Rules จริง ไม่ตั้งสมมติฐานว่า field ใดเป็นข้อมูลหลักโดยไม่มีหลักฐาน
- [ ] กำหนดผลคำสั่งให้แยกได้: ยังไม่ส่ง / ถูกปฏิเสธแน่นอน / ยืนยันสำเร็จ / ยังไม่ทราบผล / สำเร็จบางขั้น
- [ ] ยืนยัน fixture/rehearsal อยู่ที่ project `demo-greek-yogg`, Firestore `127.0.0.1:8088`, Auth `127.0.0.1:9098`; หยุดทันทีหากชี้ production

## Task 1: Round 1 — reproduce through original forms

**Files A:** `src/views/MenuView.vue`, `src/components/modals/MenuEditModal.vue`, `src/composables/useInventoryStore.js`; tests `tests/ui/addonGroupsInteraction.test.js`, `tests/cloud/catalogBindings.test.js`

**Files B:** `src/components/catalog/AddonGroupManager.vue`, `src/domain/addonGroups.js`, `src/cloud/core/groupAvailability.js`, `src/cloud/core/catalogPresentation.js`

**Files C:** `src/views/StockView.vue`, `src/cloud/core/inventoryModel.js`, `src/cloud/core/inventoryPlan.js`, `src/cloud/core/model/stock.js`, `src/cloud/core/model/produce.js`, `src/cloud/core/model/count.js`, `src/cloud/core/model/switch.js`

**Interfaces:** agents ใช้ store/model interface เดิม (`saveMenu`, `saveAddonGroup` และคำสั่งคลังที่หน้าเดิมเรียก); ห้ามสร้าง save function ทดแทนที่ข้าม validation

- [ ] A ทำ flow ตรงที่ผู้ใช้แจ้ง: เปิดเมนูเดิม → เปิดตัวเลือกเสริม → เลือกกลุ่ม → เสร็จสิ้น → บันทึก/ยืนยัน → ปิด/เปิดใหม่ → ตรวจ POS และ session อีกชุด
- [ ] A ครอบคลุม 0→1→2→1→0 กลุ่ม, สลับกลุ่ม, เปิด/ปิด hasAddons, กลุ่มสร้างจาก picker, ยกเลิก picker, บันทึกพร้อมรูป/หลังรูปผิดพลาด, หลัง reorder และฟอร์มเก่า
- [ ] B ตรวจแก้ชื่อกลุ่ม/ตัวเลือก, ราคาแต่ละช่องทาง, ฟรี 0 กับยังไม่ตั้งราคา, ตัวเลือกซ้ำ/พักขาย, สูตร/packaging และการผูก/ถอดหลายเมนู
- [ ] C ตรวจ receiving, production, count, switch lot, draft review/save, archive และการอ้างอิงจากเมนู/ตัวเลือก; stock ต้องเท่ากับผลรวมล็อตตามแบบจำลอง
- [ ] แต่ละ failure ต้องมี input/ขั้นตอน/UI state/command kind/ขั้นที่ล้ม/Rules หรือ readback evidence; แยก fact กับ hypothesis
- [ ] เพิ่ม failing regression ที่ทำให้เกิดอาการเดิมก่อนแก้; จุดที่ยังทำซ้ำไม่ได้ต้องระบุว่าไม่ยืนยัน ห้ามแก้ด้วยการเดา

## Task 2: Integrated form-to-Firebase harness and root-cause fixes

**Shared files:** `src/cloud/core/catalogBindings.js`, `catalogPlan.js`, `inventoryModel.js`, `commands.js`, `transport.js`, `workspace.js`, `src/cloud/journal.js`, `src/cloud/core/model/catalogMenu.js`, `catalogGroup.js`

**Test additions:** `tests/firestore/menuEditorSaveFlow.test.js`, `tests/firestore/catalogCrossPageSave.test.js`; หากจำเป็นเพิ่ม `vitest.firebase-ui.config.js` เพื่อใช้ Vue Test Utils กับ Firestore Emulator จริง

**Produces:** original form → actual model/transport/Rules → persisted receipt/readback tests; ไม่ถือว่า mock `saveMenu` ที่ตอบ ok คือการพิสูจน์ Firebase

- [ ] สร้าง harness ที่ mount แบบฟอร์มเดิมและต่อ model/transport จริงกับ emulator ใช้ผู้ใช้ Google ที่มี roles ตามระบบ
- [ ] ทดสอบเลือกกลุ่มจากหน้าเมนูให้ fail ด้วยเหตุเดียวกับอาการก่อนแก้; ตรวจ payload ว่าไม่สูญ `hasAddons`/group IDs ระหว่าง picker, confirmation และ dispatch
- [ ] แก้เฉพาะสาเหตุที่พิสูจน์; ตรวจผลต่อ contracts และข้อมูลเก่าจาก snapshot ที่ decode ถูกชนิด
- [ ] อ่านกลับทั้ง menu bindings และ group reverse references; ต้องเท่ากัน ไม่มี duplicate/dangling IDs และไม่เปลี่ยนรายการที่ไม่เกี่ยวข้อง
- [ ] พิสูจน์ rollback ของ transaction และ partial progress ของ multi-command workflow; การล้มขั้นที่ 2 ต้องไม่แสดงว่าสำเร็จทั้งชุดหรือส่งขั้นที่ 1 ซ้ำ
- [ ] ถ้าจำเป็นต้องแก้ Rules ให้แก้ generator, ทดสอบ positive/negative และ compiler/size/read-expression budgets พร้อมกัน ห้ามเพิ่ม allow เพื่อให้ test ผ่านเฉย ๆ

## Task 3: Round 2 — downstream behavior and access

**Files D:** `src/cloud/core/CoreWorkspace.vue`, `src/cloud/core/model/saleGroups.js`, `model/cancel.js`, `packageReceipt.js`, `receiptPresentation.js`

**Files E:** `src/views/SettingsView.vue`, `src/cloud/core/CloudAccessPanel.vue`, `src/cloud/session.js`, `src/cloud/core/catalogImages.js`, `catalogOrdering.js`, `backupReader.js`, `businessBackup.js`, `scripts/access-policy.mjs`

**Files F:** `src/cloud/core/CloudDashboardWorkspace.vue`, `reportReader.js`, `reportProjection.js`

**Consumes:** baseline/contracts ของ Task 0 และ catalog fixes ที่รวมแล้ว; ผลสำรวจอิสระของรอบ 2 เริ่มได้ก่อน แต่ integration tests ต้องใช้ revision ชุดเดียวกัน

- [ ] D ขายเมนูที่เพิ่ม/เปลี่ยนกลุ่มผ่านหน้าเมนูจริง; ตรวจ selections, min/max, repeat, channel prices, packaging, cost และ material deductions
- [ ] D เปลี่ยนสูตร/ราคาหลังขายแล้วคืนบิลเดิม; ต้องใช้ receipt เดิม ไม่สร้าง stock หรือคืนซ้ำ
- [ ] E ตรวจ Admin/Manager/Viewer/ไม่อยู่ allowlist/ถูกถอดสิทธิ์ ทั้ง UI และ direct Rules requests; คง protected owner; ไม่ส่งเมลจริงเป็น test
- [ ] E ตรวจรูป/ลำดับ/ราคา platform ไม่ overwrite catalog changes; backup ต้อง consistent revision และ restore ได้ใน emulator
- [ ] F เทียบรายงานกับรายการที่ยืนยันสำเร็จจาก D/C รวม cancelled และ legacy; แยก timezone วันที่ร้าน; ยืนยัน Dashboard ของ Viewer ไม่ต้องอ่าน collections ที่ห้ามไว้

## Task 4: Failure, concurrency and data-consistency matrix

**Files/tests:** `tests/cloud/journal.test.js`, `tests/cloud/coreService.test.js`, `tests/cloud/catalogReadConsistency.test.js`, `tests/firestore/commandStopProof.test.js`, `tests/firestore/commandStopAccessProof.test.js`; เพิ่ม `tests/firestore/saveRecoveryConsistency.test.js`

- [ ] Double click/Enter ซ้ำ: operation เดียวและผลทางธุรกิจครั้งเดียว
- [ ] ขาดเน็ตก่อนส่ง, ระหว่างส่ง และหลัง server commit ก่อน client ได้คำตอบ: เก็บ draft; คืนสถานะตาม receipt; ไม่สร้าง opId ใหม่ในกรณียังไม่ทราบผล
- [ ] permission-denied, validation failure, stale revision และ timeout: ไม่จัดทุกกรณีเป็น unknown เหมือนกัน และไม่ตีความ timeout ว่า rollback แล้ว
- [ ] Reload/ปิดเปิดฟอร์ม/logout/เปลี่ยนบัญชี/generation ขณะ pending: ไม่ทำ draft หายหรือส่งคำสั่งข้าม identity; ไม่ replay เบื้องหลัง
- [ ] สอง session แก้ menu/group/price พร้อมกัน หรือ session หนึ่ง reorder: ยอมรับเฉพาะ snapshot ที่สอดคล้องหรือแจ้ง conflict โดยคง draft
- [ ] คำสั่งหยุด/ยกเลิก/ลองใหม่: ตรวจ fencing และ receipt ก่อนเปลี่ยนสถานะ ไม่ commit ขั้นที่ถูกหยุดภายหลัง
- [ ] หลังทุกกรณีตรวจ invariants: menu↔group, addon/material references, min/max/repeat bounds, money/quantity precision, stock/lot sums, revision/generation, immutable receipts และ order/image metadata
- [ ] สร้าง read-only consistency report หากพบข้อมูลจริงผิดรูปแบบ; เสนอ repair แบบระบุเอกสาร/ก่อนหลัง/backup แยกต่างหากก่อนเขียนจริง

## Task 5: Independent review and release gates

**Produces:** coverage matrix ต่อ flow, findings register, release evidence; ไม่ใช้จำนวน tests เป็นเกณฑ์เพียงอย่างเดียว

- [ ] Agent แต่ละหน้าแสดง flow ที่ผ่าน/ล้ม/ยังไม่ได้ตรวจ พร้อม evidence และสาเหตุ
- [ ] reviewer ใหม่ตรวจ source diff, Rules และ test coverage โดยเน้นความขัดแย้งข้ามหน้าและ failure matrix
- [ ] ปิดปัญหาที่ทำข้อมูลหาย/ผิด/ซ้ำ/ข้ามสิทธิ์ และปัญหาที่ขวาง flow เมนูที่รายงานก่อน release; ถ้ายังมีต้องระบุว่าไม่ผ่าน
- [ ] รวม emulator runs แบบ serial บน clean seed และ Rules ที่จะ deploy จริง; conditional skips ต้องมีเหตุผลและห้ามนับเป็นผ่าน
- [ ] รัน `npm test`, `npm run lint`, `npm run build`
- [ ] รัน `npm run test:firebase-proof` สำหรับ gate รอบสุดท้าย; ใช้ Java 21+ ที่มีในเครื่อง และชี้ demo project ตาม guard
- [ ] รัน form-to-Firebase integration suite และ private snapshot rehearsal เพิ่มจาก native tests เดิม
- [ ] ทำ work package ตาม dependency: (1) menu/group + shared save + POS/stock smoke; (2) inventory/POS/recovery; (3) access/settings/reports และ full-system gate
- [ ] ก่อน push แต่ละ package ตรวจ remote และรักษางานค้าง; commit เฉพาะรายการที่รีวิวแล้ว และ deploy เมื่อ dependency ของ package ผ่านครบ

## Task 6: Production verification with explicit data scope

- [ ] ก่อน release ตรวจ production แบบอ่านอย่างเดียวและสำรอง baseline; เปรียบเทียบ config/Rules/asset กับ release ที่ตรวจ
- [ ] หลัง deploy ตรวจ GitHub Actions, `version.json`, HTML และ entry asset ว่าตรง commit; browser ต้องโหลด asset ใหม่นั้นจริง
- [ ] ตรวจ flow จาก **หน้าจัดการเมนู** จริงด้วย test menu ที่ตั้งไม่เปิดขายและชื่อทดสอบชัดเจน ใช้ test group/option ที่แยกจากรายการขาย; preflight capacity และข้อจำกัดก่อนสร้าง
- [ ] ทดสอบเลือก/สลับ/ถอดกลุ่มและแก้ชื่อผ่านฟอร์ม → server receipt → เปิดกลับ → session อีกชุด; ตรวจ reverse references และ metadata; บันทึก screenshot ของผล
- [ ] ไม่สร้างบิลขาย/คืนบิล/รับเข้า/ผลิตปลอมในร้านจริง; เขียนธุรกรรมเหล่านี้ใน emulator ที่ restore snapshot เท่านั้น พร้อมบอกขอบเขตนี้ในรายงาน
- [ ] จัดเก็บ test entities ผ่าน flow ปกติหลังตรวจ; audit/tombstones ที่ระบบคงไว้ต้องระบุ ไม่อ้างว่าลบร่องรอยทั้งหมดได้
- [ ] หากต้องแตะเมนูขายจริงหรือซ่อมเอกสารจริง ให้ระบุรายการ/ค่า/การคืนค่าให้ตรวจเป็นรูปธรรมก่อน; ไม่เดาเมนูหรือกลุ่มที่ผู้ใช้ต้องการ
- [ ] อ่านกลับหลังทดสอบว่า stock, lots, recipes, prices, order และสิทธิ์ของรายการจริงไม่เปลี่ยนโดยไม่ตั้งใจ; ป้องกันการคืนค่าทับงาน concurrent

## Acceptance and final report

ถือว่าปิดงานได้เมื่อ flow ที่ผู้ใช้รายงานผ่านจากฟอร์มจริงถึง Firebase และเปิดกลับได้, ความสัมพันธ์ข้ามหน้าถูกต้อง, failure matrix หลักผ่าน, reviewer ไม่มีข้อผิดพลาดสำคัญค้าง และ release/production checks มีหลักฐาน

รายงานแยกตามหน้าและ flow: ปัญหา → สาเหตุที่พิสูจน์ → จุดแก้ → tests/readback → production หรือ emulator → ข้อจำกัด/ยังไม่ตรวจ → commit/deployment ไม่รับรองว่าไม่มีบั๊กใดอีกทุกกรณี

## Approval checkpoint

ผู้ใช้อนุมัติแผนและขอบเขต test entities แล้ว; ผลดำเนินการและข้อจำกัดบันทึกแยกในรายงาน audit
