import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("❌ خطای راه‌اندازی: متغیر محیطی DATABASE_URL تنظیم نشده است.");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[pg pool] خطای غیرمنتظره روی یک کانکشن idle:", err);
});

export interface CardUserRow {
  username: string;
  fullName: string;
  isSuspended: boolean;
  cardData: any;
  cardUpdatedAt: string;
}

/** اطلاعات کاربر + کارت او را برای نمایش عمومی می‌خواند (فقط ستون‌های لازم) */
export async function getUserForCard(username: string): Promise<CardUserRow | null> {
  const { rows } = await pool.query(
    `SELECT username, full_name, is_suspended, card_data, card_updated_at
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    username: r.username,
    fullName: r.full_name,
    isSuspended: r.is_suspended,
    cardData: r.card_data || {},
    cardUpdatedAt: r.card_updated_at,
  };
}

/** آیا این کاربر هم‌اکنون اشتراک پرو فعال و منقضی‌نشده دارد؟ (منطق دقیقاً هم‌راستا با useSubscription در فرانت‌اند) */
export async function isUserPro(username: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT plan, status, expire_date FROM subscriptions WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username],
  );
  const sub = rows[0];
  if (!sub) return false;
  if (sub.status !== "active" || sub.plan === "free" || !sub.expire_date) return false;
  return new Date(sub.expire_date).getTime() > Date.now();
}

/** لیست همه کاربران با اشتراک پرو فعال — برای sitemap.xml */
export async function getActiveProUsers(): Promise<{ username: string; cardUpdatedAt: string }[]> {
  const { rows } = await pool.query(`
    SELECT u.username, u.card_updated_at
    FROM users u
    JOIN subscriptions s ON LOWER(s.username) = LOWER(u.username)
    WHERE s.status = 'active'
      AND s.plan != 'free'
      AND s.expire_date != ''
      AND s.expire_date > $1
      AND u.is_suspended = false
      AND LOWER(u.username) != 'admin'
  `, [new Date().toISOString()]);
  return rows.map((r) => ({ username: r.username, cardUpdatedAt: r.card_updated_at }));
}

/**
 * ثبت بازدید کارت — دقیقاً هم‌راستا با منطق ثبت بازدید در server.ts پروژه اصلی
 * (جدول‌های visit_totals و visit_stats، به‌جای بازنویسی کل رکورد JSON کاربر).
 */
function isoDateKey(d: Date) { return d.toISOString().slice(0, 10); }
function isoHourKey(d: Date) { return d.toISOString().slice(0, 13); }

export async function recordCardVisit(username: string, source: "scan" | "link") {
  const v = 1;
  const s = source === "scan" ? 1 : 0;
  const l = source === "scan" ? 0 : 1;

  await pool.query(
    `INSERT INTO visit_totals (username, total_visits, scans, link_opens, button_clicks)
     VALUES ($1,$2,$3,$4,0)
     ON CONFLICT (username) DO UPDATE SET
       total_visits = visit_totals.total_visits + $2,
       scans = visit_totals.scans + $3,
       link_opens = visit_totals.link_opens + $4`,
    [username, v, s, l],
  );

  const now = new Date();
  for (const [granularity, period] of [["day", isoDateKey(now)], ["hour", isoHourKey(now)]] as const) {
    await pool.query(
      `INSERT INTO visit_stats (username, granularity, period, visits, scans, link_opens, button_clicks)
       VALUES ($1,$2,$3,$4,$5,$6,0)
       ON CONFLICT (username, granularity, period) DO UPDATE SET
         visits = visit_stats.visits + $4,
         scans = visit_stats.scans + $5,
         link_opens = visit_stats.link_opens + $6`,
      [username, granularity, period, v, s, l],
    );
  }
}

/** ثبت کلیک روی یک آیتم داخل کارت (تلفن/وبسایت/شبکه اجتماعی/...) */
export async function recordCardClick(username: string) {
  await pool.query(
    `INSERT INTO visit_totals (username, total_visits, scans, link_opens, button_clicks)
     VALUES ($1,0,0,0,1)
     ON CONFLICT (username) DO UPDATE SET button_clicks = visit_totals.button_clicks + 1`,
    [username],
  );
  const now = new Date();
  for (const [granularity, period] of [["day", isoDateKey(now)], ["hour", isoHourKey(now)]] as const) {
    await pool.query(
      `INSERT INTO visit_stats (username, granularity, period, visits, scans, link_opens, button_clicks)
       VALUES ($1,$2,$3,0,0,0,1)
       ON CONFLICT (username, granularity, period) DO UPDATE SET
         button_clicks = visit_stats.button_clicks + 1`,
      [username, granularity, period],
    );
  }
}
