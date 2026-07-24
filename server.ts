
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createHttpServer } from "http";
import Database from "better-sqlite3";
import multer from "multer";



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
});

// ─── SQLite ───────────────────────────────────────────────────────────────────
const db = new Database(path.join(DATA_DIR, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username          TEXT PRIMARY KEY,
    full_name         TEXT NOT NULL,
    email             TEXT UNIQUE NOT NULL,
    phone             TEXT UNIQUE NOT NULL,
    password_hash     TEXT NOT NULL,
    is_suspended      INTEGER NOT NULL DEFAULT 0,
    qr_image_url      TEXT NOT NULL DEFAULT '',
    qr_request_status TEXT NOT NULL DEFAULT 'none',
    qr_request_time   TEXT NOT NULL DEFAULT '',
    card_data         TEXT NOT NULL DEFAULT '{}'
  );
  CREATE TABLE IF NOT EXISTS tickets (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL,
    user_fullname TEXT NOT NULL,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    TEXT NOT NULL,
    messages      TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS announcements (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    image       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS banners (
    id        TEXT PRIMARY KEY,
    image_url TEXT NOT NULL DEFAULT '',
    title     TEXT NOT NULL DEFAULT ''
  );

  -- جدول اشتراک کاربران
  CREATE TABLE IF NOT EXISTS subscriptions (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    plan            TEXT NOT NULL DEFAULT 'free',
    status          TEXT NOT NULL DEFAULT 'free',
    start_date      TEXT NOT NULL DEFAULT '',
    expire_date     TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
  );

  -- تاریخچه تمام خریدها و تمدیدها
  CREATE TABLE IF NOT EXISTS subscription_purchases (
    id                TEXT PRIMARY KEY,
    username          TEXT NOT NULL,
    plan              TEXT NOT NULL,
    duration_months   INTEGER NOT NULL DEFAULT 0,
    amount            INTEGER NOT NULL DEFAULT 0,
    payment_method    TEXT NOT NULL,
    payment_status    TEXT NOT NULL DEFAULT 'pending',
    transaction_id    TEXT NOT NULL DEFAULT '',
    receipt_image     TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL,
    approved_at       TEXT NOT NULL DEFAULT '',
    approved_by       TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  months INTEGER NOT NULL,
  price INTEGER NOT NULL,
  is_free INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subscription_features (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);
`);

// ─── رمزگذاری ─────────────────────────────────────────────────────────────────
const HASH_ITERATIONS = 15000;
const HASH_KEY_LEN    = 64;
const HASH_DIGEST     = "sha512";

function hashPassword(password: string): string {
  const salt       = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LEN, HASH_DIGEST);
  return `pbkdf2$${HASH_ITERATIONS}$${salt}$${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.startsWith("pbkdf2$")) return password === storedHash;
  try {
    const [, iter, salt, origHex] = storedHash.split("$");
    const derived = crypto.pbkdf2Sync(password, salt, parseInt(iter, 10), HASH_KEY_LEN, HASH_DIGEST);
    return crypto.timingSafeEqual(Buffer.from(origHex, "hex"), Buffer.from(derived.toString("hex"), "hex"));
  } catch { return false; }
}

// ─── تاریخ جلالی ─────────────────────────────────────────────────────────────
function getJalaliDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" } as const).format(date);
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
    stats:  { totalVisits: 0, scans: 0, linkOpens: 0, buttonClicks: 0, dailyVisits: {} },
  };
}
console.log(db.prepare("SELECT * FROM users WHERE username = 'admin'").get());
// ─── Seed داده اولیه ──────────────────────────────────────────────────────────
if (!(db.prepare("SELECT 1 FROM users WHERE username = 'admin'").get())) {
  db.prepare(`INSERT INTO users (username,full_name,email,phone,password_hash,card_data)
    VALUES (?,?,?,?,?,?)`)
    .run(
      "admin",
      "مدیر کل پلتفرم",
      "tahamahmoodikhorsand@gmail.com",
      "09153809260",
      hashPassword("@K20602060k!"),
      JSON.stringify(createDefaultCardData("کارت نمونه ادمین"))
    );
}
const insertBanner = db.prepare("INSERT OR IGNORE INTO banners (id,image_url,title) VALUES (?,?,?)");
insertBanner.run("banner1","https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80","کارت ویزیت دیجیتال رایگان خود را بسازید");
insertBanner.run("banner2","https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&q=80","چاپ کارت فیزیکی با برچسب هوشمند NFC");
insertBanner.run("banner3","https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=800&q=80","کسب و کار خود را در نقشه گوگل ثبت کنید");

const insertPlan = db.prepare(`
INSERT OR IGNORE INTO subscription_plans
(id,title,months,price,is_free,is_active,sort_order)
VALUES (?,?,?,?,?,?,?)
`);

insertPlan.run("free", "رایگان", 0, 0, 1, 1, 1);
insertPlan.run("3m", "سه ماهه", 3, 0, 0, 1, 2);
insertPlan.run("6m", "شش ماهه", 6, 0, 0, 1, 3);
insertPlan.run("1y", "یک ساله", 12, 0, 0, 1, 4);

const insertFeature = db.prepare(`
INSERT OR IGNORE INTO subscription_features
(id,plan_id,feature_key,enabled)
VALUES (?,?,?,?)
`);

insertFeature.run("free-modern", "free", "modern_editor", 1);
insertFeature.run("free-classic", "free", "classic_editor", 1);
insertFeature.run("free-pro", "free", "pro_editor", 1);

const allUsers = db.prepare("SELECT username FROM users").all() as { username: string }[];

const insertSubscription = db.prepare(`
  INSERT OR IGNORE INTO subscriptions
  (id, username, plan, status, start_date, expire_date, created_at, updated_at)
  VALUES (?, ?, 'free', 'free', '', '', ?, ?)
`);

allUsers.forEach(u => {
  const now = new Date().toISOString();
  insertSubscription.run(
    crypto.randomUUID(),
    u.username,
    now,
    now
  );
});
// ─── Helper: کاربر از DB ─────────────────────────────────────────────────────
function getUser(username: string): any | null {
  const row = db.prepare("SELECT * FROM users WHERE LOWER(username)=LOWER(?)").get(username) as any;
  if (!row) return null;
  return { ...row, isSuspended: !!row.is_suspended, fullName: row.full_name,
    passwordHash: row.password_hash, qrImageUrl: row.qr_image_url,
    qrRequestStatus: row.qr_request_status, qrRequestTime: row.qr_request_time,
    cardData: JSON.parse(row.card_data || "{}") };
}
function getUserSubscription(username: string): any | null {
  let sub = db
    .prepare(
      `SELECT *
       FROM subscriptions
       WHERE LOWER(username)=LOWER(?)
       LIMIT 1`
    )
    .get(username) as any;

  if (!sub) {
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO subscriptions
      (
        id,
        username,
        plan,
        status,
        start_date,
        expire_date,
        created_at,
        updated_at
      )
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      "sub-" + Date.now(),
      username,
      "free",
      "free",
      now,
      "",
      now,
      now
    );

    sub = db
      .prepare(
        `SELECT *
         FROM subscriptions
         WHERE LOWER(username)=LOWER(?)
         LIMIT 1`
      )
      .get(username) as any;
  }

  return sub;
}

