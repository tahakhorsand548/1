// PM2 config برای سرویس مستقل card-server (card.youkart.ir)
// این پردازه کاملاً جدا از پروژه اصلی digital-card اجرا می‌شود، روی پورت خودش.
//
// ⚠️ نکته مهم (بعد از راه‌اندازی پکیج مشترک @youkart/card-components):
// این پروژه دیگر با «npm install» تنها داخل همین پوشه کار نمی‌کند — چون به
// پکیج مشترک packages/card-components (که در ریشه‌ی مونوریپو قرار دارد)
// وابسته است. باید از ریشه‌ی ریپو نصب شود:
//
// ── نحوه اجرا (روی VPS با PM2) ─────────────────────────────────────────────
//   cd /path/to/repo-root          # نه داخل card-server!
//   npm install                    # نصب هر سه workspace با هم (لینک‌های لازم ساخته می‌شود)
//   npm run build --workspace=card-server
//   cd card-server
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//
// بعد از هر تغییر در کامپوننت‌های ظاهری کارت، فایل مربوطه را داخل
// packages/card-components/src/components ویرایش کنید (نه یک کپی محلی)،
// سپس همان دستور build بالا + `pm2 restart card-server` را دوباره اجرا کنید.
// اگر digital-card هم از این کامپوننت استفاده می‌کند (پیش‌نمایش داشبورد)،
// آن را هم دوباره build/restart کنید تا هماهنگ بمانند.


module.exports = {
  apps: [
    {
      name: "card-server",
      script: "server/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: { NODE_ENV: "development", PORT: 4000 },
      env_production: { NODE_ENV: "production", PORT: 4000 },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
