# Whole-System Interface Renovation — Replacement Plan

> **For agentic workers:** Read the audit and design proposal first. After the user confirms the new design direction, use superpowers:executing-plans for native implementation, or superpowers:subagent-driven-development only when selected. Track steps with checkboxes.

**Goal:** รีโนเวททุกหน้าหลัก popup และcomponentsของGreekYogg.ด้วยdesignsystemที่สอดคล้อง เหมาะกับคอมพิวเตอร์/iPadหน้าร้าน และมือถือจัดการนอกร้าน

**Architecture:** ชั้นcomponentsร่วมสำหรับcontrols/forms/overlay/feedback; domaincomponentsสำหรับPOS/Stock/Menu/Addon/Dashboard/Settings; viewsประสานstoreactionsเดิม ไม่เปลี่ยนbusinessmodelหรือtransactionalgorithms

**Tech Stack:** Vue3/Pinia/Tailwind/scopedCSS/lucide/Vite/Vitestเดิม ไม่มีการเลือกUIlibraryใหม่

**Spec:** `docs/superpowers/specs/2026-10-11-system-interface-design.md`

**Audit:** `docs/ui-audit/2026-10-11-system-interface-audit.md` — F01–F13 และcoverage/notverifiedเป็นsourceoftruth

**Status:** **Draft replacement plan — auditเสร็จตามscopeที่ระบุ; ยังไม่เริ่มproductimplementation และcompositionAยังเป็นข้อเสนอ**

**Supersedes:** `2026-10-10-mobile-pages-renovation.md`; ห้ามนำTask1–18เดิมมาต่อโดยถือว่าapprovedscopeเดิมยังใช้อยู่

## ทำไมลำดับเปลี่ยน

แผนเดิมเริ่มคลังแล้วทำ4หน้าบนมือถือ ผู้ใช้ยืนยันใหม่ว่าdesktop/iPadคือเครื่องหลัก จึงเริ่มแก้systemicdefectsและdevicecontractsก่อน จากนั้นให้POSหน้าร้านมาก่อนcatalogmanagement ส่วนDashboard/Settingsและpopupทั้งหมดรวมในรอบนี้ด้วย

## Global constraints

- คงmascotและpalettecream/burgundy; typographyPrompt/PlusJakartaเดิมเป็นฐาน ไม่เปลี่ยนเพราะdetectorบอกว่าoverused
- Navigationfullsidebar>=1200, tablet rail/drawer768–1199, phonehamburger<768 **เป็นข้อเสนอที่รอconfirm**
- POSsplitตามcontainer≥696px ไม่ใช้sm:grid-cols-3แบบviewportอย่างเดียว
- Businessstore/schema/localStorage/GASpayload/GP/COGS/stockallocation/checkoutsemanticsคงเดิม
- Touchactions44px+, calendar320pxexception40×44px; body14pxบนtouchและcaption≥11pxที่เป็นข้อมูลจำเป็น
- Formต้องnamedจริง, dialogstack/scroll/focusเป็นหนึ่งระบบ, motionเคารพreducedmotionทั้งCSSและcanvas
- Testfixturesเป็นisolateddemo/teststore ไม่มีจริงcheckout/GASwritesเพื่อUIQA
- เก็บuserchangesในskills-lock.json/.agents/skills/Untitled-2.aiไม่แก้และไม่stageรวม
- ทุกtaskมีbehaviorcheckและbrowserevidenceตามความเสี่ยง ไม่สร้างsnapshottestsที่สะท้อนimplementationเฉยๆ

## Execution gates

- **G0:** ผู้ใช้confirmdesignproposal/composition; ก่อนนั้นทำaudit/documentsได้ ไม่แก้productUI
- **G1:** Foundations Tasks1–7ผ่าน และHIGHF01–F06มีเจ้าของ/testsชัด
- **G2:** POSTasks8–11ผ่านบนdesktop/iPadพร้อมcheckoutregressions
- **G3:** StockTasks12–16ผ่านพร้อมdraft/lots/recovery
- **G4:** ManagementTasks17–20ผ่านและdisplayplatformไม่mutatePOS
- **G5:** Dashboard/SettingsTasks21–23ผ่านและทุก36surfaceมีreviewrecord
- **G6:** Task24ตรวจรวม/independentreview/checks/deploysuccess; ไม่ส่งมอบว่าเสร็จถ้าHIGHยังค้าง

