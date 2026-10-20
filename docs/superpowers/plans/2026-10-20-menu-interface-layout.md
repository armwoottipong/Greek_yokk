# Menu Interface and Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับหน้าเมนูและสูตรให้ตัวเลขเชื่อถือได้ การเลือก/แก้ไขต่อเนื่อง และสัดส่วนอ่านง่ายตามพื้นที่จริง โดยคง popup เพิ่ม/แก้ไขและไม่ใช้ outline focus

**Architecture:** เก็บ MenuView เป็น master/detail, MenuPlatformOverview เป็นเจ้าของข้อมูล/กราฟช่องทางที่ตั้งราคา และ MenuRecipePanel เป็น read-only recipe rail. ใช้ component/CSS variables/container queries เดิม ปรับ event/selection เฉพาะที่จำเป็น ไม่สร้าง state store, chart package หรือ design system ใหม่

**Tech Stack:** Vue 3, Pinia, Vite, Tailwind 3, scoped CSS, Lucide, Vitest + Vue Test Utils

**Spec:** `docs/ui-audit/2026-10-20-menu-interface-review.md` (source baseline a5e1c83); PRODUCT.md, DESIGN.md และคำสั่งผู้ใช้ใน session นี้เป็น constraints สูงกว่า historical surface notes

## Global Constraints

- เพิ่มเมนูและแก้ไขเมนู/สูตรใช้ MenuEditModal popup เดิม ไม่กลับไป inline editor
- อ่านเมนูผ่าน list ซ้าย, analysis บน/กลาง, recipe ขวาเมื่อพื้นที่พอ และเรียงลงด้านล่างเมื่อพื้นที่ไม่พอ
- แพลตฟอร์มราคาไม่ตั้งหรือราคา ≤0 ไม่แสดงใน report, bar, donut, line points หรือ line key; ยังแก้ไขราคาทุกแพลตฟอร์มได้ใน popup
- ไม่มี platform-filter ที่ผู้ใช้ต้องเลือกหลายขั้นตอน; ไม่เปลี่ยน currentPlatformId ของ POS จากหน้าจัดการเมนู
- **ห้ามใช้ outline focus** รวม ring/halo ที่เทียบเท่า; แก้ visible keyboard feedback ด้วยพื้นหลัง ข้อความหรือ marker ภายในที่ไม่ล้อมกรอบแทน
- คง cream/burgundy/Prompt และแนวทาง dashboard ภาพรวมร้าน; ไม่เปลี่ยน palette หรือฟอนต์ทั้งระบบ
- ไม่เปลี่ยน GP, cost estimator, inventory transactions, checkout, schema/storage หรือ sync payload
- ไม่ใช้ข้อมูลร้านจริงเป็น fixture; ใช้ demo data เท่านั้น
- review/plan ครั้งนี้ไม่อนุญาตให้แก้ source หรือ deploy อัตโนมัติ; เริ่ม implementation เมื่อผู้ใช้สั่งให้ทำ

## Review Focus

1. ต้นทุนไม่ทราบ กับต้นทุนจริง0 ต้องแสดงต่างกันทุกจุด ไม่สร้างกำไรจากข้อมูลไม่ครบ — Task1
2. เพิ่มใหม่ขณะมี search, ยกเลิก, save ล้มเหลว และ route cache ต้องไม่เปลี่ยนไปเมนูผิด — Task2
3. เข้าแก้ไขสูตรยาว/ไม่มีวัตถุดิบแล้วโฟกัสถึงส่วนที่เกี่ยวข้อง ไม่ติดใน disclosureปิด — Task3
4. เมื่อ selected และ keyboard-focus เป็นคนละเมนู ต้องแยกได้ โดยไม่ใช้ outline และไม่เปลี่ยนข้อมูลจากการ Tab — Task4
5. 320px/200% zoom/keyboardบนมือถือ ต้องเข้าถึงราคาครบ ปุ่ม save/cancel และสูตรได้ — Task6–8

## ขอบเขตไฟล์

