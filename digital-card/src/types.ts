/**
 * Shared Type Definitions (مخصوص خود پروژه digital-card)
 *
 * توجه: تایپ‌های مربوط به ظاهر کارت (CardData و زیرمجموعه‌هایش) دیگر اینجا
 * تعریف نمی‌شوند — از پکیج مشترک @youkart/card-components می‌آیند تا با
 * چیزی که card-server هم استفاده می‌کند همیشه یکی باشند. اینجا فقط دوباره
 * export می‌شوند تا importهای قبلی («import { CardData } from './types'»)
 * در سراسر پروژه بدون تغییر کار کنند.
 */
export type {
  CardData,
  CardDesign,
  CardStats,
  StatBucket,
  Branch,
  BusinessProduct,
  WorkingDay,
  WorkingDays,
} from "@youkart/card-components";

import type { CardData } from "@youkart/card-components";

export interface User {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  isSuspended: boolean;
  qrRequestStatus: 'none' | 'pending' | 'approved';
  qrImageUrl: string;
  cardData?: CardData;
}

export interface TicketMessage {
  id: string;
  sender: 'user' | 'support';
  message: string;
  createdAt: string;
  /** زمان دقیق پیام به‌صورت epoch ms (برای مرتب‌سازی/محاسبه خوانده‌نشده) */
  ts?: number;
  /** آدرس تصویر پیوست‌شده — فقط ادمین می‌تواند این را ارسال کند */
  attachment?: string;
}

export interface Ticket {
  id: string;
  username: string;
  userFullName: string;
  title: string;
  description: string;
  status: 'read' | 'under_review' | 'ended';
  createdAt: string;
  messages: TicketMessage[];
  /** زمان آخرین پیام (ISO) — مبنای مرتب‌سازی تیکت‌ها مثل یک پیام‌رسان */
  lastMessageAt?: string;
  /** آخرین باری که ادمین این تیکت را باز/مشاهده کرده (ISO) */
  adminLastReadAt?: string;
}

export interface GlobalAnnouncement {
  id: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
}

export interface AdvertisingBanner {
  id: string;
  imageUrl: string;
  title: string;
  link?: string;
  /** فقط برای اسلات ویدیوی آموزشی (id === 'training_video') استفاده می‌شود */
  videoUrl?: string;
}