// ─── WebSocket Manager ────────────────────────────────────────────────────────
interface WsClient { ws: WebSocket; ticketId: string | null; username: string; role: "user"|"admin"; }
const wsClients: WsClient[] = [];

function broadcastToTicket(ticketId: string, payload: object) {
  const msg = JSON.stringify(payload);
  wsClients.forEach(c => {
    // پیام رو به دو دسته می‌فرستیم: کسی که دقیقاً همین تیکت رو باز کرده،
    // و هر ادمینی که در حالت "watch_all" است (یعنی روی پنل ادمین، حتی اگه این تیکت خاص را باز نکرده باشد)
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

// ─── Multer: آپلود فایل روی دیسک ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    // هر کاربر پوشه خودش رو داره
    const username = req.username || "general";
    const userDir  = path.join(UPLOADS_DIR, username);
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // نام فایل: timestamp + پسوند اصلی
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حداکثر 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("فقط فایل‌های تصویری مجاز هستند."));
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// سرو فایل‌های آپلود شده
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



// تأیید توکن
// function verifyToken(req: any, res: any, next: any) {
//   const token = req.cookies?.authToken || req.headers?.authorization?.replace("Bearer ", "");
//   if (!token) return res.status(410).json({ message: "توکن معتبر یافت نشد." });
//   try {
//     const decoded = jwt.verify(token, JWT_SECRET) as any;
//     req.username = decoded.username;
//     next();
//   } catch { return res.status(401).json({ message: "توکن منقضی یا نامعتبر است." }); }
// }

function verifyToken(req: any, res: any, next: any) {

  const token =
    req.cookies?.authToken ||
    req.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      message: "توکن یافت نشد"
    });
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = decoded; // اضافه شود
    req.username = decoded.username; // برای سازگاری با کدهای قبلی بماند

    next();

  } catch {

    return res.status(401).json({
      message: "توکن نامعتبر است"
    });

  }
}