## Review focus

1. Legacyoverlaysและnestedportedcontrols: keyboard/focus/scroll/z-layerต้องทำงานด้วยกัน
2. Tabletcontainerwidth/rotation: no duplicatecart, filters/draft/inputsไม่หาย
3. Businesscopyและnumericaltruth: zero/missing/GP/margin/stockdraft/backorderไม่สับสน
4. Keyboard/safeareas/longcontent: primaryactionและerrorsไม่ถูกซ่อน
5. Actualdeviceevidence: emulationไม่ใช่physicaliPad/Safari/VoiceOver/200%zoom; marknotverifiedตรงไปตรงมา

## Task map — 24 work packages

| ช่วง | Tasks | ผลส่งมอบ |
|---|---|---|
| Design system / foundations | 1–7 | context/contracts,fields,buttons,dialogs,feedback,pickers,shell |
| POSหน้าร้าน | 8–11 | adaptivecatalog/cart/customization/checkoutreceipt |
| Stockoperations | 12–16 | workspace/details/forms/stocktake/drafts/destructiveflows |
| Menu / Add-on management | 17–20 | sharedfilters/cards/recipe/editors |
| Dashboard | 21–22 | adaptiveviews/dataandgraphaccess |
| Settings | 23 | accessibleforms/backup/connection/categoryflows |
| Whole-systemQA / deploy | 24 | reviewevidence/release |

แต่ละtaskด้านล่างเป็นdeliverableหนึ่งชุด แยกcommitได้ ห้ามถือว่าการเปิดหน้าได้เท่ากับflowผ่าน

---

## Foundations

### Task1 — ยืนยันdirectionและบันทึกcontractของทุกsurface

**Files:** PRODUCT.md; createDESIGN.md, `.impeccable/design.json`, surfacebriefsตามimpeccabledocument/new-workformat; audit/verificationdocs

**Input:** confirmeddevicejobsจากPRODUCT; auditF01–F13; selectedcompositionจากuser

**Output:** tokenbearingdesignrecord + surfacecontractsสำหรับ6routes/overlayfamilies ไม่ใช่prosepaletteเฉยๆ

- [ ] รับcompositionconfirmationผ่านstructuredquestion/decisionpageตามimpeccableshape/new-work; ไม่ถามbrandที่settledซ้ำ
- [ ] ระบุแต่ละsurfacejob, primaryaction, informationlevels, state/ranges และ anti-goals
- [ ] บันทึกแนวทางresponsive/selection/focus/danger/motionและcomponentownership
- [ ] Reviewcoverage36units; นำmissingbetter-*ไปcoveragegap ไม่อ้างholisticapproval
- [ ] เปิดdesignbriefและแสดงwireframeที่userตรวจได้; gateG0ผ่านก่อนproductedit

### Task2 — FormFieldและaccessible-namecoverage (F01/F02)

**Files:** create`src/components/ui/FormField.vue`; modifyformcomponentsและsearchfieldsในviews; create`tests/ui/formField.test.js`, `tests/ui/interfaceNames.test.js`

**Interface:** props`{id,label,required,hint,error}`; slot`{controlId,describedBy,invalid}`; ownerinputรับid/aria-describedby/aria-invalid; icon-onlynameผ่านexplicitlabel

- [ ] Testlabel↔id, hint/errorassociation, requiredannouncement; fixturesราคาหลายplatformและqtyหลายrecipeต้องมีชื่อไม่ซ้ำ
- [ ] Runfailingtestsก่อนimplement; confirmfailureมาจากmissinginterface ไม่ใช่fixtureผิด
- [ ] ย้ายfieldlabelpatternsทีละfamily; เพิ่มBOMclose “ปิดรายละเอียดสูตร”; Materialrecipe-removeใช้ “ลบวัตถุดิบจากสูตร”
- [ ] Run`npx vitest run tests/ui/formField.test.js tests/ui/interfaceNames.test.js tests/ui/priceForms.test.js tests/ui/stockForms.test.js`
- [ ] BrowserAXตรวจไม่เหลือanonymousprice/qtycontrolsในopenedforms; preservepayload/validation; commit

