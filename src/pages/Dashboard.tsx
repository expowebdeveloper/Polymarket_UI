import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  DollarSign,
  Globe,
  Layers,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_BASE_URL } from "../config";
import { useActivityWebSocket, type Activity as WsActivity } from "../hooks/useActivityWebSocket";

// -----------------------------
// Types
// -----------------------------
interface DashboardStats {
  total_volume: string;
  tvl: string;
  open_interest: string;
  markets_volume: string;
  total_markets: string;
  total_traders: string;
  total_traders_source?: "api" | "db";
  lp_rewards: string;
  total_trades: string;
  total_trades_source?: "api" | "db";
  total_buys: string;
  total_sells: string;
}

type OverviewMetric = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: { dir: "up" | "down"; value: string };
};

type ActivityItem = {
  id: string;
  time: string;
  market: string;
  side: "BUY" | "SELL";
  sizeUSD: number;
  trader: string;
};

// -----------------------------
// Helpers
// -----------------------------
function formatUSD(n: number) {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const fmt = (value: number, suffix: string) =>
    `${sign}$${value.toFixed(value >= 10 ? 1 : 2)}${suffix}`;
  if (abs >= 1e12) return fmt(abs / 1e12, "T");
  if (abs >= 1e9) return fmt(abs / 1e9, "B");
  if (abs >= 1e6) return fmt(abs / 1e6, "M");
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatInt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Parse API string like "$4,464,244,645.43" to number */
function parseUSD(s: string | undefined): number {
  if (!s || typeof s !== "string") return 0;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Parse API string like "535,062" to number */
function parseNum(s: string | undefined): number {
  if (!s || typeof s !== "string") return 0;
  const n = parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatShortTime(timestamp: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, nowSec - timestamp);
  if (diff <= 3) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// -----------------------------
// UI
// -----------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: 0.06 * i, ease: "easeOut" as const },
  }),
};

function GlowBg() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-52 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-400/5 blur-[190px]" />
      <div className="absolute top-1/3 -left-52 h-[420px] w-[420px] rounded-full bg-purple-500/4 blur-[200px]" />
      <div className="absolute bottom-1/4 -right-56 h-[460px] w-[460px] rounded-full bg-blue-500/4 blur-[220px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.80)_70%,rgba(0,0,0,0.97)_100%)]" />
    </div>
  );
}

function StatCard({ m, index }: { m: OverviewMetric; index: number }) {
  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" animate="show">
      <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_25px_80px_rgba(0,0,0,0.75)] transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_30px_120px_rgba(34,211,238,0.18)]">
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute -top-24 right-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                {m.icon}
              </span>
              <span className="text-sm font-medium tracking-wide text-white/75">{m.label}</span>
            </div>
            {m.trend ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/80">
                {m.trend.dir === "up" ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {m.trend.value}
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-white">{m.value}</div>
          {m.sub ? <div className="mt-1 text-xs text-white/55">{m.sub}</div> : null}
        </div>
      </div>
    </motion.div>
  );
}

function ActivitySideBadge({ side }: { side: "BUY" | "SELL" }) {
  const isBuy = side === "BUY";
  const ring = isBuy ? "border-emerald-400/25" : "border-rose-400/25";
  const glow = isBuy
    ? "shadow-[0_0_22px_rgba(16,185,129,0.35)]"
    : "shadow-[0_0_22px_rgba(244,63,94,0.35)]";
  const bg = isBuy ? "bg-emerald-500/10" : "bg-rose-500/10";
  const text = isBuy ? "text-emerald-200" : "text-rose-200";
  const dot = isBuy ? "bg-emerald-400" : "bg-rose-400";
  const pulse = isBuy ? "bg-emerald-400/15" : "bg-rose-400/15";

  return (
    <span
      className={`relative inline-flex overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium ${ring} ${bg} ${text} ${glow}`}
    >
      <span className={`absolute inset-0 animate-pulse blur-md ${pulse}`} />
      <span className="relative inline-flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dot} shadow-[0_0_10px_currentColor]`} />
        {side}
      </span>
    </span>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <ActivitySideBadge side={item.side} />
          <span className="truncate text-sm font-medium text-white">{item.market}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
          <span>{item.time}</span>
          <span className="text-white/30">•</span>
          <span className="truncate">{item.trader}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-white">{formatUSD(item.sizeUSD)}</div>
        <div className="text-[11px] text-white/55">size</div>
      </div>
    </div>
  );
}

