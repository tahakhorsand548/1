/**
 * آدرس عمومی صفحه‌ی نمایش کارت — همیشه روی دامنه‌ی مستقل card-server
 * (card.youkart.ir) است، نه روی دامنه‌ی اپلیکیشن اصلی (app.youkart.ir).
 * این تابع باید تنها منبع ساخت این لینک در کل پروژه باشد تا اگر دامنه در
 * آینده عوض شد، فقط همین یک‌جا نیاز به تغییر داشته باشد.
 */
export const CARD_SITE_BASE_URL = "https://card.youkart.ir";

export function getCardUrl(username: string, opts?: { source?: "scan" | "link" }): string {
  const url = `${CARD_SITE_BASE_URL}/${username}`;
  return opts?.source ? `${url}?source=${opts.source}` : url;
}
