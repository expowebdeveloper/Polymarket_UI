import React, { useMemo, useState } from "react";

type RightMetric = "pnl";

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

const CATEGORY_ORDER = [
  "politics",
  "sports",
  "crypto",
  "finance",
  "geopolitics",
  "earnings",
  "tech",
  "culture",
  "world",
  "economy",
  "climate & science",
  "elections"
] as const;

const COLORS: Record<string, string> = {
  politics: "#3B82F6", // blue
  sports: "#F97316", // orange
  crypto: "#22C55E", // green
  finance: "#8B5CF6", // purple
  geopolitics: "#6366F1", // indigo
  earnings: "#10B981", // emerald
  tech: "#F59E0B", // yellow/amber
  culture: "#EC4899", // pink
  world: "#06B6D4", // cyan
  economy: "#84CC16", // lime
  "climate & science": "#14B8A6", // teal
  elections: "#EF4444", // red
  other: "#94A3B8", // gray
};

function colorForKey(key: string) {
  const normalized = key.toLowerCase();
  return COLORS[normalized] ?? COLORS["other"];
}

function normalizeCategory(category: string): string {
  const lower = category.toLowerCase();
  const combined = lower;

  // Elections (check first as it's more specific)
  if (combined.includes("election") || combined.includes("electoral") || combined.includes("vote") || combined.includes("voting") || combined.includes("ballot")) {
    return "elections";
  }

  // Politics (check before geopolitics)
  if (combined.includes("politics") || combined.includes("political") || combined.includes("president") ||
    combined.includes("trump") || combined.includes("biden") || combined.includes("senate") ||
    combined.includes("congress") || combined.includes("democrat") || combined.includes("republican") ||
    combined.includes("party") || combined.includes("campaign")) {
    return "politics";
  }

  // Geopolitics
  if (combined.includes("geopolitics") || combined.includes("geopolitical") || combined.includes("war") ||
    combined.includes("conflict") || combined.includes("military") || combined.includes("nato") ||
    combined.includes("alliance") || combined.includes("diplomacy") || combined.includes("sanctions")) {
    return "geopolitics";
  }

  // Sports
  if (combined.includes("sports") || combined.includes("sport") || combined.includes("nfl") ||
    combined.includes("nba") || combined.includes("mlb") || combined.includes("soccer") ||
    combined.includes("football") || combined.includes("basketball") || combined.includes("baseball") ||
    combined.includes("hockey") || combined.includes("tennis") || combined.includes("golf") ||
    combined.includes("game") || combined.includes("match") || combined.includes("championship") ||
    combined.includes("super bowl") || combined.includes("world cup") || combined.includes("olympics") ||
    combined.includes("tournament") || combined.includes("league")) {
    return "sports";
  }

  // Crypto
  if (combined.includes("crypto") || combined.includes("cryptocurrency") || combined.includes("bitcoin") ||
    combined.includes("btc") || combined.includes("ethereum") || combined.includes("eth") ||
    combined.includes("blockchain") || combined.includes("defi") || combined.includes("nft") ||
    combined.includes("token") || combined.includes("coin") || combined.includes("altcoin") ||
    combined.includes("dogecoin") || combined.includes("solana") || combined.includes("cardano")) {
    return "crypto";
  }

  // Tech
  if (combined.includes("tech") || combined.includes("technology") || combined.includes("ai") ||
    combined.includes("artificial intelligence") || combined.includes("software") || combined.includes("hardware") ||
    combined.includes("startup") || combined.includes("silicon valley") || combined.includes("apple") ||
    combined.includes("google") || combined.includes("microsoft") || combined.includes("meta") ||
    combined.includes("amazon") || combined.includes("tesla") || combined.includes("nvidia") ||
    combined.includes("chip") || combined.includes("semiconductor")) {
    return "tech";
  }

  // Finance
  if (combined.includes("finance") || combined.includes("financial") || combined.includes("bank") ||
    combined.includes("banking") || combined.includes("investment") || combined.includes("trading") ||
    combined.includes("stock") || combined.includes("market") || combined.includes("hedge fund") ||
    combined.includes("private equity") || combined.includes("venture capital")) {
    return "finance";
  }

  // Economy
  if (combined.includes("economy") || combined.includes("economic") || combined.includes("gdp") ||
    combined.includes("unemployment") || combined.includes("inflation") || combined.includes("recession") ||
    combined.includes("growth") || combined.includes("productivity") || combined.includes("trade") ||
    combined.includes("commerce") || combined.includes("business cycle")) {
    return "economy";
  }

  // Earnings
  if (combined.includes("earnings") || combined.includes("revenue") || combined.includes("profit") ||
    combined.includes("quarterly") || combined.includes("q1") || combined.includes("q2") ||
    combined.includes("q3") || combined.includes("q4") || combined.includes("eps") ||
    combined.includes("guidance") || combined.includes("beat") || combined.includes("miss")) {
    return "earnings";
  }

  // Climate & Science
  if (combined.includes("climate") || combined.includes("environment") || combined.includes("environmental") ||
    combined.includes("science") || combined.includes("scientific") || combined.includes("research") ||
    combined.includes("global warming") || combined.includes("carbon") || combined.includes("emissions") ||
    combined.includes("renewable") || combined.includes("solar") || combined.includes("wind") ||
    combined.includes("energy") || combined.includes("green") || combined.includes("sustainability")) {
    return "climate & science";
  }

  // Culture
  if (combined.includes("culture") || combined.includes("cultural") || combined.includes("entertainment") ||
    combined.includes("movie") || combined.includes("film") || combined.includes("music") ||
    combined.includes("celebrity") || combined.includes("tv") || combined.includes("television") ||
    combined.includes("award") || combined.includes("oscar") || combined.includes("grammy") ||
    combined.includes("fashion") || combined.includes("art") || combined.includes("media")) {
    return "culture";
  }

  // World
  if (combined.includes("world") || combined.includes("global") || combined.includes("international") ||
    combined.includes("country") || combined.includes("nation") || combined.includes("united nations") ||
    combined.includes("un") || combined.includes("eu") || combined.includes("european union")) {
    return "world";
  }

  return "other";
}