| File | Responsibility / สิ่งที่จะเปลี่ยน |
| --- | --- |
| src/views/MenuView.vue | unknown row cost; new-save selection; entry section; list/detail dimensions และ scoped focus feedback |
| src/components/catalog/MenuRecipePanel.vue | แสดงunknown cost, recipe action, typography และ layout ของrail |
| src/components/catalog/MenuRecipeDetails.vue | analysis container และ recipe rail threshold; ส่งsectionตอนedit |
| src/components/catalog/MenuPlatformOverview.vue | container-based card columns; financial hierarchy; no-data controls; คง financial math |
| src/components/modals/MenuEditModal.vue | optional entry section/focus; label fix; keyboard feedback เฉพาะpopup |
| src/components/ui/catalogEditor.css | menu popup pricing/recipe grid adaptation เฉพาะเมื่อภาพยืนยันว่าต้องแก้ |
| src/components/catalog/catalogRecipe.css | recipe text/amount scale โดยระวัง Add-on ซึ่งใช้ stylesheetร่วมกัน |
| src/assets/interface.css, src/components/catalog/MenuPriceInfo.vue, src/components/ui/AppSelect.vue, src/components/ui/AppCheckbox.vue | hover guards; sharedไฟล์แก้เฉพาะ rule ที่ระบุและ smoke testผู้ใช้รายอื่น |
| tests/ui/menuWorkspace.test.js, menuPlatformFinancials.test.js, menuEditorInteraction.test.js, catalogReadFlows.test.js, menuRenovation.test.js, finalReviewRegression.test.js | behavior regression ตามtaskเจ้าของ ไม่มีtestที่แค่เทียบCSS string |
| .impeccable/surfaces/menu-management.md | อัปเดตหลัง implementation ได้ตรวจจริงแล้ว ไม่เขียนว่าผ่านก่อนตรวจ |

ไม่แก้ App.vue/Sidebar/posStore data actions เพื่อแก้สัดส่วนหน้าเดียว หากต้องแตะ componentร่วมให้ระบุผลกระทบและไม่ขยายscopeเงียบ ๆ

## ลำดับดำเนินงาน

Task1–5 แก้ข้อบกพร่องที่มีหลักฐาน; Task6–7 เป็น layout proposal ต้องยืนยันจาก rendered baseline; Task8 รวมverificationและreview ไม่เพิ่มความสวยต่อโดยไร้ข้อบกพร่องใหม่

### Task 1: รักษาความหมายของ unknown cost — F02 / P0

**Files:** Modify MenuView.vue:37, MenuRecipePanel.vue:4. Test menuPlatformFinancials.test.js / catalogReadFlows.test.js

**Interfaces:** detailedRecipeItems แต่ละแถวคงข้อมูลเดิม แต่ `cost: number | null`; Panel ต้องรองรับ null และไม่เรียกtoFixedกับnull. ไม่แก้ estimateMenuCosts หรือ payloadสูตร

- [ ] เขียน regression: material.unitCost=null/undefined/non-finite หรือ materialไม่พบ → railไม่มี฿0.00แทนข้อมูลunknown และ overviewยัง unavailable
- [ ] เพิ่มกรณีunitCost=0ที่ทราบแน่นอน →แสดง฿0.00ได้ และต้นทุนpositiveคำนวณเหมือนเดิม; qtyไม่ระบุไม่สร้างค่าที่อ้างว่าแน่นอน
- [ ] รัน `npm test -- tests/ui/menuPlatformFinancials.test.js tests/ui/catalogReadFlows.test.js` ให้เห็นFAILตามความหมายใหม่
- [ ] แทน `Number(unitCost)||0` ด้วย explicit validity check; ส่งnull; Panelแสดง “ยังไม่ทราบต้นทุน” และข้อความชี้ให้ตรวจข้อมูลวัตถุดิบเมื่อจำเป็น ไม่เพิ่มdialogใหม่
- [ ] รันชุดเดิมให้PASS; ตรวจ hasPackage=false ว่า noteและoverviewไม่เปลี่ยน; ค่าที่ไม่รวมในการวิเคราะห์ไม่ถูกนำมาบวก
- [ ] Commit: `fix: distinguish unknown recipe costs from zero`

**Acceptance:** unknownไม่เท่ากับ0; ตัวเลขrailกับoverviewไม่ขัดกัน; การคำนวณโดเมนและstockเดิมไม่เปลี่ยน

