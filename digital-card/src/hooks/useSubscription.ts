import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

/**
 * ساختار پاسخ سرور برای وضعیت اشتراک کاربر
 * (مطابق با خروجی /api/subscription در server.ts)
 */
export interface SubscriptionInfo {
  plan: string;
  status: string; // 'free' | 'active' | ...
  startDate?: string | null;
  expireDate?: string | null;
  remainingDays: number;
}

interface UseSubscriptionResult {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  error: string;
  /** آیا کاربر هم‌اکنون اشتراک پرو فعال و معتبر (تمام‌نشده) دارد */
  isPro: boolean;
  refetch: () => Promise<void>;
}

/**
 * هوک مرکزی وضعیت اشتراک کاربر.
 * این هوک تنها منبع حقیقت (single source of truth) برای «آیا کاربر پرو است؟»
 * در کل برنامه است تا منطق تشخیص پرو بودن در چند جای مختلف تکرار/ناهماهنگ نشود.
 */
export function useSubscription(enabled: boolean = true): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSubscription = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      } else {
        setError("خطا در دریافت وضعیت اشتراک از سرور.");
      }
    } catch (e) {
      console.error("useSubscription error:", e);
      setError("خطای شبکه در دریافت وضعیت اشتراک.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPro =
    !!subscription &&
    subscription.status === "active" &&
    subscription.plan !== "free" &&
    subscription.remainingDays > 0;

  return { subscription, loading, error, isPro, refetch: fetchSubscription };
}
