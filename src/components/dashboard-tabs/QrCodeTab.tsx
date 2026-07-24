import React from "react";
import { Clock, Info, Download } from "lucide-react";
import { User } from "../../types";

interface QrCodeTabProps {
  user: User;
  handleRequestQrCode: () => void;
  handleCopyLink: (link: string) => void;
}

export default function QrCodeTab({
  user,
  handleRequestQrCode,
  handleCopyLink,
}: QrCodeTabProps) {
  return (
        <div className="space-y-8 text-right max-w-4xl mx-auto">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              کیوآرکد و بارکد اختصاصی راهنما
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              با بارگذاری این کد در بنرها، کاتالوگ ها و کارت فیزیکی خود،
              مشتریان را به آدرس الکترونیکی خود متصل کنید.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-6 md:p-8 rounded-[30px] border border-slate-200 shadow-sm">
            {/* Box 1: QR Image layout */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {user.qrRequestStatus === "approved" && user.qrImageUrl ? (
                <div className="p-4 bg-white rounded-3xl shadow-2xl relative inline-block border border-slate-100">
                  <img
                    src={user.qrImageUrl}
                    alt="کیوآرکد اختصاصی"
                    className="w-52 h-52 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-4 text-center">
                    <span className="bg-slate-900 text-white font-mono text-[9px] px-2 py-0.5 rounded-full">
                      Approved QR Code
                    </span>
                  </div>
                </div>
              ) : user.qrRequestStatus === "pending" ? (
                <div className="w-52 h-52 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center p-6 space-y-3 shadow-inner">
                  <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
                  <h4 className="font-extrabold text-xs text-amber-600">
                    در انتظار آپلود کیوآرکد رسمی
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    درخواست شما با موفقیت به مدیریت ارسال شد. ادمین به زودی
                    عکس با کیفیت کیوآرکد چاپی کارت شما را طراحی و در این محل
                    بارگذاری خواهد کرد.
                  </p>
                </div>
              ) : (
                <div className="w-64 h-64 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center p-8 space-y-4 shadow-inner">
                  <Info className="w-10 h-10 text-blue-600" />
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800">
                      کارت فیزیکی یا کیوآرکد چاپی ندارید؟
                    </h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
                      شما می توانید با دکمه روبرو، درخواست دریافت تصویر
                      کیوآرکد رسمی و فیزیکی خود را به پورتال مدیریت بفرستید تا
                      برای شما طراحی شود.
                    </p>
                  </div>
                  <button
                    onClick={handleRequestQrCode}
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] transition shadow cursor-pointer"
                  >
                    ثبت درخواست فعالسازی تصویر کیوآرکد
                  </button>
                </div>
              )}
            </div>

            {/* Box 2: Actions copy links & download */}
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-600 block">
                  لینک دائم کارت ویزیت دیجیتال شما :
                </span>
                <div className="flex gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-blue-600 font-mono font-semibold flex-1 select-all overflow-x-auto truncate text-left pt-1">
                    {`${window.location.origin}/card/${user.username}`}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyLink(
                        `${window.location.origin}/card/${user.username}`,
                      )
                    }
                    className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
                  >
                    کپی
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-2 text-xs leading-relaxed text-slate-600">
                <p className="font-bold flex items-center gap-1.5 text-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  نکات مهم نصب بارکد راهنما :
                </p>
                <p>
                  • این کیوآرکد را دانلود کرده و روی کارت های ویزیت چاپ کنید.
                </p>
                <p>
                  • در صورت تعلیق حساب توسط مدیریت، بازدید با این کد غیرفعال
                  خواهد شد.
                </p>
                <p>
                  • با تغییر آدرس، کارت به طور زنده روی همین آدرس دائم بروز می
                  شود.
                </p>
              </div>

              {user.qrRequestStatus === "approved" && user.qrImageUrl && (
                <a
                  href={user.qrImageUrl}
                  download={`QR_${user.username}.png`}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4.5 h-4.5" />
                  دانلود کیوآرکد به صورت PNG با کیفیت عالی جهت چاپ
                </a>
              )}
            </div>
          </div>
        </div>
  );
}
