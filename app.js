/**
 * ==============================================================================
 * GREEK YOGG. — CORE CLIENT-SIDE APPLICATION JAVASCRIPT
 * ==============================================================================
 * สถาปัตยกรรม: Vanilla JS Reactive State Management
 * รองรับทั้ง Offline/Demo Mode และ Live Sync กับ Google Sheets ผ่าน Google Apps Script API
 * ==============================================================================
 */

// ==========================================
// 1. STATE & DEFAULT MOCK DATA
// ==========================================

const DEFAULT_PRESET_EMOJIS = [
  "🍓", "🫐", "🥭", "🍌", "🥝", "🍇", "🍯", "🥣", "🥛", "🍫", "🥜", "🥑", "🥥", "🍑", "🍒", "🍍", "🍋", "🍏", "🥨", "🍪", "🧇"
];

// Curated catalog of emojis tailored for Greek Yogurt, Fruit Cafe, Toppings & Packaging
const EMOJI_CATALOG = [
  // ผลไม้สด (Fresh Fruits)
  { emoji: "🍓", category: "ผลไม้", keywords: "สตรอว์เบอร์รี สตรอเบอรี่ strawberry berry fruit ผลไม้ สีแดง" },
  { emoji: "🫐", category: "ผลไม้", keywords: "บลูเบอร์รี บลูเบอรี่ blueberry berry fruit ผลไม้ สีม่วง" },
  { emoji: "🥭", category: "ผลไม้", keywords: "มะม่วง แมงโก้ mango fruit ผลไม้ น้ำดอกไม้ สีเหลือง" },
  { emoji: "🍌", category: "ผลไม้", keywords: "กล้วย บานาน่า banana fruit ผลไม้ กล้วยหอม" },
  { emoji: "🥝", category: "ผลไม้", keywords: "กีวี่ กีวี kiwi fruit ผลไม้ เขียว" },
  { emoji: "🍇", category: "ผลไม้", keywords: "องุ่น เกรป grape fruit ผลไม้ ม่วง เขียว ไชน์มัสแคท" },
  { emoji: "🍑", category: "ผลไม้", keywords: "พีช ลูกพีช peach fruit ผลไม้ ชมพู" },
  { emoji: "🍒", category: "ผลไม้", keywords: "เชอร์รี เชอรี่ cherry fruit ผลไม้ แดง" },
  { emoji: "🍍", category: "ผลไม้", keywords: "สับปะรด pineapple fruit ผลไม้ เหลือง" },
  { emoji: "🍋", category: "ผลไม้", keywords: "เลมอน มะนาว lemon lime fruit ผลไม้ เหลือง เปรี้ยว" },
  { emoji: "🍊", category: "ผลไม้", keywords: "ส้ม ออเรนจ์ orange fruit ผลไม้ วิตามินซี" },
  { emoji: "🍏", category: "ผลไม้", keywords: "แอปเปิ้ลเขียว green apple fruit ผลไม้ เขียว" },
  { emoji: "🍎", category: "ผลไม้", keywords: "แอปเปิ้ลแดง red apple fruit ผลไม้ แดง" },
  { emoji: "🍉", category: "ผลไม้", keywords: "แตงโม watermelon fruit ผลไม้ แดง สดชื่น" },
  { emoji: "🍈", category: "ผลไม้", keywords: "เมลอน แคนตาลูป melon cantaloupe fruit ผลไม้ เขียว" },
  { emoji: "🥑", category: "ผลไม้", keywords: "อะโวคาโด อาโวคาโด avocado fruit ผลไม้ คลีน สุขภาพ" },
  { emoji: "🥥", category: "ผลไม้", keywords: "มะพร้าว น้ำมะพร้าว coconut fruit ผลไม้ หอมมัน" },
  { emoji: "🍐", category: "ผลไม้", keywords: "ลูกแพร์ สาลี่ pear fruit ผลไม้" },
  { emoji: "🍅", category: "ผลไม้", keywords: "มะเขือเทศ tomato fruit ผลไม้ แดง" },
  { emoji: "🥕", category: "ผลไม้", keywords: "แครอท carrot vegetable ผัก ส้ม" },

  // นม & โยเกิร์ต (Dairy & Bases)
  { emoji: "🥣", category: "นม/โยเกิร์ต", keywords: "กรีกโยเกิร์ต โยเกิร์ต ชาม ชามโยเกิร์ต bowl yogurt greek base" },
  { emoji: "🥛", category: "นม/โยเกิร์ต", keywords: "นมสด นมพาสเจอร์ไรส์ นม milk fresh dairy วัตถุดิบรอง" },
  { emoji: "🍦", category: "นม/โยเกิร์ต", keywords: "ไอศกรีม ซอฟต์เสิร์ฟ โคน ice cream soft serve" },
  { emoji: "🍨", category: "นม/โยเกิร์ต", keywords: "ไอศกรีมถ้วย เจลาโต้ ถ้วยไอติม ice cream cup gelato" },
  { emoji: "🧀", category: "นม/โยเกิร์ต", keywords: "ชีส ครีมชีส cheese cream cheese dairy" },
  { emoji: "🍶", category: "นม/โยเกิร์ต", keywords: "หัวเชื้อ โยเกิร์ตธรรมชาติ ขวดนม starter probiotic dairy" },
  { emoji: "🍼", category: "นม/โยเกิร์ต", keywords: "ขวดนม นม milk bottle" },
  { emoji: "🧈", category: "นม/โยเกิร์ต", keywords: "เนยสด บัตเตอร์ butter dairy เนย" },
  { emoji: "🍧", category: "นม/โยเกิร์ต", keywords: "น้ำแข็งไส บิงซู shaved ice bingsu" },

  // ท็อปปิ้ง & ซอส (Toppings & Sauces)
  { emoji: "🍯", category: "ท็อปปิ้ง", keywords: "น้ำผึ้ง น้ำผึ้งป่า ฮันนี่ honey sweet sauce ซอส หวาน" },
  { emoji: "🍫", category: "ท็อปปิ้ง", keywords: "ช็อกโกแลต ช็อคโกแลต ดาร์กช็อก chocolate cocoa ซอสช็อกโกแลต" },
  { emoji: "🥜", category: "ท็อปปิ้ง", keywords: "ถั่ว พีนัท เนยถั่ว peanut peanut butter อัลมอนด์ ธัญพืช" },
  { emoji: "🌰", category: "ท็อปปิ้ง", keywords: "เกาลัด อัลมอนด์ วอลนัท chestnut nut เมล็ด" },
  { emoji: "🌾", category: "ท็อปปิ้ง", keywords: "กราโนล่า ข้าวโอ๊ต ธัญพืช oats granola cereal ข้าวโอ๊ตกรอบ" },
  { emoji: "🍪", category: "ท็อปปิ้ง", keywords: "คุกกี้ โอริโอ้ cookie crumb ครัมเบิล" },
  { emoji: "🥨", category: "ท็อปปิ้ง", keywords: "เพรตเซล pretzel เค็ม กรอบ" },
  { emoji: "🧇", category: "ท็อปปิ้ง", keywords: "วาฟเฟิล ครอฟเฟิล waffle croffle กรอบ หอม" },
  { emoji: "🥞", category: "ท็อปปิ้ง", keywords: "แพนเค้ก pancake sweet" },
  { emoji: "🍮", category: "ท็อปปิ้ง", keywords: "พุดดิ้ง คัสตาร์ด pudding custard นุ่ม" },
  { emoji: "🍬", category: "ท็อปปิ้ง", keywords: "ลูกอม แคนดี้ candy sweet" },
  { emoji: "🍭", category: "ท็อปปิ้ง", keywords: "อมยิ้ม lollipop sweet" },
  { emoji: "🍿", category: "ท็อปปิ้ง", keywords: "ป๊อปคอร์น popcorn ข้าวโพด" },
  { emoji: "🌿", category: "ท็อปปิ้ง", keywords: "ใบมิ้นต์ มิ้นท์ สมุนไพร สะระแหน่ mint herb green สดชื่น" },
  { emoji: "🧂", category: "ท็อปปิ้ง", keywords: "เกลือ เกลือชมพู salt seasoning" },
  { emoji: "✨", category: "ท็อปปิ้ง", keywords: "ประกาย ซิกเนเจอร์ วิ้ง sparkles signature พิเศษ" },

  // ขนม & ของหวาน (Bakery & Pastry)
  { emoji: "🥐", category: "ขนม", keywords: "ครัวซองต์ ครัวซอง croissant bakery ขนมปัง" },
  { emoji: "🍞", category: "ขนม", keywords: "ขนมปัง โทสต์ bread toast ปังปิ้ง" },
  { emoji: "🥯", category: "ขนม", keywords: "เบเกิล bagel ขนมปังกลม" },
  { emoji: "🧁", category: "ขนม", keywords: "คัพเค้ก cupcake เค้ก ครีม" },
  { emoji: "🎂", category: "ขนม", keywords: "เค้ก วันเกิด cake birthday เค้กวันเกิด" },
  { emoji: "🥧", category: "ขนม", keywords: "พาย ทาร์ต pie tart พายผลไม้" },
  { emoji: "🍩", category: "ขนม", keywords: "โดนัท donut doughnut หวาน" },

  // บรรจุภัณฑ์ & อุปกรณ์ (Packaging & Equipment)
  { emoji: "📦", category: "บรรจุภัณฑ์", keywords: "กล่อง ถ้วย ถ้วยกระดาษ type a type b cup box packaging บรรจุภัณฑ์" },
  { emoji: "🥡", category: "บรรจุภัณฑ์", keywords: "กล่องเทคอะเวย์ กล่องอาหาร takeaway togo box packaging" },
  { emoji: "🥤", category: "บรรจุภัณฑ์", keywords: "แก้ว แก้วพลาสติก แก้วกาแฟ หลอด cup drink packaging" },
  { emoji: "🥄", category: "บรรจุภัณฑ์", keywords: "ช้อน ช้อนไม้ ช้อนพลาสติก spoon wooden spoon cutlery อุปกรณ์" },
  { emoji: "🍴", category: "บรรจุภัณฑ์", keywords: "ส้อม มีด cutlery fork spoon อุปกรณ์" },
  { emoji: "🛍️", category: "บรรจุภัณฑ์", keywords: "ถุง ถุงหิ้ว ถุงพลาสติก ถุงกระดาษ shopping bag plastic bag" },
  { emoji: "🏷️", category: "บรรจุภัณฑ์", keywords: "ป้าย แท็ก สติกเกอร์ label tag sticker โลโก้" },
  { emoji: "🧊", category: "บรรจุภัณฑ์", keywords: "น้ำแข็ง ก้อนน้ำแข็ง ice cube เย็น" },
  { emoji: "☕", category: "บรรจุภัณฑ์", keywords: "กาแฟ ถ้วยกาแฟ coffee cup ร้อน" },
  { emoji: "🧋", category: "บรรจุภัณฑ์", keywords: "ชานม ชานมไข่มุก boba bubble tea" },
  { emoji: "🍵", category: "บรรจุภัณฑ์", keywords: "ชาเขียว มัทฉะ matcha green tea tea" },
  { emoji: "🧃", category: "บรรจุภัณฑ์", keywords: "น้ำผลไม้ กล่องน้ำผลไม้ juice box" },
  { emoji: "🍽️", category: "บรรจุภัณฑ์", keywords: "จาน จานชาม plate dish tableware" },
  { emoji: "🥢", category: "บรรจุภัณฑ์", keywords: "ตะเกียบ chopsticks" }
];

const DEFAULT_PLATFORMS = [
  { id: "PLAT01", name: "หน้าร้าน (Storefront)", gpPercent: 0, badgeColor: "#48BB78", isActive: true },
  { id: "PLAT02", name: "GrabFood", gpPercent: 30, badgeColor: "#38A169", isActive: true },
  { id: "PLAT03", name: "LINE MAN", gpPercent: 30, badgeColor: "#319795", isActive: true },
  { id: "PLAT04", name: "คนรู้จัก / VIP", gpPercent: 0, badgeColor: "#ED8936", isActive: true }
];

const DEFAULT_MATERIALS = [
  { id: "MAT001", name: "กรีกโยเกิร์ตแท้ (Greek Base)", category: "Base Yogurt", unit: "g", stock: 3500, minAlert: 1000, unitCost: 0.18, emoji: "🥣", isSubIngredient: false, isDeleted: false },
  { id: "MAT002", name: "นมสดพาสเจอร์ไรส์ (Fresh Milk)", category: "วัตถุดิบรอง", unit: "ml", stock: 15000, minAlert: 4000, unitCost: 0.045, emoji: "🥛", isSubIngredient: true, isDeleted: false },
  { id: "MAT003", name: "หัวเชื้อโยเกิร์ตธรรมชาติ", category: "วัตถุดิบรอง", unit: "g", stock: 2500, minAlert: 500, unitCost: 0.08, emoji: "🥣", isSubIngredient: true, isDeleted: false },
  { id: "MAT004", name: "สตรอว์เบอร์รีสด", category: "Fresh Fruits", unit: "g", stock: 1200, minAlert: 300, unitCost: 0.35, emoji: "🍓", isSubIngredient: false, isDeleted: false },
  { id: "MAT005", name: "บลูเบอร์รีสด", category: "Fresh Fruits", unit: "g", stock: 800, minAlert: 200, unitCost: 0.55, emoji: "🫐", isSubIngredient: false, isDeleted: false },
  { id: "MAT006", name: "มะม่วงน้ำดอกไม้สุก", category: "Fresh Fruits", unit: "g", stock: 1500, minAlert: 400, unitCost: 0.20, emoji: "🥭", isSubIngredient: false, isDeleted: false },
  { id: "MAT007", name: "กล้วยหอมทอง", category: "Fresh Fruits", unit: "g", stock: 2000, minAlert: 500, unitCost: 0.08, emoji: "🍌", isSubIngredient: false, isDeleted: false },
  { id: "MAT008", name: "น้ำผึ้งแท้ดอกไม้ป่า", category: "Sauces", unit: "ml", stock: 1500, minAlert: 300, unitCost: 0.25, emoji: "🍯", isSubIngredient: false, isDeleted: false },
  { id: "MAT009", name: "กราโนล่าอบเนยถั่ว", category: "Toppings", unit: "g", stock: 1800, minAlert: 400, unitCost: 0.28, emoji: "🥜", isSubIngredient: false, isDeleted: false },
  { id: "MAT010", name: "ถ้วยกระดาษ Type A (Size S)", category: "Packaging", unit: "pcs", stock: 150, minAlert: 30, unitCost: 3.20, emoji: "📦", isSubIngredient: false, isDeleted: false },
  { id: "MAT011", name: "ถ้วยกระดาษ Type B (Size M)", category: "Packaging", unit: "pcs", stock: 180, minAlert: 40, unitCost: 3.80, emoji: "📦", isSubIngredient: false, isDeleted: false },
  { id: "MAT012", name: "ช้อนไม้รักษ์โลก", category: "Packaging", unit: "pcs", stock: 300, minAlert: 50, unitCost: 0.60, emoji: "🥄", isSubIngredient: false, isDeleted: false },
  { id: "MAT013", name: "ถุงพลาสติกหิ้วเดี่ยว (1 แก้ว)", category: "Packaging", unit: "pcs", stock: 400, minAlert: 100, unitCost: 0.85, emoji: "🛍️", isSubIngredient: false, isDeleted: false },
  { id: "MAT014", name: "ถุงพลาสติกหิ้วคู่ (2 แก้ว)", category: "Packaging", unit: "pcs", stock: 200, minAlert: 50, unitCost: 1.20, emoji: "🛍️", isSubIngredient: false, isDeleted: false }
];

const DEFAULT_MENUS = [
  {
    id: "MENU01",
    name: "Greek Yogurt Bowl (Size S)",
    category: "Classic Bowls",
    emoji: "🥣",
    description: "กรีกโยเกิร์ตแท้ 100g พร้อมถ้วย Type A + ช้อนไม้ + ถุงหิ้ว",
    prices: { "PLAT01": 69, "PLAT02": 95, "PLAT03": 95, "PLAT04": 59 },
    recipe: [
      { materialId: "MAT001", qty: 100 }, // กรีกโยเกิร์ต 100g
      { materialId: "MAT010", qty: 1 },   // ถ้วย Type A (Size S)
      { materialId: "MAT012", qty: 1 },   // ช้อนไม้
      { materialId: "MAT013", qty: 1 }    // ถุงพลาสติกหิ้ว
    ],
    isActive: true
  },
  {
    id: "MENU02",
    name: "Greek Yogurt Bowl (Size M)",
    category: "Classic Bowls",
    emoji: "🥣",
    description: "กรีกโยเกิร์ตแท้ 160g พร้อมถ้วย Type B + ช้อนไม้ + ถุงหิ้ว",
    prices: { "PLAT01": 99, "PLAT02": 139, "PLAT03": 139, "PLAT04": 89 },
    recipe: [
      { materialId: "MAT001", qty: 160 }, // กรีกโยเกิร์ต 160g
      { materialId: "MAT011", qty: 1 },   // ถ้วย Type B (Size M)
      { materialId: "MAT012", qty: 1 },   // ช้อนไม้
      { materialId: "MAT013", qty: 1 }    // ถุงพลาสติกหิ้ว
    ],
    isActive: true
  },
  {
    id: "MENU03",
    name: "Signature Berry Bliss Bowl",
    category: "Signatures",
    emoji: "🍓",
    description: "กรีกโยเกิร์ต 160g สตรอว์เบอร์รี บลูเบอร์รี น้ำผึ้ง + ถ้วย Type B + ถุงหิ้ว",
    prices: { "PLAT01": 149, "PLAT02": 199, "PLAT03": 199, "PLAT04": 135 },
    recipe: [
      { materialId: "MAT001", qty: 160 },
      { materialId: "MAT004", qty: 35 },
      { materialId: "MAT005", qty: 25 },
      { materialId: "MAT008", qty: 15 },
      { materialId: "MAT011", qty: 1 },
      { materialId: "MAT012", qty: 1 },
      { materialId: "MAT013", qty: 1 }
    ],
    isActive: true
  },
  {
    id: "MENU04",
    name: "Tropical Mango Crunch Bowl",
    category: "Signatures",
    emoji: "🥭",
    description: "กรีกโยเกิร์ต 160g มะม่วง กล้วยหอม กราโนล่า + ถ้วย Type B + ถุงหิ้ว",
    prices: { "PLAT01": 139, "PLAT02": 185, "PLAT03": 185, "PLAT04": 125 },
    recipe: [
      { materialId: "MAT001", qty: 160 },
      { materialId: "MAT006", qty: 45 },
      { materialId: "MAT007", qty: 40 },
      { materialId: "MAT009", qty: 20 },
      { materialId: "MAT011", qty: 1 },
      { materialId: "MAT012", qty: 1 },
      { materialId: "MAT013", qty: 1 }
    ],
    isActive: true
  }
];

