# Better Interface — ตรวจหน้าเมนูและสูตร

วันที่ 20 ตุลาคม 2026 (Asia/Bangkok) · source baseline `a5e1c83`

## Scope and coverage

ตรวจ flow ทั้งชุด: ค้นหา/เลือกเมนู → อ่านข้อมูลแพลตฟอร์มที่ตั้งราคาแล้ว → สลับกราฟแท่ง/วงกลม/เส้น → อ่านสูตร/บรรจุภัณฑ์/กลุ่มตัวเลือก → เพิ่ม/แก้ไขผ่าน popup เดิม → ตรวจ validation, บันทึก, ยกเลิก และลบที่มีการยืนยัน รวมสถานะไม่มีเมนู, ค้นหาไม่พบ, ไม่มีราคา และต้นทุนไม่ครบ

ใช้ dashboard “ภาพรวมร้าน” เป็น reference ของภาษา visual และลำดับข้อมูล ไม่ได้ audit dashboard, POS, Add-on หรือ stock ทั้งหน้า การพบ shared component ในรายงานหมายถึงตรวจเฉพาะการใช้งานใน flow นี้ ไม่ใช่รับรองทั่วแอป

Stack: Vue 3 SFC, Pinia, Vite, Tailwind 3, CSS variables + component-scoped CSS, Lucide Vue. รองรับ desktop, iPad สองแนว และมือถือ ตาม PRODUCT.md โดยไม่สมมติรุ่นอุปกรณ์จริง

เอกสารที่พบและอ่าน: PRODUCT.md, DESIGN.md, .impeccable/surfaces/menu-management.md; ดู dashboard CSS และ implementation เพื่อเทียบ conventions. ไม่พบ AGENTS.md, CLAUDE.md, CONTRIBUTING.md, CODING_STANDARDS.md ในรายการไฟล์โครงการที่ค้นด้วย rg --files. ไม่ได้ถือเอกสาร review เก่าเป็นภาพยืนยันของเวอร์ชันนี้

โหลด owning skills ครบทั้ง 6 ด้าน พร้อม references ด้าน focus/keyboard, grouping/adaptivity, copy patterns, form typography, contrast และ surfaces/motion

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | MenuView, MenuEditModal, FormField, AppSelect, ModalShell, MenuRecipeDetails/Panel; label, tabindex, Escape, focus trap, error semantics, reduced-motion | F01, F06; keyboard rendering/AT walk Not verified |
| Layout | App.vue main padding; Sidebar 72/256px; MenuView list/detail, container query, platform grid; DialogFrame scrolling/footer; catalogEditor/RecipeEditorRow responsive rules | ไม่ยืนยัน defect ทางภาพจาก source ล้วน; มีข้อเสนอและ validation gate ในแผน |
| Writing | ข้อความปุ่ม/empty/error/financial/recipe; เส้นทางเพิ่มและแก้ไข; Thai literals ใน component ไม่มี locale layer ใน flow นี้ | F02, F04, F05; labels คงศัพท์เมนู/สูตร/ช่องทาง/GP |
| Typography | main.css:149, AppInput, catalogRecipe.css, platform CSS, dashboard reference, numeric styles | ไม่พบ defect ที่ยืนยันเพิ่มจาก source; native inputs มี 16px override ≤1199px แล้ว; tiny captions ต้องดูภาพจริง |
| Colors | main.css tokens, interface.css neutral badge, AppInput placeholder, local warm-muted; คำนวณ sRGB contrast จากคู่สี opaque ที่ประกาศ | F03 สำหรับค่าที่ประกาศ; computed rendered contrast Not verified |
| UI polish | Button/IconButton/AppCheckbox/AppSelect/MenuPriceInfo state styles; DialogFrame transition/scroll containment | F07; replay touch/animation จริง Not verified |

**ข้อสรุป:** โครงสร้าง list → analysis → recipe ตรงกับงานและคำสั่งล่าสุดแล้ว แต่ยังไม่ควรรับรองว่า “สมส่วนและใช้ง่ายครบ” จนกว่าจะตรวจภาพจริงและแก้ปัญหาข้อมูล/interaction ที่ยืนยันได้ ด้าน layout ไม่มีหลักฐานว่าพังจากภาพจริงในรอบนี้ และไม่ให้คะแนนความสวยจากการอ่าน CSS