function verifyAdmin(req: any, res: any, next: any) {
  verifyToken(req, res, () => {
    if (req.username !== "admin") return res.status(403).json({ message: "دسترسی ادمین لازم است." });
    next();
  });
}

// ─── آپلود تصویر ─────────────────────────────────────────────────────────────
app.post("/api/upload", verifyToken, upload.single("image"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "فایلی ارسال نشد." });
  // URL عمومی فایل
  const fileUrl = `/uploads/${req.username}/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// آپلود برای ادمین (QR و بنر)
app.post("/api/admin/upload", verifyAdmin, upload.single("image"), (req: any, res) => {
  if (!req.file) return res.status(400).json({ message: "فایلی ارسال نشد." });
  const fileUrl = `/uploads/admin/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.get("/api/auth/check-username/:username", (req, res) => {
  const u = req.params.username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9]+$/.test(u)) return res.json({ available: false, error: "فقط حروف انگلیسی و اعداد مجاز است" });
  if (u.length < 3 || u.length > 30) return res.json({ available: false, error: "بین ۳ تا ۳۰ کاراکتر" });
  const exists = db.prepare("SELECT 1 FROM users WHERE LOWER(username)=?").get(u);
  return res.json(exists ? { available: false, error: "این نام کاربری قبلاً ثبت شده" } : { available: true });
});

app.post("/api/auth/register", (req, res) => {
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
    db.prepare(`INSERT INTO users (username,full_name,email,phone,password_hash,card_data) VALUES (?,?,?,?,?,?)`)
      .run(u, fullName, email.trim(), phone.trim(), hashPassword(password), JSON.stringify(createDefaultCardData(fullName)));
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO subscriptions
    (
      id,
      username,
      plan,
      status,
      start_date,
      expire_date,
      created_at,
      updated_at
    )
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    "sub-" + Date.now(),
    u,
    "free",
    "free",
    now,
    "",
    now,
    now
  );

} catch (err: any) {
    if (err.message?.includes("UNIQUE")) {
      if (err.message.includes("email")) return res.status(400).json({ message: "این ایمیل قبلاً ثبت شده." });
      if (err.message.includes("phone")) return res.status(400).json({ message: "این شماره قبلاً ثبت شده." });
      return res.status(400).json({ message: "نام کاربری تکراری است." });
    }
    return res.status(500).json({ message: "خطای سرور." });
  }
  const token = jwt.sign({ username: u }, JWT_SECRET, { expiresIn: "1d" });
  res.cookie("authToken", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/", maxAge: 86_400_000 });
  return res.json({ message: "ثبت‌نام موفق.", token, user: { fullName, username: u, email, phone, isSuspended: false } });
});

