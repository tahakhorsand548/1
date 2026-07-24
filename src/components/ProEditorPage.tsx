import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, RefreshCw, Info, Crown, Save } from "lucide-react";
import { CardData, User } from "../types";
import { apiFetch } from "../utils/api";
import { SubscriptionInfo } from "../hooks/useSubscription";
import IPhoneMockup from "./IPhoneMockup";
import logo from "../../img/logo/logo-full.png";

interface ProEditorPageProps {
  user: User;
  subscription: SubscriptionInfo | null;
}

/**
 * ─── مینی‌اپ «ادیتور پرو» ──────────────────────────────────────────────────
 * این صفحه به‌صورت تمام‌صفحه (روی کل برنامه) باز می‌شود و کاملاً مستقل از
 * چیدمان داشبورد (سایدبار/تب‌بار) است.
 *
 * ساختار این کامپوننت طوری طراحی شده که بعداً «تب ویرایشگر کارت پرو»
 * به‌سادگی داخل بخش <main> جایگزین باکس Placeholder شود، بدون نیاز به
 * تغییر در منطق احراز هویت / بررسی اشتراک / مسیر بازگشت که از قبل
 * پیاده‌سازی و تست شده‌اند.
 *
 * دیتای کارت (cardData) و تابع ذخیره‌سازی (handleSave) از همین‌جا فراهم
 * شده تا ادیتور آینده مستقیماً به آن‌ها وصل شود.
 */
export default function ProEditorPage({ user, subscription }: ProEditorPageProps) {
  const navigate = useNavigate();

  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.username]);

  const fetchCard = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await apiFetch(`/api/user/card/${user.username}`);
      if (res.ok) {
        const data = await res.json();
        setCardData(data);
      } else {
        setErrorMsg("خطا در دریافت اطلاعات کارت ویزیت.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("خطای اتصال به سرور.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cardData) return;
    setSaveLoading(true);
    setFeedback("");
    try {
      const res = await apiFetch(`/api/user/card/${user.username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData),
      });
      if (res.ok) {
        setFeedback("تغییرات با موفقیت ذخیره شد! 🎉");
        setTimeout(() => setFeedback(""), 4000);
      } else {
        setFeedback("خطا در ذخیره‌سازی اطلاعات کارت.");
      }
    } catch (e) {
      setFeedback("عدم دسترسی به پایگاه داده.");
    } finally {
      setSaveLoading(false);
    }
  };

  const goBackToNormalEditor = () => navigate(`/dashboard/${user.username}/design`);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-100 flex flex-col text-right" dir="rtl">
      {/* ─── هدر مینی‌اپ ─────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-200/80 shadow-sm px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Kartet" className="h-9 w-auto object-contain" />
          <div className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold">
            <Crown className="w-3.5 h-3.5" />
            <span>ادیتور پرو</span>
          </div>
          {subscription?.remainingDays ? (
            <span className="hidden md:inline text-[10px] font-bold text-slate-400">
              {subscription.remainingDays} روز تا پایان اشتراک
            </span>
          ) : null}
        </div>

        <button
          onClick={goBackToNormalEditor}
          className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          بازگشت به ادیتور عادی
        </button>
      </header>

      {/* ─── بدنه اصلی مینی‌اپ ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="min-h-full flex flex-col items-center justify-center py-24">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm text-slate-600 font-bold">در حال بارگذاری ادیتور پرو...</p>
          </div>
        ) : errorMsg ? (
          <div className="min-h-full flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
              <Info className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">خطا در بارگذاری</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">{errorMsg}</p>
            <button
              onClick={fetchCard}
              className="mt-6 py-2 px-5 rounded-lg bg-blue-600 text-white font-bold text-xs"
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 items-start">
            {/* محل ویرایشگر پرو — بعداً اینجا جایگزین می‌شود */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    ویرایشگر پیشرفته کارت (پرو)
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    این بخش، مینی‌اپ اختصاصی ویرایشگر پرو است و به‌زودی امکانات
                    کامل طراحی حرفه‌ای کارت در همین‌جا اضافه می‌شود.
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/10 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saveLoading ? "درحال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </div>

              {feedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold">
                  {feedback}
                </div>
              )}

              {/* ─── Placeholder برای تب ویرایشگر کارت پرو ─────────────────
                  TODO: کامپوننت ویرایشگر پرو نهایی را اینجا جایگزین این
                  باکس کنید. cardData / setCardData / handleSave از قبل
                  آماده و متصل به API ذخیره کارت هستند. */}
              <div className="rounded-2xl bg-white border-2 border-dashed border-blue-200 p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[420px]">
                <Crown className="w-10 h-10 text-amber-400" />
                <h3 className="font-extrabold text-slate-700 text-sm">
                  ویرایشگر کارت پرو به‌زودی اینجا قرار می‌گیرد
                </h3>
                <p className="text-xs text-slate-400 font-semibold max-w-sm">
                  دسترسی شما به این بخش تأیید شده است. اطلاعات کارت شما با
                  موفقیت بارگذاری شد و آماده اتصال به ویرایشگر جدید است.
                </p>
              </div>
            </div>

            {/* پیش‌نمایش زنده کارت — کنار ویرایشگر */}
            {cardData && (
              <div className="hidden xl:block sticky top-8">
                <IPhoneMockup data={cardData} username={user.username} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