### Task3 — Button/IconButton/Status/typeและsemantictokens (F09/F12)

**Files:** create`Button.vue`,`IconButton.vue`,`StatusBadge.vue`ในui; modifymain.css/tailwind.config.jsและที่ใช้controls; tests`interfaceControls.test.js`

**Interface:** Button`{variant:'primary'|'secondary'|'quiet'|'danger',size:'compact'|'touch',loading,disabled}`; IconButtonต้อง`label`; StatusBadgeต้องtext ไม่ใช้สีอย่างเดียว

- [ ] Testdisabled/loadingไม่emitclick, namedicon, semanticstateยังเข้าใจเมื่อไม่มีสี
- [ ] ใช้aliasesจากexistingpalette; mapdimensions/hit-areaที่confirm ไม่globalreplaceทุกbutton
- [ ] Replacecontrolsในpriorityflowsก่อน; fontsdata/body/captionจากscale; remove!importantเฉพาะwhenreplacementtested
- [ ] ตรวจtouchbounds/keyboardfocus/contrastpairsบนnormal/selected/error ไม่ตีความdisabledเป็นcontrastfail
- [ ] Run`npx vitest run tests/ui/interfaceControls.test.js tests/ui/appCheckbox.test.js`; commit

### Task4 — DialogFrame/layer/focus/scrollร่วม (F03)

**Files:** modify`ModalShell.vue`; create`DialogFrame.vue`,`useOverlayScrollLock.js`; migrateembeddedBOM/delete; tests`dialogLayers.test.js`,existingdialogs

**Interface:** DialogFrame`{open,id,title,presentation:'dialog'|'sheet'|'panel',busy}`; emits`request-close`; slotsheader/body/footer; ModalShellยังเป็นfocus/inertstackเจ้าของเดียว

- [ ] Testtoplayeronly, Tab/Escape/restorefocus, openerdeletedfallback, scrollbodyได้backgroundไม่ได้, nestedlocksreleaseถูกลำดับ
- [ ] Implementlease-countscrolllockและownerlayerregistry; AppSelectportedlistต้องอยู่effectiveownerlayerเหนือdialog ไม่ใช้9999/10000แข่ง
- [ ] Responsiveheight100dvh/visualViewportเมื่อจำเป็น; header/footerไม่ตัด; preservecontent/lockระหว่างleave
- [ ] MigratelegacyoverlaysและDialogFramefamilyก่อนปรับหน้าตาแต่ละpopup; คงconfirmcallbacks/dirtyguard
- [ ] Run`npx vitest run tests/ui/dialogs.test.js tests/ui/dialogLayers.test.js tests/ui/chartTooltip.test.js`; verifyDOMbackgroundisolated; commit

### Task5 — Feedback/motion/recoveryและreceiptconfetti (F05/F10)

**Files:** ToastContainer.vue,ReceiptModal.vue,feedbackstyles; tests`feedbackAccessibility.test.js`,`receiptMotion.test.js`

- [ ] MockmatchMediareduce=true → confetticalls0หรือdisableForReducedMotion=true; false → optionalsalessuccessหนึ่งครั้ง ไม่historyreopen
- [ ] Addstatus/alertliveannouncements, mobiletoastwidthmargin16, recoverytextสำหรับerrors; nofocussteal
- [ ] Sourceerrorcopyต้องมีactionตามจริง ไม่แต่งstatus“เชื่อมต่อสำเร็จ”จากการsaveURL
- [ ] Run`npx vitest run tests/ui/feedbackAccessibility.test.js tests/ui/receiptMotion.test.js tests/ui/shortageReceipt.test.js`
- [ ] Confirmreducedmotionactualemulationถ้าtoolรองรับ; otherwiseexplicitmanualgate; commit

### Task6 — Select/checkbox/filter/calendar/emojiquality (F06/F09/F13)

**Files:** AppSelect.vue,AppCheckbox.vue,ToggleSwitch.vue,FilterDropdown.vue,DateRangeCalendar.vue,EmojiPickerPopover.vue; testsเพิ่มในexistingcontroltests