const DEFAULT_ADDONS = [
  { id: "ADD01", name: "สตรอว์เบอร์รีสด (30g)", category: "ผลไม้สด", emoji: "🍓", prices: { "PLAT01": 20, "PLAT02": 29, "PLAT03": 29, "PLAT04": 18 }, materialId: "MAT004", amountUsed: 30, isActive: true },
  { id: "ADD02", name: "บลูเบอร์รีสด (25g)", category: "ผลไม้สด", emoji: "🫐", prices: { "PLAT01": 25, "PLAT02": 35, "PLAT03": 35, "PLAT04": 22 }, materialId: "MAT005", amountUsed: 25, isActive: true },
  { id: "ADD03", name: "มะม่วงน้ำดอกไม้ (40g)", category: "ผลไม้สด", emoji: "🥭", prices: { "PLAT01": 15, "PLAT02": 22, "PLAT03": 22, "PLAT04": 12 }, materialId: "MAT006", amountUsed: 40, isActive: true },
  { id: "ADD04", name: "กล้วยหอมทอง (40g)", category: "ผลไม้สด", emoji: "🍌", prices: { "PLAT01": 12, "PLAT02": 18, "PLAT03": 18, "PLAT04": 10 }, materialId: "MAT007", amountUsed: 40, isActive: true },
  { id: "ADD05", name: "น้ำผึ้งแท้ดอกไม้ป่า (15ml)", category: "ซอส & น้ำผึ้ง", emoji: "🍯", prices: { "PLAT01": 15, "PLAT02": 20, "PLAT03": 20, "PLAT04": 10 }, materialId: "MAT008", amountUsed: 15, isActive: true },
  { id: "ADD06", name: "กราโนล่าอบเนยถั่ว (20g)", category: "ธัญพืช & กรอบ", emoji: "🥜", prices: { "PLAT01": 15, "PLAT02": 22, "PLAT03": 22, "PLAT04": 12 }, materialId: "MAT009", amountUsed: 20, isActive: true }
];

// Seed initial orders for today
const todayIso = new Date().toISOString();
const DEFAULT_ORDERS = [
  {
    orderId: "ORD-261002-101",
    createdAt: todayIso,
    platformId: "PLAT01",
    platformName: "หน้าร้าน (Storefront)",
    subtotal: 169,
    discount: 0,
    gpAmount: 0,
    netRevenue: 169,
    foodCost: 45.5,
    grossProfit: 123.5,
    paymentMethod: "QR PromptPay",
    note: "ทานที่ร้าน",
    items: [
      {
        menuId: "MENU03",
        menuName: "Signature Berry Bliss Bowl",
        qty: 1,
        unitPrice: 149,
        totalPrice: 149,
        selectedAddons: [{ id: "ADD01", name: "สตรอว์เบอร์รีสด (30g)", price: 20, materialId: "MAT003", amountUsed: 30 }]
      }
    ]
  },
  {
    orderId: "ORD-261002-102",
    createdAt: todayIso,
    platformId: "PLAT02",
    platformName: "GrabFood",
    subtotal: 228,
    discount: 0,
    gpAmount: 68.4,
    netRevenue: 159.6,
    foodCost: 48.2,
    grossProfit: 111.4,
    paymentMethod: "Platform Delivery",
    note: "แยกน้ำผึ้ง",
    items: [
      {
        menuId: "MENU04",
        menuName: "Tropical Mango Crunch Bowl",
        qty: 1,
        unitPrice: 185,
        totalPrice: 185,
        selectedAddons: [
          { id: "ADD02", name: "บลูเบอร์รีสด (25g)", price: 35, materialId: "MAT004", amountUsed: 25 }
        ]
      }
    ]
  }
];

// Safely load and normalize materials from localStorage
const storedMaterials = JSON.parse(localStorage.getItem("GY_MATERIALS")) || DEFAULT_MATERIALS;
const initialMaterials = storedMaterials.map(m => ({
  ...m,
  isDeleted: Boolean(m.isDeleted)
}));

// App Master State Object
const state = {
  currentTab: "dashboard",
  gasApiUrl: localStorage.getItem("GY_GAS_API_URL") || "",
  dashboardPeriod: "today", // 'today' | 'week' | 'month' | 'all'
  platforms: JSON.parse(localStorage.getItem("GY_PLATFORMS")) || DEFAULT_PLATFORMS,
  materials: initialMaterials,
  menus: JSON.parse(localStorage.getItem("GY_MENUS")) || DEFAULT_MENUS,
  addons: JSON.parse(localStorage.getItem("GY_ADDONS")) || DEFAULT_ADDONS,
  orders: JSON.parse(localStorage.getItem("GY_ORDERS")) || DEFAULT_ORDERS,
  stockTransactions: JSON.parse(localStorage.getItem("GY_STOCK_TRANS")) || [],
  presetEmojis: JSON.parse(localStorage.getItem("GY_PRESET_EMOJIS")) || DEFAULT_PRESET_EMOJIS,

  // POS In-Memory Session
  activePlatformId: "PLAT01",
  activePosCategory: "ทั้งหมด",
  posSearchQuery: "",
  cart: [], // items in current order
  currentCustomizingMenu: null, // menu being configured in POS modal
  selectedAddonsInModal: {}, // addonId -> qty

  // Add-on & Package Sub-tab
  addonPackageSubTab: "addons", // 'addons' | 'packages'
  packageFilterType: "ทั้งหมด",
  packageSearchQuery: "",
  stockFilterCategory: "ทั้งหมด",
  pendingDeleteMaterialId: null
};

// Save state to localStorage helper
function persistLocal() {
  localStorage.setItem("GY_PLATFORMS", JSON.stringify(state.platforms));
  localStorage.setItem("GY_MATERIALS", JSON.stringify(state.materials));
  localStorage.setItem("GY_MENUS", JSON.stringify(state.menus));
  localStorage.setItem("GY_ADDONS", JSON.stringify(state.addons));
  localStorage.setItem("GY_ORDERS", JSON.stringify(state.orders));
  localStorage.setItem("GY_STOCK_TRANS", JSON.stringify(state.stockTransactions));
  localStorage.setItem("GY_PRESET_EMOJIS", JSON.stringify(state.presetEmojis));
}

// ==========================================
// 2. INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // Update Current Date in Topbar
  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const dateEl = document.getElementById("current-date");
  if (dateEl) dateEl.innerText = dateStr;

  // Initialize UI components
  updateApiStatusPill();
  renderPresetEmojis();
  switchTab("dashboard");

  // If Google Apps Script URL exists, try to sync in background
  if (state.gasApiUrl) {
    syncWithGoogleSheet(true);
  }
});

// ==========================================
// 3. NAVIGATION & TABS
// ==========================================

function switchTab(tabId) {
  if (tabId === "addon-package") tabId = "addon";
  state.currentTab = tabId;

  // Update nav buttons style
  const navTabs = ["dashboard", "pos", "stock", "menu", "addon", "settings"];
  navTabs.forEach(tab => {
    const btn = document.getElementById(`nav-${tab}`);
    const view = document.getElementById(`view-${tab}`);
    if (tab === tabId) {
      if (btn) {
        btn.classList.add("bg-stone-900", "text-white", "shadow-sm");
        btn.classList.remove("text-stone-600", "hover:bg-stone-50");
      }
      if (view) view.classList.remove("hidden");
    } else {
      if (btn) {
        btn.classList.remove("bg-stone-900", "text-white", "shadow-sm");
        btn.classList.add("text-stone-600", "hover:bg-stone-50");
      }
      if (view) view.classList.add("hidden");
    }
  });

  // Update Topbar Title
  const titles = {
    dashboard: "แดชบอร์ดภาพรวม (Overview Dashboard)",
    pos: "ระบบขายหน้าร้าน (Point of Sale)",
    stock: "คลังสต็อก & วัตถุดิบ (Raw Materials & Stock)",
    menu: "จัดการเมนู (Menu Management)",
    addon: "จัดการ Add-on & ท็อปปิ้ง (Add-on Management)",
    settings: "การตั้งค่า & Preset Emojis (Settings)"
  };
  const topTitle = document.getElementById("top-title");
  if (topTitle) topTitle.innerText = titles[tabId] || "ระบบจัดการร้าน";

  // Render specific view
  if (tabId === "dashboard") renderDashboard();
  if (tabId === "pos") renderPos();
  if (tabId === "stock") renderStock();
  if (tabId === "menu") renderMenusManagement();
  if (tabId === "addon") renderAddonsManagement();
  if (tabId === "settings") renderSettings();

  lucide.createIcons();
}

// ==========================================
// 4. VIEW 1: DASHBOARD
// ==========================================

function setDashboardPeriod(period) {
  state.dashboardPeriod = period;

  const periods = ["today", "week", "month", "all"];
  periods.forEach(p => {
    const btn = document.getElementById(`dash-btn-${p}`);
    if (btn) {
      if (p === period) {
        btn.className = "period-btn px-3 py-1 text-xs font-semibold rounded-lg bg-white shadow-sm text-stone-900 transition-all";
      } else {
        btn.className = "period-btn px-3 py-1 text-xs font-medium rounded-lg text-stone-600 hover:text-stone-900 transition-all";
      }
    }
  });

  const periodLabels = {
    today: "วันนี้ (Today)",
    week: "7 วันล่าสุด (Past 7 Days)",
    month: "เดือนนี้ (This Month)",
    all: "ข้อมูลทั้งหมด (All Time)"
  };
  const labelEl = document.getElementById("dashboard-period-label");
  if (labelEl) {
    labelEl.innerHTML = `แสดงข้อมูล: <span class="text-stone-800 font-semibold">${periodLabels[period]}</span>`;
  }

  renderDashboard();
}

