import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { CardData, User, AdvertisingBanner } from "../../types";

interface StatsTabProps {
  user: User;
  cardData: CardData;
  banners: AdvertisingBanner[];
  chartData: { label: string; value: number }[];
  maxChartVal: number;
  handleCopyLink: (link: string) => void;
}

export default function StatsTab({
  user,
  cardData,
  banners,
  chartData,
  maxChartVal,
  handleCopyLink,
}: StatsTabProps) {
  return (
        <div className="space-y-8 text-right">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              سلام "{user.fullName}" گرامی
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1.5">
              به صفحه کنترل پنل و ایجاد کارت ویزیت دیجیتال یوکارت خوش آمدید.
            </p>
          </div>

          {/* Quick Online link trigger */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400 font-bold">
                آدرس آنلاین عمومی کارت ویزیت هوشمند شما :
              </p>
              <span className="text-sm font-semibold text-blue-600 font-mono mt-1 block">
                {`${window.location.origin}/card/${user.username}`}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleCopyLink(
                    `${window.location.origin}/card/${user.username}`,
                  )
                }
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                کپی لینک
              </button>
              <a
                href={`/card/${user.username}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10 text-white text-xs font-bold transition flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                آدرس آنلاین کارت ویزیت
              </a>
            </div>
          </div>

          {/* 4 real statistical tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold">
                  کل بازدیدهای کارت :
                </span>
                <span className="text-2xl font-black text-slate-800 font-mono mt-2 block">
                  {cardData.stats?.totalVisits || 15}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: "80%" }}
                  ></div>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                  روند صعودی بهینه 📈
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold">
                  تعداد اسکن بارکد (QR) :
                </span>
                <span className="text-2xl font-black text-slate-850 font-mono mt-2 block">
                  {cardData.stats?.scans || 0}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: "35%" }}
                  ></div>
                </div>
                <span className="text-[10px] text-blue-600 font-bold mt-1 block">
                  پاسخ کارت فیزیکی NFC
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold">
                  تعداد کلیک دکمه ها :
                </span>
                <span className="text-2xl font-black text-slate-800 font-mono mt-2 block">
                  {cardData.stats?.buttonClicks || 0}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: "60%" }}
                  ></div>
                </div>
                <span className="text-[10px] text-[#5551FF] font-bold mt-1 block">
                  نرخ تبدیل عالی (CTR)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-bold">
                  بازدید لینک مستقیم :
                </span>
                <span className="text-2xl font-black text-slate-800 font-mono mt-2 block">
                  {cardData.stats?.linkOpens || 0}
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: "50%" }}
                  ></div>
                </div>
                <span className="text-[10px] text-purple-600 font-bold mt-1 block">
                  ورودی گوگل و پیامک ها
                </span>
              </div>
            </div>
          </div>

          {/* Simulated interactive last 7 days chart - native SVG with CSS transitions */}
<div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-extrabold text-sm text-slate-800">
      نمودار بازدیدهای ۷ روز اخیر کارت شما
    </h3>

    <span className="text-xs text-slate-500">
      تاریخ شمسی
    </span>
  </div>

  <div className="relative h-[240px]">

    {/* Background lines */}
    <div className="absolute inset-0 flex flex-col justify-between pb-8 pointer-events-none">
      {[0,1,2,3,4].map((i) => (
        <div
          key={i}
          className="border-t border-slate-200 w-full"
        />
      ))}
    </div>

    {/* Bars */}
    <div className="absolute inset-0 flex items-end justify-between gap-2">
      {chartData.map((d, idx) => {
        const percent =
          maxChartVal > 0
            ? (d.value / maxChartVal) * 100
            : 0;

        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center justify-end h-full group relative"
          >
            {/* Tooltip */}
            <div className="absolute bottom-[calc(var(--bar-height)+55px)] opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
              <div className="bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                {d.value} بازدید
              </div>
            </div>

            {/* Bar */}
            <div
              className="
                w-full max-w-[38px]
                rounded-t-xl
                bg-gradient-to-t
                from-blue-600
                via-blue-500
                to-cyan-400
                shadow-lg
                transition-all
                duration-500
                hover:scale-105
                hover:brightness-110
                relative
                overflow-hidden
              "
              style={{
                height: `${Math.max(percent, d.value > 0 ? 12 : 4)}%`,
                ['--bar-height' as any]:
                  `${Math.max(percent, d.value > 0 ? 12 : 4)}%`
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-60" />
            </div>

            {/* Value */}
            <span className="mt-2 text-xs font-bold text-slate-700">
              {d.value}
            </span>

            {/* Date label */}
            <span className="text-[10px] text-slate-500 mt-1 text-center leading-4">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  </div>
</div>

          {/* Sub-Banners (Banner 2 & 3) */}
          {banners.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {banners.slice(1, 3).map(
                (b) =>
                  b.imageUrl && (
                    <a
                      href={b.link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={b.id}
                      className="block w-full h-32 md:h-40 bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm relative group cursor-pointer transition hover:opacity-95"
                    >
                      <img
                        src={b.imageUrl}
                        className="w-full h-full object-cover"
                        alt={b.title || "Advertisement"}
                        title={b.title}
                      />
                    </a>
                  ),
              )}
            </div>
          )}
        </div>
  );
}
