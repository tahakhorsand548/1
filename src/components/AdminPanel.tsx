import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTicketSocket } from "../hooks/useTicketSocket";
import { CreditCard } from "lucide-react";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  QrCode,
  MessageSquare,
  Megaphone,
  Image,
  Edit,
  RotateCcw,
  Trash,
  UserX,
  UserCheck,
  ArrowLeft,
  RefreshCw,
  Plus,
  Clock,
  ExternalLink,
  ShieldAlert,
  Save,
  Eye,
  CheckCircle,
  Info,
  UploadCloud,
} from "lucide-react";
import { User, Ticket, GlobalAnnouncement } from "../types";
import { apiFetch, setAuthToken } from "../utils/api";
import QRCode from "qrcode";
import { Trash2 } from "lucide-react";

// const fetch = apiFetch;

type AdminTab = "desk" | "users" | "qr" | "tickets" | "announcements" | "banners";

interface AdminPanelProps {
  onBypassLogin: (username: string) => void;
  onLogout: () => void;
  onCloseAdmin: () => void;
  initialTab?: AdminTab;
}

export default function AdminPanel({
  onBypassLogin,
  onLogout,
  onCloseAdmin,
  initialTab,
}: AdminPanelProps) {
  const navigate = useNavigate();
  const validTabs: AdminTab[] = ["desk", "users", "qr", "tickets", "announcements", "banners"];
  const [activeTab, setActiveTab] = useState<AdminTab>(
    initialTab && validTabs.includes(initialTab) ? initialTab : "desk"
  );

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate("/admin/" + tab, { replace: true });
  };
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // States
  const [deskStats, setDeskStats] = useState({
    totalCustomers: 0,
    cardsWithQr: 0,
    totalVisits: 0,
  });
  //serch user
  const [userSearch, setUserSearch] = useState("");


  const [usersList, setUsersList] = useState<User[]>([]);

