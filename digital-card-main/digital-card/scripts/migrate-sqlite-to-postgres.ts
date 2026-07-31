/**
 * scripts/migrate-sqlite-to-postgres.ts
 * ─────────────────────────────────────────────────────────────────────────
 * داده‌های موجود در data/app.db (SQLite) را به دیتابیس Postgres مشخص‌شده در
 * DATABASE_URL منتقل می‌کند.
 *
 * نکته مهم: ساختار قدیمی آمار بازدید (card_data.stats.dailyStats / hourlyStats
 * که داخل JSON هر کاربر بود) در این اسکریپت به جدول جدید visit_stats
 * تجزیه و منتقل می‌شود؛ و مجموع‌های کلی (totalVisits/scans/linkOpens/
 * buttonClicks) به جدول visit_totals.
 *
 * نحوه اجرا:
 *   1. مطمئن شوید Postgres بالاست و schema.sql روی آن اجرا شده:
 *        psql "$DATABASE_URL" -f db/schema.sql
 *   2. سپس:
 *        npx tsx scripts/migrate-sqlite-to-postgres.ts
 *
 * این اسکریپت idempotent است (اگر دوباره اجرا شود، ردیف‌های تکراری با
 * ON CONFLICT ... DO NOTHING/UPDATE نادیده گرفته یا بازنویسی می‌شوند) —
 * پس اجرای دوباره‌اش در صورت قطع‌شدن وسط کار، خطرناک نیست.
 */

import "dotenv/config";
import path from "path";
import Database from "better-sqlite3";
import { Pool } from "pg";

