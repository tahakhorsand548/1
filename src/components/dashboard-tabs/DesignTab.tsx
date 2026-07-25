import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Palette,
  Plus,
  Save,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Info,
  Phone,
  MapPin,
  ShoppingBag,
  Trash2,
  Share2,
  Crown,
} from "lucide-react";
import { CardData, User } from "../../types";
import IPhoneMockup from "../IPhoneMockup";
const COLORS_PRESETS = [
  { name: "آسمان آبی", hex: "#3B82F6" },
  { name: "یاقوتی سرخ", hex: "#EF4444" },
  { name: "زمردین سبز", hex: "#10B981" },
  { name: "کهربایی زرین", hex: "#F59E0B" },
  { name: "بنفش سلطنتی", hex: "#8B5CF6" },
  { name: "امپرور نارنجی", hex: "#F97316" },
  { name: "تاریک شب", hex: "#475569" },
  { name: "صورتی رمانتیک", hex: "#EC4899" },
  { name: "سیان اقیانوس", hex: "#06B6D4" },
  { name: "رز گلد", hex: "#FB7185" },
  { name: "قهوه‌ای لاته", hex: "#78350F" },
  { name: "ارکیده تیره", hex: "#D946EF" },
  { name: "لیمویی تابستانی", hex: "#84CC16" },
  { name: "نعنایی تازه", hex: "#14B8A6" },
  { name: "سایبرپانک سرخ", hex: "#F43F5E" },
  { name: "بنیتا بنفش", hex: "#6366F1" },
  { name: "خاکستری مدرن", hex: "#1E293B" },
  { name: "آلبالویی لوکس", hex: "#9D174D" },
];

const DAYS_OF_WEEK = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

interface DesignTabProps {
  user: User;
  cardData: CardData;
  setCardData: (data: CardData) => void;
  saveLoading: boolean;
  feedback: string;
  handleSaveCard: () => void;
  openDesignSection: string | null;
  setOpenDesignSection: (v: string | null) => void;
  uploadProgress: { [key: string]: number };
  dragActive: { [key: string]: boolean };
  handleDragOver: (e: React.DragEvent, id: string) => void;
  handleDragLeave: (e: React.DragEvent, id: string) => void;
  handleDrop: (e: React.DragEvent, id: string, callback: (url: string) => void) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>, id: string, callback: (url: string) => void) => void;
  editBasic: (key: string, val: any) => void;
  editSocial: (key: string, val: string) => void;
  /** آیا کاربر هم‌اکنون اشتراک پرو فعال دارد (از UserDashboard تأمین می‌شود) */
  isPro: boolean;
  /** در حال بررسی وضعیت اشتراک از سرور */
  subscriptionLoading: boolean;
  /** باز کردن مودال سراسری خرید/تمدید اشتراک (در سطح UserDashboard مدیریت می‌شود) */
  onOpenSubscriptionModal: () => void;
}

