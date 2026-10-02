/**
 * ==============================================================================
 * GREEK YOGURT & CAFE POS - GOOGLE APPS SCRIPT BACKEND API
 * ==============================================================================
 * สคริปต์สำหรับเชื่อมต่อ Google Sheets เป็นฐานข้อมูลของระบบจัดการสต็อกและ POS
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheets เปล่าใหม่ขึ้นมา 1 ไฟล์
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) -> Apps Script
 * 3. ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดไฟล์นี้ลงไป
 * 4. กดเลือกฟังก์ชัน "setupDatabase" จากดรอปดาวน์ด้านบน แล้วกดปุ่ม "เรียกใช้" (Run) 1 ครั้ง
 *    (ระบบจะสร้างแท็บชีตและข้อมูลเริ่มต้นร้านกรีกโยเกิร์ตให้โดยอัตโนมัติ)
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภท: "เว็บแอป" (Web app)
 *    - คำอธิบาย: Greek Yogurt API
 *    - ดำเนินการในฐานะ: ฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  *** สำคัญมาก ต้องเลือก Anyone ***
 * 7. กด "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก Web App URL ไปใส่ในหน้า Settings ของ Web GUI
 * ==============================================================================
 */

// ชื่อแท็บฐานข้อมูล
const SHEETS = {
  RAW_MATERIALS: "RawMaterials",
  MENUS: "Menus",
  ADDONS: "Addons",
  PLATFORMS: "Platforms",
  ORDERS: "Orders",
  ORDER_ITEMS: "OrderItems",
  STOCK_TRANSACTIONS: "StockTransactions",
  SETTINGS: "Settings"
};