### Task 2: จบการเพิ่มเมนูที่เมนูใหม่ — F04 / P1

**Files:** Modify MenuView.vue. Test menuWorkspace.test.js, menuEditorInteraction.test.js

**Interfaces:** local `pendingNewMenuIds: Set<string> | null`; บันทึกIDsก่อน requestAction(new), ตรวจ diffเมื่อpopupปิดเพื่อเลือกIDใหม่. ใช้store.menus IDsและstore.modals.menuEdit.isOpenที่มีแล้ว; ไม่เพิ่มpersisted field, ไม่เดาเมนูจากชื่อหรือเลือกmenus.at(-1)โดยไม่มีหลักฐาน

- [ ] เขียนtest hostที่mount MenuView + global MenuEditModal: add → saveจริงผ่านstore → selectedheadingและplatformsเป็นของIDใหม่
- [ ] เพิ่มtest: searchเดิมไม่matchเมนูใหม่ → clearsearchหลังsaveสำเร็จให้activeitemมองเห็น; cancel/dirty discard/fail saveไม่เปลี่ยนselection; editของเดิมไม่clearsearchโดยไร้เหตุ
- [ ] รัน `npm test -- tests/ui/menuWorkspace.test.js tests/ui/menuEditorInteraction.test.js` ให้FAILก่อนแก้
- [ ] ใช้IDdiffในวงจรopen→close, consumeครั้งเดียว; มือถือเปิดdetailของIDใหม่; restore focusหลังoverlayปล่อยinertแล้ว ไม่แย่งfocusขณะpopupยังปิดtransitionไม่เสร็จ
- [ ] รันPASSและ `npm test -- tests/ui/finalReviewRegression.test.js tests/ui/menuRenovation.test.js` เพื่อคงKeepAliveและsearch behavior
- [ ] Commit: `fix: select the menu created from its dialog`

**Acceptance:** addใหม่ไม่จบที่analyticsเมนูเก่า; ไม่มีselectionเปลี่ยนจากcancel/failureหรือsyncของงานอื่น

### Task 3: ปุ่มแก้ไขสูตรพาไปสูตรใน popup เดิม — F05, F06 / P1

**Files:** MenuView.vue, MenuRecipeDetails.vue, MenuEditModal.vue. Tests menuWorkspace, menuEditorInteraction, interfaceNames

**Interfaces:** optional transient `store.modals.menuEdit.initialSection: 'identity' | 'recipe'`; default identityถ้าcallerเดิมไม่ส่ง. เป็นmodal UI stateเท่านั้น ไม่ใส่databaseSnapshot/schema. ส่งintentผ่าน `@edit` ที่มีแล้วด้วยpayload `{ section:'recipe' }`

- [ ] Test recipeaction → popupเปิดพร้อมexactmenuIdและrecipeentry; editmenu→identity; ไม่มีrecipe row→focusปุ่มเพิ่มวัตถุดิบ; identityยังfocusชื่อเมื่อvalidateไม่ผ่าน
- [ ] Test accessible nameของdescriptionมีvisiblelabel “คำอธิบายสั้น”; ลบaria-labelที่ไม่จำเป็น ให้FormField labelเป็นเจ้าของ
- [ ] รัน `npm test -- tests/ui/menuWorkspace.test.js tests/ui/menuEditorInteraction.test.js tests/ui/interfaceNames.test.js` ให้FAIL
- [ ] ระบุrecipe targetด้วยstable data attribute; เปิดdetailsก่อนfocus; ให้initial-focusของDialogFrameเลือกtargetได้ทันทีเมื่อเปิด ลดการsetTimeoutที่แข่งกับModalShell
- [ ] `แก้ไขสูตร`ใช้flowเดิมทั้งsave, cancel, dirtyguard; ไม่สร้างrecipepopupอีกตัวและไม่ย้ายfieldจากpopup
- [ ] รันtestsPASS, ตรวจEscape/คืนfocusตรงtriggerกับ `tests/ui/dialogLayers.test.js`
- [ ] Commit: `fix: enter menu recipe editing at the requested section`

**Acceptance:** เปิดแก้ไขสูตรแล้วส่วนสูตรอยู่ในพื้นที่เห็นจริงเมื่อviewportอนุญาต และยังแก้ชื่อ/ราคาในpopupเดียวได้

