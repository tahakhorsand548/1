import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import AuthPages from "./components/AuthPages";
import UserDashboard from "./components/UserDashboard";
import AdminPanel from "./components/AdminPanel";
import CardPreview from "./components/CardPreview";
import ProEditorPage from "./components/ProEditorPage";
import { User } from "./types";
import { ShieldCheck, RefreshCw, QrCode, Globe, Info, CreditCard, Flame } from "lucide-react";
import { apiFetch, removeAuthToken, setAuthToken } from "./utils/api";
import { useSubscription } from "./hooks/useSubscription";
import logo from "../img/logo/logo-full.png";

// ─── Context برای اشتراک‌گذاری session بین همه صفحات ───────────────────────
interface AuthCtx {
  currentUser: User | null;
  sessionLoading: boolean;
  checkActiveSession: () => Promise<void>;
  handleLoginSuccess: (user: User) => void;
  handleLogout: () => Promise<void>;
}
export const AuthContext = React.createContext<AuthCtx>({} as AuthCtx);

// ─── Root Provider ────────────────────────────────────────────────────────────
// App فقط BrowserRouter رو wrap می‌کنه. منطق state و navigate باید
// زیر BrowserRouter باشه چون useNavigate نیاز به Router Context داره.
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const navigate = useNavigate();

  const checkActiveSession = async () => {
    setSessionLoading(true);
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.loggedIn) {
          if (data.token) setAuthToken(data.token);
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
          removeAuthToken();
        }
      } else {
        setCurrentUser(null);
        removeAuthToken();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => { checkActiveSession(); }, []);

  const handleLoginSuccess = (user: User) => setCurrentUser(user);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    removeAuthToken();
    setCurrentUser(null);
    // بعد از خروج، کاربر رو صریحاً به صفحه اصلی دامنه برمی‌گردونیم
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ currentUser, sessionLoading, checkActiveSession, handleLoginSuccess, handleLogout }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/card/:username" element={<PublicCardPage />} />
        <Route path="/dashboard/:username" element={<DashboardRoute />} />
        <Route path="/dashboard/:username/:tab" element={<DashboardRoute />} />
        <Route path="/editor-pro/:username" element={<ProEditorRoute />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/admin/:tab" element={<AdminRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthContext.Provider>
  );
}

// ─── صفحه عمومی کارت ─────────────────────────────────────────────────────────
function PublicCardPage() {
  const { username } = useParams<{ username: string }>();
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const source = params.get("source") || "link";
    apiFetch(`/api/card/${username}?source=${source}`)
      .then(async res => {
        const data = await res.json();
        if (res.ok) setCardData(data);
        else setError(data.message || "کارت یافت نشد.");
      })
      .catch(() => setError("خطای شبکه."))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <LoadingScreen text="در حال دریافت کارت ویزیت دیجیتال..." />;

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
        <Info className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-black text-slate-900">خطا در بارگذاری کارت</h2>
      <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">{error}</p>
      <button onClick={() => navigate("/")} className="mt-6 py-2 px-5 rounded-lg bg-blue-600 text-white font-bold text-xs">
        ورود به سایت کارتت
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center p-0 md:p-6">
      <div className="w-full max-w-md md:max-w-md h-full md:min-h-[850px] md:max-h-[90%] md:rounded-[40px] md:border-8 md:border-slate-900 md:shadow-2xl overflow-hidden relative scrollbar-none bg-white">
        <CardPreview data={cardData.cardData} username={cardData.username} isPreview={false} />
      </div>
    </div>
  );
}

// ─── محافظ مسیر داشبورد کاربر ────────────────────────────────────────────────
function DashboardRoute() {
  const { currentUser, sessionLoading, handleLogout, handleLoginSuccess } = React.useContext(AuthContext);
  const { username, tab } = useParams<{ username: string; tab?: string }>();
  const navigate = useNavigate();

  if (sessionLoading) return <LoadingScreen text="تأیید هویت کاربری در سرور..." />;

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <AuthPages onLoginSuccess={(user) => {
        handleLoginSuccess(user);
        navigate(user.username === "admin" ? "/admin" : `/dashboard/${user.username}`);
      }} initialMode="login" />
    </div>
  );

  // کاربر عادی نمی‌تونه داشبورد دیگری ببینه
  if (currentUser.username !== "admin" && username && currentUser.username !== username) {
    return <Navigate to={`/dashboard/${currentUser.username}`} replace />;
  }

  return (
    <UserDashboard
      user={currentUser}
      initialTab={tab as any}
      onLogout={handleLogout}
      onNavigateToAdmin={currentUser.username === "admin" ? () => navigate("/admin") : undefined}
    />
  );
}