function filterOrdersByPeriod(orders, period) {
  const now = new Date();
  return orders.filter(order => {
    if (!order.createdAt) return true;
    const orderDate = new Date(order.createdAt);
    if (period === "today") {
      return orderDate.toDateString() === now.toDateString();
    } else if (period === "week") {
      const diffTime = Math.abs(now - orderDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } else if (period === "month") {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  });
}

function renderDashboard() {
  const filteredOrders = filterOrdersByPeriod(state.orders, state.dashboardPeriod);

  // Financial KPIs
  let grossSales = 0;
  let totalDiscount = 0;
  let totalGp = 0;
  let netRevenue = 0;
  let foodCost = 0;
  let grossProfit = 0;

  filteredOrders.forEach(o => {
    grossSales += Number(o.subtotal) || 0;
    totalDiscount += Number(o.discount) || 0;
    totalGp += Number(o.gpAmount) || 0;
    netRevenue += Number(o.netRevenue) || 0;
    foodCost += Number(o.foodCost) || 0;
    grossProfit += Number(o.grossProfit) || 0;
  });

  const marginPercent = netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : 0;

  // DOM Bindings
  document.getElementById("kpi-gross-sales").innerText = `฿${Math.round(grossSales).toLocaleString()}`;
  document.getElementById("kpi-net-revenue").innerText = `฿${Math.round(netRevenue).toLocaleString()}`;
  document.getElementById("kpi-gp-fee").innerText = `฿${Math.round(totalGp).toLocaleString()}`;
  document.getElementById("kpi-food-cost").innerText = `฿${Math.round(foodCost).toLocaleString()}`;
  document.getElementById("kpi-gross-profit").innerText = `฿${Math.round(grossProfit).toLocaleString()}`;
  document.getElementById("kpi-margin-percent").innerText = `${marginPercent}%`;
  document.getElementById("dashboard-total-orders-count").innerText = `${filteredOrders.length} บิล`;

  // Low Stock Check (Active materials only)
  const lowStockItems = state.materials.filter(m => !m.isDeleted && Number(m.stock) <= Number(m.minAlert));
  const lowStockBanner = document.getElementById("low-stock-banner");
  const stockAlertBadge = document.getElementById("stock-alert-badge");

  if (lowStockItems.length > 0) {
    if (lowStockBanner) {
      lowStockBanner.classList.remove("hidden");
      const names = lowStockItems.map(m => `${m.emoji || "📦"} ${m.name} (เหลือ ${m.stock} ${m.unit})`).join(", ");
      document.getElementById("low-stock-list-text").innerText = `มี ${lowStockItems.length} รายการ: ${names}`;
    }
    if (stockAlertBadge) {
      stockAlertBadge.innerText = lowStockItems.length;
      stockAlertBadge.classList.remove("hidden");
    }
  } else {
    if (lowStockBanner) lowStockBanner.classList.add("hidden");
    if (stockAlertBadge) stockAlertBadge.classList.add("hidden");
  }

  // Top Menus & Top Add-ons Calculation
  const menuCounts = {}; // name -> { count, revenue, emoji }
  const addonCounts = {}; // name -> { count, emoji }
  const platformCounts = {}; // name -> { count, gross, color }

  filteredOrders.forEach(o => {
    // Platform breakdown
    const pName = o.platformName || "หน้าร้าน";
    if (!platformCounts[pName]) {
      platformCounts[pName] = { count: 0, gross: 0, color: "#48BB78" };
    }
    platformCounts[pName].count += 1;
    platformCounts[pName].gross += Number(o.subtotal) || 0;

    // Items
    if (Array.isArray(o.items)) {
      o.items.forEach(item => {
        const mName = item.menuName;
        if (!menuCounts[mName]) {
          const mObj = state.menus.find(m => m.name === mName);
          menuCounts[mName] = { count: 0, revenue: 0, emoji: mObj ? mObj.emoji : "🥣" };
        }
        menuCounts[mName].count += Number(item.qty) || 1;
        menuCounts[mName].revenue += Number(item.totalPrice) || 0;

        // Addons
        if (Array.isArray(item.selectedAddons)) {
          item.selectedAddons.forEach(a => {
            if (!addonCounts[a.name]) {
              const aObj = state.addons.find(ad => ad.name === a.name);
              addonCounts[a.name] = { count: 0, emoji: aObj ? aObj.emoji : "🍓" };
            }
            addonCounts[a.name].count += Number(item.qty) || 1;
          });
        }
      });
    }
  });

  // Render Top Menus
  const topMenusList = document.getElementById("top-menus-list");
  const sortedMenus = Object.entries(menuCounts).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  if (sortedMenus.length === 0) {
    topMenusList.innerHTML = `<p class="text-xs text-stone-400 py-3 text-center">ยังไม่มีข้อมูลการขายในรอบนี้</p>`;
  } else {
    topMenusList.innerHTML = sortedMenus.map(([name, data], idx) => `
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center font-bold text-[10px] text-stone-600">${idx + 1}</span>
          <span class="text-base">${data.emoji}</span>
          <span class="font-medium text-stone-800 line-clamp-1">${name}</span>
        </div>
        <div class="text-right">
          <div class="font-semibold text-stone-900 font-number">฿${Math.round(data.revenue).toLocaleString()}</div>
          <div class="text-[10px] text-stone-400">${data.count} ที่</div>
        </div>
      </div>
    `).join("");
  }

  // Render Top Add-ons
  const topAddonsList = document.getElementById("top-addons-list");
  const sortedAddons = Object.entries(addonCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  if (sortedAddons.length === 0) {
    topAddonsList.innerHTML = `<p class="text-xs text-stone-400 py-3 text-center">ยังไม่มีข้อมูลการสั่ง Add-on</p>`;
  } else {
    topAddonsList.innerHTML = sortedAddons.map(([name, data], idx) => `
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center font-bold text-[10px] text-stone-600">${idx + 1}</span>
          <span class="text-base">${data.emoji}</span>
          <span class="font-medium text-stone-800 line-clamp-1">${name}</span>
        </div>
        <div class="text-right">
          <span class="font-semibold text-stone-900 font-number">${data.count} ครั้ง</span>
        </div>
      </div>
    `).join("");
  }

  // Render Platform Breakdown
  const platformList = document.getElementById("platform-breakdown-list");
  const platformEntries = Object.entries(platformCounts);
  if (platformEntries.length === 0) {
    platformList.innerHTML = `<p class="text-xs text-stone-400 py-3 text-center">ยังไม่มีข้อมูลออเดอร์</p>`;
  } else {
    platformList.innerHTML = platformEntries.map(([name, data]) => {
      const share = grossSales > 0 ? ((data.gross / grossSales) * 100).toFixed(0) : 0;
      return `
        <div class="space-y-1 text-xs">
          <div class="flex justify-between font-medium">
            <span class="text-stone-800">${name} (${data.count} บิล)</span>
            <span class="font-number text-stone-600">฿${Math.round(data.gross).toLocaleString()} (${share}%)</span>
          </div>
          <div class="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div class="bg-amber-700 h-full rounded-full" style="width: ${share}%"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Render Recent Orders Table
  const tbody = document.getElementById("recent-orders-tbody");
  const recentOrders = [...filteredOrders].reverse().slice(0, 10);
  if (recentOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-stone-400 text-xs">ยังไม่มีประวัติการขายในช่วงเวลานี้</td></tr>`;
  } else {
    tbody.innerHTML = recentOrders.map(o => {
      const d = new Date(o.createdAt);
      const timeStr = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      const dateOnlyStr = d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
      return `
        <tr class="hover:bg-stone-50/70 transition-colors">
          <td class="py-2.5 px-3 font-mono text-[11px] font-semibold text-stone-700">${o.orderId}</td>
          <td class="py-2.5 px-3 text-stone-500">${dateOnlyStr} ${timeStr}</td>
          <td class="py-2.5 px-3"><span class="badge-pill bg-stone-100 text-stone-700 font-medium">${o.platformName || "หน้าร้าน"}</span></td>
          <td class="py-2.5 px-3 text-right font-number font-semibold text-stone-900">฿${Math.round(o.subtotal || 0).toLocaleString()}</td>
          <td class="py-2.5 px-3 text-right font-number text-stone-400">-฿${Math.round(o.gpAmount || 0).toLocaleString()}</td>
          <td class="py-2.5 px-3 text-right font-number font-semibold text-emerald-700">฿${Math.round(o.netRevenue || 0).toLocaleString()}</td>
          <td class="py-2.5 px-3 text-right font-number font-semibold text-amber-800">฿${Math.round(o.grossProfit || 0).toLocaleString()}</td>
          <td class="py-2.5 px-3 text-center">
            <button onclick="viewOrderReceipt('${o.orderId}')" class="p-1 hover:text-amber-800 text-stone-400 rounded transition-colors" title="ดูใบเสร็จ">
              <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  lucide.createIcons();
}

// ==========================================
// 5. VIEW 2: POS SCREEN
// ==========================================

function renderPos() {
  renderPosPlatforms();
  renderPosCategories();
  renderPosMenus();
  renderCart();
}

function renderPosPlatforms() {
  const container = document.getElementById("pos-platform-chips");
  const activePlat = state.platforms.find(p => p.id === state.activePlatformId) || state.platforms[0];

  container.innerHTML = state.platforms.filter(p => p.isActive !== false).map(plat => {
    const isSelected = plat.id === state.activePlatformId;
    return `
      <button onclick="setPosPlatform('${plat.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
        isSelected 
          ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
      }">
        <span>${plat.name}</span>
        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-stone-700 text-amber-200' : 'bg-stone-100 text-stone-500'}">
          GP ${plat.gpPercent}%
        </span>
      </button>
    `;
  }).join("");

  document.getElementById("pos-active-gp-label").innerText = `ค่าธรรมเนียม GP: ${activePlat.gpPercent}%`;
  document.getElementById("cart-platform-name").innerText = activePlat.name;
}

function setPosPlatform(platformId) {
  state.activePlatformId = platformId;
  renderPosPlatforms();
  renderPosMenus(); // Re-render menu cards with updated platform prices
  recalculateCartForNewPlatform(); // Re-calculate items in cart for new platform
}

function renderPosCategories() {
  const categories = ["ทั้งหมด", ...new Set(state.menus.map(m => m.category || "Classic Bowls"))];
  const container = document.getElementById("pos-category-pills");

  container.innerHTML = categories.map(cat => {
    const isSelected = cat === state.activePosCategory;
    return `
      <button onclick="setPosCategory('${cat}')" class="px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${
        isSelected 
          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
      }">
        ${cat}
      </button>
    `;
  }).join("");
}

function setPosCategory(cat) {
  state.activePosCategory = cat;
  renderPosCategories();
  renderPosMenus();
}

function filterPosMenus() {
  state.posSearchQuery = document.getElementById("pos-search-input").value.toLowerCase().trim();
  renderPosMenus();
}

// =============================================================
// STOCK GUARD ENGINE & LOW-STOCK WARNING CONFIRMATION
// =============================================================

let pendingLowStockCallback = null;

/**
 * คำนวณความต้องการวัตถุดิบทั้งหมดของตะกร้าปัจจุบัน + รายการใหม่หรือการเพิ่มจำนวน
 * และตรวจสอบว่า:
 * 1. มีรายการไหนไม่พอ/หมดสต็อก (insufficient: ต้องห้ามเพิ่มเด็ดขาด)
 * 2. มีรายการไหนที่พอ แต่ทำให้เหลือต่ำกว่าหรือเท่ากับ minAlert (lowStock: ต้องขึ้น popup เตือน)
 */
function checkStockAvailability(candidateItem = null, candidateCartIndex = -1, candidateDelta = 0) {
  const reqMap = {}; // materialId -> totalQtyRequired

  // 1. คำนวณจากของในตะกร้าปัจจุบัน
  state.cart.forEach((item, idx) => {
    let effectiveQty = item.qty;
    if (idx === candidateCartIndex) {
      effectiveQty += candidateDelta;
    }
    if (effectiveQty > 0) {
      const menu = state.menus.find(m => m.id === item.menuId);
      const isPkgActive = !menu || menu.hasPackage !== false;
      (item.recipe || []).forEach(r => {
        const mat = state.materials.find(m => m.id === r.materialId);
        if (mat && isPackagingMaterial(mat) && !isPkgActive) return;
        reqMap[r.materialId] = (reqMap[r.materialId] || 0) + (Number(r.qty) * effectiveQty);
      });
      (item.selectedAddons || []).forEach(a => {
        if (a.materialId && a.amountUsed) {
          reqMap[a.materialId] = (reqMap[a.materialId] || 0) + (Number(a.amountUsed) * effectiveQty);
        }
      });
    }
  });

  // 2. คำนวณจาก Candidate Item (กรณีเพิ่มรายการใหม่จาก Modal)
  if (candidateItem) {
    const qty = candidateItem.qty || 1;
    const menu = state.menus.find(m => m.id === candidateItem.menuId);
    const isPkgActive = !menu || menu.hasPackage !== false;
    (candidateItem.recipe || []).forEach(r => {
      const mat = state.materials.find(m => m.id === r.materialId);
      if (mat && isPackagingMaterial(mat) && !isPkgActive) return;
      reqMap[r.materialId] = (reqMap[r.materialId] || 0) + (Number(r.qty) * qty);
    });
    (candidateItem.selectedAddons || []).forEach(a => {
      if (a.materialId && a.amountUsed) {
        reqMap[a.materialId] = (reqMap[a.materialId] || 0) + (Number(a.amountUsed) * qty);
      }
    });
  }

  // 3. ตรวจสอบกับ state.materials
  const insufficient = []; // ขาด / ไม่พอ (ห้ามเด็ดขาด)
  const lowStock = [];     // พอ แต่ต่ำกว่าเกณฑ์เตือน

  for (const matId in reqMap) {
    const mat = state.materials.find(m => m.id === matId);
    if (mat && !mat.isDeleted) {
      const required = reqMap[matId];
      const currentStock = Number(mat.stock) || 0;
      const minAlert = Number(mat.minAlert) || 0;
      const remaining = currentStock - required;

      if (remaining < 0) {
        // ห้ามเด็ดขาด!
        insufficient.push({
          mat: mat,
          currentStock: currentStock,
          required: required,
          deficit: Math.abs(remaining)
        });
      } else if (remaining <= minAlert) {
        // พอขายได้ แต่ใกล้หมดเกณฑ์เตือน!
        lowStock.push({
          mat: mat,
          remaining: remaining,
          currentStock: currentStock,
          minAlert: minAlert
        });
      }
    }
  }

  return {
    isAllowed: insufficient.length === 0,
    insufficient: insufficient,
    isLowStock: lowStock.length > 0,
    lowStock: lowStock
  };
}

function promptLowStockWarning(lowStockList, onConfirm) {
  const container = document.getElementById("low-stock-confirm-list");
  if (!container) return;

  container.innerHTML = lowStockList.map(item => `
    <div class="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
      <div class="flex items-center gap-2">
        <span class="text-lg">${item.mat.emoji || "📦"}</span>
        <div>
          <div class="font-bold text-stone-900">${item.mat.name}</div>
          <div class="text-[10px] text-stone-400">คงเหลือปัจจุบัน: ${item.currentStock.toLocaleString()} ${item.mat.unit}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="font-bold text-amber-900 font-number text-xs">จะเหลือ: ${item.remaining.toLocaleString()} ${item.mat.unit}</div>
        <div class="text-[10px] text-stone-500">จุดเตือน: ${item.minAlert.toLocaleString()} ${item.mat.unit}</div>
      </div>
    </div>
  `).join("");

  pendingLowStockCallback = onConfirm;
  openModal("modal-low-stock-confirm");
}

function confirmLowStockAction() {
  if (typeof pendingLowStockCallback === "function") {
    const cb = pendingLowStockCallback;
    pendingLowStockCallback = null;
    cb();
  }
  closeModal("modal-low-stock-confirm");
}

function cancelLowStockAction() {
  pendingLowStockCallback = null;
  closeModal("modal-low-stock-confirm");
}

function renderPosMenus() {
  const grid = document.getElementById("pos-menu-grid");
  const query = state.posSearchQuery;
  const currentCategory = state.activePosCategory;
  const currentPlatId = state.activePlatformId;

  const filteredMenus = state.menus.filter(m => {
    if (m.isActive === false) return false;
    const matchesCat = currentCategory === "ทั้งหมด" || m.category === currentCategory;
    const matchesQuery = !query || m.name.toLowerCase().includes(query) || (m.description && m.description.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  if (filteredMenus.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-12 text-center text-stone-400 text-xs">ไม่พบเมนูที่ตรงกับคำค้นหา</div>`;
    return;
  }

  grid.innerHTML = filteredMenus.map(menu => {
    const price = (menu.prices && menu.prices[currentPlatId]) !== undefined 
      ? menu.prices[currentPlatId] 
      : (menu.prices ? Object.values(menu.prices)[0] : 0);

    // Calculate maximum portions can be made from current stock
    let minPortions = Infinity;
    let bottleneckName = "";

    (menu.recipe || []).forEach(r => {
      const mat = state.materials.find(m => m.id === r.materialId);
      if (mat && !mat.isDeleted) {
        const canMake = Math.floor((Number(mat.stock) || 0) / (Number(r.qty) || 1));
        if (canMake < minPortions) {
          minPortions = canMake;
          bottleneckName = mat.name;
        }
      }
    });

    if (minPortions === Infinity) minPortions = 99;

    const isOutOfStock = minPortions <= 0;
    const isVeryLow = minPortions > 0 && minPortions <= 3;

    return `
      <div onclick="${isOutOfStock ? `showToast('⛔ เมนูนี้หมดสต็อก: ${bottleneckName} ไม่เพียงพอ', 'error')` : `openPosAddonModal('${menu.id}')`}" 
           class="editorial-card p-4 flex flex-col justify-between group transition-all ${
             isOutOfStock 
               ? 'opacity-60 bg-stone-100/60 cursor-not-allowed border-dashed border-stone-300' 
               : 'editorial-card-hover cursor-pointer'
           }">
        <div>
          <div class="flex items-start justify-between gap-2">
            <span class="text-3xl p-2 bg-stone-50 group-hover:bg-amber-50 rounded-2xl transition-colors">${menu.emoji || "🥣"}</span>
            <div class="flex flex-col items-end gap-1">
              <span class="badge-pill bg-stone-100 text-stone-600 text-[10px]">${menu.category || "Classic"}</span>
              ${isOutOfStock ? `<span class="badge-pill bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px]">หมดสต็อก (${bottleneckName})</span>` : ''}
              ${isVeryLow ? `<span class="badge-pill bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold">เหลือทำได้ ${minPortions} ที่</span>` : ''}
            </div>
          </div>
          <h4 class="font-bold text-sm text-stone-900 mt-3 group-hover:text-amber-900 transition-colors">${menu.name}</h4>
          <p class="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">${menu.description || ""}</p>
        </div>

        <div class="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <div class="text-[11px] text-stone-400 flex items-center gap-1">
            <i data-lucide="layers" class="w-3 h-3"></i>
            <span>${(menu.recipe || []).length} วัตถุดิบ</span>
          </div>
          <div class="text-base font-bold text-amber-900 font-number">฿${price}</div>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

// -------------------------------------------------------------
// POS Add-on Customization Drawer / Modal
// -------------------------------------------------------------
function openPosAddonModal(menuId) {
  const menu = state.menus.find(m => m.id === menuId);
  if (!menu) return;

  state.currentCustomizingMenu = menu;
  state.selectedAddonsInModal = {}; // Reset selections

  const currentPlatId = state.activePlatformId;
  const currentPlat = state.platforms.find(p => p.id === currentPlatId) || state.platforms[0];
  const basePrice = (menu.prices && menu.prices[currentPlatId]) !== undefined 
    ? Number(menu.prices[currentPlatId]) 
    : 0;

  document.getElementById("pos-modal-emoji").innerText = menu.emoji || "🥣";
  document.getElementById("pos-modal-title").innerText = menu.name;
  document.getElementById("pos-modal-desc").innerText = `ราคาฐาน: ฿${basePrice} (${currentPlat.name})`;

  // If menu does NOT allow add-ons (hasAddons is false): Quick add directly to cart!
  if (menu.hasAddons === false) {
    const candidateItem = {
      menuId: menu.id,
      menuName: menu.name,
      emoji: menu.emoji || "🥣",
      basePrice: basePrice,
      unitPrice: basePrice,
      qty: 1,
      recipe: menu.recipe || [],
      selectedAddons: []
    };

    const check = checkStockAvailability(candidateItem, -1, 0);
    if (!check.isAllowed) {
      const errList = check.insufficient.map(i => `• ${i.mat.emoji} ${i.mat.name} (ในคลังเหลือ ${i.currentStock} ${i.mat.unit})`).join("<br>");
      showToast(`⛔ ไม่สามารถสั่งเมนูนี้ได้: วัตถุดิบหมดสต็อกหรือไม่พอ!<br>${errList}`, "error");
      return;
    }

    const doAdd = () => {
      state.cart.push(candidateItem);
      renderCart();
      showToast(`เพิ่ม "${menu.name}" ลงในออเดอร์แล้ว (ไม่มี Add-on)`, "success");
    };

    if (check.isLowStock) {
      promptLowStockWarning(check.lowStock, doAdd);
    } else {
      doAdd();
    }
    return;
  }

  // Render Add-on categories
  const container = document.getElementById("pos-modal-addons-container");
  const activeAddons = state.addons.filter(a => a.isActive !== false);

  const categories = [...new Set(activeAddons.map(a => a.category || "ผลไม้สด"))];

  container.innerHTML = categories.map(cat => {
    const addonsInCat = activeAddons.filter(a => a.category === cat);
    return `
      <div class="space-y-2">
        <h5 class="text-xs font-bold text-stone-600 uppercase tracking-wider">${cat}</h5>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${addonsInCat.map(addon => {
            const addPrice = (addon.prices && addon.prices[currentPlatId]) !== undefined 
              ? Number(addon.prices[currentPlatId]) 
              : 0;
            const mat = state.materials.find(m => m.id === addon.materialId);
            const isAddonOut = mat ? (Number(mat.stock) < Number(addon.amountUsed)) : false;

            return `
              <label class="flex items-center justify-between p-2.5 rounded-xl border transition-colors text-xs ${
                isAddonOut 
                  ? 'bg-stone-100 border-stone-200 opacity-50 cursor-not-allowed' 
                  : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50/30 cursor-pointer'
              }">
                <div class="flex items-center gap-2">
                  <input type="checkbox" ${isAddonOut ? 'disabled' : ''} onchange="toggleAddonInModal('${addon.id}', this.checked)" class="rounded text-amber-800 focus:ring-amber-800">
                  <span class="text-base">${addon.emoji || "🍓"}</span>
                  <span class="font-medium text-stone-800">${addon.name}</span>
                </div>
                ${isAddonOut 
                  ? `<span class="badge-pill bg-rose-100 text-rose-700 text-[10px] font-bold">หมด</span>` 
                  : `<span class="font-semibold text-amber-900 font-number">+฿${addPrice}</span>`}
              </label>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  updatePosModalTotalPrice();
  openModal("modal-pos-addon");
}

function toggleAddonInModal(addonId, isChecked) {
  if (isChecked) {
    state.selectedAddonsInModal[addonId] = 1;
  } else {
    delete state.selectedAddonsInModal[addonId];
  }
  updatePosModalTotalPrice();
}

function updatePosModalTotalPrice() {
  if (!state.currentCustomizingMenu) return;
  const currentPlatId = state.activePlatformId;
  const menu = state.currentCustomizingMenu;
  const basePrice = (menu.prices && menu.prices[currentPlatId]) !== undefined ? Number(menu.prices[currentPlatId]) : 0;

  let addonsTotal = 0;
  for (const addonId in state.selectedAddonsInModal) {
    const addon = state.addons.find(a => a.id === addonId);
    if (addon) {
      const price = (addon.prices && addon.prices[currentPlatId]) !== undefined ? Number(addon.prices[currentPlatId]) : 0;
      addonsTotal += price * state.selectedAddonsInModal[addonId];
    }
  }

  const grandTotal = basePrice + addonsTotal;
  document.getElementById("pos-modal-total-price").innerText = `฿${grandTotal}`;
}

function confirmAddPosItemToCart() {
  if (!state.currentCustomizingMenu) return;

  const currentPlatId = state.activePlatformId;
  const menu = state.currentCustomizingMenu;
  const basePrice = (menu.prices && menu.prices[currentPlatId]) !== undefined ? Number(menu.prices[currentPlatId]) : 0;

  const chosenAddons = [];
  let addonsPriceSum = 0;

  for (const addonId in state.selectedAddonsInModal) {
    const addon = state.addons.find(a => a.id === addonId);
    if (addon) {
      const price = (addon.prices && addon.prices[currentPlatId]) !== undefined ? Number(addon.prices[currentPlatId]) : 0;
      chosenAddons.push({
        id: addon.id,
        name: addon.name,
        emoji: addon.emoji,
        price: price,
        materialId: addon.materialId,
        amountUsed: addon.amountUsed
      });
      addonsPriceSum += price;
    }
  }

  const unitPrice = basePrice + addonsPriceSum;

  const candidateItem = {
    menuId: menu.id,
    menuName: menu.name,
    emoji: menu.emoji || "🥣",
    basePrice: basePrice,
    unitPrice: unitPrice,
    qty: 1,
    recipe: menu.recipe || [],
    selectedAddons: chosenAddons
  };

  // Check stock availability
  const check = checkStockAvailability(candidateItem, -1, 0);

  if (!check.isAllowed) {
    // ห้ามเพิ่มเด็ดขาด!
    const errList = check.insufficient.map(i => `• ${i.mat.emoji} ${i.mat.name} (ในคลังเหลือ ${i.currentStock} ${i.mat.unit})`).join("<br>");
    showToast(`⛔ ไม่สามารถสั่งเมนูนี้ได้: วัตถุดิบหมดสต็อกหรือไม่พอ!<br>${errList}`, "error");
    return;
  }

  const doAdd = () => {
    state.cart.push(candidateItem);
    closeModal("modal-pos-addon");
    renderCart();
    showToast(`เพิ่ม "${menu.name}" ลงในออเดอร์แล้ว`, "success");
  };

  if (check.isLowStock) {
    // เตือนเมื่อใกล้หมด และให้กดยืนยันดำเนินการต่อ
    promptLowStockWarning(check.lowStock, doAdd);
  } else {
    doAdd();
  }
}

// -------------------------------------------------------------
// Cart Logic & Breakdown
// -------------------------------------------------------------
function recalculateCartForNewPlatform() {
  const currentPlatId = state.activePlatformId;
  state.cart.forEach(item => {
    const menu = state.menus.find(m => m.id === item.menuId);
    if (menu) {
      item.basePrice = (menu.prices && menu.prices[currentPlatId]) !== undefined ? Number(menu.prices[currentPlatId]) : item.basePrice;
    }

    let addonsSum = 0;
    item.selectedAddons.forEach(a => {
      const addon = state.addons.find(ad => ad.id === a.id);
      if (addon) {
        a.price = (addon.prices && addon.prices[currentPlatId]) !== undefined ? Number(addon.prices[currentPlatId]) : a.price;
        addonsSum += a.price;
      }
    });

    item.unitPrice = item.basePrice + addonsSum;
  });

  renderCart();
}

function updateCartItemQty(index, delta) {
  if (!state.cart[index]) return;

  if (delta > 0) {
    // Check stock for incrementing this item
    const check = checkStockAvailability(null, index, delta);

    if (!check.isAllowed) {
      // ห้าม + เพิ่มเด็ดขาด!
      const errList = check.insufficient.map(i => `• ${i.mat.emoji} ${i.mat.name} (ในคลังเหลือเพียง ${i.currentStock} ${i.mat.unit})`).join("<br>");
      showToast(`⛔ ห้ามเพิ่มจำนวน: วัตถุดิบหมดสต็อกหรือไม่พอทำเพิ่ม!<br>${errList}`, "error");
      return;
    }

    if (check.isLowStock) {
      // เตือนวัตถุดิบใกล้หมด และถามยืนยันเพื่อดำเนินการต่อ
      promptLowStockWarning(check.lowStock, () => {
        state.cart[index].qty += delta;
        renderCart();
      });
      return;
    }

    // Normal increment
    state.cart[index].qty += delta;
    renderCart();
  } else {
    // Decrement
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) {
      state.cart.splice(index, 1);
    }
    renderCart();
  }
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  state.cart = [];
  document.getElementById("cart-discount-input").value = 0;
  document.getElementById("cart-note-input").value = "";
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items-container");
  const posBadge = document.getElementById("pos-badge");

  const totalItemsCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
  if (posBadge) {
    if (totalItemsCount > 0) {
      posBadge.innerText = totalItemsCount;
      posBadge.classList.remove("hidden");
    } else {
      posBadge.classList.add("hidden");
    }
  }

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-stone-400 space-y-2">
        <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto text-stone-300"></i>
        <p class="text-xs">ยังไม่มีรายการในออเดอร์</p>
        <p class="text-[11px] text-stone-300">คลิกเมนูทางซ้ายเพื่อเลือกรายการ</p>
      </div>
    `;
    updateCartTotals();
    lucide.createIcons();
    return;
  }

  container.innerHTML = state.cart.map((item, idx) => {
    const itemTotal = item.unitPrice * item.qty;
    return `
      <div class="p-3 bg-stone-50 rounded-xl space-y-1.5 text-xs">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-2">
            <span class="text-base">${item.emoji}</span>
            <div>
              <h5 class="font-bold text-stone-900">${item.menuName}</h5>
              <div class="text-[11px] text-stone-400 font-number">฿${item.unitPrice} / ชิ้น</div>
            </div>
          </div>
          <div class="font-bold text-stone-900 font-number">฿${itemTotal}</div>
        </div>

        <!-- Addons list -->
        ${item.selectedAddons && item.selectedAddons.length > 0 ? `
          <div class="pl-6 space-y-0.5 text-[11px] text-stone-500 border-l border-stone-200 ml-2">
            ${item.selectedAddons.map(a => `
              <div class="flex justify-between">
                <span>+ ${a.emoji || ""} ${a.name}</span>
                <span class="font-number">+฿${a.price}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <!-- Stepper -->
        <div class="flex items-center justify-between pt-1 border-t border-stone-200/60 mt-1">
          <button onclick="removeCartItem(${idx})" class="text-[10px] text-rose-600 hover:underline">ลบ</button>
          <div class="flex items-center gap-2">
            <button onclick="updateCartItemQty(${idx}, -1)" class="w-6 h-6 rounded-lg bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 hover:bg-stone-100">-</button>
            <span class="font-bold text-stone-900 font-number w-4 text-center">${item.qty}</span>
            <button onclick="updateCartItemQty(${idx}, 1)" class="w-6 h-6 rounded-lg bg-white border border-stone-200 flex items-center justify-center font-bold text-stone-600 hover:bg-stone-100">+</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  updateCartTotals();
  lucide.createIcons();
}

function updateCartTotals() {
  const currentPlat = state.platforms.find(p => p.id === state.activePlatformId) || state.platforms[0];
  const gpPercent = Number(currentPlat.gpPercent) || 0;

  let subtotal = 0;
  let estimatedFoodCost = 0;

  // Material cost mapping
  const matCostMap = {};
  state.materials.forEach(m => matCostMap[m.id] = Number(m.unitCost) || 0);

  state.cart.forEach(item => {
    subtotal += item.unitPrice * item.qty;

    // Estimate food cost
    let itemCost = 0;
    (item.recipe || []).forEach(r => {
      const cost = matCostMap[r.materialId] || 0;
      itemCost += (Number(r.qty) || 0) * cost;
    });
    (item.selectedAddons || []).forEach(a => {
      if (a.materialId && a.amountUsed) {
        const cost = matCostMap[a.materialId] || 0;
        itemCost += (Number(a.amountUsed) || 0) * cost;
      }
    });

    estimatedFoodCost += itemCost * item.qty;
  });

  const discount = Math.max(0, Number(document.getElementById("cart-discount-input").value) || 0);
  const gpAmount = Math.max(0, (subtotal - discount) * (gpPercent / 100));
  const finalTotal = Math.max(0, subtotal - discount);

  document.getElementById("cart-subtotal").innerText = `฿${subtotal.toLocaleString()}`;
  document.getElementById("cart-discount-display").innerText = `-฿${discount.toLocaleString()}`;
  document.getElementById("cart-gp-label").innerText = `หัก GP (${gpPercent}%)`;
  document.getElementById("cart-gp-display").innerText = `-฿${Math.round(gpAmount).toLocaleString()}`;
  document.getElementById("cart-cogs-display").innerText = `฿${Math.round(estimatedFoodCost).toLocaleString()}`;
  document.getElementById("cart-total").innerText = `฿${finalTotal.toLocaleString()}`;
}

// -------------------------------------------------------------
// Submit Order & Stock Deduction
// -------------------------------------------------------------
async function submitOrder() {
  if (state.cart.length === 0) {
    showToast("กรุณาเลือกเมนูอย่างน้อย 1 รายการ", "error");
    return;
  }

  const btn = document.getElementById("btn-checkout");
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin mr-2">⏳</span> กำลังบันทึกออเดอร์...`;

  try {
    const currentPlat = state.platforms.find(p => p.id === state.activePlatformId) || state.platforms[0];
    const discount = Math.max(0, Number(document.getElementById("cart-discount-input").value) || 0);
    const note = document.getElementById("cart-note-input").value.trim();
    const paymentMethod = document.getElementById("cart-payment-method").value;

    let subtotal = 0;
    state.cart.forEach(item => subtotal += item.unitPrice * item.qty);

    const gpAmount = (subtotal - discount) * (currentPlat.gpPercent / 100);
    const netRevenue = (subtotal - discount) - gpAmount;

    // Prepare payload
    const orderPayload = {
      platformId: currentPlat.id,
      platformName: currentPlat.name,
      gpPercent: currentPlat.gpPercent,
      subtotal: subtotal,
      discount: discount,
      gpAmount: gpAmount,
      netRevenue: netRevenue,
      paymentMethod: paymentMethod,
      note: note,
      items: state.cart.map(item => ({
        menuId: item.menuId,
        menuName: item.menuName,
        qty: item.qty,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.qty,
        recipe: item.recipe,
        selectedAddons: item.selectedAddons
      }))
    };

    // Calculate deductions locally
    let totalFoodCost = 0;
    const now = new Date();
    const orderId = "ORD-" + now.toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.floor(Math.random() * 900 + 100);

    const stockDeductions = {};
    state.cart.forEach(item => {
      const menu = state.menus.find(m => m.id === item.menuId);
      const isPkgActive = !menu || menu.hasPackage !== false;
      (item.recipe || []).forEach(r => {
        const mat = state.materials.find(m => m.id === r.materialId);
        if (mat && isPackagingMaterial(mat) && !isPkgActive) return; // Skip if packaging switch is OFF
        stockDeductions[r.materialId] = (stockDeductions[r.materialId] || 0) + (Number(r.qty) * item.qty);
      });
      (item.selectedAddons || []).forEach(a => {
        if (a.materialId && a.amountUsed) {
          stockDeductions[a.materialId] = (stockDeductions[a.materialId] || 0) + (Number(a.amountUsed) * item.qty);
        }
      });
    });

    // Apply deductions to state.materials
    for (const matId in stockDeductions) {
      const mat = state.materials.find(m => m.id === matId);
      if (mat) {
        const deduct = stockDeductions[matId];
        totalFoodCost += deduct * Number(mat.unitCost || 0);
        mat.stock = Math.max(0, Number(mat.stock) - deduct);

        state.stockTransactions.unshift({
          transId: "TR-" + Date.now() + "-" + matId,
          createdAt: now.toISOString(),
          materialId: matId,
          materialName: mat.name,
          type: "SALE",
          changeQty: -deduct,
          balanceAfter: mat.stock,
          unitCost: mat.unitCost,
          note: `บิล #${orderId}`
        });
      }
    }

    const grossProfit = netRevenue - totalFoodCost;

    const newOrderRecord = {
      orderId: orderId,
      createdAt: now.toISOString(),
      platformId: currentPlat.id,
      platformName: currentPlat.name,
      subtotal: subtotal,
      discount: discount,
      gpAmount: gpAmount,
      netRevenue: netRevenue,
      foodCost: totalFoodCost,
      grossProfit: grossProfit,
      paymentMethod: paymentMethod,
      note: note,
      items: orderPayload.items
    };

    state.orders.push(newOrderRecord);
    persistLocal();

    // If Google Sheet API URL is configured, push to Google Sheets!
    if (state.gasApiUrl) {
      fetch(state.gasApiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createOrder", data: orderPayload })
      }).catch(err => console.warn("Google Sheet background push notice:", err));
    }

    showToast("บันทึกการขายและตัดสต็อกสำเร็จ!", "success");

    // Show Receipt Modal
    displayReceiptModal(newOrderRecord);

    // Clear POS cart
    clearCart();
  } catch (err) {
    showToast("เกิดข้อผิดพลาดในการบันทึก: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i><span>ยืนยันการขาย & ตัดสต็อก</span>`;
    lucide.createIcons();
  }
}

function displayReceiptModal(order) {
  document.getElementById("receipt-order-id").innerText = order.orderId;
  document.getElementById("receipt-date").innerText = new Date(order.createdAt).toLocaleString("th-TH");

  const itemsList = document.getElementById("receipt-items-list");
  itemsList.innerHTML = order.items.map(i => `
    <div class="space-y-0.5">
      <div class="flex justify-between font-bold">
        <span>${i.qty}x ${i.menuName}</span>
        <span>฿${i.totalPrice}</span>
      </div>
      ${i.selectedAddons && i.selectedAddons.length > 0 ? `
        <div class="pl-2 text-[10px] text-stone-500">
          ${i.selectedAddons.map(a => `+ ${a.name} (฿${a.price})`).join(", ")}
        </div>
      ` : ""}
    </div>
  `).join("");

  document.getElementById("receipt-subtotal").innerText = `฿${order.subtotal}`;
  document.getElementById("receipt-discount").innerText = `-฿${order.discount}`;
  document.getElementById("receipt-gp").innerText = `-฿${Math.round(order.gpAmount)}`;
  document.getElementById("receipt-total").innerText = `฿${order.subtotal - order.discount}`;
  document.getElementById("receipt-payment-info").innerText = `${order.platformName} • ${order.paymentMethod}`;

  openModal("modal-receipt");
}

function viewOrderReceipt(orderId) {
  const order = state.orders.find(o => o.orderId === orderId);
  if (order) displayReceiptModal(order);
}

// ==========================================
// 6. VIEW 3: STOCK MANAGEMENT
// ==========================================

function renderStock() {
  renderStockFilters();
  renderStockTable();
  renderStockTransactions();
}

function renderStockFilters() {
  const activeMaterials = state.materials.filter(m => !m.isDeleted);
  const categories = ["ทั้งหมด", ...new Set(activeMaterials.map(m => m.category || "General"))];
  const container = document.getElementById("stock-category-filters");
  if (!container) return;

  const deletedCount = state.materials.filter(m => m.isDeleted).length;

  let html = categories.map(cat => {
    const isSelected = cat === state.stockFilterCategory;
    return `
      <button onclick="setStockFilterCategory('${cat}')" class="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
        isSelected ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }">
        ${cat}
      </button>
    `;
  }).join("");

  // Add "ที่ลบแล้ว" filter pill
  const isDeletedSelected = state.stockFilterCategory === "ARCHIVED";
  html += `
    <button onclick="setStockFilterCategory('ARCHIVED')" class="px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
      isDeletedSelected ? 'bg-rose-900 text-white shadow-sm' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
    }">
      <span>🗑️ ที่ลบแล้ว</span>
      ${deletedCount > 0 ? `<span class="px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded-full text-[10px] font-bold">${deletedCount}</span>` : ''}
    </button>
  `;

  container.innerHTML = html;
}

function setStockFilterCategory(cat) {
  state.stockFilterCategory = cat;
  renderStockFilters();
  renderStockTable();
}

function renderStockTable() {
  const tbody = document.getElementById("stock-table-tbody");
  if (!tbody) return;

  const isArchivedView = state.stockFilterCategory === "ARCHIVED";

  let filtered = [];
  if (isArchivedView) {
    filtered = state.materials.filter(m => m.isDeleted);
    document.getElementById("stock-count-label").innerText = `${filtered.length} รายการที่ลบแล้ว (เก็บประวัติ)`;
  } else {
    const activeMaterials = state.materials.filter(m => !m.isDeleted);
    filtered = activeMaterials.filter(m => state.stockFilterCategory === "ทั้งหมด" || m.category === state.stockFilterCategory);
    document.getElementById("stock-count-label").innerText = `${filtered.length} รายการ`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-stone-400 text-xs">
          ${isArchivedView ? 'ไม่มีวัตถุดิบที่ถูกลบ (ถังขยะว่าง)' : 'ไม่พบวัตถุดิบในหมวดหมู่นี้'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(mat => {
    const isLow = Number(mat.stock) <= Number(mat.minAlert);
    const isOut = Number(mat.stock) <= 0;
    const totalVal = Math.round(Number(mat.stock) * Number(mat.unitCost));

    let statusPill = `<span class="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">ปกติ</span>`;
    if (mat.isDeleted) {
      statusPill = `<span class="badge-pill bg-stone-100 text-stone-500 border border-stone-200">ถูกลบ (เก็บประวัติ)</span>`;
    } else if (isOut) {
      statusPill = `<span class="badge-pill bg-rose-100 text-rose-800 border border-rose-200 font-bold">หมดสต็อก</span>`;
    } else if (isLow) {
      statusPill = `<span class="badge-pill bg-amber-50 text-amber-700 border border-amber-200 font-semibold animate-pulse">ใกล้หมด</span>`;
    }

    // Sub-ingredient badge
    const subBadge = mat.isSubIngredient
      ? `<span class="badge-pill bg-purple-100 text-purple-800 border border-purple-300 text-[10px] ml-1.5 font-semibold">วัตถุดิบรอง</span>`
      : '';

    // Action buttons depending on active vs archived
    let actionButtons = '';
    if (mat.isDeleted) {
      actionButtons = `
        <button onclick="restoreMaterial('${mat.id}')" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors" title="กู้คืนกลับมาใช้งาน">
          <span>↩️ กู้คืน</span>
        </button>
      `;
    } else {
      actionButtons = `
        <div class="inline-flex items-center gap-1">
          <button onclick="quickStockIn('${mat.id}')" class="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold transition-colors" title="รับของเข้า">
            + เติม
          </button>
          <button onclick="quickStockAdjust('${mat.id}')" class="px-2 py-1 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded text-[11px] font-semibold transition-colors" title="ปรับยอด/ของเสีย">
            ปรับ
          </button>
          <button onclick="openMaterialEditModal('${mat.id}')" class="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-[11px] font-semibold transition-colors" title="แก้ไขข้อมูล">
            แก้ไข
          </button>
          <button onclick="promptDeleteMaterial('${mat.id}')" class="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold transition-colors" title="ลบวัตถุดิบ (เก็บประวัติเดิม)">
            ลบ
          </button>
        </div>
      `;
    }

    return `
      <tr class="hover:bg-stone-50/70 transition-colors ${mat.isDeleted ? 'opacity-70 bg-stone-50/40' : ''}">
        <td class="py-3 px-4 font-semibold text-stone-900 flex items-center gap-2.5">
          <span class="text-xl p-1 bg-stone-100 rounded-lg">${mat.emoji || "📦"}</span>
          <div>
            <div class="flex items-center">${mat.name} ${subBadge}</div>
            <div class="text-[10px] text-stone-400 font-mono">${mat.id}</div>
          </div>
        </td>
        <td class="py-3 px-4 text-stone-500">${mat.category}</td>
        <td class="py-3 px-4 text-right font-number font-bold ${isLow && !mat.isDeleted ? 'text-rose-600' : 'text-stone-800'}">
          ${mat.stock.toLocaleString()} <span class="text-[10px] text-stone-400 font-normal">${mat.unit}</span>
        </td>
        <td class="py-3 px-4 text-right font-number text-stone-400">
          ${mat.minAlert.toLocaleString()} ${mat.unit}
        </td>
        <td class="py-3 px-4 text-right font-number text-stone-600">
          ฿${Number(mat.unitCost).toFixed(2)}
        </td>
        <td class="py-3 px-4 text-right font-number font-semibold text-stone-900">
          ฿${totalVal.toLocaleString()}
        </td>
        <td class="py-3 px-4 text-center">${statusPill}</td>
        <td class="py-3 px-4 text-center">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join("");
}

function renderStockTransactions() {
  const tbody = document.getElementById("stock-transactions-tbody");
  const recent = state.stockTransactions.slice(0, 15);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-stone-400 text-xs">ยังไม่มีประวัติความเคลื่อนไหวสต็อก</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(t => {
    const isDeduct = Number(t.changeQty) < 0;
    const dateStr = new Date(t.createdAt).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

    let typeBadge = `<span class="badge-pill bg-stone-100 text-stone-700">${t.type}</span>`;
    if (t.type === "SALE") typeBadge = `<span class="badge-pill bg-blue-50 text-blue-700">ขาย</span>`;
    if (t.type === "RESTOCK_IN") typeBadge = `<span class="badge-pill bg-emerald-50 text-emerald-700">รับเข้า</span>`;
    if (t.type === "PREP_USE") typeBadge = `<span class="badge-pill bg-purple-50 text-purple-700">ใช้แปรรูป</span>`;
    if (t.type === "PREP_YIELD") typeBadge = `<span class="badge-pill bg-amber-50 text-amber-800">ผลผลิต</span>`;
    if (t.type === "WASTE") typeBadge = `<span class="badge-pill bg-rose-50 text-rose-700">ของเสีย</span>`;

    return `
      <tr class="hover:bg-stone-50/70 transition-colors">
        <td class="py-2.5 px-3 text-stone-500">${dateStr}</td>
        <td class="py-2.5 px-3 font-semibold text-stone-800">${t.materialName}</td>
        <td class="py-2.5 px-3">${typeBadge}</td>
        <td class="py-2.5 px-3 text-right font-number font-bold ${isDeduct ? 'text-rose-600' : 'text-emerald-700'}">
          ${isDeduct ? '' : '+'}${t.changeQty}
        </td>
        <td class="py-2.5 px-3 text-right font-number text-stone-600">${t.balanceAfter}</td>
        <td class="py-2.5 px-3 text-stone-400">${t.note || "-"}</td>
      </tr>
    `;
  }).join("");
}

// -------------------------------------------------------------
// Stock Modals triggers & Conversion from Sub-ingredients
// -------------------------------------------------------------
function openStockInModal(presetMatId = null) {
  // Reset switch toggle to unchecked (Normal mode by default)
  const toggle = document.getElementById("stock-in-mode-toggle");
  if (toggle) toggle.checked = false;
  toggleStockInMode(false);

  // Normal Restock setup (Active materials only)
  const activeMaterials = state.materials.filter(m => !m.isDeleted);
  const sel = document.getElementById("stock-in-material-id");
  sel.innerHTML = activeMaterials.map(m => `
    <option value="${m.id}" ${m.id === presetMatId ? 'selected' : ''}>
      ${m.emoji} ${m.name} (${m.stock} ${m.unit}) ${m.isSubIngredient ? '[วัตถุดิบรอง]' : ''}
    </option>
  `).join("");
  document.getElementById("stock-in-qty").value = "";
  document.getElementById("stock-in-unit-cost").value = "";
  document.getElementById("stock-in-note").value = "";

  // Conversion Setup (Only ready-made / finished items can be target)
  const targetSel = document.getElementById("stock-conversion-target-mat");
  targetSel.innerHTML = activeMaterials.filter(m => !m.isSubIngredient).map(m => `
    <option value="${m.id}" ${m.id === (presetMatId || "MAT001") ? 'selected' : ''}>
      ${m.emoji} ${m.name} (คงเหลือ: ${m.stock} ${m.unit})
    </option>
  `).join("");

  document.getElementById("stock-conversion-note").value = "";

  // Setup default sub-ingredient rows (Fresh Milk + Starter Yogurt)
  setupDefaultSubIngredientRows();

  openModal("modal-stock-in");
}

function toggleStockInMode(isConversion) {
  const normalSec = document.getElementById("stock-in-normal-section");
  const convSec = document.getElementById("stock-in-conversion-section");
  const btn = document.getElementById("btn-submit-stock-in");

  if (isConversion) {
    if (normalSec) normalSec.classList.add("hidden");
    if (convSec) convSec.classList.remove("hidden");
    if (btn) btn.innerText = "ยืนยันการแปรรูป & ตัดวัตถุดิบรอง";
    calculateConversionCostPreview();
  } else {
    if (normalSec) normalSec.classList.remove("hidden");
    if (convSec) convSec.classList.add("hidden");
    if (btn) btn.innerText = "บันทึกรับเข้า";
  }
}

function setupDefaultSubIngredientRows() {
  const container = document.getElementById("sub-ingredient-rows-container");
  if (!container) return;
  container.innerHTML = "";

  // Find fresh milk (MAT002) and starter (MAT003)
  const milk = state.materials.find(m => m.id === "MAT002" || m.name.includes("นม"));
  addSubIngredientRow(milk ? milk.id : (state.materials[1]?.id || ""), 5000);

  const starter = state.materials.find(m => m.id === "MAT003" || m.name.includes("หัวเชื้อ") || m.name.includes("โยเกิร์ต"));
  addSubIngredientRow(starter ? starter.id : (state.materials[2]?.id || ""), 500);

  document.getElementById("stock-conversion-yield-qty").value = 1500;
  calculateConversionCostPreview();
}

function addSubIngredientRow(selectedMatId = "", qty = 1000) {
  const container = document.getElementById("sub-ingredient-rows-container");
  if (!container) return;

  const rowDiv = document.createElement("div");
  rowDiv.className = "sub-ing-row flex items-center gap-2 p-2 bg-white rounded-lg border border-stone-200 text-xs";

  const activeMaterials = state.materials.filter(m => !m.isDeleted);
  rowDiv.innerHTML = `
    <select onchange="updateSubIngUnit(this)" class="sub-mat-select flex-1 px-2 py-1.5 border border-stone-300 rounded-lg text-xs bg-white font-medium">
      ${activeMaterials.map(m => `
        <option value="${m.id}" data-unit="${m.unit}" data-cost="${m.unitCost}" data-stock="${m.stock}" ${m.id === selectedMatId ? 'selected' : ''}>
          ${m.emoji} ${m.name} (ในคลัง: ${m.stock} ${m.unit}) ${m.isSubIngredient ? '[รอง]' : ''}
        </option>
      `).join("")}
    </select>
    <div class="relative w-28 shrink-0">
      <input type="number" step="any" value="${qty}" oninput="calculateConversionCostPreview()" placeholder="ปริมาณ" class="sub-qty-input w-full px-2 py-1.5 border border-stone-300 rounded-lg text-xs font-number font-bold text-stone-800">
      <span class="sub-unit-label absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">หน่วย</span>
    </div>
    <button type="button" onclick="this.parentElement.remove(); calculateConversionCostPreview();" class="p-1 text-stone-400 hover:text-rose-600 rounded">
      ✕
    </button>
  `;

  container.appendChild(rowDiv);
  const sel = rowDiv.querySelector(".sub-mat-select");
  updateSubIngUnit(sel);
}

function updateSubIngUnit(selectEl) {
  if (!selectEl) return;
  const opt = selectEl.options[selectEl.selectedIndex];
  if (opt) {
    const unit = opt.dataset.unit || "";
    const row = selectEl.closest(".sub-ing-row");
    if (row) {
      const label = row.querySelector(".sub-unit-label");
      if (label) label.innerText = unit;
    }
  }
  calculateConversionCostPreview();
}

function calculateConversionCostPreview() {
  const rows = document.querySelectorAll(".sub-ing-row");
  let totalCost = 0;

  rows.forEach(row => {
    const sel = row.querySelector(".sub-mat-select");
    const qtyInp = row.querySelector(".sub-qty-input");
    if (sel && qtyInp) {
      const opt = sel.options[sel.selectedIndex];
      const cost = Number(opt?.dataset?.cost) || 0;
      const qty = Number(qtyInp.value) || 0;
      totalCost += qty * cost;
    }
  });

  const yieldQty = Number(document.getElementById("stock-conversion-yield-qty")?.value) || 0;
  const targetSel = document.getElementById("stock-conversion-target-mat");
  const targetMat = state.materials.find(m => m.id === targetSel?.value);
  const unitName = targetMat ? targetMat.unit : "กรัม";

  const unitCost = yieldQty > 0 ? (totalCost / yieldQty) : 0;

  const costEl = document.getElementById("preview-sub-cost");
  const yieldEl = document.getElementById("preview-yield-qty");
  const unitCostEl = document.getElementById("preview-unit-cost");

  if (costEl) costEl.innerText = `฿${totalCost.toFixed(2)}`;
  if (yieldEl) yieldEl.innerText = `${yieldQty.toLocaleString()} ${unitName}`;
  if (unitCostEl) unitCostEl.innerText = `฿${unitCost.toFixed(3)} / ${unitName}`;
}

function quickStockIn(matId) {
  openStockInModal(matId);
}

function submitStockIn() {
  const isConversion = document.getElementById("stock-in-mode-toggle")?.checked;

  if (isConversion) {
    // ------------------------------------
    // CONVERSION FROM SUB-INGREDIENTS MODE
    // ------------------------------------
    const targetMatId = document.getElementById("stock-conversion-target-mat").value;
    const yieldQty = Number(document.getElementById("stock-conversion-yield-qty").value);
    const note = document.getElementById("stock-conversion-note").value.trim();

    if (!yieldQty || yieldQty <= 0) {
      showToast("กรุณาระบุปริมาณผลผลิตที่ได้จริงหลังกรอง (Yield)", "error");
      return;
    }

    const targetMat = state.materials.find(m => m.id === targetMatId);
    if (!targetMat) return;

    // Collect sub-ingredients used
    const rows = document.querySelectorAll(".sub-ing-row");
    const subUsages = [];
    let totalBatchCost = 0;

    for (let row of rows) {
      const sel = row.querySelector(".sub-mat-select");
      const qtyInp = row.querySelector(".sub-qty-input");
      const subMatId = sel.value;
      const useQty = Number(qtyInp.value) || 0;

      if (useQty > 0) {
        const subMat = state.materials.find(m => m.id === subMatId);
        if (subMat) {
          const cost = Number(subMat.unitCost) || 0;
          totalBatchCost += useQty * cost;
          subUsages.push({ mat: subMat, qty: useQty, cost: cost });
        }
      }
    }

    if (subUsages.length === 0) {
      showToast("กรุณาระบุวัตถุดิบรองที่ใช้อย่างน้อย 1 รายการ", "error");
      return;
    }

    const now = new Date();
    const batchId = "BATCH-" + now.toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.floor(Math.random() * 900 + 100);

    // 1. Deduct sub-ingredients
    const deductedNames = [];
    subUsages.forEach(item => {
      item.mat.stock = Math.max(0, Number(item.mat.stock) - item.qty);
      deductedNames.push(`${item.mat.name} (-${item.qty} ${item.mat.unit})`);

      state.stockTransactions.unshift({
        transId: "BATCH-USE-" + Date.now() + "-" + item.mat.id,
        createdAt: now.toISOString(),
        materialId: item.mat.id,
        materialName: item.mat.name,
        type: "PREP_USE",
        changeQty: -item.qty,
        balanceAfter: item.mat.stock,
        unitCost: item.cost,
        note: `แปรรูปเป็น ${targetMat.name} (${batchId})`
      });
    });

    // 2. Add yield to target material & update weighted average cost
    const currentTargetStock = Number(targetMat.stock) || 0;
    const currentTargetCost = Number(targetMat.unitCost) || 0;
    const batchUnitCost = totalBatchCost / yieldQty;

    const newTargetStock = currentTargetStock + yieldQty;
    const newWeightedCost = newTargetStock > 0
      ? ((currentTargetStock * currentTargetCost) + totalBatchCost) / newTargetStock
      : batchUnitCost;

    targetMat.stock = newTargetStock;
    targetMat.unitCost = Math.round(newWeightedCost * 1000) / 1000;

    state.stockTransactions.unshift({
      transId: "BATCH-OUT-" + Date.now(),
      createdAt: now.toISOString(),
      materialId: targetMat.id,
      materialName: targetMat.name,
      type: "PREP_YIELD",
      changeQty: yieldQty,
      balanceAfter: newTargetStock,
      unitCost: targetMat.unitCost,
      note: note || `แปรรูปจากวัตถุดิบรอง (${batchId})`
    });

    persistLocal();
    closeModal("modal-stock-in");
    renderStock();
    showToast(`แปรรูปสำเร็จ! ได้ "${targetMat.name}" +${yieldQty.toLocaleString()} ${targetMat.unit} (ต้นทุน ฿${targetMat.unitCost}/${targetMat.unit})`, "success");

    // Sync to GAS
    if (state.gasApiUrl) {
      fetch(state.gasApiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stockConversion",
          data: {
            targetMaterialId: targetMatId,
            yieldQty: yieldQty,
            totalBatchCost: totalBatchCost,
            batchUnitCost: batchUnitCost,
            subUsages: subUsages.map(u => ({ materialId: u.mat.id, qty: u.qty })),
            note: note
          }
        })
      }).catch(e => console.warn(e));
    }

  } else {
    // ------------------------------------
    // NORMAL RESTOCK MODE
    // ------------------------------------
    const matId = document.getElementById("stock-in-material-id").value;
    const qty = Number(document.getElementById("stock-in-qty").value);
    const cost = Number(document.getElementById("stock-in-unit-cost").value);
    const note = document.getElementById("stock-in-note").value.trim();

    if (!qty || qty <= 0) {
      showToast("กรุณาระบุจำนวนที่รับเข้า", "error");
      return;
    }

    const mat = state.materials.find(m => m.id === matId);
    if (!mat) return;

    const currentQty = Number(mat.stock) || 0;
    const currentCost = Number(mat.unitCost) || 0;
    const purchaseCost = cost > 0 ? cost : currentCost;

    // Weighted Average Cost calculation
    const newTotalQty = currentQty + qty;
    const newAvgCost = newTotalQty > 0 ? ((currentQty * currentCost) + (qty * purchaseCost)) / newTotalQty : purchaseCost;

    mat.stock = newTotalQty;
    mat.unitCost = Math.round(newAvgCost * 1000) / 1000;

    state.stockTransactions.unshift({
      transId: "IN-" + Date.now(),
      createdAt: new Date().toISOString(),
      materialId: mat.id,
      materialName: mat.name,
      type: "RESTOCK_IN",
      changeQty: qty,
      balanceAfter: mat.stock,
      unitCost: purchaseCost,
      note: note || "รับวัตถุดิบเข้าคลัง"
    });

    persistLocal();
    closeModal("modal-stock-in");
    renderStock();
    showToast(`รับเข้า "${mat.name}" จำนวน +${qty.toLocaleString()} ${mat.unit} สำเร็จ`, "success");

    // Sync to GAS
    if (state.gasApiUrl) {
      fetch(state.gasApiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stockIn", data: { materialId: matId, quantity: qty, unitCost: purchaseCost, note: note } })
      }).catch(e => console.warn(e));
    }
  }
}

function openStockAdjustModal(presetMatId = null) {
  const activeMaterials = state.materials.filter(m => !m.isDeleted);
  const sel = document.getElementById("stock-adj-material-id");
  sel.innerHTML = activeMaterials.map(m => `<option value="${m.id}" ${m.id === presetMatId ? 'selected' : ''}>${m.emoji} ${m.name} (คงเหลือปัจจุบัน ${m.stock} ${m.unit})</option>`).join("");
  document.getElementById("stock-adj-qty").value = "";
  document.getElementById("stock-adj-note").value = "";
  openModal("modal-stock-adjust");
}

function quickStockAdjust(matId) {
  openStockAdjustModal(matId);
}

function submitStockAdjust() {
  const matId = document.getElementById("stock-adj-material-id").value;
  const type = document.getElementById("stock-adj-type").value;
  const qty = Number(document.getElementById("stock-adj-qty").value);
  const note = document.getElementById("stock-adj-note").value.trim();

  if (isNaN(qty) || qty < 0) {
    showToast("กรุณาระบุจำนวนตัวเลขที่ถูกต้อง", "error");
    return;
  }

  const mat = state.materials.find(m => m.id === matId);
  if (!mat) return;

  const current = Number(mat.stock) || 0;
  let newQty = current;
  let changeQty = 0;

  if (type === "WASTE") {
    changeQty = -qty;
    newQty = Math.max(0, current - qty);
  } else {
    // Exact count adjustment
    newQty = qty;
    changeQty = newQty - current;
  }

  mat.stock = newQty;

  state.stockTransactions.unshift({
    transId: "ADJ-" + Date.now(),
    createdAt: new Date().toISOString(),
    materialId: mat.id,
    materialName: mat.name,
    type: type,
    changeQty: changeQty,
    balanceAfter: newQty,
    unitCost: mat.unitCost,
    note: note || (type === "WASTE" ? "ของเสีย/ทิ้ง" : "ตรวจนับสต็อกจริง")
  });

  persistLocal();
  closeModal("modal-stock-adjust");
  renderStock();
  showToast(`ปรับยอด "${mat.name}" เรียบร้อยแล้ว (คงเหลือ ${newQty} ${mat.unit})`, "success");

  // Sync to GAS
  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stockAdjust", data: { materialId: matId, type: type, quantity: qty, countedQty: qty, note: note } })
    }).catch(e => console.warn(e));
  }
}

function openAddMaterialModal() {
  const title = document.getElementById("material-add-modal-title");
  if (title) title.innerText = "เพิ่มวัตถุดิบใหม่เข้าคลัง";

  const nameLabel = document.getElementById("add-mat-name-label");
  if (nameLabel) nameLabel.innerText = "ชื่อวัตถุดิบ:";

  const nameInput = document.getElementById("add-mat-name");
  if (nameInput) {
    nameInput.value = "";
    nameInput.placeholder = "เช่น เมล็ดเจียออร์แกนิก";
  }

  document.getElementById("add-mat-category").value = "Fresh Fruits";
  document.getElementById("add-mat-unit").value = "g";
  document.getElementById("add-mat-stock").value = 500;
  document.getElementById("add-mat-alert").value = 100;
  document.getElementById("add-mat-cost").value = 0.25;
  document.getElementById("add-mat-emoji").value = "🍓";
  const display = document.getElementById("add-mat-emoji-display");
  if (display) display.innerText = "🍓";

  const subContainer = document.getElementById("add-mat-sub-container");
  if (subContainer) subContainer.classList.remove("hidden");
  if (document.getElementById("add-mat-is-sub")) {
    document.getElementById("add-mat-is-sub").checked = false;
  }
  openModal("modal-material-add");
}

function submitAddMaterial() {
  const name = document.getElementById("add-mat-name").value.trim();
  if (!name) {
    showToast("กรุณากรอกชื่อวัตถุดิบ", "error");
    return;
  }

  const isSub = document.getElementById("add-mat-is-sub") ? document.getElementById("add-mat-is-sub").checked : false;

  const newMat = {
    id: "MAT" + (state.materials.length + 1).toString().padStart(3, "0"),
    name: name,
    category: document.getElementById("add-mat-category").value.trim() || (isSub ? "วัตถุดิบรอง" : "General"),
    unit: document.getElementById("add-mat-unit").value,
    stock: Number(document.getElementById("add-mat-stock").value) || 0,
    minAlert: Number(document.getElementById("add-mat-alert").value) || 0,
    unitCost: Number(document.getElementById("add-mat-cost").value) || 0,
    emoji: document.getElementById("add-mat-emoji").value.trim() || (isSub ? "🥛" : "📦"),
    isSubIngredient: isSub,
    isDeleted: false
  };

  state.materials.push(newMat);
  persistLocal();
  closeModal("modal-material-add");
  renderStock();
  if (typeof renderPackagesManagement === "function") renderPackagesManagement();
  showToast(`เพิ่มวัตถุดิบ "${newMat.name}" ${isSub ? '(วัตถุดิบรอง)' : ''} เรียบร้อยแล้ว`, "success");

  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveMaterial", data: newMat })
    }).catch(e => console.warn(e));
  }
}

// -------------------------------------------------------------
// Material Edit Modal
// -------------------------------------------------------------
function openMaterialEditModal(matId) {
  const mat = state.materials.find(m => m.id === matId);
  if (!mat) return;

  document.getElementById("edit-mat-id").value = mat.id;
  const headerId = document.getElementById("edit-mat-header-id");
  if (headerId) headerId.innerText = `รหัสวัตถุดิบ: ${mat.id}`;

  const emoji = mat.emoji || "📦";
  document.getElementById("edit-mat-emoji").value = emoji;
  const display = document.getElementById("edit-mat-emoji-display");
  if (display) display.innerText = emoji;

  document.getElementById("edit-mat-name").value = mat.name;
  document.getElementById("edit-mat-category").value = mat.category || "";
  document.getElementById("edit-mat-unit").value = mat.unit || "g";
  document.getElementById("edit-mat-stock").value = mat.stock || 0;
  document.getElementById("edit-mat-alert").value = mat.minAlert || 0;
  document.getElementById("edit-mat-cost").value = mat.unitCost || 0;
  const isSubCheckbox = document.getElementById("edit-mat-is-sub");
  if (isSubCheckbox) isSubCheckbox.checked = Boolean(mat.isSubIngredient);

  openModal("modal-material-edit");
}

function saveMaterialEditFromModal() {
  const matId = document.getElementById("edit-mat-id").value;
  const name = document.getElementById("edit-mat-name").value.trim();
  if (!name) {
    showToast("กรุณากรอกชื่อวัตถุดิบ", "error");
    return;
  }

  const mat = state.materials.find(m => m.id === matId);
  if (!mat) return;

  mat.name = name;
  mat.category = document.getElementById("edit-mat-category").value.trim() || "General";
  mat.unit = document.getElementById("edit-mat-unit").value;
  mat.minAlert = Number(document.getElementById("edit-mat-alert").value) || 0;
  mat.unitCost = Number(document.getElementById("edit-mat-cost").value) || 0;
  mat.emoji = document.getElementById("edit-mat-emoji").value.trim() || "📦";
  const isSubCheckbox = document.getElementById("edit-mat-is-sub");
  mat.isSubIngredient = isSubCheckbox ? isSubCheckbox.checked : false;

  persistLocal();
  closeModal("modal-material-edit");
  renderStock();
  if (typeof renderPackagesManagement === "function") renderPackagesManagement();
  showToast(`บันทึกการแก้ไขวัตถุดิบ "${mat.name}" เรียบร้อยแล้ว`, "success");

  // Sync to GAS
  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveMaterial", data: mat })
    }).catch(e => console.warn(e));
  }
}

// -------------------------------------------------------------
// Material Soft Delete & Preservation Confirmation
// -------------------------------------------------------------
function promptDeleteMaterial(matId) {
  const mat = state.materials.find(m => m.id === matId);
  if (!mat) return;

  state.pendingDeleteMaterialId = matId;

  // Populate modal data
  const emojiEl = document.getElementById("del-mat-emoji");
  const nameEl = document.getElementById("del-mat-name");
  const idEl = document.getElementById("del-mat-id");
  const stockEl = document.getElementById("del-mat-stock");
  const catEl = document.getElementById("del-mat-category");

  if (emojiEl) emojiEl.innerText = mat.emoji || "📦";
  if (nameEl) nameEl.innerText = mat.name;
  if (idEl) idEl.innerText = mat.id;
  if (stockEl) stockEl.innerText = `${Number(mat.stock).toLocaleString()} ${mat.unit}`;
  if (catEl) catEl.innerText = mat.category || "-";

  // Check references in active menus & addons
  const usedInMenus = state.menus
    .filter(m => m.isActive !== false && (m.recipe || []).some(r => r.materialId === matId))
    .map(m => m.name);

  const usedInAddons = state.addons
    .filter(a => a.isActive !== false && a.materialId === matId)
    .map(a => a.name);

  const warningBox = document.getElementById("del-mat-warning-box");
  const warningContent = document.getElementById("del-mat-warning-content");

  if (usedInMenus.length > 0 || usedInAddons.length > 0) {
    if (warningBox) warningBox.classList.remove("hidden");
    let html = "";
    if (usedInMenus.length > 0) {
      html += `<div>• เมนู (${usedInMenus.length}): <span class="font-semibold text-amber-950">${usedInMenus.join(", ")}</span></div>`;
    }
    if (usedInAddons.length > 0) {
      html += `<div>• Add-on (${usedInAddons.length}): <span class="font-semibold text-amber-950">${usedInAddons.join(", ")}</span></div>`;
    }
    if (warningContent) warningContent.innerHTML = html;
  } else {
    if (warningBox) warningBox.classList.add("hidden");
  }

  openModal("modal-delete-material-confirm");
}

function executeDeleteMaterial() {
  if (!state.pendingDeleteMaterialId) return;

  const mat = state.materials.find(m => m.id === state.pendingDeleteMaterialId);
  if (!mat) {
    closeModal("modal-delete-material-confirm");
    return;
  }

  // Soft Delete: Mark as deleted so past orders, invoices, and transactions remain 100% intact
  mat.isDeleted = true;
  mat.deletedAt = new Date().toISOString();

  // Log transaction
  state.stockTransactions.unshift({
    transId: "ARCHIVE-" + Date.now(),
    createdAt: new Date().toISOString(),
    materialId: mat.id,
    materialName: mat.name,
    type: "ARCHIVE",
    changeQty: 0,
    balanceAfter: mat.stock,
    unitCost: mat.unitCost,
    note: "ลบ/ยกเลิกใช้งานวัตถุดิบ (ยังคงเก็บข้อมูลประวัติเดิมไว้)"
  });

  persistLocal();
  closeModal("modal-delete-material-confirm");
  renderStock();
  if (typeof renderPackagesManagement === "function") renderPackagesManagement();
  showToast(`ลบวัตถุดิบ "${mat.name}" เรียบร้อยแล้ว (ข้อมูลประวัติเดิมยังคงอยู่ครบถ้วน)`, "success");

  // Sync to GAS
  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteMaterial", data: { materialId: mat.id } })
    }).catch(e => console.warn(e));
  }

  state.pendingDeleteMaterialId = null;
}

function restoreMaterial(matId) {
  const mat = state.materials.find(m => m.id === matId);
  if (!mat) return;

  mat.isDeleted = false;
  delete mat.deletedAt;

  state.stockTransactions.unshift({
    transId: "RESTORE-" + Date.now(),
    createdAt: new Date().toISOString(),
    materialId: mat.id,
    materialName: mat.name,
    type: "RESTORE",
    changeQty: 0,
    balanceAfter: mat.stock,
    unitCost: mat.unitCost,
    note: "กู้คืนวัตถุดิบกลับเข้าคลังใช้งานปกติ"
  });

  persistLocal();
  renderStock();
  if (typeof renderPackagesManagement === "function") renderPackagesManagement();
  showToast(`กู้คืนวัตถุดิบ "${mat.name}" กลับเข้าคลังเรียบร้อยแล้ว`, "success");

  // Sync to GAS
  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restoreMaterial", data: { materialId: mat.id } })
    }).catch(e => console.warn(e));
  }
}

// ==========================================
// 7. VIEW 4: MENU MANAGEMENT (SINGLE PAGE)
// ==========================================

// Handled directly by renderMenusManagement()

// ==========================================
// 7.1 VIEW 5: ADD-ON MANAGEMENT
// ==========================================

function renderAddonPackageView() {
  renderAddonsManagement();
}
function setAddonPackageSubTab() {}
function renderPackagesManagement() {}
function setPackageFilterType() {}
function handlePackageSearch() {}

// -------------------------------------------------------------
// Package (Packaging & Equipment) Management Logic
// -------------------------------------------------------------
function setPackageFilterType(type) {
  state.packageFilterType = type;
  const buttons = document.querySelectorAll(".pkg-type-btn");
  buttons.forEach(btn => {
    if (btn.getAttribute("data-pkg-type") === type) {
      btn.className = "pkg-type-btn px-2.5 py-1 rounded-lg font-semibold bg-white text-stone-900 shadow-sm transition-all";
    } else {
      btn.className = "pkg-type-btn px-2.5 py-1 rounded-lg font-medium text-stone-600 hover:text-stone-900 transition-all";
    }
  });
  renderPackagesManagement();
}

function handlePackageSearch(query) {
  state.packageSearchQuery = (query || "").trim().toLowerCase();
  renderPackagesManagement();
}

function isPackagingMaterial(mat) {
  if (!mat) return false;
  if (mat.category && /packaging|บรรจุภัณฑ์/i.test(mat.category)) return true;
  const name = mat.name || "";
  return /ถ้วย|ชาม|ช้อน|ส้อม|ถุง|กล่อง|ฝา|หลอด|คัพ|แก้ว|cup|spoon|fork|bag|box|packaging|เซ็ต/i.test(name);
}

function renderPackagesManagement() {
  const container = document.getElementById("manage-packages-tbody");
  const statsContainer = document.getElementById("package-stats-grid");
  const countLabel = document.getElementById("package-count-label");
  if (!container) return;

  // Active packaging materials (exclude soft-deleted)
  const allPackaging = state.materials.filter(m => !m.isDeleted && isPackagingMaterial(m));

  // Compute stats across all packaging items
  const totalCount = allPackaging.length;
  const totalUnits = allPackaging.reduce((sum, m) => sum + (Number(m.stock) || 0), 0);
  const lowStockCount = allPackaging.filter(m => (Number(m.stock) || 0) <= (Number(m.minAlert) || 0)).length;
  const totalValue = allPackaging.reduce((sum, m) => sum + ((Number(m.stock) || 0) * (Number(m.unitCost) || 0)), 0);

  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="editorial-card p-4 space-y-1">
        <div class="flex items-center justify-between text-stone-500 text-xs">
          <span>รวมบรรจุภัณฑ์</span>
          <span class="p-1.5 bg-stone-100 rounded-lg text-sm">📦</span>
        </div>
        <div class="text-xl font-bold font-number text-stone-900">${totalCount} <span class="text-xs font-normal text-stone-500">รายการ</span></div>
        <div class="text-[10px] text-stone-400">บรรจุภัณฑ์ & อุปกรณ์ทั้งหมด</div>
      </div>

      <div class="editorial-card p-4 space-y-1">
        <div class="flex items-center justify-between text-stone-500 text-xs">
          <span>สต็อกคงเหลือรวม</span>
          <span class="p-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm">📊</span>
        </div>
        <div class="text-xl font-bold font-number text-stone-900">${totalUnits.toLocaleString()} <span class="text-xs font-normal text-stone-500">ชิ้น</span></div>
        <div class="text-[10px] text-stone-400">จำนวนพร้อมใช้งานหน้าร้าน</div>
      </div>

      <div class="editorial-card p-4 space-y-1 ${lowStockCount > 0 ? 'bg-amber-50/60 border-amber-200' : ''}">
        <div class="flex items-center justify-between text-stone-500 text-xs">
          <span>ใกล้หมด / ต้องสั่งซื้อ</span>
          <span class="p-1.5 ${lowStockCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'} rounded-lg text-sm">⚠️</span>
        </div>
        <div class="text-xl font-bold font-number ${lowStockCount > 0 ? 'text-amber-800' : 'text-stone-900'}">${lowStockCount} <span class="text-xs font-normal text-stone-500">รายการ</span></div>
        <div class="text-[10px] ${lowStockCount > 0 ? 'text-amber-700 font-medium' : 'text-stone-400'}">${lowStockCount > 0 ? 'สต็อกต่ำกว่าจุดเตือน' : 'สต็อกอยู่ในเกณฑ์ปลอดภัย'}</div>
      </div>

      <div class="editorial-card p-4 space-y-1">
        <div class="flex items-center justify-between text-stone-500 text-xs">
          <span>มูลค่าสต็อกบรรจุภัณฑ์</span>
          <span class="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm">💰</span>
        </div>
        <div class="text-xl font-bold font-number text-stone-900">฿${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="text-[10px] text-stone-400">คำนวณตามต้นทุนจริง</div>
      </div>
    `;
  }

  // Filter by Type
  const filterType = state.packageFilterType || "ทั้งหมด";
  let filtered = allPackaging.filter(m => {
    if (filterType === "ถ้วย & ชาม") return /ถ้วย|ชาม|cup|bowl/i.test(m.name);
    if (filterType === "ช้อน & ส้อม") return /ช้อน|ส้อม|spoon|fork|cutlery/i.test(m.name);
    if (filterType === "ถุงหิ้ว") return /ถุง|bag/i.test(m.name);
    if (filterType === "กล่อง & เซ็ต") return /กล่อง|เซ็ต|box|set/i.test(m.name);
    return true;
  });

  // Filter by Search Query
  const query = state.packageSearchQuery || "";
  if (query) {
    filtered = filtered.filter(m => 
      (m.name || "").toLowerCase().includes(query) ||
      (m.id || "").toLowerCase().includes(query) ||
      (m.category || "").toLowerCase().includes(query)
    );
  }

  if (countLabel) {
    countLabel.innerText = `${filtered.length} รายการ`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-stone-400">
          <div class="flex flex-col items-center justify-center gap-2">
            <span class="text-3xl">📦</span>
            <p class="text-sm font-medium text-stone-600">ไม่พบบรรจุภัณฑ์ที่ตรงกับเงื่อนไข</p>
            <p class="text-xs text-stone-400">สามารถคลิกปุ่ม "+ เพิ่ม Package ใหม่" เพื่อเพิ่มรายการบรรจุภัณฑ์เข้าสู่ระบบ</p>
            <button onclick="openAddPackageModal()" class="mt-2 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5">
              <span>+</span>
              <span>เพิ่ม Package ใหม่</span>
            </button>
          </div>
        </td>
      </tr>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(pkg => {
    // Linked menus from recipe BOM
    const linkedMenus = state.menus.filter(m => 
      m.isActive !== false && 
      Array.isArray(m.recipe) && 
      m.recipe.some(r => r.materialId === pkg.id)
    );

    // Stock status logic
    const stock = Number(pkg.stock) || 0;
    const alert = Number(pkg.minAlert) || 0;
    let statusBadge = "";
    if (stock <= 0) {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span>หมดสต็อก</span>`;
    } else if (stock <= alert) {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>ใกล้หมด (${stock}/${alert})</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ปกติ</span>`;
    }

    // Linked Menus Pill Badges
    let linkedMenusHtml = "";
    if (linkedMenus.length > 0) {
      linkedMenusHtml = `<div class="flex flex-wrap gap-1.5 max-w-xs">` + linkedMenus.map(m => {
        const recipeItem = m.recipe.find(r => r.materialId === pkg.id);
        const qtyUsed = recipeItem ? recipeItem.qty : 1;
        return `
          <button type="button" onclick="openMenuEditModal('${m.id}')" title="คลิกเพื่อแก้ไขสูตรของเมนูนี้" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-medium border border-stone-200 transition-colors">
            <span>${m.emoji || "🥣"}</span>
            <span class="truncate max-w-[100px]">${m.name}</span>
            <span class="text-amber-800 font-bold font-number">${qtyUsed} ${pkg.unit}</span>
          </button>
        `;
      }).join("") + `</div>`;
    } else {
      linkedMenusHtml = `<span class="text-stone-400 text-[11px] italic">ยังไม่ผูกในสูตรเมนูใด</span>`;
    }

    return `
      <tr class="hover:bg-stone-50/70 transition-colors">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl p-2 bg-stone-100/70 rounded-xl border border-stone-200/80 leading-none shrink-0">${pkg.emoji || "📦"}</span>
            <div>
              <div class="font-bold text-stone-900">${pkg.name}</div>
              <div class="text-[10px] text-stone-400 font-mono mt-0.5">รหัส: ${pkg.id}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="badge-pill bg-stone-100 text-stone-700 text-[11px] font-medium">${pkg.category || "Packaging"}</span>
          <div class="text-[10px] text-stone-400 mt-1">หน่วย: <strong class="text-stone-600">${pkg.unit || "ชิ้น"}</strong></div>
        </td>
        <td class="py-3 px-4 font-number">
          <div class="font-bold text-stone-800 text-xs">฿${Number(pkg.unitCost || 0).toFixed(2)}</div>
          <div class="text-[10px] text-stone-400">/ ${pkg.unit || "ชิ้น"}</div>
        </td>
        <td class="py-3 px-4 font-number">
          <div class="font-bold text-sm text-stone-900">${stock.toLocaleString()} <span class="text-xs font-normal text-stone-500">${pkg.unit || "ชิ้น"}</span></div>
          <div class="text-[10px] text-stone-400">เตือนเมื่อ &le; ${alert.toLocaleString()} ${pkg.unit || "ชิ้น"}</div>
        </td>
        <td class="py-3 px-4">
          ${statusBadge}
        </td>
        <td class="py-3 px-4">
          ${linkedMenusHtml}
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openMaterialEditModal('${pkg.id}')" class="px-2.5 py-1 text-xs text-stone-700 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-xs" title="แก้ไขชื่อ, ต้นทุน, จุดเตือน">
              แก้ไข
            </button>
            <button onclick="openStockInModal('${pkg.id}')" class="px-2.5 py-1 text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50/50 rounded-lg hover:bg-emerald-100 transition-colors font-medium shadow-xs" title="เติมสต็อกบรรจุภัณฑ์">
              + เติมสต็อก
            </button>
            <button onclick="promptDeleteMaterial('${pkg.id}')" class="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors" title="ลบออกจากระบบ">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  lucide.createIcons();
}

function openAddPackageModal() {
  const title = document.getElementById("material-add-modal-title");
  if (title) title.innerText = "📦 เพิ่ม Package / บรรจุภัณฑ์ใหม่";

  const nameLabel = document.getElementById("add-mat-name-label");
  if (nameLabel) nameLabel.innerText = "ชื่อบรรจุภัณฑ์ / อุปกรณ์:";

  const nameInput = document.getElementById("add-mat-name");
  if (nameInput) {
    nameInput.value = "";
    nameInput.placeholder = "เช่น ถ้วยกระดาษคราฟท์ Type C, กล่องเทคอะเวย์ 4 หลุม, ถุงซิปล็อก";
  }

  const catInput = document.getElementById("add-mat-category");
  if (catInput) catInput.value = "Packaging";

  const unitInput = document.getElementById("add-mat-unit");
  if (unitInput) unitInput.value = "pcs";

  const stockInput = document.getElementById("add-mat-stock");
  if (stockInput) stockInput.value = 100;

  const alertInput = document.getElementById("add-mat-alert");
  if (alertInput) alertInput.value = 30;

  const costInput = document.getElementById("add-mat-cost");
  if (costInput) costInput.value = 2.5;

  const emojiInput = document.getElementById("add-mat-emoji");
  if (emojiInput) emojiInput.value = "📦";

  const displayEl = document.getElementById("add-mat-emoji-display");
  if (displayEl) displayEl.innerText = "📦";

  const subContainer = document.getElementById("add-mat-sub-container");
  if (subContainer) subContainer.classList.add("hidden");

  const isSubInput = document.getElementById("add-mat-is-sub");
  if (isSubInput) isSubInput.checked = false;

  openModal("modal-material-add");
}

function renderMenusManagement() {
  const container = document.getElementById("manage-menus-grid");
  const countBadge = document.getElementById("menu-count-badge");
  if (countBadge) countBadge.innerText = `${state.menus.length} เมนู`;
  if (!container) return;

  const matMap = {};
  state.materials.forEach(m => matMap[m.id] = m);

  container.innerHTML = state.menus.map(menu => {
    const hasAddons = menu.hasAddons !== false;
    const hasPackage = menu.hasPackage !== false;

    // Filter recipe into ingredients vs packaging
    const allRecipe = menu.recipe || [];
    const baseAndFruits = allRecipe.filter(r => {
      const mat = matMap[r.materialId];
      return !mat || !isPackagingMaterial(mat);
    });
    const packageItems = allRecipe.filter(r => {
      const mat = matMap[r.materialId];
      return mat && isPackagingMaterial(mat);
    });

    return `
      <div class="editorial-card p-5 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-start justify-between">
            <span class="text-3xl p-2 bg-stone-50 rounded-2xl">${menu.emoji || "🥣"}</span>
            <button onclick="editMenu('${menu.id}')" class="px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">แก้ไข</button>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-sm text-stone-900">${menu.name}</h4>
              <span class="badge-pill bg-stone-100 text-stone-600 text-[10px]">${menu.category || 'General'}</span>
            </div>
            <p class="text-xs text-stone-400 mt-1 line-clamp-2">${menu.description || ""}</p>
          </div>

          <!-- Feature Switches Indicators -->
          <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
            ${hasAddons 
              ? `<span class="badge-pill bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">🍓 มี Add-on</span>` 
              : `<span class="badge-pill bg-stone-100 text-stone-500 text-[10px]">⚪ ไม่มี Add-on</span>`}
            
            ${hasPackage 
              ? `<span class="badge-pill bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold">📦 มี Package</span>` 
              : `<span class="badge-pill bg-stone-100 text-stone-500 text-[10px]">⚪ ไม่ใช้ Package</span>`}
          </div>

          <!-- Platform Prices Table -->
          <div class="p-3 bg-stone-50 rounded-xl space-y-1.5 text-xs">
            <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">ราคาตามแต่ละ Platform</span>
            <div class="grid grid-cols-2 gap-1.5">
              ${state.platforms.map(p => {
                const price = (menu.prices && menu.prices[p.id]) !== undefined ? menu.prices[p.id] : "-";
                return `
                  <div class="flex justify-between text-stone-700 bg-white p-1.5 rounded border border-stone-100">
                    <span class="truncate max-w-[80px]">${p.name}</span>
                    <span class="font-bold font-number text-amber-900">฿${price}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Recipe Ingredients (BOM) -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">วัตถุดิบหลัก:</span>
            <div class="flex flex-wrap gap-1">
              ${baseAndFruits.length > 0 ? baseAndFruits.map(r => {
                const mat = matMap[r.materialId];
                return `<span class="badge-pill bg-stone-100 text-stone-700 text-[10px]">${mat ? mat.emoji + " " + mat.name : r.materialId}: ${r.qty} ${mat ? mat.unit : ''}</span>`;
              }).join("") : `<span class="text-[10px] text-stone-400 italic">- ไม่มีวัตถุดิบหลัก -</span>`}
            </div>

            <!-- Packaging BOM Section -->
            <span class="text-[10px] font-bold text-stone-400 uppercase tracking-wider block pt-1">บรรจุภัณฑ์ (Package):</span>
            <div class="flex flex-wrap gap-1">
              ${!hasPackage 
                ? `<span class="badge-pill bg-stone-50 text-stone-400 text-[10px] italic">⚪ ไม่ใช้บรรจุภัณฑ์ (ไม่หักสต็อก)</span>`
                : (packageItems.length > 0 ? packageItems.map(r => {
                    const mat = matMap[r.materialId];
                    return `<span class="badge-pill bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">${mat ? mat.emoji + " " + mat.name : r.materialId}: ${r.qty} ${mat ? mat.unit : ''}</span>`;
                  }).join("") : `<span class="text-[10px] text-stone-400 italic">- ยังไม่ได้ผูกบรรจุภัณฑ์ -</span>`)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

function renderAddonsManagement() {
  const tbody = document.getElementById("manage-addons-tbody");
  document.getElementById("addon-count-label").innerText = `${state.addons.length} รายการ`;

  const matMap = {};
  state.materials.forEach(m => matMap[m.id] = m);

  tbody.innerHTML = state.addons.map(addon => {
    const mat = matMap[addon.materialId];
    return `
      <tr class="hover:bg-stone-50/70 transition-colors">
        <td class="py-3 px-4 font-semibold text-stone-900 flex items-center gap-2">
          <span class="text-xl">${addon.emoji || "🍓"}</span>
          <span>${addon.name}</span>
        </td>
        <td class="py-3 px-4 text-stone-500">${addon.category}</td>
        <td class="py-3 px-4">
          <div class="flex flex-wrap gap-1.5 text-[11px]">
            ${state.platforms.map(p => {
              const price = (addon.prices && addon.prices[p.id]) !== undefined ? addon.prices[p.id] : "-";
              return `<span class="bg-stone-100 px-1.5 py-0.5 rounded text-stone-700 font-number">${p.name}: ฿${price}</span>`;
            }).join("")}
          </div>
        </td>
        <td class="py-3 px-4 text-stone-700">
          ${mat ? `${mat.emoji} ${mat.name} (${addon.amountUsed} ${mat.unit})` : `<span class="text-stone-300">-</span>`}
        </td>
        <td class="py-3 px-4 text-center">
          <button onclick="editAddon('${addon.id}')" class="px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
            แก้ไข
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// Modal Menu Add/Edit Logic
function openMenuEditModal(menuId = null) {
  const menu = menuId ? state.menus.find(m => m.id === menuId) : null;
  document.getElementById("menu-modal-header").innerText = menu ? `แก้ไขเมนู: ${menu.name}` : "เพิ่มเมนูใหม่";
  document.getElementById("edit-menu-id").value = menu ? menu.id : "";
  const emoji = menu ? menu.emoji : "🥣";
  document.getElementById("edit-menu-emoji").value = emoji;
  const emojiDisplay = document.getElementById("edit-menu-emoji-display");
  if (emojiDisplay) emojiDisplay.innerText = emoji;

  document.getElementById("edit-menu-name").value = menu ? menu.name : "";
  document.getElementById("edit-menu-category").value = menu ? menu.category : "Classic Bowls";
  document.getElementById("edit-menu-desc").value = menu ? (menu.description || "") : "";

  // Set Add-on & Package switch states
  const hasAddons = menu ? (menu.hasAddons !== false) : true;
  const hasPackage = menu ? (menu.hasPackage !== false) : true;
  const addonsSwitch = document.getElementById("edit-menu-has-addons");
  if (addonsSwitch) addonsSwitch.checked = hasAddons;
  const packageSwitch = document.getElementById("edit-menu-has-package");
  if (packageSwitch) packageSwitch.checked = hasPackage;
  toggleMenuPackageNotice(hasPackage);

  // Render Platform Price inputs (Compact inline capsules)
  const priceContainer = document.getElementById("edit-menu-platform-prices-container");
  priceContainer.innerHTML = state.platforms.map(p => {
    const val = (menu && menu.prices && menu.prices[p.id]) !== undefined ? menu.prices[p.id] : "";
    const cleanName = p.name.replace(/\s*\([^)]*\)/g, ""); // "หน้าร้าน" instead of "หน้าร้าน (Storefront)"
    const gpBadge = p.gpPercent > 0 ? `<span class="text-[9px] font-number text-amber-800 bg-amber-100/80 px-1 py-0.5 rounded leading-none shrink-0">${p.gpPercent}%</span>` : '';
    return `
      <div class="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F4F0] focus-within:bg-[#EAE8E1] focus-within:ring-1 focus-within:ring-stone-400/40 transition-all">
        <div class="flex items-center gap-1 min-w-0">
          <span class="text-[11px] font-medium text-stone-700 truncate" title="${p.name}">${cleanName}</span>
          ${gpBadge}
        </div>
        <div class="flex items-center gap-0.5 shrink-0">
          <span class="text-stone-400 text-xs font-number">฿</span>
          <input type="number" data-plat-id="${p.id}" value="${val}" placeholder="0" class="menu-price-input w-14 bg-transparent border-0 text-right font-number font-semibold text-xs text-stone-900 focus:outline-none placeholder:text-stone-300">
        </div>
      </div>
    `;
  }).join("");

  // Map materials to identify packaging vs base ingredients
  const matMap = {};
  state.materials.forEach(m => matMap[m.id] = m);

  // Clear existing containers
  const baseContainer = document.getElementById("edit-menu-base-recipe-rows");
  const packageContainer = document.getElementById("edit-menu-package-recipe-rows");
  if (baseContainer) baseContainer.innerHTML = "";
  if (packageContainer) packageContainer.innerHTML = "";

  if (menu && Array.isArray(menu.recipe)) {
    let hasBase = false;
    let hasPkg = false;
    menu.recipe.forEach(r => {
      const mat = matMap[r.materialId];
      if (mat && isPackagingMaterial(mat)) {
        addPackageRecipeRowToMenuModal(r.materialId, r.qty);
        hasPkg = true;
      } else {
        addBaseRecipeRowToMenuModal(r.materialId, r.qty);
        hasBase = true;
      }
    });
    if (!hasBase) addBaseRecipeRowToMenuModal("MAT001", 100);
    if (!hasPkg && hasPackage) {
      addPackageRecipeRowToMenuModal("MAT010", 1);
      addPackageRecipeRowToMenuModal("MAT012", 1);
    }
  } else {
    // Default template rows for new menu:
    // Base ingredient: Greek Yogurt 100g
    addBaseRecipeRowToMenuModal("MAT001", 100);
    // Package items: Cup Type A + Spoon + Bag
    addPackageRecipeRowToMenuModal("MAT010", 1);
    addPackageRecipeRowToMenuModal("MAT012", 1);
    addPackageRecipeRowToMenuModal("MAT013", 1);
  }

  openModal("modal-menu-edit");
  lucide.createIcons();
}

function setMenuCategoryPreset(catName) {
  const catInput = document.getElementById("edit-menu-category");
  if (catInput) {
    catInput.value = catName;
    catInput.focus();
  }
}

function toggleMenuPackageNotice(isChecked) {
  const alertEl = document.getElementById("menu-package-disabled-alert");
  const contentEl = document.getElementById("menu-package-content");
  const quickBar = document.getElementById("menu-package-quick-bar");
  if (alertEl) alertEl.classList.toggle("hidden", isChecked);
  if (contentEl) contentEl.classList.toggle("hidden", !isChecked);
  if (quickBar) quickBar.classList.toggle("hidden", !isChecked);
}

function updateRecipeUnitDisplay(selectEl) {
  const row = selectEl.closest('.recipe-row');
  if (!row) return;
  const unitSpan = row.querySelector('.recipe-unit-display');
  if (!unitSpan) return;
  const mat = state.materials.find(m => m.id === selectEl.value);
  unitSpan.textContent = mat ? (mat.unit || 'g') : 'g';
}

function addBaseRecipeRowToMenuModal(selectedMatId = "", qty = 1) {
  const container = document.getElementById("edit-menu-base-recipe-rows");
  if (!container) return;
  const rowDiv = document.createElement("div");
  rowDiv.className = "recipe-row base-recipe-row flex items-center gap-2.5 text-xs";

  // Non-packaging materials (or current selection)
  const activeOrSelected = state.materials.filter(m => (!m.isDeleted || m.id === selectedMatId) && !isPackagingMaterial(m));
  const bases = activeOrSelected.filter(m => m.category === "Base Yogurt");
  const fruitsToppings = activeOrSelected.filter(m => m.category === "Fresh Fruits" || m.category === "Toppings" || m.category === "Sauces");
  const others = activeOrSelected.filter(m => !bases.includes(m) && !fruitsToppings.includes(m));

  const buildOpts = (list) => list.map(m => `<option value="${m.id}" ${m.id === selectedMatId ? 'selected' : ''}>${m.emoji} ${m.name} ${m.isDeleted ? '[ถูกลบ]' : ''}</option>`).join("");

  const currentMat = state.materials.find(m => m.id === (selectedMatId || (bases[0] ? bases[0].id : '')));
  const unitStr = currentMat ? currentMat.unit : 'g';

  rowDiv.innerHTML = `
    <select onchange="updateRecipeUnitDisplay(this)" class="recipe-mat-select soft-input flex-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-900">
      <optgroup label="🥣 เบสกรีกโยเกิร์ต">
        ${buildOpts(bases)}
      </optgroup>
      <optgroup label="🍓 ผลไม้ ซอส & ท็อปปิ้ง">
        ${buildOpts(fruitsToppings)}
      </optgroup>
      ${others.length > 0 ? `<optgroup label="อื่นๆ">${buildOpts(others)}</optgroup>` : ''}
    </select>
    <div class="w-28 shrink-0 flex items-center gap-1.5">
      <input type="number" step="any" value="${qty}" placeholder="ปริมาณ" class="recipe-qty-input soft-input w-full px-2.5 py-2 rounded-xl text-xs font-number font-semibold text-stone-900 placeholder:text-stone-300">
      <span class="recipe-unit-display text-[11px] text-stone-400 font-medium shrink-0 w-6">${unitStr}</span>
    </div>
    <button type="button" onclick="this.closest('.recipe-row').remove()" class="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0" title="ลบรายการ">
      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
    </button>
  `;
  container.appendChild(rowDiv);
  lucide.createIcons({ root: rowDiv });
}

function addPackageRecipeRowToMenuModal(selectedMatId = "", qty = 1) {
  const container = document.getElementById("edit-menu-package-recipe-rows");
  if (!container) return;
  const rowDiv = document.createElement("div");
  rowDiv.className = "recipe-row package-recipe-row flex items-center gap-2.5 text-xs";

  // Packaging materials (or current selection)
  let packagingList = state.materials.filter(m => (!m.isDeleted || m.id === selectedMatId) && isPackagingMaterial(m));
  if (packagingList.length === 0) {
    packagingList = state.materials.filter(m => !m.isDeleted);
  }

  const buildOpts = (list) => list.map(m => `<option value="${m.id}" ${m.id === selectedMatId ? 'selected' : ''}>${m.emoji} ${m.name} ${m.isDeleted ? '[ถูกลบ]' : ''}</option>`).join("");

  rowDiv.innerHTML = `
    <select class="recipe-mat-select soft-input flex-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-900">
      ${buildOpts(packagingList)}
    </select>
    <div class="w-28 shrink-0 flex items-center gap-1.5">
      <input type="number" min="1" step="1" value="${qty}" placeholder="จำนวน" class="recipe-qty-input soft-input w-full px-2.5 py-2 rounded-xl text-xs font-number font-semibold text-stone-900 placeholder:text-stone-300">
      <span class="text-[11px] text-stone-400 font-medium shrink-0 w-6">ชิ้น</span>
    </div>
    <button type="button" onclick="this.closest('.recipe-row').remove()" class="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0" title="ลบรายการ">
      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
    </button>
  `;
  container.appendChild(rowDiv);
  lucide.createIcons({ root: rowDiv });
}

function quickAddPackageToModal(matId, qty = 1) {
  const container = document.getElementById("edit-menu-package-recipe-rows");
  if (!container) return;
  const existingRows = container.querySelectorAll(".recipe-row");
  for (const row of existingRows) {
    const sel = row.querySelector(".recipe-mat-select");
    if (sel && sel.value === matId) {
      const qtyInput = row.querySelector(".recipe-qty-input");
      if (qtyInput) qtyInput.value = (Number(qtyInput.value) || 0) + qty;
      showToast("เพิ่มจำนวนบรรจุภัณฑ์แล้ว", "success");
      return;
    }
  }
  addPackageRecipeRowToMenuModal(matId, qty);
}

// Legacy alias to prevent any runtime error
function addRecipeRowToMenuModal(selectedMatId = "", qty = 1) {
  const mat = state.materials.find(m => m.id === selectedMatId);
  if (mat && isPackagingMaterial(mat)) {
    addPackageRecipeRowToMenuModal(selectedMatId, qty);
  } else {
    addBaseRecipeRowToMenuModal(selectedMatId, qty);
  }
}

function editMenu(menuId) {
  openMenuEditModal(menuId);
}

function saveMenuFromModal() {
  const menuId = document.getElementById("edit-menu-id").value;
  const name = document.getElementById("edit-menu-name").value.trim();
  if (!name) {
    showToast("กรุณากรอกชื่อเมนู", "error");
    return;
  }

  const hasAddons = document.getElementById("edit-menu-has-addons") ? document.getElementById("edit-menu-has-addons").checked : true;
  const hasPackage = document.getElementById("edit-menu-has-package") ? document.getElementById("edit-menu-has-package").checked : true;

  // Collect platform prices
  const prices = {};
  document.querySelectorAll(".menu-price-input").forEach(inp => {
    const platId = inp.dataset.platId;
    prices[platId] = Number(inp.value) || 0;
  });

  // Collect recipes from Base Recipe rows
  const recipe = [];
  const baseRows = document.querySelectorAll("#edit-menu-base-recipe-rows .recipe-row");
  baseRows.forEach(row => {
    const matId = row.querySelector(".recipe-mat-select").value;
    const qty = Number(row.querySelector(".recipe-qty-input").value) || 0;
    if (matId && qty > 0) {
      recipe.push({ materialId: matId, qty: qty });
    }
  });

  // Collect recipes from Package rows (if package is enabled)
  if (hasPackage) {
    const packageRows = document.querySelectorAll("#edit-menu-package-recipe-rows .recipe-row");
    packageRows.forEach(row => {
      const matId = row.querySelector(".recipe-mat-select").value;
      const qty = Number(row.querySelector(".recipe-qty-input").value) || 0;
      if (matId && qty > 0) {
        recipe.push({ materialId: matId, qty: qty });
      }
    });
  }

  const menuObj = {
    id: menuId || ("MENU" + (state.menus.length + 1).toString().padStart(2, "0")),
    name: name,
    category: document.getElementById("edit-menu-category").value.trim() || "Classic Bowls",
    emoji: document.getElementById("edit-menu-emoji").value.trim() || "🥣",
    description: document.getElementById("edit-menu-desc").value.trim(),
    prices: prices,
    recipe: recipe,
    hasAddons: hasAddons,
    hasPackage: hasPackage,
    isActive: true
  };

  const existingIdx = state.menus.findIndex(m => m.id === menuObj.id);
  if (existingIdx >= 0) {
    state.menus[existingIdx] = menuObj;
  } else {
    state.menus.push(menuObj);
  }

  persistLocal();
  closeModal("modal-menu-edit");
  renderMenusManagement();
  showToast(`บันทึกเมนู "${name}" สำเร็จ`, "success");

  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveMenu", data: menuObj })
    }).catch(e => console.warn(e));
  }
}

// Modal Addon Add/Edit Logic
function openAddonEditModal(addonId = null) {
  const addon = addonId ? state.addons.find(a => a.id === addonId) : null;
  document.getElementById("addon-modal-header").innerText = addon ? "แก้ไข Add-on" : "เพิ่ม Add-on ใหม่";
  document.getElementById("edit-addon-id").value = addon ? addon.id : "";
  const emoji = addon ? addon.emoji : "🍓";
  document.getElementById("edit-addon-emoji").value = emoji;
  const emojiDisplay = document.getElementById("edit-addon-emoji-display");
  if (emojiDisplay) emojiDisplay.innerText = emoji;

  document.getElementById("edit-addon-name").value = addon ? addon.name : "";
  document.getElementById("edit-addon-category").value = addon ? addon.category : "ผลไม้สด";

  // Platform prices
  const priceContainer = document.getElementById("edit-addon-platform-prices");
  priceContainer.innerHTML = state.platforms.map(p => {
    const val = (addon && addon.prices && addon.prices[p.id]) !== undefined ? addon.prices[p.id] : "";
    return `
      <div>
        <label class="block text-[10px] text-stone-500 mb-0.5">${p.name}:</label>
        <input type="number" data-plat-id="${p.id}" value="${val}" placeholder="+฿" class="addon-price-input w-full px-2 py-1.5 border border-stone-300 rounded-lg font-number text-xs">
      </div>
    `;
  }).join("");

  // Material Linkage (Active materials only, plus current if archived)
  const activeOrSelected = state.materials.filter(m => !m.isDeleted || (addon && addon.materialId === m.id));
  const matSel = document.getElementById("edit-addon-material-id");
  matSel.innerHTML = activeOrSelected.map(m => `
    <option value="${m.id}" ${addon && addon.materialId === m.id ? 'selected' : ''}>
      ${m.emoji} ${m.name} (${m.unit}) ${m.isDeleted ? '[ถูกลบ]' : ''}
    </option>
  `).join("");

  document.getElementById("edit-addon-amount").value = addon ? addon.amountUsed : 30;

  openModal("modal-addon-edit");
}

function editAddon(addonId) {
  openAddonEditModal(addonId);
}

function saveAddonFromModal() {
  const addonId = document.getElementById("edit-addon-id").value;
  const name = document.getElementById("edit-addon-name").value.trim();
  if (!name) {
    showToast("กรุณากรอกชื่อ Add-on", "error");
    return;
  }

  const prices = {};
  document.querySelectorAll(".addon-price-input").forEach(inp => {
    prices[inp.dataset.platId] = Number(inp.value) || 0;
  });

  const addonObj = {
    id: addonId || ("ADD" + (state.addons.length + 1).toString().padStart(2, "0")),
    name: name,
    category: document.getElementById("edit-addon-category").value,
    emoji: document.getElementById("edit-addon-emoji").value.trim() || "🍓",
    prices: prices,
    materialId: document.getElementById("edit-addon-material-id").value,
    amountUsed: Number(document.getElementById("edit-addon-amount").value) || 0,
    isActive: true
  };

  const existingIdx = state.addons.findIndex(a => a.id === addonObj.id);
  if (existingIdx >= 0) {
    state.addons[existingIdx] = addonObj;
  } else {
    state.addons.push(addonObj);
  }

  persistLocal();
  closeModal("modal-addon-edit");
  renderAddonsManagement();
  showToast(`บันทึก Add-on "${name}" สำเร็จ`, "success");

  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveAddon", data: addonObj })
    }).catch(e => console.warn(e));
  }
}

// ==========================================
// 8. VIEW 5: SETTINGS & PRESET EMOJIS
// ==========================================

function renderSettings() {
  renderPresetEmojis();
  renderPlatformsTable();
  document.getElementById("settings-gas-url").value = state.gasApiUrl;
}

function renderPresetEmojis() {
  const container = document.getElementById("settings-preset-emojis-grid");
  if (!container) return;

  container.innerHTML = state.presetEmojis.map(emoji => `
    <button onclick="copyEmojiToClipboard('${emoji}')" class="emoji-btn" title="คลิกเพื่อคัดลอก ${emoji}">
      ${emoji}
    </button>
  `).join("");
}

function copyEmojiToClipboard(emoji) {
  navigator.clipboard.writeText(emoji).then(() => {
    showToast(`คัดลอกอีโมจิ ${emoji} แล้ว! สามารถนำไปวางได้เลย`, "success");
  });
}

function addNewPresetEmoji() {
  const input = document.getElementById("new-preset-emoji-input");
  const val = input.value.trim();
  if (!val) return;

  if (!state.presetEmojis.includes(val)) {
    state.presetEmojis.push(val);
    persistLocal();
    renderPresetEmojis();
    showToast(`เพิ่ม ${val} ใน Preset แล้ว`, "success");
    input.value = "";
  }
}

function resetPresetEmojis() {
  state.presetEmojis = [...DEFAULT_PRESET_EMOJIS];
  persistLocal();
  renderPresetEmojis();
  showToast("รีเซ็ต Preset Emojis สำเร็จ", "success");
}

function renderPlatformsTable() {
  const tbody = document.getElementById("settings-platforms-tbody");
  if (!tbody) return;

  tbody.innerHTML = state.platforms.map(p => `
    <tr class="hover:bg-stone-50/70 transition-colors">
      <td class="py-2.5 px-3 font-mono text-[11px] text-stone-500">${p.id}</td>
      <td class="py-2.5 px-3 font-bold text-stone-900">${p.name}</td>
      <td class="py-2.5 px-3 text-right font-number font-semibold text-amber-900">${p.gpPercent}%</td>
      <td class="py-2.5 px-3 text-center">
        <span class="w-4 h-4 rounded-full inline-block border border-stone-300" style="background-color: ${p.badgeColor || '#4A5568'}"></span>
      </td>
      <td class="py-2.5 px-3 text-center">
        <span class="badge-pill ${p.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-400'}">
          ${p.isActive !== false ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
        </span>
      </td>
      <td class="py-2.5 px-3 text-center">
        <button onclick="editPlatformPrompt('${p.id}')" class="text-stone-500 hover:text-stone-900 font-semibold text-xs">แก้ไข GP%</button>
      </td>
    </tr>
  `).join("");
}

function editPlatformPrompt(platId) {
  const p = state.platforms.find(item => item.id === platId);
  if (!p) return;
  const newGp = prompt(`กำหนดค่าธรรมเนียม GP% สำหรับ ${p.name}:`, p.gpPercent);
  if (newGp !== null && !isNaN(Number(newGp))) {
    p.gpPercent = Number(newGp);
    persistLocal();
    renderPlatformsTable();
    showToast(`อัปเดต GP ของ ${p.name} เป็น ${p.gpPercent}% แล้ว`, "success");

    if (state.gasApiUrl) {
      fetch(state.gasApiUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "savePlatforms", data: state.platforms })
      }).catch(e => console.warn(e));
    }
  }
}

function openAddPlatformModal() {
  const name = prompt("กรุณาระบุชื่อ Platform ใหม่ (เช่น ShopeeFood, Robinhood, Delivery):");
  if (!name) return;
  const gp = prompt("กรุณาระบุค่า GP% (เช่น 30 หรือ 0):", "30");

  const newPlat = {
    id: "PLAT" + (state.platforms.length + 1).toString().padStart(2, "0"),
    name: name.trim(),
    gpPercent: Number(gp) || 0,
    badgeColor: "#805AD5",
    isActive: true
  };

  state.platforms.push(newPlat);
  persistLocal();
  renderPlatformsTable();
  showToast(`เพิ่ม Platform "${newPlat.name}" แล้ว`, "success");

  if (state.gasApiUrl) {
    fetch(state.gasApiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "savePlatforms", data: state.platforms })
    }).catch(e => console.warn(e));
  }
}

// ==========================================
// 9. GOOGLE SHEETS LIVE SYNC & API CONNECTION
// ==========================================

function saveApiUrl() {
  const url = document.getElementById("settings-gas-url").value.trim();
  state.gasApiUrl = url;
  localStorage.setItem("GY_GAS_API_URL", url);
  updateApiStatusPill();
  showToast("บันทึก Google Apps Script API URL เรียบร้อยแล้ว", "success");
}

function updateApiStatusPill() {
  const pill = document.getElementById("db-status-pill");
  const text = document.getElementById("db-status-text");
  if (!pill || !text) return;

  if (state.gasApiUrl) {
    pill.className = "badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200";
    pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Google Sheets ต่ออยู่</span>`;
  } else {
    pill.className = "badge-pill bg-amber-50 text-amber-700 border border-amber-200";
    pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span>โหมดสาธิต (Demo)</span>`;
  }
}

async function testApiConnection() {
  const url = document.getElementById("settings-gas-url").value.trim();
  if (!url) {
    showToast("กรุณากรอก Web App URL ก่อนทดสอบ", "error");
    return;
  }

  showToast("กำลังทดสอบการเชื่อมต่อ API...", "info");
  const startTime = Date.now();

  try {
    const res = await fetch(`${url}?action=ping`);
    const json = await res.json();
    const latency = Date.now() - startTime;
    if (json.status === "success") {
      showToast(`เชื่อมต่อ Google Apps Script สำเร็จ! (ความเร็ว: ${latency}ms)`, "success");
    } else {
      showToast(`ตอบกลับ: ${json.message}`, "warning");
    }
  } catch (err) {
    showToast(`เชื่อมต่อไม่สำเร็จ: กรุณาตรวจสอบสิทธิ์ Deploy เป็น "Anyone" และ URL ถูกต้อง`, "error");
  }
}

async function syncWithGoogleSheet(silent = false) {
  if (!state.gasApiUrl) {
    if (!silent) showToast("ยังไม่ได้ระบุ Google Apps Script URL (อยู่ในโหมด Demo)", "warning");
    return;
  }

  const syncIcon = document.getElementById("sync-icon");
  if (syncIcon) syncIcon.classList.add("animate-spin");

  try {
    const res = await fetch(`${state.gasApiUrl}?action=getAllData`);
    const json = await res.json();

    if (json.status === "success" && json.data) {
      const d = json.data;

      if (d.materials && d.materials.length > 0) {
        state.materials = d.materials.map(m => ({
          id: m.MaterialID,
          name: m.Name,
          category: m.Category,
          unit: m.Unit,
          stock: Number(m.StockQty) || 0,
          minAlert: Number(m.MinAlertQty) || 0,
          unitCost: Number(m.UnitCost) || 0,
          emoji: m.Emoji || "📦",
          isDeleted: Boolean(m.IsDeleted),
          isSubIngredient: Boolean(m.IsSubIngredient)
        }));
      }

      if (d.menus && d.menus.length > 0) {
        state.menus = d.menus.map(m => ({
          id: m.MenuID,
          name: m.Name,
          category: m.Category,
          emoji: m.Emoji,
          description: m.Description,
          prices: typeof m.Prices_JSON === "object" ? m.Prices_JSON : {},
          recipe: typeof m.Recipe_JSON === "object" ? m.Recipe_JSON : [],
          isActive: m.IsActive !== false
        }));
      }

      if (d.addons && d.addons.length > 0) {
        state.addons = d.addons.map(a => ({
          id: a.AddonID,
          name: a.Name,
          category: a.Category,
          emoji: a.Emoji,
          prices: typeof a.Prices_JSON === "object" ? a.Prices_JSON : {},
          materialId: a.MaterialID,
          amountUsed: Number(a.AmountUsed) || 0,
          isActive: a.IsActive !== false
        }));
      }

      if (d.platforms && d.platforms.length > 0) {
        state.platforms = d.platforms.map(p => ({
          id: p.PlatformID,
          name: p.Name,
          gpPercent: Number(p.GP_Percent) || 0,
          badgeColor: p.BadgeColor || "#4A5568",
          isActive: p.IsActive !== false
        }));
      }

      if (d.recentOrders && d.recentOrders.length > 0) {
        state.orders = d.recentOrders.map(o => ({
          orderId: o.OrderID,
          createdAt: o.CreatedAt,
          platformId: o.PlatformID,
          platformName: o.PlatformName,
          subtotal: Number(o.Subtotal) || 0,
          discount: Number(o.Discount) || 0,
          gpAmount: Number(o.GP_Amount) || 0,
          netRevenue: Number(o.NetRevenue) || 0,
          foodCost: Number(o.FoodCost) || 0,
          grossProfit: Number(o.GrossProfit) || 0,
          paymentMethod: o.PaymentMethod,
          note: o.Note
        }));
      }

      persistLocal();
      updateApiStatusPill();
      if (!silent) showToast("ซิงค์ข้อมูลล่าสุดจาก Google Sheets สำเร็จ!", "success");

      // Refresh currently viewed tab
      switchTab(state.currentTab);
    }
  } catch (err) {
    if (!silent) showToast("ไม่สามารถซิงค์ข้อมูลจาก Google Sheets ได้: " + err.message, "error");
  } finally {
    if (syncIcon) syncIcon.classList.remove("animate-spin");
  }
}

function openGasGuideModal() {
  openModal("modal-gas-guide");
}

// ==========================================
// 10. TOAST NOTIFICATIONS & MODAL UTILITIES
// ==========================================

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-message";

  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span><span class="flex-1 font-medium">${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("hidden");
  lucide.createIcons();
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("hidden");
}

// ==========================================
// 11. RESET DEMO DATA
// ==========================================

function resetDemoData() {
  if (!confirm("⚠️ ต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น (Demo Data) หรือไม่?\n\n- สต็อกวัตถุดิบทั้งหมดจะกลับมาเต็มตามเดิม\n- ประวัติบิลขายและการตัดสต็อกทดสอบจะถูกรีเซ็ต\n- เมนูและราคาทุก Platform จะคืนค่ามาตรฐาน")) {
    return;
  }

  // Deep clone default arrays
  state.materials = JSON.parse(JSON.stringify(DEFAULT_MATERIALS));
  state.menus = JSON.parse(JSON.stringify(DEFAULT_MENUS));
  state.addons = JSON.parse(JSON.stringify(DEFAULT_ADDONS));
  state.platforms = JSON.parse(JSON.stringify(DEFAULT_PLATFORMS));
  state.orders = JSON.parse(JSON.stringify(DEFAULT_ORDERS));
  state.presetEmojis = JSON.parse(JSON.stringify(DEFAULT_PRESET_EMOJIS));
  state.stockTransactions = [];
  state.cart = [];
  state.posSearchQuery = "";
  state.activePosCategory = "ทั้งหมด";
  state.stockFilterCategory = "ทั้งหมด";

  // Persist to localStorage
  persistLocal();

  closeEmojiPicker();

  // Refresh current view
  switchTab(state.currentTab);

  showToast("รีเซ็ตและรีเฟรชข้อมูลตัวอย่าง (Demo Data) เรียบร้อยแล้ว!", "success");
}

// ==========================================
// 12. GLOBAL FLOATING EMOJI PICKER DROPDOWN
// ==========================================

let currentEmojiTargetInputId = null;
let currentEmojiTriggerBtn = null;
let currentEmojiCategory = "ทั้งหมด";

function openEmojiPicker(targetInputId, triggerBtn) {
  currentEmojiTargetInputId = targetInputId;
  currentEmojiTriggerBtn = triggerBtn;

  const picker = document.getElementById("global-emoji-picker");
  if (!picker) return;

  // Clear search input
  const searchInput = document.getElementById("emoji-picker-search");
  if (searchInput) searchInput.value = "";

  currentEmojiCategory = "ทั้งหมด";
  renderEmojiPickerTabs();
  renderEmojiPickerGrid();

  // Position floating popover relative to trigger button
  const rect = triggerBtn.getBoundingClientRect();
  const pickerWidth = 320;
  const pickerHeight = 350;

  // Horizontal alignment
  let left = rect.left;
  if (left + pickerWidth > window.innerWidth - 12) {
    left = Math.max(12, window.innerWidth - pickerWidth - 12);
  }

  // Vertical alignment: default below, flip above if not enough viewport room
  let top = rect.bottom + 6;
  if (top + pickerHeight > window.innerHeight - 12 && rect.top > pickerHeight + 12) {
    top = rect.top - pickerHeight - 6;
  }

  picker.style.top = `${top}px`;
  picker.style.left = `${left}px`;
  picker.classList.remove("hidden");
  lucide.createIcons();

  // Auto focus search field
  setTimeout(() => {
    if (searchInput) searchInput.focus();
  }, 60);

  // Setup click-outside listener
  setTimeout(() => {
    document.addEventListener("click", handleOutsideEmojiClick);
  }, 10);
}

function closeEmojiPicker() {
  const picker = document.getElementById("global-emoji-picker");
  if (picker) picker.classList.add("hidden");
  document.removeEventListener("click", handleOutsideEmojiClick);
}

function handleOutsideEmojiClick(e) {
  const picker = document.getElementById("global-emoji-picker");
  if (!picker || picker.classList.contains("hidden")) return;

  if (!picker.contains(e.target) && (!currentEmojiTriggerBtn || !currentEmojiTriggerBtn.contains(e.target))) {
    closeEmojiPicker();
  }
}

function setEmojiPickerCategory(cat) {
  currentEmojiCategory = cat;
  renderEmojiPickerTabs();
  const searchVal = document.getElementById("emoji-picker-search")?.value || "";
  renderEmojiPickerGrid(searchVal);
}

function filterEmojiPicker(query) {
  renderEmojiPickerGrid(query);
}

function renderEmojiPickerTabs() {
  const container = document.getElementById("emoji-picker-tabs");
  if (!container) return;

  const categories = ["ทั้งหมด", "ผลไม้", "นม/โยเกิร์ต", "ท็อปปิ้ง", "บรรจุภัณฑ์", "ขนม", "Preset"];

  container.innerHTML = categories.map(cat => {
    const isSelected = cat === currentEmojiCategory;
    let label = cat;
    if (cat === "ผลไม้") label = "🍓 ผลไม้";
    if (cat === "นม/โยเกิร์ต") label = "🥣 นม/โยเกิร์ต";
    if (cat === "ท็อปปิ้ง") label = "🍯 ท็อปปิ้ง";
    if (cat === "บรรจุภัณฑ์") label = "📦 บรรจุภัณฑ์";
    if (cat === "ขนม") label = "🍪 ขนม";
    if (cat === "Preset") label = "⭐ Preset";

    return `
      <button type="button" onclick="setEmojiPickerCategory('${cat}')" class="px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
        isSelected ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }">
        ${label}
      </button>
    `;
  }).join("");
}

function renderEmojiPickerGrid(query = "") {
  const grid = document.getElementById("emoji-picker-grid");
  if (!grid) return;

  const q = query.trim().toLowerCase();

  let list = [];

  if (currentEmojiCategory === "Preset") {
    list = (state.presetEmojis || []).map(e => ({ emoji: e, category: "Preset", keywords: e }));
  } else {
    list = EMOJI_CATALOG.filter(item => {
      if (currentEmojiCategory !== "ทั้งหมด" && item.category !== currentEmojiCategory) return false;
      return true;
    });

    // Also include presets in "ทั้งหมด" if not already present
    if (currentEmojiCategory === "ทั้งหมด" && state.presetEmojis) {
      const existingEmojis = new Set(list.map(i => i.emoji));
      state.presetEmojis.forEach(pe => {
        if (!existingEmojis.has(pe)) {
          list.push({ emoji: pe, category: "Preset", keywords: pe });
        }
      });
    }
  }

  // Filter by query (matches keywords or the emoji itself)
  if (q) {
    list = list.filter(item => item.emoji === q || item.keywords.toLowerCase().includes(q));
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="col-span-6 py-6 text-center text-stone-400 text-xs">
        <p>ไม่พบอีโมจิที่ค้นหา</p>
        <p class="mt-1 text-[11px] text-amber-800">กดปุ่ม "ใช้" ด้านบนเพื่อใช้อีโมจิที่พิมพ์ทันที</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(item => `
    <button type="button" onclick="selectEmoji('${item.emoji}')" class="emoji-picker-item" title="${item.keywords.split(' ')[0]}">
      ${item.emoji}
    </button>
  `).join("");
}

function selectEmoji(emoji) {
  if (currentEmojiTargetInputId) {
    const input = document.getElementById(currentEmojiTargetInputId);
    if (input) {
      input.value = emoji;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    const display = document.getElementById(currentEmojiTargetInputId + "-display");
    if (display) {
      display.innerText = emoji;
    }
  }

  closeEmojiPicker();
}

function applyCustomTypedEmoji() {
  const searchInput = document.getElementById("emoji-picker-search");
  const val = searchInput?.value.trim();
  if (val) {
    selectEmoji(val);
  }
}
