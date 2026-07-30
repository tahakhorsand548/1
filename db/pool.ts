import { Pool } from "pg";

// ─── اتصال PostgreSQL ─────────────────────────────────────────────────────────
// از یک Pool مشترک در کل اپ استفاده می‌کنیم (نه یک کانکشن تکی) تا درخواست‌های
// همزمان بلاک نشوند. برای ~1000 کاربر روی یک VPS، max=20 مقدار مناسبی است.
if (!process.env.DATABASE_URL) {
  console.error("❌ خطای راه‌اندازی: متغیر محیطی DATABASE_URL تنظیم نشده است.");
  console.error("   مثال: DATABASE_URL=postgres://user:password@localhost:5432/digitalcard");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  // خطای کانکشن‌های idle در pool — نباید کل پردازه را کرش کند
  console.error("[pg pool] خطای غیرمنتظره روی یک کانکشن idle:", err);
});

/**
 * اجرای یک کوئری پارامتری با Postgres placeholders ($1, $2, ...)
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** فقط اولین ردیف نتیجه را برمی‌گرداند (یا null) */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** برای INSERT/UPDATE/DELETE — تعداد ردیف‌های تحت‌تاثیر را برمی‌گرداند */
export async function execute(text: string, params: any[] = []): Promise<number> {
  const res = await pool.query(text, params);
  return res.rowCount ?? 0;
}

/** اجرای چند عملیات درون یک تراکنش واحد (commit خودکار / rollback در صورت خطا) */
export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
