/**
 * کش ساده و سبک در حافظه (بدون هیچ وابستگی خارجی) برای HTML رندرشده‌ی هر
 * کاربر. چون محتوای کارت به‌ندرت تغییر می‌کند، هر ۶۰ ثانیه یک‌بار تازه‌سازی
 * می‌شود تا فشار روی دیتابیس زیر بار زیاد کم شود.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** برای وقتی که کاربر کارتش را ویرایش می‌کند و باید بلافاصله رفرش شود */
  invalidate(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
