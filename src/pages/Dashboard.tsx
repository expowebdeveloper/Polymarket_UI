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
  Trophy,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { useActivityWebSocket, type Activity as WsActivity } from "../hooks/useActivityWebSocket";

// -----------------------------
// Types
// -----------------------------
interface BiggestWinnerMonth {
  user: string;
  userName?: string;
  xUsername?: string;
  profileImage?: string;
  pnl: number;
  vol: number;
  rank?: number;
  roi?: number;
  winRate?: number;
  totalTrades?: number;
}

interface DashboardStats {
  period?: string;
  biggest_winner_month?: BiggestWinnerMonth | null;
  biggest_winners_month?: BiggestWinnerMonth[];
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
      <div className="absolute inset-0 " />
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
    <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
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

// -----------------------------
// Dashboard
// -----------------------------
export function Dashboard(_props?: { onSelectSymbol?: (symbol: string) => void }) {
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
    <div className="relative min-h-screen text-white">
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
                <h1 className="text-3xl font-semibold tracking-tight">Market Overview</h1>
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

        {/* 1. All metrics at top - full width */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/60">Market metrics</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overview.map((m, idx) => (
              <StatCard key={m.label} m={m} index={idx} />
            ))}
          </div>
        </section>

        <div className="my-6 h-px bg-white/10" />

        {/* 2. Below: Biggest winners + Live market activity - side by side, equal prominence */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Biggest winners of the month */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="flex flex-col"
          >
            <div className="flex h-full max-h-[680px] flex-col rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_25px_70px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-5 py-4">
                <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
                <h2 className="text-base font-semibold text-white/95">Biggest winners of the month</h2>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar-activity p-4">
                {stats?.biggest_winners_month && stats.biggest_winners_month.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {stats.biggest_winners_month.map((w, idx) => (
                      <a
                        key={w.user || idx}
                        href={w.user ? `/profile-stat?wallet=${encodeURIComponent(w.user)}` : "#"}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.06] p-3 transition-all hover:bg-amber-500/15 hover:border-amber-500/25"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/25 text-sm font-bold text-amber-300">
                          {(w.rank != null ? w.rank : idx + 1)}
                        </span>
                        {w.profileImage ? (
                          <img
                            src={w.profileImage}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full border border-amber-500/20 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white/60">
                            {(w.userName || w.xUsername || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {w.userName || w.xUsername
                              ? `@${w.xUsername || w.userName}`
                              : `${w.user.slice(0, 6)}…${w.user.slice(-4)}`}
                          </p>
                          <p className="text-xs font-semibold text-emerald-400">
                            +{formatUSD(w.pnl)} PnL
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center py-12 text-sm text-white/50">
                    No leaderboard data available
                  </div>
                )}
              </div>
              <p className="border-t border-amber-500/10 px-4 py-2.5 text-xs text-white/50">
                Polymarket leaderboard API • Click to view profile
              </p>
            </div>
          </motion.div>

          {/* Live market activity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="flex flex-col"
            id="activity"
          >
            <div className="relative flex h-full max-h-[680px] flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_25px_70px_rgba(0,0,0,0.4)]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-28 right-0 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl" />
              </div>
              <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-white/95">Live market activity</h2>
                  <p className="mt-0.5 text-xs text-white/55">Last 5m global feed • auto-refresh</p>
                </div>
                <span className="relative inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-white/90 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  {isConnected ? "Live" : "Reconnecting"}
                </span>
              </div>
              <div className="relative flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar-activity">
                <div className="flex flex-col gap-3">
                  {activityList.length === 0 ? (
                    <div className="py-12 text-center text-sm text-white/55">
                      Waiting for trades &gt;$100…
                    </div>
                  ) : (
                    activityList.map((a) => <ActivityRow key={a.id} item={a} />)
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-white/50">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-cyan-400" : "bg-amber-400 animate-pulse"}`} />
                    {isConnected ? "Live stream active" : "Reconnecting…"}
                  </span>
                  <span>Status: {isConnected ? "OK" : "…"}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <div className="mt-6 flex flex-col items-start justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/55 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/10">
              <ShieldCheck className="h-4 w-4 text-white/80" />
            </span>
            <span>
              All metrics: overall (all-time) data from Polymarket APIs. Activity feed is live.
            </span>
          </div>
          <div className="text-white/50">Polymarket • Dashboard</div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scrollbar-activity::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-activity::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-activity::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
      `}</style>
    </div>
  );
}
