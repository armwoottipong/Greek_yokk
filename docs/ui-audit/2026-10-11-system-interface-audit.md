# Yoggie — System interface audit

วันที่: 11 ต.ค. 2026 · Baseline: `3e92fcc` · สถานะ: **Block / ต้องแก้ HIGH ก่อนรับรองคุณภาพ UI**

## Scope and coverage

ผู้ใช้ยกเลิกแผนปรับมือถือเฉพาะ 4 หน้า และขอ audit ทุกหน้าหลัก popup และ components ทั้ง desktop/responsive/mobile เพื่อใช้ impeccable ออกแบบและตรวจคุณภาพรอบใหม่

**บริบทที่ผู้ใช้ยืนยัน:** เครื่องหลักหน้าร้านคือคอมพิวเตอร์และ iPad; มือถือใช้จัดการสะดวกเมื่ออยู่นอกร้าน ไม่เน้นข้อมูลเชิงลึกในหน้าแรก คงมาสคอตและเอกลักษณ์ cream/burgundy เดิม ไม่ถือว่ามือถือเป็นรูปแบบหลักของทุกอุปกรณ์

**Stack:** Vue 3, Pinia, Tailwind 3 พร้อม warm/stone/brand color overrides, scoped CSS และ CSS variables, lucide-vue-next, Vite, Vitest/Vue Test Utils

**Convention recon:** พบ `src/assets/main.css`, `tailwind.config.js`, `.agents/skills/frontend-design/SKILL.md` และเอกสารแผนเดิม; ไม่พบ AGENTS.md, CONTRIBUTING.md, CODING_STANDARDS.md, Storybook หรือ DESIGN.md ใน repo เริ่ม audit โดยไม่มี PRODUCT.md; ระหว่าง audit บันทึกข้อเท็จจริงที่ผู้ใช้ยืนยันลง `PRODUCT.md`

### ข้อจำกัดของ better-interface

โหลด `better-interface/SKILL.md` และ `review-format.md` แล้ว แต่ไม่พบ owning skills ทั้ง 6 ใน project skills, user skills และ plugin cache ที่ตรวจค้น Skill แม่ระบุให้ทำเครื่องหมาย Not reviewed และดำเนินต่อ ไม่ให้สร้างกฎของ skills ย่อยจากความจำ

| Domain | Evidence inspected | Result |
|---|---|---|
| Accessibility | ตรวจ code/AX/form names ด้วย impeccable audit; ไม่ได้ใช้ better-accessibility | **Not reviewed by owning skill** — better-accessibility ไม่พร้อมใช้งาน |
| Layout | มี screenshot/DOM measurements ของ 6 หน้าและ popups; ใช้ impeccable audit/Operate | **Not reviewed by owning skill** — better-layout ไม่พร้อมใช้งาน |
| Writing | ตรวจ copy เทียบ flow ราคา/สต็อกและ recovery | **Not reviewed by owning skill** — better-writing ไม่พร้อมใช้งาน |
| Typography | อ่าน Tailwind/font overrides และวัด control/text sizes | **Not reviewed by owning skill** — better-typography ไม่พร้อมใช้งาน |
| Colors | ตรวจ tokens และ rendered color pair ที่ระบุด้านล่าง | **Not reviewed by owning skill** — better-colors ไม่พร้อมใช้งาน |
| UI polish/motion | อ่าน transitions/receipt confetti และ captures | **Not reviewed by owning skill** — better-ui ไม่พร้อมใช้งาน |

ตาราง findings ต่อไปเป็น **ผลตรวจด้วย impeccable audit + source/runtime evidence** โดยใช้ severity และรูปแบบ consolidation ของ better-interface ไม่ใช่การอ้างว่า owning reviews ทั้ง 6 ผ่านแล้ว

### Runtime boundary

