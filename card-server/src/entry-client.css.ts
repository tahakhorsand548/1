// این فایل فقط برای «بیلد کلاینت» استفاده می‌شود (npm run build:client).
// تنها وظیفه‌اش وارد کردن کامپوننت‌های پکیج مشترک @youkart/card-components
// است تا پلاگین Tailwind v4 کلاس‌های واقعی استفاده‌شده در آن‌ها را اسکن کرده
// و CSS نهایی را بسازد. خروجی JS این فایل هرگز به مرورگر ارسال نمی‌شود —
// فقط فایل .css خروجی serve می‌شود.
import "./index.css";
import "@youkart/card-components";
