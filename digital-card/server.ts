
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createHttpServer } from "http";
import multer from "multer";
import sharp from "sharp";
import { pool, query, queryOne, execute } from "./db/pool";



const app = express();
app.set("trust proxy", 1);

const PORT = (process.env.PORT && !process.env.DISABLE_HMR)
  ? parseInt(process.env.PORT, 10) : 3000;

// ─── JWT_SECRET الزامی است ────────────────────────────────────────────────────
// سرور بدون این متغیر اصلاً بالا نمی‌آید — هیچ مقدار پیش‌فرض ناامنی وجود ندارد.
if (!process.env.JWT_SECRET) {
  console.error("❌ خطای راه‌اندازی: متغیر محیطی JWT_SECRET تنظیم نشده است.");
  console.error("   یک فایل .env بسازید (از روی .env.example) و یک مقدار تصادفی قرار دهید:");
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("❌ خطای راه‌اندازی: JWT_SECRET باید حداقل ۳۲ کاراکتر باشد (مقدار فعلی خیلی کوتاه و قابل حدس است).");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// ─── پوشه‌های داده ────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
[DATA_DIR, UPLOADS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });


const receiptsDir = path.join(UPLOADS_DIR, "receipts");

if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

const receiptUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, receiptsDir);
    },

    filename(req, file, cb) {
      cb(
        null,
        Date.now() +
          "-" +
          Math.random().toString(36).slice(2) +
          path.extname(file.originalname)
      );
    },
  }),
  // رسیدها فشرده/پردازش نمی‌شوند (سند مالی هستند)، فقط یک سقف منطقی برای حجم دارند
  limits: { fileSize: 10 * 1024 * 1024 }, // حداکثر 10MB
});

// ─── فشرده‌سازی تصاویر ظاهری (لوگو، تصاویر کارت، بنر) ────────────────────────
// به webp با عرض حداکثر ۱۹۲۰px تبدیل می‌شوند تا حجم دیتا و پهنای‌باند صرفه‌جویی
// شود. عمداً برای رسیدهای پرداخت استفاده نمی‌شود چون سند مالی هستند و نباید
// کیفیت/محتوایشان تغییر کند.
const MAX_IMAGE_WIDTH = 1920;
const WEBP_QUALITY = 82;

async function compressUploadedImage(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const outputPath = path.join(dir, `${base}.webp`);

  await sharp(filePath)
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);

  if (outputPath !== filePath) {
    try { fs.unlinkSync(filePath); } catch {}
  }

  return outputPath;
}

// ─── PostgreSQL: اجرای schema (idempotent — IF NOT EXISTS همه‌جا هست) ─────────
async function applySchema() {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schemaSql);
}

// ─── نگاشت پلن‌های قابل فعال‌سازی دستی توسط ادمین ────────────────────────────
const MANUAL_PLAN_LABELS: Record<string, string> = {
  "7d": "۷ روزه",
  "1m": "۱ ماهه",
  "3m": "۳ ماهه",
  "6m": "۶ ماهه",
  "1y": "۱ ساله",
};

// محاسبه تاریخ پایان اعتبار بر اساس کد پلن (هم کدهای ادمین، هم کدهای درگاه/کارت‌به‌کارت)
function addPlanDuration(base: Date, planCode: string): Date {
  const d = new Date(base);
  switch (planCode) {
    case "7d":
      d.setDate(d.getDate() + 7);
      break;
    case "1m":
    case "1month":
    case "1months":
      d.setMonth(d.getMonth() + 1);
      break;
    case "3m":
    case "3months":
      d.setMonth(d.getMonth() + 3);
      break;
    case "6m":
    case "6months":
      d.setMonth(d.getMonth() + 6);
      break;
    case "1y":
    case "12months":
    case "1year":
      d.setMonth(d.getMonth() + 12);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// اگر کاربر هم‌اکنون اشتراک فعال و منقضی‌نشده‌ای دارد، پلن جدید باید به انتهای
// همان بازه اضافه شود (جمع‌شونده)، نه اینکه از امروز محاسبه و جایگزین شود.
async function getStackedBaseDate(username: string): Promise<Date> {
  const current = await queryOne<any>(
    `SELECT expire_date, status FROM subscriptions WHERE username=$1`,
    [username],
  );

  const now = new Date();

  if (current && current.status === "active" && current.expire_date) {
    const currentExpire = new Date(current.expire_date);
    if (currentExpire.getTime() > now.getTime()) {
      return currentExpire;
    }
  }

  return now;
}

// ─── رمزگذاری ─────────────────────────────────────────────────────────────────
// از نسخه ۱۴۰۴: هش پسورد با bcrypt (async) انجام می‌شود تا event loop در حین
// لاگین بلاک نشود. هش‌های قدیمی pbkdf2$... همچنان قابل تایید هستند تا کاربران
// فعلی (ازجمله ادمین) بتوانند لاگین کنند؛ در اولین لاگین موفق، هش آن‌ها به‌صورت
// نرم (lazy) به bcrypt ارتقا پیدا می‌کند.
const BCRYPT_ROUNDS = 12;
const HASH_KEY_LEN    = 64;
const HASH_DIGEST     = "sha512";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// تایید هش‌های قدیمی pbkdf2 (فقط برای سازگاری با کاربران قدیمی)
function verifyPbkdf2Legacy(password: string, storedHash: string): boolean {
  try {
    const [, iter, salt, origHex] = storedHash.split("$");
    const derived = crypto.pbkdf2Sync(password, salt, parseInt(iter, 10), HASH_KEY_LEN, HASH_DIGEST);
    return crypto.timingSafeEqual(Buffer.from(origHex, "hex"), Buffer.from(derived.toString("hex"), "hex"));
  } catch { return false; }
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith("pbkdf2$")) return verifyPbkdf2Legacy(password, storedHash);
  if (storedHash.startsWith("$2")) return bcrypt.compare(password, storedHash); // بک‌ربت: $2a$/$2b$/$2y$
  return password === storedHash; // fallback بسیار قدیمی/نظری - عملاً نباید رخ دهد
}

/** آیا این هش با فرمت قدیمی pbkdf2 ذخیره شده؟ (برای تصمیم به آپگرید نرم) */
function isLegacyHash(storedHash: string): boolean {
  return !!storedHash && storedHash.startsWith("pbkdf2$");
}

// ─── تاریخ جلالی ─────────────────────────────────────────────────────────────
function getJalaliDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" } as const).format(date);
}