// ─── محافظ مسیر «ادیتور پرو» ──────────────────────────────────────────────────
// این مینی‌اپ روی کل صفحه برنامه (بدون چیدمان داشبورد) باز می‌شود.
// قوانین دسترسی:
//   ۱. کاربر لاگین نیست              → صفحه ورود نمایش داده می‌شود
//   ۲. کاربر لاگین است ولی اشتراک ندارد → به تب طراحی هدایت می‌شود و پاپ‌آپ
//      خرید اشتراک به‌صورت خودکار باز می‌شود (از طریق location state)
//   ۳. کاربر اشتراک فعال دارد          → مینی‌اپ ادیتور پرو نمایش داده می‌شود
function ProEditorRoute() {
  const { currentUser, sessionLoading, handleLoginSuccess } = React.useContext(AuthContext);
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  if (sessionLoading) return <LoadingScreen text="در حال بررسی وضعیت ورود..." />;

  // ۱. کاربر لاگین نیست → باید اول به صفحه ورود برود
  if (!currentUser) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
        <AuthPages
          onLoginSuccess={(user) => {
            handleLoginSuccess(user);
            // بعد از ورود موفق، دوباره وارد همین مسیر ادیتور پرو می‌شویم
            navigate(`/editor-pro/${user.username}`, { replace: true });
          }}
          initialMode="login"
        />
        <p className="text-[10px] text-slate-400 mt-4 text-center font-bold">
          برای دسترسی به ادیتور پرو ابتدا باید وارد حساب کاربری خود شوید.
        </p>
      </div>
    </div>
  );

  // کاربر عادی نمی‌تواند ادیتور پرو کاربر دیگری را باز کند
  if (currentUser.username !== "admin" && username && currentUser.username !== username) {
    return <Navigate to={`/editor-pro/${currentUser.username}`} replace />;
  }

  return <ProEditorGate targetUser={currentUser} />;
}

// ─── بررسی اشتراک قبل از ورود به مینی‌اپ ادیتور پرو ───────────────────────────
function ProEditorGate({ targetUser }: { targetUser: User }) {
  const { subscription, loading, isPro } = useSubscription();

  if (loading) return <LoadingScreen text="در حال بررسی وضعیت اشتراک شما..." />;

  // ۲. اشتراک فعال ندارد → برگشت به تب طراحی + باز شدن خودکار پاپ‌آپ خرید اشتراک
  if (!isPro) {
    return (
      <Navigate
        to={`/dashboard/${targetUser.username}/design`}
        replace
        state={{ openSubscriptionModal: true }}
      />
    );
  }

  // ۳. اشتراک فعال دارد → ورود به مینی‌اپ ادیتور پرو
  return <ProEditorPage user={targetUser} subscription={subscription} />;
}

// ─── محافظ مسیر ادمین ────────────────────────────────────────────────────────
function AdminRoute() {
  const { currentUser, sessionLoading, checkActiveSession, handleLogout, handleLoginSuccess } = React.useContext(AuthContext);
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  if (sessionLoading) return <LoadingScreen text="در حال بررسی دسترسی..." />;

  if (!currentUser || currentUser.username !== "admin") return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-xl">
        <AuthPages onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          if (user.username === "admin") navigate("/admin");
        }} initialMode="login" />
        <p className="text-[10px] text-red-600 mt-4 text-center font-bold">فقط ادمین می‌تواند وارد این صفحه شود.</p>
      </div>
    </div>
  );

  return (
    <AdminPanel
      initialTab={tab as any}
      onBypassLogin={async (username) => {
        await checkActiveSession();
        navigate(`/dashboard/${username}`);
      }}
      onLogout={handleLogout}
      onCloseAdmin={() => navigate(`/dashboard/${currentUser.username}`)}
    />
  );
}