### Task 4: Keyboard focus ที่มองเห็นโดยไม่มี outline — F01 / P0

**Files:** scope MenuView, MenuRecipeDetails/Panel, MenuEditModal; stylesสำหรับfieldwrapperเฉพาะsurface. ห้ามลบglobal focusrulesของหน้าอื่น

**Interfaces:** resting/hover/selected/focused/disabledเป็นคนละstate. `:focus-visible`ต้องไม่เขียนselectedIdหรือmode; fieldwrapperอาจใช้`:has(input:focus-visible)` หรือclassจากfocus-eventถ้าbrowserเป้าหมายต้องการ fallback

- [ ] เพิ่มbehavior regressionเฉพาะจุดที่เปลี่ยนmarkup/event: Tab/focusไม่selectmenu, ไม่switchgraph; checkbox/selectยังมีชื่อและkeyboardpath ไม่ทดสอบCSS literal
- [ ] ปุ่มทั่วไป/graphmodes: keyboardfocusใช้พื้นbrandกับข้อความcream และขีดใต้หรือmarkerภายใน; selectedgraphใช้เครื่องหมาย/น้ำหนักที่ยังแยกจากfocusได้เมื่ออยู่คนละปุ่ม
- [ ] menurowที่selectedอยู่แล้วต้องมีcueเพิ่มขณะfocus; rowที่ไม่selectedแต่focusก็ต้องชัด ไม่ใช้aria-pressedแทนfocus
- [ ] field: labelของfieldที่keyboardfocusมีพื้นbrand/ข้อความcream; inputยังsoftfill ไม่เพิ่มเส้นล้อมกรอบ; checkbox/switchให้labelแสดงfocusไม่เปลี่ยนchecked
- [ ] ปุ่มprimaryที่พื้นbrandอยู่แล้วใช้ขีดใต้ข้อความหรือmarkerภายใน ไม่ใช้bgbrandซ้ำเป็นcueที่มองไม่เห็น
- [ ] ทดสอบforced-colorsโดยsystemcolors+marker/underlineที่ไม่พึ่งshadow; disabledไม่มีfocusfeedbackหลอก
- [ ] browser walkthrough Tab/Shift+Tab/Enter/Space/Escape ใน list,3graphmodes,edit,recipe,form,checkbox,select,save/cancel; captureตัวอย่างfocused+selectedที่ต่างกัน
- [ ] วัดcontrastของcueและอ่านข้อความครบ; **ไม่มีoutline,ring,halo,focusshadow** ในnormal/forced-color modes
- [ ] Commitหลังvisualkeyboardchecksผ่าน: `fix: add non-outline keyboard focus feedback to menu management`

**Acceptance:** ทุกinteractive stopรู้ว่ากำลังโฟกัสอะไร โดยคงข้อห้ามoutlineของผู้ใช้. Source testPASSอย่างเดียวไม่เพียงพอสำหรับTaskนี้

### Task 5: สีข้อความบนพื้นsoftและhoverบนtouch — F03, F07 / P0 + P2

**Files:** scoped MenuView/MenuEditModal; existinghover rulesตามfilemap. Sharedtokenrootไม่เปลี่ยนโดยอัตโนมัติ

- [ ] เก็บcomputed fg/bgของneutralbadge,placeholder,disabled,selected,expandedในsurfaceจริง
- [ ] ใช้warm-mutedที่มีอยู่#705C50แทน#7D675Bเฉพาะบนsoftfillในmenuflow; reusevarที่มีอยู่เมื่อเข้าถึงได้; ถ้าจำเป็นกำหนดlocalrolevarครั้งเดียว ไม่ซ้ำliteralทุกleaf
- [ ] วัดด้วยสูตรsRGB: foregroundlinearizedluminanceตามWCAG, `(Llighter+.05)/(Ldarker+.05)`; เก็บค่าจริงไม่ปัด4.485ว่าPASS
- [ ] ข้อความเล็ก≥4.5:1,meaningfulnon-text≥3:1; disabledexemptionไม่ถูกใช้กับplaceholderหรือlabelที่ยังใช้งานได้
- [ ] ครอบเฉพาะ`:hover`ด้วย`@media(hover:hover)`ในButton/AppSelect/AppCheckbox/MenuPriceInfo; active/checked/expanded/focus-visibleยังทำงานบนtouch
- [ ] smoke menupricepopover,selectoption,switchรวมcallerอื่นถ้าแตะsharedCSS; ไม่เพิ่มscale/entranceanimationในงานความถี่สูง
- [ ] `npm test -- tests/ui/gpPricing.test.js tests/ui/appSelect.test.js tests/ui/appCheckbox.test.js tests/ui/priceForms.test.js` และrenderedtouch/keyboardchecks
- [ ] Commit: `fix: improve menu text contrast and pointer-specific feedback`

