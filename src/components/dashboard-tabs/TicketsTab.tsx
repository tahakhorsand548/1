import React from "react";
import { MessageSquare } from "lucide-react";
import { Ticket, User } from "../../types";

interface TicketsTabProps {
  tickets: Ticket[];
  activeTicket: Ticket | null;
  setActiveTicket: (t: Ticket | null) => void;
  chatMessage: string;
  setChatMessage: (v: string) => void;
  handleSendChatMessage: (e: React.FormEvent) => void;
  setShowCreateTicketModal: (v: boolean) => void;
}

export default function TicketsTab({
  tickets,
  activeTicket,
  setActiveTicket,
  chatMessage,
  setChatMessage,
  handleSendChatMessage,
  setShowCreateTicketModal,
}: TicketsTabProps) {
  const hasOpenTicket = tickets.some((t) => t.status !== "ended");

  return (
        <div className="space-y-8 text-right max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                تیکت های پشتیبانی و ارتباط با مدیریت
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                سوالات، پیشنهادات یا مشکلات خود را در قالب پیام ثبت کنید.
                کارشناسان ما به زودی پاسخ خواهند داد.
              </p>
            </div>
            <button
                          onClick={() => {
                            if (hasOpenTicket) return;
                            setShowCreateTicketModal(true);
                          }}
                          disabled={hasOpenTicket}
                          title={
                            hasOpenTicket
                              ? "شما یک تیکت باز دارید. تا زمانی که این تیکت توسط پشتیبانی خاتمه یابد، امکان ایجاد تیکت جدید وجود ندارد."
                              : ""
                          }
                          className={`py-3 px-6 rounded-xl text-white text-xs font-bold shadow-md transition ${
                            hasOpenTicket
                              ? "bg-slate-300 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          }`}
                        >
                          ایجاد تیکت پشتیبانی جدید
          </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Tickets list */}
            <div className="md:col-span-1 space-y-3">
              <span className="text-xs font-extrabold text-slate-650 block pr-1 leading-relaxed">
                تیکت های جاری شما :
              </span>
              {tickets.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-xs text-wrap leading-relaxed shadow-sm">
                  تاکنون هیچ تیکت یا درخواستی ثبت نکرده‌اید.
                </div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pl-1">
                  {tickets
                    .slice()
                    .sort((a, b) => b.id.localeCompare(a.id))
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTicket(t)}
                        className={`w-full p-4 rounded-xl border text-right transition flex flex-col justify-between cursor-pointer ${
                          activeTicket?.id === t.id
                            ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`font-extrabold text-xs line-clamp-1 ${activeTicket?.id === t.id ? "text-blue-900" : "text-slate-800"}`}
                          >
                            {t.title}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              t.status === "read"
                                ? "bg-amber-100 text-amber-700"
                                : t.status === "under_review"
                                  ? "bg-blue-105 bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {t.status === "read"
                              ? "خوانده شد"
                              : t.status === "under_review"
                                ? "در حال بررسی"
                                : "پایان چت با کاربر"}
                          </span>
                        </div>
                        <span className="text-[10px] opacity-75 mt-2.5 font-mono text-left w-full">
                          {t.createdAt}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Chat View Container */}
            <div className="md:col-span-2 bg-white border border-slate-200/85 rounded-2xl p-6 min-h-[400px] flex flex-col justify-between shadow-sm">
              {activeTicket ? (
                <div className="flex flex-col justify-between h-[420px]">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {activeTicket.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        شناسه تیکت: {activeTicket.id}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold ${activeTicket.status === "ended" ? "text-red-500" : "text-emerald-600"}`}
                    >
                      {activeTicket.status === "ended"
                        ? "🔴 خاتمه یافته"
                        : "🟢 مکالمه فعال است"}
                    </span>
                  </div>

                  {/* Messages Body */}
                  <div className="flex-1 overflow-y-auto space-y-4 py-4 px-2 my-2 scrollbar-none">
                    {activeTicket.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                            m.sender === "user"
                              ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                              : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200 shadow-xs"
                          }`}
                        >
                          <p>{m.message}</p>
                          <span className="block text-[8px] opacity-60 mt-1.5 font-mono text-left">
                            {m.createdAt}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat reply form if active */}
                  {activeTicket.status !== "ended" ? (
                    <form
                      onSubmit={handleSendChatMessage}
                      className="flex gap-2 border-t border-slate-100 pt-3 mt-1"
                    >
                      <input
                        type="text"
                        placeholder="پاسخ خود را برای پشتیبانی بنویسید..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl py-3 px-4 text-xs text-slate-800 outline-none focus:border-blue-500 transition-all"
                      />
                      <button
                        type="submit"
                        className="py-3 px-6 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 active:scale-95 transition cursor-pointer"
                      >
                        ارسال پیام
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-100 text-center rounded-xl text-xs text-red-500 font-bold shadow-xs">
                      اين تیکت توسط پشتیبانی فینگر ریدر پایان یافته و چت
                      ثانویه در آن مسدود است.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-10 space-y-2">
                  <MessageSquare className="w-12 h-12 text-slate-300 font-bold" />
                  <h4 className="font-extrabold text-xs text-slate-500">
                    گفتگویی انتخاب نشده است
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    جهت شروع چت، از منوی سمت راست یک تیکت را برگزینید یا تیکت
                    جدید ارسال نمایید.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