// ─── صفحه 404 ────────────────────────────────────────────────────────────────
function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 text-3xl font-black">۴۰۴</div>
      <h2 className="text-lg font-black text-slate-900 mb-2">صفحه مورد نظر یافت نشد</h2>
      <p className="text-xs text-slate-500 mb-6">آدرسی که وارد کردید در سیستم موجود نیست.</p>
      <button onClick={() => navigate("/")} className="py-2 px-6 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all">
        بازگشت به صفحه اصلی
      </button>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm text-slate-600 font-bold">{text}</p>
    </div>
  );
}

// ─── صفحه اصلی (Landing) ─────────────────────────────────────────────────────
function LandingPage() {
  const { currentUser, handleLoginSuccess } = React.useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <header className="border-b border-slate-200/80 bg-white py-2 px-6 md:px-12 flex justify-between items-center text-right shadow-sm sticky top-0 z-50">
        <div className="flex items-center">
<a
  href="https://kartt.ir"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center justify-center"
>
<img
  src={logo}
  alt="Kartet"
  className="h-40 w-auto object-contain -my-12 block"
/>
</a>
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <button
              onClick={() => navigate(currentUser.username === "admin" ? "/admin" : `/dashboard/${currentUser.username}`)}
              className="py-2 px-4 rounded-xl bg-blue-600 font-bold text-xs hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-100"
            >
              داشبورد کاربری من
            </button>
          ) : (
            <button
              onClick={() => navigate("/dashboard/login")}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold text-xs border border-transparent transition-all"
            >
              ورود / ثبت‌نام اعضا
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-right">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold leading-none">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>پیشروترین پلتفرم ساخت کارت ویزیت دیجیتال</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            کارت ویزیت کاغذی را فراموش کنید، <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-650">دیجیتالی بدرخشید!</span>
          </h1>
          <p className="text-sm md:text-base text-slate-500 leading-relaxed font-semibold">
           با کارتت بدون نیاز به دانش فنی، کارت ویزیت دیجیتال خود را بسازید و لینک اختصاصی دریافت کنید. اطلاعات، شبکه‌های اجتماعی، نمونه‌کار، محصولات، فایل‌ها و راه‌های ارتباطی را در یک صفحه حرفه‌ای قرار دهید.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={() => navigate(currentUser ? `/dashboard/${currentUser.username}` : "/dashboard/login")}
              className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/20 text-white text-sm font-black transition-all"
            >
              همین حالا رایگان بسازید!
            </button>
            <a href="/card/admin" className="py-3.5 px-6 rounded-xl bg-white border border-slate-200 text-slate-705 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <Globe className="w-4 h-4 text-blue-650" />
              مشاهده دمو کارت ها 
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
            <div><span className="text-xl font-black text-slate-800 font-mono block">Free</span><span className="text-[10px] text-slate-400 font-bold">کاملا رایگان برای همه کاربران</span></div>
            <div><span className="text-xl font-black text-slate-800 font-mono block">QR Code</span><span className="text-[10px] text-slate-400 font-bold">کیوآر کد اختاصی و رایگان</span></div>
            <div><span className="text-xl font-black text-slate-800 font-mono block">100%</span><span className="text-[10px] text-slate-400 font-bold">ویرایشگر ساده و کاربردی</span></div>
            <div><span className="text-xl font-black text-slate-800 font-mono block">۲۴ ساعته</span><span className="text-[10px] text-slate-400 font-bold">پشتیبانی آنلاین </span></div>
          </div>
        </div>
        <div className="bg-white p-2 rounded-[32px] border border-slate-200/80 shadow-xl relative">
          <AuthPages onLoginSuccess={(user) => {
            handleLoginSuccess(user);
            navigate(user.username === "admin" ? "/admin" : `/dashboard/${user.username}`);
          }} initialMode="register" />
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6 px-6 text-center text-[10px] text-slate-400 font-semibold">
        <p>© ۱۴۰۵ پلتفرم کارتت (Kartt) - کلیه حقوق مادی و معنوی محفوظ می باشد.</p>
      </footer>
    </div>
  );
}