**Acceptance:** สีcomputedผ่านเกณฑ์จริง ไม่เปลี่ยนbrand; touchไม่อาศัยhoverในการแสดงสถานะ

### Task 6: ปรับสัดส่วนจากพื้นที่ใช้งานจริง — layout proposal / P1

**Files:** MenuView.vue, MenuRecipeDetails.vue, MenuPlatformOverview.vue. ไม่มีbehaviorchangeของสูตร/ราคา

**Interfaces:** menu-contentคงเป็นcontainerหลัก; เพิ่มnamed `menu-analysis` containerถ้าต้องใช้ควบคุมcardgrid. ลบviewport1500ruleและdeepcolumnoverrideที่ซ้ำ แทนด้วยเจ้าของgridเพียงที่เดียว

ค่าตั้งต้นสำหรับทดลอง — ต้องเทียบภาพbaselineก่อนยืนยัน ไม่ใช่ค่าที่วัดว่าดีแล้ว:

| Element | Proposed starting rule | Purpose |
| --- | --- | --- |
| Menu list | desktop208px, wide224pxเมื่อเหมาะ; list/detail gutter24px, narrow16px | ใช้spacingstepsเดิมและเหลือที่ให้ตัวเลข |
| Menu identity/actions | identityยืดได้; actiongroupwrapทั้งกลุ่ม, deleteไม่ติดeditจนแยกยาก | ชื่อไทยยาวไม่เบียดปุ่ม |
| Main analysis | min-width:0; padding24pxdesktop/16pxnarrow | แนวขอบ/ระยะอ่านสม่ำเสมอกับdashboard |
| Recipe rail | 288px; gutter24px; ใช้railเมื่อmenu-content≥840px | หลังหักpaddingยังเหลือanalysisinnerประมาณ480px |
| Platform columns | 1คอลัมน์โดยdefault; 2คอลัมน์เมื่อanalysisinner≥728px (2×352 +24) | อย่าใช้viewportwidthแทนพื้นที่ที่cardได้รับจริง |
| Narrow layout | list/detailสลับแบบเดิม<768px; recipeอยู่ใต้analysis | ไม่บังคับrailจนทุกส่วนแคบ |
| Internal rhythm | 8pxภายในกลุ่ม,16pxระหว่างmetricblocks,24pxระหว่างsections | คงscaleจากDESIGN.md |

- [ ] จัดbaseline screenshotsพร้อมdemoเดียวกัน:768,1024,1199,1200,1440,1500,1920px; ไม่เทียบภาพคนละเมนู
- [ ] ถ้าพบcardแน่นที่1500pxให้แก้ruleเจ้าของgridตามanalysiscontainer ไม่แก้fontทีละleafเพื่อฝืนสองคอลัมน์
- [ ] ตรวจขอบซ้าย title/chart/metricsและrailheader; ตารางmetricราคา/GP/กำไร alignตามbaseline และwrapเป็นกลุ่ม
- [ ] เลือกrecipebreakpointจากminanalysis480 +padding48 +gutter24 +rail288 =840px; ถ้าข้อมูลจริงต้องการมากกว่าให้ขยับthreshold ไม่ลดฟอนต์หลบ
- [ ] sidebar1199→1200ทำให้contentแคบลงได้ตามshellเดิม; ยืนยันว่าการstackใหม่อ่านได้ ไม่แก้sidebarเพื่อปิดอาการหน้าเดียว
- [ ] ทดสอบ1/2/6platformsที่มีราคา; 0pricedchannelsแสดงemptytext ไม่วางแผงว่างใหญ่หรือเพิ่มskeletonกลับมา
- [ ] `npm test -- tests/ui/menuWorkspace.test.js tests/ui/menuPlatformFinancials.test.js` เพื่อยืนยันbehaviorเดิม; การสมส่วนต้องใช้ภาพจริง ไม่เพิ่มtestที่assertgridstring
- [ ] Commitเมื่อภาพยืนยัน: `refactor: size menu analytics by available container width`

