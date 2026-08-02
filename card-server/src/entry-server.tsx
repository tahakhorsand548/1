import React from "react";
import ReactDOMServer from "react-dom/server";
import { CardPreview } from "@youkart/card-components";
import type { CardData } from "@youkart/card-components";

export interface RenderedCard {
  lightHtml: string;
  darkHtml: string;
}

/**
 * کارت را دو بار به HTML استاتیک رندر می‌کند: یک‌بار با حالت روشن، یک‌بار با
 * حالت تاریک. چون این صفحه بدون hydrate شدن React در مرورگر سرو می‌شود (برای
 * سبک و سریع ماندن باندل)، دکمه‌ی تغییر حالت روشن/تاریک با یک اسکریپت ساده
 * (enhance.js) بین این دو خروجیِ از پیش‌رندرشده جابه‌جا می‌شود، نه با اجرای
 * دوباره‌ی React در کلاینت. این‌که کدام‌یک ابتدا نمایش داده شود (بر اساس تم
 * ذخیره‌شده‌ی واقعی کاربر) وظیفه‌ی server/render.ts است، نه اینجا.
 *
 * imageBaseUrl: پیشوند مطلق برای تصاویر آپلودی (چون این صفحه روی دامنه‌ی
 * دیگری غیر از سرور اصلی سرو می‌شود؛ رجوع کنید به CardPreview.tsx).
 */
export function renderCard(data: CardData, username: string, imageBaseUrl: string): RenderedCard {
  const lightData: CardData = { ...data, design: { ...data.design, isDark: false } };
  const darkData: CardData = { ...data, design: { ...data.design, isDark: true } };

  const lightHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CardPreview, { data: lightData, username, isPreview: false, imageBaseUrl }),
  );
  const darkHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CardPreview, { data: darkData, username, isPreview: false, imageBaseUrl }),
  );

  return { lightHtml, darkHtml };
}