- Browser: Codex in-app Chromium, local origin แยก `http://127.0.0.1:3021/Greek_yokk/`; เริ่มข้อมูลว่าง แล้วโหลด Demo เฉพาะ origin นี้
- ตรวจหน้าหลักทั้ง 6 ที่ 1280px, 768×1024 (iPad portrait emulation), 1024×768 (iPad landscape emulation), 320×740
- ตรวจ source ของ 34 Vue surfaces/components (รวม App shell) และ 2 embedded overlays รวม **36 หน่วยตรวจ**; Dashboard มี 4 มุมมอง และ Settings มี 4 หมวดย่อย
- Popup ส่วนใหญ่เปิดผ่าน UI พร้อม AX/DOM/screenshot; LotDepletion ตรวจ source และ existing modal tests แต่ **ยังไม่ได้เปิด branch หลายล็อตใน browser**
- Capture หลัง resize บางภาพมี repaint artifacts จึงใช้ DOM measurements/AX ร่วมกัน ไม่ใช้ภาพหลัง resize เพียงภาพเดียวสรุป clipping; ภาพหน้าหลัก stock-320 และ POS iPad เป็น evidence หลักของ layout
- ยังไม่ได้รับรองทุก empty/loading/error/long-content branch; รายการที่ไม่ได้ exercise อยู่ใน Not verified ด้านล่าง
- ไม่ checkout ขายจริง ไม่ส่ง GAS request ไม่กู้คืน/ล้างข้อมูลร้านจริง; มีเพียงการเพิ่มสินค้าหนึ่งชามใน cart ของ Demo และยกเลิก shortage warning

## Findings

รวม **13 root findings: 6 HIGH, 7 MEDIUM** ไม่มีการเติม LOW เพื่อให้ครบจำนวน cap; ไม่พบข้อเสนอให้เปลี่ยน mascot/font เพราะ detector บอกว่าเป็นรูปแบบที่พบได้บ่อย