/**
 * 1. ฟังก์ชันตั้งค่าชีตและใส่ข้อมูลเริ่มต้น (เรียกใช้ครั้งแรกครั้งเดียว)
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // กำหนดสไตล์หัวตาราง
  const applyHeaderStyle = (sheet, headers, bgHex) => {
    sheet.clear();
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground(bgHex || "#2D3748")
         .setFontColor("#FFFFFF")
         .setFontWeight("bold")
         .setFontFamily("Sarabun")
         .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  };

  // 1. RawMaterials
  let sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS) || ss.insertSheet(SHEETS.RAW_MATERIALS);
  applyHeaderStyle(sMat, [
    "MaterialID", "Name", "Category", "Unit", "StockQty", "MinAlertQty", "UnitCost", "Emoji", "UpdatedAt", "IsDeleted", "IsSubIngredient"
  ], "#2B6CB0");
  
  const sampleMaterials = [
    ["MAT001", "กรีกโยเกิร์ตแท้ (Greek Base)", "Base Yogurt", "g", 3500, 1000, 0.18, "🥣", new Date(), false, false],
    ["MAT002", "นมสดพาสเจอร์ไรส์ (Fresh Milk)", "วัตถุดิบรอง", "ml", 15000, 4000, 0.045, "🥛", new Date(), false, true],
    ["MAT003", "หัวเชื้อโยเกิร์ตธรรมชาติ", "วัตถุดิบรอง", "g", 2500, 500, 0.08, "🥣", new Date(), false, true],
    ["MAT004", "สตรอว์เบอร์รีสด", "Fresh Fruits", "g", 1200, 300, 0.35, "🍓", new Date(), false, false],
    ["MAT005", "บลูเบอร์รีสด", "Fresh Fruits", "g", 800, 200, 0.55, "🫐", new Date(), false, false],
    ["MAT006", "มะม่วงน้ำดอกไม้สุก", "Fresh Fruits", "g", 1500, 400, 0.20, "🥭", new Date(), false, false],
    ["MAT007", "กล้วยหอมทอง", "Fresh Fruits", "g", 2000, 500, 0.08, "🍌", new Date(), false, false],
    ["MAT008", "น้ำผึ้งแท้ดอกไม้ป่า", "Sauces", "ml", 1500, 300, 0.25, "🍯", new Date(), false, false],
    ["MAT009", "กราโนล่าอบเนยถั่ว", "Toppings", "g", 1800, 400, 0.28, "🥜", new Date(), false, false],
    ["MAT010", "ถ้วยกระดาษ Type A (Size S)", "Packaging", "pcs", 150, 30, 3.20, "📦", new Date(), false, false],
    ["MAT011", "ถ้วยกระดาษ Type B (Size M)", "Packaging", "pcs", 180, 40, 3.80, "📦", new Date(), false, false],
    ["MAT012", "ช้อนไม้รักษ์โลก", "Packaging", "pcs", 300, 50, 0.60, "🥄", new Date(), false, false],
    ["MAT013", "ถุงพลาสติกหิ้วเดี่ยว (1 แก้ว)", "Packaging", "pcs", 400, 100, 0.85, "🛍️", new Date(), false, false],
    ["MAT014", "ถุงพลาสติกหิ้วคู่ (2 แก้ว)", "Packaging", "pcs", 200, 50, 1.20, "🛍️", new Date(), false, false]
  ];
  sampleMaterials.forEach(row => sMat.appendRow(row));

  // 2. Platforms
  let sPlat = ss.getSheetByName(SHEETS.PLATFORMS) || ss.insertSheet(SHEETS.PLATFORMS);
  applyHeaderStyle(sPlat, [
    "PlatformID", "Name", "GP_Percent", "BadgeColor", "IsActive"
  ], "#2F855A");
  
  const samplePlatforms = [
    ["PLAT01", "หน้าร้าน (Storefront)", 0, "#48BB78", true],
    ["PLAT02", "GrabFood", 30, "#38A169", true],
    ["PLAT03", "LINE MAN", 30, "#319795", true],
    ["PLAT04", "คนรู้จัก / VIP", 0, "#ED8936", true]
  ];
  samplePlatforms.forEach(row => sPlat.appendRow(row));

  // 3. Menus
  let sMenu = ss.getSheetByName(SHEETS.MENUS) || ss.insertSheet(SHEETS.MENUS);
  applyHeaderStyle(sMenu, [
    "MenuID", "Name", "Category", "Emoji", "Description", "Prices_JSON", "Recipe_JSON", "IsActive"
  ], "#805AD5");
  
  const sampleMenus = [
    [
      "MENU01",
      "Greek Yogurt Bowl (Size S)",
      "Classic Bowls",
      "🥣",
      "กรีกโยเกิร์ตเนื้อแน่นพรีเมียม 100g พร้อมช้อนไม้",
      JSON.stringify({ "PLAT01": 69, "PLAT02": 95, "PLAT03": 95, "PLAT04": 59 }),
      JSON.stringify([
        { "materialId": "MAT001", "qty": 100 },
        { "materialId": "MAT012", "qty": 1 },
        { "materialId": "MAT014", "qty": 1 }
      ]),
      true
    ],
    [
      "MENU02",
      "Greek Yogurt Bowl (Size M)",
      "Classic Bowls",
      "🥣",
      "กรีกโยเกิร์ตเนื้อแน่นพรีเมียม 160g พร้อมช้อนไม้",
      JSON.stringify({ "PLAT01": 99, "PLAT02": 139, "PLAT03": 139, "PLAT04": 89 }),
      JSON.stringify([
        { "materialId": "MAT001", "qty": 160 },
        { "materialId": "MAT013", "qty": 1 },
        { "materialId": "MAT014", "qty": 1 }
      ]),
      true
    ],
    [
      "MENU03",
      "Signature Berry Bliss Bowl",
      "Signatures",
      "🍓",
      "กรีกโยเกิร์ต 160g เสิร์ฟพร้อมสตรอว์เบอร์รี บลูเบอร์รี และน้ำผึ้งป่า",
      JSON.stringify({ "PLAT01": 149, "PLAT02": 199, "PLAT03": 199, "PLAT04": 135 }),
      JSON.stringify([
        { "materialId": "MAT001", "qty": 160 },
        { "materialId": "MAT003", "qty": 35 },
        { "materialId": "MAT004", "qty": 25 },
        { "materialId": "MAT008", "qty": 15 },
        { "materialId": "MAT013", "qty": 1 },
        { "materialId": "MAT014", "qty": 1 }
      ]),
      true
    ],
    [
      "MENU04",
      "Tropical Mango Crunch Bowl",
      "Signatures",
      "🥭",
      "กรีกโยเกิร์ต 160g มะม่วงน้ำดอกไม้ กล้วยหอม และกราโนล่าเนยถั่ว",
      JSON.stringify({ "PLAT01": 139, "PLAT02": 185, "PLAT03": 185, "PLAT04": 125 }),
      JSON.stringify([
        { "materialId": "MAT001", "qty": 160 },
        { "materialId": "MAT005", "qty": 45 },
        { "materialId": "MAT006", "qty": 40 },
        { "materialId": "MAT010", "qty": 20 },
        { "materialId": "MAT013", "qty": 1 },
        { "materialId": "MAT014", "qty": 1 }
      ]),
      true
    ]
  ];
  sampleMenus.forEach(row => sMenu.appendRow(row));

  // 4. Addons
  let sAddon = ss.getSheetByName(SHEETS.ADDONS) || ss.insertSheet(SHEETS.ADDONS);
  applyHeaderStyle(sAddon, [
    "AddonID", "Name", "Category", "Emoji", "Prices_JSON", "MaterialID", "AmountUsed", "IsActive"
  ], "#DD6B20");

  const sampleAddons = [
    ["ADD01", "สตรอว์เบอร์รีสด (30g)", "ผลไม้สด", "🍓", JSON.stringify({ "PLAT01": 20, "PLAT02": 29, "PLAT03": 29, "PLAT04": 18 }), "MAT003", 30, true],
    ["ADD02", "บลูเบอร์รีสด (25g)", "ผลไม้สด", "🫐", JSON.stringify({ "PLAT01": 25, "PLAT02": 35, "PLAT03": 35, "PLAT04": 22 }), "MAT004", 25, true],
    ["ADD03", "มะม่วงน้ำดอกไม้ (40g)", "ผลไม้สด", "🥭", JSON.stringify({ "PLAT01": 15, "PLAT02": 22, "PLAT03": 22, "PLAT04": 12 }), "MAT005", 40, true],
    ["ADD04", "กล้วยหอมทอง (40g)", "ผลไม้สด", "🍌", JSON.stringify({ "PLAT01": 12, "PLAT02": 18, "PLAT03": 18, "PLAT04": 10 }), "MAT006", 40, true],
    ["ADD05", "กีวีสีทอง (30g)", "ผลไม้สด", "🥝", JSON.stringify({ "PLAT01": 20, "PLAT02": 29, "PLAT03": 29, "PLAT04": 18 }), "MAT007", 30, true],
    ["ADD06", "น้ำผึ้งแท้ดอกไม้ป่า (15ml)", "ซอส & น้ำผึ้ง", "🍯", JSON.stringify({ "PLAT01": 15, "PLAT02": 20, "PLAT03": 20, "PLAT04": 10 }), "MAT008", 15, true],
    ["ADD07", "ซอสเบอร์รีโฮมเมด (20ml)", "ซอส & น้ำผึ้ง", "🫐", JSON.stringify({ "PLAT01": 15, "PLAT02": 20, "PLAT03": 20, "PLAT04": 10 }), "MAT009", 20, true],
    ["ADD08", "กราโนล่าอบเนยถั่ว (20g)", "ธัญพืช & กรอบ", "🥜", JSON.stringify({ "PLAT01": 15, "PLAT02": 22, "PLAT03": 22, "PLAT04": 12 }), "MAT010", 20, true],
    ["ADD09", "ดาร์กช็อกโกแลตชิป (15g)", "ท็อปปิ้งพิเศษ", "🍫", JSON.stringify({ "PLAT01": 15, "PLAT02": 22, "PLAT03": 22, "PLAT04": 12 }), "MAT011", 15, true]
  ];
  sampleAddons.forEach(row => sAddon.appendRow(row));

  // 5. Orders
  let sOrders = ss.getSheetByName(SHEETS.ORDERS) || ss.insertSheet(SHEETS.ORDERS);
  applyHeaderStyle(sOrders, [
    "OrderID", "CreatedAt", "PlatformID", "PlatformName", "Subtotal", "Discount", "GP_Amount", "NetRevenue", "FoodCost", "GrossProfit", "PaymentMethod", "Note"
  ], "#4A5568");

  // 6. OrderItems
  let sItems = ss.getSheetByName(SHEETS.ORDER_ITEMS) || ss.insertSheet(SHEETS.ORDER_ITEMS);
  applyHeaderStyle(sItems, [
    "ItemID", "OrderID", "MenuID", "MenuName", "AddonsSummary", "Quantity", "UnitPrice", "TotalPrice", "ItemCost"
  ], "#4A5568");

  // 7. StockTransactions
  let sTrans = ss.getSheetByName(SHEETS.STOCK_TRANSACTIONS) || ss.insertSheet(SHEETS.STOCK_TRANSACTIONS);
  applyHeaderStyle(sTrans, [
    "TransID", "CreatedAt", "MaterialID", "MaterialName", "Type", "ChangeQty", "BalanceAfter", "UnitCost", "Note"
  ], "#C53030");

  // 8. Settings
  let sSet = ss.getSheetByName(SHEETS.SETTINGS) || ss.insertSheet(SHEETS.SETTINGS);
  applyHeaderStyle(sSet, ["Key", "Value", "Description"], "#718096");
  sSet.appendRow(["ShopName", "Greek Yogurt Bar & Cafe", "ชื่อร้าน"]);
  sSet.appendRow(["Currency", "THB", "สกุลเงิน"]);
  sSet.appendRow(["PresetEmojis", "🍓,🫐,🥭,🍌,🥝,🍇,🍯,🥣,🥛,🍫,🥜,🥑,🥥,🍑,🍒,🍍,🍋,🍏,🥨,🍪,🧇", "รายการ Emoji ผลไม้และท็อปปิ้ง"]);

  // ลบ Sheet1 เริ่มต้นถ้ามี
  let defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("ชีต1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log("✅ ติดตั้งฐานข้อมูลสำเร็จเรียบร้อยแล้ว!");
}

/**
 * 2. Web App GET Router
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAllData";
  
  try {
    if (action === "ping") {
      return jsonResponse({ status: "success", message: "API is active", time: new Date().toISOString() });
    }
    
    if (action === "getAllData") {
      const data = fetchAllMasterData();
      return jsonResponse({ status: "success", data: data });
    }

    if (action === "getOrders") {
      const orders = fetchOrders(e.parameter.startDate, e.parameter.endDate);
      return jsonResponse({ status: "success", data: orders });
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * 3. Web App POST Router
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // รอ lock สูงสุด 20 วินาที เพื่อป้องกันบันทึกซ้ำซ้อน
    lock.waitLock(20000);
    
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    let result;
    switch (action) {
      case "createOrder":
        result = handleCreateOrder(payload.data);
        break;
      case "stockIn":
        result = handleStockIn(payload.data);
        break;
      case "stockConversion":
        result = handleStockConversion(payload.data);
        break;
      case "stockAdjust":
        result = handleStockAdjust(payload.data);
        break;
      case "saveMenu":
        result = handleSaveMenu(payload.data);
        break;
      case "saveAddon":
        result = handleSaveAddon(payload.data);
        break;
      case "saveMaterial":
        result = handleSaveMaterial(payload.data);
        break;
      case "deleteMaterial":
        result = handleDeleteMaterial(payload.data);
        break;
      case "restoreMaterial":
        result = handleRestoreMaterial(payload.data);
        break;
      case "savePlatforms":
        result = handleSavePlatforms(payload.data);
        break;
      case "saveSettings":
        result = handleSaveSettings(payload.data);
        break;
      default:
        throw new Error("Invalid action: " + action);
    }

    return jsonResponse({ status: "success", data: result });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper: ดึงข้อมูล Master Data ทั้งหมดส่งให้ Frontend
 */
