-- ═══════════════════════════════════════════════════════════════════════════
-- schema.sql — معادل PostgreSQL جدول‌های فعلی SQLite
--
-- تفاوت‌های عمدی نسبت به نسخه SQLite:
--   • card_data از TEXT به JSONB تبدیل شده (سریع‌تر، قابل ایندکس/کوئری).
--   • آمار بازدید (که قبلاً داخل card_data.stats.dailyStats/hourlyStats بود)
--     به جدول جدای visit_stats منتقل شده تا هر بازدید فقط یک UPSERT سبک
--     باشد، نه بازنویسی کل رکورد JSON کاربر.
--   • ستون‌های boolean (is_suspended) به نوع native BOOLEAN تبدیل شده‌اند
--     (در SQLite به‌صورت INTEGER 0/1 بود).
--   • هر تغییر ساختاری (migration) که در SQLite با ALTER TABLE ADD COLUMN
--     اضافه شده بود، مستقیماً در تعریف اولیه جدول لحاظ شده است.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  username           TEXT PRIMARY KEY,
  full_name          TEXT NOT NULL,
  email              TEXT UNIQUE NOT NULL,
  phone              TEXT UNIQUE NOT NULL,
  password_hash      TEXT NOT NULL,
  is_suspended       BOOLEAN NOT NULL DEFAULT FALSE,
  qr_image_url       TEXT NOT NULL DEFAULT '',
  qr_request_status  TEXT NOT NULL DEFAULT 'none',
  qr_request_time    TEXT NOT NULL DEFAULT '',
  qr_approved_at     TEXT NOT NULL DEFAULT '',
  card_data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id                  TEXT PRIMARY KEY,
  username            TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  user_fullname       TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TEXT NOT NULL,
  messages            JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_at     TEXT NOT NULL DEFAULT '',
  admin_last_read_at  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_tickets_username ON tickets(username);
CREATE INDEX IF NOT EXISTS idx_tickets_last_message_at ON tickets(last_message_at DESC);

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
  title     TEXT NOT NULL DEFAULT '',
  link_url  TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT ''
);

-- جدول اشتراک کاربران
CREATE TABLE IF NOT EXISTS subscriptions (
  id          TEXT PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE REFERENCES users(username) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'free',
  status      TEXT NOT NULL DEFAULT 'free',
  start_date  TEXT NOT NULL DEFAULT '',
  expire_date TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- تاریخچه تمام خریدها و تمدیدها
CREATE TABLE IF NOT EXISTS subscription_purchases (
  id               TEXT PRIMARY KEY,
  username         TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  plan             TEXT NOT NULL,
  duration_months  INTEGER NOT NULL DEFAULT 0,
  amount           INTEGER NOT NULL DEFAULT 0,
  payment_method   TEXT NOT NULL,
  payment_status   TEXT NOT NULL DEFAULT 'pending',
  transaction_id   TEXT NOT NULL DEFAULT '',
  receipt_image    TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL,
  approved_at      TEXT NOT NULL DEFAULT '',
  approved_by      TEXT NOT NULL DEFAULT '',
  start_date       TEXT NOT NULL DEFAULT '',
  expire_date      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sub_purchases_username ON subscription_purchases(username);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  months     INTEGER NOT NULL,
  price      INTEGER NOT NULL,
  is_free    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subscription_features (
  id          TEXT PRIMARY KEY,
  plan_id     TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ─── جدول جدید: آمار بازدید (به‌جای dailyStats/hourlyStats داخل card_data JSON) ──
-- هر بازدید/کلیک فقط یک UPSERT سبک روی یک ردیف است، نه بازنویسی کل رکورد کاربر.
-- granularity ستون مشخص می‌کند این ردیف مربوط به کدام سطل زمانی است:
--   'hour' → period مقدار YYYY-MM-DDTHH دارد (برای نمای ۲۴ ساعته)
--   'day'  → period مقدار YYYY-MM-DD دارد (برای نمای ۷ روزه/۱ ماهه/۶ ماهه)
CREATE TABLE IF NOT EXISTS visit_stats (
  username      TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  granularity   TEXT NOT NULL CHECK (granularity IN ('hour', 'day')),
  period        TEXT NOT NULL,
  visits        INTEGER NOT NULL DEFAULT 0,
  scans         INTEGER NOT NULL DEFAULT 0,
  link_opens    INTEGER NOT NULL DEFAULT 0,
  button_clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (username, granularity, period)
);
CREATE INDEX IF NOT EXISTS idx_visit_stats_period ON visit_stats(granularity, period);

-- شمارنده‌های تجمعی همه‌دوره (معادل stats.totalVisits/scans/linkOpens/buttonClicks قدیمی)
-- تا برای نمایش «کل بازدید» مجبور به SUM روی کل visit_stats نباشیم.
CREATE TABLE IF NOT EXISTS visit_totals (
  username      TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  total_visits  INTEGER NOT NULL DEFAULT 0,
  scans         INTEGER NOT NULL DEFAULT 0,
  link_opens    INTEGER NOT NULL DEFAULT 0,
  button_clicks INTEGER NOT NULL DEFAULT 0
);
