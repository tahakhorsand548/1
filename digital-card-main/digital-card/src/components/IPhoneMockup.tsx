import React from "react";
import { CardData } from "../types";
import CardPreview from "./CardPreview";

interface IPhoneMockupProps {
  data: CardData;
  username: string;
}

export default function IPhoneMockup({ data, username }: IPhoneMockupProps) {
  return (
    <div className="flex flex-col items-center justify-center py-4 relative select-none">
      {/* 19.5:9 iPhone Bezel Container */}
      <div 
        className="relative bg-slate-950 rounded-[50px] p-3 border-4 border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.5)] phone-mockup-frame overflow-hidden"
        style={{
          width: "350px",
          height: "758px", // Clean 19.5:9 aspect ratio wrapper
        }}
      >
        {/* Dynamic Island Pills */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
        </div>

        {/* Screen Bezel Notch Inner Frame */}
        <div className="w-full h-full rounded-[38px] overflow-hidden bg-slate-900 border border-slate-900 relative">
          {/* Main live interactive scrolling viewer container */}
          <div className="w-full h-full overflow-y-auto scrollbar-none pb-8 text-right bg-slate-900">
            <CardPreview data={data} username={username} isPreview={true} />
          </div>

          {/* Swipe Indicator Bar bottom */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/40 rounded-full z-50" />
        </div>
      </div>

      <p className="text-slate-400 font-mono text-xs mt-3 text-center">
        📱 پیش‌نمایش زنده در قالب مدل آیفون ۱۶ پرو مکس (۱۹.۵:۹)
      </p>
    </div>
  );
}