function fetchAllMasterData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  return {
    materials: readSheetToJson(ss.getSheetByName(SHEETS.RAW_MATERIALS)),
    menus: readSheetToJson(ss.getSheetByName(SHEETS.MENUS)),
    addons: readSheetToJson(ss.getSheetByName(SHEETS.ADDONS)),
    platforms: readSheetToJson(ss.getSheetByName(SHEETS.PLATFORMS)),
    recentOrders: fetchRecentOrders(ss, 200),
    settings: readSheetToKeyValue(ss.getSheetByName(SHEETS.SETTINGS))
  };
}

/**
 * บันทึกคำสั่งซื้อใหม่ + ตัดสต็อกตามสูตรและ Add-on + คำนวณ GP & กำไร
 */
function handleCreateOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sOrders = ss.getSheetByName(SHEETS.ORDERS);
  const sOrderItems = ss.getSheetByName(SHEETS.ORDER_ITEMS);
  const sMaterials = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const sTrans = ss.getSheetByName(SHEETS.STOCK_TRANSACTIONS);

  // ดึง Map สต็อกและต้นทุนปัจจุบัน
  const matData = sMaterials.getDataRange().getValues();
  const matMap = {}; // ID -> { rowIdx, stock, cost, name }
  for (let i = 1; i < matData.length; i++) {
    const row = matData[i];
    matMap[row[0]] = {
      rowIdx: i + 1,
      name: row[1],
      stock: Number(row[4]) || 0,
      cost: Number(row[6]) || 0
    };
  }

  // คำนวณสูตรและต้นทุนรวมของวัตถุดิบทั้งหมดที่ใช้ในบิลนี้
  let totalFoodCost = 0;
  const stockDeductions = {}; // materialId -> totalQtyToDeduct

  const now = new Date();
  const orderId = "ORD-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);

  // วนลูปแต่ละเมนูในออเดอร์
  orderData.items.forEach((item, idx) => {
    let itemCost = 0;

    // 1. ตัดวัตถุดิบตามสูตรเมนูหลัก
    if (item.recipe && Array.isArray(item.recipe)) {
      item.recipe.forEach(r => {
        const qtyNeeded = (Number(r.qty) || 0) * (Number(item.qty) || 1);
        stockDeductions[r.materialId] = (stockDeductions[r.materialId] || 0) + qtyNeeded;
        if (matMap[r.materialId]) {
          itemCost += qtyNeeded * matMap[r.materialId].cost;
        }
      });
    }

    // 2. ตัดวัตถุดิบตาม Add-on ที่เลือก
    if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
      item.selectedAddons.forEach(addon => {
        if (addon.materialId && addon.amountUsed) {
          const qtyNeeded = (Number(addon.amountUsed) || 0) * (Number(item.qty) || 1);
          stockDeductions[addon.materialId] = (stockDeductions[addon.materialId] || 0) + qtyNeeded;
          if (matMap[addon.materialId]) {
            itemCost += qtyNeeded * matMap[addon.materialId].cost;
          }
        }
      });
    }

    totalFoodCost += itemCost;

    // บันทึกลง OrderItems
    const itemId = orderId + "-I" + (idx + 1);
    const addonsSummary = (item.selectedAddons || []).map(a => a.name).join(", ");
    sOrderItems.appendRow([
      itemId,
      orderId,
      item.menuId || "",
      item.menuName,
      addonsSummary,
      item.qty,
      item.unitPrice,
      item.totalPrice,
      itemCost
    ]);
  });

  // คำนวณการเงิน
  const subtotal = Number(orderData.subtotal) || 0;
  const discount = Number(orderData.discount) || 0;
  const gpPercent = Number(orderData.gpPercent) || 0;
  const gpAmount = (subtotal - discount) * (gpPercent / 100);
  const netRevenue = (subtotal - discount) - gpAmount;
  const grossProfit = netRevenue - totalFoodCost;

  // บันทึกลง Orders
  sOrders.appendRow([
    orderId,
    now,
    orderData.platformId,
    orderData.platformName,
    subtotal,
    discount,
    gpAmount,
    netRevenue,
    totalFoodCost,
    grossProfit,
    orderData.paymentMethod || "QR PromptPay",
    orderData.note || ""
  ]);

  // ตัดสต็อกในชีต RawMaterials และบันทึกประวัติ StockTransactions
  for (const matId in stockDeductions) {
    const deductQty = stockDeductions[matId];
    if (matMap[matId]) {
      const current = matMap[matId].stock;
      const newStock = Math.max(0, current - deductQty);
      
      // Update cell in RawMaterials
      sMaterials.getRange(matMap[matId].rowIdx, 5).setValue(newStock);
      sMaterials.getRange(matMap[matId].rowIdx, 9).setValue(now);

      // Append transaction
      const transId = "TR-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss") + "-" + matId;
      sTrans.appendRow([
        transId,
        now,
        matId,
        matMap[matId].name,
        "SALE",
        -deductQty,
        newStock,
        matMap[matId].cost,
        "Order #" + orderId
      ]);
    }
  }

  return {
    orderId: orderId,
    netRevenue: netRevenue,
    totalFoodCost: totalFoodCost,
    grossProfit: grossProfit
  };
}

