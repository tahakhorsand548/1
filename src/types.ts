/**
 * Shared Type Definitions
 */

export interface Branch {
  id: string;
  title: string;
  address: string;
  googleMaps: string;
  neshan: string;
  balad: string;
}

export interface BusinessProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  link: string;
  imageUrl: string;
}

export interface WorkingDay {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface WorkingDays {
  [key: string]: WorkingDay;
}

export interface CardDesign {
  template: 'classic' | 'modern' | 'minimalist' | 'glass';
  colorTheme: string;
  isDark: boolean;
}

export interface StatBucket {
  visits: number;
  scans: number;
  linkOpens: number;
  buttonClicks: number;
}

export interface CardStats {
  totalVisits: number;
  scans: number;
  linkOpens: number;
  buttonClicks: number;
  dailyVisits: { [date: string]: number };
  /** تاریخچه روزانه هر ۴ متریک، کلید به شکل ISO یعنی YYYY-MM-DD (برای نمودار جدید) */
  dailyStats?: { [isoDate: string]: StatBucket };
  /** تاریخچه ساعتی هر ۴ متریک، کلید به شکل ISO یعنی YYYY-MM-DDTHH (برای بازه ۲۴ ساعت) */
  hourlyStats?: { [isoHour: string]: StatBucket };
}

export interface CardData {
  businessName: string;
  brandManager: string;
  slogan: string;
  description: string;
  logoUrl: string;
  bgImageUrl: string;
  phones: string[];
  landlines: string[];
  branches: Branch[];
  website: string;
  socials: {
    instagram: string;
    telegram: string;
    whatsapp: string;
    youtube: string;
    aparat: string;
    bale: string;
    rubika: string;
    soroush: string;
  };
  gallery: string[];
  products: BusinessProduct[];
  workingDays: WorkingDays;
  design: CardDesign;
  stats: CardStats;
}

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
}