- [ ] Testcalendarordinarytextcontrastusingactualtokenvalues; Sunday≥4.5; dates/selectedrangehasnames
- [ ] Responsiveemoji5–6columnsและsearchname; fulllabeloftruncatedoptionsviewable; nohorizontalgridscroll
- [ ] Preservetypedselectvalues, keyboard/typeahead/disabled/draftfilterapply/cancel; datepickerไม่เพิ่มในcurrent-stockfilters
- [ ] Verifytouchtargetexceptionsชัด; nestedpickerไม่ปลดbackgroundlock/แย่งfocusจนinputใช้ไม่ได้
- [ ] Run`npx vitest run tests/ui/appSelect.test.js tests/ui/appCheckbox.test.js tests/ui/filterDropdown.test.js tests/ui/historyLayout.test.js`; browser320+iPad; commit

### Task7 — App shell/header/sidebarสามdeviceclasses (F04/F07)

**Files:** App.vue,HeaderBar.vue,Sidebar.vue; create`useMediaQuery.js`ถ้ายังไม่มี; tests`adaptiveShell.test.js`, existingmobileNavigation/headerSizing

- [ ] Testfull/rail/drawerbreakpointsที่confirmed, focusreturn, drawerกับmoremenuไม่เปิดพร้อมกัน, routechangecloseแต่businessstateไม่reset
- [ ] คงhamburgerไม่มีพื้นหลังและiconanimation; fullmascotasset90%right-bottom/#5E0205ตามผู้ใช้เดิม
- [ ] Titleหนึ่งแห่ง/count/contextชัด; globallydestructiveactionsไปsettingsหรือmoremenu พร้อมconfirmationเดิม
- [ ] ตรวจ768/834/1024/1194/1280/320และrotation; URL/deeplink/KeepAliveทำงานเหมือนเดิม
- [ ] Run`npx vitest run tests/ui/adaptiveShell.test.js tests/ui/mobileNavigation.test.js tests/ui/headerSizing.test.js`; commit; G1review

## POS — เครื่องหลักหน้าร้านก่อนมือถือ

### Task8 — Adaptive product catalog

**Files:** PosView.vue; create`components/pos/PosCatalog.vue`,`PosMenuCard.vue`; tests`adaptivePosCatalog.test.js`

**Interface:** card`{menu,price,outOfStock}`emits`select(menuId)`; catalogsourcefilteredMenus/handlerเดิม

- [ ] Testplatformchange/prices/inactive/empty/search/category; soldoutยังselectableตามbusinessrule
- [ ] Gridใช้containerwidth/cardminimum160px; channel/searchแยกcontext; iPadtouchcatalogอ่านชื่อได้
- [ ] Phoneprimaryfieldsและsinglepagescroll; ไม่มีnestedfixedheightที่บีบcatalogเมื่อตะกร้าโต
- [ ] PricefallbackในPOSยังเดิม; ไม่ใช้adminmissingpriceformatterมาเปลี่ยนrules
- [ ] Runadaptivecatalog+checkouttests; browseriPadportrait/landscapeและphone; commit

### Task9 — CartPanel/cartreviewdrawer

**Files:** createCartPanel.vue,CartReviewBar.vue; modifyPosView.vue; tests`adaptiveCart.test.js`

**Interface:** Panelbindstore.cart/note/payment/summaryหนึ่งแห่ง; emitscheckout/switchlot; reviewbar`{quantity,subtotal}`emitsopen

- [ ] Testqty/addons/note/payment/remove/close/resizepersist; oneCartPanelmounted; qty2+3แสดง5ไม่ใช่2rows
- [ ] Splitcartเมื่อcontainer≥696pxที่confirmed; ต่ำกว่านั้นdrawerกับsummarybar; desktop/iPadคงdetailworkflow
- [ ] Subtotalเป็นยอดลูกค้าจ่าย; GP/net/COGSรายละเอียดรองมีชื่อถูก; noautoclearontoggle
- [ ] Reservebarspace/safeareasและscrollbody/footer; overlaystacktask4
- [ ] Runadaptivecart+posregressions; commit

### Task10 — CustomOrder และshortage/lotdecisionflow

**Files:** CustomOrderModal.vue,LowStockWarningModal.vue,LotDepletionModal.vue,PosView.vue; tests`posOverlayFlow.test.js`

