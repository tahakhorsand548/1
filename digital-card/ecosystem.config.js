// ─── PM2 Ecosystem Config ───────────────────────────────────────────────────
// این اپ عمداً روی یک instance واحد (بدون cluster mode) اجرا می‌شود، چون
// state اتصالات WebSocket (تیکت‌ها) و rate-limiter فعلاً در حافظه‌ی همان
// پردازه نگهداری می‌شوند و هنوز به Redis منتقل نشده‌اند. اجرای چند instance
// همزمان (cluster) باعث می‌شود کاربران بسته به این‌که به کدام instance وصل
// شده باشند، پیام‌های realtime یا محدودیت نرخ متفاوتی ببینند.
//
// ── نحوه اجرا روی سرور ──────────────────────────────────────────────────────
//   npm run build                 # ساخت نسخه production (dist/server.cjs + build فرانت‌اند)
//   pm2 start ecosystem.config.js --env production
//   pm2 save                      # ذخیره وضعیت فعلی فرآیندها
//   pm2 startup                   # دستور چاپ‌شده توسط این خط را یک‌بار با sudo اجرا کنید
//                                  # تا بعد از ریبوت سرور، PM2 و اپ به‌صورت خودکار بالا بیایند
//
// ── دستورات مفید بعدی ───────────────────────────────────────────────────────
//   pm2 logs digital-card         # مشاهده لاگ‌های زنده
//   pm2 restart digital-card      # ری‌استارت بدون downtime قابل توجه
//   pm2 reload digital-card       # ری‌لود (graceful) در صورت پشتیبانی
//   pm2 monit                     # مانیتور CPU/RAM زنده

module.exports = {
  apps: [
    {
      name: "digital-card",
      script: "dist/server.cjs",
      instances: 1,
      exec_mode: "fork", // نه cluster — به دلیل WebSocket/rate-limiter در حافظه
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      // خروجی لاگ‌ها را در پوشه‌ی logs/ نگه می‌داریم تا با journalctl/logrotate قابل مدیریت باشد
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      merge_logs: true,
      time: true,
      // اگر اپ بلافاصله بعد از استارت کرش کند (مثلاً env ناقص)، فوراً retry نکن
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