/**
 * รับเข้าสต็อก (Stock In) + คำนวณต้นทุนเฉลี่ย
 */
function handleStockIn(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const sTrans = ss.getSheetByName(SHEETS.STOCK_TRANSACTIONS);
  const now = new Date();

  const matData = sMat.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < matData.length; i++) {
    if (matData[i][0] === data.materialId) {
      const currentQty = Number(matData[i][4]) || 0;
      const currentCost = Number(matData[i][6]) || 0;
      const addQty = Number(data.quantity) || 0;
      const purchasePrice = Number(data.unitCost) || currentCost;

      // ต้นทุนเฉลี่ยถ่วงน้ำหนัก (Weighted Average Cost)
      const newTotalQty = currentQty + addQty;
      const newAvgCost = newTotalQty > 0 
        ? ((currentQty * currentCost) + (addQty * purchasePrice)) / newTotalQty 
        : purchasePrice;

      sMat.getRange(i + 1, 5).setValue(newTotalQty);
      sMat.getRange(i + 1, 7).setValue(Math.round(newAvgCost * 1000) / 1000);
      sMat.getRange(i + 1, 9).setValue(now);

      // Log transaction
      const transId = "IN-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss");
      sTrans.appendRow([
        transId,
        now,
        data.materialId,
        matData[i][1],
        "RESTOCK_IN",
        addQty,
        newTotalQty,
        purchasePrice,
        data.note || "รับวัตถุดิบเข้าคลัง"
      ]);

      found = true;
      break;
    }
  }

  if (!found) throw new Error("Material ID not found: " + data.materialId);
  return { success: true };
}

