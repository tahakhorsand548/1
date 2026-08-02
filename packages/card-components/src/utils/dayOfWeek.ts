/**
 * محاسبه‌ی درست «امروز چه روزی از هفته است» بر اساس تقویم ایران — مستقل از
 * timezone سرور (روی Render سرور UTC است، نه Asia/Tehran).
 *
 * باگ قبلی: از Date.getDay() (که ۰=یکشنبه ... ۶=شنبه است) مستقیم به‌عنوان
 * ایندکس یک آرایه‌ی نادرست‌مرتب‌شده استفاده می‌شد، که هم ترتیب روزها غلط بود
 * و هم به timezone سرور وابسته بود (ممکن بود نزدیک نیمه‌شب، روز اشتباه
 * محاسبه شود). اینجا با Intl.DateTimeFormat و timeZone صریح "Asia/Tehran"،
 * نام روز هفته مستقیماً و به‌درستی محاسبه می‌شود.
 */

export const IRANIAN_WEEK_DAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

const ENGLISH_TO_IRANIAN_DAY: Record<string, (typeof IRANIAN_WEEK_DAYS)[number]> = {
  Saturday: "شنبه",
  Sunday: "یکشنبه",
  Monday: "دوشنبه",
  Tuesday: "سه شنبه",
  Wednesday: "چهارشنبه",
  Thursday: "پنجشنبه",
  Friday: "جمعه",
};

/** نام روز هفته (به فارسی، طبق ترتیب ایرانی) برای «امروز» به وقت تهران */
export function getTehranDayName(date: Date = new Date()): string {
  const englishWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "long",
  }).format(date);
  return ENGLISH_TO_IRANIAN_DAY[englishWeekday] || "شنبه";
}