**Acceptance:** ที่1440pxมุ่งให้list+analysis+recipeใช้งานร่วมกัน; iPad768/1024ยอมstackrail; สองplatformcardsไม่เปิดเพียงเพราะviewportใหญ่; ไม่มีแนวนอนล้น320px

### Task 7: ลำดับตัวเลขและpopupบนจอแคบ — proposal / P2

**Files:** MenuPlatformOverview.vue, MenuRecipePanel.vue, catalogEditor.css; หลีกเลี่ยงเปลี่ยนcatalogRecipe.cssร่วมเมื่อทำscopedoverrideได้

- [ ] เทียบdashboardหลัก: คงtitle20px,selectedname18px,body14px,labels12–13px; ราคาหลัก/กำไรอาจ20pxdesktop/18pxphone, supportingamount16px, helperไม่น้อยกว่า12pxเมื่อวัดแล้วอ่านดี
- [ ] ทุกตัวเงิน/quantityใช้tabular-nums; formatไทยและthousandseparatorสม่ำเสมอ ไม่รวมกำไรข้ามplatformเป็นตัวเลขรวมที่ไม่มีความหมาย
- [ ] วิเคราะห์ว่าสัดส่วนpercent/รายรับหลังGP/คำอธิบายซ้ำส่วนไหนย่อได้โดยคงบัญชีครบ; ใช้คำอธิบายร่วมหนึ่งชุดและอย่าซ่อนloss/unavailablewarning
- [ ] ทดสอบpopup320/375/390/480/768pxด้วยชื่อplatform40ตัวอักษรและราคา123456.78; ถ้าสองpricefieldsที่375pxไม่พอให้เริ่ม1คอลัมน์เมื่อeditorinner<400px โดยใช้existingcontainerหรือscopedmediaqueryที่สอดคล้อง
- [ ] คงnativeinput16pxoverrideที่main.css:149 ไม่รายงาน/แก้ซ้ำว่าinputยัง14px; customselectเป็นbuttonต้องตรวจอ่านจริงแทนโยงกับiOSautozoom
- [ ] Save/Cancelเข้าถึงได้เมื่อkeyboardเปิด, เปิดpricepopoverแล้วไม่บังfieldสำคัญ, recipe/selectชื่อยาวมีทางอ่านfullvalueผ่านoptions
- [ ] 0recipe/20recipe/packagingoff/missingmaterial/includedgroupslongrulesไม่ทำให้พื้นที่อ่านเสีย; mobileเข้าถึงสูตรได้โดยไม่ต้องเปลี่ยนplatformfilter
- [ ] ไม่มีCSS-onlytests; ถ้าเปลี่ยนmarkupที่กระทบinteractionให้เขียนtestbehaviorก่อน แล้วรันmenuEditorInteraction,gpPricing,catalogReadFlows
- [ ] Commit: `style: clarify menu financial hierarchy and narrow editor spacing`

**Acceptance:** ข้อมูลสำคัญอ่านและเปรียบเทียบได้จากลำดับtype, ไม่ต้องเพิ่มสีใหม่หรือซ่อนค่าที่จำเป็น และไม่ต้องเพิ่มpopupชนิดใหม่

### Task 8: Acceptance matrix และส่งมอบ

**Files:** อัปเดตauditverificationและsurfacebrief; productioncodeไม่เพิ่มในverificationtaskนี้

