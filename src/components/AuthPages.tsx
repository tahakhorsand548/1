import React, { useState, useEffect } from "react";
import { User, Eye, EyeOff, ShieldCheck, Mail, Phone, UserPlus, Fingerprint, RefreshCw } from "lucide-react";
import { apiFetch, setAuthToken } from "../utils/api";
import logo from "../../img/logo/logo.png";

interface AuthPagesProps {
  onLoginSuccess: (user: any) => void;
  initialMode?: "login" | "register" | "forgot";
}

export default function AuthPages({ onLoginSuccess, initialMode = "login" }: AuthPagesProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  
  // Login States
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register States
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  
  // Register validations & live testing stats
  const [usernameStatus, setUsernameStatus] = useState<{ checked: boolean; valid: boolean; message: string }>({
    checked: false,
    valid: false,
    message: ""
  });
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1 or 2
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Check Username live lookup helper
  useEffect(() => {
    if (mode !== "register") return;
    if (!regUsername) {
      setUsernameStatus({ checked: false, valid: false, message: "" });
      return;
    }

    const timer = setTimeout(async () => {
      const uClean = regUsername.trim();
      if (!/^[a-zA-Z0-9]+$/.test(uClean)) {
        setUsernameStatus({ checked: true, valid: false, message: "فقط حروف انگلیسی و اعداد مجاز است" });
        return;
      }
      if (uClean.length <= 4 || uClean.length >= 10) {
        setUsernameStatus({ checked: true, valid: false, message: "نام کاربری باید بین ۵ تا ۹ کاراکتر باشد" });
        return;
      }
      try {
        const res = await apiFetch(`/api/auth/check-username/${uClean}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus({ checked: true, valid: true, message: "نام کاربری مجاز و آزاد است ✅" });
        } else {
          setUsernameStatus({ checked: true, valid: false, message: data.error || "این نام کاربری تکراری است ❌" });
        }
      } catch (e) {
        setUsernameStatus({ checked: true, valid: false, message: "خطا در بررسی نام کاربری" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [regUsername, mode]);

  // Handle Log In submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginId || !loginPassword) {
      setLoginError("لطفا شناسه کاربری و پسورد خود را تکمیل بفرمایید.");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          setAuthToken(data.token);
        }
        onLoginSuccess(data.user);
      } else {
        setLoginError(data.message || "اطلاعات ورود اشتباه است.");
      }
    } catch (err) {
      setLoginError("ارتباط با سرور برقرار نشد. لطفا بعدا مجددا اقدام فرمایید.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (!regFullName || !regUsername || !regEmail || !regPhone || !regPassword || !regConfirmPassword) {
      setRegError("لطفا تمامی فیلدهای فرم ثبت نام را تکمیل فرمایید.");
      return;
    }

    if (!usernameStatus.valid) {
      setRegError("نام کاربری وارد شده معتبر یا آزاد نمی باشد.");
      return;
    }

    if (!regEmail.toLowerCase().endsWith("@gmail.com")) {
      setRegError("آدرس ایمیل وارد شده باید با @gmail.com خاتمه یابد.");
      return;
    }

    if (!/^09\d{9}$/.test(regPhone)) {
      setRegError("شماره تلفن همراه باید با 09 شروع شده و ۱۱ رقم مجاز داشته باشد.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("رمز عبور با تکرار آن یکسان نمی باشد.");
      return;
    }

    setRegLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: regFullName,
          username: regUsername.trim().toLowerCase(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(data.message);
        if (data.token) {
          setAuthToken(data.token);
        }
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1500);
      } else {
        setRegError(data.message || "خطایی در ثبت نام پدیدار شد.");
      }
    } catch (err) {
      setRegError("اتصال سرور برقرار نشد.");
    } finally {
      setRegLoading(false);
    }
  };

  // Forgot password flow
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (forgotStep === 1) {
      if (!forgotEmail || !forgotPhone || !forgotUsername) {
        setForgotError("لطفا ایمیل، شماره تلفن و نام کاربری کارت خود را جهت تایید هویت ارائه نمایید.");
        return;
      }
      setForgotStep(2);
    } else {
      if (!forgotNewPassword || !forgotConfirmPassword) {
        setForgotError("لطفا رمز عبور جدید و تکرار آن را بنویسید.");
        return;
      }
      if (forgotNewPassword !== forgotConfirmPassword) {
        setForgotError("کلمه عبور با تکرار آن همخوانی ندارد.");
        return;
      }

      setForgotLoading(true);
      try {
        const res = await apiFetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: forgotEmail.trim(),
            phone: forgotPhone.trim(),
            username: forgotUsername.trim().toLowerCase(),
            newPassword: forgotNewPassword
          })
        });
        const data = await res.json();
        if (res.ok) {
          setForgotSuccess(data.message);
          setTimeout(() => {
            setMode("login");
            setForgotStep(1);
            setForgotEmail("");
            setForgotPhone("");
            setForgotUsername("");
          }, 2000);
        } else {
          setForgotError(data.message || "خطا در کالیبراسیون هویت.");
        }
      } catch (err) {
        setForgotError("خطای شبکه در سرور اصلی.");
      } finally {
        setForgotLoading(false);
      }
    }
  };

  return (
<div className="min-h-screen rounded-[32px] overflow-hidden flex flex-col items-center justify-center px-4 py-8 relative">      
      {/* Background visual glows */}
      {/* <div className="absolute  bg-slate-950 pointer-events-none glow-animation bg-slate-950" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none glow-animation" /> */}

      {/* Main card box */}
      <div className="w-full max-w-lg glass-effect rounded-[30px] p-8 border border-white/5 shadow-2x">
        
        {/* Brand Banner Title */}
        <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 animate-bounce">
          <img
            src={logo}
            alt="Logo"
            className="w-16 h-16 object-cover"
          />
        </div>
          <h2 className="text-2xl font-extrabold text-white">کارتت | Kartet</h2>
          <p className="text-sm text-slate-400 mt-1.5">پلتفرم ساخت کارت ویزیت دیجیتال</p>
        </div>

        {/* 1. LOGIN MODE */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <h3 className="text-lg font-bold text-slate-100 border-r-4 border-blue-500 pr-2.5">ورود به حساب کاربری</h3>
            
            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-right leading-relaxed font-semibold">
                ⚠️ {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">شناسه کاربری (نام کاربری، ایمیل یا شماره همراه) :</label>
              <input 
                type="text"
                placeholder="مثال: admin@gmail.com یا 09121234567"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">رمز عبور :</label>
                <button 
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-blue-400 hover:underline hover:text-blue-300 focus:outline-none"
                >
                  فراموشی کلمه عبور؟
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-200 outline-none transition text-left font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loginLoading ? "درحال بررسی و ورود..." : "ورود ایمن به پنل"}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400 font-medium">حساب کاربری جدید بسازید : </span>
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-xs font-bold text-blue-400 hover:underline hover:text-blue-300"
              >
                ثبت نام در کارتِت
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER MODE */}
        {mode === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100 border-r-4 border-indigo-500 pr-2.5">فرم ثبت نام و ایجاد کارت ویزیت دیجیتال</h3>

            {regError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-right leading-relaxed font-medium">
                ⚠️ {regError}
              </div>
            )}

            {regSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-right leading-relaxed font-medium">
                🎉 {regSuccess}
              </div>
            )}

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">نام و نام خانوادگی  :</label>
              <input 
                type="text"
                placeholder="مثال: آرش بهنامی"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none transition"
              />
            </div>

            {/* Alphanumeric Username validation */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">نام کاربری اختصاصی کارت (این هویت برند شما است) :</label>
              <input 
                type="text"
                placeholder="(بین ۵ تا ۹ کاراکتر - انگلیسی)"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none transition font-mono"
              />
              {usernameStatus.checked && (
                <p className={`text-[10px] font-bold mt-1 ${usernameStatus.valid ? "text-emerald-400" : "text-rose-400"}`}>
                  {usernameStatus.message}
                </p>
              )}
            </div>

            {/* Email gmail.com validation */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">ایمیل (فرمت gmail.com@) :</label>
              <input 
                type="email"
                placeholder="yourmail@gmail.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none transition text-left font-mono"
              />
            </div>

            {/* Phone starting with 09 validation */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">شماره تلفن همراه :</label>
              <input 
                type="tel"
                placeholder="09123456789"
                maxLength={11}
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none transition text-left font-mono"
              />
            </div>

            {/* Password inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">کلمه عبور :</label>
                <input 
                  type="password"
                  placeholder="******"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none transition text-left font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">تکرار کلمه عبور :</label>
                <input 
                  type="password"
                  placeholder="******"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-4 text-sm text-slate-200 outline-none transition text-left font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {regLoading ? "ثبت اطلاعات ساخت کارت..." : "ثبت نام و ورود برای ساخت کارت دیجیتال"}
            </button>

            <div className="text-center pt-1">
              <span className="text-xs text-slate-400 font-medium">قبلا عضو شده‌اید؟ </span>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs font-bold text-blue-400 hover:underline hover:text-blue-300"
              >
                ورود به حساب کاربری
              </button>
              <p className="mt-4 text-[11px] leading-5 text-center text-slate-500">
                ثبت‌نام در سایت به منزله پذیرش{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                >
                  قوانین و مقررات
                </a>{" "}
                کارتت است.
              </p>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD MODE */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="space-y-5">
            <h3 className="text-lg font-bold text-slate-100 border-r-4 border-amber-500 pr-2.5">بازنشانی کلمه عبور</h3>

            {forgotError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-right leading-relaxed font-semibold">
                ⚠️ {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-right leading-relaxed font-semibold">
                🎉 {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">نام کاربری اختصاصی شما :</label>
                  <input 
                    type="text"
                    placeholder="مثال: brandname"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">ایمیل ثبت نام شده :</label>
                  <input 
                    type="email"
                    placeholder="yourmail@gmail.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">شماره تلفن همراه معتبر :</label>
                  <input 
                    type="tel"
                    placeholder="09123456789"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">کلمه عبور جدید :</label>
                  <input 
                    type="password"
                    placeholder="******"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">تکرار کلمه عبور جدید :</label>
                  <input 
                    type="password"
                    placeholder="******"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-3 px-4 text-sm text-slate-200 outline-none transition font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {forgotLoading ? "درحال بازپروری..." : forgotStep === 1 ? "بررسی و تایید هویت" : "ثبت گذرواژه جدید"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setForgotStep(1);
                }}
                className="text-xs font-bold text-slate-300 hover:underline"
              >
                بازگشت به ورود کاربری
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
