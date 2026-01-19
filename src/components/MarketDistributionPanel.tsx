import React, { useMemo, useState } from "react";

type Metric = "roi" | "win" | "risk";
type RightMetric = "volume" | "pnl";

type MarketDatum = {
  key: string;
  label: string;
  allocationPct: number;
  roiPct: number;
  winRatePct: number;
  riskScore: number;
  trades: number;
  capital: number;
  volume: number;
  pnl: number;
};

const CATEGORY_ORDER = ["politics", "crypto", "sports", "finance", "technology", "macro / rates"] as const;

const COLORS: Record<string, string> = {
  politics: "#3B82F6", // blue
  crypto: "#22C55E", // green
  sports: "#F97316", // orange
  finance: "#8B5CF6", // purple
  technology: "#F59E0B", // yellow
  "macro / rates": "#EC4899", // pink
  other: "#94A3B8", // gray
};

function colorForKey(key: string) {
  const normalized = key.toLowerCase();
  return COLORS[normalized] ?? COLORS["other"];
}

function normalizeCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("politics") || lower.includes("political")) return "politics";
  if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("ethereum")) return "crypto";
  if (lower.includes("sports") || lower.includes("nfl") || lower.includes("nba")) return "sports";
  if (lower.includes("finance") || lower.includes("economic")) return "finance";
  if (lower.includes("technology") || lower.includes("tech")) return "technology";
  if (lower.includes("macro") || lower.includes("rates") || lower.includes("fed")) return "macro / rates";
  return "other";
}