## Findings

Severity ใช้ better-interface; รวม root cause ครั้งเดียว ไม่ใช้จำนวนจุดย่อยเพิ่มความรุนแรง

| ID / Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| F01 HIGH | Accessibility | src/views/MenuView.vue:53; src/components/modals/MenuEditModal.vue:293; src/assets/main.css:167; src/components/catalog/MenuRecipeDetails.vue:35; src/components/catalog/MenuRecipePanel.vue:19 | ลบ outline/box-shadow ทุก focus; ปุ่มทั่วไป, graph mode และ field ไม่มี styling อื่นแสดง keyboard focus. `aria-pressed` บอกตัวที่เลือก ไม่บอกตัวที่กำลัง focus | คง `outline:none`; เพิ่มเฉพาะ `:focus-visible` แบบพื้นหลัง/สีข้อความ/ขีดใต้ หรือ marker ภายใน field label โดยไม่ใช้ outline/ring/shadow และไม่เปลี่ยน selected state | CSS ไม่มี visible replacement ในตำแหน่งที่ยืนยัน; WCAG 2.4.7. เป็นการเติม feedback ภายใต้ข้อห้าม outline ของผู้ใช้ ไม่ใช่คำขอคืน outline |
| F02 HIGH | Writing / data presentation | src/views/MenuView.vue:38; src/components/catalog/MenuRecipePanel.vue:4 | `qty*(Number(mat?.unitCost)||0)` → `฿0.00` เมื่อไม่มีต้นทุน; overview เดียวกันกลับแจ้ง “ยังคำนวณไม่ได้” | แยก unknown ออกจาก zero จริง; ใช้ null → “ยังไม่ทราบต้นทุน” พร้อมคำแนะนำตรวจวัตถุดิบ และคง zero ที่ทราบแน่นอน | ตัวเลขเกี่ยวกับต้นทุนให้ความหมายผิดและขัดกันในหน้าจอเดียว; diagnostic mount ยืนยันแล้ว ไม่ใช่ข้อสันนิษฐานด้านภาพ |
| F03 HIGH (declared-pair check) | Colors | src/assets/main.css:14; src/assets/main.css:16; src/assets/interface.css:11; src/components/ui/AppInput.vue:20; src/assets/main.css:177 | neutral badge/placeholder ใช้ `#7D675B` บน `#F4EBDD`: **4.485:1** ต่ำกว่า 4.5:1 สำหรับข้อความขนาดเล็ก | จำกัด scope เมนูและ popup; ใช้ warm-muted `#705C50` ที่หน้านี้ใช้แล้วบน soft fill (ประมาณ 5.33:1) และวัด computed colors อีกครั้ง | เป็นข้อบกพร่องของคู่สี opaque ที่ประกาศ ไม่ใช่ผลวัด screenshot/browser. ห้ามปัด 4.485 เป็น 4.5 แล้วนับว่าผ่าน; runtime ยัง Not verified |
| F04 MEDIUM | Writing / flow continuity | src/views/MenuView.vue:33; src/components/modals/MenuEditModal.vue:270 | เมื่อเพิ่มเมนูใหม่สำเร็จ รายการเพิ่มแต่หัวข้อ/analytics ค้างเมนูเดิม เพราะ watch เปลี่ยน selection เฉพาะ ID เดิมหาย | ส่ง saved ID จาก popup → ให้ MenuView เลือก ID ที่บันทึก; ตอนสร้างบนมือถือเปิดรายละเอียดเมนูใหม่ และจัดการ search ที่ซ่อน ID ใหม่ | ผู้ใช้ตรวจผลที่เพิ่งบันทึกต่อไม่ได้ทันที ต้องหาและเลือกอีกครั้ง; diagnostic mount ยืนยัน |
| F05 MEDIUM | Writing / action intent | src/views/MenuView.vue:12; src/views/MenuView.vue:44; src/components/modals/MenuEditModal.vue:2 | “แก้ไขสูตร” กับ “แก้ไขเมนู” เปิด popup เดียวกันและโฟกัส `#menu-name` เสมอ | คง popup เดิม; รับ entry section `recipe` สำหรับแก้ไขสูตร เปิด disclosure และเลื่อน/โฟกัส control แรกในสูตร; ปุ่มแก้ไขเมนูเริ่มชื่อเหมือนเดิม | เจตนาปุ่มสูตรไม่พาไปส่วนที่เกี่ยวข้อง ต้องเลื่อนหาเอง โดยเฉพาะสูตรยาว |
| F06 MEDIUM | Accessibility | src/components/modals/MenuEditModal.vue:6 | visible label “คำอธิบายสั้น” แต่ `aria-label="คำอธิบายเมนู"` แทน accessible name และไม่มีคำที่แสดงครบ | ลบ aria-label ที่ซ้ำซ้อน ให้ FormField label-for เป็นชื่อหลัก | WCAG 2.5.3 Label in Name; ลดความไม่ตรงกันสำหรับคำสั่งเสียงและชื่อที่ screen reader อ่าน |
| F07 LOW | UI | src/assets/interface.css:3; src/assets/interface.css:5; src/components/catalog/MenuPriceInfo.vue:78; src/components/ui/AppSelect.vue:111; src/components/ui/AppCheckbox.vue:26 | hover selectors บางตัวไม่มี `(hover:hover)` guard ต่างจากแถวเมนูที่ guard แล้ว | ครอบ hover-only styling ด้วย media query; เก็บ selected, expanded, checked และ keyboard states ไว้นอก query | source inconsistency ยืนยันได้; hover latch บนอุปกรณ์สัมผัสจริงยัง Not verified. ไม่รายงานว่าเกิด latch จริงโดยไม่มี browser |

