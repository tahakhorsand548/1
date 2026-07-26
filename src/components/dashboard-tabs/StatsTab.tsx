import React from "react";
import { Copy, ExternalLink, Crown, RefreshCw } from "lucide-react";
import { CardData, User, AdvertisingBanner } from "../../types";
import { SubscriptionInfo } from "../../hooks/useSubscription";
import VisitsChart from "./VisitsChart";

interface StatsTabProps {
  user: User;
  cardData: CardData;
  banners: AdvertisingBanner[];
  handleCopyLink: (link: string) => void;
  subscription: SubscriptionInfo | null;
  subscriptionLoading: boolean;
  isPro: boolean;
  /** باز کردن مودال سراسری خرید/تمدید اشتراک (مستقل از تب فعال) */
  onOpenSubscriptionModal: () => void;
}

export default function StatsTab({
  user,
  cardData,
  banners,
  handleCopyLink,
  subscription,
  subscriptionLoading,
  isPro,
  onOpenSubscriptionModal,
}: StatsTabProps) {
  return (
        <div className="space-y-8 text-right">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                سلام "{user.fullName}" گرامی
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-1.5">
                به صفحه کنترل پنل و ایجاد کارت ویزیت دیجیتال یوکارت خوش آمدید.
              </p>
            </div>

            {/* نشان وضعیت اشتراک پرو */}
            <div>
              {subscriptionLoading ? (
                <div className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  در حال بررسی اشتراک...
                </div>
              ) : isPro ? (
                <div className="flex items-center gap-3 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs font-black">
                    <Crown className="w-4 h-4" />
                    <span>
                      {subscription?.remainingDays ?? 0} روز باقیمانده از اشتراک
                    </span>
                  </div>
                  <button
                    onClick={onOpenSubscriptionModal}
                    className="py-1.5 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all"
                  >
                    تمدید اشتراک
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenSubscriptionModal}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold hover:scale-[1.02] transition-all"
                >
                  <Crown className="w-4 h-4" />
                  خرید اشتراک پرو
                </button>
              )}
            </div>
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

          {/* نمودار چند-متریکی آمار بازدید (مثل گزارش عملکرد سرچ کنسول) */}
          <VisitsChart stats={cardData.stats} />

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
