import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

// ─── Vite config سرویس card-server ───────────────────────────────────────────
// این پروژه کاملاً مستقل و خودکفاست — هیچ وابستگی‌ای به پوشه‌ی دیگری (داشبورد/
// ادمین/ادیتور یا حتی پروژه اصلی digital-card) ندارد. کامپوننت CardPreview.tsx
// و وابستگی‌های خودش (types.ts، utils/api.ts، لوگوها، index.css) به‌صورت فیزیکی
// داخل همین پوشه (src/) کپی شده‌اند تا build کاملاً مستقل انجام شود؛ حتی اگر
// پوشه‌ی دیگری کنارش نباشد هم باید بدون خطا build/اجرا شود.
//
// دو build جدا اجرا می‌شود (هر دو با همین فایل config):
//   npm run build:client → یک بسته‌ی CSS/JS سبک برای مرورگر (فقط استایل + enhance.js دستی)
//   npm run build:ssr    → باندل SSR قابل‌ایمپورت در Node (entry-server.tsx)
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  build: isSsrBuild
    ? {
        // بیلد SSR: فقط entry-server.tsx به یک ماژول Node-قابل-ایمپورت تبدیل می‌شود
        outDir: "dist-ssr",
        ssr: true,
        rollupOptions: {
          input: path.resolve(__dirname, "src/entry-server.tsx"),
          output: { format: "es" },
        },
      }
    : {
        // بیلد کلاینت: فقط CSS واقعی (Tailwind کامپایل‌شده روی کلاس‌های CardPreview) خروجی می‌دهیم
        outDir: "dist",
        rollupOptions: {
          input: path.resolve(__dirname, "src/entry-client.css.ts"),
        },
        cssCodeSplit: false,
      },
}));