/**
 * แปรรูปจากวัตถุดิบรอง (Stock Conversion / Prep Batch)
 */
function handleStockConversion(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const sTrans = ss.getSheetByName(SHEETS.STOCK_TRANSACTIONS);
  const now = new Date();

  const matData = sMat.getDataRange().getValues();
  const matRowMap = {};
  for (let i = 1; i < matData.length; i++) {
    matRowMap[matData[i][0]] = {
      rowIdx: i + 1,
      name: matData[i][1],
      stock: Number(matData[i][4]) || 0,
      cost: Number(matData[i][6]) || 0
    };
  }

  const batchId = "BATCH-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss");

  // 1. ตัดสต็อกวัตถุดิบรอง
  (data.subUsages || []).forEach(sub => {
    const item = matRowMap[sub.materialId];
    if (item) {
      const newStock = Math.max(0, item.stock - Number(sub.qty));
      sMat.getRange(item.rowIdx, 5).setValue(newStock);
      sMat.getRange(item.rowIdx, 9).setValue(now);

      const transId = "BATCH-USE-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss") + "-" + sub.materialId;
      sTrans.appendRow([
        transId,
        now,
        sub.materialId,
        item.name,
        "PREP_USE",
        -Number(sub.qty),
        newStock,
        item.cost,
        "แปรรูปผลิต batch #" + batchId
      ]);
    }
  });

  // 2. เพิ่มสต็อกผลผลิตหลัก และอัปเดตต้นทุนเฉลี่ย
  const target = matRowMap[data.targetMaterialId];
  if (target) {
    const currentStock = target.stock;
    const currentCost = target.cost;
    const yieldQty = Number(data.yieldQty) || 0;
    const totalCost = Number(data.totalBatchCost) || 0;

    const newTotalStock = currentStock + yieldQty;
    const newAvgCost = newTotalStock > 0 ? ((currentStock * currentCost) + totalCost) / newTotalStock : (totalCost / yieldQty);

    sMat.getRange(target.rowIdx, 5).setValue(newTotalStock);
    sMat.getRange(target.rowIdx, 7).setValue(Math.round(newAvgCost * 1000) / 1000);
    sMat.getRange(target.rowIdx, 9).setValue(now);

    const transId = "BATCH-OUT-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss") + "-" + data.targetMaterialId;
    sTrans.appendRow([
      transId,
      now,
      data.targetMaterialId,
      target.name,
      "PREP_YIELD",
      yieldQty,
      newTotalStock,
      Math.round(newAvgCost * 1000) / 1000,
      data.note || ("ผลผลิตจากการแปรรูป batch #" + batchId)
    ]);
  }

  return { success: true, batchId: batchId };
}

