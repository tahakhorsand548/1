import type { CardUserRow } from "./db";

// آدرس پایه‌ی سرور اصلی برای بارگذاری تصاویر از همان /uploads (بدون کپی فایل)
const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL || "https://youkart.ir";
const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://card.youkart.ir";

function absoluteImageUrl(url?: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return `${UPLOADS_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PageOptions {
  isPro: boolean;
  cssHref: string;
}

export function buildCardPage(
  user: CardUserRow,
  rendered: { lightHtml: string; darkHtml: string },
  { isPro, cssHref }: PageOptions,
): string {
  const cd = user.cardData || {};
  const businessName: string = cd.businessName || user.fullName;
  const description: string = (cd.slogan || cd.description || `کارت ویزیت دیجیتال ${businessName}`).slice(0, 160);
  const ogImage = absoluteImageUrl(cd.logoUrl || cd.bgImageUrl);
  const pageUrl = `${SITE_BASE_URL}/${user.username}`;
  const title = `${businessName} | کارت ویزیت دیجیتال`;

  const robotsTag = isPro
    ? `<meta name="robots" content="index, follow">`
    : `<meta name="robots" content="noindex, follow">`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: businessName,
    jobTitle: cd.brandManager || undefined,
    description,
    image: ogImage || undefined,
    url: pageUrl,
    telephone: (cd.phones && cd.phones[0]) || undefined,
  };

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
${robotsTag}
<link rel="canonical" href="${pageUrl}">

<meta property="og:type" content="profile">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${pageUrl}">
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ""}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ""}

<link rel="stylesheet" href="${cssHref}">
<script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>
<body>
<div id="card-light">${rendered.lightHtml}</div>
<div id="card-dark" style="display:none">${rendered.darkHtml}</div>
<script src="/enhance.js" defer></script>
</body>
</html>`;
}

export function buildNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>کارت یافت نشد</title>
<meta name="robots" content="noindex">
</head>
<body style="font-family: sans-serif; text-align:center; padding-top: 80px; color:#334155;">
<h1>این کارت ویزیت یافت نشد</h1>
<p>ممکن است آدرس اشتباه باشد یا این کارت غیرفعال شده باشد.</p>
</body>
</html>`;
}