| ID / Severity | Domain | Location | Before | After | Why |
|---|---|---|---|---|---|
| F01 **HIGH** | Accessibility | `src/components/modals/MenuEditModal.vue:37,114,190`; `AddonEditModal.vue:36,80,117`; `MaterialEditModal.vue:106,193`; `StockInModal.vue:106,157,218`; `StockAdjustModal.vue` ช่องยอดจริง; `WasteModal.vue` ช่องจำนวน; `EmojiPickerPopover.vue:10`; search ใน `PosView.vue:33`, `MenuView.vue:9`, `AddonView.vue:8`, `StockView.vue:180` | `<label>` อยู่ข้าง input แต่ไม่ผูก for/id; number inputs เช่นราคาและจำนวนไม่มี aria-label; AX แสดง “stepper (settable)” โดยไม่มีชื่อ | สร้าง Field pattern ที่ label ผูก id, ระบุหน่วย/ข้อผิดพลาดผ่าน describedby; ราคาใช้ชื่อ “ราคาหน้าร้าน”, “ราคา GrabFood”; quantity ใช้ชื่อวัตถุดิบ/ล็อตที่แก้ | คนใช้ keyboard/screen readerไม่ทราบว่ากำลังแก้ราคา/จำนวนใด; มีผลกับทั้งระบบและเพิ่มความเสี่ยงกรอกข้อมูลผิด |
| F02 **HIGH** | Accessibility | `src/views/MenuView.vue:179` | BOM close button เป็น `<button><X/></button>` ไม่มี text/aria-label/title; AX แสดง “button” ว่าง | เพิ่มชื่อ “ปิดรายละเอียดสูตร” และตรวจ icon-only ทุก component ด้วย automated accessible-name check | ปุ่มที่ใช้ปิด flow หลักไม่มี accessible name; ยืนยันทั้ง DOM และ AX |
| F03 **HIGH** | Accessibility / Layout | `src/views/MenuView.vue:155–162`; `src/views/StockView.vue:894–900`; เทียบ `src/components/ui/ModalShell.vue:1–40` | embedded BOM/delete overlaysเป็น Teleport+div ไม่ผ่าน ModalShell; BOM/คำเตือนลบเปิดแล้ว AX ยังมี background และ focusค้าง triggerด้านหลัง | ย้ายไป Dialog/Sheet patternที่ใช้ ModalShell, role/title, top-layer focus, Escape/cancel, restore focus และ scroll root | overlayของงานอ่านสูตรและลบถาวรไม่ให้ isolation/keyboard semanticsสอดคล้องกับ popupใหม่; ไม่ได้พบว่าคำสั่งลบไม่มี confirmation |
| F04 **HIGH** | Responsive layout | `src/views/StockView.vue:11–56,135–196` | แถบคำสั่งไม่ wrap; ที่320px main client314px แต่scrollWidth439px; ปุ่มตรวจนับ/เพิ่มวัตถุดิบและfilterบางส่วนอยู่นอกหน้าจอ | แยกtoolbarตามdevice: desktopคำสั่งครบ, tabletปุ่มtouchพร้อม overflowmenu, mobileรับเข้า/ตรวจนับ+เพิ่มเติมและsearchเต็มแถว | เป็น horizontal page overflowที่ซ่อนcontrols; screenshot stock-320 และDOMตรวจตรงกัน |
| F05 **HIGH** | Motion accessibility | `src/components/modals/ReceiptModal.vue:134–141`; `node_modules/canvas-confetti/src/confetti.js:247,555,611–615` | `confetti({particleCount:60,...})` ทุกครั้งที่เปิด receipt โดยไม่มี disableForReducedMotion; library default=false; global CSSไม่หยุดcanvas animation | ตรวจmediaก่อนเรียกหรือส่ง `disableForReducedMotion:true`; เลือกเล่นเฉพาะขายสำเร็จ ไม่ใช่เปิดใบเสร็จเก่าทุกครั้ง | JavaScript motionไม่เคารพreduced motionแม้CSSส่วนอื่นปิดแล้ว; ยืนยันจากcallsiteและlibraryที่ติดตั้ง ไม่เดาจากชื่อanimationclass |
| F06 **HIGH** | Color accessibility | `src/components/ui/DateRangeCalendar.vue:31–32` | วันอาทิตย์ `text-rose-400`, rendered rgb(251,113,133) / backgroundrgb(255,252,246), text10px; contrast **2.63:1** | ใช้muted tokenที่ผ่านหรือsemanticสีแดงเข้มที่ได้≥4.5:1; ข้อความ “อา.” ยังอยู่ ไม่อาศัยสีอย่างเดียว | ปฏิทินใช้ร่วมDashboard/ประวัติ จึงกระทบหลายflow; ตัวหนังสือขนาดเล็กอ่านยากและไม่ผ่านอัตรา4.5:1 |
| F07 **MEDIUM** | Layout / efficiency | `src/components/layout/Sidebar.vue:2`; `src/views/PosView.vue:2,32,61,100` | sidebar256pxตั้งแต่768px; iPadportrait mainเหลือ506px/catalog458px แต่grid3คอลัมน์; catalog/cartซ้อนในfixedheight พื้นที่สินค้าน้อยและชื่อถูกตัด | tablet rail/drawerตามพื้นที่จริง; POSใช้catalog+cartสองpanelเมื่อมีพื้นที่พอ และcartdrawer/reviewbarในportrait; จัดจำนวนcolumnsตามcontainerwidth | iPadเป็นเครื่องหลักตามคำยืนยัน การใช้desktopsidebar+breakpointgridตามviewportลดประสิทธิภาพหน้าร้าน; ยังไม่ยืนยันว่าปุ่มcheckoutเข้าไม่ถึง |
| F08 **MEDIUM** | Responsive layout | `src/views/StockView.vue:201,471`; `MenuView.vue:38–149`; `AddonView.vue:48–122`; `DashboardView.vue` ตารางบิล | มือถือใช้ตารางคลัง1120px เมนู976px Add-on547px ในพื้นที่280px; Dashboardบิล496pxใน248px | desktopคงตาราง; tabletคอลัมน์สำคัญ+details; mobileรายการสรุปและactionใกล้ข้อมูล พร้อมเปิดรายละเอียดได้ | ยังเลื่อนถึงข้อมูลได้ แต่ต้องจำแถวแล้วเลื่อนข้างเพื่อหาaction; ผิดโจทย์จัดการรวดเร็วนอกร้าน ไม่สรุปว่าtableทุกแบบเป็นข้อผิดพลาด |
| F09 **MEDIUM** | Touch / typography | `AppSelect.vue:101`; `AppCheckbox.vue:24`; `DateRangeCalendar.vue:8,53`; HeaderBar quickactions, formclosebuttons, POS qtybuttons | หลายcontrolสูง28–40px; calendarday32px, select40px; secondarycopy9–11px; mobile small-targetcounts dashboard20/stock32 | Button/IconButton sizes+hit-areaร่วม; target44pxสำหรับtouch; type scaleแยกbody/captionและขยายเฉพาะที่อ่านใช้งาน | มีผลกับiPadที่ใช้touchด้วย ไม่ใช่แค่มือถือ; 44pxเป็นqualitytargetของแผน ไม่อ้างว่าทุกcontrol<44ผิดWCAG2.2โดยอัตโนมัติ |
| F10 **MEDIUM** | Feedback accessibility | `src/components/ui/ToastContainer.vue:2–20` | toastvisualไม่มี role=status/alert/aria-live; หลายข้อความแจ้งสำเร็จ/ผิดพลาดอาศัยtoast; containerfixedright/bottomและไม่มีmobilemaxwidthชัด | Feedback pattern: status politeสำหรับsuccess/info, alertสำหรับerrorที่ต้องแก้; messagesมีrecovery; mobile width≤viewport-32px; ไม่ย้ายfocusไปtoast | sourceยืนยันไม่มีlive announcements; toast demoแสดงได้ แต่ยังไม่ได้ทดสอบlongerror textหรือNVDA announcementจริง |
| F11 **MEDIUM** | Writing / trust | `src/views/StockView.vue:129`; `src/views/MenuView.vue:204`; `src/views/MenuView.vue:12`; `LowStockWarningModal.vue:17–22` | “ระงับขายเมนูที่เกี่ยวข้อง” ทั้งที่flowให้ยืนยันขายต่อได้; “กำไรขั้นต้น (GP)” ในสูตร แต่GPที่อื่นหมายถึงplatformfee; searchplaceholderบอกวัตถุดิบแต่filterค้นแค่name/description | แยก “ค่าธรรมเนียมช่องทาง (GP)” / “อัตรากำไรขั้นต้น”; stockcopyบอกยืนยันขายต่อ; placeholderตรงsearchจริง | ทำให้ผู้ใช้ตีความข้อจำกัดการขายและตัวเลขผิด; auditไม่เสนอเปลี่ยนกฎbusinessเพื่อให้ตรงข้อความ |
| F12 **MEDIUM** | Theming / consistency | `tailwind.config.js:8–29`; `src/assets/main.css:8–23,91–96`; coloredselectionใน`CustomOrderModal.vue:55–60`, `MaterialEditModal.vue:78–86`; inline popup sizesทั่วmodals | มีtokensแล้วแต่componentระบุborder/radius/padding/selectedstateเอง; .soft-inputใช้!importantจนstyleใหม่overrideไม่ได้; selected Add-onกับtoggleอื่นมีภาษาvisualต่างกัน | semantictokensและcontrolvariantsที่มีเจ้าของ; อนุญาตcategorycolors/graphseriesแต่selectionใช้patternเดียว; ลด!importantตามลำดับไม่ทำglobalreplace | แก้sharedsourceได้ผลมากกว่าตกแต่งทีละpopup; burgundybrandไม่ถือว่าเป็นdangercolorผิดความหมายเอง |
| F13 **MEDIUM** | Component layout | `src/components/modals/EmojiPickerPopover.vue:40–45` | grid7คอลัมน์ cell40px+gapsในpopup288pxที่320px ทำให้horizontal scrollbarและคอลัมน์ท้ายต้องเลื่อน | responsivegrid5–6คอลัมน์บนมือถือ,7บนพื้นที่พอ; ชื่อไอคอนแบบสั้นเป็นaccessiblelabel searchlabelชัด | ปุ่มที่เลือกรายการมีscrollcueจึงไม่จัดHIGHเรื่องไม่มีทางเข้าถึง แต่การเลือกไอคอนควรเลื่อนทิศทางเดียวและใช้touchง่าย |