// ─── کلیدهای تاریخ/ساعت به فرم ISO (برای ذخیره‌سازی قابل‌مرتب‌سازی و قابل‌محاسبه) ──
function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
function isoHourKey(date: Date): string {
  return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

// ─── داده پیش‌فرض کارت ───────────────────────────────────────────────────────
function createDefaultCardData(brandName: string) {
  return {
    businessName: brandName, brandManager: "", slogan: "", description: "",
    logoUrl: "", bgImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    phones: [], landlines: [], branches: [], website: "",
    socials: { instagram: "", telegram: "", whatsapp: "", youtube: "", aparat: "", bale: "", rubika: "", soroush: "" },
    gallery: [], products: [],
    workingDays: {
      "شنبه":    { isOpen: true,  openTime: "09:00", closeTime: "18:00", isClosed: false },
      "یکشنبه":  { isOpen: true,  openTime: "09:00", closeTime: "18:00", isClosed: false },
      "دوشنبه":  { isOpen: true,  openTime: "09:00", closeTime: "18:00", isClosed: false },
      "سه شنبه": { isOpen: true,  openTime: "09:00", closeTime: "18:00", isClosed: false },
      "چهارشنبه":{ isOpen: true,  openTime: "09:00", closeTime: "18:00", isClosed: false },
      "پنجشنبه": { isOpen: true,  openTime: "09:00", closeTime: "14:00", isClosed: false },
      "جمعه":    { isOpen: false, openTime: "00:00", closeTime: "00:00", isClosed: true  },
    },
    design: { template: "modern", colorTheme: "#3B82F6", isDark: false },
    stats:  { totalVisits: 0, scans: 0, linkOpens: 0, buttonClicks: 0, dailyVisits: {}, dailyStats: {}, hourlyStats: {} },
  };
}

// ─── Seed داده اولیه ──────────────────────────────────────────────────────────
// اطلاعات ادمین دیگر در کد هاردکد نیست و فقط از متغیرهای محیطی خوانده می‌شود.
async function seedAdminUser() {
  const existing = await queryOne(`SELECT 1 FROM users WHERE username = 'admin'`);
  if (existing) return;

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminFullName = process.env.ADMIN_FULL_NAME;
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPhone    = process.env.ADMIN_PHONE;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminEmail || !adminPassword) {
    console.error(
      "[FATAL] برای ساخت حساب ادمین، مقادیر ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD " +
      "(و ترجیحاً ADMIN_FULL_NAME, ADMIN_PHONE) باید در .env تنظیم شده باشند."
    );
    process.exit(1);
  }

  await execute(
    `INSERT INTO users (username,full_name,email,phone,password_hash,card_data)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      adminUsername,
      adminFullName || "مدیر کل پلتفرم",
      adminEmail,
      adminPhone || "",
      await hashPassword(adminPassword),
      JSON.stringify(createDefaultCardData("کارت نمونه ادمین")),
    ],
  );
}

async function seedInitialData() {
  // بنرهای پیش‌فرض
  const defaultBanners: [string, string, string][] = [
    ["banner1", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80", "کارت ویزیت دیجیتال رایگان خود را بسازید"],
    ["banner2", "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&q=80", "چاپ کارت فیزیکی با برچسب هوشمند NFC"],
    ["banner3", "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=800&q=80", "کسب و کار خود را در نقشه گوگل ثبت کنید"],
  ];
  for (const [id, imageUrl, title] of defaultBanners) {
    await execute(
      `INSERT INTO banners (id,image_url,title) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [id, imageUrl, title],
    );
  }

  // پلن‌های پیش‌فرض
  const defaultPlans: [string, string, number, number, boolean, boolean, number][] = [
    ["free", "رایگان", 0, 0, true, true, 1],
    ["7d", "۷ روزه", 0, 0, false, true, 2],
    ["1m", "یک ماهه", 1, 0, false, true, 3],
    ["3m", "سه ماهه", 3, 0, false, true, 4],
    ["6m", "شش ماهه", 6, 0, false, true, 5],
    ["1y", "یک ساله", 12, 0, false, true, 6],
  ];
  for (const [id, title, months, price, isFree, isActive, sortOrder] of defaultPlans) {
    await execute(
      `INSERT INTO subscription_plans (id,title,months,price,is_free,is_active,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [id, title, months, price, isFree, isActive, sortOrder],
    );
  }

  const defaultFeatures: [string, string, string, boolean][] = [
    ["free-modern", "free", "modern_editor", true],
    ["free-classic", "free", "classic_editor", true],
    ["free-pro", "free", "pro_editor", true],
  ];
  for (const [id, planId, featureKey, enabled] of defaultFeatures) {
    await execute(
      `INSERT INTO subscription_features (id,plan_id,feature_key,enabled)
       VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
      [id, planId, featureKey, enabled],
    );
  }

  // برای هر کاربری که هنوز رکورد subscriptions ندارد، یک رکورد رایگان بساز
  const usersWithoutSub = await query<{ username: string }>(
    `SELECT u.username FROM users u LEFT JOIN subscriptions s ON s.username = u.username WHERE s.username IS NULL`,
  );
  for (const u of usersWithoutSub) {
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO subscriptions (id, username, plan, status, start_date, expire_date, created_at, updated_at)
       VALUES ($1,$2,'free','free','','',$3,$3) ON CONFLICT (username) DO NOTHING`,
      [crypto.randomUUID(), u.username, now],
    );
  }
}

// ─── Helper: کاربر از DB ─────────────────────────────────────────────────────
async function getUser(username: string): Promise<any | null> {
  const row = await queryOne<any>(`SELECT * FROM users WHERE LOWER(username)=LOWER($1)`, [username]);
  if (!row) return null;
  return {
    ...row, isSuspended: !!row.is_suspended, fullName: row.full_name,
    passwordHash: row.password_hash, qrImageUrl: row.qr_image_url,
    qrRequestStatus: row.qr_request_status, qrRequestTime: row.qr_request_time,
    // pg برای ستون‌های jsonb به‌صورت خودکار JSON را parse می‌کند
    cardData: row.card_data || {},
  };
}

async function getUserSubscription(username: string): Promise<any | null> {
  let sub = await queryOne<any>(`SELECT * FROM subscriptions WHERE LOWER(username)=LOWER($1) LIMIT 1`, [username]);

  if (!sub) {
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO subscriptions (id, username, plan, status, start_date, expire_date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ["sub-" + Date.now(), username, "free", "free", now, "", now, now],
    );
    sub = await queryOne<any>(`SELECT * FROM subscriptions WHERE LOWER(username)=LOWER($1) LIMIT 1`, [username]);
  }

  return sub;
}

// ─── تاریخچه بازدید (visit_stats/visit_totals) ────────────────────────────────
// یک بازدید/کلیک را در جدول‌های visit_totals (مجموع کلی) و visit_stats
// (سطل‌های روزانه/ساعتی) با یک UPSERT سبک ثبت می‌کند.
async function recordVisitEvent(
  username: string,
  deltas: { visits?: number; scans?: number; linkOpens?: number; buttonClicks?: number },
) {
  const v = deltas.visits || 0;
  const s = deltas.scans || 0;
  const l = deltas.linkOpens || 0;
  const b = deltas.buttonClicks || 0;

  await execute(
    `INSERT INTO visit_totals (username, total_visits, scans, link_opens, button_clicks)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (username) DO UPDATE SET
       total_visits = visit_totals.total_visits + $2,
       scans = visit_totals.scans + $3,
       link_opens = visit_totals.link_opens + $4,
       button_clicks = visit_totals.button_clicks + $5`,
    [username, v, s, l, b],
  );

  const now = new Date();
  for (const [granularity, period] of [["day", isoDateKey(now)], ["hour", isoHourKey(now)]] as const) {
    await execute(
      `INSERT INTO visit_stats (username, granularity, period, visits, scans, link_opens, button_clicks)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (username, granularity, period) DO UPDATE SET
         visits = visit_stats.visits + $4,
         scans = visit_stats.scans + $5,
         link_opens = visit_stats.link_opens + $6,
         button_clicks = visit_stats.button_clicks + $7`,
      [username, granularity, period, v, s, l, b],
    );
  }
}

/** ساخت شیء stats کامل (مجموع + تاریخچه روزانه/ساعتی) برای نمایش در پیشخوان کاربر */
async function buildFullStats(username: string) {
  const totals = await queryOne<any>(`SELECT * FROM visit_totals WHERE username=$1`, [username]);
  const dailyRows = await query<any>(`SELECT * FROM visit_stats WHERE username=$1 AND granularity='day'`, [username]);
  const hourlyRows = await query<any>(`SELECT * FROM visit_stats WHERE username=$1 AND granularity='hour'`, [username]);

  const dailyStats: Record<string, any> = {};
  dailyRows.forEach((r) => {
    dailyStats[r.period] = { visits: r.visits, scans: r.scans, linkOpens: r.link_opens, buttonClicks: r.button_clicks };
  });
  const hourlyStats: Record<string, any> = {};
  hourlyRows.forEach((r) => {
    hourlyStats[r.period] = { visits: r.visits, scans: r.scans, linkOpens: r.link_opens, buttonClicks: r.button_clicks };
  });

  return {
    totalVisits: totals?.total_visits || 0,
    scans: totals?.scans || 0,
    linkOpens: totals?.link_opens || 0,
    buttonClicks: totals?.button_clicks || 0,
    dailyVisits: {}, // فیلد قدیمی — دیگر استفاده نمی‌شود، فقط برای سازگاری تایپ نگه داشته شده
    dailyStats,
    hourlyStats,
  };
}

// ─── WebSocket Manager ────────────────────────────────────────────────────────
interface WsClient { ws: WebSocket; ticketId: string | null; username: string; role: "user"|"admin"; }
const wsClients: WsClient[] = [];

function broadcastToTicket(ticketId: string, payload: object) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(c => {
    const isWatchingThisTicket = c.ticketId === ticketId;
    const isAdminWatchingAll = c.role === "admin" && c.ticketId === "ALL_ADMIN";
    if ((isWatchingThisTicket || isAdminWatchingAll) && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}
function notifyAdmin(payload: object) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(c => {
    if (c.role === "admin" && c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  });
}
function notifyUser(username: string, payload: object) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(c => {
    if (c.role === "user" && c.username.toLowerCase() === username.toLowerCase() && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(msg);
    }
  });
}

// ─── Multer: آپلود فایل روی دیسک ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const username = req.username || "general";
    const userDir  = path.join(UPLOADS_DIR, username);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // حداکثر 10MB (بعد از آپلود با sharp فشرده می‌شود)
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("فقط فایل‌های تصویری مجاز هستند."));
  },
});

// ─── آپلود ویدیوی آموزشی (فقط ادمین، حجم بیشتر چون فایل ویدیویی است) ─────────
const videoUpload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 }, // حداکثر 80MB
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("فقط فایل‌های ویدیویی (mp4, webm, mov) مجاز هستند."));
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/uploads", express.static(UPLOADS_DIR));

// Rate limiter
const rateLimitStore: { [ip: string]: { count: number; resetTime: number } } = {};
const loginLimitStore: { [ip: string]: { count: number; resetTime: number } } = {};

app.use((req, res, next) => {
  const ip  = req.ip || "unknown";
  const now = Date.now();
  if (!rateLimitStore[ip] || now > rateLimitStore[ip].resetTime)
    rateLimitStore[ip] = { count: 1, resetTime: now + 60_000 };
  else rateLimitStore[ip].count++;
  if (rateLimitStore[ip].count > 300) return res.status(429).json({ message: "تعداد درخواست‌ها بیش از حد مجاز است." });
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

function verifyToken(req: any, res: any, next: any) {
  const token =
    req.cookies?.authToken ||
    req.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "توکن یافت نشد" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    req.username = decoded.username;
    next();
  } catch {
    return res.status(401).json({ message: "توکن نامعتبر است" });
  }
}

function verifyAdmin(req: any, res: any, next: any) {
  verifyToken(req, res, () => {
    if (req.username !== "admin") return res.status(403).json({ message: "دسترسی ادمین لازم است." });
    next();
  });
}

// ─── آپلود تصویر ─────────────────────────────────────────────────────────────
app.post("/api/upload", verifyToken, upload.single("image"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "فایلی ارسال نشد." });
  try {
    const compressedPath = await compressUploadedImage(req.file.path);
    const fileUrl = `/uploads/${req.username}/${path.basename(compressedPath)}`;
    return res.json({ url: fileUrl });
  } catch (err) {
    console.error("خطا در فشرده‌سازی تصویر:", err);
    return res.json({ url: `/uploads/${req.username}/${req.file.filename}` });
  }
});

app.post("/api/admin/upload", verifyAdmin, upload.single("image"), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "فایلی ارسال نشد." });
  try {
    const compressedPath = await compressUploadedImage(req.file.path);
    const fileUrl = `/uploads/admin/${path.basename(compressedPath)}`;
    return res.json({ url: fileUrl });
  } catch (err) {
    console.error("خطا در فشرده‌سازی تصویر:", err);
    return res.json({ url: `/uploads/admin/${req.file.filename}` });
  }
});

app.post("/api/admin/upload-video", verifyAdmin, videoUpload.single("video"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "فایلی ارسال نشد." });
  const fileUrl = `/uploads/admin/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.get("/api/auth/check-username/:username", async (req, res) => {
  const u = req.params.username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9]+$/.test(u)) return res.json({ available: false, error: "فقط حروف انگلیسی و اعداد مجاز است" });
  if (u.length < 3 || u.length > 30) return res.json({ available: false, error: "بین ۳ تا ۳۰ کاراکتر" });
  const exists = await queryOne(`SELECT 1 FROM users WHERE LOWER(username)=$1`, [u]);
  return res.json(exists ? { available: false, error: "این نام کاربری قبلاً ثبت شده" } : { available: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { fullName, username, email, phone, password, confirmPassword } = req.body;
  if (!fullName || !username || !email || !phone || !password || !confirmPassword)
    return res.status(400).json({ message: "لطفا تمامی فیلدها را وارد نمایید." });
  const u = username.trim().toLowerCase();
  if (u.length < 3 || u.length > 30)  return res.status(400).json({ message: "نام کاربری باید ۳ تا ۳۰ کاراکتر باشد." });
  if (!/^[a-zA-Z0-9]+$/.test(u))      return res.status(400).json({ message: "نام کاربری فقط حروف انگلیسی و اعداد." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "فرمت ایمیل صحیح نیست." });
  if (!/^09\d{9}$/.test(phone))        return res.status(400).json({ message: "شماره همراه باید ۱۱ رقم با 09 شروع شود." });
  if (password.length < 8)             return res.status(400).json({ message: "رمز عبور حداقل ۸ کاراکتر باشد." });
  if (password !== confirmPassword)    return res.status(400).json({ message: "رمز عبور با تکرار آن مطابقت ندارد." });
  try {
    await execute(
      `INSERT INTO users (username,full_name,email,phone,password_hash,card_data) VALUES ($1,$2,$3,$4,$5,$6)`,
      [u, fullName, email.trim(), phone.trim(), await hashPassword(password), JSON.stringify(createDefaultCardData(fullName))],
    );
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO subscriptions (id, username, plan, status, start_date, expire_date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ["sub-" + Date.now(), u, "free", "free", now, "", now, now],
    );
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (err?.code === "23505" || msg.includes("UNIQUE") || msg.includes("duplicate key")) {
      if (msg.includes("email")) return res.status(400).json({ message: "این ایمیل قبلاً ثبت شده." });
      if (msg.includes("phone")) return res.status(400).json({ message: "این شماره قبلاً ثبت شده." });
      return res.status(400).json({ message: "نام کاربری تکراری است." });
    }
    console.error(err);
    return res.status(500).json({ message: "خطای سرور." });
  }
  const token = jwt.sign({ username: u }, JWT_SECRET, { expiresIn: "1d" });
  res.cookie("authToken", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/", maxAge: 86_400_000 });
  return res.json({ message: "ثبت‌نام موفق.", token, user: { fullName, username: u, email, phone, isSuspended: false } });
});

app.post("/api/auth/login", async (req, res) => {
  const ip  = req.ip || "unknown";
  const now = Date.now();
  if (!loginLimitStore[ip] || now > loginLimitStore[ip].resetTime)
    loginLimitStore[ip] = { count: 1, resetTime: now + 60_000 };
  else loginLimitStore[ip].count++;
  if (loginLimitStore[ip].count > 10)
    return res.status(429).json({ message: "تعداد تلاش‌های ورود بیش از حد است. یک دقیقه صبر کنید." });

  const { loginId, password } = req.body;
  if (!loginId || !password) return res.status(400).json({ message: "شناسه کاربری و رمز عبور الزامی است." });
  const id   = loginId.trim().toLowerCase();
  const user = await queryOne<any>(
    `SELECT * FROM users WHERE LOWER(email)=$1 OR phone=$1 OR LOWER(username)=$1`,
    [id],
  );
  if (!user || !(await verifyPassword(password, user.password_hash)))
    return res.status(400).json({ message: "شناسه یا رمز عبور اشتباه است." });
  if (user.is_suspended)
    return res.status(403).json({ message: "حساب شما تعلیق شده است.", isSuspended: true });
  if (isLegacyHash(user.password_hash))
    await execute(`UPDATE users SET password_hash=$1 WHERE username=$2`, [await hashPassword(password), user.username]);

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "10d" });
  res.cookie("authToken", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/", maxAge: 864_000_000 });
  return res.json({
    message: "ورود موفق.", token,
    user: { fullName: user.full_name, username: user.username, email: user.email,
      phone: user.phone, isSuspended: false, qrRequestStatus: user.qr_request_status, qrImageUrl: user.qr_image_url },
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("authToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/" });
  return res.json({ message: "خروج موفق." });
});

app.get("/api/auth/me", async (req, res) => {
  const token = req.cookies?.authToken || req.headers?.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ loggedIn: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await queryOne<any>(`SELECT * FROM users WHERE username=$1`, [decoded.username]);
    if (!user) return res.status(401).json({ loggedIn: false });
    return res.json({
      loggedIn: true, token,
      user: { fullName: user.full_name, username: user.username, email: user.email,
        phone: user.phone, isSuspended: !!user.is_suspended,
        qrRequestStatus: user.qr_request_status, qrImageUrl: user.qr_image_url },
    });
  } catch {
    res.clearCookie("authToken");
    return res.status(401).json({ loggedIn: false });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, phone, username, newPassword } = req.body;
  if (!email || !phone || !username || !newPassword)
    return res.status(400).json({ message: "لطفا تمامی فیلدها را وارد کنید." });
  if (newPassword.length < 8) return res.status(400).json({ message: "رمز جدید حداقل ۸ کاراکتر." });
  const user = await queryOne<any>(
    `SELECT * FROM users WHERE LOWER(username)=$1 AND LOWER(email)=$2 AND phone=$3`,
    [username.trim().toLowerCase(), email.trim().toLowerCase(), phone.trim()],
  );
  if (!user) return res.status(400).json({ message: "مشخصات وارد شده همخوانی ندارد." });
  await execute(`UPDATE users SET password_hash=$1 WHERE username=$2`, [await hashPassword(newPassword), user.username]);
  return res.json({ message: "رمز عبور با موفقیت بازنشانی شد." });
});

// ─── Card Routes ──────────────────────────────────────────────────────────────
app.get("/api/card/:username", async (req, res) => {
  const source = (req.query.source as string) || "link";
  const user   = await getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کارت ویزیت یافت نشد." });
  if (user.isSuspended) return res.status(403).json({ message: "این کارت به دلیل تعلیق حساب غیرفعال است.", isSuspended: true });

  await recordVisitEvent(user.username, {
    visits: 1,
    scans: source === "scan" ? 1 : 0,
    linkOpens: source === "scan" ? 0 : 1,
  });

  return res.json({ fullName: user.fullName, username: user.username, cardData: user.cardData });
});

app.post("/api/card/:username/click", async (req, res) => {
  const user = await getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

  await recordVisitEvent(user.username, { buttonClicks: 1 });

  return res.json({ success: true });
});

app.get("/api/user/card/:username", verifyToken, async (req: any, res) => {
  if (req.username !== req.params.username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const user = await getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

  const fullStats = await buildFullStats(user.username);
  return res.json({ ...user.cardData, stats: fullStats });
});

app.post("/api/user/card/:username", verifyToken, async (req: any, res) => {
  if (req.username !== req.params.username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const user = await getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
  // آمار قفل می‌شه — کاربر نمی‌تونه دستکاری کنه (آمار واقعی از visit_stats/visit_totals می‌آید)
  const newCardData = { ...req.body, stats: user.cardData.stats };
  await execute(
    `UPDATE users SET card_data=$1, card_updated_at=now() WHERE LOWER(username)=LOWER($2)`,
    [JSON.stringify(newCardData), req.params.username],
  );

  // اطلاع به card-server برای invalidate کردن کش HTML این کاربر (best-effort،
  // نباید ذخیره‌سازی کارت را کند یا ناموفق کند اگر card-server در دسترس نبود)
  if (process.env.CARD_SERVER_URL && process.env.INTERNAL_SECRET) {
    fetch(`${process.env.CARD_SERVER_URL}/internal/invalidate/${req.params.username}`, {
      method: "POST",
      headers: { "x-internal-secret": process.env.INTERNAL_SECRET },
    }).catch(() => { /* silent — یک TTL کوتاه در card-server خودش هم این را جبران می‌کند */ });
  }
  return res.json({ message: "کارت با موفقیت ذخیره شد.", cardData: newCardData });
});

// ─── QR ───────────────────────────────────────────────────────────────────────
app.post("/api/user/:username/qr-request", verifyToken, async (req: any, res) => {
  if (req.username !== req.params.username) return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const changed = await execute(
    `UPDATE users SET qr_request_status='pending', qr_request_time=$1 WHERE LOWER(username)=LOWER($2)`,
    [new Date().toLocaleString("fa-IR"), req.params.username],
  );
  if (!changed) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json({ message: "درخواست کارت فیزیکی ثبت شد." });
});

// ─── Ticket Routes ────────────────────────────────────────────────────────────
app.get("/api/user/:username/tickets", verifyToken, async (req: any, res) => {
  if (req.username !== req.params.username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const rows = await query<any>(
    `SELECT * FROM tickets WHERE LOWER(username)=LOWER($1) ORDER BY last_message_at DESC`,
    [req.params.username],
  );
  return res.json(rows.map(t => ({
    ...t,
    userFullName: t.user_fullname,
    createdAt: t.created_at,
    lastMessageAt: t.last_message_at,
    adminLastReadAt: t.admin_last_read_at,
    messages: t.messages, // jsonb — از قبل parse شده
  })));
});

app.post("/api/user/:username/tickets", verifyToken, async (req: any, res) => {
  const { username } = req.params;
  const { title, description } = req.body;
  if (req.username !== username) return res.status(403).json({ message: "دسترسی غیرمجاز." });
  if (!title || !description) return res.status(400).json({ message: "عنوان و توضیحات الزامی است." });
  const userRow = await queryOne<any>(`SELECT full_name FROM users WHERE username=$1`, [username]);
  const now  = new Date();
  const id = "ticket-" + Date.now();
  const userFullname = userRow?.full_name || "کاربر";
  const createdAt =
    now.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" }) +
    " - " +
    now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" });
  const messages = [
    {
      id: "msg-1",
      sender: "user",
      message: description,
      ts: now.getTime(),
      createdAt: now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }),
    },
  ];

  await execute(
    `INSERT INTO tickets (id,username,user_fullname,title,description,status,created_at,messages,last_message_at,admin_last_read_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, username, userFullname, title, description, "pending", createdAt, JSON.stringify(messages), now.toISOString(), ""],
  );

  const ticket = {
    id, username, userFullName: userFullname, title, description, status: "pending",
    createdAt, messages, lastMessageAt: now.toISOString(), adminLastReadAt: "",
  };
  notifyAdmin({ type: "new_ticket", ticket });
  return res.json({ message: "تیکت ثبت شد.", ticket });
});

app.post("/api/user/:username/tickets/:ticketId/messages", verifyToken, async (req: any, res) => {
  const { username, ticketId } = req.params;
  const { message, attachment } = req.body;
  if (req.username !== username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const ticket = await queryOne<any>(`SELECT * FROM tickets WHERE id=$1`, [ticketId]);
  if (!ticket) return res.status(404).json({ message: "تیکت یافت نشد." });
  if (ticket.status === "ended") return res.status(400).json({ message: "این تیکت بسته شده." });

  const isAdmin = req.username === "admin";
  const messages = ticket.messages; // jsonb — از قبل parse شده
  const now = new Date();
  const newMsg: any = {
    id: "msg-" + Date.now(),
    sender: isAdmin ? "support" : "user",
    message,
    ts: now.getTime(),
    createdAt: now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }),
  };
  // ارسال فایل/عکس در تیکت فقط برای ادمین مجاز است
  if (attachment && isAdmin) newMsg.attachment = attachment;

  messages.push(newMsg);
  const newStatus = !isAdmin ? "under_review" : ticket.status;
  const nowIso = now.toISOString();
  const adminLastReadAt = isAdmin ? nowIso : ticket.admin_last_read_at;

  await execute(
    `UPDATE tickets SET messages=$1, status=$2, last_message_at=$3, admin_last_read_at=$4 WHERE id=$5`,
    [JSON.stringify(messages), newStatus, nowIso, adminLastReadAt, ticketId],
  );

  broadcastToTicket(ticketId, { type: "new_message", ticketId, message: newMsg, newStatus, lastMessageAt: nowIso });
  notifyAdmin({ type: "ticket_updated", ticketId, username, newStatus, lastMessageAt: nowIso });
  if (isAdmin) notifyUser(ticket.username, { type: "new_message", ticketId, message: newMsg, newStatus, lastMessageAt: nowIso });
  return res.json(newMsg);
});

// ─── علامت‌گذاری تیکت به‌عنوان خوانده‌شده توسط ادمین ──────────────────────────
app.post("/api/admin/tickets/:ticketId/read", verifyAdmin, async (req, res) => {
  const nowIso = new Date().toISOString();
  const changed = await execute(`UPDATE tickets SET admin_last_read_at=$1 WHERE id=$2`, [nowIso, req.params.ticketId]);
  if (!changed) return res.status(404).json({ message: "تیکت یافت نشد." });
  return res.json({ success: true, adminLastReadAt: nowIso });
});

// ─── شروع تیکت جدید توسط ادمین برای یک کاربر مشخص ────────────────────────────
app.post("/api/admin/tickets", verifyAdmin, async (req, res) => {
  const { username, title, message } = req.body;
  if (!username || !title || !message)
    return res.status(400).json({ message: "کاربر، عنوان و متن پیام الزامی است." });

  const user = await queryOne<any>(`SELECT full_name FROM users WHERE LOWER(username)=LOWER($1)`, [username]);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });

  const now = new Date();
  const createdAtStr =
    now.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" }) +
    " - " +
    now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" });

  const id = "ticket-" + Date.now();
  const userFullname = user.full_name || "کاربر";
  const messages = [
    {
      id: "msg-1",
      sender: "support",
      message,
      ts: now.getTime(),
      createdAt: now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }),
    },
  ];

  await execute(
    `INSERT INTO tickets (id,username,user_fullname,title,description,status,created_at,messages,last_message_at,admin_last_read_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, username, userFullname, title, message, "under_review", createdAtStr, JSON.stringify(messages), now.toISOString(), now.toISOString()],
  );

  const ticket = {
    id, username, userFullName: userFullname, title, description: message,
    status: "under_review", createdAt: createdAtStr, messages,
    lastMessageAt: now.toISOString(), adminLastReadAt: now.toISOString(),
  };

  notifyUser(username, { type: "new_ticket", ticket });
  return res.json({ message: "تیکت با موفقیت برای کاربر ثبت شد.", ticket });
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.get("/api/admin/stats", verifyAdmin, async (req, res) => {
  const totalCustomers = Number((await queryOne<any>(`SELECT COUNT(*) as c FROM users WHERE username!='admin'`))?.c || 0);
  const cardsWithQr    = Number((await queryOne<any>(`SELECT COUNT(*) as c FROM users WHERE qr_request_status='approved'`))?.c || 0);
  const totalVisits    = Number((await queryOne<any>(`SELECT COALESCE(SUM(total_visits),0) as s FROM visit_totals`))?.s || 0);

  const proUsersCount = Number((await queryOne<any>(
    `SELECT COUNT(*) as c FROM subscriptions WHERE status='active' AND expire_date > $1 AND LOWER(username) != 'admin'`,
    [new Date().toISOString()],
  ))?.c || 0);

  // ── تجمیع بازدید روزانه/ساعتی سایت (SUM با SQL، مستقیم از visit_stats) ──
  const dailyVisitRows = await query<any>(`SELECT period, SUM(visits) as v FROM visit_stats WHERE granularity='day' GROUP BY period`);
  const hourlyVisitRows = await query<any>(`SELECT period, SUM(visits) as v FROM visit_stats WHERE granularity='hour' GROUP BY period`);
  const dailyVisits: Record<string, number> = {};
  dailyVisitRows.forEach((r) => { dailyVisits[r.period] = Number(r.v) || 0; });
  const hourlyVisits: Record<string, number> = {};
  hourlyVisitRows.forEach((r) => { hourlyVisits[r.period] = Number(r.v) || 0; });

  // ── مشتریان جدید در هر روز/ساعت (بر اساس زمان ثبت‌نام) ──
  const signupRows = await query<any>(`SELECT created_at FROM subscriptions WHERE LOWER(username) != 'admin'`);
  const dailySignups: Record<string, number> = {};
  const hourlySignups: Record<string, number> = {};
  signupRows.forEach((s) => {
    if (!s.created_at) return;
    const dKey = s.created_at.slice(0, 10);
    const hKey = s.created_at.slice(0, 13);
    dailySignups[dKey] = (dailySignups[dKey] || 0) + 1;
    hourlySignups[hKey] = (hourlySignups[hKey] || 0) + 1;
  });

  // ── تایید کیوآرکد در هر روز/ساعت ──
  const qrRows = await query<any>(`SELECT qr_approved_at FROM users WHERE qr_approved_at != ''`);
  const dailyQrApprovals: Record<string, number> = {};
  const hourlyQrApprovals: Record<string, number> = {};
  qrRows.forEach((q) => {
    const dKey = q.qr_approved_at.slice(0, 10);
    const hKey = q.qr_approved_at.slice(0, 13);
    dailyQrApprovals[dKey] = (dailyQrApprovals[dKey] || 0) + 1;
    hourlyQrApprovals[hKey] = (hourlyQrApprovals[hKey] || 0) + 1;
  });

  // ── فعال‌سازی پلن پرو در هر روز/ساعت ──
  const proRows = await query<any>(`SELECT approved_at FROM subscription_purchases WHERE payment_status='approved' AND approved_at != ''`);
  const dailyProActivations: Record<string, number> = {};
  const hourlyProActivations: Record<string, number> = {};
  proRows.forEach((p) => {
    const dKey = p.approved_at.slice(0, 10);
    const hKey = p.approved_at.slice(0, 13);
    dailyProActivations[dKey] = (dailyProActivations[dKey] || 0) + 1;
    hourlyProActivations[hKey] = (hourlyProActivations[hKey] || 0) + 1;
  });

  const allDailyKeys = new Set([
    ...Object.keys(dailyVisits), ...Object.keys(dailySignups),
    ...Object.keys(dailyQrApprovals), ...Object.keys(dailyProActivations),
  ]);
  const dailyStats: Record<string, { visits: number; signups: number; qrApprovals: number; proActivations: number }> = {};
  allDailyKeys.forEach((k) => {
    dailyStats[k] = {
      visits: dailyVisits[k] || 0,
      signups: dailySignups[k] || 0,
      qrApprovals: dailyQrApprovals[k] || 0,
      proActivations: dailyProActivations[k] || 0,
    };
  });

  const allHourlyKeys = new Set([
    ...Object.keys(hourlyVisits), ...Object.keys(hourlySignups),
    ...Object.keys(hourlyQrApprovals), ...Object.keys(hourlyProActivations),
  ]);
  const hourlyStats: Record<string, { visits: number; signups: number; qrApprovals: number; proActivations: number }> = {};
  allHourlyKeys.forEach((k) => {
    hourlyStats[k] = {
      visits: hourlyVisits[k] || 0,
      signups: hourlySignups[k] || 0,
      qrApprovals: hourlyQrApprovals[k] || 0,
      proActivations: hourlyProActivations[k] || 0,
    };
  });

  return res.json({ totalCustomers, cardsWithQr, totalVisits, proUsersCount, dailyStats, hourlyStats });
});

app.get("/api/admin/users", verifyAdmin, async (req, res) => {
  const rows = await query<any>(`SELECT * FROM users WHERE username!='admin'`);
  return res.json(rows.map(r => ({
    fullName: r.full_name, username: r.username, email: r.email, phone: r.phone,
    isSuspended: !!r.is_suspended, qrRequestStatus: r.qr_request_status,
    qrImageUrl: r.qr_image_url, qrRequestTime: r.qr_request_time,
    cardData: r.card_data,
  })));
});

app.get("/api/admin/subscription-purchases", verifyAdmin, async (req, res) => {
  const rows = await query(
    `SELECT sp.*, u.full_name
     FROM subscription_purchases sp
     JOIN users u ON sp.username = u.username
     ORDER BY sp.created_at DESC`,
  );
  return res.json(rows);
});

app.get("/api/debug/subscriptions", async (req, res) => {
  const rows = await query(`SELECT * FROM subscriptions`);
  res.json(rows);
});

app.post("/api/admin/subscription-purchases/:id/approve", verifyAdmin, async (req, res) => {
  const purchaseId = req.params.id;
  const purchase = await queryOne<any>(`SELECT * FROM subscription_purchases WHERE id = $1`, [purchaseId]);

  if (!purchase) return res.status(404).json({ success: false });
  if (purchase.payment_status === "approved") return res.json({ success: true });

  const now = new Date();
  const base = await getStackedBaseDate(purchase.username);
  const expire = addPlanDuration(base, purchase.plan);

  await execute(
    `UPDATE subscription_purchases
     SET payment_status='approved', approved_at=$1, approved_by='admin', start_date=$2, expire_date=$3
     WHERE id=$4`,
    [now.toISOString(), now.toISOString(), expire.toISOString(), purchaseId],
  );

  await execute(
    `INSERT INTO subscriptions(id, username, plan, status, start_date, expire_date, created_at, updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT(username)
     DO UPDATE SET
       plan=excluded.plan, status='active',
       start_date=excluded.start_date, expire_date=excluded.expire_date,
       updated_at=excluded.updated_at`.replace(/excluded\./g, "EXCLUDED."),
    [crypto.randomUUID(), purchase.username, purchase.plan, "active", now.toISOString(), expire.toISOString(), now.toISOString(), now.toISOString()],
  );

  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────
// API: فعال‌سازی مستقیم پلن توسط ادمین (بدون نیاز به رسید کارت‌به‌کارت)
// ──────────────────────────────────────────────────────────────────────────
app.post("/api/admin/users/:username/activate-plan", verifyAdmin, async (req: any, res) => {
  const username = req.params.username;
  const { plan } = req.body;

  if (!MANUAL_PLAN_LABELS[plan]) {
    return res.status(400).json({ success: false, message: "پلن انتخاب‌شده معتبر نیست." });
  }

  const user = await queryOne(`SELECT username FROM users WHERE LOWER(username)=LOWER($1)`, [username]);
  if (!user) return res.status(404).json({ success: false, message: "کاربر یافت نشد." });

  const now = new Date();
  const base = await getStackedBaseDate(username);
  const expire = addPlanDuration(base, plan);

  await execute(
    `INSERT INTO subscriptions(id, username, plan, status, start_date, expire_date, created_at, updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT(username)
     DO UPDATE SET
       plan=EXCLUDED.plan, status='active',
       start_date=EXCLUDED.start_date, expire_date=EXCLUDED.expire_date,
       updated_at=EXCLUDED.updated_at`,
    [crypto.randomUUID(), username, plan, "active", now.toISOString(), expire.toISOString(), now.toISOString(), now.toISOString()],
  );

  await execute(
    `INSERT INTO subscription_purchases (
       id, username, plan, duration_months, amount, payment_method,
       payment_status, transaction_id, receipt_image, description,
       created_at, approved_at, approved_by, start_date, expire_date
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      crypto.randomUUID(), username, plan, 0, 0, "manual", "approved", "", "",
      `فعال‌سازی مستقیم پلن ${MANUAL_PLAN_LABELS[plan]} توسط ادمین`,
      now.toISOString(), now.toISOString(), "admin", now.toISOString(), expire.toISOString(),
    ],
  );

  return res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────
// API: گزارش کامل وضعیت اشتراک همه کاربران (تاریخ ثبت‌نام، پلن، بازه اعتبار)
// ──────────────────────────────────────────────────────────────────────────
app.get("/api/admin/subscriptions-overview", verifyAdmin, async (req, res) => {
  const rows = await query<any>(`
    SELECT u.username, u.full_name, u.email, u.phone,
           s.plan, s.status, s.start_date, s.expire_date, s.created_at AS registered_at
    FROM users u
    LEFT JOIN subscriptions s ON s.username = u.username
    WHERE u.username != 'admin'
    ORDER BY s.created_at DESC
  `);

  const now = Date.now();
  const data = rows.map((r) => {
    let remainingDays = 0;
    if (r.expire_date) {
      const diff = new Date(r.expire_date).getTime() - now;
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    return { ...r, remainingDays };
  });

  return res.json(data);
});

app.post("/api/admin/users/:username/edit", verifyAdmin, async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const changed = await execute(
    `UPDATE users SET full_name=$1,email=$2,phone=$3 WHERE LOWER(username)=LOWER($4)`,
    [fullName, email, phone, req.params.username],
  );
  if (!changed) return res.status(404).json({ message: "کاربر یافت نشد." });
  if (password) await execute(`UPDATE users SET password_hash=$1 WHERE LOWER(username)=LOWER($2)`, [await hashPassword(password), req.params.username]);
  return res.json({ message: "مشخصات کاربر ویرایش شد." });
});

app.post("/api/admin/users/:username/toggle-suspend", verifyAdmin, async (req, res) => {
  const row = await queryOne<any>(`SELECT is_suspended FROM users WHERE LOWER(username)=LOWER($1)`, [req.params.username]);
  if (!row) return res.status(404).json({ message: "کاربر یافت نشد." });
  const newStatus = !row.is_suspended;
  await execute(`UPDATE users SET is_suspended=$1 WHERE LOWER(username)=LOWER($2)`, [newStatus, req.params.username]);
  return res.json({ message: newStatus ? "کاربر تعلیق شد." : "تعلیق برطرف شد.", isSuspended: newStatus });
});

app.post("/api/admin/users/:username/reset", verifyAdmin, async (req, res) => {
  const row = await queryOne<any>(`SELECT full_name FROM users WHERE LOWER(username)=LOWER($1)`, [req.params.username]);
  if (!row) return res.status(404).json({ message: "کاربر یافت نشد." });
  await execute(
    `UPDATE users SET card_data=$1 WHERE LOWER(username)=LOWER($2)`,
    [JSON.stringify(createDefaultCardData(row.full_name)), req.params.username],
  );
  return res.json({ message: "کارت ویزیت کاربر ریست شد." });
});

app.post("/api/admin/users/:username/delete", verifyAdmin, async (req, res) => {
  const userUploads = path.join(UPLOADS_DIR, req.params.username);
  if (fs.existsSync(userUploads)) fs.rmSync(userUploads, { recursive: true });
  const changed = await execute(`DELETE FROM users WHERE LOWER(username)=LOWER($1) AND username!='admin'`, [req.params.username]);
  if (!changed) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json({ message: "حساب کاربر حذف شد." });
});

app.post("/api/admin/users/:username/bypass-login", verifyAdmin, async (req, res) => {
  const row = await queryOne<any>(`SELECT username FROM users WHERE LOWER(username)=LOWER($1)`, [req.params.username]);
  if (!row) return res.status(404).json({ message: "کاربر یافت نشد." });
  const token = jwt.sign({ username: row.username }, JWT_SECRET, { expiresIn: "10d" });
  res.cookie("authToken", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/", maxAge: 864_000_000 });
  return res.json({ success: true, token, username: row.username });
});

app.get("/api/admin/qr-requests", verifyAdmin, async (req, res) => {
  const rows = await query<any>(`SELECT full_name,username,qr_request_status,qr_image_url,qr_request_time FROM users WHERE qr_request_status!='none'`);
  return res.json(rows.map(r => ({ fullName: r.full_name, username: r.username,
    qrRequestStatus: r.qr_request_status, qrImageUrl: r.qr_image_url, qrRequestTime: r.qr_request_time || "ثبت نشده" })));
});

app.post("/api/admin/qr-requests/:username/approve", verifyAdmin, async (req, res) => {
  const { qrImageUrl } = req.body;
  if (!qrImageUrl) return res.status(400).json({ message: "آدرس QR الزامی است." });
  const changed = await execute(
    `UPDATE users SET qr_request_status='approved',qr_image_url=$1,qr_approved_at=$2 WHERE LOWER(username)=LOWER($3)`,
    [qrImageUrl, new Date().toISOString(), req.params.username],
  );
  if (!changed) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json({ message: "QR کاربر تأیید شد." });
});

app.get("/api/admin/tickets", verifyAdmin, async (req, res) => {
  const rows = await query<any>(`SELECT * FROM tickets ORDER BY last_message_at DESC`);
  return res.json(rows.map(t => ({
    ...t,
    userFullName: t.user_fullname,
    createdAt: t.created_at,
    lastMessageAt: t.last_message_at,
    adminLastReadAt: t.admin_last_read_at,
    messages: t.messages,
  })));
});

app.post("/api/admin/tickets/:ticketId/status", verifyAdmin, async (req, res) => {
  const { status } = req.body;
  const changed = await execute(`UPDATE tickets SET status=$1 WHERE id=$2`, [status, req.params.ticketId]);
  if (!changed) return res.status(404).json({ message: "تیکت یافت نشد." });
  return res.json({ message: "وضعیت تیکت تغییر کرد.", status });
});

// ─── Announcements ────────────────────────────────────────────────────────────
app.get("/api/announcements", async (req, res) => {
  return res.json(await query(`SELECT * FROM announcements ORDER BY created_at DESC`));
});

app.post("/api/admin/announcements", verifyAdmin, async (req, res) => {
  const { title, description, image } = req.body;
  if (!title || !description) return res.status(400).json({ message: "عنوان و توضیحات الزامی است." });
  const newAnn = { id: "ann-" + Date.now(), title, description,
    image: image || "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&q=80",
    created_at: new Date().toLocaleDateString("fa-IR") };
  await execute(
    `INSERT INTO announcements (id,title,description,image,created_at) VALUES ($1,$2,$3,$4,$5)`,
    [newAnn.id, newAnn.title, newAnn.description, newAnn.image, newAnn.created_at],
  );
  return res.json(newAnn);
});

app.delete("/api/admin/announcements/:id", verifyAdmin, async (req, res) => {
  await execute(`DELETE FROM announcements WHERE id=$1`, [req.params.id]);
  return res.json({ message: "اعلان حذف شد." });
});

// ─── Banners ──────────────────────────────────────────────────────────────────
app.get("/api/banners", async (req, res) => {
  const rows = await query<any>(`SELECT * FROM banners`);
  return res.json(rows.map((b) => ({ ...b, imageUrl: b.image_url, link: b.link_url, videoUrl: b.video_url })));
});

app.post("/api/admin/banners", verifyAdmin, async (req, res) => {
  const {
    banner1, title1, link1,
    banner2, title2, link2,
    banner3, title3, link3,
    trainingVideoUrl, trainingVideoTitle,
  } = req.body;

  const upsertBanner = async (id: string, imageUrl: string, title: string, linkUrl: string, videoUrl: string) => {
    await execute(
      `INSERT INTO banners (id,image_url,title,link_url,video_url) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         image_url=EXCLUDED.image_url, title=EXCLUDED.title,
         link_url=EXCLUDED.link_url, video_url=EXCLUDED.video_url`,
      [id, imageUrl, title, linkUrl, videoUrl],
    );
  };

  await upsertBanner("banner1", banner1 || "", title1 || "بنر اول", link1 || "", "");
  await upsertBanner("banner2", banner2 || "", title2 || "بنر دوم", link2 || "", "");
  await upsertBanner("banner3", banner3 || "", title3 || "بنر سوم", link3 || "", "");
  await upsertBanner("training_video", "", trainingVideoTitle || "ویدیو آموزشی", "", trainingVideoUrl || "");

  return res.json({ message: "بنرها ویرایش شد.", banners: await query(`SELECT * FROM banners`) });
});

// ──────────────────────────────────────────────────────────────────────────
// API: وضعیت اشتراک کاربر
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/subscription', verifyToken, async (req: any, res) => {
  const sub = await getUserSubscription(req.username);

  if (!sub) {
    return res.json({ plan: 'free', status: 'free', expireDate: null, remainingDays: 0 });
  }

  let remainingDays = 0;
  if (sub.expire_date) {
    const diff = new Date(sub.expire_date).getTime() - Date.now();
    remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  res.json({ plan: sub.plan, status: sub.status, startDate: sub.start_date, expireDate: sub.expire_date, remainingDays });
});

// ──────────────────────────────────────────────────────────────────────────
// API: لیست پلن‌های اشتراک
// ──────────────────────────────────────────────────────────────────────────
app.get("/api/subscription/plans", async (req, res) => {
  const plans = await query(
    `SELECT id, title, months, price, is_free, is_active, sort_order
     FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC`,
  );
  return res.json(plans);
});

app.post("/api/payment/create", verifyToken, async (req: any, res) => {
  const { plan } = req.body;
  let amount = 0;
  switch (plan) {
    case "3months": amount = 890000; break;
    case "6months": amount = 1590000; break;
    case "1year": amount = 2790000; break;
    default: return res.status(400).json({ message: "پلن نامعتبر است." });
  }

  try {
    const response = await fetch("https://payment.zarinpal.com/pg/v4/payment/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: process.env.ZARINPAL_MERCHANT_ID,
        amount,
        description: `اشتراک ${plan}`,
        callback_url: `${process.env.BASE_URL}/api/payment/verify?plan=${plan}`,
      }),
    });
    const result = await response.json();
    const authority = result.data.authority;
    return res.json({ url: `https://payment.zarinpal.com/pg/StartPay/${authority}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "خطا در ایجاد پرداخت" });
  }
});

app.post(
  "/api/payment/card-to-card",
  verifyToken,
  receiptUpload.single("receipt"),
  async (req: any, res: any) => {
    try {
      const { plan, amount } = req.body;
      const receiptImage = req.file ? `/uploads/receipts/${req.file.filename}` : "";

      await execute(
        `INSERT INTO subscription_purchases (
           id, username, plan, duration_months, amount, payment_method,
           payment_status, transaction_id, receipt_image, description,
           created_at, approved_at, approved_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          crypto.randomUUID(),
          req.user.username,
          plan,
          plan === "3months" ? 3 : plan === "6months" ? 6 : plan === "12months" ? 12 : 0,
          amount,
          "card",
          "pending",
          "",
          receiptImage,
          "پرداخت کارت به کارت",
          new Date().toISOString(),
          "",
          "",
        ],
      );

      return res.json({ success: true, message: "درخواست ثبت شد." });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  },
);

app.post(
  "/api/admin/subscription-purchases/:id/delete",
  verifyAdmin,
  async (req, res) => {
    const purchase = await queryOne<any>(`SELECT * FROM subscription_purchases WHERE id=$1`, [req.params.id]);
    if (!purchase) return res.status(404).json({ success: false });

    if (purchase.receipt_image) {
      const filePath = path.join(UPLOADS_DIR, purchase.receipt_image.replace("/uploads/", ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await execute(`DELETE FROM subscription_purchases WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  },
);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  await applySchema();
  await seedAdminUser();
  await seedInitialData();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws, req) => {
    const url      = new URL(req.url || "", "http://localhost");
    const token    = url.searchParams.get("token");
    let username   = "anonymous";
    let role: "user" | "admin" = "user";
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        username = decoded.username;
        role     = username === "admin" ? "admin" : "user";
      } catch { ws.close(1008, "توکن نامعتبر"); return; }
    }
    const client: WsClient = { ws, ticketId: null, username, role };
    wsClients.push(client);
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "watch_ticket") client.ticketId = msg.ticketId || null;
        if (msg.type === "watch_all" && role === "admin") client.ticketId = "ALL_ADMIN";
      } catch {}
    });
    ws.on("close", () => { const i = wsClients.indexOf(client); if (i !== -1) wsClients.splice(i, 1); });
    ws.on("error", (e) => console.error("[WS]", e.message));
    ws.send(JSON.stringify({ type: "connected", username, role }));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] http://localhost:${PORT}`);
  });
}

bootstrap();
