import React from "react";

export type RangeKey = "24h" | "7d" | "1m" | "6m";

export interface ChartMetric {
  key: string;
  label: string;
  color: string;
}

export interface ChartBucketMap {
  [isoKey: string]: Record<string, number>;
}

interface Point {
  label: string;
  fullLabel: string;
  [metricKey: string]: string | number;
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "۲۴ ساعت" },
  { key: "7d", label: "۷ روز" },
  { key: "1m", label: "۱ ماه" },
  { key: "6m", label: "۶ ماه" },
];

const DEFAULT_METRICS: ChartMetric[] = [
  { key: "visits", label: "کل بازدید", color: "#2563EB" },
  { key: "scans", label: "اسکن بارکد (QR)", color: "#9333EA" },
  { key: "buttonClicks", label: "کلیک دکمه‌ها", color: "#F59E0B" },
  { key: "linkOpens", label: "بازدید لینک مستقیم", color: "#059669" },
];

function isoDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function isoHourKey(d: Date) {
  return d.toISOString().slice(0, 13);
}

function buildPoints(
  dailyBuckets: ChartBucketMap,
  hourlyBuckets: ChartBucketMap,
  metricKeys: string[],
  range: RangeKey,
): Point[] {
  const now = new Date();
  const emptyBucket = () => Object.fromEntries(metricKeys.map((k) => [k, 0]));

  if (range === "24h") {
    const points: Point[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const b = hourlyBuckets[isoHourKey(d)] || emptyBucket();
      points.push({
        label: d.toLocaleTimeString("fa-IR", { hour: "2-digit" }),
        fullLabel: d.toLocaleString("fa-IR", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        }),
        ...b,
      });
    }
    return points;
  }

  if (range === "7d" || range === "1m") {
    const days = range === "7d" ? 7 : 30;
    const points: Point[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const b = dailyBuckets[isoDateKey(d)] || emptyBucket();
      points.push({
        label: d.toLocaleDateString("fa-IR", { day: "2-digit", month: "2-digit" }),
        fullLabel: d.toLocaleDateString("fa-IR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        ...b,
      });
    }
    return points;
  }

  // 6m → ۲۶ سطل هفتگی
  const weeks = 26;
  const points: Point[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
    const agg = emptyBucket();
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekEnd.getTime() - d * 86400000);
      const b = dailyBuckets[isoDateKey(day)];
      if (b) {
        metricKeys.forEach((k) => {
          agg[k] = (agg[k] as number) + (b[k] || 0);
        });
      }
    }
    const weekStart = new Date(weekEnd.getTime() - 6 * 86400000);
    points.push({
      label: weekStart.toLocaleDateString("fa-IR", { day: "2-digit", month: "2-digit" }),
      fullLabel: `${weekStart.toLocaleDateString("fa-IR", { day: "numeric", month: "long" })} تا ${weekEnd.toLocaleDateString("fa-IR", { day: "numeric", month: "long" })}`,
      ...agg,
    });
  }
  return points;
}

interface VisitsChartProps {
  /** تاریخچه روزانه به‌ازای هر متریک، کلید ISO یعنی YYYY-MM-DD */
  dailyStats: ChartBucketMap;
  /** تاریخچه ساعتی به‌ازای هر متریک، کلید ISO یعنی YYYY-MM-DDTHH */
  hourlyStats: ChartBucketMap;
  /** مجموعه متریک‌های قابل‌نمایش (پیش‌فرض: ۴ متریک آمار بازدید کارت) */
  metrics?: ChartMetric[];
  /** عنوان نمودار */
  title?: string;
}

/**
 * نمودار چند-متریکی — الهام‌گرفته از ظاهر و رفتار گزارش عملکرد گوگل سرچ
 * کنسول: چیپ‌های بالای نمودار برای فعال/غیرفعال کردن هر سری، بازه زمانی
 * قابل‌تنظیم (۲۴ ساعت / ۷ روز / ۱ ماه / ۶ ماه)، و تولتیپ تعاملی.
 *
 * نکته مهم درباره جهت نمودار: محور زمان همیشه از چپ (قدیم‌ترین) به راست
 * (جدیدترین/امروز) رسم می‌شود — دقیقاً مثل خود گوگل سرچ کنسول، حتی در
 * زبان‌های راست‌به‌چپ. به همین دلیل ناحیهٔ ترسیم عمداً dir="ltr" است
 * تا با محاسبات SVG (که ذاتاً چپ‌به‌راست‌اند) همسو بماند و برچسب‌های محور
 * برعکس نمایش داده نشوند.
 */