## Verification

### Passed / observed

| Check | วิธีตรวจ | ผล |
|---|---|---|
| Runtime6pages | เปิดsidebar/navทั้ง6 บน1280,768portrait,1024landscape,320; บันทึกscreenshotsและDOM | พบStockpageoverflow320และtabletPOSdense; Settingsไม่มีpageoverflowในการวัด |
| Popup forms | เปิดadd-menu/add-addon/add-material/stock-in/stock-adjust/stocktake/waste ผ่านUI | รูป/AX/ชื่อcontrolsและส่วนscrollได้ตามcoverageด้านล่าง |
| Nested flow | CustomOrder qty40 → เพิ่มตะกร้า → shortagewarning → ยกเลิก | กลับCustomOrder qty40ได้ ไม่สร้างorderหรือเปลี่ยนstock |
| Legacy overlays | เปิดBOMและคำเตือนลบmatที่ผูกrecipe; ไม่ยืนยันลบ | AX/background/focusค้างด้านหลังเป็นหลักฐานF02/F03 |
| Shared controls | เปิดhistoryfilter, dropdown, calendar, checkbox/switchในforms; charttooltipในDashboard | ชื่อcontrolsส่วนใหญ่มี; calendarSundaycontrastfail; AppSelectkeyboardEscapeใช้งานได้ |
| Color calculation | renderedDateRangeCalendarcolor/bg + relative-luminanceformula | Sunday2.63:1; muted#7D675B/card**5.17:1ผ่าน**; ไม่กล่าวหาทุกstone-400ว่าซีด |
| Source/librarymotion | อ่านReceiptconfetticallและcanvas-confettiที่ติดตั้ง | librarydefaultdisableForReducedMotion=falseและcallerไม่ส่งflag |
| Detector | `.agents/skills/impeccable/scripts/impeccable.cmd detect --json src` | 7warnings/exit1: font5, gray-on-color2; เป็นheuristicsไม่ใช่buildfailure |
| Unit/integration | `npm test` | **32files/182testsผ่าน** |
| Lint | `npm run lint` | ผ่าน |
| Production build | `npm run build` | ผ่าน; mainJS410.89kB/gzip118.54kB; lazy viewsแยกchunks |

