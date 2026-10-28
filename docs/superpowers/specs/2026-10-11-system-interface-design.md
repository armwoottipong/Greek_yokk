# Yoggie — Whole-system interface design proposal

สถานะ: **ข้อเสนอออกแบบเพื่อ review ก่อน implementation** · 11 ต.ค. 2026

แทน `2026-10-10-mobile-pages-renovation-design.md`; ขอบเขตใหม่ครอบคลุมทุกหน้าหลัก popup และ shared components บน desktop/iPad/mobile

## Product truth และ design authority

อ่าน `PRODUCT.md` และ `docs/ui-audit/2026-10-11-system-interface-audit.md` ก่อนลงมือ ผู้ใช้ยืนยันว่า desktop/iPadใช้หน้าร้านเป็นหลัก มือถือจัดการจากนอกร้านอย่างรวดเร็ว identityจากmascotยังเป็นข้อผูกมัด **การรื้อแผนไม่ใช่การเปลี่ยนbrandหรือbusinessrules**

Mode: **Operate** ทุกหน้าธุรกิจ — primary successคือขาย/จัดการได้สะดวก อ่านยอดและสถานะเชื่อถือได้ ไม่ใช่โชว์งานกราฟิก มาสคอตอยู่shellและempty statesเล็กน้อย ข้อมูลและcontrolsใช้visual languageที่คุ้นเคย

## ข้อเสนอหลัก: สามระดับข้อมูลในระบบเดียว

1. **Desktop workspace:** ข้อมูลและคำสั่งที่ใช้คู่กันอยู่ใกล้กัน ตารางรายละเอียดและpanelข้างมีพื้นที่; ใช้mouse/keyboardได้ครบ
2. **iPad workspace:** ปุ่มและselectorsสัมผัสง่าย ปรับnavigationเป็นrail/drawerตามพื้นที่จริง ลดคอลัมน์รองแล้วเปิดรายละเอียด; POSให้งานขายเป็นfocaltask
3. **Mobile quick management:** สถานะ/ยอดที่จำเป็นและprimaryactionsอยู่ก่อน รายละเอียดลึกเปิดตามคำขอ ไม่ซ่อนฟังก์ชันจนใช้ไม่ได้

### โครงสร้างที่ต้องเลือกก่อนสร้างหน้ารอบใหม่

มีสามแนวทางภายในbrandเดิมให้review ไม่ใช่เลือกpaletteใหม่:

- **A. Workspace + contextual detail (แนะนำ):** desktop/tabletมีmaster listพร้อมdetails/cartข้างเมื่อพื้นที่พอ; มือถือsummarycardsและdetailsheet เหมาะกับการขายและจัดการที่ต้องเทียบข้อมูล
- **B. Task-first full-screen flow:** หน้าแรกเลือกงาน “ขาย/รับเข้า/ตรวจนับ/จัดการ” แล้วทำทีละขั้นเต็มพื้นที่ เหมาะกับพนักงานใหม่ แต่เพิ่มการเปลี่ยนหน้าสำหรับผู้ใช้คล่อง
- **C. Compact command workspace:** แต่ละหน้าตาราง/รายการcompact มีcommandbarและรายละเอียดexpandinline เหมาะกับข้อมูลเยอะบนdesktop แต่ต้องเพิ่มmobilecompositionแยกมากกว่าA

แผนงานใหม่ยึดAเป็น**ข้อเสนอ** ไม่ถือว่าuserเลือกcompositionเพียงเพราะยืนยันว่าใช้iPad ต้องconfirmbrief/conceptก่อนproductUIeditตามimpeccable shape/new-work

## Device contracts ที่เสนอ

| Device / width | Navigation | Information | Interaction |
|---|---|---|---|
| Desktop >=1200px | fullsidebar256px | tables/fullsummary + contextualpanel | keyboard/mouseพร้อมtouchfallback |
| Tablet 768–1199px | rail72px + drawerชื่อเต็ม | essentialcolumns/details; fullflows | touchtarget44px+, ไม่อาศัยhover |
| Phone <768px | hamburgerdrawerไม่มีพื้นหลัง | summaries/quickactions + detail | singleverticalscroll + adaptiveoverlay |