- [ ] Testsameemojiaddonnames, checkboxstate, qtyname/units, shortagecancelคืนcustomordervalues, multiplelotsnext/cancel
- [ ] Touchselectaddonsและpinnedtotal/action; longwarnings/fulldataมีdisclosureที่มีcue
- [ ] Decisiondialogsใช้cancel-safeinitialfocusและcontext/impact; จำนวนที่ต้องใช้/มี/ขาดอ่านชัด
- [ ] เตรียมmulti-lotfixtureผ่านteststoreเพื่อruntimebranchที่auditยังไม่ได้ตรวจ; ห้ามderivebusinessdataจากvisualstate
- [ ] RunposOverlayFlow/dialogs/addons/inventorytests; commit

### Task11 — Checkout/receipt/printส่งมอบflow

**Files:** PosView.vue,CartPanel.vue,ReceiptModal.vue; tests`checkoutInteraction.test.js`,existingcheckout/shortageReceipt

- [ ] Testdoubletap/shortageconfirmationretry/ordercount1, cancelretaincart, errorretaininputs; callbacksเดิมretryallowShortageไม่ถูกlockทิ้ง
- [ ] ตรวจreceiptopenafteractualsuccessและclosecartonlywhencompleted; nofalse“สำเร็จ”หลังstore returnnullรอconfirm
- [ ] Receiptread/print80mmแยกvisualstyles; reducedmotionจากtask5; historyviewไม่เล่นconfetti
- [ ] Manualcheckoutเฉพาะisolateddemo; comparestockallocation/order totals/receiptและhistory
- [ ] RunPOS/inventorysuite; screenshotdevicebatch; commit; G2

## Stock — ทุกflowของคลัง

### Task12 — Stock workspace/toolbar/summary/filters (F04/F08)

**Files:** StockView.vue; createStockToolbar.vue,StockSummary.vue; tests`adaptiveStockWorkspace.test.js`

- [ ] Testsearch/role/category/archiveapply/cancel/reset; actionsเปิดmodalเดิมถูกID; zero/emptyมีrecovery
- [ ] Desktoptoolbar/tablefull; tabletiPadessentialcolumns; phoneรับเข้า/ตรวจนับ+moremenuไม่ล้น
- [ ] Summarycopyตามbackorderruleจริง; titleไม่ซ้ำสองหัวใหญ่; labelsอ่านง่ายไม่แตกแนวตั้ง
- [ ] Filterไม่มีcalendar; filterdraftแยกactive; countsตรงstoreไม่รวมarchiveโดยเผลอ
- [ ] Runworkspace+stockForms; browser320pageoverflow0; commit

### Task13 — Material/lot contextual detail

**Files:** StockView.vue; createStockMaterialCard.vue,MaterialDetails.vue,StockLotList.vue; tests`stockDetailPresentation.test.js`

- [ ] Testqtyzero/decimal/units/packcost, active/expired/receive-only/none, lotIDsถูก, archivedactions
- [ ] Viewmodelใช้existinghelpers/getMaterialLots/getExpiryStatus/getDraftDiffไม่เขียนstock/costformulaใหม่
- [ ] Desktop/tabletเปิดdetailpanelเมื่อพื้นที่พอ; mobiledetailsheet/card; openingdetailไม่switchlot
- [ ] Receiving/produce/actionlabelมีIDcontext; missing/deleteditemfallbackfocusไม่หลุด
- [ ] Runinventory/stockDetails; commit

### Task14 — รับเข้า/ผลิต/ปรับยอด/ของเสียforms

**Files:** StockInModal.vue,StockAdjustModal.vue,WasteModal.vue,MaterialEditModal.vue; tests`stockFormInteraction.test.js`

- [ ] Testbase/packconversion, costpreview, receive/expiry, productionrecipe, lotselection, wastedqtyimpact, dirtycancel/validation
- [ ] DialogFrame/FormFieldจัดsectionsตามjob; เปลี่ยนunit/roleไม่resetdataนอกกฎเดิม; noanonymousinputs
- [ ] Errorโยงcontrolและnextaction; productioningredientsmissingไม่ให้saveผ่านเพราะUIhidefield
- [ ] Physicalkeyboard/safeareaและlongrecipeเป็นmanualgate; viewportifunsupportedต้องmarknotverified
- [ ] RunstockForms/materialEditing/requirements; commit