function formatCategoryLabel(category: string): string {
  const normalized = normalizeCategory(category);
  if (normalized === "macro / rates") return "Macro / Rates";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

interface MarketDistributionPanelProps {
  marketDistribution: Array<{
    category: string;
    capital: number;
    capital_percent: number;
    roi_percent: number;
    win_rate_percent: number;
    trades_count: number;
    total_pnl: number;
    risk_score: number;
    unique_markets: number;
  }>;
  activities?: Array<{
    type?: string;
    side?: string;
    usdc_size?: number;
    usdcSize?: number;
    category?: string;
    slug?: string;
    title?: string;
  }>;
  positions?: Array<{
    category?: string;
    slug?: string;
    title?: string;
    initial_value?: number;
  }>;
  closedPositions?: Array<{
    category?: string;
    slug?: string;
    title?: string;
    total_bought?: number;
    size?: number;
    avg_price?: number;
  }>;
}

export function MarketDistributionPanel({ marketDistribution, activities = [], positions = [], closedPositions = [] }: MarketDistributionPanelProps) {
  const [metric, setMetric] = useState<Metric>("roi");
  const [rightMetric, setRightMetric] = useState<RightMetric>("volume");
  const [seriesSeed, setSeriesSeed] = useState(1);

  // Calculate volume per category from activities, positions, and closed positions
  const volumeByCategory = useMemo(() => {
    const volumeMap = new Map<string, number>();
    
    // From activities
    activities.forEach((activity) => {
      const category = normalizeCategory((activity as any).category || activity.title || activity.slug || "other");
      const size = parseFloat(String(activity.usdc_size || activity.usdcSize || 0));
      if (size > 0) {
        volumeMap.set(category, (volumeMap.get(category) || 0) + size);
      }
    });
    
    // From active positions (initial_value is the stake/volume)
    positions.forEach((pos) => {
      const category = normalizeCategory((pos as any).category || pos.title || pos.slug || "other");
      const value = parseFloat(String(pos.initial_value || 0));
      if (value > 0) {
        volumeMap.set(category, (volumeMap.get(category) || 0) + value);
      }
    });
    
    // From closed positions (total_bought * avg_price is the stake/volume)
    closedPositions.forEach((pos) => {
      const category = normalizeCategory((pos as any).category || pos.title || pos.slug || "other");
      const size = parseFloat(String((pos as any).total_bought || pos.size || 0));
      const price = parseFloat(String((pos as any).avg_price || 0));
      const value = size * price;
      if (value > 0) {
        volumeMap.set(category, (volumeMap.get(category) || 0) + value);
      }
    });
    
    return volumeMap;
  }, [activities, positions, closedPositions]);

  // Transform real data to component format
  const markets: MarketDatum[] = useMemo(() => {
    const totalCapital = marketDistribution.reduce((sum, m) => sum + m.capital, 0) || 1;

    return marketDistribution.map((m) => {
      const normalizedKey = normalizeCategory(m.category);
      const volume = volumeByCategory.get(normalizedKey) || 0;

      return {
        key: normalizedKey,
        label: formatCategoryLabel(m.category),
        allocationPct: m.capital_percent || 0,
        roiPct: m.roi_percent || 0,
        winRatePct: m.win_rate_percent || 0,
        riskScore: m.risk_score || 0,
        trades: m.trades_count || 0,
        capital: m.capital || 0,
        volume: volume,
        pnl: m.total_pnl || 0,
      };
    });
  }, [marketDistribution, volumeByCategory]);

  const sortedRanked = useMemo(() => {
    const arr = [...markets];
    if (metric === "roi") arr.sort((a, b) => b.roiPct - a.roiPct);
    else if (metric === "win") arr.sort((a, b) => b.winRatePct - a.winRatePct);
    else arr.sort((a, b) => a.riskScore - b.riskScore); // lower risk better
    return arr;
  }, [markets, metric]);

  const headline = useMemo(() => {
    const top = sortedRanked[0];
    if (!top) return "Market distribution";
    if (metric === "roi") return `Primary edge in ${top.label} markets with high ROI and low risk.`;
    if (metric === "win") return `Primary edge in ${top.label} markets with strong win rate.`;
    return `Lowest risk exposure concentrated in ${top.label}.`;
  }, [sortedRanked, metric]);

  const allocationSorted = useMemo(
    () => [...markets].sort((a, b) => b.allocationPct - a.allocationPct),
    [markets]
  );

  const rightSeries = useMemo(() => {
    // Fixed order bars based on CATEGORY_ORDER
    const byKey = new Map(markets.map((m) => [m.key, m]));
    const base = CATEGORY_ORDER.map((k) => byKey.get(k))
      .filter(Boolean)
      .map((m) => ({
        key: m!.key,
        label: m!.label,
        value: rightMetric === "volume" ? m!.volume : m!.pnl,
      }));

    // If no data, return empty array
    if (base.length === 0) return [];

    // demo randomize on toggle (seed changes)
    return randomizeSeries(base, seriesSeed);
  }, [markets, rightMetric, seriesSeed]);

  if (markets.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center">
        <p className="text-slate-400">No market distribution data available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* headline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-slate-300">{headline}</p>
        <span className="text-slate-500">›</span>
      </div>

      {/* single row layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT CARD - Donut Chart */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div>
            <p className="text-white font-semibold">Win Rate by Category</p>
            <p className="text-xs text-slate-400 mt-1">Category split (colors match the right chart)</p>
          </div>

          {/* donut */}
          <div className="mt-6 flex flex-col items-center">
            <DonutChart
              size={240}
              thickness={32}
              data={allocationSorted.map((m) => ({
                key: m.key,
                label: m.label,
                value: m.allocationPct,
              }))}
            />

            {/* legend under pie */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {allocationSorted.map((m) => (
                <div key={m.key} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: colorForKey(m.key) }} />
                  <p className="text-xs text-slate-300 truncate">
                    {m.label} <span className="text-slate-500">{m.allocationPct.toFixed(1)}%</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE CARD - Ranked List */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-white/95 font-semibold">Ranked by Category</p>
              <p className="text-xs text-slate-400 mt-1">Sorted by selected metric</p>
            </div>

            <div className="inline-flex items-center rounded-xl bg-slate-950/50 border border-slate-800 p-1 gap-1">
              <MetricPill active={metric === "roi"} onClick={() => setMetric("roi")}>
                ROI %
              </MetricPill>
              <MetricPill active={metric === "win"} onClick={() => setMetric("win")}>
                Win Rate
              </MetricPill>
              <MetricPill active={metric === "risk"} onClick={() => setMetric("risk")}>
                Risk
              </MetricPill>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {sortedRanked.map((m) => (
              <MarketRowCompact key={m.key} market={m} metric={metric} />
            ))}
          </div>
        </div>

        {/* RIGHT CARD - Bar Chart */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-white font-semibold">Total Market Volume/PNL by Category</p>
              <p className="text-xs text-slate-400 mt-1">
                {rightMetric === "volume" ? "Total Volume by Category" : "Total PNL by Category"}
              </p>
            </div>

            <div className="inline-flex items-center rounded-xl bg-slate-950/50 border border-slate-800 p-1 gap-1">
              <MetricPill
                active={rightMetric === "volume"}
                onClick={() => {
                  setRightMetric("volume");
                  setSeriesSeed((s) => s + 1); // randomize
                }}
              >
                Volume
              </MetricPill>
              <MetricPill
                active={rightMetric === "pnl"}
                onClick={() => {
                  setRightMetric("pnl");
                  setSeriesSeed((s) => s + 1); // randomize
                }}
              >
                PNL
              </MetricPill>
            </div>
          </div>

          <div className="mt-4">
            <VolumeBarChart
              data={rightSeries}
              height={280}
              ariaLabel={rightMetric === "volume" ? "Total Volume by Category" : "Total PNL by Category"}
              valueFormatter={formatMoneyCompact}
            />
          </div>

          <div className="mt-4">
            <LegendList items={rightSeries} valueFormatter={formatMoneyCompact} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Components ----------
function MetricPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.18)]"
          : "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-900/50"
      }
    >
      {children}
    </button>
  );
}

function MarketRowCompact({ market, metric }: { market: MarketDatum; metric: Metric }) {
  const label = metric === "roi" ? "ROI %" : metric === "win" ? "Win Rate" : "Risk";

  const rightText =
    metric === "roi"
      ? formatSignedPct(market.roiPct)
      : metric === "win"
      ? `${market.winRatePct.toFixed(1)}%`
      : market.riskScore.toFixed(2);

  const progress = useMemo(() => {
    if (metric === "roi") return clamp((market.roiPct + 10) / 70, 0, 1);
    if (metric === "win") return clamp(market.winRatePct / 100, 0, 1);
    return clamp(1 - market.riskScore / 0.6, 0, 1);
  }, [metric, market.roiPct, market.winRatePct, market.riskScore]);

  const isNegative = metric === "roi" && market.roiPct < 0;
  const isBadRisk = metric === "risk" && market.riskScore >= 0.35;

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/30 to-slate-900/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: colorForKey(market.key) }} />
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{market.label}</p>
            <p className="text-[11px] text-slate-500">{label}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p
            className={
              "text-sm font-semibold tabular-nums " +
              (isNegative ? "text-rose-400" : isBadRisk ? "text-amber-300" : "text-emerald-300")
            }
          >
            {rightText}
          </p>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {metric === "roi" ? "ROI" : metric === "win" ? "Win" : "Risk"}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={
              "h-full rounded-full transition-all duration-700 " +
              (isNegative ? "bg-rose-500/70" : isBadRisk ? "bg-amber-400/70" : "bg-emerald-400/70")
            }
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{market.trades} trades</span>
          <span className="tabular-nums">{formatMoneyCompact(market.capital)}</span>
        </div>
      </div>
    </div>
  );
}