- [ ] รัน `npm test` ทั้งชุด; baselineล่าสุด581tests ไม่ถือว่าเป็นจำนวนบังคับหลังเพิ่มregressiontests ต้องบันทึกจำนวนจริง
- [ ] รัน `npm run lint`, `npm run build`, `git diff --check` และบันทึกoutput/commitที่ตรวจ
- [ ] Browser: 320,375,390,768,1024,1199,1200,1440,1500,1920px; อย่างน้อย320/768/1440 captureก่อนหลังของข้อมูลชุดเดียวกัน
- [ ] Zoom200%, textresize, iPadสองแนว, iOSsoftkeyboard, Tabwalk, forced-colors, reduced-motion, screenreadername/role/state; ส่วนที่ทำไม่ได้ระบุNotverified
- [ ] State matrix: ไม่มีmenu; nosearchresults+clear; newmenuผ่านsearch; allpricesmissing; 1pricedchannel; 6pricedchannels; price0→positive→0แบบreactive; negativeprofit; invalidGP; unknowncost; truezerocost; missingmaterial; longnames; cancel/dirtydiscard/savefailure; reopenหลังcancel
- [ ] ตรวจว่าเพิ่ม/แก้ไขยังpopupเดิม, listselection/graphsไม่เปลี่ยนPOSplatform, unpricedหายจากกราฟและkeyครบ, ไม่มีoutlineกลับมา, ไม่มีข้อมูลจริงถูกเปลี่ยนระหว่างQA
- [ ] Reviewเฉพาะmaterialissuesที่ตรวจพบ ไม่เปิดpolishloopไม่จำกัด. อัปเดตเอกสารตามผลจริงและแยกsourcepassจากrenderedpass
- [ ] หลังผู้ใช้สั่งimplementและdeployตามscopeที่ตกลงเท่านั้น: commit/push,รอActionsสำเร็จ,ตรวจversion.jsonตรงSHAและentryassetHTTP200; ห้ามอ้างdeployสำเร็จจากgitpushอย่างเดียว

**Done:** F01/F02แก้และมีหลักฐาน; F03computedcontrastผ่าน; F04–F06behaviorผ่าน; layoutผ่านviewportmatrix; no-outlineconstraintครบ; documentationตรงversionที่ตรวจ

## กลยุทธ์แบ่งรอบงาน

1. **รอบA — ความหมายข้อมูลและการทำงาน:** Task1–5. ไม่เปลี่ยนlayoutใหญ่เพื่อให้ผู้ใช้แยกผลของbugfixได้
2. **รอบB — สัดส่วนและการอ่าน:** Task6–7 หลังมีbrowserbaseline. หากbrowserยังถูกปิด ให้Taskนี้pendingพร้อมเหตุผล ไม่ประกาศว่าสมส่วนแล้ว
3. **รอบC — ตรวจและส่งมอบ:** Task8. ไม่มีimplementationหรือdeployในรอบเขียนแผนนี้

การเปลี่ยนของแต่ละTaskย้อนด้วยcommitของตัวเองได้; ไม่มีmigrationหรือการล้างstorage. ถ้ามีข้อจำกัดที่บังคับให้เปลี่ยนsharedglobalrule ให้หยุดขยายscopeและแสดงผลกระทบให้ผู้ใช้ตัดสินก่อน

## Execution status — 20 October 2026

- Tasks 1–3 implemented and verified by behavior tests; the review found an overview/rail inconsistency for empty unit cost/zero quantity, then two regressions were observed failing and fixed without changing the domain estimator.
- Tasks 4–7 source candidates implemented, including non-outline keyboard feedback, local contrast, pointer guards, container layout and typography. Rendered baseline/viewport/keyboard/forced-colors/touch acceptance is still PENDING.
- Task 8 source checks: 96 files / 601 tests PASS; lint PASS; production build PASS; diff whitespace check PASS. Fresh source review produced one Important finding, fixed with RED→GREEN coverage. No source minors deferred.
- Browser remains unavailable to tools despite the user reporting it enabled, fresh CUA kernel reset and create-tab attempt. Exact error: Local browser use is disabled in Work settings. No screenshot or computed-value approval is claimed.
- Candidate branch: codex/menu-interface-layout in the attached managed worktree. Kept for continuation; not merged, pushed or deployed. Demo-only preview: http://192.168.1.107:5186/Greek_yokk/menu-interface-preview.html.

Release steering: on 20 October 2026 the user explicitly requested production deployment of all completed code plus clean Git. Earlier no-deploy/retained-preview statements describe preceding snapshots; visual acceptance remains unverified, while merge/deploy/cleanup are now authorized.