function formatCategoryLabel(category: string): string {
  const normalized = normalizeCategory(category);
  const labelMap: Record<string, string> = {
    "climate & science": "Climate & Science",
    "macro / rates": "Macro / Rates",
  };

  if (labelMap[normalized]) {
    return labelMap[normalized];
  }

  // Capitalize first letter of each word
  return normalized
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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


  // Transform real data to component format
  const markets: MarketDatum[] = useMemo(() => {
    return marketDistribution.map((m) => {
      const normalizedKey = normalizeCategory(m.category);

      return {
        key: normalizedKey,
        label: formatCategoryLabel(m.category),
        allocationPct: m.capital_percent || 0,
        roiPct: m.roi_percent || 0,
        winRatePct: m.win_rate_percent || 0,
        riskScore: m.risk_score || 0,
        trades: m.trades_count || 0,
        capital: m.capital || 0,
        volume: m.capital || 0, // Use backend's capital as volume (already correctly calculated)
        pnl: m.total_pnl || 0,
      };
    }).filter(m => m.capital > 0 || m.trades > 0 || Math.abs(m.pnl) > 0 || m.volume > 0);
  }, [marketDistribution]);

  const allocationSorted = useMemo(
    () => [...markets].filter((m) => m.volume > 0.001).sort((a, b) => b.volume - a.volume),
    [markets]
  );

  const headline = useMemo(() => {
    const top = allocationSorted[0];
    if (!top) return "Market distribution";
    return `Primary volume concentrated in ${top.label} markets.`;
  }, [allocationSorted]);

  // Calculate total volume for the pie chart center
  const totalVolume = useMemo(() => {
    return markets.reduce((sum, m) => sum + m.volume, 0);
  }, [markets]);

  const rightSeries = useMemo(() => {
    const byKey = new Map(markets.map((m) => [m.key, m]));
    return CATEGORY_ORDER.map((k) => byKey.get(k))
      .filter(Boolean)
      .map((m) => ({
        key: m!.key,
        label: m!.label,
        value: m!.pnl,
      }))
      .filter((d) => Math.abs(d.value) > 0.001); // hide zero PNL categories
  }, [markets]);

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

      {/* two column layout: volume slightly smaller, PNL bar chart larger */}
      <div className="grid grid-cols-1 xl:grid-cols-[0.4fr_0.6fr] gap-5">
        {/* LEFT CARD - Donut Chart + Ranked List (shrunk) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div>
            <p className="text-white font-semibold">Volume by Category</p>
            <p className="text-xs text-slate-400 mt-1">Total invested volume from Polymarket</p>
          </div>

          {/* donut chart centered, categories below */}
          <div className="mt-4 flex flex-col items-center">
            <DonutChart
              size={200}
              thickness={26}
              data={allocationSorted.map((m) => ({
                key: m.key,
                label: m.label,
                value: m.volume,
              }))}
              totalVolume={totalVolume}
            />
            {/* category list - below pie chart, card design */}
            <div className="mt-4 w-full space-y-2">
              {allocationSorted.map((m) => {
                const volumePct = totalVolume > 0 ? (m.volume / totalVolume) * 100 : 0;
                return (
                  <div
                    key={m.key}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/35 to-slate-900/20 px-5 py-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: colorForKey(m.key) }} />
                      <p className="text-base text-white/90 font-medium truncate">{m.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm tabular-nums text-emerald-400 font-medium">{formatMoneyCompact(m.volume)}</p>
                      <p className="text-xs text-slate-500 tabular-nums">({volumePct.toFixed(1)}%)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT CARD - Bar Chart (larger) */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col min-h-0">
          <div className="mb-2">
            <p className="text-white font-semibold">PNL by Category</p>
            <p className="text-xs text-slate-400 mt-1">Total PNL by Category</p>
          </div>

          <div className="flex-1 min-h-[340px]">
            <VolumeBarChart
              data={rightSeries}
              height={380}
              ariaLabel="PNL"
              valueFormatter={formatMoneyCompact}
              axisFormatter={formatAxisMoney}
            />
          </div>

          <div className="mt-3">
            <LegendList items={rightSeries} valueFormatter={formatMoneyCompact} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Components ----------
function VolumeBarChart({
  data,
  height = 320,
  ariaLabel = "Bar chart",
  valueFormatter = formatMoneyCompact,
  axisFormatter,
}: {
  data: { key: string; label: string; value: number }[];
  height?: number;
  ariaLabel?: string;
  valueFormatter?: (v: number) => string;
  axisFormatter?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/25 to-slate-900/15 p-4 min-h-[320px] flex items-center justify-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }

  const rawMin = Math.min(...data.map((d) => d.value), 0);
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const hasNegatives = rawMin < 0;
  const max = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1);

  const width = 800;
  const h = Math.max(320, height);
  const padL = 80;
  const padR = 20;
  const padT = 24;
  const padB = 112; // extra bottom space so category labels sit clearly below the bar area

  const chartW = width - padL - padR;
  const chartH = h - padT - padB;
  const labelY = padT + chartH + 28; // category labels well below the bar line to avoid touching

  // Zero baseline: only use mid-zero when there are negative values; otherwise positive-only from bottom
  const zeroY = hasNegatives ? padT + chartH / 2 : padT + chartH;
  const scaleRange = hasNegatives ? chartH / 2 : chartH;
  const scale = scaleRange / max;

  const ticks = hasNegatives ? niceTicks(-max, max, 5) : niceTicks(0, max, 5);
  const barGap = 12;
  const barW = Math.max(20, Math.floor((chartW - barGap * (data.length - 1)) / data.length));

  const fmt = axisFormatter ?? formatAxisMoney;

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/25 to-slate-900/15 p-4">
      <svg width="100%" height={h} viewBox={`0 0 ${width} ${h}`} role="img" aria-label={ariaLabel}>
        {/* zero line only when there are negative values */}
        {hasNegatives && (
          <line x1={padL} y1={zeroY} x2={width - padR} y2={zeroY} stroke="rgba(148,163,184,0.4)" strokeWidth={1} strokeDasharray="4 4" />
        )}

        {/* grid + y-axis labels */}
        {ticks.map((t) => {
          const y = zeroY - (t / max) * scaleRange;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth={1} />
              <text x={padL - 12} y={y + 6} fontSize={14} fill="rgba(148,163,184,0.85)" textAnchor="end">
                {fmt(t)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const x = padL + i * (barW + barGap);
          const barH = Math.abs(d.value) * scale;
          const isNeg = d.value < 0;
          const y = isNeg ? zeroY : zeroY - barH;
          const barFill = isNeg ? "url(#negativeBarFill)" : colorForKey(d.key);
          return (
            <g key={d.key}>
              <rect x={x} y={y} width={barW} height={barH} rx={6} fill={barFill} opacity={isNeg ? 1 : 0.92} />
              {!isNeg && (
                <rect x={x} y={y} width={barW} height={barH} rx={6} fill="url(#barGlow)" opacity={0.35} />
              )}
              {isNeg && (
                <rect x={x} y={y} width={barW} height={barH} rx={6} fill="url(#negativeBarGlow)" opacity={0.4} />
              )}

              <text
                x={x + barW / 2}
                y={labelY}
                fontSize={13}
                fill="rgba(226,232,240,0.9)"
                textAnchor="start"
                transform={`rotate(45 ${x + barW / 2} ${labelY})`}
              >
                {d.label}
              </text>

              {/* value labels: above bar for positive, below for negative */}
              <text
                x={x + barW / 2}
                y={isNeg ? y + barH + 16 : y - 10}
                fontSize={12}
                fill={isNeg ? "rgba(251,113,133,0.95)" : "rgba(148,163,184,0.9)"}
                textAnchor="middle"
              >
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
          <linearGradient id="negativeBarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(251,113,133,0.85)" />
            <stop offset="1" stopColor="rgba(244,63,94,0.95)" />
          </linearGradient>
          <linearGradient id="negativeBarGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.25)" />
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
  const showPct = items.every((it) => it.value >= 0) && total > 0;

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = showPct ? ((it.value / total) * 100) : 0;
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
              <p className={`text-sm tabular-nums ${it.value >= 0 ? "text-slate-200" : "text-rose-400"}`}>{valueFormatter(it.value)}</p>
              {showPct && <p className="text-xs text-slate-500 tabular-nums">{pct.toFixed(0)}%</p>}
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
  totalVolume,
}: {
  data: { key: string; label: string; value: number }[];
  size: number;
  thickness: number;
  totalVolume?: number;
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
          <p className="text-xs text-slate-500">Total Volume</p>
          <p className="text-2xl font-extrabold text-emerald-400 tabular-nums">{formatMoneyCompact(totalVolume || 0)}</p>
          <p className="text-xs text-slate-500">invested</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Helpers ----------
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
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
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