### Task15 — Stocktake และdraftreview

**Files:** StocktakeModal.vue,StockView.vue; createStockDraftReview.vue; tests`stocktakeDraftInteraction.test.js`

- [ ] Testcountbase/pack/onlydifferences/reset/variance/stagedraft; reviewcloseไม่commit/discard; filter/resize/navigationdraftคง
- [ ] คงStocktakeinputnamesและsummaryที่ดี; tabletใช้worksheetที่touchสะดวก; phonecompactrowsไม่table1120px
- [ ] Draftbar/statusบอก“ยังไม่บันทึก”, detailbefore/afterunits; commit/discardปุ่มไม่ถูกfooterอื่นบัง
- [ ] Testpersistence/recoveryและnoautocommit; compareledgeraftercommitกับbaseline
- [ ] Rundrafts/recoveryEdges/stocktakeLayout; commit

### Task16 — History/archive/permanentdeleteและdangerpatterns

**Files:** StockView.vue,ActivityLogModal.vue,HistoryLogEntry.vue,ConfirmModal.vue; tests`inventoryDangerFlows.test.js`

- [ ] Testarchive/restore/deleteusagewarning/cancel, correctmaterialID, callbackonce, historyclear/exportfilters
- [ ] Migratepermanentdeleteให้dialogfocusinert/escapeถูก; keeparchivealternativeและbusinesslimitations
- [ ] Dangerlabel/impactชัด, nohiddenactionbehindscrollwithoutcue; nativedetailsสำหรับhistoryยังกดด้วยkeyboardได้
- [ ] ไม่มีactualdeleteร้านจริงในการQA; demosหรือteststoreเท่านั้น
- [ ] RuninventoryDanger/dialogs/historyLayout; commit; G3

## Menu/Add-on management

### Task17 — Shared catalog filters/pricecontexts (F08/F11)

**Files:** MenuView.vue,AddonView.vue; createCatalogToolbar.vue,PlatformPriceSummary.vue; tests`catalogPriceContext.test.js`

**Interface:** displayPlatformIdเป็นlocalviewstate; toolbaremitsapplyfilters/search/add; pricepresentationzero/missing/unknownplatformต่างกัน

- [ ] Testdisplayplatformไม่เรียกsetPlatform, price0, missingprices, platformremovedfallback, unknowncategories
- [ ] Desktopmultichannel/tabledetails; tabletessentialcolumnsและpricecontext; phonecardราคาเดียว+รายละเอียดทั้งหมด
- [ ] Searchplaceholderตรงfiltername/descriptionเดิม ไม่แอบเพิ่มBOMsearchในการUIrefactor
- [ ] Apply/cancel/resetdraftfiltersและempty/noresultCTA; sharepartsไม่รวมstoreactionsในgenericcomponent
- [ ] RuncatalogPrice/priceForms; commit

### Task18 — Menu/Addon listsและBOMreadflow

**Files:** MenuView.vue,AddonView.vue; createMenuCard.vue,AddonCard.vue,MenuRecipeDetails.vue; tests`catalogReadFlows.test.js`

- [ ] Testrecipe/edit/deleteemitexactID, missingmaterial/brokenlink/zeroamount, close/editrecipehandoff, no mutationonview
- [ ] ReplacelegacyBOMdialog, accessibleclose/title, cost/storeprice/margincopyที่ไม่ใช้GPกำกวม
- [ ] Mobilecards/tabletrowsอ่านชื่อและactionsได้; allplatformdetails/longnameมีexplicitdisclosure
- [ ] Formulaผลเดิมและzeroqtyไม่Inf; deletedselecteditemขณะpopupเปิดมีrecovery
- [ ] RuncatalogRead/priceForms/addons; commit

### Task19 — Menu editor

**Files:** MenuEditModal.vue; optionaldomainfieldgroupsใต้components/menu; tests`menuEditorInteraction.test.js`