**ห้ามใช้breakpointviewportตัดสินgridPOSอย่างเดียว:** catalogcardขั้นต่ำ160px และcartpanelขั้นต่ำ320px; เปิดside-by-sideเมื่อcontainerรองรับcatalog≥360px + cart≥320px + gap16px =696px; ถ้าไม่พอใช้cartreviewdrawerและยอดย่อ โดยไม่mountcartซ้ำ

Tabletportraitต้องอ่านสินค้าชัดไม่เหลือ3คอลัมน์แคบเพราะsidebar256px มือถือไม่ต้องแสดงGP/COGSละเอียดทุกการ์ด แต่ยังดูได้จากรายละเอียด

## Visual system

### Tokens ที่คงและ tokens ที่จะทำให้เป็นระบบ

- สีคง: background #FBF5EA, surface #FFFCF6, subdued #F4EBDD, brand #780608, brand-hover #580406, mascot-header #5E0205, text #352522, muted #7D675B, divider #E8DCCB
- เพิ่มsemantic aliasesจากpaletteเดิม: primary/secondary/quiet/danger action, success/warning/error/info, focus, selected, disabled; ต้องมีtext/iconสำหรับstatusสำคัญ
- สีbrandแดงเข้มใช้primary/selection; dangerใช้distinct treatmentพร้อมlabelและconfirmation ไม่กล่าวหาว่าbrandแดงต้องเปลี่ยนเป็นสีอื่น
- Typography: Prompt/Plus Jakarta Sansเดิม; body14pxบนtouch, label12–14px, data13–16pxตามpriority, caption11–12px; ห้ามข้อมูลจำเป็น9px; typeใช้remเพื่อรองรับtextscaling
- Spacing: 4/8/12/16/24/32; alignmentตามcontent; controlsไม่สูงเท่ากันโดยไม่มีเหตุผลแต่ใช้variantsที่ชัด
- Radius: control10px, data/card16px, modal20–24px; silhouettesนุ่มอยู่shell/primarysummary ไม่ทำทุกcontrolกลมเท่ากัน
- Motion: action-responseเท่านั้น, enter180–220ms/leave120–160ms; reducedmotionมีstateชัดและปิดcanvasconfetti; confettiเฉพาะsale-successถ้าคงไว้

### Shared component contracts

| Component | หน้าที่ | Contract หลัก |
|---|---|---|
| Button / IconButton | actionhierarchy/hit-area/loading | labelชัด, disabledกับloadingตรงbusiness, icon-onlyมีaccessibleName |
| FormField | label/hint/error/required | labelเชื่อมidจริง, unit+errorผ่านdescribedby, ไม่ใช้placeholderแทนlabel |
| DialogFrame | desktopdialog/tabletsheet/mobileform | slotsheader/body/footer, ModalShellstack, dynamicviewport, scrolllock/restorefocus |
| PopoverActions | secondaryactions | triggername/expanded, keyboard, overlaycoordination, dangerousitemsแยก |
| AppSelect | เลือกค่าที่มีอยู่ | คงtypedvaluesและkeyboard; fulllabel/touchsize, virtualizationไม่เพิ่มถ้าไม่จำเป็น |
| AppCheckbox / ToggleSwitch | selection/toggles | nativeinput/label, hit-area, semanticstate, ไม่ใช้สีอย่างเดียว |
| Filter panel / DateRangeCalendar | draft/apply/cancel | dateเฉพาะflowที่มีtimefilter; วันและrangeอ่านได้, contrastผ่าน |
| Status / feedback | system/draft/loading/error | visiblemessage+announcement, errorsมีnextactionและไม่สูญdraft |
| Amount / quantity presentation | value/unit/context | ฿0ต่างจากmissing; unitไม่หาย; presentationใช้storeผลเดิม |
| PageHeader | หัวข้อ+คำสั่งของหน้า | titleหนึ่งแห่ง, countและcontextรอง, globaleffectactionsไม่อยู่ข้างprimaryขาย |