export default function VisitsChart({
  dailyStats,
  hourlyStats,
  metrics = DEFAULT_METRICS,
  title = "نمودار آمار بازدید کارت",
}: VisitsChartProps) {
  const metricKeys = React.useMemo(() => metrics.map((m) => m.key), [metrics]);

  const [range, setRange] = React.useState<RangeKey>("7d");
  const [visible, setVisible] = React.useState<Set<string>>(new Set(metricKeys));
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  // اگر مجموعه متریک‌ها عوض شود (مثلا کاربر/ادمین)، سری‌های قابل‌نمایش هم بازنشانی شود
  React.useEffect(() => {
    setVisible(new Set(metricKeys));
  }, [metricKeys.join(",")]);

  const points = React.useMemo(
    () => buildPoints(dailyStats, hourlyStats, metricKeys, range),
    [dailyStats, hourlyStats, metricKeys, range],
  );

  const toggleMetric = (key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // حداقل یک سری باید همیشه فعال بماند
        if (next.size === 1) return next;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const W = 1000;
  const H = 260;
  const padX = 16;
  const padTop = 20;
  const padBottom = 30;

  const visibleMetrics = metrics.filter((m) => visible.has(m.key));
  const maxVal = Math.max(
    1,
    ...points.flatMap((p) => visibleMetrics.map((m) => Number(p[m.key]) || 0)),
  );

  const stepX = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const getX = (i: number) => padX + i * stepX;
  const getY = (v: number) => H - padBottom - (v / maxVal) * (H - padTop - padBottom);

  const buildPath = (key: string) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)},${getY(Number(p[key]) || 0)}`).join(" ");

  // برای جلوگیری از شلوغی محور افقی، فقط چند برچسب نمایش داده می‌شود
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
      {/* چیپ‌های سری‌ها (مثل سرچ کنسول) */}
      <div className="flex flex-wrap items-center gap-2">
        {metrics.map((m) => {
          const active = visible.has(m.key);
          const total = points.reduce((acc, p) => acc + (Number(p[m.key]) || 0), 0);
          return (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl border text-xs font-bold transition ${
                active ? "border-slate-300 bg-slate-50" : "border-slate-100 bg-white opacity-50"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? m.color : "#CBD5E1" }}
              />
              <span className={active ? "text-slate-700" : "text-slate-400"}>{m.label}</span>
              <span className="font-mono" style={{ color: active ? m.color : "#94A3B8" }}>
                {total.toLocaleString("en-US")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-extrabold text-sm text-slate-800">{title}</h3>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRange(r.key);
                setHoverIndex(null);
              }}
              className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition ${
                range === r.key
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* نمودار خطی — عمداً LTR تا محور زمان (قدیم←چپ, امروز←راست) برعکس نشود */}
      <div className="relative" dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[260px] overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* خطوط راهنمای افقی */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={padX}
              x2={W - padX}
              y1={padTop + (H - padTop - padBottom) * (1 - f)}
              y2={padTop + (H - padTop - padBottom) * (1 - f)}
              stroke="#F1F5F9"
              strokeWidth={1}
            />
          ))}

          {/* خط راهنمای عمودی هاور */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              x2={getX(hoverIndex)}
              y1={padTop}
              y2={H - padBottom}
              stroke="#CBD5E1"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}

          {/* خط هر متریک */}
          {visibleMetrics.map((m) => (
            <path
              key={m.key}
              d={buildPath(m.key)}
              fill="none"
              stroke={m.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* نقاط روی نمودار در ایندکس هاور شده */}
          {hoverIndex !== null &&
            visibleMetrics.map((m) => (
              <circle
                key={m.key}
                cx={getX(hoverIndex)}
                cy={getY(Number(points[hoverIndex][m.key]) || 0)}
                r={4}
                fill="#fff"
                stroke={m.color}
                strokeWidth={2.5}
              />
            ))}

          {/* لایه‌های شفاف برای دریافت رویداد هاور */}
          {points.map((_, i) => (
            <rect
              key={i}
              x={getX(i) - stepX / 2}
              y={0}
              width={stepX || W}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>

        {/* تولتیپ */}
        {hoverIndex !== null && (
          <div
            className="absolute top-0 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-[11px] pointer-events-none z-20 min-w-[170px]"
            dir="rtl"
            style={{
              left: `${(getX(hoverIndex) / W) * 100}%`,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
          >
            <div className="font-bold mb-1.5 pb-1.5 border-b border-white/10 whitespace-nowrap">
              {points[hoverIndex].fullLabel}
            </div>
            <div className="space-y-1">
              {visibleMetrics.map((m) => (
                <div key={m.key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </span>
                  <span className="font-mono font-bold">
                    {(Number(points[hoverIndex][m.key]) || 0).toLocaleString("en-US")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* برچسب‌های محور افقی */}
        <div className="flex justify-between mt-2 px-1">
          {points.map((p, i) =>
            i % labelStep === 0 || i === points.length - 1 ? (
              <span key={i} className="text-[10px] text-slate-400 font-semibold">
                {p.label}
              </span>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