- [ ] Testcollapsedsectionskeepdraft, namedprices/qty, erroropenrelevantsection, dirtypromptcancel, savepayloadunchanged
- [ ] Sectionsname/category/prices/recipe/package/permissions; tabletformใช้พื้นที่ได้phoneonecolumn; footerCTAเข้าถึงเมื่อkeyboardเปิด
- [ ] Recipe30rows/longnamesต้องเลื่อนในbodyไม่ทั้งdialog; rowremoveชื่อcontextถูก
- [ ] ใช้sharedFormField/AppSelect/AppCheckbox/DialogFrame ไม่สร้างcheckboxthemeใหม่
- [ ] RunmenuEditor/priceForms/requirements; commit

### Task20 — Add-on editor/linkage

**Files:** AddonEditModal.vue; tests`addonEditorInteraction.test.js`

- [ ] Testprices0/missing, amountUsed0/decimal, materialchangeunit, unlinked/missingreference, dirtycancel/savepayload
- [ ] Layoutheader/body/footerและnamedfields; priceplatformnameเต็มอ่านได้บนphoneและtablet
- [ ] Linkagegroupบอกตัดต่อครั้งพร้อมunit; validation/recoveryตรงstore ไม่สร้างmatอัตโนมัติ
- [ ] Phonekeyboardlastprice/qtyแล้วsaveได้; noamountfallback1โดยเผลอ
- [ ] RunaddonEditor/priceForms/addons; commit; G4

## Dashboard / Settings

### Task21 — Dashboard adaptive informationhierarchy

**Files:** DashboardView.vue,dashboard.css; tests`dashboardDevicePresentation.test.js`

- [ ] Test4views/datepresets/customrange/zeroorders/negativeprofit; samefinancialsnapshotsacrossdevices
- [ ] Desktopcomparativepanels, tabletchartsตามcontainer, phonekeynumbersfirst; receiptlistcompactแทนwidebilltableบนphone
- [ ] Advanceddataเข้าถึงผ่านdetailsไม่ถูกลบทิ้ง; captions/GP/marginclear; don'tinventforecastหรือnewreport
- [ ] PreserveBangkokbusinessdate/recordedcostscope; missinginputerrorใช้existinghelpers
- [ ] Rundashboard/reportssuites; commit

### Task22 — Charts/tooltip/dataaccess

**Files:** DashboardTrend.vue,DashboardBreakdown.vue,ChartTooltip.vue,useChartTooltip.js; testsexistingchartTooltip/dashboardHoverเพิ่มsemanticscases

- [ ] Testindividual/groupclickonlymarkedarea, toggle/outside/Escape, pinnedhighlight/singledimming, arrowbounded, scrolllockrestore
- [ ] Interactivelegend/rankingnativebuttonsemantics; chartfallbacktable/labelsสำหรับnonvisualaccess
- [ ] Touchlargeenoughโดยไม่ทำblankplotคลิกได้; graphvisualdataheight/valuesไม่เปลี่ยนเพราะanimation
- [ ] Reducedmotion/nohoverpathและlossvalues/mobilelongrangesต้องทดสอบ
- [ ] RunchartTooltip/dashboardHover/dashboardTrend; commit

### Task23 — Settings/backup/connection/categoryquality

**Files:** SettingsView.vue,settings.css; tests`settingsFormAccessibility.test.js`,existingsettingsNavigation

- [ ] คง4หมวดlayoutที่ดี; namedcategoryeditfields; labelofedit/deletebuttonsมีcontext
- [ ] Nativealert/confirmย้ายsharedconfirmationเฉพาะflowที่ได้behaviorparity; JSONimportvalidation/cancel/datareplacementเดิม
- [ ] URLsaved≠syncsuccess; idle/loading/error/retryมีstatusและnextactionจริง; ไม่syncร้านจริงเพื่อทดสอบUI
- [ ] Mobilebackup/importpriorities, advancedconnectiondetailsเข้าถึงได้; tabletsการ์ดไม่ถูกrailบีบ
- [ ] RunsettingsNavigation/data/replaceDatabase/GASmocktests; commit; G5

## Task24 — Whole-systemfinishreview/QA/integration/deploy

**Files:** verificationreport/dateใหม่; fixproductfilesเฉพาะconfirmedfindings; noextraUIfeature