app.post("/api/auth/login", (req, res) => {
  // rate limit جداگانه برای login
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
  const user = db.prepare("SELECT * FROM users WHERE LOWER(email)=? OR phone=? OR LOWER(username)=?")
    .get(id, id, id) as any;
  if (!user || !verifyPassword(password, user.password_hash))
    return res.status(400).json({ message: "شناسه یا رمز عبور اشتباه است." });
  if (user.is_suspended)
    return res.status(403).json({ message: "حساب شما تعلیق شده است.", isSuspended: true });
  // ارتقاء رمز قدیمی
  if (!user.password_hash.startsWith("pbkdf2$"))
    db.prepare("UPDATE users SET password_hash=? WHERE username=?").run(hashPassword(password), user.username);

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

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.authToken || req.headers?.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ loggedIn: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user    = db.prepare("SELECT * FROM users WHERE username=?").get(decoded.username) as any;
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

app.post("/api/auth/reset-password", (req, res) => {
  const { email, phone, username, newPassword } = req.body;
  if (!email || !phone || !username || !newPassword)
    return res.status(400).json({ message: "لطفا تمامی فیلدها را وارد کنید." });
  if (newPassword.length < 8) return res.status(400).json({ message: "رمز جدید حداقل ۸ کاراکتر." });
  const user = db.prepare("SELECT * FROM users WHERE LOWER(username)=? AND LOWER(email)=? AND phone=?")
    .get(username.trim().toLowerCase(), email.trim().toLowerCase(), phone.trim()) as any;
  if (!user) return res.status(400).json({ message: "مشخصات وارد شده همخوانی ندارد." });
  db.prepare("UPDATE users SET password_hash=? WHERE username=?").run(hashPassword(newPassword), user.username);
  return res.json({ message: "رمز عبور با موفقیت بازنشانی شد." });
});

// ─── Card Routes ──────────────────────────────────────────────────────────────
app.get("/api/card/:username", (req, res) => {
  const source = (req.query.source as string) || "link";
  const user   = getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کارت ویزیت یافت نشد." });
  if (user.isSuspended) return res.status(403).json({ message: "این کارت به دلیل تعلیق حساب غیرفعال است.", isSuspended: true });

  const cardData = user.cardData;
  if (!cardData.stats) cardData.stats = { totalVisits: 0, scans: 0, linkOpens: 0, buttonClicks: 0, dailyVisits: {} };

  cardData.stats.totalVisits++;
  source === "scan" ? cardData.stats.scans++ : cardData.stats.linkOpens++;

  const today = getJalaliDate(new Date());
  cardData.stats.dailyVisits[today] = (cardData.stats.dailyVisits[today] || 0) + 1;
  // نگه‌داری فقط ۳۰ روز اخیر
  const keys = Object.keys(cardData.stats.dailyVisits);
  if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(k => delete cardData.stats.dailyVisits[k]);

  db.prepare("UPDATE users SET card_data=? WHERE username=?").run(JSON.stringify(cardData), user.username);
  return res.json({ fullName: user.fullName, username: user.username, cardData });
});

app.post("/api/card/:username/click", (req, res) => {
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
  const cd = user.cardData;
  cd.stats.buttonClicks = (cd.stats.buttonClicks || 0) + 1;
  db.prepare("UPDATE users SET card_data=? WHERE username=?").run(JSON.stringify(cd), user.username);
  return res.json({ success: true });
});

app.get("/api/user/card/:username", verifyToken, (req: any, res) => {
  if (req.username !== req.params.username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json(user.cardData);
});

app.post("/api/user/card/:username", verifyToken, (req: any, res) => {
  if (req.username !== req.params.username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const user = getUser(req.params.username);
  if (!user) return res.status(404).json({ message: "کاربر یافت نشد." });
  // آمار قفل می‌شه — کاربر نمی‌تونه دستکاری کنه
  const newCardData = { ...req.body, stats: user.cardData.stats };
  db.prepare("UPDATE users SET card_data=? WHERE LOWER(username)=LOWER(?)")
    .run(JSON.stringify(newCardData), req.params.username);
  return res.json({ message: "کارت با موفقیت ذخیره شد.", cardData: newCardData });
});

// ─── QR ───────────────────────────────────────────────────────────────────────
app.post("/api/user/:username/qr-request", verifyToken, (req: any, res) => {
  if (req.username !== req.params.username) return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const result = db.prepare("UPDATE users SET qr_request_status='pending', qr_request_time=? WHERE LOWER(username)=LOWER(?)")
    .run(new Date().toLocaleString("fa-IR"), req.params.username);
  if (!result.changes) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json({ message: "درخواست کارت فیزیکی ثبت شد." });
});

// ─── Ticket Routes ────────────────────────────────────────────────────────────
app.get("/api/user/:username/tickets", verifyToken, (req: any, res) => {
  if (req.username !== req.params.username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const rows = db.prepare("SELECT * FROM tickets WHERE LOWER(username)=LOWER(?) ORDER BY created_at DESC")
    .all(req.params.username) as any[];
  return res.json(rows.map(t => ({ ...t, userFullName: t.user_fullname, createdAt: t.created_at, messages: JSON.parse(t.messages) })));
});

app.post("/api/user/:username/tickets", verifyToken, (req: any, res) => {
  const { username } = req.params;
  const { title, description } = req.body;
  if (req.username !== username) return res.status(403).json({ message: "دسترسی غیرمجاز." });
  if (!title || !description) return res.status(400).json({ message: "عنوان و توضیحات الزامی است." });
  const user = db.prepare("SELECT full_name FROM users WHERE username=?").get(username) as any;
  const now  = new Date();
  const newTicket = {
    id: "ticket-" + Date.now(), username,
    user_fullname: user?.full_name || "کاربر",
    title, description, status: "pending",
created_at:
  now.toLocaleDateString("fa-IR", {
    timeZone: "Asia/Tehran"
  }) +
  " - " +
  now.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran"
  }),

messages: JSON.stringify([
  {
    id: "msg-1",
    sender: "user",
    message: description,
    createdAt: now.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran"
    })
  }
]),
  };
  db.prepare("INSERT INTO tickets (id,username,user_fullname,title,description,status,created_at,messages) VALUES (?,?,?,?,?,?,?,?)")
    .run(newTicket.id, newTicket.username, newTicket.user_fullname, newTicket.title,
      newTicket.description, newTicket.status, newTicket.created_at, newTicket.messages);
  const ticket = { ...newTicket, userFullName: newTicket.user_fullname, createdAt: newTicket.created_at, messages: JSON.parse(newTicket.messages) };
  notifyAdmin({ type: "new_ticket", ticket });
  return res.json({ message: "تیکت ثبت شد.", ticket });
});

app.post("/api/user/:username/tickets/:ticketId/messages", verifyToken, (req: any, res) => {
  const { username, ticketId } = req.params;
  const { message } = req.body;
  if (req.username !== username && req.username !== "admin")
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  const ticket = db.prepare("SELECT * FROM tickets WHERE id=?").get(ticketId) as any;
  if (!ticket) return res.status(404).json({ message: "تیکت یافت نشد." });
  if (ticket.status === "ended") return res.status(400).json({ message: "این تیکت بسته شده." });

  const messages = JSON.parse(ticket.messages);
const newMsg = {
  id: "msg-" + Date.now(),
  sender: req.username === "admin" ? "support" : "user",
  message,
  createdAt: new Date().toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran"
  })
};
  messages.push(newMsg);
  const newStatus = req.username !== "admin" ? "under_review" : ticket.status;
  db.prepare("UPDATE tickets SET messages=?, status=? WHERE id=?").run(JSON.stringify(messages), newStatus, ticketId);

  broadcastToTicket(ticketId, { type: "new_message", ticketId, message: newMsg, newStatus });
  notifyAdmin({ type: "ticket_updated", ticketId, username, newStatus });
  return res.json(newMsg);
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.get("/api/admin/stats", verifyAdmin, (req, res) => {
  const totalCustomers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE username!='admin'").get() as any).c;
  const cardsWithQr    = (db.prepare("SELECT COUNT(*) as c FROM users WHERE qr_request_status='approved'").get() as any).c;
  const rows           = db.prepare("SELECT card_data FROM users").all() as any[];
  const totalVisits    = rows.reduce((acc, r) => acc + (JSON.parse(r.card_data)?.stats?.totalVisits || 0), 0);
  return res.json({ totalCustomers, cardsWithQr, totalVisits });
});

app.get("/api/admin/users", verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM users WHERE username!='admin'").all() as any[];
  return res.json(rows.map(r => ({
    fullName: r.full_name, username: r.username, email: r.email, phone: r.phone,
    isSuspended: !!r.is_suspended, qrRequestStatus: r.qr_request_status,
    qrImageUrl: r.qr_image_url, qrRequestTime: r.qr_request_time,
    cardData: JSON.parse(r.card_data),
  })));
});
// ای پی ای کارت به کارت به پنل ادمین
app.get("/api/admin/subscription-purchases", verifyAdmin, (req, res) => {

  const rows = db.prepare(`
    SELECT 
      sp.*,
      u.full_name
    FROM subscription_purchases sp
    JOIN users u 
    ON sp.username = u.username
    ORDER BY sp.created_at DESC
  `).all();

  return res.json(rows);

});



