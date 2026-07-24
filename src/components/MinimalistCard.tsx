import React, { useState, useEffect } from "react";
import {
  Phone as PhoneIcon,
  Globe as GlobeIcon,
  ShoppingBag,
  Clock as ClockIcon,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Send,
  MessageCircle,
  Grid3x3,
} from "lucide-react";
import { CardData } from "../types";

interface MinimalistCardProps {
  data: CardData;
  username: string;
  isPreview?: boolean;
  onInteraction: (type: string, url?: string) => void;
}

/**
 * طرح مینیمال طلایی/کرم — بر اساس HTML سفارشی کاربر
 * تمام رنگ‌های طلایی ثابت (--gold) با themeHex (رنگ انتخابی از پنل) جایگزین شده‌اند.
 * تمام متن‌های ثابت با دیتای واقعی کارت جایگزین شده‌اند.
 */
export default function MinimalistCard({ data, username, isPreview = false, onInteraction }: MinimalistCardProps) {
  const {
    businessName,
    brandManager,
    slogan,
    description,
    logoUrl,
    phones,
    landlines,
    website,
    socials,
    gallery,
    products,
    workingDays,
    branches,
    design,
  } = data;

  const themeHex = design?.colorTheme || "#c9a96e"; // پیش‌فرض همون رنگ طلایی طرح اصلی
  const isDark = design?.isDark ?? false;

  // ─── محاسبه رنگ‌های روشن‌تر/تیره‌تر از themeHex برای گرادینت و افکت‌ها ───
  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // ─── اسلایدر گالری ───
  const [galleryIdx, setGalleryIdx] = useState(0);
  useEffect(() => {
    if (gallery && gallery.length > 1) {
      const t = setInterval(() => setGalleryIdx((p) => (p + 1) % gallery.length), 4000);
      return () => clearInterval(t);
    }
  }, [gallery]);

  // ─── وضعیت باز/بسته امروز ───
  const getDayStatus = () => {
    const daysWeek = ["جمعه", "شنبه", "یکشنبه", "دوشنبه", "سه شنبه", "چهارشنبه", "پنجشنبه"];
    const todayStr = daysWeek[new Date().getDay()];
    const today = workingDays?.[todayStr];
    if (!today || !today.isOpen || today.isClosed) {
      return { text: "امروز تعطیل است", isOpen: false };
    }
    return { text: `باز است تا ساعت ${today.closeTime}`, isOpen: true };
  };
  const dayStatus = getDayStatus();

  const socialMeta: { [key: string]: { icon: React.ReactNode; label: string } } = {
    instagram: { icon: <Instagram size={20} />, label: "اینستاگرام" },
    telegram: { icon: <Send size={20} style={{ transform: "rotate(-35deg)" }} />, label: "تلگرام" },
    whatsapp: { icon: <MessageCircle size={20} />, label: "واتساپ" },
  };

  const handleClick = (type: string, url?: string) => {
    if (isPreview) return;
    onInteraction(type, url);
  };

  return (
    <div
      className="minimalist-card-root"
      dir="rtl"
      style={
        {
          "--gold": themeHex,
          "--gold-lt": hexToRgba(themeHex, 0.55),
          "--gold-soft": hexToRgba(themeHex, 0.1),
          fontFamily: "'Vazirmatn', sans-serif",
          background: isDark ? "#1c1916" : "#f5f0e8",
          minHeight: "100%",
          color: isDark ? "#ece5d8" : "#3a3028",
        } as React.CSSProperties
      }
    >
      {/* ░░ HERO ░░ */}
      <div
        style={{
          background: isDark ? "#15120f" : "#2a2420",
          padding: "36px 24px 28px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.18,
            backgroundImage: data.bgImageUrl ? `url(${data.bgImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* لوگو */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              border: `2px solid var(--gold)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              background: "var(--gold-soft)",
              overflow: "hidden",
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="لوگو" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 800, color: "var(--gold)" }}>
                {businessName ? businessName.charAt(0) : "B"}
              </span>
            )}
          </div>

          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            <span style={{ display: "inline-block", borderBottom: "2px solid var(--gold)", paddingBottom: 2 }}>
              {businessName || "نام کسب‌وکار شما"}
            </span>
          </div>

          {brandManager && (
            <div
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,.1)",
                border: "1px solid var(--gold-lt)",
                color: "var(--gold-lt)",
                fontSize: ".78rem",
                fontWeight: 500,
                padding: "4px 16px",
                borderRadius: 20,
                marginBottom: 16,
              }}
            >
              {brandManager} | موسس و مدیر
            </div>
          )}

          {slogan && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "center",
                color: "var(--gold)",
                fontSize: ".8rem",
                fontWeight: 600,
                letterSpacing: ".06em",
                marginBottom: 10,
              }}
            >
              <span style={{ flex: 1, maxWidth: 52, height: 1, background: "var(--gold)", opacity: 0.6 }} />
              {slogan}
              <span style={{ flex: 1, maxWidth: 52, height: 1, background: "var(--gold)", opacity: 0.6 }} />
            </div>
          )}

          {description && (
            <p style={{ color: "rgba(255,255,255,.72)", fontSize: ".88rem", lineHeight: 1.8, maxWidth: 300, margin: "0 auto" }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ░░ تماس ░░ */}
      {(website || (phones && phones.some(Boolean)) || (landlines && landlines.some(Boolean))) && (
        <div
          style={{
            background: isDark ? "#26221d" : "#ffffff",
            borderRadius: 20,
            margin: "16px 14px",
            padding: "6px 0",
            boxShadow: "0 4px 24px rgba(42,36,32,.09)",
          }}
        >
          {website && (
            <ContactRow
              icon={<GlobeIcon size={16} />}
              text={website.replace(/^https?:\/\//, "")}
              onClick={() => handleClick("website", website)}
              isDark={isDark}
            />
          )}
          {phones?.filter(Boolean).map((p, idx) => (
            <React.Fragment key={`p-${idx}`}>
              <ContactRow icon={<PhoneIcon size={16} />} text={p} onClick={() => handleClick("phone", `tel:${p}`)} isDark={isDark} />
            </React.Fragment>
          ))}
          {landlines?.filter(Boolean).map((l, idx) => (
            <React.Fragment key={`l-${idx}`}>
              <ContactRow icon={<PhoneIcon size={16} />} text={l} onClick={() => handleClick("landline", `tel:${l}`)} isDark={isDark} />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ░░ شبکه‌های اجتماعی ░░ */}
      {socials && Object.values(socials).some(Boolean) && (
        <div style={{ display: "flex", justifyContent: "center", gap: 14, padding: "18px 0 10px", margin: "0 14px" }}>
          {Object.entries(socials).map(([key, val]) => {
            if (!val || !socialMeta[key]) return null;
            return (
              <button
                key={key}
                onClick={() => handleClick(key, val)}
                title={socialMeta[key].label}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  border: `1.5px solid ${isDark ? "#3a352d" : "#e8e0d0"}`,
                  background: isDark ? "#26221d" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDark ? "#a89878" : "#8b7355",
                  boxShadow: "0 2px 8px rgba(42,36,32,.07)",
                  cursor: "pointer",
                }}
              >
                {socialMeta[key].icon}
              </button>
            );
          })}
        </div>
      )}

      {/* ░░ گالری ░░ */}
      {gallery && gallery.length > 0 && (
        <>
          <SectionHeading text="گالری تصاویر" isDark={isDark} />
          <div style={{ margin: "0 14px 6px", position: "relative" }}>
            <div style={{ borderRadius: 14, overflow: "hidden", position: "relative", aspectRatio: "16/9" }}>
              <img
                src={gallery[galleryIdx]}
                alt={`گالری ${galleryIdx + 1}`}
                referrerPolicy="no-referrer"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity .4s" }}
              />
              <button
                onClick={() => setGalleryIdx((p) => (p - 1 + gallery.length) % gallery.length)}
                style={sliderBtnStyle("right")}
                aria-label="قبلی"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setGalleryIdx((p) => (p + 1) % gallery.length)}
                style={sliderBtnStyle("left")}
                aria-label="بعدی"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "10px 0 4px" }}>
              {gallery.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setGalleryIdx(idx)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    cursor: "pointer",
                    background: idx === galleryIdx ? "var(--gold)" : isDark ? "#3a352d" : "#e8e0d0",
                    transform: idx === galleryIdx ? "scale(1.2)" : "scale(1)",
                    transition: "all .2s",
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ░░ محصولات ░░ */}
      {products && products.length > 0 && (
        <>
          <SectionHeading text="محصولات و خدمات" isDark={isDark} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, margin: "0 14px" }}>
            {products.slice(0, 6).map((p) => (
              <button
                key={p.id}
                onClick={() => handleClick("product", p.link)}
                style={{
                  background: isDark ? "#26221d" : "#fff",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(42,36,32,.09)",
                  border: "none",
                  padding: 0,
                  cursor: p.link ? "pointer" : "default",
                  textAlign: "right",
                }}
              >
                <div style={{ width: "100%", aspectRatio: "1", background: isDark ? "#1c1916" : "#f0ece3" }}>
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt={p.title} referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ padding: "8px 9px 10px" }}>
                  <div style={{ fontSize: ".78rem", fontWeight: 700, marginBottom: 3, lineHeight: 1.4 }}>{p.title}</div>
                  {p.description && (
                    <div style={{ fontSize: ".68rem", color: isDark ? "#a89878" : "#8a8070", lineHeight: 1.5, marginBottom: 5 }}>
                      {p.description}
                    </div>
                  )}
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--gold)" }}>{p.price || "توافقی"}</div>
                </div>
              </button>
            ))}
          </div>
          {website && (
            <button
              onClick={() => handleClick("website", website)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                margin: "14px 14px 6px",
                background: "var(--gold)",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: 14,
                width: "calc(100% - 28px)",
                fontFamily: "'Vazirmatn', sans-serif",
                fontSize: ".92rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: `0 4px 16px ${hexToRgba(themeHex, 0.35)}`,
              }}
            >
              <ShoppingBag size={18} />
              مشاهده همه محصولات
            </button>
          )}
        </>
      )}

      {/* ░░ شعب ░░ */}
      {branches && branches.length > 0 && (
        <>
          <SectionHeading text="شعب و آدرس‌ها" isDark={isDark} />
          <div style={{ margin: "0 14px 6px", display: "flex", flexDirection: "column", gap: 10 }}>
            {branches.map((b) => (
              <div
                key={b.id}
                style={{
                  background: isDark ? "#26221d" : "#fff",
                  borderRadius: 14,
                  padding: "14px 16px",
                  boxShadow: "0 4px 24px rgba(42,36,32,.09)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: ".85rem", marginBottom: 4 }}>{b.title || "شعبه اصلی"}</div>
                {b.address && (
                  <div style={{ fontSize: ".75rem", color: isDark ? "#a89878" : "#8a8070", lineHeight: 1.6, marginBottom: 8 }}>{b.address}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {b.googleMaps && (
                    <button onClick={() => handleClick("googleMaps", b.googleMaps)} style={mapBtnStyle(isDark)}>
                      گوگل مپ
                    </button>
                  )}
                  {b.neshan && (
                    <button onClick={() => handleClick("neshan", b.neshan)} style={mapBtnStyle(isDark)}>
                      نشان
                    </button>
                  )}
                  {b.balad && (
                    <button onClick={() => handleClick("balad", b.balad)} style={mapBtnStyle(isDark)}>
                      بلد
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ░░ ساعات کاری ░░ */}
      {workingDays && Object.keys(workingDays).length > 0 && (
        <>
          <SectionHeading text="ساعت کاری" isDark={isDark} />
          <div
            style={{
              background: isDark ? "#26221d" : "#fff",
              borderRadius: 20,
              margin: "6px 14px 6px",
              padding: "16px 18px",
              boxShadow: "0 4px 24px rgba(42,36,32,.09)",
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: `1.5px solid ${isDark ? "#3a352d" : "#e8e0d0"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isDark ? "#a89878" : "#8b7355",
                flexShrink: 0,
              }}
            >
              <ClockIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: 8, color: dayStatus.isOpen ? "#2e7d32" : "#c0392b" }}>
                {dayStatus.text}
              </div>
              {Object.entries(workingDays).map(([day, val]) => (
                <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", padding: "3px 0" }}>
                  <span style={{ color: isDark ? "#a89878" : "#8a8070" }}>{day}</span>
                  <span style={val.isOpen && !val.isClosed ? { fontWeight: 500 } : { color: "#c0392b", fontWeight: 600 }}>
                    {val.isOpen && !val.isClosed ? `${val.openTime} – ${val.closeTime}` : "تعطیل"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ░░ فوتر ░░ */}
      <div
        style={{
          textAlign: "center",
          padding: "18px 14px 28px",
          fontSize: ".75rem",
          color: isDark ? "#a89878" : "#8a8070",
          borderTop: `1px solid ${isDark ? "#3a352d" : "#e8e0d0"}`,
          marginTop: 14,
        }}
      >
        © {new Date().getFullYear()} {businessName || "کارتت"}
      </div>

      <style>{`
        .minimalist-card-root * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ─── کامپوننت‌های کوچک کمکی ───────────────────────────────────────────────────

function ContactRow({ icon, text, onClick, isDark }: { icon: React.ReactNode; text: string; onClick: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        padding: "13px 18px",
        gap: 12,
        textDecoration: "none",
        color: isDark ? "#ece5d8" : "#3a3028",
        borderBottom: `1px solid ${isDark ? "#3a352d" : "#e8e0d0"}`,
        background: "transparent",
        border: "none",
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        cursor: "pointer",
        textAlign: "right",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `1px solid ${isDark ? "#3a352d" : "#e8e0d0"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: isDark ? "#a89878" : "#8b7355",
        }}
      >
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: ".9rem", direction: "ltr", textAlign: "right" }}>{text}</span>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--gold)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        <PhoneIcon size={15} />
      </div>
    </button>
  );
}

function SectionHeading({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "22px 20px 12px",
        fontSize: "1.05rem",
        fontWeight: 700,
      }}
    >
      {text}
      <span
        style={{
          flex: 1,
          height: 2,
          background: `linear-gradient(to left, transparent, var(--gold) 40%)`,
        }}
      />
    </div>
  );
}

function sliderBtnStyle(side: "right" | "left"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "rgba(255,255,255,.88)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#2a2420",
    boxShadow: "0 2px 8px rgba(0,0,0,.15)",
    zIndex: 10,
  };
}

function mapBtnStyle(isDark: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 4px",
    borderRadius: 8,
    fontSize: "10px",
    fontWeight: 700,
    border: `1px solid ${isDark ? "#3a352d" : "#e8e0d0"}`,
    background: isDark ? "#1c1916" : "#f5f0e8",
    color: isDark ? "#a89878" : "#8b7355",
    cursor: "pointer",
  };
}