### จุดที่ดีและควรเก็บ

- เปิด/แก้ไขใช้ popup เดิมแล้ว; การดูรายละเอียดไม่ยึดหน้าเป็น modal
- ซ่อนช่องทางราคา 0/ว่างที่ data rows ร่วมกัน ทำให้กราฟทั้ง 3 แบบและ line key สอดคล้องกัน
- list button เป็น native button, มี pressed state; ค้นหาไม่ล้าง active menu และมีทางออกเมื่อไม่พบผล
- มี minmax(0,1fr), min-width:0, container query สำหรับ recipe rail และการเลื่อนภายใน modal ที่ contain scroll
- ปุ่มลบมีชื่อและ destructive confirmation; ชื่อเมนูว่างมี inline error, aria-invalid และ focus-first-invalid
- มี keyboard logic ใน select/modal และ reduced-motion rules; ไม่พบเหตุให้เพิ่ม library หรือเปลี่ยนฟอนต์

## Layout evidence และข้อเสนอที่ยังต้องตรวจภาพจริง

ค่าปัจจุบัน: main padding desktop 24px ต่อข้าง; sidebar 72px ถึง1199px แล้ว256px; list200px ถึง1199pxแล้ว220px; gutter20/24px; recipe rail290px เมื่อ menu-content ≥800px; analysis padding24px หรือ16pxเมื่อ container≤560px; platform cards เปลี่ยนเป็นสองคอลัมน์ด้วย viewport≥1500px

การคำนวณต่อไปนี้เป็น **แบบจำลอง CSS ไม่ใช่ viewport measurement** ไม่รวม scrollbar, browser zoom หรืออุปกรณ์จริง:

| Viewport | Menu content โดยประมาณ | Recipe ตาม rule ปัจจุบัน | ประเด็นที่ต้องดูจริง |
| --- | --- | --- | --- |
| 768px | 428px | อยู่ใต้ analysis | ชื่อไทยยาว/ปุ่มไม่เบียด; เมนูซ้ายไม่กินที่เกินงาน |
| 1024px | 684px | ใต้ analysis | ความยาวหน้าและการเข้าถึงสูตรบน iPad แนวนอน |
| 1199px | 859px | อยู่ขวา | พื้นที่ analysis หลังหัก rail/padding ราว501px |
| 1200px | 652px | ลงด้านล่าง | sidebar ขยายจึงทำให้พื้นที่ลด; ทดสอบสองฝั่ง breakpoint นี้เสมอ |
| 1440px | 892px | ขวา | เนื้อ analysis ราว534px; ตัดสิน typography ด้วยข้อมูลจริง |
| 1500px | 952px | ขวา | viewport rule เปิด platformสองคอลัมน์ แม้ analysis เหลือราว594px (แต่ละคอลัมน์ราว285px) |
| 1920px | 1372px | ขวา | มีพื้นที่เพิ่ม platform สองคอลัมน์โดยไม่ขยายระยะสายตาเกินงาน |