### Detector verification / false positives

- Font warnings5จุดเป็นPlus Jakarta Sansที่ใช้กับตัวเลขในidentityเดิม ไม่ใช่เหตุผลให้เปลี่ยนfontหรือrebrand
- `MaterialEditModal.vue:84` detectorเอาสีconditionalคนละbranchมารวมกัน; ต้องวัดbranchจริงก่อนกล่าวหาว่าgrayบนpurple800
- `SettingsView.vue:361` ตัวอย่างstone500/amber100ได้ประมาณ5.71:1ตามpaletteปัจจุบัน ไม่ใช่contrastfailเพียงเพราะเป็นgray-on-color
- ไม่เอา7warningsไปนับเป็น7findingsเพิ่ม และไม่รันdetectorซ้ำเพียงเพื่อให้warningเป็น0

### Not verified

- skillsเจ้าของbetter-*ทั้ง6ยังไม่พร้อม; ไม่มีการรับรองcross-disciplineครบตามskillนั้น
- **iPad/Safariบนเครื่องจริง**, touchgestureจริง, hardwarekeyboard, mobileon-screenkeyboardและsafeareasจริง
- 200%/400%browserzoomจริง; viewportemulationไม่ใช่หลักฐานtextzoom
- screenreaderannouncementจริงด้วยNVDA/VoiceOver; รายงานa11yยึดAX/DOM/sourceก่อน
- LotDepletionbranchหลายล็อตในbrowser, longlist/30recipe rows, storagequotaerror, GASloading/errorจริง, JSONrestorevalidationUIทั้งหมด
- ทุกภาวะempty/loading/errorของทุกpopup และtoastข้อความยาวยังไม่exerciseครบ; ต้องเป็นQA gatesในแผนใหม่
- Fullprintflow80mmและperformanceบนlow-enddevice; buildsizeไม่ใช่FPS/latencymeasurement
- Screenshotบางresizeมีrepaint artifacts; ใช้เป็นnavigationevidence ไม่ใช่goldensสำหรับpixelcomparison

## Surface inventory — ทุกหน่วยตรวจและสิ่งที่ต้องปรับ

Legend: **R** = เปิด/อ่านruntimeตัวอย่าง; **S** = source inspected; **T** = existingtests; ไม่ได้หมายถึงทุกbranchผ่าน