/**
 * ปรับยอดสต็อก / บันทึกของเสีย (Waste / Adjust)
 */
function handleStockAdjust(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const sTrans = ss.getSheetByName(SHEETS.STOCK_TRANSACTIONS);
  const now = new Date();

  const matData = sMat.getDataRange().getValues();
  for (let i = 1; i < matData.length; i++) {
    if (matData[i][0] === data.materialId) {
      const currentQty = Number(matData[i][4]) || 0;
      const unitCost = Number(matData[i][6]) || 0;
      let newQty = currentQty;
      let changeQty = 0;

      if (data.type === "WASTE") {
        // ของเสีย / ทิ้ง
        changeQty = -(Number(data.quantity) || 0);
        newQty = Math.max(0, currentQty + changeQty);
      } else {
        // ปรับยอดจริงที่นับได้
        newQty = Number(data.countedQty) || 0;
        changeQty = newQty - currentQty;
      }

      sMat.getRange(i + 1, 5).setValue(newQty);
      sMat.getRange(i + 1, 9).setValue(now);

      const transId = "ADJ-" + Utilities.formatDate(now, "Asia/Bangkok", "yyMMdd-HHmmss");
      sTrans.appendRow([
        transId,
        now,
        data.materialId,
        matData[i][1],
        data.type || "ADJUSTMENT",
        changeQty,
        newQty,
        unitCost,
        data.note || (data.type === "WASTE" ? "ของเสีย/ทิ้ง" : "ปรับยอดตรวจนับ")
      ]);

      return { success: true, newQty: newQty };
    }
  }

  throw new Error("Material not found: " + data.materialId);
}

