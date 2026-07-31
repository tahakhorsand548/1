// PM2 config برای سرویس مستقل card-server (card.youkart.ir)
// این پردازه کاملاً جدا از پروژه اصلی digital-card اجرا می‌شود، روی پورت خودش.
//
// ── نحوه اجرا ────────────────────────────────────────────────────────────────
//   cd card-server
//   npm install
//   npm run build          # می‌سازد: dist/assets/*.css و dist-ssr/entry-server.js
//   pm2 start ecosystem.config.js --env production
//   pm2 save
//
// بعد از هر تغییر در CardPreview.tsx (پروژه اصلی)، برای اعمال شدن روی این
// سرویس هم باید دوباره `npm run build` و `pm2 restart card-server` اجرا شود.

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