// متن تست برای دیتا بیس سیستم کارت به کارت دستی

app.get("/api/debug/subscriptions", (req, res) => {

  const rows = db.prepare(`
    SELECT * FROM subscriptions
  `).all();

  res.json(rows);

});


app.post("/api/admin/subscription-purchases/:id/approve", verifyAdmin, (req, res) => {

  const purchaseId = req.params.id;

  const purchase = db.prepare(`
    SELECT * FROM subscription_purchases
    WHERE id = ?
  `).get(purchaseId) as any;

  if (!purchase) {
    return res.status(404).json({
      success: false
    });
  }

  if (purchase.payment_status === "approved") {
    return res.json({
      success: true
    });
  }

  const now = new Date();

  const expire = new Date();

  expire.setMonth(
    expire.getMonth() + purchase.duration_months
  );

  db.prepare(`
    UPDATE subscription_purchases
    SET
      payment_status='approved',
      approved_at=?,
      approved_by='admin'
    WHERE id=?
  `).run(
    now.toISOString(),
    purchaseId
  );

  db.prepare(`
    INSERT INTO subscriptions(
      id,
      username,
      plan,
      status,
      start_date,
      expire_date,
      created_at,
      updated_at
    )
    VALUES(
      ?,?,?,?,?,?,?,?
    )
    ON CONFLICT(username)
    DO UPDATE SET

      plan=excluded.plan,

      status='active',

      start_date=excluded.start_date,

      expire_date=excluded.expire_date,

      updated_at=excluded.updated_at
  `).run(

    crypto.randomUUID(),

    purchase.username,

    purchase.plan,

    "active",

    now.toISOString(),

    expire.toISOString(),

    now.toISOString(),

    now.toISOString()

  );

  res.json({
    success:true
  });

});

