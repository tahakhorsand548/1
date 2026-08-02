/**
 * تایپ‌های مربوط به رندر ظاهری کارت — این‌ها تنها چیزی هستند که CardPreview.tsx
 * و MinimalistCard.tsx به آن نیاز دارند. تایپ‌های دیگر پروژه (User، Ticket، ...)
 * اینجا نیستند و در digital-card/src/types.ts باقی می‌مانند.
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
  [key: string]: number;
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