const filteredUsers = usersList.filter((u) => {
  const search = userSearch.toLowerCase().trim();

  return (
    u.fullName?.toLowerCase().includes(search) ||
    u.username?.toLowerCase().includes(search) ||
    u.email?.toLowerCase().includes(search) ||
    u.phone?.toLowerCase().includes(search)
  );
});


  const [qrRequests, setQrRequests] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<Ticket[]>([]);
  const [announcements, setAnnouncements] = useState<GlobalAnnouncement[]>([]);


  // Selected for edits / modals
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [selectedQrUser, setSelectedQrUser] = useState<any | null>(null);
  const [uploadedQrBase64, setUploadedQrBase64] = useState("");
  const [simulatingUpload, setSimulatingUpload] = useState(false);

  // Chat window
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [adminResponse, setAdminResponse] = useState("");

  // Announcements inputs
  const [annTitle, setAnnTitle] = useState("");
  const [annDesc, setAnnDesc] = useState("");
  const [annImage, setAnnImage] = useState("");

  // Advertising inputs
  const [adBanner1, setAdBanner1] = useState("");
  const [adBanner2, setAdBanner2] = useState("");
  const [adBanner3, setAdBanner3] = useState("");


  // تایید خرید کاربران

  const [subscriptionPurchases, setSubscriptionPurchases] = React.useState<any[]>([]);


  // ─── WebSocket: real-time تیکت‌ها (بعد از همه useState ها) ─────────────────
  useTicketSocket({
    role: "admin",
    onMessage: (msg) => {
      if (msg.type === "new_message") {
        setActiveTicket((prev: any) => {
          if (prev && prev.id === msg.ticketId) {
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            return { ...prev, status: msg.newStatus, messages: [...prev.messages, msg.message] };
          }
          return prev;
        });
        setTicketsList((prev: any[]) => prev.map((t: any) =>
          t.id === msg.ticketId ? { ...t, status: msg.newStatus } : t
        ));
      }
      if (msg.type === "ticket_updated") {
        setTicketsList((prev: any[]) => prev.map((t: any) =>
          t.id === msg.ticketId ? { ...t, status: msg.newStatus } : t
        ));
      }
      if (msg.type === "new_ticket") {
        setTicketsList((prev: any[]) => [msg.ticket, ...prev]);
      }
    },
  });

  // اسکرول به آخرین پیام
  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [activeTicket?.id]);

  // Banners Links & Titles
  const [adLink1, setAdLink1] = useState("");
  const [adLink2, setAdLink2] = useState("");
  const [adLink3, setAdLink3] = useState("");
  const [adTitle1, setAdTitle1] = useState("");
  const [adTitle2, setAdTitle2] = useState("");
  const [adTitle3, setAdTitle3] = useState("");

  // آپلود تصویر ادمین به سرور
  const uploadToServer = async (
    file: File,
    callback: (url: string) => void,
  ) => {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        callback(data.url);
      } else {
        alert("خطا در آپلود تصویر.");
      }
    } catch {
      alert("خطا در اتصال به سرور.");
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (url: string) => void,
  ) => {
    if (e.target.files && e.target.files[0]) {
      uploadToServer(e.target.files[0], callback);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // 1. Stats desk
      const statsRes = await apiFetch("/api/admin/stats");
      if (!statsRes.ok) {
        if (
          statsRes.status === 401 ||
          statsRes.status === 410 ||
          statsRes.status === 403
        ) {
          setErrorMsg(
            "توکن امنیتی شما منقضی یا دسترسی تایید نشده است. لطفا مجددا وارد حساب ادمین شوید.",
          );
          return;
        }
        setErrorMsg(
          `خطایی در اتصال به سرور ادمین رخ داده است. کد خطا: ${statsRes.status}`,
        );
        return;
      }
      const stats = await statsRes.json();
      setDeskStats(stats);

      // 2. Users
      const usersRes = await apiFetch("/api/admin/users");
      if (!usersRes.ok) {
        setErrorMsg(
          `خطا در ارزیابی و دریافت لیست کاربران. کد خطا: ${usersRes.status}`,
        );
        return;
      }
      const u = await usersRes.json();
      setUsersList(u);

      // 3. QR Requests
      const qrRes = await apiFetch("/api/admin/qr-requests");
      if (!qrRes.ok) {
        setErrorMsg(
          `خطا در ارزیابی درخواست‌های کیوآرکد. کد خطا: ${qrRes.status}`,
        );
        return;
      }
      const qr = await qrRes.json();
      setQrRequests(qr);

      // 4. Tickets List
      const ticketsRes = await apiFetch("/api/admin/tickets");
      if (!ticketsRes.ok) {
        setErrorMsg(
          `خطا در ارزیابی تیکت‌های پشتیبانی. کد خطا: ${ticketsRes.status}`,
        );
        return;
      }
      const t = await ticketsRes.json();
      setTicketsList(t);

      // 5. Announcements
      const annRes = await apiFetch("/api/announcements");
      if (annRes.ok) {
        const ann = await annRes.json();
        setAnnouncements(ann);
      }

      // 6. Banners
      const bannersRes = await apiFetch("/api/banners");
      if (bannersRes.ok) {
        const ban = await bannersRes.json();
        if (ban && ban.length >= 3) {
          setAdBanner1(ban[0].imageUrl);
          setAdTitle1(ban[0].title || "");
          setAdLink1(ban[0].link || "");
          setAdBanner2(ban[1].imageUrl);
          setAdTitle2(ban[1].title || "");
          setAdLink2(ban[1].link || "");
          setAdBanner3(ban[2].imageUrl);
          setAdTitle3(ban[2].title || "");
          setAdLink3(ban[2].link || "");
        }
      }
      // 7. Subscription Purchases
      const purchasesRes = await fetch("/api/admin/subscription-purchases", {
        credentials: "include",
      });

      if (purchasesRes.ok) {
        const purchases = await purchasesRes.json();
        setSubscriptionPurchases(purchases);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("خطای فنی در برقراری ارتباط با پلتفرم ادمین.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await apiFetch(
        `/api/admin/users/${editingUser.username}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: editFullName,
            email: editEmail,
            phone: editPhone,
            password: editPassword || undefined,
          }),
        },
      );
      if (res.ok) {
        alert("مشخصات کاربر با موفقیت تغییر یافت.");
        setEditingUser(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetUserCard = async (username: string) => {
    if (
      !confirm(
        "آیا مایلید تمام تنظیمات بصری، ساعت، گالری و آمار این کارت صفر و ریست شود؟",
      )
    )
      return;
    try {
      const res = await apiFetch(`/api/admin/users/${username}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        alert("کارت کاربر ریست شد.");
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (
      !confirm(
        "آیا مایلید این حساب کاربری را به طور کامل و بدون بازگشت حذف کنید؟",
      )
    )
      return;
    try {
      const res = await apiFetch(`/api/admin/users/${username}/delete`, {
        method: "POST",
      });
      if (res.ok) {
        alert("حساب کاربر کلا از سرور حذف شد.");
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSuspend = async (username: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${username}/toggle-suspend`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBypassUserLogin = async (username: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${username}/bypass-login`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          setAuthToken(data.token);
        }
        onBypassLogin(username);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // QR approval mock image generation & approval saving
  const handleUploadApprovedQr = async (file: File) => {
    setSimulatingUpload(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setUploadedQrBase64(data.url);
      } else {
        alert("خطا در آپلود QR.");
      }
    } catch {
      alert("خطا در اتصال.");
    } finally {
      setSimulatingUpload(false);
    }
  };

  // تولید QR به صورت محلی (بدون نیاز به سرویس خارجی) و ذخیره دائمی روی سرور
  const generateAutoQrForUser = async () => {
    if (!selectedQrUser) return;
    setSimulatingUpload(true);
    try {
      const url = `${window.location.origin}/card/${selectedQrUser.username}?source=scan`;

      // ساخت QR در همین مرورگر — هیچ درخواستی به سرویس خارجی نمی‌ره
      const dataUrl = await QRCode.toDataURL(url, {
        width: 500,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      // تبدیل base64 به File تا بشه با همون endpoint آپلود فرستاد
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `qr-${selectedQrUser.username}.png`, { type: "image/png" });

      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch("/api/admin/upload", { method: "POST", body: formData });

      if (res.ok) {
        const data = await res.json();
        // حالا یه URL دائمی روی دیسک خودمون داریم — نه لینک به goqr.me
        setUploadedQrBase64(data.url);
      } else {
        alert("خطا در ذخیره‌سازی کیوآرکد روی سرور.");
      }
    } catch (err) {
      console.error(err);
      alert("خطا در تولید کیوآرکد.");
    } finally {
      setSimulatingUpload(false);
    }
  };

  const handleApproveQrRequest = async () => {
    if (!selectedQrUser || !uploadedQrBase64) return;
    try {
      const res = await apiFetch(
        `/api/admin/qr-requests/${selectedQrUser.username}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrImageUrl: uploadedQrBase64 }),
        },
      );
      if (res.ok) {
        alert("کیوآرکد رسمی با موفقیت بارگذاری و فعال گردید.");
        setSelectedQrUser(null);
        setUploadedQrBase64("");
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Support chat reply trigger
  const handleAdminSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminResponse || !activeTicket) return;

    try {
      // Send chat message
      const res = await apiFetch(
        `/api/user/${activeTicket.username}/tickets/${activeTicket.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: adminResponse, sender: "support" }),
        },
      );
      if (res.ok) {
        // WebSocket خودش پیام رو به state اضافه می‌کنه
        // فقط input رو خالی می‌کنیم
        setAdminResponse("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTicketStatus = async (
    ticketId: string,
    status: "read" | "under_review" | "ended",
  ) => {
    try {
      const res = await apiFetch(`/api/admin/tickets/${ticketId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        alert("وضعیت تیکت تغییر یافت.");
        if (activeTicket && activeTicket.id === ticketId) {
          setActiveTicket({ ...activeTicket, status });
        }
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Announcements trigger
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annDesc) return;
    try {
      const res = await apiFetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annTitle,
          description: annDesc,
          image: annImage,
        }),
      });
      if (res.ok) {
        alert("اعلان همگانی هم‌اکنون برای تمام کاربران منتشر شد.");
        setAnnTitle("");
        setAnnDesc("");
        setAnnImage("");
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      const res = await apiFetch(`/api/admin/announcements/${annId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("اعلان حذف شد.");
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ads banners customization trigger
  const handleSaveAdsBanners = async () => {
    try {
      const res = await apiFetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banner1: adBanner1,
          title1: adTitle1,
          link1: adLink1,
          banner2: adBanner2,
          title2: adTitle2,
          link2: adLink2,
          banner3: adBanner3,
          title3: adTitle3,
          link3: adLink3,
        }),
      });
      if (res.ok) {
        alert("بنرهای تبلیغاتی با موفقیت ذخیره شدند.");
        fetchAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">در حال لود پنل ادمین پلتفرم...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-5 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white">
          خطا در بارگذاری پنل مدیریت
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
          {errorMsg}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={fetchAdminData}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            تلاش مجدد
          </button>
          <button
            onClick={onLogout}
            className="py-2.5 px-5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            خروج از حساب ادمین
          </button>
        </div>
      </div>
    );
  }




      const approvePurchase = async (id: string) => {

        const res = await fetch(`/api/admin/subscription-purchases/${id}/approve`, {
          method: "POST",
          credentials: "include",
        });

        const data = await res.json();

        console.log(data);

        if (data.success) {
          await fetchAdminData();
        }

      };



      const deletePurchase = async (id: string) => {

        if (!confirm("این درخواست حذف شود؟")) return;

        const res = await fetch(
          `/api/admin/subscription-purchases/${id}/delete`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        const data = await res.json();

        if (!data.success) {
          alert("خطا");
          return;
        }

        fetchAdminData();

      };



  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row text-right">
      {/* Admin Sidebar options */}
      <aside className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-l border-slate-800 p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 pb-6 border-b border-slate-80s/60 select-none">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-50">
                پنل ادمین کانتینر
              </h3>
              <p className="text-[10px] text-slate-400">
                مدیریت هاب سرور و کاربران
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => handleTabChange("desk")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "desk"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>میز کار مدیریت (دسک)</span>
            </button>

            <button
              onClick={() => handleTabChange("users")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "users"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>مدیریت لایسنس و کاربران</span>
            </button>

            <button
              onClick={() => handleTabChange("qr")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "qr"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>درخواست های کیوآرکد</span>
            </button>

            <button
              onClick={() => handleTabChange("tickets")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "tickets"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>تیکت های کاربران</span>
            </button>

            <button
              onClick={() => handleTabChange("subscriptions")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "subscriptions"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>درخواست‌های اشتراک</span>
            </button>



            <button
              onClick={() => handleTabChange("announcements")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "announcements"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>اعلانات همگانی</span>
            </button>

            <button
              onClick={() => handleTabChange("banners")}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center gap-3 text-xs font-bold transition-all ${
                activeTab === "banners"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Image className="w-4 h-4" />
              <span>بنرهای تبلیغاتی</span>
            </button>
          </nav>
        </div>

        {/* Action button options */}
        <div className="pt-6 border-t border-slate-800 space-y-2 mt-6 md:mt-0">
          <button
            onClick={onCloseAdmin}
            className="w-full py-2 px-4 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition text-center"
          >
            برگشت به داشبورد ادیت کاربری
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2 px-4 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold transition text-center"
          >
            خروج از ادمین
          </button>
        </div>
      </aside>

      {/* Main Workspace container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {/* TAB 1: DESK STATS overview */}
        {activeTab === "desk" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white">
                میز کار و داشبورد کلی ادمین
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                آمار تحلیلی پلتفرم کارت ویزیت دیجیتال در سرور جاری را زیرنظر
                بگیرید.
              </p>
            </div>

            {/* Stats list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    تعداد کل مشتریان سایت :
                  </span>
                  <span className="text-2xl font-black text-white font-mono mt-1.5 block">
                    {deskStats.totalCustomers} کاربر
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    کارت های دارای کیوآرکد فعال :
                  </span>
                  <span className="text-2xl font-black text-white font-mono mt-1.5 block">
                    {deskStats.cardsWithQr} کارت
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <QrCode className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">
                    تعداد کل بازدید کارت ها :
                  </span>
                  <span className="text-2xl font-black text-white font-mono mt-1.5 block">
                    {deskStats.totalVisits} بازدید
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
                  <ExternalLink className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick alert notifications sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              {/* Ticket warnings Inbox */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-slate-300 block">
                  آخرین تیکت های بدون پاسخ کاربران :
                </span>
                {ticketsList.filter((t) => t.status !== "ended").length ===
                0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    تمامی تیکت های کاربران بررسی و بسته شده‌اند. ✅
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                    {ticketsList
                      .filter((t) => t.status !== "ended")
                      .slice()
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
                        >
                          <div>
                            <h4 className="font-bold text-slate-200">
                              {t.title}
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              کاربر: {t.username}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setActiveTicket(t);
                              handleTabChange("tickets");
                            }}
                            className="py-1 px-3 bg-indigo-600 text-white rounded text-[10px] font-bold"
                          >
                            پاسخ و تایید
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* QR alert inbox requests */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-slate-300 block">
                  اعلانات تقاضای فعالسازی کیوآرکد رسمی :
                </span>
                {qrRequests.filter((q) => q.qrRequestStatus === "pending")
                  .length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    هیچ درخواست کیوآرکد در صف بررسی وجود ندارد.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                    {qrRequests
                      .filter((q) => q.qrRequestStatus === "pending")
                      .map((q) => (
                        <div
                          key={q.username}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
                        >
                          <div>
                            <h4 className="font-bold text-slate-200">
                              برند: {q.fullName}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">
                              کاربر: {q.username} - زمان: {q.qrRequestTime}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedQrUser(q);
                              handleTabChange("qr");
                            }}
                            className="py-1 px-3 bg-emerald-600 text-white rounded text-[10px] font-bold"
                          >
                            آپلود کیوآرکد
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE USERS LICENSING MANAGER */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  مدیریت پروانه‌ها و مشتریان جاری
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  حساب ها را ویرایش، تعلیق، بازنشانی، یا با دور زدن لاگین به
                  آنها دسترسی پیدا کنید.
                </p>
              </div>
            </div>


            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="جستجو بر اساس نام، نام کاربری، ایمیل یا شماره تماس..."
                  className="
                    w-full
                    bg-slate-900
                    border border-slate-700
                    rounded-xl
                    py-3 pr-4 pl-4
                    text-white
                    placeholder:text-slate-500
                    focus:outline-none
                    focus:ring-2
                    focus:ring-blue-500
                    focus:border-blue-500
                  "
                />

                {userSearch && (
                  <button
                    onClick={() => setUserSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-400 whitespace-nowrap">
                {filteredUsers.length} کاربر یافت شد
              </div>
            </div>


            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 px-2">نام کامل</th>
                    <th className="pb-3 px-2">نام کاربری اختصاصی</th>
                    <th className="pb-3 px-2">آدرس ایمیل ثبت نامی</th>
                    <th className="pb-3 px-2">شماره تماس</th>
                    <th className="pb-3 px-2 text-center">
                      وضعیت حساب / فعالیت
                    </th>
                    <th className="pb-3 px-2 text-left">عملیات ادیمن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-6 text-slate-500"
                      >
                       هیچ کاربری با این مشخصات پیدا نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.username} className="hover:bg-slate-950/20">
                        <td className="py-3 px-2 text-slate-100 font-bold">
                          {u.fullName}
                        </td>
                        <td className="py-3 px-2 text-blue-400 font-mono">
                          {u.username}
                        </td>
                        <td className="py-3 px-2 text-slate-350 font-mono">
                          {u.email}
                        </td>
                        <td className="py-3 px-2 text-slate-350 font-mono">
                          {u.phone}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {u.isSuspended ? (
                            <span className="py-0.5 px-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-bold text-[10px]">
                              تعلیق شده 
                            </span>
                          ) : (
                            <span className="py-0.5 px-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold text-[10px]">
                              فعال 
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-left">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {/* Bypass click */}
                            <button
                              onClick={() => handleBypassUserLogin(u.username)}
                              className="py-1 px-2.5 bg-indigo-600 hover:brightness-110 text-white rounded text-[10px] font-bold flex items-center gap-1"
                              title="ورود به پنل کاربر بدون نیاز به پسورد"
                            >
                              <ExternalLink className="w-3 h-3" />
                              بای پس پنل
                            </button>

                            {/* Suspend toggle */}
                            <button
                              onClick={() => handleToggleSuspend(u.username)}
                              className={`py-1 px-2 text-white rounded text-[10px] font-bold ${
                                u.isSuspended
                                  ? "bg-emerald-600 hover:bg-emerald-550"
                                  : "bg-orange-600 hover:bg-orange-550"
                              }`}
                            >
                              {u.isSuspended ? "رفع تعلیق" : "تعلیق کارت"}
                            </button>

                            {/* Edit dialog */}
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditFullName(u.fullName);
                                setEditEmail(u.email);
                                setEditPhone(u.phone);
                                setEditPassword("");
                              }}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                              title="ویرایش مشخصات"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset database card */}
                            <button
                              onClick={() => handleResetUserCard(u.username)}
                              className="p-1 rounded bg-slate-800 text-amber-500 hover:text-amber-400"
                              title="ریست کارت به پیش فرض خام اولیه"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete account */}
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="p-1 rounded bg-red-650 text-red-200 hover:bg-red-700"
                              title="حذف کلی حساب"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM DECORATIVE QR CODE CUSTOMIZATIONS */}
        {activeTab === "qr" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                درخواست های طراحی کیوآرکد مشتریان
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                پس از طراحی کیوآرکد فیزیکی، تصویر ساخته شده را برای کاربر
                بارگذاری کنید تا در پنل او نمایش یابد.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-850">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lists requested queue */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 block pb-1">
                    لیست بررسی درخواست ها :
                  </span>
                  {qrRequests.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6">
                      هیچ کاربری تاکنون درخواستی برای کیوآرکد ثبت نکرده است.
                    </p>
                  ) : (
                    qrRequests.map((q) => (
                      <div
                        key={q.username}
                        className={`p-4 rounded-xl border flex items-center justify-between transition ${
                          selectedQrUser?.username === q.username
                            ? "bg-indigo-600/15 border-indigo-500"
                            : "bg-slate-950 border-slate-850"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-sm text-white">
                            {q.fullName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                            نام کاربری: {q.username}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-1">
                            زمان نیاز: {q.qrRequestTime}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {q.qrRequestStatus === "approved" ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                              APPROVED دائم
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full animate-pulse">
                              PENDING در انتظار
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedQrUser(q);
                              setUploadedQrBase64(q.qrImageUrl || "");
                            }}
                            className="py-1 px-3 bg-indigo-600 text-white rounded text-[10px] font-bold progress-bar"
                          >
                            مدیریت و آپلود
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Approve modal uploader */}
                <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 min-h-[300px] flex flex-col justify-between">
                  {selectedQrUser ? (
                    <div className="space-y-5">
                      <div className="border-b border-slate-800 pb-3">
                        <h4 className="font-extrabold text-sm text-yellow-300">
                          طراحی بارکد کارت: {selectedQrUser.fullName}
                        </h4>
                        <span className="text-xs text-slate-400 mt-1 block">
                          لینک کارت کاربر:{" "}
                          <a
                            href={`/card/${selectedQrUser.username}`}
                            target="_blank"
                            className="text-blue-400 underline"
                          >{`${window.location.host}/card/${selectedQrUser.username}`}</a>
                        </span>
                      </div>

                      {uploadedQrBase64 ? (
                        <div className="text-center p-4 bg-white rounded-xl inline-block mx-auto max-w-[200px]">
                          <img
                            src={uploadedQrBase64}
                            className="w-32 h-32 object-contain mx-auto"
                          />
                          <span className="text-[8px] text-slate-500 mt-1 block">
                            پیش نمایش بارکد آپلود شده
                          </span>
                        </div>
                      ) : (
                        <div className="w-full text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs text-wrap">
                          تصویری بارگذاری نشده است. می توانید به صورت خودکار
                          بارکد استاندارد تولید کنید یا خود فایل باکیفیت بنر
                          قرار دهید.
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                        {/* Auto builder */}
                        <button
                          onClick={generateAutoQrForUser}
                          disabled={simulatingUpload}
                          className="py-2 px-4 bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold rounded-lg transition"
                        >
                          تولید اتوماتیک کیوآرکد (پیشنهادی)
                        </button>
                        {/* Manual File input */}
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            id="adminQrFile"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadApprovedQr(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="adminQrFile"
                            className="w-full py-2 px-4 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-600/25 text-indigo-400 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <UploadCloud className="w-4 h-4" />
                            انتخاب فایل از دایرکتوریf
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={handleApproveQrRequest}
                        disabled={!uploadedQrBase64}
                        className="w-full py-3 bg-indigo-600 border border-indigo-500 text-white font-bold text-xs rounded-xl hover:brightness-110 active:scale-98 transition mt-4 disabled:opacity-50"
                      >
                        تایید نهایی و ارسال به پنل کاربر
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center py-10 space-y-2">
                      <QrCode className="w-12 h-12 text-slate-800" />
                      <h4 className="font-extrabold text-xs text-slate-400">
                        کاربری را انتخاب کنید
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        جهت قرار دادن عکس کیوآرکد رسمی، یک درخواست را از منوی
                        سمت راست برگزینید.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TICKETS CHAT HELPDESK */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                مرکز دپارتمان پاسخگویی تیکت ها (ادمین)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                با مشتریان گفتگو کنید و وضعیت تیکت ها را جهت مدیریت گردش های
                کاری تنظیم فرمایید.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Tickets list */}
              <div className="lg:col-span-1 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  صندوق تیکت ها :
                </span>
                {ticketsList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    تیکتی یافت نشد.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {ticketsList
                      .slice()
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTicket(t)}
                          className={`w-full p-4 rounded-xl border text-right transition flex flex-col justify-between ${
                            activeTicket?.id === t.id
                              ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-extrabold text-xs text-slate-100">
                              {t.title}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                t.status === "read"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : t.status === "under_review"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : "bg-slate-850 text-slate-500"
                              }`}
                            >
                              {t.status === "read"
                                ? "خوانده شد"
                                : t.status === "under_review"
                                  ? "در حال بررسی"
                                  : "بسته شده"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between w-full mt-3 text-[10px] opacity-75">
                            <span>کاربر: {t.username}</span>
                            <span className="font-mono">{t.createdAt}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Chat View */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[400px] flex flex-col justify-between">
                {activeTicket ? (
                  <div className="flex flex-col justify-between h-[420px]">
                    <div className="border-b border-sidebar border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-200">
                          {activeTicket.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 block">
                          ارسال کننده: {activeTicket.userFullName} (
                          {activeTicket.username})
                        </span>
                      </div>

                      {/* Status select switches */}
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            handleUpdateTicketStatus(activeTicket.id, "read")
                          }
                          className={`py-1 px-2.5 rounded text-[10px] font-bold ${
                            activeTicket.status === "read"
                              ? "bg-amber-600 text-white"
                              : "bg-slate-950 text-slate-500"
                          }`}
                        >
                          خوانده شد
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateTicketStatus(
                              activeTicket.id,
                              "under_review",
                            )
                          }
                          className={`py-1 px-2.5 rounded text-[10px] font-bold ${
                            activeTicket.status === "under_review"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-950 text-slate-500"
                          }`}
                        >
                          درحال بررسی
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateTicketStatus(activeTicket.id, "ended")
                          }
                          className={`py-1 px-2.5 rounded text-[10px] font-bold ${
                            activeTicket.status === "ended"
                              ? "bg-slate-800 text-slate-350"
                              : "bg-slate-950 text-slate-500 hover:text-red-400"
                          }`}
                        >
                          پایان چت با کاربر
                        </button>
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto space-y-4 py-4 px-2 my-2 scrollbar-none">
                      {activeTicket.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.sender === "support" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                              m.sender === "support"
                                ? "bg-indigo-600 text-white rounded-br-none font-bold"
                                : "bg-slate-950 text-slate-100 rounded-bl-none border border-slate-850"
                            }`}
                          >
                            <p>{m.message}</p>
                            <span className="block text-[8px] opacity-65 mt-1.5 font-mono text-left">
                              {m.createdAt}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat reply form */}
                    {activeTicket.status !== "ended" ? (
                      <form
                        onSubmit={handleAdminSendChat}
                        className="flex gap-2 border-t border-slate-800 pt-3 mt-1"
                      >
                        <input
                          type="text"
                          placeholder="پیام پاسخ خود را برای مجمع به کاربر بنویسید..."
                          value={adminResponse}
                          onChange={(e) => setAdminResponse(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-xs text-slate-200 outline-none"
                        />
                        <button
                          type="submit"
                          className="py-3 px-6 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition"
                        >
                          ارسال پاسخ
                        </button>
                      </form>
                    ) : (
                      <div className="p-3 bg-red-500/5 text-center rounded-xl text-xs text-red-400 font-bold">
                        تیکت بسته شده است. در صورت نیاز وضعیت را به فعال
                        برگردانید.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-center py-10 space-y-2">
                    <MessageSquare className="w-12 h-12 text-slate-700" />
                    <h4 className="font-extrabold text-xs text-slate-400">
                      تیکتی در فرآیند بررسی پلتفرم نیست
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      یک تیکت را برای شروع مشاوره پشتیبانی انتخاب کنید.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}





          {activeTab === "subscriptions" && (

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">

            <h2 className="text-xl font-bold text-white mb-6">
              درخواست‌های اشتراک
            </h2>

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b border-slate-700 text-slate-400">

                    <th className="py-3">کاربر</th>

                    <th>نام</th>

                    <th>پلن</th>

                    <th>مبلغ</th>

                    <th>وضعیت</th>

                    <th>تاریخ</th>

                    <th>رسید</th>

                    <th>عملیات</th>

                  </tr>

                </thead>

                <tbody>

                  {subscriptionPurchases.map((purchase) => (

                    <tr
                      key={purchase.id}
                      className="border-b border-slate-800 text-center hover:bg-slate-800/40 transition"
                    >

                      <td className="py-4">
                        {purchase.username}
                      </td>

                      <td>
                        {purchase.full_name}
                      </td>

                      <td>
                        {purchase.plan}
                      </td>

                      <td>
                        {purchase.amount.toLocaleString()} تومان
                      </td>

                      <td>

                        {purchase.payment_status === "pending" && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">
                        در انتظار
                      </span>
                    )}

                    {purchase.payment_status === "approved" && (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                        تایید شده
                      </span>
                    )}

                    {purchase.payment_status === "rejected" && (
                      <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs">
                        رد شده
                      </span>
)}

                      </td>

                      <td>

                        {new Date(purchase.created_at).toLocaleDateString("fa-IR")}

                      </td>

                      <td>
                      {purchase.receipt_image ? (
                        <a
                          href={purchase.receipt_image}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs"
                        >
                          مشاهده رسید
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                      <td>

                        {purchase.payment_status === "pending" && (
                        <button
                          onClick={() => approvePurchase(purchase.id)}
                          className="rounded-lg bg-green-600 px-3 py-2 text-white text-xs hover:bg-green-700"
                        >
                          تایید
                        </button>
                      )}

                        <button
                        onClick={() => deletePurchase(purchase.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                        title="حذف درخواست"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* TAB 5: PUBLIC ANNOUNCEMENTS (اعلانات همگانی) */}
        {activeTab === "announcements" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                مدیریت اعلانات همگانی سایت
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                متون هشداری یا آپدیت های سیستمی را برای تمام کاربران در بالای
                داشبوردشان نمایش دهید.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form poster */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-slate-300 block">
                  انتشار دکمه اعلان جدید :
                </span>

                <form onSubmit={handlePostAnnouncement} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400">
                      عنوان اصلی اعلان :
                    </label>
                    <input
                      type="text"
                      placeholder="بروزرسانی هسته کانتینر پلتفرم"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400">
                      توضیحات تکمیلی پیام :
                    </label>
                    <textarea
                      rows={3}
                      placeholder="متن پیام خود را بنویسید..."
                      value={annDesc}
                      onChange={(e) => setAnnDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400">
                      آدرس تصویر گرافیکی پس‌زمینه اعلان (اختیاری) :
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="بارگذاری فایل یا آدرس تصویر..."
                        value={annImage}
                        onChange={(e) => setAnnImage(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                      />
                      <label className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 w-10 h-10 rounded-xl cursor-pointer">
                        <UploadCloud className="w-4 h-4 text-slate-400" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileInputChange(e, setAnnImage)
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs rounded-xl transition"
                  >
                    منتشر کردن فوری اعلان
                  </button>
                </form>
              </div>

              {/* Announcements List to manage removal */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-slate-300 block">
                  لیست پیام های منتشر شده جاری :
                </span>
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    اعلانی منتشر نشده است
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
                      >
                        <div>
                          <h4 className="font-extrabold text-yellow-500">
                            {ann.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1 lines-clamp-2">
                            {ann.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 px-2.5 rounded bg-red-650 text-red-200 text-[10px] font-bold hover:bg-red-700"
                        >
                          حذف پیام
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADS BANNERS CONFIG CONTROL */}
        {activeTab === "banners" && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                مديريت بنرهاي تبليغاتي پورتال
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تصاویر گرافیکی اسلایدهای تبلیغاتی که در پنل داشبورد مشتریان ظاهر
                می شوند را ویرایش فرمایید.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="space-y-8">
                <div className="space-y-3 p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                  <div className="flex gap-4">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        تصویر بنر ۱ (هدر کوچک - ۲.۱:۱) :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adBanner1}
                          placeholder="آدرس اینترنتی یا بارگذاری فایل"
                          onChange={(e) => setAdBanner1(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                        />
                        <label className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 w-[38px] rounded-xl cursor-pointer">
                          <UploadCloud className="w-4 h-4 text-slate-400" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileInputChange(e, setAdBanner1)
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        عنوان و راهنما بنر ۱ :
                      </label>
                      <input
                        type="text"
                        value={adTitle1}
                        onChange={(e) => setAdTitle1(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        لینک مقصد بنر ۱ :
                      </label>
                      <input
                        type="text"
                        value={adLink1}
                        onChange={(e) => setAdLink1(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                      />
                    </div>
                  </div>
                  {adBanner1 && (
                    <img
                      src={adBanner1}
                      className="w-40 aspect-[2.1] object-cover rounded-lg mt-1 border border-white/5"
                    />
                  )}
                </div>

                <div className="space-y-3 p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                  <div className="flex gap-4">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        تصویر بنر ۲ (پایین آمار) :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adBanner2}
                          onChange={(e) => setAdBanner2(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                        />
                        <label className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 w-[38px] rounded-xl cursor-pointer">
                          <UploadCloud className="w-4 h-4 text-slate-400" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileInputChange(e, setAdBanner2)
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        عنوان و راهنما بنر ۲ :
                      </label>
                      <input
                        type="text"
                        value={adTitle2}
                        onChange={(e) => setAdTitle2(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        لینک مقصد بنر ۲ :
                      </label>
                      <input
                        type="text"
                        value={adLink2}
                        onChange={(e) => setAdLink2(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                      />
                    </div>
                  </div>
                  {adBanner2 && (
                    <img
                      src={adBanner2}
                      className="w-40 aspect-[2.1] object-cover rounded-lg mt-1 border border-white/5"
                    />
                  )}
                </div>

                <div className="space-y-3 p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                  <div className="flex gap-4">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        تصویر بنر ۳ (پایین آمار) :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adBanner3}
                          onChange={(e) => setAdBanner3(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                        />
                        <label className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 w-[38px] rounded-xl cursor-pointer">
                          <UploadCloud className="w-4 h-4 text-slate-400" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) =>
                              handleFileInputChange(e, setAdBanner3)
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        عنوان و راهنما بنر ۳ :
                      </label>
                      <input
                        type="text"
                        value={adTitle3}
                        onChange={(e) => setAdTitle3(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-slate-300">
                        لینک مقصد بنر ۳ :
                      </label>
                      <input
                        type="text"
                        value={adLink3}
                        onChange={(e) => setAdLink3(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl py-2 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                      />
                    </div>
                  </div>
                  {adBanner3 && (
                    <img
                      src={adBanner3}
                      className="w-40 aspect-[2.1] object-cover rounded-lg mt-1 border border-white/5"
                    />
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveAdsBanners}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-540 font-bold text-white text-xs rounded-xl shadow transition mt-4"
              >
                ثبت و اعمال بنرها برای تمامی اعضا
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4. USER DETAILS EDIT DIALOG MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-right space-y-4">
            <h3 className="font-extrabold text-base text-white border-r-4 border-indigo-500 pr-2">
              ویرایش مشخصات لایسنس: {editingUser.fullName}
            </h3>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  نام کامل تجاری :
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  آدرس ایمیل کاربر :
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  تلفن همراه :
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  تغییر پسورد یا رمز عبور (خالی بگذارید تا بدون تغییر بماند) :
                </label>
                <input
                  type="text"
                  placeholder="پسورد جدید..."
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-200 outline-none font-mono text-left"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="py-2.5 px-4 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl hover:text-white transition"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:brightness-110 transition"
                >
                  ذخیره مشخصات کاربری
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
