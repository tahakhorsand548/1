import React from "react";
import ReactDOMServer from "react-dom/server";
import CardPreview from "./components/CardPreview";
import type { CardData } from "./types";

export interface RenderedCard {
  lightHtml: string;
  darkHtml: string;
}

/**
 * کارت را دو بار به HTML استاتیک رندر می‌کند: یک‌بار با حالت روشن، یک‌بار با
 * حالت تاریک. چون این صفحه بدون hydrate شدن React در مرورگر سرو می‌شود (برای
 * سبک و سریع ماندن باندل)، دکمه‌ی تغییر حالت روشن/تاریک با یک اسکریپت ساده
 * (enhance.js) بین این دو خروجیِ از پیش‌رندرشده جابه‌جا می‌شود، نه با اجرای
 * دوباره‌ی React در کلاینت.
 */
export function renderCard(data: CardData, username: string): RenderedCard {
  const lightData: CardData = { ...data, design: { ...data.design, isDark: false } };
  const darkData: CardData = { ...data, design: { ...data.design, isDark: true } };

  const lightHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CardPreview, { data: lightData, username, isPreview: false }),
  );
  const darkHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CardPreview, { data: darkData, username, isPreview: false }),
  );

  return { lightHtml, darkHtml };
}
