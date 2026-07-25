import React from "react";
import { Crown, X, Check, CreditCard, Wallet } from "lucide-react";
import { User } from "../types";
import { apiFetch } from "../utils/api";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  /** بعد از ثبت موفق درخواست (رسید کارت‌به‌کارت)، برای بروزرسانی وضعیت اشتراک صدا زده می‌شود */
  onPurchased?: () => void;
}

type Step = "intro" | "plans" | "payment-method" | "card-payment";
type PlanCode = "3months" | "6months" | "12months";

const PLAN_META: Record<PlanCode, { label: string; amount: number }> = {
  "3months": { label: "سه ماهه", amount: 890000 },
  "6months": { label: "شش ماهه", amount: 1590000 },
  "12months": { label: "یک ساله", amount: 2790000 },
};

/**
 * مودال مشترک خرید/تمدید اشتراک پرو.
 * این کامپوننت جای هر جای برنامه (تب آمار، تب طراحی، ریدایرکت از ادیتور پرو)
 * فقط با isOpen/onClose کنترل می‌شود و مستقل از تب فعال کار می‌کند —
 * بنابراین با کلیک روی دکمه خرید/تمدید، بلافاصله و در همان صفحه باز می‌شود.
 */
export default function SubscriptionModal({
  isOpen,
  onClose,
  user,
  onPurchased,
}: SubscriptionModalProps) {
  const [step, setStep] = React.useState<Step>("intro");
  const [selectedPlan, setSelectedPlan] = React.useState<PlanCode | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"zarinpal" | "card" | null>(null);
  const [receiptImage, setReceiptImage] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // هر بار مودال از نو باز می‌شود، از مرحله معرفی شروع شود
  React.useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setSelectedPlan(null);
      setPaymentMethod(null);
      setReceiptImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedAmount = selectedPlan ? PLAN_META[selectedPlan].amount : 0;

  const handleSubmitReceipt = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("plan", selectedPlan);
      formData.append("amount", String(selectedAmount));
      if (receiptImage) formData.append("receipt", receiptImage);

      const res = await apiFetch("/api/payment/card-to-card", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "خطا در ثبت درخواست.");
        return;
      }

      alert("درخواست شما ثبت شد و پس از بررسی فعال خواهد شد.");
      onPurchased?.();
      onClose();
    } catch (e) {
      console.error(e);
      alert("خطا در اتصال به سرور.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ─── مرحله ۱: معرفی پلن پرو ─────────────────────────────────────── */}
      {step === "intro" && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative text-right">
            <button
              onClick={onClose}
              className="absolute top-3 left-3 text-gray-400 hover:text-red-500 text-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold">اشتراک حرفه‌ای (پرو)</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                با فعال‌سازی اشتراک پرو، به ادیتور اختصاصی و پیشرفته کارت
                ویزیت دسترسی پیدا می‌کنید و امکانات حرفه‌ای طراحی برای شما باز
                می‌شود.
              </p>
            </div>

            <ul className="space-y-2.5 mb-6">
              {[
                "دسترسی کامل به ادیتور پیشرفته کارت (پرو)",
                "قالب‌ها و امکانات طراحی اختصاصی",
                "پشتیبانی و بروزرسانی‌های آینده",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setStep("plans")}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white p-3 font-bold hover:brightness-105 transition"
            >
              خرید اشتراک پرو
            </button>
          </div>
        </div>
      )}

      {/* ─── مرحله ۲: انتخاب پلن ────────────────────────────────────────── */}
      {step === "plans" && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative text-right">
            <button
              onClick={onClose}
              className="absolute top-3 left-3 text-gray-400 hover:text-red-500 text-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-center mb-2">اشتراک حرفه‌ای</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              یکی از پلن‌های زیر را انتخاب کنید.
            </p>

            <div className="space-y-3">
              {(Object.keys(PLAN_META) as PlanCode[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedPlan(code)}
                  className={`w-full rounded-xl border p-3 transition flex items-center justify-between ${
                    selectedPlan === code
                      ? "border-blue-600 bg-blue-50"
                      : "hover:border-blue-500"
                  }`}
                >
                  <span>{PLAN_META[code].label}</span>
                  <span className="text-xs text-gray-500 font-mono">
                    {PLAN_META[code].amount.toLocaleString()} تومان
                  </span>
                </button>
              ))}

              <button
                disabled={!selectedPlan}
                onClick={() => setStep("payment-method")}
                className="w-full mt-5 rounded-xl bg-blue-600 text-white p-3 font-bold disabled:opacity-50"
              >
                ادامه و پرداخت
              </button>

              <button
                onClick={() => setStep("intro")}
                className="w-full rounded-xl bg-gray-100 text-gray-600 p-2.5 text-xs font-bold"
              >
                بازگشت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── مرحله ۳: انتخاب روش پرداخت ─────────────────────────────────── */}
      {step === "payment-method" && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 text-right">
            <h2 className="text-xl font-bold text-center mb-5">
              انتخاب روش پرداخت
            </h2>

            <button
              onClick={() => setPaymentMethod("zarinpal")}
              className={`w-full border rounded-xl p-4 mb-3 flex items-center gap-2 transition ${
                paymentMethod === "zarinpal" ? "border-blue-600 bg-blue-50" : ""
              }`}
            >
              <Wallet className="w-4 h-4" />
              پرداخت آنلاین (زرین پال)
            </button>

            <button
              onClick={() => setPaymentMethod("card")}
              className={`w-full border rounded-xl p-4 mb-5 flex items-center gap-2 transition ${
                paymentMethod === "card" ? "border-blue-600 bg-blue-50" : ""
              }`}
            >
              <CreditCard className="w-4 h-4" />
              کارت به کارت
            </button>

            <button
              disabled={!paymentMethod}
              onClick={() => {
                if (paymentMethod === "card") setStep("card-payment");
                if (paymentMethod === "zarinpal") {
                  alert("درگاه پرداخت آنلاین به‌زودی فعال می‌شود. لطفا از روش کارت به کارت استفاده کنید.");
                }
              }}
              className="w-full bg-blue-600 text-white rounded-xl p-3 mb-3 disabled:opacity-50"
            >
              ادامه
            </button>

            <button
              onClick={() => setStep("plans")}
              className="w-full bg-gray-200 rounded-xl p-3"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* ─── مرحله ۴: پرداخت کارت به کارت و آپلود رسید ──────────────────── */}
      {step === "card-payment" && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 text-right">
            <h2 className="text-2xl font-bold text-center mb-2">
              پرداخت کارت به کارت
            </h2>
            <p className="text-gray-500 text-center mb-6">
              مبلغ را به کارت زیر واریز کرده و سپس رسید را ارسال کنید.
            </p>

            <div className="rounded-xl border p-4 mb-4">
              <div className="text-sm text-gray-500">مبلغ قابل پرداخت</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                {selectedAmount.toLocaleString()} تومان
              </div>
            </div>

            <div className="rounded-xl border p-4 mb-3">
              <div className="text-sm text-gray-500 mb-2">شماره کارت</div>
              <div className="font-bold text-lg">6037-9918-1234-5678</div>
            </div>

            <div className="rounded-xl border p-4 mb-5">
              <div className="text-sm text-gray-500">صاحب حساب</div>
              <div className="font-bold">طاها خورسند</div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium mb-2">
                رسید پرداخت
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptImage(e.target.files?.[0] || null)}
                className="w-full rounded-lg border p-2"
              />
            </div>

            <button
              onClick={handleSubmitReceipt}
              disabled={submitting}
              className="w-full bg-green-600 text-white rounded-xl p-3 mb-3 mt-5 disabled:opacity-50"
            >
              {submitting ? "در حال ثبت..." : "ثبت رسید"}
            </button>

            <button
              onClick={() => setStep("payment-method")}
              className="w-full bg-gray-200 rounded-xl p-3"
            >
              بازگشت
            </button>
          </div>
        </div>
      )}
    </>
  );
}
