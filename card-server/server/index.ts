import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getUserForCard, isUserPro, getActiveProUsers, recordCardVisit, recordCardClick } from "./db";
import { buildCardPage, buildNotFoundPage, UPLOADS_BASE_URL } from "./render";
import { TtlCache } from "./cache";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PORT = parseInt(process.env.PORT || "4000", 10);
const app = express();
app.set("trust proxy", 1);

// ─── فایل CSS بیلدشده (Tailwind کامپایل‌شده روی کلاس‌های واقعی CardPreview) ───
// بعد از `npm run build:client` نام فایل با هش تولید می‌شود؛ اینجا آخرین
// فایل .css موجود در dist/assets را پیدا می‌کنیم.
function findBuiltCss(): string {
  const assetsDir = path.join(ROOT, "dist", "assets");
  try {
    const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".css"));
    if (files.length > 0) return `/assets/${files[0]}`;
  } catch {}
  return "";
}
const cssHref = findBuiltCss();

app.use("/assets", express.static(path.join(ROOT, "dist", "assets"), { maxAge: "1y", immutable: true }));
app.use(express.static(path.join(ROOT, "public")));

// ─── کش HTML رندرشده (۶۰ ثانیه) — تا زیر بار زیاد فشار روی دیتابیس کم شود ────
const pageCache = new TtlCache<string>(60_000);

// ─── ماژول SSR بیلدشده (npm run build:ssr) به‌صورت پویا import می‌شود ─────────
let renderCardFn: ((data: any, username: string, imageBaseUrl: string) => { lightHtml: string; darkHtml: string }) | null = null;
async function getRenderCard() {
  if (renderCardFn) return renderCardFn;
  const ssrEntry = path.join(ROOT, "dist-ssr", "entry-server.js");
  if (!fs.existsSync(ssrEntry)) {
    throw new Error(
      "باندل SSR پیدا نشد. لطفا ابتدا دستور `npm run build` (یا `npm run build:ssr`) را اجرا کنید.",
    );
  }
  const mod = await import(ssrEntry);
  renderCardFn = mod.renderCard;
  return renderCardFn!;
}

// ─── مسیر اصلی: نمایش عمومی کارت ─────────────────────────────────────────────
app.get("/:username", async (req, res, next) => {
  const username = req.params.username;

  // مسیرهای رزرو‌شده را به SSR کارت نفرست
  if (["sitemap.xml", "robots.txt", "favicon.ico", "assets", "enhance.js"].includes(username)) {
    return next();
  }

  try {
    const cacheKey = `page:${username.toLowerCase()}`;
    const cached = pageCache.get(cacheKey);
    if (cached) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Cache", "HIT");
      return res.send(cached);
    }

    const user = await getUserForCard(username);
    if (!user || user.isSuspended) {
      res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(buildNotFoundPage());
    }

    const [isPro] = await Promise.all([
      isUserPro(username),
      recordCardVisit(username, (req.query.source as string) === "scan" ? "scan" : "link"),
    ]);

    const renderCard = await getRenderCard();
    const rendered = renderCard(user.cardData, user.username, UPLOADS_BASE_URL);
    const html = buildCardPage(user, rendered, { isPro, cssHref });

    pageCache.set(cacheKey, html);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Cache", "MISS");
    return res.send(html);
  } catch (err) {
    console.error("[card-server] خطا در رندر کارت:", err);
    return res.status(500).send("خطای داخلی سرور.");
  }
});

// ─── ثبت کلیک (فراخوانی‌شده توسط enhance.js) ─────────────────────────────────
app.post("/api/click/:username", async (req, res) => {
  try {
    await recordCardClick(req.params.username);
  } catch (err) {
    console.error("[card-server] خطا در ثبت کلیک:", err);
  }
  res.status(204).end();
});

// ─── invalidate کش یک کاربر (وقتی کارتش را ذخیره می‌کند) ─────────────────────
// فراخوانی داخلی از سرور اصلی، با یک کلید مخفی ساده محافظت می‌شود.
app.post("/internal/invalidate/:username", express.json(), (req, res) => {
  const secret = req.headers["x-internal-secret"];
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ message: "دسترسی غیرمجاز." });
  }
  pageCache.invalidate(`page:${req.params.username.toLowerCase()}`);
  return res.json({ success: true });
});

// ─── sitemap.xml — فقط کاربران پرو فعال ──────────────────────────────────────
app.get("/sitemap.xml", async (req, res) => {
  try {
    const users = await getActiveProUsers();
    const siteBase = process.env.SITE_BASE_URL || "https://card.youkart.ir";
    const urls = users
      .map(
        (u) => `  <url>
    <loc>${siteBase}/${u.username}</loc>
    <lastmod>${new Date(u.cardUpdatedAt).toISOString().slice(0, 10)}</lastmod>
  </url>`,
      )
      .join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(xml);
  } catch (err) {
    console.error("[card-server] خطا در تولید sitemap:", err);
    res.status(500).send("");
  }
});

// ─── robots.txt ───────────────────────────────────────────────────────────────
app.get("/robots.txt", (req, res) => {
  const siteBase = process.env.SITE_BASE_URL || "https://card.youkart.ir";
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`User-agent: *
Allow: /
Sitemap: ${siteBase}/sitemap.xml
`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[card-server] http://localhost:${PORT}`);
  if (!cssHref) {
    console.warn("[card-server] هشدار: فایل CSS بیلدشده پیدا نشد — ابتدا `npm run build:client` را اجرا کنید.");
  }
});