/**
 * บันทึกหรืออัปเดตเมนู
 */
function handleSaveMenu(menu) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMenu = ss.getSheetByName(SHEETS.MENUS);
  const data = sMenu.getDataRange().getValues();

  let targetRow = -1;
  const menuId = menu.id || ("MENU-" + (data.length));

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === menuId) {
      targetRow = i + 1;
      break;
    }
  }

  const rowValues = [
    menuId,
    menu.name,
    menu.category || "Classic Bowls",
    menu.emoji || "🥣",
    menu.description || "",
    typeof menu.prices === "string" ? menu.prices : JSON.stringify(menu.prices || {}),
    typeof menu.recipe === "string" ? menu.recipe : JSON.stringify(menu.recipe || []),
    menu.isActive !== false
  ];

  if (targetRow > 0) {
    sMenu.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sMenu.appendRow(rowValues);
  }

  return { success: true, menuId: menuId };
}

/**
 * บันทึกหรืออัปเดต Add-on
 */
function handleSaveAddon(addon) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sAddon = ss.getSheetByName(SHEETS.ADDONS);
  const data = sAddon.getDataRange().getValues();

  let targetRow = -1;
  const addonId = addon.id || ("ADD-" + (data.length));

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === addonId) {
      targetRow = i + 1;
      break;
    }
  }

  const rowValues = [
    addonId,
    addon.name,
    addon.category || "ผลไม้สด",
    addon.emoji || "🍓",
    typeof addon.prices === "string" ? addon.prices : JSON.stringify(addon.prices || {}),
    addon.materialId || "",
    Number(addon.amountUsed) || 0,
    addon.isActive !== false
  ];

  if (targetRow > 0) {
    sAddon.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sAddon.appendRow(rowValues);
  }

  return { success: true, addonId: addonId };
}