const SQLITE_PATH = path.join(process.cwd(), "data", "app.db");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ متغیر محیطی DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  console.log(`📂 خواندن SQLite از: ${SQLITE_PATH}`);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pg = new Pool({ connectionString: process.env.DATABASE_URL });

  const client = await pg.connect();

  try {
    let usersMigrated = 0;
    let visitStatsRows = 0;

    // ── users + card_data (بدون stats — stats جدا استخراج می‌شود) + visit_stats/visit_totals ──
    const users = sqlite.prepare("SELECT * FROM users").all() as any[];
    console.log(`👤 ${users.length} کاربر پیدا شد.`);

    for (const u of users) {
      let cardData: any = {};
      try { cardData = JSON.parse(u.card_data || "{}"); } catch { cardData = {}; }

      const stats = cardData.stats || {};
      const dailyStats = stats.dailyStats || {};
      const hourlyStats = stats.hourlyStats || {};

      // card_data ذخیره‌شده در Postgres دیگر شامل stats.dailyStats/hourlyStats نیست
      // (این‌ها به visit_stats منتقل شدند). فیلدهای دیگر card_data دست‌نخورده می‌مانند.
      const { stats: _omit, ...cardDataWithoutHistory } = cardData;
      const cardDataForPg = {
        ...cardDataWithoutHistory,
        stats: {
          totalVisits: stats.totalVisits || 0,
          scans: stats.scans || 0,
          linkOpens: stats.linkOpens || 0,
          buttonClicks: stats.buttonClicks || 0,
        },
      };

      await client.query(
        `INSERT INTO users
           (username, full_name, email, phone, password_hash, is_suspended,
            qr_image_url, qr_request_status, qr_request_time, qr_approved_at, card_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (username) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           password_hash = EXCLUDED.password_hash,
           is_suspended = EXCLUDED.is_suspended,
           qr_image_url = EXCLUDED.qr_image_url,
           qr_request_status = EXCLUDED.qr_request_status,
           qr_request_time = EXCLUDED.qr_request_time,
           qr_approved_at = EXCLUDED.qr_approved_at,
           card_data = EXCLUDED.card_data`,
        [
          u.username, u.full_name, u.email, u.phone, u.password_hash,
          !!u.is_suspended, u.qr_image_url, u.qr_request_status,
          u.qr_request_time, u.qr_approved_at || "", JSON.stringify(cardDataForPg),
        ],
      );

      await client.query(
        `INSERT INTO visit_totals (username, total_visits, scans, link_opens, button_clicks)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (username) DO UPDATE SET
           total_visits = EXCLUDED.total_visits,
           scans = EXCLUDED.scans,
           link_opens = EXCLUDED.link_opens,
           button_clicks = EXCLUDED.button_clicks`,
        [u.username, stats.totalVisits || 0, stats.scans || 0, stats.linkOpens || 0, stats.buttonClicks || 0],
      );

      for (const [period, bucket] of Object.entries<any>(dailyStats)) {
        await client.query(
          `INSERT INTO visit_stats (username, granularity, period, visits, scans, link_opens, button_clicks)
           VALUES ($1,'day',$2,$3,$4,$5,$6)
           ON CONFLICT (username, granularity, period) DO UPDATE SET
             visits = EXCLUDED.visits, scans = EXCLUDED.scans,
             link_opens = EXCLUDED.link_opens, button_clicks = EXCLUDED.button_clicks`,
          [u.username, period, bucket.visits || 0, bucket.scans || 0, bucket.linkOpens || 0, bucket.buttonClicks || 0],
        );
        visitStatsRows++;
      }

      for (const [period, bucket] of Object.entries<any>(hourlyStats)) {
        await client.query(
          `INSERT INTO visit_stats (username, granularity, period, visits, scans, link_opens, button_clicks)
           VALUES ($1,'hour',$2,$3,$4,$5,$6)
           ON CONFLICT (username, granularity, period) DO UPDATE SET
             visits = EXCLUDED.visits, scans = EXCLUDED.scans,
             link_opens = EXCLUDED.link_opens, button_clicks = EXCLUDED.button_clicks`,
          [u.username, period, bucket.visits || 0, bucket.scans || 0, bucket.linkOpens || 0, bucket.buttonClicks || 0],
        );
        visitStatsRows++;
      }

      usersMigrated++;
    }
    console.log(`✅ ${usersMigrated} کاربر و ${visitStatsRows} ردیف آمار بازدید منتقل شد.`);

    // ── subscriptions ──
    const subs = sqlite.prepare("SELECT * FROM subscriptions").all() as any[];
    for (const s of subs) {
      await client.query(
        `INSERT INTO subscriptions (id, username, plan, status, start_date, expire_date, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.username, s.plan, s.status, s.start_date, s.expire_date, s.created_at, s.updated_at],
      );
    }
    console.log(`✅ ${subs.length} رکورد subscriptions منتقل شد.`);

    // ── subscription_purchases ──
    const purchases = sqlite.prepare("SELECT * FROM subscription_purchases").all() as any[];
    for (const p of purchases) {
      await client.query(
        `INSERT INTO subscription_purchases
           (id, username, plan, duration_months, amount, payment_method, payment_status,
            transaction_id, receipt_image, description, created_at, approved_at, approved_by,
            start_date, expire_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.username, p.plan, p.duration_months, p.amount, p.payment_method,
          p.payment_status, p.transaction_id, p.receipt_image, p.description,
          p.created_at, p.approved_at, p.approved_by, p.start_date || "", p.expire_date || "",
        ],
      );
    }
    console.log(`✅ ${purchases.length} رکورد subscription_purchases منتقل شد.`);

    // ── subscription_plans + subscription_features ──
    const plans = sqlite.prepare("SELECT * FROM subscription_plans").all() as any[];
    for (const p of plans) {
      await client.query(
        `INSERT INTO subscription_plans (id, title, months, price, is_free, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.title, p.months, p.price, !!p.is_free, !!p.is_active, p.sort_order],
      );
    }
    const features = sqlite.prepare("SELECT * FROM subscription_features").all() as any[];
    for (const f of features) {
      await client.query(
        `INSERT INTO subscription_features (id, plan_id, feature_key, enabled)
         VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [f.id, f.plan_id, f.feature_key, !!f.enabled],
      );
    }
    console.log(`✅ ${plans.length} پلن و ${features.length} ویژگی پلن منتقل شد.`);

    // ── tickets ──
    const tickets = sqlite.prepare("SELECT * FROM tickets").all() as any[];
    for (const t of tickets) {
      await client.query(
        `INSERT INTO tickets
           (id, username, user_fullname, title, description, status, created_at,
            messages, last_message_at, admin_last_read_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          t.id, t.username, t.user_fullname, t.title, t.description, t.status,
          t.created_at, t.messages, t.last_message_at || "", t.admin_last_read_at || "",
        ],
      );
    }
    console.log(`✅ ${tickets.length} تیکت منتقل شد.`);

    // ── announcements ──
    const announcements = sqlite.prepare("SELECT * FROM announcements").all() as any[];
    for (const a of announcements) {
      await client.query(
        `INSERT INTO announcements (id, title, description, image, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.title, a.description, a.image, a.created_at],
      );
    }
    console.log(`✅ ${announcements.length} اعلان منتقل شد.`);

    // ── banners ──
    const banners = sqlite.prepare("SELECT * FROM banners").all() as any[];
    for (const b of banners) {
      await client.query(
        `INSERT INTO banners (id, image_url, title, link_url, video_url)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET
           image_url = EXCLUDED.image_url, title = EXCLUDED.title,
           link_url = EXCLUDED.link_url, video_url = EXCLUDED.video_url`,
        [b.id, b.image_url, b.title, b.link_url || "", b.video_url || ""],
      );
    }
    console.log(`✅ ${banners.length} بنر منتقل شد.`);

    console.log("\n🎉 مهاجرت با موفقیت کامل شد.");
  } finally {
    client.release();
    await pg.end();
    sqlite.close();
  }
}

main().catch((err) => {
  console.error("❌ خطا در مهاجرت:", err);
  process.exit(1);
});