- [ ] Updateinventory36units: source/runtime/states/deviceevidence; ไม่มีblind“allclear”ที่unverified
- [ ] `npm test`, `npm run lint`, `npm run build`, `git diff --check` ผ่านบนfinalrevision
- [ ] Runimpeccabledetect**ครั้งเดียวหลังUIเสร็จ**; verifyfindingsincontextและไม่เปลี่ยนbrand/fontเพราะheuristicwarning
- [ ] Capturedesktop+iPadportrait/landscape+phone320/390ในbatchเดียว; initialstate/empty/error/dirty/loadingตามstateที่มีจริง; validcapturesไม่transitionframes
- [ ] ส่งfreshfinishreviewตามimpeccablereferenceพร้อมscope/files/PRODUCT/direction/screenshots/knownnotverified; อย่าให้reviewerรับframingจากtranscriptเต็ม
- [ ] Fixconfirmedmaterialfindingsหนึ่งbatch, rebuildและconfirmationcaptureหนึ่งbatch; ถ้ายังมีHIGH/qualitygateopenรายงานและอย่าประกาศApproved
- [ ] PhysicaliPad/Safari/keyboard/zoommanualgatesถ้าทำไม่ได้ระบุNotverifiedพร้อมstepsสำหรับuser ไม่ทำคะแนนเหมือนผ่าน
- [ ] เขียนDESIGN.md+`.impeccable/design.json`ตามdocumentworkflowให้ตรงสิ่งที่สร้างจริง ไม่ซ่อมconfigurationdriftนอกscope
- [ ] Integrationเข้mainตามauthorizationเดิม; stageเฉพาะtaskfiles; noforcepush/noeraseuserchanges; testอีกถ้าintegrationเปลี่ยนproductcode
- [ ] PushและตรวจBuild/PagesdeploymentของSHAนี้จนsuccess; smoke6routes+popupmainflowsด้วยtestorigin/data; ไม่ใช้realcheckoutหรือGASwrite
- [ ] Finalreport: F01–F13resolution, 24taskstatus, tests/limitations, SHA/versionURL, desktop/iPads/mobilecaptures; cleanupworktreeที่สร้างอย่างrecoverable

## Commit / implementation protocol

หลังG0ให้ใช้using-git-worktreesหาactiveworktreeที่เหมาะหรือสร้าง`codex/system-interface-renovation`; แต่ละtaskbehaviorใหม่เขียนfailingtest → verifyred → implement → verifygreen → relevantbrowsercheck → commit ไม่สร้างstyle-onlytestsที่ตรวจclassเดิมซ้ำ หลังtaskผ่านไม่รันtestทั้งหมดซ้ำหลายรอบโดยไม่มีchange/riskใหม่

อัปเดตcheckboxตามผลจริง: Taskที่state/devicegateยังไม่ผ่านต้องแยกdoneimplementationกับpendingverification ไม่ติ๊กครบเพื่อให้จำนวนงานสวย

## Definition of Done

- Desktop/iPadขายและจัดการครบ; phoneจัดการเร็วพร้อมdetailsเมื่อขอ
- F01–F06ไม่มีHIGHค้างและF07–F13มีdispositionชัด
- 36unitinventoryทุกแถวมีreviewstate/evidence; Notverifiedยังเปิดเผย
- Businessregressionsผ่าน, no duplicateorder/nodraftloss/noPOSplatformdrift
- Responsive/keyboard/motion/colorcontractsตรงDESIGNที่อนุมัติ
- Tests/lint/build/reviewer/deploymentผ่านตามscopeจริง ไม่ใช้buildsuccessแทนUIapproval

## Self-review

- [x] ขอบเขตครอบคลุมAppshell/6pages/14modalfiles/9ui/2graphs/2layout/2embeddedoverlays
- [x] Primarydevicesและmobilejobตรงคำตอบใหม่ของผู้ใช้
- [x] F01–F13mapไปtasksครบ; highissuesมาก่อนvisualpolish
- [x] Existingmascot/data/storebehaviorรักษาไว้; noauth/securityworkเพิ่ม
- [x] มีconfirmationgateสำหรับdesignใหม่และไม่ถือว่าoldplanapproved
- [x] บอกmissingbetter-*และmanualQAที่ยังไม่verified
- [x] ยังไม่มีproductUIchanges/deployในรอบauditนี้