export default function DesignTab({
  user,
  cardData,
  setCardData,
  saveLoading,
  feedback,
  handleSaveCard,
  openDesignSection,
  setOpenDesignSection,
  uploadProgress,
  dragActive,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileInputChange,
  editBasic,
  editSocial,
  isPro,
  subscriptionLoading,
  onOpenSubscriptionModal,
}: DesignTabProps) {
  const navigate = useNavigate();

  // نوع کارت انتخابی: فروشگاهی (فعال) / شخصی (به‌زودی) / پرو (اشتراک ویژه)
  const [selectedCardType, setSelectedCardType] = React.useState<
    "store" | "personal" | "pro"
  >("store");

  // کلیک روی دکمه «پلن حرفه‌ای»:
  //   - اگر کاربر اشتراک فعال دارد → مستقیم وارد مینی‌اپ ادیتور پرو می‌شود
  //   - اگر ندارد → پاپ‌آپ سراسری خرید اشتراک باز می‌شود (در همین صفحه)
  const handleProButtonClick = () => {
    if (subscriptionLoading) return;
    if (isPro) {
      navigate(`/editor-pro/${user.username}`);
    } else {
      onOpenSubscriptionModal();
    }
  };

  return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start text-right">
          {/* Input fields panel (right side in Arabic view) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  ویرایشگر و پیکربندی کارت
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  تغییرات را به طور زنده در گوشی کناری مشاهده کنید و سپس بر
                  روی دکمه ذخیره کلیک کنید.
                </p>
              </div>
              <button
                onClick={handleSaveCard}
                disabled={saveLoading}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/10 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {saveLoading ? "درحال ذخیره..." : "ذخیره تغییرات نهایی"}
              </button>
            </div>

            {feedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold">
                {feedback}
              </div>
            )}

            {/* نوع کارت ویزیت: فروشگاهی / شخصی / پرو */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-3">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-500" />
                نوع کارت ویزیت
              </span>

              <div className="grid grid-cols-3 gap-3">
                {/* فروشگاهی */}
                <button
                  type="button"
                  onClick={() => setSelectedCardType("store")}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                    selectedCardType === "store"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  فروشگاهی
                </button>

                {/* شخصی — غیرفعال، به‌زودی */}
                <button
                  type="button"
                  disabled
                  title="ویرایشگر کارت شخصی به‌زودی اضافه می‌شود"
                  className="relative p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-center font-bold text-xs cursor-not-allowed opacity-70"
                >
                  شخصی
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                    به‌زودی
                  </span>
                </button>

                {/* پرو */}
                <div className="relative">
                  {!isPro && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold z-10">
                      نیازمند اشتراک
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleProButtonClick}
                    disabled={subscriptionLoading}
                    className="w-full p-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-center font-bold text-xs hover:scale-[1.02] transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {subscriptionLoading
                      ? "در حال بررسی..."
                      : isPro
                      ? "ورود به ادیتور پرو"
                      : "پلن حرفه‌ای"}
                  </button>
                </div>
              </div>

              {selectedCardType === "personal" && (
                <p className="text-[11px] text-slate-400 font-semibold pt-1">
                  ویرایشگر اختصاصی کارت شخصی به‌زودی اضافه می‌شود.
                </p>
              )}
            </div>

            {/* Template Theme and visual identity card options */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenDesignSection(
                    openDesignSection === "design" ? null : "design",
                  )
                }
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 hover:bg-slate-50 border-none outline-none transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Palette className="w-4.5 h-4.5 text-blue-500" />
                  <span>طراحی شخصی و هویت بصری کارت</span>
                </span>
                {openDesignSection === "design" ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openDesignSection === "design" && (
                <div className="p-5 border-t border-slate-100 space-y-4">
                  {/* 2 Style choices for the store card: مدرن / شیشه‌ای */}
                  <div className="grid grid-cols-2 gap-3">

                    {/* Modern */}
                    <button
                      onClick={() =>
                        setCardData({
                          ...cardData,
                          design: {
                            ...cardData.design,
                            template: "modern",
                          },
                        })
                      }
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                        !cardData.design?.template || cardData.design?.template === "modern"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      مدرن
                    </button>

                    {/* Glass (شیشه‌ای / لیکویید گلس) */}
                    <button
                      onClick={() =>
                        setCardData({
                          ...cardData,
                          design: {
                            ...cardData.design,
                            template: "glass",
                          },
                        })
                      }
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition ${
                        cardData.design?.template === "glass"
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      شیشه‌ای
                    </button>

                  </div>

                  {/* Dark & Light toggle option */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-slate-600">
                      پس‌زمینه تیره کارت (کاربردی در شب) :
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCardData({
                            ...cardData,
                            design: { ...cardData.design, isDark: false },
                          })
                        }
                        className={`py-1.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                          !cardData.design?.isDark
                            ? "bg-blue-50 text-blue-600 border border-blue-100"
                            : "bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-850"
                        }`}
                      >
                        روشن
                      </button>
                      <button
                        onClick={() =>
                          setCardData({
                            ...cardData,
                            design: { ...cardData.design, isDark: true },
                          })
                        }
                        className={`py-1.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                          cardData.design?.isDark
                            ? "bg-slate-800 text-white border border-slate-705"
                            : "bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-850"
                        }`}
                      >
                        تیره
                      </button>
                    </div>
                  </div>

                  {/* 18 Swatches for colors selection */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="text-xs font-semibold text-slate-600 block">
                      تم رنگ پیوندهای کارت و دکمه ها (۱۸ رنگ پیشنهادی) :
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {COLORS_PRESETS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() =>
                            setCardData({
                              ...cardData,
                              design: {
                                ...cardData.design,
                                colorTheme: c.hex,
                              },
                            })
                          }
                          className={`p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all hover:bg-slate-50 cursor-pointer ${
                            cardData.design?.colorTheme === c.hex
                              ? "border-blue-500 bg-blue-50/10 shadow-xs ring-2 ring-blue-500/20"
                              : "border-slate-100 bg-white"
                          }`}
                        >
                          <div
                            className="w-4.5 h-4.5 rounded-full shadow-xs border border-white"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[9px] font-bold text-slate-500 mt-1 text-center truncate w-full px-0.5">
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-2">
                      یا رنگ دلخواه انتخاب کنید:
                    </label>

                    <input
                      type="color"
                      value={cardData.design?.colorTheme || "#3B82F6"}
                      onChange={(e) =>
                        setCardData({
                          ...cardData,
                          design: {
                            ...cardData.design,
                            colorTheme: e.target.value,
                          },
                        })
                      }
                      className="w-full h-11 rounded-xl border border-slate-200 cursor-pointer"
                    />
                  </div>
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenDesignSection(
                    openDesignSection === "info" ? null : "info",
                  )
                }
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 hover:bg-slate-50 border-none outline-none transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 text-blue-500" />
                  <span>اطلاعات کلی و معرفی برند</span>
                </span>
                {openDesignSection === "info" ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openDesignSection === "info" && (
                <div className="p-5 border-t border-slate-100 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-655">
                      نام تجاری یا برند کسب و کار :
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: فروشگاه نوین سازان"
                      value={cardData.businessName}
                      onChange={(e) =>
                        editBasic(
                          "businessName",
                          e.target.value.substring(0, 40),
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-none transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-bold text-left block">
                      حداکثر ۴۰ کاراکتر (
                      {40 - (cardData.businessName?.length || 0)} باقی مانده)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-655">
                        نام مدیر مجموعه :
                      </label>
                      <input
                        type="text"
                        placeholder="امیر رضایی"
                        value={cardData.brandManager}
                        onChange={(e) =>
                          editBasic(
                            "brandManager",
                            e.target.value.substring(0, 30),
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-none transition-all"
                      />
                      <span className="text-[9px] text-slate-400 font-bold text-left block">
                        حداکثر ۳۰ کاراکتر (
                        {30 - (cardData.brandManager?.length || 0)} باقی
                        مانده)
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-655">
                        شعار اصلی تبلیغاتی :
                      </label>
                      <input
                        type="text"
                        placeholder="کیفیت را ارزان خریداری کنید"
                        value={cardData.slogan}
                        onChange={(e) =>
                          editBasic("slogan", e.target.value.substring(0, 50))
                        }
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl py-2 px-3 text-xs text-slate-800 outline-none transition-all"
                      />
                      <span className="text-[9px] text-slate-400 font-bold text-left block">
                        حداکثر ۵۰ کاراکتر (
                        {50 - (cardData.slogan?.length || 0)} باقی مانده)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-655">
                      توضیحات کلی درباره خدمات برند :
                    </label>
                    <textarea
                      rows={3}
                      placeholder="توضیحات کوتاهی در خصوص مجموعه، گواهینامه ها و نوع فعالیت خود بنویسید..."
                      value={cardData.description}
                      onChange={(e) =>
                        editBasic(
                          "description",
                          e.target.value.substring(0, 200),
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition-all"
                    />
                    <span className="text-[9px] text-slate-400 font-bold text-left block">
                      حداکثر ۲۰۰ کاراکتر (
                      {200 - (cardData.description?.length || 0)} باقی مانده)
                    </span>
                  </div>

                  {/* Drag and drop image upload panel for logo & background banner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LOGO Drag & drop */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-655">
                        تصویر لوگو برند :
                      </span>
                      <div
                        onDragOver={(e) => handleDragOver(e, "logo")}
                        onDragLeave={(e) => handleDragLeave(e, "logo")}
                        onDrop={(e) =>
                          handleDrop(e, "logo", (url) =>
                            editBasic("logoUrl", url),
                          )
                        }
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center cursor-pointer min-h-[110px] ${
                          dragActive["logo"]
                            ? "border-blue-600 bg-blue-50/50"
                            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="file"
                          id="logoFileInput"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileInputChange(e, "logo", (url) =>
                              editBasic("logoUrl", url),
                            )
                          }
                        />
                        <label
                          htmlFor="logoFileInput"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] font-bold text-slate-605">
                            درگ و دراپ عکس یا لمس برای انتخاب
                          </span>
                        </label>
                        {uploadProgress["logo"] !== undefined && (
                          <div className="w-full mt-3">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full transition-all duration-300"
                                style={{
                                  width: `${uploadProgress["logo"]}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-blue-600 mt-1 block font-bold">
                              درحال دانلود و ذخیره‌سازی:{" "}
                              {uploadProgress["logo"]}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COVER Drag & drop */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-655">
                        تصویر هدر پس‌زمینه :
                      </span>
                      <div
                        onDragOver={(e) => handleDragOver(e, "banner")}
                        onDragLeave={(e) => handleDragLeave(e, "banner")}
                        onDrop={(e) =>
                          handleDrop(e, "banner", (url) =>
                            editBasic("bgImageUrl", url),
                          )
                        }
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center cursor-pointer min-h-[110px] ${
                          dragActive["banner"]
                            ? "border-blue-600 bg-blue-50/50"
                            : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="file"
                          id="bannerFileInput"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileInputChange(e, "banner", (url) =>
                              editBasic("bgImageUrl", url),
                            )
                          }
                        />
                        <label
                          htmlFor="bannerFileInput"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] font-bold text-slate-605">
                            درگ یا کلیک جهت بارگذاری
                          </span>
                        </label>
                        {uploadProgress["banner"] !== undefined && (
                          <div className="w-full mt-3">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full transition-all duration-300"
                                style={{
                                  width: `${uploadProgress["banner"]}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-blue-600 mt-1 block font-bold">
                              آپلود شد: {uploadProgress["banner"]}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Branch Mobile list (max 3) & Fixed telephones (max 2) */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenDesignSection(
                    openDesignSection === "contacts" ? null : "contacts",
                  )
                }
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 hover:bg-slate-50 border-none outline-none transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Phone className="w-4.5 h-4.5 text-blue-500" />
                  <span>اطلاعات تماس کسب و کار</span>
                </span>
                {openDesignSection === "contacts" ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openDesignSection === "contacts" && (
                <div className="p-5 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-750">
                      شماره های همراه (حداکثر ۳ شماره) :
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (cardData.phones.length >= 3) return;
                        setCardData({
                          ...cardData,
                          phones: [...cardData.phones, ""],
                        });
                      }}
                      disabled={cardData.phones.length >= 3}
                      className="py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-[10px] font-bold flex items-center gap-1 text-white shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      شماره همراه جدید
                    </button>
                  </div>

                  {/* Phones */}
                  <div className="space-y-2.5">
                    {cardData.phones.map((p, idx) => (
                      <div
                        key={`phoneinputs-${idx}`}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-slate-500 font-bold min-w-[60px]">
                          همراه {idx + 1} :
                        </span>
                        <input
                          type="tel"
                          maxLength={11}
                          placeholder="فرمت: 09123456789"
                          value={p}
                          onChange={(e) => {
                            const copy = [...cardData.phones];
                            copy[idx] = e.target.value.replace(/[^0-9]/g, "");
                            setCardData({ ...cardData, phones: copy });
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-left text-slate-800 font-mono outline-none transition-all"
                        />
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...cardData.phones];
                              copy.splice(idx, 1);
                              setCardData({ ...cardData, phones: copy });
                            }}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-all shadow-xs cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Landlines list (max 2) */}
                  <div className="border-t border-slate-100 pt-3 space-y-3 font-semibold">
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-xs font-bold text-slate-700">
                        شماره تلفن های ثابت (حداکثر ۲ شماره) :
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (cardData.landlines.length >= 2) return;
                          setCardData({
                            ...cardData,
                            landlines: [...cardData.landlines, ""],
                          });
                        }}
                        disabled={cardData.landlines.length >= 2}
                        className="py-1 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-[9px] font-bold flex items-center gap-1 text-slate-700 hover:bg-slate-200 transition shadow-xs cursor-pointer border-none outline-none"
                      >
                        <Plus className="w-3 h-3" />
                        تلفن ثابت جدید
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {cardData.landlines.map((l, idx) => (
                        <div
                          key={`landlineinputs-${idx}`}
                          className="flex items-center gap-2"
                        >
                          <span className="text-xs text-slate-500 font-bold min-w-[60px]">
                            ثابت {idx + 1} :
                          </span>
                          <input
                            type="tel"
                            maxLength={11}
                            placeholder="فرمت: 02122334455"
                            value={l}
                            onChange={(e) => {
                              const copy = [...cardData.landlines];
                              copy[idx] = e.target.value.replace(
                                /[^0-9]/g,
                                "",
                              );
                              setCardData({ ...cardData, landlines: copy });
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-left text-slate-800 font-mono outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...cardData.landlines];
                              copy.splice(idx, 1);
                              setCardData({ ...cardData, landlines: copy });
                            }}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-all shadow-xs cursor-pointer border-none outline-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* branches addresses section and maps links */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenDesignSection(
                    openDesignSection === "branches" ? null : "branches",
                  )
                }
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 hover:bg-slate-50 border-none outline-none transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4.5 h-4.5 text-blue-500" />
                  <span>شعب و آدرس های جغرافیایی</span>
                </span>
                {openDesignSection === "branches" ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openDesignSection === "branches" && (
                <div className="p-5 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-755">
                      موقعیت ها و آدرس های شعب (بدون محدودیت) :
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCardData({
                          ...cardData,
                          branches: [
                            ...cardData.branches,
                            {
                              id: "branch-" + Date.now(),
                              title: "",
                              address: "",
                              googleMaps: "",
                              neshan: "",
                              balad: "",
                            },
                          ],
                        });
                      }}
                      className="py-1 px-2.5 rounded bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      شعبه جدید
                    </button>
                  </div>

                  <div className="space-y-4">
                    {cardData.branches.map((b, idx) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/85 shadow-sm space-y-3 relative"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...cardData.branches];
                            copy.splice(idx, 1);
                            setCardData({ ...cardData, branches: copy });
                          }}
                          className="absolute left-3 top-3 text-slate-400 hover:text-red-505 bg-white border border-slate-200 shadow-xs rounded-lg p-1 transition-all cursor-pointer"
                          title="حذف این شعبه"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-655">
                            نام یا عنوان شعبه :
                          </label>
                          <input
                            type="text"
                            placeholder="دفتر اقدسیه، کارگاه تولید و..."
                            value={b.title}
                            onChange={(e) => {
                              const copy = [...cardData.branches];
                              copy[idx].title = e.target.value;
                              setCardData({ ...cardData, branches: copy });
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-655">
                            آدرس دقیق پستی شعبه :
                          </label>
                          <input
                            type="text"
                            placeholder="تهران، اقدسیه، خیابان سپند، پلاک هشت"
                            value={b.address}
                            onChange={(e) => {
                              const copy = [...cardData.branches];
                              copy[idx].address = e.target.value;
                              setCardData({ ...cardData, branches: copy });
                            }}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none transition-all"
                          />
                        </div>

                        {/* Map URLs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500">
                              گوگل مپ URL :
                            </label>
                            <input
                              type="text"
                              placeholder="https://maps.google.com/..."
                              value={b.googleMaps}
                              onChange={(e) => {
                                const copy = [...cardData.branches];
                                copy[idx].googleMaps = e.target.value;
                                setCardData({ ...cardData, branches: copy });
                              }}
                              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg py-1 px-2 text-[10px] text-left font-mono outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500">
                              روتر نقشه نشان URL :
                            </label>
                            <input
                              type="text"
                              placeholder="https://neshan.org/..."
                              value={b.neshan}
                              onChange={(e) => {
                                const copy = [...cardData.branches];
                                copy[idx].neshan = e.target.value;
                                setCardData({ ...cardData, branches: copy });
                              }}
                              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg py-1 px-2 text-[10px] text-left font-mono outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500">
                              روتر نقشه بلد URL :
                            </label>
                            <input
                              type="text"
                              placeholder="https://balad.ir/..."
                              value={b.balad}
                              onChange={(e) => {
                                const copy = [...cardData.branches];
                                copy[idx].balad = e.target.value;
                                setCardData({ ...cardData, branches: copy });
                              }}
                              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg py-1 px-2 text-[10px] text-left font-mono outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Social Channels lists */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenDesignSection(
                    openDesignSection === "socials" ? null : "socials",
                  )
                }
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 hover:bg-slate-50 border-none outline-none transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Share2 className="w-4.5 h-4.5 text-blue-500" />
                  <span>شبکه های اجتماعی و لینک سایت</span>
                </span>
                {openDesignSection === "socials" ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {openDesignSection === "socials" && (
                <div className="p-5 border-t border-slate-100 space-y-3">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-600 font-bold min-w-[100px]">
                      آدرس وب‌سایت :
                    </span>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={cardData.website}
                      onChange={(e) => editBasic("website", e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-left font-mono text-slate-800 outline-none transition-all"
                    />
                  </div>

                  {Object.keys(cardData.socials || {}).map((soc) => (
                    <div key={soc} className="flex gap-2 items-center">
                      <span className="text-xs text-slate-600 font-bold min-w-[100px] capitalize">
                        {soc === "instagram"
                          ? "اینستاگرام"
                          : soc === "telegram"
                            ? "تلگرام"
                            : soc === "whatsapp"
                              ? "واتساپ"
                              : soc === "youtube"
                                ? "یوتیوب"
                                : soc === "aparat"
                                  ? "آپارات"
                                  : soc === "bale"
                                    ? "بله"
                                    : soc === "rubika"
                                      ? "روبیکا"
                                      : "سروش"}{" "}
                        :
                      </span>
                      <input
                        type="text"
                        placeholder={`لینک شبکه اجتماعی ${soc}`}
                        value={(cardData.socials as any)[soc] || ""}
                        onChange={(e) => editSocial(soc, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-left font-mono text-slate-800 outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCTS Manager (max 5) */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenDesignSection(
                    openDesignSection === "products" ? null : "products",
                  )
                }
                className="w-full p-4 flex items-center justify-between font-extrabold text-xs text-slate-800 hover:bg-slate-50 border-none outline-none transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4.5 h-4.5 text-blue-500" />
                  <span>مدیریت محصولات یا خدمات (حداکثر ۵ مورد)</span>
                </span>
                <div className="flex items-center gap-2">
                  {openDesignSection === "products" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (cardData.products.length >= 5) return;
                        setCardData({
                          ...cardData,
                          products: [
                            ...cardData.products,
                            {
                              id: "prod-" + Date.now(),
                              title: "",
                              description: "",
                              price: "",
                              link: "",
                              imageUrl: "",
                            },
                          ],
                        });
                      }}
                      disabled={cardData.products.length >= 5}
                      className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-[9px] font-bold rounded text-white flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3" />
                      افزودن محصول
                    </button>
                  )}
                  {openDesignSection === "products" ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
              {openDesignSection === "products" && (
                <div className="p-5 border-t border-slate-100 space-y-4">
                  {cardData.products.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4 font-bold">
                      هیچ محصول یا خدمتی تعریف نشده است. دکمه افزودن بالا را
                      بزنید.
                    </p>
                  )}
                  <div className="space-y-4">
                    {cardData.products.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 shadow-xs space-y-3 relative"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...cardData.products];
                            copy.splice(idx, 1);
                            setCardData({ ...cardData, products: copy });
                          }}
                          className="absolute left-3 top-3 text-slate-400 hover:text-red-500 bg-white border border-slate-200 shadow-xs rounded-lg p-1 transition-all cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-655">
                              نام کالا یا خدمت :
                            </label>
                            <input
                              type="text"
                              placeholder="کارت ویزیت فلزی"
                              value={p.title}
                              onChange={(e) => {
                                const copy = [...cardData.products];
                                copy[idx].title = e.target.value.substring(
                                  0,
                                  35,
                                );
                                setCardData({ ...cardData, products: copy });
                              }}
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-655">
                              قیمت (تومان) :
                            </label>
                            <input
                              type="text"
                              placeholder="450000"
                              value={p.price}
                              onChange={(e) => {
                                const copy = [...cardData.products];
                                copy[idx].price = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                setCardData({ ...cardData, products: copy });
                              }}
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-655">
                              توضیحات محصول :
                            </label>
                            <textarea
                              placeholder="توضیح کوتاهی درباره این محصول یا خدمت بنویسید"
                              value={p.description}
                              onChange={(e) => {
                                const copy = [...cardData.products];
                                copy[idx].description = e.target.value.substring(
                                  0,
                                  80,
                                );
                                setCardData({ ...cardData, products: copy });
                              }}
                              rows={2}
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none transition-all resize-none"
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-655">
                              لینک محصول (با کلیک کاربر به این آدرس هدایت
                              می‌شود) :
                            </label>
                            <input
                              type="text"
                              placeholder="https://example.com"
                              value={p.link}
                              onChange={(e) => {
                                const copy = [...cardData.products];
                                copy[idx].link = e.target.value;
                                setCardData({ ...cardData, products: copy });
                              }}
                              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-1.5 px-3 text-xs text-slate-800 outline-none transition-all"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-655">
                              عکس محصول (لمس یا کپی) :
                            </span>
                            <div
                              onDragOver={(e) =>
                                handleDragOver(e, `prod-${p.id}`)
                              }
                              onDragLeave={(e) =>
                                handleDragLeave(e, `prod-${p.id}`)
                              }
                              onDrop={(e) =>
                                handleDrop(e, `prod-${p.id}`, (url) => {
                                  const copy = [...cardData.products];
                                  copy[idx].imageUrl = url;
                                  setCardData({
                                    ...cardData,
                                    products: copy,
                                  });
                                })
                              }
                              className={`border border-dashed rounded-lg p-2 text-center text-[10px] flex items-center justify-center cursor-pointer min-h-[46px] ${
                                dragActive[`prod-${p.id}`]
                                  ? "border-blue-600 bg-blue-50/50"
                                  : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="file"
                                id={`prodFileInput-${p.id}`}
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleFileInputChange(
                                    e,
                                    `prod-${p.id}`,
                                    (url) => {
                                      const copy = [...cardData.products];
                                      copy[idx].imageUrl = url;
                                      setCardData({
                                        ...cardData,
                                        products: copy,
                                      });
                                    },
                                  )
                                }
                              />
                              <label
                                htmlFor={`prodFileInput-${p.id}`}
                                className="cursor-pointer flex items-center gap-1.5 text-slate-500 font-semibold text-[10px]"
                              >
                                <UploadCloud className="w-4 h-4 text-slate-400" />
                                <span>انتخاب یا درگ عکس</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* IMAGE GALLERY Manager */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-slate-800">
                  گالری تصاویر متحرک اسلایدر (حداکثر ۵ تصویر)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    if (cardData.gallery.length >= 5) return;
                    setCardData({
                      ...cardData,
                      gallery: [...cardData.gallery, ""],
                    });
                  }}
                  disabled={cardData.gallery.length >= 5}
                  className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-[10px] font-bold rounded text-white flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  افزودن تصویر
                </button>
              </div>

              <div className="space-y-4">
                {cardData.gallery.map((imgUrl, idx) => (
                  <div
                    key={`gal-${idx}`}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4 relative shadow-xs"
                  >
                    <button
                      onClick={() => {
                        const copy = [...cardData.gallery];
                        copy.splice(idx, 1);
                        setCardData({ ...cardData, gallery: copy });
                      }}
                      className="absolute left-3 top-3 text-slate-400 hover:text-red-500 bg-white border border-slate-200 shadow-xs rounded-lg p-1 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="w-16 h-12 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-[9px] text-slate-500 text-center my-4">
                          بدون عکسه
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-650">
                        بارگذاری تصویر {idx + 1} (در قالب ۱۶:۹) :
                      </span>
                      <div
                        onDragOver={(e) => handleDragOver(e, `gal-${idx}`)}
                        onDragLeave={(e) => handleDragLeave(e, `gal-${idx}`)}
                        onDrop={(e) =>
                          handleDrop(e, `gal-${idx}`, (url) => {
                            const copy = [...cardData.gallery];
                            copy[idx] = url;
                            setCardData({ ...cardData, gallery: copy });
                          })
                        }
                        className={`border border-dashed rounded-lg p-2 text-center text-[10px] flex items-center justify-center cursor-pointer ${
                          dragActive[`gal-${idx}`]
                            ? "border-blue-600 bg-blue-50/50"
                            : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="file"
                          id={`galFileInput-${idx}`}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleFileInputChange(e, `gal-${idx}`, (url) => {
                              const copy = [...cardData.gallery];
                              copy[idx] = url;
                              setCardData({ ...cardData, gallery: copy });
                            })
                          }
                        />
                        <label
                          htmlFor={`galFileInput-${idx}`}
                          className="cursor-pointer flex items-center gap-1.5 text-slate-500 font-semibold"
                        >
                          <UploadCloud className="w-4 h-4 text-slate-400" />
                          <span>
                            عکس ویزیت رومیزی را بکشید یا برای انتخاب لمس کنید
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WORKING HOURS Calendars */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-extrabold text-xs text-slate-800">
                تقویم کاری و ساعت فعالیت هفتگی
              </h3>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const sched = cardData.workingDays?.[day] || {
                    isOpen: false,
                    openTime: "08:00",
                    closeTime: "17:00",
                    isClosed: true,
                  };
                  return (
                    <div
                      key={day}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
                    >
                      <span className="font-bold text-slate-700 min-w-[70px]">
                        {day} :
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...cardData.workingDays };
                            copy[day] = {
                              ...sched,
                              isOpen: true,
                              isClosed: false,
                            };
                            setCardData({ ...cardData, workingDays: copy });
                          }}
                          className={`py-1 px-3.5 rounded font-bold text-[10px] transition shadow-xs ${
                            sched.isOpen && !sched.isClosed
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          باز
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...cardData.workingDays };
                            copy[day] = {
                              ...sched,
                              isOpen: false,
                              isClosed: true,
                            };
                            setCardData({ ...cardData, workingDays: copy });
                          }}
                          className={`py-1 px-3.5 rounded font-bold text-[10px] transition shadow-xs ${
                            sched.isClosed
                              ? "bg-red-500 text-white"
                              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          تعطیل
                        </button>
                      </div>

                      {sched.isOpen && !sched.isClosed && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono font-bold">
                          <input
                            type="text"
                            value={sched.openTime}
                            onChange={(e) => {
                              const copy = { ...cardData.workingDays };
                              copy[day] = {
                                ...sched,
                                openTime: e.target.value,
                              };
                              setCardData({ ...cardData, workingDays: copy });
                            }}
                            className="w-14 bg-white hover:border-slate-350 text-center rounded py-0.5 border border-slate-200 text-xs text-slate-800"
                          />
                          <span className="text-[10px]">الی</span>
                          <input
                            type="text"
                            value={sched.closeTime}
                            onChange={(e) => {
                              const copy = { ...cardData.workingDays };
                              copy[day] = {
                                ...sched,
                                closeTime: e.target.value,
                              };
                              setCardData({ ...cardData, workingDays: copy });
                            }}
                            className="w-14 bg-white hover:border-slate-350 text-center rounded py-0.5 border border-slate-200 text-xs text-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Primary save settings */}
            <div className="flex items-center justify-between mt-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs text-slate-600 font-bold">
                ذخیره نهایی ویرایش ها :
              </span>
              <button
                onClick={handleSaveCard}
                disabled={saveLoading}
                className="py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/10 cursor-pointer"
              >
                {saveLoading
                  ? "درحال ذخیره‌سازی..."
                  : "ثبت و تایید اطلاعات کارت"}
              </button>
            </div>
          </div>

          {/* Simulated Live iPhone mockup (left side in Arabic View) */}
          <div className="xl:sticky xl:top-6 bg-slate-100 p-6 rounded-[40px] border border-slate-200/80 flex items-center justify-center shadow-inner">
            <IPhoneMockup data={cardData} username={user.username} />
          </div>


        </div>
        

  );
}
