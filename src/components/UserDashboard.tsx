import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTicketSocket } from "../hooks/useTicketSocket";
import {
  User as UserIcon,
  LayoutDashboard,
  Palette,
  QrCode,
  MessageSquare,
  LogOut,
  Globe,
  Phone,
  MapPin,
  Trash2,
  Plus,
  Clock,
  Save,
  Copy,
  Download,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Volume2,
  ShieldAlert,
  Megaphone,
  Flame,
  CheckCircle,
  Info,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Share2,
  ShoppingBag,
  Images,
} from "lucide-react";
import {
  CardData,
  User,
  Ticket,
  GlobalAnnouncement,
  AdvertisingBanner,
} from "../types";
import IPhoneMockup from "./IPhoneMockup";
import SubscriptionModal from "./SubscriptionModal";
import { apiFetch } from "../utils/api";
import { useSubscription } from "../hooks/useSubscription";
import StatsTab from "./dashboard-tabs/StatsTab";
import DesignTab from "./dashboard-tabs/DesignTab";
import QrCodeTab from "./dashboard-tabs/QrCodeTab";
import TicketsTab from "./dashboard-tabs/TicketsTab";

const fetch = apiFetch;

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

type DashboardTab = "stats" | "design" | "qrcode" | "tickets";

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateToAdmin?: () => void;
  initialTab?: DashboardTab;
}