app.post("/api/admin/users/:username/edit", verifyAdmin, (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const result = db.prepare("UPDATE users SET full_name=?,email=?,phone=? WHERE LOWER(username)=LOWER(?)")
    .run(fullName, email, phone, req.params.username);
  if (!result.changes) return res.status(404).json({ message: "کاربر یافت نشد." });
  if (password) db.prepare("UPDATE users SET password_hash=? WHERE LOWER(username)=LOWER(?)").run(hashPassword(password), req.params.username);
  return res.json({ message: "مشخصات کاربر ویرایش شد." });
});

app.post("/api/admin/users/:username/toggle-suspend", verifyAdmin, (req, res) => {
  const row = db.prepare("SELECT is_suspended FROM users WHERE LOWER(username)=LOWER(?)").get(req.params.username) as any;
  if (!row) return res.status(404).json({ message: "کاربر یافت نشد." });
  const newStatus = row.is_suspended ? 0 : 1;
  db.prepare("UPDATE users SET is_suspended=? WHERE LOWER(username)=LOWER(?)").run(newStatus, req.params.username);
  return res.json({ message: newStatus ? "کاربر تعلیق شد." : "تعلیق برطرف شد.", isSuspended: !!newStatus });
});

app.post("/api/admin/users/:username/reset", verifyAdmin, (req, res) => {
  const row = db.prepare("SELECT full_name FROM users WHERE LOWER(username)=LOWER(?)").get(req.params.username) as any;
  if (!row) return res.status(404).json({ message: "کاربر یافت نشد." });
  db.prepare("UPDATE users SET card_data=? WHERE LOWER(username)=LOWER(?)")
    .run(JSON.stringify(createDefaultCardData(row.full_name)), req.params.username);
  return res.json({ message: "کارت ویزیت کاربر ریست شد." });
});

app.post("/api/admin/users/:username/delete", verifyAdmin, (req, res) => {
  // حذف فایل‌های آپلود شده کاربر
  const userUploads = path.join(UPLOADS_DIR, req.params.username);
  if (fs.existsSync(userUploads)) fs.rmSync(userUploads, { recursive: true });
  const result = db.prepare("DELETE FROM users WHERE LOWER(username)=LOWER(?) AND username!='admin'").run(req.params.username);
  if (!result.changes) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json({ message: "حساب کاربر حذف شد." });
});