ไม่สร้างgenerictableformengineขนาดใหญ่ domaincards/lotlists/cart/recipeแยกไฟล์ตามหน้าที่และใช้งานร่วมเท่าที่behaviorตรงกัน

## Surface decisions — ทุกหน้า

### POS

- Desktop/iPad: channel+GPอ่านง่าย searchและcategoryไม่เบียดกัน; catalogจำนวนcolumnsตามพื้นที่จริง; cartมีชื่อ/qty/add-ons/note/payment/subtotal/checkoutใกล้กัน
- Portrait/phone: cartsummarybarเปิดreviewsheet; ปิดsheetไม่clearcart, pendingflowและreceiptแยกชัด
- Mobileprimaryviewเน้นสินค้าและยอดลูกค้าจ่าย; GP/net/COGSในdetails; ไม่ใช้netrevenueแทนpaymentamount
- CustomOrder: fullmenuname, touchselectaddons, selectedstateและtotalค้างมองเห็น; no-addon/no-material/shortageมีrecovery
- Checkoutguardต้องตรวจactualcallbackflowของstore ไม่ครอบPromiseแล้วคิดว่าจบถ้าshortageยังpending

### คลัง

- Desktop: searchabletableและdetailpanelสำหรับlots; summary/actionsให้scanง่าย ลดหัวข้อซ้ำ
- iPad: essentialcolumnsชื่อ/คงเหลือ/สถานะ/action; prices/pack/dateเปิดdetail; รับเข้า/ผลิต/ปรับยอด/ตรวจนับใช้touchได้
- Mobile: statuscards/quickactions มีsearch/filterและclearcontext; กรองrole/category/archivedไม่มีdatecalendar
- Draftbarระบุจำนวนและผลต่างยังไม่บันทึก; save/discard/reviewไม่เปลี่ยนเมื่อfilter/resize/navigation
- StockIn purchaseกับproductionเป็นsectionsคนละjobแต่modalpatternเดียว; unitconversionและcostpreviewมีlabelsชัด
- Stocktakeคงvariance/draftlogic, เพิ่มtouch/narrow/keyboardquality; LotDetailsมีactive/expired/receive-only/noneชัด
- Waste/Archive/PermanentDeleteใช้dialogsystemกลาง คงคำเตือนและข้อจำกัดจริง; เปิดอ่านไม่mutate

### เมนูและ Add-on

- Desktopยังดูข้อมูลหลายช่องทางได้; tabletเลือกdisplayplatformและdetail; phonecardราคาเดียวพร้อมรายละเอียด
- Displayplatformเป็นviewstateไม่เปลี่ยนPOScurrentPlatform; missingpriceไม่สับสนกับzero
- MenuRecipeใช้DialogFrame, closeมีชื่อ, materialmissingแสดงชัด, cost/price/marginไม่ใช้GPกำกวม
- Editorsข้อมูลชื่อ/category/prices/recipe/linkageอยู่sections; errorsผูกinputและเปิดsectionที่ผิด, hiddensectionไม่resetค่า
- Add-onแยกไม่ผูกmaterialกับmaterialmissing; amountUsedและunitsใช้ข้อมูลจริง ไม่fallbackผิด

### Dashboard

- คง4มุมมองและdate-range; desktopแสดงหลายpanelพอให้เทียบ, iPadจัดchart+summaryตามcontainer, phoneเน้นsales/profit/stateก่อนรายละเอียด
- Graphcontrolsใช้ได้ทั้งtouch/keyboard; clickedtooltip/highlight/toggle/outside/arrow/scrolllockที่ผู้ใช้ขอคงทั้งหมด
- ใช้labels/valuesและnativebuttonsemanticsกับinteractivelegend/list ไม่อาศัยhoverเพื่อรู้ค่า
- รายการบิลบนphoneเป็นsummarylistเปิดreceipt; desktoptableคงข้อมูลครบ; zero/no-sales/customrange/negativeprofitต้องตรวจ

### Settings

