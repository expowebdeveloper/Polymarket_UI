import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import React, { useMemo, useState, useCallback } from "react";

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
  "elections",
] as const;

// Display-name keys for glass design (Polyrating-style)
const COLORS: Record<string, string> = {
  Politics: "#5965ff",
  Sports: "#f59e0b",
  Crypto: "#22c55e",
  Finance: "#a855f7",
  Tech: "#fbbf24",
  Culture: "#ec4899",
  Economy: "#84cc16",
  "Climate & Science": "#14b8a6",
  Geopolitics: "#6366f1",
  Earnings: "#10b981",
  World: "#06b6d4",
  Elections: "#ef4444",
  Other: "#94a3b8",
};

function colorForLabel(label: string) {
  return COLORS[label] ?? COLORS["Other"];
}

function fmtMoney(value: number, unit: "M" | "K") {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}${unit}`;
}

/** Format volume: use K when value is in thousands (e.g. $220K), M when in millions (e.g. $1.5M). */
function fmtVolume(valueInMillions: number): string {
  const sign = valueInMillions < 0 ? "-" : "";
  const abs = Math.abs(valueInMillions);
  if (abs < 1) {
    const k = Math.round(abs * 1000);
    return `${sign}$${k}K`;
  }
  return `${sign}$${abs.toFixed(2)}M`;
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)] " +
        className
      }
    >
      <div className="pointer-events-none absolute -inset-40 opacity-70">
        <div className="absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/35 via-cyan-400/10 to-emerald-400/18 blur-3xl" />
        <div className="absolute left-0 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-500/14 via-transparent to-indigo-500/16 blur-3xl" />
      </div>
      <div className="relative p-6 sm:p-7">{children}</div>
    </div>
  );
}

function MiniTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-2xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-white shadow-lg backdrop-blur">
      <div className="text-white/80">{label}</div>
      <div className="mt-0.5 font-semibold">
        {valueFormatter ? valueFormatter(item.value) : item.value}
      </div>
    </div>
  );
}

function PillRow({
  name,
  color,
  pct,
  right,
}: {
  name: string;
  color: string;
  pct: string;
  right: string;
}) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur transition hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ background: color }} />
          <div>
            <div className="text-lg font-semibold text-white/92">{name}</div>
            <div className="text-sm text-white/45">{pct}</div>
          </div>
        </div>
        <div className="text-right text-xl font-semibold text-white">{right}</div>
      </div>
    </div>
  );
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
      .filter((d) => Math.abs(d.value) > 0.001) // hide zero PNL categories
      .sort((a, b) => b.value - a.value); // descending by PNL
  }, [markets]);

  // Chart data: volume in millions for display, PNL in thousands
  const volumeChartData = useMemo(
    () =>
      allocationSorted.map((m) => ({
        name: m.label,
        value: m.volume / 1e6,
      })),
    [allocationSorted]
  );
  const pnlChartData = useMemo(
    () =>
      rightSeries.map((d) => ({
        name: d.label,
        value: d.value / 1e3,
      })),
    [rightSeries]
  );
  const volumeTotalM = totalVolume / 1e6;
  const pnlTotalK =
    rightSeries.reduce((a, b) => a + b.value, 0) / 1e3;

  if (markets.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-white/60">No market distribution data available</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT - Allocation by Category */}
        <GlassCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">Allocation by Category</div>
              <div className="text-sm text-white/55">Total Volume</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/55">Total</div>
              <div className="font-semibold text-emerald-300">{fmtVolume(volumeTotalM)}</div>
            </div>
          </div>

          <div className="mt-5 h-[420px] sm:h-[460px] rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={(props) => (
                    <MiniTooltip
                      {...props}
                      valueFormatter={(v: number) => fmtVolume(v)}
                    />
                  )}
                />
                <Pie
                  data={volumeChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                >
                  {volumeChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={colorForLabel(entry.name)}
                        fillOpacity={0.95}
                      />
                    ))}
                  </Pie>
                  <foreignObject x="28%" y="32%" width="44%" height="46%">
                    <div className="flex h-full w-full flex-col items-center justify-center text-center">
                      <div className="text-sm font-medium text-white/60">Total Volume</div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-200">
                        {fmtVolume(volumeTotalM)}
                      </div>
                      <div className="mt-1 text-sm text-white/55">invested</div>
                    </div>
                  </foreignObject>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 space-y-4">
              {allocationSorted.map((m) => {
                const pct = totalVolume > 0 ? (m.volume / totalVolume) * 100 : 0;
                return (
                  <PillRow
                    key={m.key}
                    name={m.label}
                    color={colorForLabel(m.label)}
                    pct={`${pct.toFixed(1)}%`}
                    right={fmtVolume(m.volume / 1e6)}
                  />
                );
              })}
            </div>
        </GlassCard>

        {/* RIGHT - PNL by Category */}
        <GlassCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">PNL by Category</div>
              <div className="text-sm text-white/55">Total PNL by Category</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/55">Total</div>
              <div className="font-semibold text-emerald-300">
                {pnlTotalK >= 0 ? "+" : ""}
                {fmtMoney(pnlTotalK, "K")}
              </div>
            </div>
          </div>

          <div className="mt-5 h-[420px] sm:h-[460px] rounded-3xl border border-white/10 bg-black/25 p-5 backdrop-blur">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pnlChartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 18 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.60)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                  tickLine={false}
                  interval={0}
                  angle={-55}
                  textAnchor="end"
                  height={70}
                  tickMargin={12}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickFormatter={(v) => `$${v}k`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={(props) => (
                    <MiniTooltip
                      {...props}
                      valueFormatter={(v: number) =>
                        (v >= 0 ? "+" : "") + fmtMoney(v, "K")
                      }
                    />
                  )}
                />
                <Bar dataKey="value" radius={[16, 16, 16, 16]} barSize={58}>
                  {pnlChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.value >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 space-y-3">
            {rightSeries.map((row) => {
                const totalPnl = rightSeries.reduce((a, b) => a + b.value, 0);
                const pct =
                  totalPnl !== 0 ? (row.value / totalPnl) * 100 : 0;
                const valueK = row.value / 1e3;
                return (
                  <div
                    key={row.key}
                    className="group rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur transition hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{
                            background: row.value >= 0 ? "#22c55e" : "#ef4444",
                          }}
                        />
                        <div>
                          <div className="text-lg font-semibold text-white/92">
                            {row.label}
                          </div>
                          <div className="text-sm text-white/45">
                            {pct.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xl font-semibold ${
                            row.value >= 0 ? "text-white" : "text-rose-400"
                          }`}
                        >
                          {valueK >= 0 ? "+" : ""}
                          {fmtMoney(valueK, "K")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