app.post("/api/admin/users/:username/bypass-login", verifyAdmin, (req, res) => {
  const row = db.prepare("SELECT username FROM users WHERE LOWER(username)=LOWER(?)").get(req.params.username) as any;
  if (!row) return res.status(404).json({ message: "کاربر یافت نشد." });
  const token = jwt.sign({ username: row.username }, JWT_SECRET, { expiresIn: "10d" });
  res.cookie("authToken", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "none", path: "/", maxAge: 864_000_000 });
  return res.json({ success: true, token, username: row.username });
});

app.get("/api/admin/qr-requests", verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT full_name,username,qr_request_status,qr_image_url,qr_request_time FROM users WHERE qr_request_status!='none'").all() as any[];
  return res.json(rows.map(r => ({ fullName: r.full_name, username: r.username,
    qrRequestStatus: r.qr_request_status, qrImageUrl: r.qr_image_url, qrRequestTime: r.qr_request_time || "ثبت نشده" })));
});

app.post("/api/admin/qr-requests/:username/approve", verifyAdmin, (req, res) => {
  const { qrImageUrl } = req.body;
  if (!qrImageUrl) return res.status(400).json({ message: "آدرس QR الزامی است." });
  const result = db.prepare("UPDATE users SET qr_request_status='approved',qr_image_url=? WHERE LOWER(username)=LOWER(?)")
    .run(qrImageUrl, req.params.username);
  if (!result.changes) return res.status(404).json({ message: "کاربر یافت نشد." });
  return res.json({ message: "QR کاربر تأیید شد." });
});

app.get("/api/admin/tickets", verifyAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all() as any[];
  return res.json(rows.map(t => ({ ...t, userFullName: t.user_fullname, createdAt: t.created_at, messages: JSON.parse(t.messages) })));
});

app.post("/api/admin/tickets/:ticketId/status", verifyAdmin, (req, res) => {
  const { status } = req.body;
  const result = db.prepare("UPDATE tickets SET status=? WHERE id=?").run(status, req.params.ticketId);
  if (!result.changes) return res.status(404).json({ message: "تیکت یافت نشد." });
  return res.json({ message: "وضعیت تیکت تغییر کرد.", status });
});

// ─── Announcements ────────────────────────────────────────────────────────────
app.get("/api/announcements", (req, res) => {
  return res.json(db.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all());
});

app.post("/api/admin/announcements", verifyAdmin, (req, res) => {
  const { title, description, image } = req.body;
  if (!title || !description) return res.status(400).json({ message: "عنوان و توضیحات الزامی است." });
  const newAnn = { id: "ann-" + Date.now(), title, description,
    image: image || "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=800&q=80",
    created_at: new Date().toLocaleDateString("fa-IR") };
  db.prepare("INSERT INTO announcements (id,title,description,image,created_at) VALUES (?,?,?,?,?)")
    .run(newAnn.id, newAnn.title, newAnn.description, newAnn.image, newAnn.created_at);
  return res.json(newAnn);
});

app.delete("/api/admin/announcements/:id", verifyAdmin, (req, res) => {
  db.prepare("DELETE FROM announcements WHERE id=?").run(req.params.id);
  return res.json({ message: "اعلان حذف شد." });
});

// ─── Banners ──────────────────────────────────────────────────────────────────
app.get("/api/banners", (req, res) => {
  return res.json(db.prepare("SELECT * FROM banners").all()
    .map((b: any) => ({ ...b, imageUrl: b.image_url })));
});

app.post("/api/admin/banners", verifyAdmin, (req, res) => {
  const { banner1, banner2, banner3 } = req.body;
  const upsert = db.prepare("INSERT OR REPLACE INTO banners (id,image_url,title) VALUES (?,?,?)");
  upsert.run("banner1", banner1 || "", "بنر اول");
  upsert.run("banner2", banner2 || "", "بنر دوم");
  upsert.run("banner3", banner3 || "", "بنر سوم");
  return res.json({ message: "بنرها ویرایش شد.", banners: db.prepare("SELECT * FROM banners").all() });
});