- คง4หมวดและการแยกbackup/resetที่ดีแล้ว ปรับlabels/categoryedit/touch/feedback ไม่รื้อlayoutเพียงเพื่อให้ต่าง
- ConnectionURLstatusต้องแยก “บันทึกURLแล้ว” กับ “ส่งข้อมูลสำเร็จ”; loading/errorมีrecoveryและlabelจริง
- JSONrestore/clear/demo/categorydeleteใช้confirmationpatternเดียว โดยไม่ลดvalidation/dirtyguard
- Connectionและadvanceddetailsยุบได้บนphone แต่backup/importเข้าถึงง่าย

## Popup inventory contract

ทั้ง14modalfiles + embeddedBOM/permanent-deleteต้องใช้patternเดียวสำหรับaccessibility/layer/scroll/title/close/feedback; representationตามtaskไม่บังคับทุกpopupเป็นbottomsheet

- Form: MenuEdit/AddonEdit/MaterialEdit/StockIn/StockAdjust/Waste — adaptiveformdialog + header/body/footer
- Task: CustomOrder/Stocktake — tabletworkspaceที่มีข้อมูล/summary/pinnedaction; phoneflowอ่านง่าย
- Read: ActivityHistory/Receipt/MenuRecipe — scrollcontent + close/actionชัด
- Decision: Confirm/LowStockWarning/LotDepletion/PermanentDelete — context/impact/cancel/confirm มีdefaultfocusปลอดภัย
- Pick: Emoji/Filter/AppSelect — constrainedpicker/popover เลือกง่ายตามขนาดจอ ไม่ซ้อนfocus trapแข่งกัน

## State matrix และ quality gates

ทุกsurfaceระบุ default/empty/noresults/loading/error/success/disabled/dirty/long-contentที่มีจริง; ถ้าไม่มีstateนั้นเขียนN/Aพร้อมเหตุผล ไม่สร้างloadingหลอก

Mandatory gates:

1. F01–F06HIGHจากauditต้องมีtests/evidenceปิดก่อนrelease
2. Accessible nameทุกinteractivecontrol; visiblekeyboardfocusและTab/Escape/returnfocusถูกflow
3. Textcontrast≥4.5:1สำหรับordinarybody/controltext; large3:1; non-textสำคัญ3:1; disabledexemptต้องระบุ
4. Touchtarget44pxเป็นqualitytargetสำหรับactions; calendarที่320pxใช้≥40×44pxพร้อมspacingและไม่มีhorizontalgridscroll (explicitexceptionจากfull44widthทุกcell)
5. Device320/390/768/834/1024/1194/1280px + portrait/landscape + 200%zoomจริงเมื่อtoolรองรับ; ถ้าไม่รองรับต้องnotverified
6. PhysicaliPad/Safari, mobilekeyboard/safeareas, VoiceOver/NVDAเป็นmanualgatesที่ยังไม่ผ่านจากauditemulation
7. No pagehorizontaloverflowบนphone; tabledesktopoverflowในcontainerได้เมื่อมีcue; CTAไม่ถูกkeyboard/bar/footerบัง
8. No duplicatecheckout, nostockdraftloss, nopriceplatformmutation, schema/storage/syncunchanged
9. npmtest/lint/buildผ่าน; detectครั้งเดียวหลังUIรอบใหม่เสร็จและแยกfalsepositives
10. Impeccable bounded QA: initialdesktop+iPad+mobilebatch, fixconfirmedissuesหนึ่งbatch, confirmationbatch; materialissuesยังค้างต้องรายงาน ไม่วนmicro-polishเอง

## ขั้นตอนอนุมัติและการบันทึกdesignsystem

รอบนี้ยังเป็นaudit/designproposal เมื่อผู้ใช้เลือกcompositionและconfirmbriefแล้ว จึงเขียนdirectioncontract/surfacebriefsพร้อมDESIGN.mdและ`.impeccable/design.json`ตามimpeccabledocumentworkflowก่อนimplementation สถานะใดที่ยังไม่ตรวจจริงต้องไม่ใช้คำว่าApprovedหรือเสร็จครบ