function VolumeChart({ series }: { series: { t: string; v: number }[] }) {
  return (
    <div className="h-[220px] w-full text-white">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
          <XAxis
            dataKey="t"
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
            width={34}
            tickFormatter={(n) => `${Number(n).toFixed(1)}B`}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(0, 0, 0, 0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              color: "rgba(255,255,255,0.92)",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
            formatter={(value: number) => [`${Number(value).toFixed(2)}B`, "Volume"]}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="currentColor"
            fill="url(#volFill)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// -----------------------------
// Dashboard
// -----------------------------
export function Dashboard(_props?: { onSelectSymbol?: (symbol: string) => void }) {
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { activities: wsActivities, isConnected } = useActivityWebSocket();

  const fetchStats = async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/stats`, { signal });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      console.error("Failed to fetch dashboard stats", e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    fetchStats(ac.signal);
    const interval = setInterval(() => fetchStats(ac.signal), 10000);
    return () => {
      ac.abort();
      clearInterval(interval);
    };
  }, []);

  const volumeNum = useMemo(() => parseUSD(stats?.total_volume), [stats?.total_volume]);
  const totalTrades = useMemo(() => parseNum(stats?.total_trades), [stats?.total_trades]);
  const totalBuys = useMemo(() => parseNum(stats?.total_buys), [stats?.total_buys]);
  const totalSells = useMemo(() => parseNum(stats?.total_sells), [stats?.total_sells]);

  const volumeSeries = useMemo(() => {
    const vB = volumeNum / 1e9;
    const labels = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
    return labels.map((t, i) => ({
      t,
      v: Number((vB * (0.82 + (0.18 * i) / (labels.length - 1))).toFixed(2)),
    }));
  }, [volumeNum]);

  const overview = useMemo<OverviewMetric[]>(() => {
    const vol = volumeNum;
    const tvl = parseUSD(stats?.tvl);
    const oi = parseUSD(stats?.open_interest);
    const markets = parseNum(stats?.total_markets);
    const traders = parseNum(stats?.total_traders);
    const trades = totalTrades;
    const buys = totalBuys;
    const sells = totalSells;

    const buyRatio = trades ? (buys / trades) * 100 : 0;
    const sellRatio = trades ? (sells / trades) * 100 : 0;

    return [
      {
        label: "Total Volume",
        value: loading ? "…" : formatUSD(vol),
        sub: "Global volume in USDC base units",
        icon: <DollarSign className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Total Value Locked",
        value: loading ? "…" : formatUSD(tvl),
        sub: "Liquidity across markets",
        icon: <Layers className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Open Interest",
        value: loading ? "…" : formatUSD(oi),
        sub: "Notional active exposure",
        icon: <ShieldCheck className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Total Markets",
        value: loading ? "…" : formatInt(markets),
        sub: "Active & resolved",
        icon: <Boxes className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Total Traders",
        value: loading ? "…" : formatInt(traders),
        sub: stats?.total_traders_source === "db" ? "Unique addresses (from DB)" : "Unique addresses",
        icon: <Users className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Total Trades",
        value: loading ? "…" : formatInt(trades),
        sub: stats?.total_trades_source === "db" ? "All-time executions (from DB)" : "Recent executions (from API)",
        icon: <BarChart3 className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Buy Ratio",
        value: loading ? "…" : `${buyRatio.toFixed(2)}%`,
        sub: `Buys: ${formatInt(buys)}`,
        icon: <ArrowUpRight className="h-4 w-4 text-white/85" />,
      },
      {
        label: "Sell Ratio",
        value: loading ? "…" : `${sellRatio.toFixed(2)}%`,
        sub: `Sells: ${formatInt(sells)}`,
        icon: <ArrowDownRight className="h-4 w-4 text-white/85" />,
      },
    ];
  }, [
    loading,
    stats,
    volumeNum,
    totalTrades,
    totalBuys,
    totalSells,
  ]);

  const lastUpdated = useMemo(() => {
    return new Date().toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [stats]);

  const activityList = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = wsActivities
      .filter((a) => (a.amount_usd || 0) >= 100)
      .slice(0, 50)
      .map((a: WsActivity) => ({
        id: a.id,
        time: formatShortTime(a.timestamp),
        market: a.market || "Unknown Market",
        side: a.side,
        sizeUSD: a.amount_usd || 0,
        trader: a.user_address ? `${a.user_address.slice(0, 6)}…${a.user_address.slice(-4)}` : "—",
      }));
    return list;
  }, [wsActivities]);

  const buyRatioPct = useMemo(() => {
    if (activityList.length === 0) return 50;
    const buys = activityList.filter((a) => a.side === "BUY").length;
    return clamp((buys / activityList.length) * 100, 0, 100);
  }, [activityList]);

  const avgTradeSize = useMemo(() => {
    if (activityList.length === 0) return 0;
    const sum = activityList.reduce((s, a) => s + a.sizeUSD, 0);
    return sum / activityList.length;
  }, [activityList]);

  return (
    <div className="relative min-h-screen bg-[#000000] text-white">
      <GlowBg />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                <Globe className="h-5 w-5 text-white/85" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Polymarket Overview</h1>
                <p className="mt-1 text-sm text-white/60">
                  Track activity in real-time and analyze growth.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
          >
            {/* <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {(["24h", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    range === r ? "bg-white/15 text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div> */}

            <div className="flex items-center gap-2">
              <span className="relative inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 shadow-[0_0_20px_rgba(34,211,238,0.40)]">
                <span className="absolute inset-0 animate-pulse rounded-lg bg-cyan-400/10 blur-md" />
                <span className="relative inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  System Status: {isConnected ? "Live" : "Reconnecting"}
                </span>
              </span>
              <div className="hidden text-xs text-white/55 sm:block">Last updated: {lastUpdated}</div>
            </div>

            <a
              href="#activity"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/15"
            >
              <Activity className="mr-2 h-4 w-4" />
              Live Feed
            </a>
          </motion.div>
        </div>

        <div className="my-6 h-px bg-white/10" />

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
            >
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_110px_rgba(0,0,0,0.80)]">
                <div className="absolute inset-0">
                  <div className="absolute -top-20 left-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl" />
                </div>
                <div className="relative p-5 pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-white/85">Market Volume Trend</h2>
                      <div className="mt-1 text-xs text-white/55">
                        Total traded volume • Range: {range.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/80">
                        {loading ? "…" : formatUSD(volumeNum)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="relative px-5 pb-5">
                  <VolumeChart series={volumeSeries} />

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                      <div className="text-xs text-white/55">Buy Activity (feed)</div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-400/80 transition-all duration-500"
                          style={{ width: `${buyRatioPct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">{buyRatioPct.toFixed(0)}%</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                      <div className="text-xs text-white/55">Avg Trade Size (feed)</div>
                      <div className="mt-2 text-sm font-semibold text-white">{formatUSD(avgTradeSize)}</div>
                      <div className="mt-1 text-xs text-white/55">Live feed sample</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                      <div className="text-xs text-white/55">Network</div>
                      <div className="mt-2 text-sm font-semibold text-white">Polygon</div>
                      <div className="mt-1 text-xs text-white/55">fast finality</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overview.map((m, idx) => (
                <StatCard key={m.label} m={m} index={idx} />
              ))}
            </div>
          </div>

          <div id="activity" className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_110px_rgba(0,0,0,0.80)]">
                <div className="absolute inset-0">
                  <div className="absolute -top-28 right-0 h-80 w-80 rounded-full bg-purple-400/10 blur-3xl" />
                </div>
                <div className="relative p-5 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-white/90">Live Market Activity</h2>
                      <div className="mt-1 text-xs text-white/55">Last 5m global feed • auto-refresh</div>
                    </div>
                    <span className="relative inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90 shadow-[0_0_18px_rgba(34,211,238,0.30)]">
                      <span className="absolute inset-0 animate-pulse rounded-lg bg-cyan-400/10 blur-md" />
                      <span className="relative inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                        {isConnected ? "Live" : "Reconnecting"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="relative max-h-[480px] overflow-y-auto p-5 pt-2 custom-scrollbar">
                  <div className="flex flex-col gap-3">
                    {activityList.length === 0 ? (
                      <div className="py-8 text-center text-sm text-white/55">
                        Waiting for trades &gt;$100…
                      </div>
                    ) : (
                      activityList.map((a) => <ActivityRow key={a.id} item={a} />)
                    )}
                  </div>

                  <div className="my-4 h-px bg-white/10" />

                  <div className="flex items-center justify-between text-xs text-white/55">
                    <div className="inline-flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}
                      />
                      {isConnected ? "Live stream active" : "Reconnecting…"}
                    </div>
                    <div className="text-white/60">Status: {isConnected ? "OK" : "…"}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/55 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="h-4 w-4 text-white/80" />
            </span>
            <span>
              Volume, TVL, Open Interest, Total Markets: Polymarket API. Total Traders / Total Trades: from API when available, else our DB. Activity feed is live.
            </span>
          </div>
          <div className="text-white/50">Polymarket • Dashboard</div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
