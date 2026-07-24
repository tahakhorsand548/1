import React, { useState, useEffect, useRef } from "react";
import {
  Phone, Globe, MapPin, MessageSquare, Clock, Moon, Sun,
  Instagram, Send, Play, Youtube, CheckCircle2, AlertCircle,
  Store, Image as ImageIcon
} from "lucide-react";
import { CardData } from "../types";
import { apiFetch } from "../utils/api";
import baladIcon from './img card/logos/images.png';
import nashanIcon from './img card/logos/images (1).png';
import googlemapIcon from './img card/logos/google map.png';
import instagramLogo from "./img card/logos/instagram.png";
import telegramLogo from "./img card/logos/Telegram.webp";
import whatsappLogo from "./img card/logos/whatsapp.webp";
import rubikaLogo from "./img card/logos/rubika.png";
import soroushLogo from "./img card/logos/Soroush.png";
import baleLogo from "./img card/logos/bale.png";
import youtubeLogo from "./img card/logos/Youtube.png";
import aparatLogo from "./img card/logos/aparat.jpg";
interface CardPreviewProps {
  data: CardData;
  username: string;
  isPreview?: boolean;
}

export default function CardPreview({ data, username, isPreview = false }: CardPreviewProps) {
  const {
    businessName,
    brandManager,
    slogan,
    description,
    logoUrl,
    bgImageUrl,
    phones,
    landlines,
    branches,
    website,
    socials,
    gallery,
    products,
    workingDays,
    design
  } = data;

  const themeHex = design?.colorTheme || "#3B82F6";
  const template = design?.template || "modern";
  
  // State for Dark Mode
  const [localIsDark, setLocalIsDark] = useState(design?.isDark ?? false);

  // Sync with panel if changed from admin
  useEffect(() => {
    setLocalIsDark(design?.isDark ?? false);
  }, [design?.isDark]);

  // A completely isolated mode function that bypasses Tailwind's global "dark:" variants
  // This guarantees the toggle works perfectly even if the parent app has <body class="dark">
  const mode = (lightClass: string, darkClass: string) => {
    return localIsDark ? darkClass : lightClass;
  };

  const galleryRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);

  // Infinite Scroll Arrays (Duplicated 50 times to create a real infinite feel without jumping)
  const infiniteGallery = gallery && gallery.length > 0 ? Array(50).fill(gallery).flat() : [];
  const infiniteProducts = products && products.length > 0 ? Array(50).fill(products).flat() : [];

  // Smooth Auto-scroll for Gallery
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    if (infiniteGallery.length > 1) {
      scrollInterval = setInterval(() => {
        if (galleryRef.current) {
          galleryRef.current.scrollBy({ left: -250, behavior: 'smooth' });
        }
      }, 3500);
    }
    return () => clearInterval(scrollInterval);
  }, [infiniteGallery.length]);

  // Smooth Auto-scroll for Products
  useEffect(() => {
    let scrollInterval: NodeJS.Timeout;
    if (infiniteProducts.length > 1) {
      scrollInterval = setInterval(() => {
        if (productsRef.current) {
          productsRef.current.scrollBy({ left: -200, behavior: 'smooth' });
        }
      }, 3000);
    }
    return () => clearInterval(scrollInterval);
  }, [infiniteProducts.length]);

  // Click Tracker for Live Cards
  const handleInteraction = async (type: string, url?: string) => {
    if (isPreview) return;
    try {
      await apiFetch(`/api/card/${username}/click`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    if (url) {
      window.open(url, "_blank");
    }
  };

    const formatPrice = (price?: string | number | null) => {
    if (price === undefined || price === null || price === "") return null;
    const digits = String(price).replace(/[^\d]/g, "");
    if (!digits) return null;
    return Number(digits).toLocaleString("en-US");
  };

  const getDayStatus = () => {
    const daysWeek = ["جمعه", "شنبه", "یکشنبه", "دوشنبه", "سه شنبه", "چهارشنبه", "پنجشنبه"];
    const todayStr = daysWeek[new Date().getDay()];
    const todaySchedule = workingDays?.[todayStr];

    if (!todaySchedule || !todaySchedule.isOpen || todaySchedule.isClosed) {
      return { 
        text: "تعطیل", 
        fullText: "امروز تعطیل است", 
        bg: mode("bg-red-100 text-red-900", "bg-red-900/40 text-red-100"), 
        dot: "bg-red-500" 
      };
    }
    return { 
      text: "باز", 
      fullText: `باز است (ساعت کاری: ${todaySchedule.openTime} الی ${todaySchedule.closeTime})`, 
      bg: mode("bg-[#86efac] text-green-900", "bg-green-900/40 text-green-100"), 
      dot: mode("bg-green-700", "bg-green-400")
    };
  };

  const dayStatus = getDayStatus();

  // ==========================================
  // ONLY render this advanced UI for "modern" template
  // ==========================================
  if (template === "modern") {
    return (
      <div className="card-preview-scope">
        <div
          className={`max-w-md mx-auto min-h-screen relative overflow-hidden shadow-2xl transition-colors duration-300 font-sans template-modern ${mode("bg-[#fafaff] text-gray-800", "bg-[#0f172a] text-gray-200")}`}
          style={{ direction: "rtl" }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .glass-icon { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 15px rgba(124, 58, 237, 0.2); }
            .insta-gradient { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
            .carousel-item { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
            .shadow-soft { box-shadow: 0 4px 20px -2px rgba(124, 58, 237, 0.08); }
            .shadow-card { box-shadow: 0 8px 30px -5px rgba(0, 0, 0, 0.05); }
          `}} />

          {/* Header Section */}
          <header className="relative pt-4 pb-6 px-4 shadow-sm min-h-[350px] overflow-hidden">
            {bgImageUrl ? (
              <img src={bgImageUrl} alt="پس‌زمینه" className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity z-0 ${mode("opacity-50", "opacity-30")}`} referrerPolicy="no-referrer" />
            ) : (
              <div className={`absolute inset-0 w-full h-full transition-opacity z-0 ${mode("bg-gray-200 opacity-50", "bg-gray-800 opacity-30")}`}></div>
            )}
            <div className={`absolute inset-0 transition-colors z-0 ${mode("bg-white/30", "bg-black/40")}`}></div>
            <div className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent z-0 transition-colors duration-300 ${mode("from-[#fafaff]", "from-[#0f172a]")}`}></div>

            {/* Dark Mode Toggle */}
            <div className="flex justify-end items-center relative z-10">
              <button 
                onClick={() => setLocalIsDark(!localIsDark)}
                className={`w-9 h-9 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform ${mode("bg-white/70 text-gray-700", "bg-gray-800/70 text-gray-300")}`}
              >
                {localIsDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex flex-col items-center mt-2 relative z-10">
              {/* Logo - Removed Background and Border entirely */}
            <div className="w-24 h-24 mt-4 mb-1 flex items-center justify-center overflow-hidden">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="لوگو"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

              <h1 className={`text-3xl text-center font-extrabold mb-1 drop-shadow-md ${mode("text-gray-900", "text-white")}`}>
                {businessName || "نام کسب و کار شما"}
              </h1>

              {brandManager && (
                <p className={`text-xs mb-4 flex items-center gap-1 font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-sm transition-colors ${mode("text-gray-700 bg-white/60", "text-gray-200 bg-gray-800/60")}`}>
                  مدیریت: <span style={{ color: themeHex }}>{brandManager}</span>
                </p>
              )}

              <div className="text-center px-3 space-y-2 mt-2 drop-shadow-md">
                {slogan && (
                  <p className="font-extrabold text-[13px]" style={{ color: themeHex }}>"{slogan}"</p>
                )}
                {description && (
                  <p className={`text-xs leading-relaxed font-bold ${mode("text-gray-800", "text-gray-300")}`}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="px-4 py-4 space-y-6 relative z-10">
            
            {/* Contact Info Card */}
            <section className={`rounded-[28px] p-5 shadow-soft border transition-colors ${mode("bg-white border-purple-50/50", "bg-[#1e293b] border-gray-700/50")}`}>
              <div className="flex flex-col space-y-2.5">
                
                {/* Landlines Grouped in ONE box */}
                {landlines && landlines.filter(Boolean).length > 0 && (
                  <div className={`flex justify-between items-center p-2.5 rounded-2xl transition-colors ${mode("bg-gray-50", "bg-gray-800")}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl glass-icon flex items-center justify-center text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${themeHex}cc 0%, ${themeHex}e6 100%)` }}>
                        <Phone className="w-[11px]" />
                      </div>
                      <span className={`text-xs font-bold ${mode("text-gray-700", "text-gray-300")}`}>تلفن ثابت</span>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      {landlines.filter(Boolean).map((l, idx) => (
                        <button
                          key={`landline-${idx}`}
                          onClick={() => handleInteraction("landline", `tel:${l}`)}
                          className={`text-xs font-bold tracking-wider hover:text-blue-600 transition-colors text-right ${mode("text-gray-800", "text-gray-200")}`}
                          dir="ltr"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phones Grouped in ONE box */}
                {phones && phones.filter(Boolean).length > 0 && (
                  <div className={`flex justify-between items-center p-2.5 rounded-2xl transition-colors ${mode("bg-gray-50", "bg-gray-800")}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl glass-icon flex items-center justify-center text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${themeHex}cc 0%, ${themeHex}e6 100%)` }}>
                        <Phone className="w-[11px]" />
                      </div>
                      <span className={`text-xs font-bold ${mode("text-gray-700", "text-gray-300")}`}>شماره موبایل</span>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      {phones.filter(Boolean).map((p, idx) => (
                        <button
                          key={`phone-${idx}`}
                          onClick={() => handleInteraction("phone", `tel:${p}`)}
                          className={`text-xs font-bold tracking-wider hover:text-blue-600 transition-colors text-right ${mode("text-gray-800", "text-gray-200")}`}
                          dir="ltr"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {website && (
                <>
                  <hr className={`opacity-60 mt-4 mb-3 transition-colors ${mode("border-gray-100", "border-gray-700")}`} />
                  <button
                    onClick={() => handleInteraction("website", website)}
                    className="w-full text-white rounded-2xl py-3 flex justify-center items-center gap-2 text-[13px] font-bold transition-colors shadow-md hover:brightness-110"
                    style={{ backgroundColor: themeHex }}
                  >
                    <Globe className="w-4 h-4" />
                    بازدید از سایت
                  </button>
                </>
              )}
            </section>

            {/* Branch Section */}
            {branches && branches.length > 0 && (
              <section className={`rounded-[28px] p-5 shadow-soft border flex flex-col items-center transition-colors ${mode("bg-white border-purple-50/50", "bg-[#1e293b] border-gray-700/50")}`}>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4" style={{ color: themeHex }} />
                  <h2 className={`font-bold text-sm ${mode("text-gray-800", "text-white")}`}>آدرس شعب ما</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar w-full snap-x pb-2">
                  {branches.map((b, idx) => (
                    <div key={`branch-${idx}`} className={`carousel-item opacity-100 scale-100 snap-center shrink-0 w-[85%] rounded-2xl p-4 border flex flex-col items-center transition-colors ${mode("bg-gray-50 border-gray-100", "bg-gray-800 border-gray-700")}`}>
                      <h3 className="font-bold text-sm mb-2" style={{ color: themeHex }}>{b.title || "شعبه اصلی"}</h3>
                      <p className={`text-[11px] mb-5 text-center leading-relaxed ${mode("text-gray-500", "text-gray-400")}`}>
                        {b.address || "آدرس ثبت نشده است"}
                      </p>
                      <div className="flex justify-center gap-3 w-full">
                        {b.balad && (
                      <button onClick={() => handleInteraction("balad", b.balad)} className="flex flex-1 justify-center">
                          <div className={`w-17 h-17 rounded-xl shadow-card flex flex-col items-center justify-center gap-1 transition-colors overflow-hidden ${mode("bg-white hover:bg-gray-50", "bg-gray-700 hover:bg-gray-600")}`}>
                            <img 
                              src={baladIcon} 
                              alt="بلد" 
                              className="w-10 h-10 object-contain p-1" // سایز رو به 40px محدود کردیم و با p-1 فاصله دادیم
                            />
                            <span className={`text-[10px] font-medium ${mode("text-gray-600", "text-gray-300")}`}>بلد</span>
                          </div>
                      </button>
                        )}
                        {b.neshan && (
                          <button onClick={() => handleInteraction("neshan", b.neshan)} className="flex flex-1 justify-center">
                            <div className={`w-17 h-17 rounded-xl shadow-card flex flex-col items-center justify-center gap-2 transition-colors ${mode("bg-white hover:bg-gray-50", "bg-gray-700 hover:bg-gray-600")}`}>
                            <img 
                              src={nashanIcon} 
                              alt="نشان" 
                              className="w-10 h-10 object-contain p-1" // سایز رو به 40px محدود کردیم و با p-1 فاصله دادیم
                            />
                              <span className={`text-[10px] font-medium ${mode("text-gray-600", "text-gray-300")}`}>نشان</span>
                            </div>
                          </button>
                        )}
                        {b.googleMaps && (
                          <button onClick={() => handleInteraction("googleMaps", b.googleMaps)} className="flex flex-1 justify-center">
                            <div className={`w-17 h-17 rounded-xl shadow-card flex flex-col items-center justify-center gap-2 transition-colors ${mode("bg-white hover:bg-gray-50", "bg-gray-700 hover:bg-gray-600")}`}>
                            <img 
                              src={googlemapIcon} 
                              alt="گوگل مپ" 
                              className="w-10 h-10 object-contain p-1" // سایز رو به 40px محدود کردیم و با p-1 فاصله دادیم
                            />
                              <span className={`text-[10px] font-medium ${mode("text-gray-600", "text-gray-300")}`}>گوگل مپ</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Social Media Section */}
            {socials && Object.keys(socials).length > 0 && (
              <section className={`rounded-[28px] p-5 shadow-soft border flex flex-col items-center transition-colors ${mode("bg-white border-purple-50/50", "bg-[#1e293b] border-gray-700/50")}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeHex }}></div>
                  <h2 className={`font-bold text-sm ${mode("text-gray-800", "text-white")}`}>ما را در شبکه‌های اجتماعی دنبال کنید</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar w-full px-2 snap-x py-2 justify-center">
                  {Object.entries(socials).map(([key, val]) => {
                    if (!val) return null;
                    let iconComp = <Globe className="w-5 h-5 text-white" />;
                    let title = key;
                    let btnClass = "bg-gray-800 text-white";

                    if (key === "instagram") {
                      iconComp = <img src={instagramLogo} alt="Instagram" className="w-6 h-6 object-contain" />;
                      title = "اینستاگرام";
                      btnClass = "bg-white";
                    }
                    else if (key === "telegram") {
                      iconComp = <img src={telegramLogo} alt="Telegram" className="w-6 h-6 object-contain" />;
                      title = "تلگرام";
                      btnClass = "bg-white";
                    }
                    else if (key === "whatsapp") {
                      iconComp = <img src={whatsappLogo} alt="WhatsApp" className="w-6 h-6 object-contain" />;
                      title = "واتساپ";
                      btnClass = "bg-white";
                    }
                    else if (key === "rubika") {
                      iconComp = <img src={rubikaLogo} alt="Rubika" className="w-6 h-6 object-contain" />;
                      title = "روبیکا";
                      btnClass = "bg-white";
                    }
                    else if (key === "soroush") {
                      iconComp = <img src={soroushLogo} alt="Soroush" className="w-6 h-6 object-contain" />;
                      title = "سروش";
                      btnClass = "bg-white";
                    }
                    else if (key === "bale") {
                      iconComp = <img src={baleLogo} alt="Bale" className="w-6 h-6 object-contain" />;
                      title = "بله";
                      btnClass = "bg-white";
                    }
                    else if (key === "youtube") {
                      iconComp = <img src={youtubeLogo} alt="YouTube" className="w-6 h-6 object-contain" />;
                      title = "یوتیوب";
                      btnClass = "bg-white";
                    }
                    else if (key === "aparat") {
                      iconComp = <img src={aparatLogo} alt="Aparat" className="w-6 h-6 object-contain" />;
                      title = "آپارات";
                      btnClass = "bg-white";
                    }

                    return (
                      <button
                        key={key}
                        onClick={() => handleInteraction(key, val)}
                        className="flex flex-col items-center gap-2 snap-center shrink-0 group"
                      >
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ${btnClass}`}>
                          {iconComp}
                        </div>
                        <span className={`text-[9px] font-medium ${mode("text-gray-600", "text-gray-300")}`}>{title}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}


            {/* Products Section - Infinite loop */}
              {infiniteProducts.length > 0 && (
                <section className={`rounded-[28px] p-5 shadow-soft border flex flex-col items-center transition-colors ${mode("bg-white border-purple-50/50", "bg-[#1e293b] border-gray-700/50")}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Store className="w-4 h-4" style={{ color: themeHex }} />
                    <h2 className={`font-bold text-sm ${mode("text-gray-800", "text-white")}`}>خدمات و محصولات ما</h2>
                  </div>
                  <p className={`text-[11px] mb-5 ${mode("text-gray-500", "text-gray-400")}`}>جدیدترین و بهترین خدمات منتخب ما</p>

                  <div ref={productsRef} className="flex gap-4 overflow-x-auto hide-scrollbar w-full snap-x pb-4">
                    {infiniteProducts.map((p, idx) => (
                      <button
                        key={`prod-${idx}`}
                        onClick={() => p.link && handleInteraction("product", p.link)}
                        className={`carousel-item opacity-100 scale-100 rounded-2xl shadow-card p-2 flex flex-col items-center snap-center shrink-0 w-44 border transition-colors hover:scale-95 duration-300 text-right ${mode("bg-white border-gray-100", "bg-gray-800 border-gray-700")}`}
                      >
                        <div className={`w-full h-32 rounded-xl overflow-hidden mb-3 relative ${mode("bg-gray-50", "bg-gray-900")}`}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">بدون تصویر</div>
                          )}
                        </div>
                        <h3 className={`text-[11px] font-bold mb-1 w-full truncate text-center ${mode("text-gray-800", "text-gray-100")}`}>{p.title}</h3>
                        <p className={`text-[9px] text-center mb-2 line-clamp-2 px-1 w-full ${mode("text-gray-400", "text-gray-500")}`}>{p.description}</p>

                        {/* Price Logic: if empty show nothing, if number show formatted number + تومان */}
                        {formatPrice(p.price) && (
                          <p className="font-bold text-[13px] mt-auto" style={{ color: themeHex }} dir="ltr">
                            {formatPrice(p.price)} تومان
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}

            {/* Image Gallery Section - Infinite loop */}
            {infiniteGallery.length > 0 && (
              <section className={`rounded-[28px] p-5 shadow-soft border flex flex-col items-center transition-colors ${mode("bg-white border-purple-50/50", "bg-[#1e293b] border-gray-700/50")}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="w-4 h-4" style={{ color: themeHex }} />
                  <h2 className={`font-bold text-sm ${mode("text-gray-800", "text-white")}`}>گالری تصاویر</h2>
                </div>
                <p className={`text-[11px] mb-5 ${mode("text-gray-500", "text-gray-400")}`}>لحظاتی از استایل، کیفیت و رضایت مشتریان ما</p>

                <div ref={galleryRef} className="flex gap-3 overflow-x-auto hide-scrollbar w-full snap-x pb-2">
                  {infiniteGallery.map((imgUrl, idx) => (
                    <div key={`gallery-${idx}`} className="carousel-item opacity-100 scale-100 shrink-0 w-[75%] h-40 rounded-2xl overflow-hidden snap-center shadow-md relative">
                      <img src={imgUrl} className="w-full h-full object-cover" alt={`گالری ${idx + 1}`} referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Working Hours Section */}
            {workingDays && (
              <section className="flex flex-col items-center pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4" style={{ color: themeHex }} />
                  <h2 className={`font-bold text-sm ${mode("text-gray-800", "text-white")}`}>ساعات کاری</h2>
                </div>

                <div className={`w-full rounded-[28px] p-5 shadow-soft border transition-colors ${mode("bg-white border-purple-50/50", "bg-[#1e293b] border-gray-700/50")}`}>
                  <div className={`flex flex-col space-y-3 text-[13px] font-medium ${mode("text-gray-600", "text-gray-300")}`}>
                    {Object.entries(workingDays).map(([day, val]) => (
                      <div key={day} className={`flex justify-between items-center border-b pb-2 transition-colors last:border-0 last:pb-0 ${mode("border-gray-50", "border-gray-800")}`}>
                        <span className="w-16">{day}</span>
                        <span dir="ltr" className={mode("text-gray-500", "text-gray-400")}>
                          {val.isOpen && !val.isClosed ? `${val.openTime} - ${val.closeTime}` : "تعطیل"}
                        </span>
                        {val.isOpen && !val.isClosed ? (
                          <span className={`px-3 py-0.5 rounded-full text-[10px] ${mode("bg-green-100 text-green-600", "bg-green-900/40 text-green-400")}`}>باز</span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${mode("bg-red-100 text-red-500", "bg-red-900/40 text-red-400")}`}>تعطیل</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Bottom Status */}
            <div
              className="w-full rounded-full p-1.5 flex justify-between items-center shadow-md mb-8 mt-4 transition-colors"
              style={{ backgroundColor: themeHex }}
            >
              <div className={`px-4 py-2 rounded-full text-[11px] font-bold flex items-center gap-2 shadow-sm ${dayStatus.bg}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${dayStatus.dot}`}></div>
                وضعیت: {dayStatus.text}
              </div>
              <span className={`text-xs font-bold pl-4 ${mode("text-white", "text-gray-200")}`}>
                {dayStatus.text === "تعطیل" ? "هم‌اکنون فروشگاه تعطیل است" : "هم‌اکنون فروشگاه باز است"}
              </span>
            </div>

          </main>

          <footer className="mt-12 w-full text-center px-4 pb-4 space-y-2 select-none relative z-10">
            <p className={`text-[10px] md:text-xs leading-relaxed font-medium ${mode("text-gray-400", "text-gray-500")}`}>
              تمامی حق انتشار و استفاده از این کارت برای پلتفرم <span className={`font-bold ${mode("text-gray-500", "text-gray-400")}`}>کارتت</span> می‌باشد.
              هر گونه کپی‌برداری و یا استفاده غیر قانونی پیگرد قانونی دارد.
            </p>
            <p className="text-[11px] font-bold" style={{ color: themeHex }}>
              با کارتت رایگان بسازید
            </p>
          </footer>
        </div>
      </div>
    );
  }
      if (template === "classic") {
        return (
            // تمام کد کلاسیک
            <h2>این دمو کارت کلاسیک است</h2>
        );
    }
  // ==========================================
  // FALLBACK for classic / minimalist templates
  // ==========================================
  return (
    <div className={`w-full min-h-screen p-8 text-center font-sans ${design?.isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-800"}`} dir="rtl">
      <h2 className="text-xl font-bold mb-4">{businessName}</h2>
      <p className="opacity-70 text-sm mb-4">این نما برای قالب {template} است. لطفاً برای دیدن تغییرات کامل، از پنل کاربری قالب "Modern" را انتخاب کنید.</p>
    </div>
  );
}