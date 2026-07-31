import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

// ─── Vite config سرویس card-server ───────────────────────────────────────────
// این پروژه کاملاً مستقل است و هیچ وابستگی‌ای به داشبورد/ادمین/ادیتور ندارد.
// فقط کامپوننت CardPreview.tsx (و وابستگی‌های خودش) را از پروژه اصلی import
// می‌کند تا ظاهر کارت دقیقاً همانی باشد که همین حالا در /card/:username است.
//
// دو build جدا اجرا می‌شود (هر دو با همین فایل config):
//   npm run build:client → یک بسته‌ی CSS/JS سبک برای مرورگر (فقط استایل + enhance.js دستی)
//   npm run build:ssr    → باندل SSR قابل‌ایمپورت در Node (entry-server.tsx)
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@main": path.resolve(__dirname, "../digital-card/src"),
    },
  },
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