| Unit / source | Coverage | Action / preservation |
|---|---|---|
| App.vue / app shell | R/S | navigation coordination, KeepAlive/businessstate, global overlay placementและmain scrolling |
| DashboardView | R/S/T | ปรับtableบิลมือถือ/type/touch; คง4มุมมองdate-rangeและfinancialsnapshots |
| PosView | R/S/T | ออกแบบdesktop+iPadworkspaceก่อนmobile; catalog/cart/checkoutflow |
| MenuView | R/S | responsivecatalogmanagement, searchcopy, migrateBOMoverlay |
| AddonView | R/S | รายการcompact/detailsprice; linked-materialstateและeditor |
| StockView | R/S/T | toolbar/cards/tabletcolumns/lots/drafts; migrateaction/deletedialog |
| SettingsView | R/S/T | คงหมวดที่เพิ่งจัดดีแล้ว; ปรับfieldlabels/categoryediting/nativeconfirmation/connectionfeedback |
| HeaderBar | R/S/T | จัดdevicepriorities; ลดglobaldestructivebuttons; fulltitlesในdetails |
| Sidebar | R/S/T | desktopfull, tabletrail/drawer, mobiledrawer; คงmascotasset |
| DashboardTrend | R/S/T | คงmark-specific/groupclicktoggleและpinnedhighlights; ตรวจtouch/focuslargecontent |
| DashboardBreakdown | R/S/T | คงdonut/selecteddim; listitemsที่interactiveควรมีbuttonsemantics |
| ActivityLogModal | R/S/T | คงexpandablerows/filter; touchsize/typeและlongcontent |
| AddonEditModal | R/S/T | fieldlabels/pricecontext/scrollbody+footer/keyboard |
| ConfirmModal | R/S/T | คงcancelinitialfocusและdangerconfirmation; sharedsizes/overflowmessage |
| CustomOrderModal | R/S/T | iPadaddonselection, mobilefooter, quantitynames; preservecancelshortageflow |
| EmojiPickerPopover | R/S | responsivegrid/searchname; คงnestedoverlay |
| LotDepletionModal | S/T | ต้องruntimeหลายล็อต; boundedscroll/dialogstack/cancelbehavior |
| LowStockWarningModal | R/S/T | คงexplicitbackorderwarning; longwarnings/numberformat/type |
| MaterialEditModal | R/S/T | fields/role/production/pack/stocklabels; typoaria-label “ปิดหน้าต่าง” บนrecipe-removeควรเป็น “ลบวัตถุดิบจากสูตร” |
| MenuEditModal | R/S/T | price/recipefieldssemanticname; mobileformsectionsและnamefullaccess |
| ReceiptModal | R/S/T | confetti opt-out, copy/number/print; ไม่animationทุกhistoryview |
| StockAdjustModal | R/S/T | quantitylabel/lotcontext/variance+draftfeedback |
| StockInModal | R/S/T | purchase/productionsections, units/cost/datefields; directpurchasebranchยังต้องruntimeเพิ่ม |
| StocktakeModal | R/S/T | คงชื่อinput/variance/draftsemanticsที่ดีแล้ว; touchinput/date/tablet/keyboard |
| WasteModal | R/S | quantity/lot/reasonlabel, explicitimpactandrecovery |
| AppSelect | R/S/T | คงkeyboard/listbox/typedvalues; touchheight/fulloptiontext/mobilekeyboard |
| AppCheckbox | R/S/T | คงlabel/switch/reducedmotion; hit-area/indeterminateถ้าflowต้องใช้ |
| ChartTooltip | R/S/T | คงarrow/position/toggle/scrolllockตามuser; data-accessvia keyboardandlabels |
| DateRangeCalendar | R/S/T | Sundaycontrast/touchdays/monthnavigation/longranges |
| FilterDropdown | R/S/T | desktopanchoredpopup/mobileadaptivepanel; คงapply/cancel/draftstate |
| HistoryLogEntry | R/S/T | คงnativedetails/summary; fullnotesเมื่อexpand/statuslabels |
| ModalShell | R/S/T | คงfocus/inertstack; commonviewport/scroll/visual-layercontract; needbackgroundscrollruntime |
| ToastContainer | R/S | announcements/mobilewidth/motion; เห็นdemosuccessและadd-to-cartinfo |
| ToggleSwitch | R/S/T | คงAppCheckboxwrapper; label/caption/hit-area |
| Embedded BOM popup | R/S | F02/F03 migration; GPcopyและcost/pricemeaning |
| Embedded permanent-delete popup | R/S | F03 migration; คงusagewarning/archivealternativeและconfirm |