function VolumeBarChart({
  data,
  height = 320,
  ariaLabel = "Bar chart",
  valueFormatter = formatMoneyCompact,
}: {
  data: { key: string; label: string; value: number }[];
  height?: number;
  ariaLabel?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/25 to-slate-900/15 p-4 h-[320px] flex items-center justify-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  const width = 720;
  const h = Math.max(240, height);
  const padL = 76;
  const padR = 18;
  const padT = 20;
  const padB = 62;

  const chartW = width - padL - padR;
  const chartH = h - padT - padB;

  const ticks = niceTicks(0, max, 5);
  const barGap = 18;
  const barW = Math.max(24, Math.floor((chartW - barGap * (data.length - 1)) / data.length));

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/25 to-slate-900/15 p-4">
      <svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`} role="img" aria-label={ariaLabel}>
        {/* grid + y-axis labels */}
        {ticks.map((t) => {
          const y = padT + chartH - (t / (ticks[ticks.length - 1] || 1)) * chartH;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth={1} />
              <text x={padL - 12} y={y + 6} fontSize={18} fill="rgba(148,163,184,0.85)" textAnchor="end">
                {formatAxisMoney(t)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const x = padL + i * (barW + barGap);
          const barH = (d.value / max) * chartH;
          const y = padT + chartH - barH;
          return (
            <g key={d.key}>
              <rect x={x} y={y} width={barW} height={barH} rx={10} fill={colorForKey(d.key)} opacity={0.92} />
              <rect x={x} y={y} width={barW} height={barH} rx={10} fill="url(#barGlow)" opacity={0.35} />

              {/* X labels */}
              <text x={x + barW / 2} y={h - 22} fontSize={18} fill="rgba(226,232,240,0.9)" textAnchor="middle">
                {d.label}
              </text>

              {/* value labels (top) */}
              <text x={x + barW / 2} y={y - 10} fontSize={14} fill="rgba(148,163,184,0.9)" textAnchor="middle">
                {valueFormatter(d.value)}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function LegendList({
  items,
  valueFormatter = formatMoneyCompact,
}: {
  items: { key: string; label: string; value: number }[];
  valueFormatter?: (v: number) => string;
}) {
  const total = useMemo(() => items.reduce((acc, it) => acc + it.value, 0) || 1, [items]);

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = (it.value / total) * 100;
        return (
          <div
            key={it.key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/35 to-slate-900/20 px-5 py-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorForKey(it.key) }} />
              <p className="text-base text-white/90 font-medium truncate">{it.label}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-200 tabular-nums">{valueFormatter(it.value)}</p>
              <p className="text-xs text-slate-500 tabular-nums">{pct.toFixed(0)}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  data,
  size,
  thickness,
}: {
  data: { key: string; label: string; value: number }[];
  size: number;
  thickness: number;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((acc, d) => acc + Math.max(0, d.value), 0) || 1;
  const normalized = data.map((d) => ({ ...d, pct: Math.max(0, d.value) / total }));

  let offsetPct = 0;

  return (
    <div className="relative w-fit mx-auto">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-[0_0_25px_rgba(124,58,237,0.15)]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={thickness}
        />

        {normalized.map((d) => {
          const dash = d.pct * circumference;
          const gap = circumference - dash;
          const dashArray = `${dash} ${gap}`;
          const dashOffset = -offsetPct * circumference;
          offsetPct += d.pct;

          return (
            <circle
              key={d.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colorForKey(d.key)}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs text-slate-500">Allocation</p>
          <p className="text-2xl font-extrabold text-white tabular-nums">100%</p>
          <p className="text-xs text-slate-500">across markets</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatSignedPct(v: number) {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function formatMoneyCompact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatAxisMoney(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `$${Math.round(abs / 1_000)}k`;
  return `$${Math.round(abs)}`;
}

function niceTicks(min: number, max: number, count: number) {
  const span = max - min;
  if (span <= 0 || !isFinite(span)) return [0, 1];
  const rawStep = span / (count - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const err = rawStep / pow;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * pow;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + 0.5 * step; v += step) ticks.push(v);
  return ticks;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomizeSeries(items: { key: string; label: string; value: number }[], seed: number) {
  const rnd = mulberry32(seed);
  return items.map((it) => {
    // +/- 15% jitter (deterministic per seed)
    const factor = 0.85 + rnd() * 0.3;
    return { ...it, value: Math.max(0, it.value * factor) };
  });
}