/**
 * บันทึกวัตถุดิบใหม่หรือแก้ไข
 */
function handleSaveMaterial(mat) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const data = sMat.getDataRange().getValues();

  let targetRow = -1;
  const matId = mat.id || ("MAT-" + (data.length));

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === matId) {
      targetRow = i + 1;
      break;
    }
  }

  const rowValues = [
    matId,
    mat.name,
    mat.category || "General",
    mat.unit || "g",
    Number(mat.stock) || 0,
    Number(mat.minAlert) || 0,
    Number(mat.unitCost) || 0,
    mat.emoji || "📦",
    new Date(),
    Boolean(mat.isDeleted),
    Boolean(mat.isSubIngredient)
  ];

  if (targetRow > 0) {
    sMat.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sMat.appendRow(rowValues);
  }

  return { success: true, materialId: matId };
}

/**
 * ลบวัตถุดิบ (Soft Delete / Archive) - คงประวัติการขายและสต็อกเดิมไว้
 */
function handleDeleteMaterial(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const matData = sMat.getDataRange().getValues();

  for (let i = 1; i < matData.length; i++) {
    if (matData[i][0] === data.materialId) {
      // Column 10: IsDeleted
      sMat.getRange(i + 1, 10).setValue(true);
      sMat.getRange(i + 1, 9).setValue(new Date());
      return { success: true, materialId: data.materialId, isDeleted: true };
    }
  }

  return { success: false, message: "Material not found" };
}

/**
 * กู้คืนวัตถุดิบที่ถูกลบ (Restore)
 */
function handleRestoreMaterial(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sMat = ss.getSheetByName(SHEETS.RAW_MATERIALS);
  const matData = sMat.getDataRange().getValues();

  for (let i = 1; i < matData.length; i++) {
    if (matData[i][0] === data.materialId) {
      // Column 10: IsDeleted
      sMat.getRange(i + 1, 10).setValue(false);
      sMat.getRange(i + 1, 9).setValue(new Date());
      return { success: true, materialId: data.materialId, isDeleted: false };
    }
  }

  return { success: false, message: "Material not found" };
}

/**
 * บันทึกรายชื่อ Platforms และ GP%
 */
function handleSavePlatforms(platformsList) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sPlat = ss.getSheetByName(SHEETS.PLATFORMS);
  sPlat.clear();
  sPlat.appendRow(["PlatformID", "Name", "GP_Percent", "BadgeColor", "IsActive"]);

  platformsList.forEach(p => {
    sPlat.appendRow([
      p.id,
      p.name,
      Number(p.gpPercent) || 0,
      p.badgeColor || "#4A5568",
      p.isActive !== false
    ]);
  });

  return { success: true };
}

/**
 * บันทึกการตั้งค่า
 */
function handleSaveSettings(settingsObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sSet = ss.getSheetByName(SHEETS.SETTINGS);
  
  for (const key in settingsObj) {
    let found = false;
    const data = sSet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sSet.getRange(i + 1, 2).setValue(settingsObj[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sSet.appendRow([key, settingsObj[key], ""]);
    }
  }

  return { success: true };
}

/**
 * Helpers: อ่าน Sheet เป็น JSON
 */
function readSheetToJson(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      // ลองแปลงฟิลด์ JSON
      if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      item[h] = val;
    });
    result.push(item);
  }

  return result;
}

function readSheetToKeyValue(sheet) {
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const res = {};
  for (let i = 1; i < data.length; i++) {
    res[data[i][0]] = data[i][1];
  }
  return res;
}

function fetchRecentOrders(ss, limit) {
  const sOrders = ss.getSheetByName(SHEETS.ORDERS);
  if (!sOrders) return [];
  const data = sOrders.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const list = [];
  const start = Math.max(1, data.length - (limit || 100));

  for (let i = data.length - 1; i >= start; i--) {
    const row = data[i];
    const order = {};
    headers.forEach((h, colIdx) => {
      order[h] = row[colIdx];
    });
    list.push(order);
  }
  return list;
}

/**
 * ส่งออกผลลัพธ์ JSON สำหรับ Web App
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