## Positive findings — สิ่งที่ควรเก็บไว้

- Identitycream/burgundyมีtokensและTailwindoverridesแล้ว; mutedtextบนcardผ่านcontrast ไม่ต้องเปลี่ยนbrandเพราะaudit
- ModalShellส่วนใหญ่จัดfocus/inertstack; การยกเลิกshortageกลับcustomorderได้จริง
- AppSelectมีkeyboardarrow/Home/End/typeahead/Escapeและdisabledoptions; AppCheckboxมีnativeinput/labelsและreducedmotion
- Dashboardใช้recordedfinancialsnapshots, date-rangeและtooltipเฉพาะmark; Stocktakeบอกชัดว่าเพิ่มเข้าdraftยังไม่commit
- Settingsแยกbackupกับreset actionsและหมวดnavigationดีขึ้น; ไม่จำเป็นต้องรื้อcompositionทั้งหน้า
- Businessregressions182รายการผ่าน; ต้องรักษาเป็นbaselineระหว่างrefactorUI

## Audit health score — provisional, ไม่ใช่ certification

| Dimension | Score /4 | หลักฐาน |
|---|---:|---|
| Accessibility | 2 | ModalShell/controlsดีบางส่วน แต่anonymousfields/legacydialogs/reducedmotion/contrastยังมี |
| Performance | 3 | build/lazyviewsไม่มีปัญหาที่ตรวจพบ; ไม่ได้profileFPSจริง |
| Theming | 3 | paletteจริงcoherentและtokenized; repeatedcontrolvalues/semanticdriftยังมี |
| Responsive | 1 | Stock320overflow, tabletPOSdense, mobiletablesยังต้องเลื่อนมาก |
| Implementation integrity | 2 | ใหม่กับlegacyoverlay/controlpatternsอยู่ปะปน; detectorwarningsส่วนใหญ่ไม่ใช่defectจริง |
| **Total** | **11/20** | Significant work needed; provisionalตามscopeที่ตรวจ |

## Recommended actions

1. **P1 / impeccable harden:** fieldnames, legacydialogsemantics, toastannouncements, nestedfocus
2. **P1 / impeccable animate + colorize:** reduced-motioncanvasและcalendarcontrast โดยคงmascotpalette
3. **P1–P2 / impeccable adapt:** desktop/tablet/mobiledevicecontracts, Stockoverflow, POSworkspace, managementlists
4. **P2 / impeccable clarify + layout + typeset:** businesscopy, hierarchy/type/controlsize
5. **P2 / impeccable extract:** sharedfield/button/dialog/feedbacktokensและcomponents
6. **impeccable polish:** finalboundeddesktop+iPad+mobilebatchหลังfunctionalchecksผ่าน ไม่วนตกแต่งไม่สิ้นสุด

ใช้ลำดับงานจากแผนใหม่ `docs/superpowers/plans/2026-10-11-system-interface-renovation.md` ไม่ใช้แผนมือถือ4หน้าเดิม

## Verdict

**Block:** F01–F06ยังอยู่; ห้ามใช้ผลtestsผ่านหรือdetectorwarningsต่ำแทนการรับรองUI ไม่มีการรับรองowningreviewsของbetter-accessibility/layout/writing/typography/colors/uiซึ่งยังไม่พร้อม; ข้อสรุปครอบคลุมsource/runtimeตัวอย่างตามinventoryและมีNot verifiedชัดเจน

## Evidence artifacts

`C:/Users/user/.codex/visualizations/2026/10/09/01a1217c-5703-79d1-ad7e-725beb8120f4/audit-2026-10-11/`

- `desktop-measurements.json`, `mobile-measurements.json`, `popup-measurements.json`
- `stock-320.jpg`, `pos-ipad-portrait.jpg`, `pos-filled-ipad-portrait.jpg`
- mainpagecaptures6×desktop/mobile/iPadสองแนว และpopupcapturesที่ระบุชื่อในJSON
- ภาพเหล่านี้เป็นauditcapturesของbaseline ไม่ใช่ภาพหลังแก้ไข