export default function UserDashboard({
  user,
  onLogout,
  onNavigateToAdmin,
  initialTab,
}: UserDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const validTabs: DashboardTab[] = ["stats", "design", "qrcode", "tickets"];
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    initialTab && validTabs.includes(initialTab) ? initialTab : "stats"
  );

  // تغییر تب URL رو هم عوض می‌کنه
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    navigate(`/dashboard/${user.username}/${tab}`, { replace: true });
  };

  // وضعیت اشتراک کاربر (برای تصمیم‌گیری دکمه «پلن حرفه‌ای» در تب طراحی)
  const {
    subscription,
    loading: subscriptionLoading,
    isPro,
    refetch: refetchSubscription,
  } = useSubscription();

  // ─── مودال خرید/تمدید اشتراک — سراسری در سطح داشبورد ─────────────────────
  // این مودال مستقل از تب فعال است، پس با کلیک روی «خرید»/«تمدید» در هر تبی
  // (آمار، طراحی و ...) بلافاصله و در همان صفحه باز می‌شود، بدون جابجایی تب.
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // اگر از مسیر «/editor-pro/:username» بدون اشتراک فعال به داشبورد هدایت
  // شده باشیم، این پاپ‌آپ باید به‌صورت خودکار باز شود.
  useEffect(() => {
    if ((location.state as any)?.openSubscriptionModal) {
      setShowSubscriptionModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Card customization stats
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Announcements and advertising banners loaded from administrator
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);
  const [banners, setBanners] = useState<AdvertisingBanner[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<
    string[]
  >([]);

  // Tickets States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  // ref برای اسکرول خودکار به آخرین پیام
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── WebSocket: real-time تیکت‌ها ──────────────────────────────────────────
  useTicketSocket({
    role: "user",
    activeTicketId: activeTicket?.id,
    onMessage: (msg) => {
      if (msg.type === "new_message" && activeTicket && msg.ticketId === activeTicket.id) {
        // پیام جدید رو به تیکت فعال اضافه می‌کنیم
        setActiveTicket(prev => prev ? {
          ...prev,
          status: msg.newStatus as any,
          messages: [...prev.messages, msg.message],
        } : prev);
        setTickets(prev => prev.map(t =>
          t.id === msg.ticketId
            ? { ...t, status: msg.newStatus as any, messages: [...t.messages, msg.message] }
            : t
        ));
        // اسکرول به آخر
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    },
  });

  // اسکرول به آخرین پیام وقتی تیکت عوض می‌شه
  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [activeTicket?.id]);

  // Simulated drag and drop uploads progress state
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [dragActive, setDragActive] = useState<{ [key: string]: boolean }>({});
  const [openDesignSection, setOpenDesignSection] = useState<string | null>(
    "design",
  );

  const DAYS_OF_WEEK = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
  ];

  // Fetch initial Card details and messages
  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Fetch User Card
      const cardRes = await apiFetch(`/api/user/card/${user.username}`);
      if (cardRes.ok) {
        const data = await cardRes.json();
        setCardData(data);
      } else {
        if (cardRes.status === 401 || cardRes.status === 410) {
          // Token expired or invalid, auto logout to avoid dead-end loops
          onLogout();
          return;
        }
        const errorData = await cardRes.json().catch(() => ({}));
        setErrorMsg(
          errorData.message || "خطا در دریافت اطلاعات کارت ویزیت از سرور.",
        );
      }

      // 2. Fetch Tickets
      const ticketsRes = await apiFetch(`/api/user/${user.username}/tickets`);
      if (ticketsRes.ok) {
        const t = await ticketsRes.json();
        setTickets(t);
      }

      // 3. Fetch public announcements
      const annRes = await apiFetch("/api/announcements");
      if (annRes.ok) {
        const a = await annRes.json();
        setAnnouncements(a);
      }

      // 4. Fetch advertising banners
      const banRes = await apiFetch("/api/banners");
      if (banRes.ok) {
        const b = await banRes.json();
        setBanners(b);
      }
    } catch (e) {
      console.error("Error loading panel data", e);
      setErrorMsg(
        "خطای ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی نمایید.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async () => {
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
        setFeedback("تغییرات با موفقیت ذخیره و در آدرس عمومی اعمال شد! 🎉");
        // refresh stats
        setTimeout(() => setFeedback(""), 4000);
      } else {
        setFeedback("خطا در ذخیره‌سازی اطلاعات کارت.");
      }
    } catch (err) {
      setFeedback("عدم دسترسی به پایگاه داده.");
    } finally {
      setSaveLoading(false);
    }
  };

  // آپلود واقعی فایل به سرور — URL برمی‌گرده نه base64
  const uploadImageToServer = async (
    file: File,
    targetKey: string,
    callback: (url: string) => void,
  ) => {
    setUploadProgress((prev) => ({ ...prev, [targetKey]: 10 }));
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      setUploadProgress((prev) => ({ ...prev, [targetKey]: 80 }));
      if (res.ok) {
        const data = await res.json();
        setUploadProgress((prev) => ({ ...prev, [targetKey]: 100 }));
        callback(data.url);
        setTimeout(() => {
          setUploadProgress((prev) => {
            const copy = { ...prev };
            delete copy[targetKey];
            return copy;
          });
        }, 1000);
      } else {
        setUploadProgress((prev) => { const c = { ...prev }; delete c[targetKey]; return c; });
        alert("خطا در آپلود تصویر. لطفاً دوباره تلاش کنید.");
      }
    } catch {
      setUploadProgress((prev) => { const c = { ...prev }; delete c[targetKey]; return c; });
      alert("خطا در اتصال به سرور.");
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragActive((prev) => ({ ...prev, [id]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragActive((prev) => ({ ...prev, [id]: false }));
  };

  const handleDrop = (
    e: React.DragEvent,
    id: string,
    callback: (url: string) => void,
  ) => {
    e.preventDefault();
    setDragActive((prev) => ({ ...prev, [id]: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadImageToServer(e.dataTransfer.files[0], id, callback);
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    callback: (url: string) => void,
  ) => {
    if (e.target.files && e.target.files[0]) {
      uploadImageToServer(e.target.files[0], id, callback);
    }
  };

  // Ticket creation trigger
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle || !newTicketDesc) return;
    try {
      const res = await apiFetch(`/api/user/${user.username}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTicketTitle,
          description: newTicketDesc,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets((prev) => [...prev, data.ticket]);
        setActiveTicket(data.ticket);
        setNewTicketTitle("");
        setNewTicketDesc("");
        setShowCreateTicketModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Chat reply trigger
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage || !activeTicket) return;

    try {
      const res = await apiFetch(
        `/api/user/${user.username}/tickets/${activeTicket.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: chatMessage }),
        },
      );
      if (res.ok) {
        // پیام ارسال شد — WebSocket خودش state رو آپدیت می‌کنه
        // فقط input رو خالی می‌کنیم
        setChatMessage("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Request QR code approval trigger
  const handleRequestQrCode = async () => {
    try {
      const res = await apiFetch(`/api/user/${user.username}/qr-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        user.qrRequestStatus = "pending";
        // recheck
        fetchInitialData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Inline modifications of deep CardData state
  const editBasic = (key: string, val: any) => {
    if (!cardData) return;
    setCardData({ ...cardData, [key]: val });
  };

  const editSocial = (key: string, val: string) => {
    if (!cardData) return;
    setCardData({
      ...cardData,
      socials: { ...cardData.socials, [key]: val },
    });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert("لینک کپی شد");
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-5 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">
          خطا در همگام‌سازی پنل کاربری
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
          {errorMsg}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={fetchInitialData}
            className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </button>
          <button
            onClick={onLogout}
            className="py-2.5 px-5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            خروج از حساب
          </button>
        </div>
      </div>
    );
  }

  if (loading || !cardData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">
          در حال همگام سازی پنل کاربری...
        </p>
      </div>
    );
  }

  // suspension block
  if (user.isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 animate-bounce">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-extrabold text-white">
          حساب کاربری شما موقتا تعلیق شده است
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          دسترسی شما به کنترل کارت قطع شده است. در صورت نیاز به بررسی علت، می
          توانید از طریق تیکت های پشتیبانی زیر با مدیریت وبسایت گفتگو نمایید.
        </p>

        {/* Support panel inline in suspend mode */}
        <div className="w-full max-w-4xl mt-8 glass-effect rounded-2xl p-6 text-right">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h3 className="font-bold text-lg text-white">
              تیکت های پشتیبانی (حالت تعلیق)
            </h3>
            <button
              onClick={() => setShowCreateTicketModal(true)}
              className="py-2 px-4 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              افزودن تیکت جدید
            </button>
          </div>
          {/* List + mini chats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-2 max-h-[350px] overflow-y-auto">
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  تیکتی یافت نشد
                </p>
              ) : (
                tickets
                  .slice()
                  .sort((a, b) => b.id.localeCompare(a.id))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className={`w-full p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                        activeTicket?.id === t.id
                          ? "bg-blue-600/10 border-blue-500/40 text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-200">
                        {t.title}
                      </span>
                      <span className="text-[10px] opacity-75 mt-1">
                        {t.createdAt}
                      </span>
                    </button>
                  ))
              )}
            </div>
            <div className="md:col-span-2 bg-slate-950/60 rounded-xl p-4 min-h-[300px] flex flex-col justify-between">
              {activeTicket ? (
                <>
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] p-2">
                    {activeTicket.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`p-2.5 rounded-xl max-w-[80%] text-xs ${m.sender === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-800 text-slate-200 rounded-bl-none"}`}
                        >
                          <p>{m.message}</p>
                          <span className="block text-[8px] opacity-60 mt-1 text-left">
                            {m.createdAt}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {activeTicket.status !== "ended" ? (
                    <form
                      onSubmit={handleSendChatMessage}
                      className="flex gap-2 mt-4 pt-2 border-t border-slate-800"
                    >
                      <input
                        type="text"
                        placeholder="پیام خود را بنویسید..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 outline-none"
                      />
                      <button
                        type="submit"
                        className="py-2 px-4 bg-blue-600 text-white rounded-lg text-xs font-bold"
                      >
                        ارسال
                      </button>
                    </form>
                  ) : (
                    <p className="text-center text-[10px] text-red-500 py-2">
                      مکالمه پایان یافته است
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500 text-center my-auto">
                  یک تیکت را برای شروع گفتگو انتخاب کنید
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      {/* 1. SIDEBAR CONTAINER (Hidden on mobile, except maybe User Header) */}
      <aside className="hidden md:flex w-80 bg-white border-l border-slate-200/80 p-6 flex-col justify-between shadow-sm sticky top-0 h-screen z-20">
        <div className="space-y-8">
          {/* User Meta header */}
          <div className="flex items-center gap-3.5 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-lg shadow-md shadow-blue-200">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">
                {user.fullName}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          {/* Sidebar Menu Options */}
          <nav className="space-y-1.5">
            <button
              onClick={() => handleTabChange("stats")}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${
                activeTab === "stats"
                  ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>داشبورد و آمارها</span>
            </button>

            <button
              onClick={() => handleTabChange("design")}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${
                activeTab === "design"
                  ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Palette className="w-4.5 h-4.5" />
              <span>طراحی و ویرایش کارت</span>
            </button>

            <button
              onClick={() => handleTabChange("qrcode")}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${
                activeTab === "qrcode"
                  ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <QrCode className="w-4.5 h-4.5" />
              <span>کیوآرکد و راهنما</span>
            </button>

            <button
              onClick={() => handleTabChange("tickets")}
              className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-bold transition-all ${
                activeTab === "tickets"
                  ? "bg-blue-50 text-blue-600 shadow-sm shadow-blue-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span>تیکت پشتیبانی</span>
            </button>
          </nav>
        </div>

        {/* Logout & admin switch options */}
        <div className="pt-6 border-t border-slate-100 space-y-2 mt-6 md:mt-0">
          {user.username === "admin" && onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-650 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all text-center"
            >
              ورود به پنل مدیریت کل سایت
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-all animate-none cursor-pointer border-none outline-none"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>خروج از حساب کاربری</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200/80 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-sm shadow-sm">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800">
              {user.fullName}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-red-50 text-red-500"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* 2. CHIEF WORKSPACE CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-[calc(100vh-140px)] md:max-h-screen pb-24 md:pb-8">
        {/* Top Header Ad Banner (Banner 1) */}
        {banners.length > 0 && banners[0] && banners[0].imageUrl && (
          <a
            href={banners[0].link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-16 md:h-24 bg-white rounded-2xl overflow-hidden mb-6 border border-slate-200/80 shadow-sm relative group cursor-pointer transition hover:opacity-95"
          >
            <img
              src={banners[0].imageUrl}
              className="w-full h-full object-cover"
              alt={banners[0].title || "Advertisement"}
              title={banners[0].title}
            />
          </a>
        )}

        {/* Global Banner Announcement if active from admin */}
        {announcements
          .filter((a) => !dismissedAnnouncements.includes(a.id))
          .map((ann) => (
            <div
              key={ann.id}
              className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200/60 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between text-right"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  <img src={ann.image} className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                    <Megaphone className="w-3 h-3 text-amber-600" />
                    اطلاعیه مدیریت پلتفرم
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800">
                    {ann.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">
                    {ann.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setDismissedAnnouncements((prev) => [...prev, ann.id])
                }
                className="py-1.5 px-3 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-600 border border-slate-205 transition shadow-xs"
              >
                متوجه شدم
              </button>
            </div>
          ))}

        {/* Tab 1: DASHBOARD & REAL STATS */}
        {activeTab === "stats" && (
          <StatsTab
            user={user}
            cardData={cardData}
            banners={banners}
            handleCopyLink={handleCopyLink}
            subscription={subscription}
            subscriptionLoading={subscriptionLoading}
            isPro={isPro}
            onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
          />
        )}

        {/* Tab 2: THE SPLIT DESIGN WORKSPACE */}
        {activeTab === "design" && (
          <DesignTab
            user={user}
            cardData={cardData}
            setCardData={setCardData}
            saveLoading={saveLoading}
            feedback={feedback}
            handleSaveCard={handleSaveCard}
            openDesignSection={openDesignSection}
            setOpenDesignSection={setOpenDesignSection}
            uploadProgress={uploadProgress}
            dragActive={dragActive}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handleFileInputChange={handleFileInputChange}
            editBasic={editBasic}
            editSocial={editSocial}
            isPro={isPro}
            subscriptionLoading={subscriptionLoading}
            onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
          />
        )}

        {activeTab === "qrcode" && (
          <QrCodeTab
            user={user}
            handleRequestQrCode={handleRequestQrCode}
            handleCopyLink={handleCopyLink}
          />
        )}

        {activeTab === "tickets" && (
          <TicketsTab
            tickets={tickets}
            activeTicket={activeTicket}
            setActiveTicket={setActiveTicket}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            handleSendChatMessage={handleSendChatMessage}
            setShowCreateTicketModal={setShowCreateTicketModal}
          />
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200/80 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 z-30 flex justify-between items-center">
        <button
          onClick={() => handleTabChange("stats")}
          className={`flex flex-col items-center gap-1.5 p-1 flex-1 transition-all ${
            activeTab === "stats"
              ? "text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <LayoutDashboard
            className={`w-5 h-5 ${activeTab === "stats" ? "fill-blue-100/50" : ""}`}
          />
          <span className="text-[9px] font-bold">داشبورد</span>
        </button>

        <button
          onClick={() => handleTabChange("design")}
          className={`flex flex-col items-center gap-1.5 p-1 flex-1 transition-all ${
            activeTab === "design"
              ? "text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Palette
            className={`w-5 h-5 ${activeTab === "design" ? "fill-blue-100/50" : ""}`}
          />
          <span className="text-[9px] font-bold">طراحی کارت</span>
        </button>

        <button
          onClick={() => handleTabChange("qrcode")}
          className={`flex flex-col items-center gap-1.5 p-1 flex-1 transition-all ${
            activeTab === "qrcode"
              ? "text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <QrCode
            className={`w-5 h-5 ${activeTab === "qrcode" ? "fill-blue-100/50" : ""}`}
          />
          <span className="text-[9px] font-bold">کیوآرکد</span>
        </button>

        <button
          onClick={() => handleTabChange("tickets")}
          className={`flex flex-col items-center gap-1.5 p-1 flex-1 transition-all ${
            activeTab === "tickets"
              ? "text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MessageSquare
            className={`w-5 h-5 ${activeTab === "tickets" ? "fill-blue-100/50" : ""}`}
          />
          <span className="text-[9px] font-bold">پشتیبانی</span>
        </button>
      </nav>

      {/* 3. TICKET CREATION MODAL */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
          <div className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 text-right space-y-4 animate-scaleUp">
            <h3 className="font-extrabold text-base text-slate-900 border-r-4 border-blue-600 pr-2">
              ثبت و ارسال تیکت جدید به پشتیبانی
            </h3>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">
                  موضوع یا عنوان تیکت :
                </label>
                <input
                  type="text"
                  placeholder="مثال: سوال در مورد چاپ کارت فیزیکی"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-650">
                  جزییات و شرح تیکت :
                </label>
                <textarea
                  rows={4}
                  placeholder="مشخصات و سوال خود را کامل شرح دهید..."
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-3 text-xs text-slate-800 outline-none resize-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTicketModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow cursor-pointer"
                >
                  ارسال تیکت به سرور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. مودال سراسری خرید/تمدید اشتراک — مستقل از تب فعال */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        user={user}
        onPurchased={refetchSubscription}
      />
    </div>
  );
}