ข้อเสนอ: ให้ **พื้นที่ analysis จริง** ตัดสินจำนวน platform columns; คง list ซ้ายและ recipe ขวาเมื่อพื้นที่พอ ไม่บังคับสามคอลัมน์ทุกจอ ไม่ให้มือถือย่อ dashboard ทุกส่วนลงพร้อมกัน

สิ่งต่อไปนี้เป็น validation candidates ไม่ใช่ defect ที่ยืนยันแล้ว: captions11pxอ่านบนiPadหรือไม่, graph labels/ตัวเงินยาวตัดหรือไม่, popup375pxที่สองprice fieldsต่อแถวแน่นหรือไม่, list stickyมีcueเพียงพอหรือไม่, content320px/zoom200%ล้นหรือไม่

## Verification

### Passed / inspected

1. `npm test -- tests/ui/menuAuditProbe.temp.test.js tests/ui/menuWorkspace.test.js tests/ui/menuPlatformFinancials.test.js tests/ui/menuEditorInteraction.test.js tests/ui/dialogLayers.test.js tests/ui/gpPricing.test.js tests/ui/appSelect.test.js tests/ui/priceForms.test.js` → 8 files, 43 tests passed. ประกอบด้วย 41 existing checks และ 2 diagnostic probes สำหรับ F02/F04; probes assert พฤติกรรมปัจจุบันเพื่อยืนยันปัญหา ไม่ได้หมายความว่าปัญหาถูกแก้ และไฟล์ temp ถูกลบหลังรัน
2. `npm run lint` → passed
3. คำนวณ WCAG sRGB relative luminance ด้วย Python: main/card14.250; muted/card5.174; local-muted/card6.148; cream/brand11.217; success/card4.898; danger/card6.318; muted/soft4.485; soft/card1.154; control-border/card3.492; GP-chart/card3.890. สองค่าท้ายที่เกี่ยวกับกราฟใช้เกณฑ์ non-text3:1 ตามบทบาท ไม่เอา GP-chart4.5มาใช้ผิดประเภท
4. Source inspected: numeric tabular-nums, native input16px overrideที่ main.css:149, modal error/dirty protection, confirmation, hidden platforms, scroll containment และ reduced-motion guards
5. เงื่อนไขไม่ใช้outlineและpaletteครีม/แดง/Promptถือเป็นข้อกำหนด ไม่เสนอเปลี่ยน visual world

### Not verified

- `cua.getState()` → `Local browser use is disabled in Work settings`; ไม่มี tab ที่เปิดตรวจได้
- desktop/iPad/mobile screenshots, computed colors/sizes, 320px reflow, 200% zoom, iOS keyboard, Safari font rendering, RTL/pseudo-localization, physical touch, visible focus walkthrough, screen reader และ animation replay
- ไม่รัน production deploy/build ใหม่ในงานเอกสารนี้ และไม่ใช้ภาพจาก commit เก่าเป็นหลักฐานปัจจุบัน
- ค่าsoft/card1.154เป็นค่าคู่สีเท่านั้น ไม่สรุปอัตโนมัติว่าทุก field ผิด1.4.11: ต้องพิจารณาขอบเขต/label/shapeที่ระบุตัวcontrolจริงด้วย

## Verdict

**Block — source/DOM audit scope.** F01/F02 ต้องแก้ก่อนผ่านเกณฑ์นี้ และ F03 ต้องแก้ค่าที่ประกาศพร้อมยืนยัน computed colors. ไม่ใช่คำสั่งหยุดเว็บไซต์ที่ใช้อยู่ และไม่มีการเปลี่ยนแปลง production ในรอบนี้ ทุก domain ถูกตรวจระดับ source; visual/physical-device acceptance ยังไม่ผ่านเพราะยังตรวจไม่ได้

แผนดำเนินการ: `docs/superpowers/plans/2026-10-20-menu-interface-layout.md`