// ──────────────────────────────────────────────────────────────────────────
// API: وضعیت اشتراک کاربر
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/subscription', verifyToken, (req: any, res) => {
  const sub = getUserSubscription(req.username);

  if (!sub) {
    return res.json({
      plan: 'free',
      status: 'free',
      expireDate: null,
      remainingDays: 0
    });
  }

  let remainingDays = 0;

  if (sub.expire_date) {
    const diff = new Date(sub.expire_date).getTime() - Date.now();
    remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  res.json({
    plan: sub.plan,
    status: sub.status,
    startDate: sub.start_date,
    expireDate: sub.expire_date,
    remainingDays
  });
});



// ──────────────────────────────────────────────────────────────────────────
// API: لیست پلن‌های اشتراک
// ──────────────────────────────────────────────────────────────────────────
app.get("/api/subscription/plans", (req, res) => {
  const plans = db.prepare(`
    SELECT
      id,
      title,
      months,
      price,
      is_free,
      is_active,
      sort_order
    FROM subscription_plans
    WHERE is_active = 1
    ORDER BY sort_order ASC
  `).all();

  return res.json(plans);
});




app.post("/api/payment/create", verifyToken, async (req: any, res) => {

  const { plan } = req.body;

  let amount = 0;

  switch (plan) {

    case "3months":
      amount = 890000;
      break;

    case "6months":
      amount = 1590000;
      break;

    case "1year":
      amount = 2790000;
      break;

    default:
      return res.status(400).json({
        message: "پلن نامعتبر است."
      });

  }

  try {

      const response = await fetch(
        "https://payment.zarinpal.com/pg/v4/payment/request.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            merchant_id: process.env.ZARINPAL_MERCHANT_ID,
            amount,
            description: `اشتراک ${plan}`,
            callback_url: `${process.env.BASE_URL}/api/payment/verify?plan=${plan}`,
          }),
        }
      );

      const result = await response.json();

      const authority = result.data.authority;

      return res.json({
        url: `https://payment.zarinpal.com/pg/StartPay/${authority}`,
      });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "خطا در ایجاد پرداخت"
    });

  }

});




// app.post("/api/payment/card-to-card", verifyToken, (req: any, res) => {

//   const { plan, amount } = req.body;

//   console.log("درخواست کارت به کارت:", {
//     userId: req.user.id,
//     plan,
//     amount
//   });

//   res.json({
//     success: true,
//     message: "درخواست ثبت شد."
//   });

// });

// app.post("/api/payment/card-to-card", verifyToken, (req: any, res) => {

//   return res.json({
//     success: true
//   });

// });


app.post(
  "/api/payment/card-to-card",
  verifyToken,
  receiptUpload.single("receipt"),
  (req: any, res: any) => {

      console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  console.log("USER:", req.user);

  try {

    const { plan, amount } = req.body;

    const receiptImage = req.file
  ? `/uploads/receipts/${req.file.filename}`
  : "";


  console.log(req.file);
console.log(receiptImage);

    db.prepare(`
      INSERT INTO subscription_purchases (
        id,
        username,
        plan,
        duration_months,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        receipt_image,
        description,
        created_at,
        approved_at,
        approved_by
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(

      crypto.randomUUID(),

      req.user.username,

      plan,

      plan === "3months"
        ? 3
        : plan === "6months"
        ? 6
        : plan === "12months"
        ? 12
        : 0,

      amount,

      "card",

      "pending",

      "",          // transaction_id

      receiptImage, // receipt_image

      "پرداخت کارت به کارت",

      new Date().toISOString(),

      "",

      ""

    );

    return res.json({
      success: true,
      message: "درخواست ثبت شد."
    });

  } catch (err) {
  console.error(err);

  return res.status(500).json({
    success: false,
    error: String(err)
  });
}

});





app.post(
  "/api/admin/subscription-purchases/:id/delete",
  verifyAdmin,
  (req, res) => {

    const purchase = db.prepare(`
      SELECT *
      FROM subscription_purchases
      WHERE id=?
    `).get(req.params.id) as any;

    if (!purchase) {
      return res.status(404).json({
        success: false
      });
    }

    if (purchase.receipt_image) {

      const filePath = path.join(
        UPLOADS_DIR,
        purchase.receipt_image.replace("/uploads/", "")
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

    }

    db.prepare(`
      DELETE FROM subscription_purchases
      WHERE id=?
    `).run(req.params.id);

    res.json({
      success: true
    });

  }   // ← این براکت جا افتاده بود

);    // ← و این هم جا افتاده بود


// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
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
