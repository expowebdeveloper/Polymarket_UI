import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Wifi,
  WifiOff,
  Trophy,
  DollarSign,
  Layers,
  Shield,
  BarChart3,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Bell,
  Copy,
  User,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { useActivityWebSocket, type Activity as WsActivity } from "../hooks/useActivityWebSocket";
import logo from "../assets/Vector.svg";

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
  /** All-time scoring from profile-stat (when from API) */
  final_score?: number | null;
  finalScore?: number | null;
  win_rate?: number | null;
  stake_yield?: number | null;
  /** All-time PnL from leaderboard/profile-stat (full data) */
  all_time_pnl?: number | null;
}

interface DashboardStats {
  period?: string;
  biggest_winners_month?: BiggestWinnerMonth[];
  top_performers?: TopTrader[];
  total_volume: string;
  tvl: string;
  open_interest: string;
  total_markets: string;
  total_traders: string;
  total_trades: string;
  total_buys: string;
  total_sells: string;
}

interface TopTrader {
  proxyAddress?: string;
  proxy_address?: string;
  username?: string | null;
  name?: string | null;
  pseudonym?: string | null;
  finalScore?: number;
  final_score?: number;
  rankingTag?: string;
  ranking_tag?: string;
  totalTrades?: number;
}

type ActivityEntry = {
  id: string;
  side: "BUY" | "SELL";
  question: string;
  amount: string;
  addr: string;
  accent: "green" | "red";
  ts: number;
};

type Toast = {
  id: string;
  side: "BUY" | "SELL";
  question: string;
  amount: string;
  addr: string;
  time: string;
};

// -----------------------------
// Helpers
// -----------------------------
const cn = (...c: Array<string | false | undefined | null>) => c.filter(Boolean).join(" ");

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

function parseUSD(s: string | undefined): number {
  if (!s || typeof s !== "string") return 0;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseNum(s: string | undefined): number {
  if (!s || typeof s !== "string") return 0;
  const n = parseInt(s.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatAgo(ts: number) {
  // API sends Unix timestamp in seconds; normalize to ms for comparison with Date.now()
  const tsMs = ts > 0 && ts < 1e12 ? ts * 1000 : ts;
  const s = Math.max(0, Math.floor((Date.now() - tsMs) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type Medal = { emoji: string; className: string; ariaLabel: string };

function getMedal(rank: number): Medal | null {
  if (rank === 1)
    return {
      emoji: "🥇",
      ariaLabel: "Gold medal",
      className:
        "border-yellow-400/30 bg-yellow-400/15 text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.15)]",
    };
  if (rank === 2)
    return {
      emoji: "🥈",
      ariaLabel: "Silver medal",
      className:
        "border-slate-200/25 bg-slate-200/10 text-slate-100 shadow-[0_0_24px_rgba(226,232,240,0.10)]",
    };
  if (rank === 3)
    return {
      emoji: "🥉",
      ariaLabel: "Bronze medal",
      className:
        "border-amber-700/30 bg-amber-700/15 text-amber-100 shadow-[0_0_24px_rgba(180,83,9,0.12)]",
    };
  return null;
}

// -----------------------------
// UI Components
// -----------------------------
function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/80 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]",
        "backdrop-blur-xl",
        className
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-b from-white/[0.07] to-white/[0.03]",
        "shadow-[0_16px_60px_-24px_rgba(0,0,0,0.9)]",
        "backdrop-blur-2xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Icon className="h-5 w-5 text-white/80" />
          </div>
          <div className="text-sm font-semibold text-blue-400">{title}</div>
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs text-white/55">{subtitle}</div>
    </GlassCard>
  );
}

function RowDivider() {
  return (
    <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  );
}

function FeedItem({ entry, index }: { entry: ActivityEntry; index: number }) {
  const base = Math.max(0.22, 1 - index * 0.07);
  const opacity = Math.min(1, Math.max(0.18, base));
  const isBuy = entry.side === "BUY";

  return (
    <motion.div
      layout
      style={{ opacity }}
      className={cn(
        "rounded-2xl border border-white/20",
        "bg-gradient-to-b from-white/[0.06] to-white/[0.02]",
        "px-6 py-5",
        "shadow-[0_18px_70px_-50px_rgba(0,0,0,0.95)]"
      )}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                isBuy
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/25 bg-rose-500/10 text-rose-200"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", isBuy ? "bg-emerald-400" : "bg-rose-400")} />
              {entry.side}
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight text-white/95">
                {entry.question}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/45">
                <span>{formatAgo(entry.ts)}</span>
                <span className="text-white/25">•</span>
                <span className="truncate">{entry.addr}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div className="text-xl font-semibold text-white">{entry.amount}</div>
          <div
            className={cn(
              "mt-1 text-sm",
              entry.accent === "green" ? "text-emerald-300/80" : "text-rose-300/80"
            )}
          >
            size
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BadgeMini({ side }: { side: "BUY" | "SELL" }) {
  const isBuy = side === "BUY";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border",
        isBuy
          ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
          : "bg-rose-500/15 text-rose-200 border-rose-500/20"
      )}
    >
      {side}
    </span>
  );
}

function ToastPopup({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const isBuy = toast.side === "BUY";
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.22 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-b from-white/[0.09] to-white/[0.04]",
        "shadow-[0_20px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl",
        "min-w-[320px] max-w-[420px]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-16 left-1/2 h-28 w-[420px] -translate-x-1/2 rounded-full blur-3xl",
          isBuy ? "bg-emerald-500/15" : "bg-rose-500/15"
        )}
      />
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl border",
                  isBuy
                    ? "border-emerald-500/25 bg-emerald-500/10"
                    : "border-rose-500/25 bg-rose-500/10"
                )}
              >
                <Sparkles className={cn("h-4 w-4", isBuy ? "text-emerald-200" : "text-rose-200")} />
              </span>
              <div className="flex items-center gap-2">
                <BadgeMini side={toast.side} />
                <span className="text-xs text-white/45">{toast.time}</span>
              </div>
            </div>
            <div className="mt-2 truncate text-sm font-semibold text-white/90">{toast.question}</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="truncate text-xs text-white/45">{toast.addr}</div>
              <div className="shrink-0 text-sm font-semibold text-white">{toast.amount}</div>
            </div>
          </div>
          <button
            onClick={() => onClose(toast.id)}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-white/70 hover:bg-white/[0.08]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" />
            <span>Recent trade (popup)</span>
          </div>
          <span className={cn(isBuy ? "text-emerald-300/80" : "text-rose-300/80")}>live</span>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------
// Dashboard
// -----------------------------
export function Dashboard(_props?: { onSelectSymbol?: (symbol: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevActivityCount = useRef(-1);

  const { activities: wsActivities, isConnected } = useActivityWebSocket();

  // Fetch dashboard stats
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
    const interval = setInterval(() => fetchStats(ac.signal), 30000);
    return () => {
      ac.abort();
      clearInterval(interval);
    };
  }, []);

  // Last updated when stats refresh
  const lastUpdated = useMemo(() => {
    if (!stats) return "";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  }, [stats]);

  // Tick for "ago" updates and fresh-filter recalculation
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => (v + 1) % 1_000_000), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Map WS activities to ActivityEntry (last 5, filter by size >= 100, only last 5 min)
  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const freshLimit = nowSec - 300; // Only show trades from last 5 minutes
    return wsActivities
      .filter((a) => (a.amount_usd || 0) >= 100 && (a.timestamp || 0) >= freshLimit)
      .slice(0, 5)
      .map((a: WsActivity) => ({
        id: a.id,
        side: a.side,
        question: a.market || "Unknown Market",
        amount: formatUSD(a.amount_usd || 0),
        addr: a.user_address ? `${a.user_address.slice(0, 6)}…${a.user_address.slice(-4)}` : "—",
        accent: a.side === "BUY" ? "green" : "red",
        ts: a.timestamp,
      }));
  }, [wsActivities, tick]);

  // Show toast when new activity arrives (connected); skip initial batch
  useEffect(() => {
    if (!isConnected || wsActivities.length === 0) return;
    const currentCount = wsActivities.filter((a) => (a.amount_usd || 0) >= 100).length;
    if (prevActivityCount.current < 0) {
      prevActivityCount.current = currentCount;
      return;
    }
    if (currentCount > prevActivityCount.current) {
      const latest = wsActivities.find((a) => (a.amount_usd || 0) >= 100);
      if (latest) {
        // API timestamp is in seconds
        const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
          new Date((latest.timestamp > 0 && latest.timestamp < 1e12 ? latest.timestamp * 1000 : latest.timestamp))
        );
        const toast: Toast = {
          id: `${latest.id}-${Date.now()}`,
          side: latest.side,
          question: latest.market || "Unknown Market",
          amount: formatUSD(latest.amount_usd || 0),
          addr: latest.user_address
            ? `${latest.user_address.slice(0, 6)}…${latest.user_address.slice(-4)}`
            : "—",
          time,
        };
        setToasts([toast]);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToasts([]), 5200);
      }
    }
    prevActivityCount.current = currentCount;
  }, [wsActivities, isConnected]);

  const closeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Metrics from live stats
  const volumeNum = useMemo(() => parseUSD(stats?.total_volume), [stats?.total_volume]);
  const totalTrades = useMemo(() => parseNum(stats?.total_trades), [stats?.total_trades]);
  const totalBuys = useMemo(() => parseNum(stats?.total_buys), [stats?.total_buys]);
  const totalSells = useMemo(() => parseNum(stats?.total_sells), [stats?.total_sells]);
  const buyRatio = totalTrades ? (totalBuys / totalTrades) * 100 : 0;
  const sellRatio = totalTrades ? (totalSells / totalTrades) * 100 : 0;

  const metrics = useMemo(
    () => [
      {
        icon: DollarSign,
        title: "Total Volume",
        value: loading ? "…" : formatUSD(volumeNum),
        subtitle: "Global volume in USDC base units",
      },
      {
        icon: Layers,
        title: "Total Value Locked",
        value: loading ? "…" : (stats?.tvl ?? "—"),
        subtitle: "Liquidity across markets",
      },
      {
        icon: Shield,
        title: "Open Interest",
        value: loading ? "…" : (stats?.open_interest ?? "—"),
        subtitle: "Notional active exposure",
      },
      {
        icon: BarChart3,
        title: "Total Markets",
        value: loading ? "…" : (stats?.total_markets ?? "0"),
        subtitle: "Active & resolved",
      },
      {
        icon: Users,
        title: "Total Traders",
        value: loading ? "…" : (stats?.total_traders ?? "0"),
        subtitle: "Unique addresses",
      },
      {
        icon: Activity,
        title: "Total Trades",
        value: loading ? "…" : formatInt(totalTrades),
        subtitle: "Recent executions (from API)",
      },
      {
        icon: ArrowUpRight,
        title: "Buy Ratio",
        value: loading ? "…" : `${buyRatio.toFixed(2)}%`,
        subtitle: `Buyers: ${formatInt(totalBuys)}`,
      },
      {
        icon: ArrowDownRight,
        title: "Sell Ratio",
        value: loading ? "…" : `${sellRatio.toFixed(2)}%`,
        subtitle: `Sellers: ${formatInt(totalSells)}`,
      },
    ],
    [loading, stats, volumeNum, totalTrades, totalBuys, totalSells, buyRatio, sellRatio]
  );

  const winners = useMemo(() => {
    const list = stats?.biggest_winners_month ?? [];
    return list.map((w, i) => ({
      rank: (w.rank != null ? w.rank : i + 1) as number,
      handle:
        w.userName || w.xUsername
          ? `@${w.xUsername || w.userName}`
          : `${w.user.slice(0, 6)}…${w.user.slice(-4)}`,
      user: w.user,
      profileImage: w.profileImage,
      pnl: w.pnl,
      pnlFormatted: `+${formatUSD(w.pnl)}`,
      profileLink: `/profile-stat?wallet=${encodeURIComponent(w.user)}`,
      finalScore: w.final_score ?? w.finalScore ?? null,
      winRate: w.win_rate ?? null,
      stakeYield: w.stake_yield ?? null,
      allTimePnl: w.all_time_pnl ?? null,
    }));
  }, [stats?.biggest_winners_month]);

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(1000px_600px_at_80%_0%,rgba(99,102,241,0.10),transparent_55%),radial-gradient(900px_600px_at_50%_90%,rgba(16,185,129,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_30%,transparent_70%,rgba(255,255,255,0.04))] opacity-40" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06]" />
      </div>

      <div className="fixed right-5 top-5 z-50 flex max-w-[460px] flex-col gap-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastPopup key={t.id} toast={t} onClose={closeToast} />
          ))}
        </AnimatePresence>
      </div>

      <div className="relative mx-auto w-full px-5 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
              {/* <img src={logo} alt="Polymarket" className="h-7 w-7 object-contain" /> */}
              {/* <svg viewBox="0 0 911 168" fill="none" role="img" aria-labelledby="polymarket-logo-title" xmlns="http://www.w3.org/2000/svg" className="h-2 w-auto cursor-pointer [&_path]:fill-text-primary "><title id="polymarket-logo-title">Polymarket</title><path d="M136.267 152.495C136.267 159.76 136.267 163.392 133.891 165.192C131.516 166.993 128.019 166.012 121.024 164.049L8.63192 132.51C4.41793 131.328 2.31093 130.737 1.09248 129.129C-0.125977 127.522 -0.125977 125.333 -0.125977 120.957V47.0434C-0.125977 42.6667 -0.125977 40.4783 1.09248 38.8709C2.31093 37.2634 4.41792 36.6722 8.63191 35.4897L121.024 3.95096C128.019 1.98834 131.516 1.00703 133.891 2.80771C136.267 4.60839 136.267 8.24049 136.267 15.5047V152.495ZM27.9043 122.228L120.966 148.345V96.1133L27.9043 122.228ZM15.1738 110.111L108.217 84L15.1738 57.8887V110.111ZM27.9033 45.7725L120.966 71.8877V19.6553L27.9033 45.7725Z" fill="currentColor"></path></svg> */}


              <img src={logo} alt="Polymarket" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight text-blue-500">
                Polymarket Overview
              </div>
              <div className="mt-1 text-sm text-white/55">
                Track activity in real-time and analyze growth.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <div className="flex items-center gap-2">
              <Pill className={cn(isConnected ? "border-emerald-500/25" : "border-cyan-500/25")}>
                <span
                  className={cn("h-2 w-2 rounded-full", isConnected ? "bg-emerald-400" : "bg-cyan-400")}
                />
                <span className="text-white/75">{isConnected ? "Live" : "Reconnecting"}</span>
              </Pill>
            </div>
            <div className="text-xs text-white/45">Last updated: {lastUpdated || "—"}</div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm",
                "shadow-[0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-xl"
              )}
              title="WebSocket status"
            >
              {isConnected ? (
                <Wifi className="h-4 w-4 text-white/80" />
              ) : (
                <WifiOff className="h-4 w-4 text-white/80" />
              )}
              <span className="font-medium">Live Feed</span>
            </div>
          </div>
        </div>

        <RowDivider />

        <div className="mb-3 text-xs font-semibold tracking-widest text-white/45">MARKET METRICS</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {metrics.map((m) => (
            <MetricCard
              key={m.title}
              icon={m.icon}
              title={m.title}
              value={m.value}
              subtitle={m.subtitle}
            />
          ))}
        </motion.div>

        <RowDivider />

        <div className="grid grid-cols-1 gap-5">
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_12%_0%,rgba(56,189,248,0.16),transparent_60%)]" />
              <div className="relative px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
                      <Activity className="h-5 w-5 text-white/80" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-blue-400">Live market activity</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                        <span>
                          Real-time trades via WebSocket (Polymarket API) · new items fade older ones
                        </span>
                        {isConnected && (
                          <span className="text-[10px] text-emerald-300/80">live</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Pill className={cn(isConnected ? "border-emerald-500/25" : "border-cyan-500/25")}>
                    <span
                      className={cn("h-2 w-2 rounded-full", isConnected ? "bg-emerald-400" : "bg-cyan-400")}
                    />
                    <span className="text-white/75">{isConnected ? "Live" : "Reconnecting"}</span>
                  </Pill>
                </div>
                <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div
                  ref={listRef}
                  className={cn(
                    "mt-4 max-h-[420px] overflow-y-auto pr-2",
                    "[scrollbar-width:thin]",
                    "[mask-image:linear-gradient(to_bottom,rgba(0,0,0,1)_85%,rgba(0,0,0,0))]"
                  )}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence initial={false}>
                      {activityEntries.length === 0 ? (
                        <div className="py-8 text-center text-sm text-white/55">
                          Waiting for trades ≥$100…
                        </div>
                      ) : (
                        activityEntries.map((entry, idx) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22 }}
                          >
                            <FeedItem entry={entry} index={idx} />
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            <GlassCard className="p-5">
              <div>
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-amber-500/10">
                      <Trophy className="h-5 w-5 text-amber-200" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-blue-500">
                        Biggest winners of the month
                      </div>
                      <div className="text-xs text-white/45">
                        Top 20 by PnL (API) · Win rate, stake yield &amp; final rating all-time
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                    {winners.length === 0 ? (
                      <div className="py-12 text-center text-sm text-white/50">
                        No leaderboard data available
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-sm">
                          <thead>
                            <tr className="bg-white/[0.04] text-left text-xs font-semibold uppercase tracking-widest text-white/45">
                              <th className="py-3.5 pl-5 pr-3">Trader</th>
                              <th className="py-3.5 px-3 text-right tabular-nums">PnL (month)</th>
                              <th className="py-3.5 px-3 text-right tabular-nums">All-time PnL</th>
                              <th className="py-3.5 px-3 text-right tabular-nums">Win rate</th>
                              <th className="py-3.5 px-3 text-right tabular-nums">Stake yield</th>
                              <th className="py-3.5 pl-3 pr-5 text-right tabular-nums">Final rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {winners.map((w) => {
                              const medal = getMedal(w.rank);
                              const handleCopyWallet = (e: React.MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(w.user);
                                setCopiedWallet(w.user);
                                setTimeout(() => setCopiedWallet(null), 2000);
                              };
                              return (
                                <tr
                                  key={w.rank}
                                  className="group border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.04]"
                                >
                                  <td className="py-3 pl-5 pr-3">
                                    <div className="flex items-center gap-3">
                                      {medal ? (
                                        <div
                                          className={cn(
                                            "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm shadow-sm",
                                            medal.className
                                          )}
                                        >
                                          <span>{medal.emoji}</span>
                                        </div>
                                      ) : (
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-xs font-semibold text-white/70 tabular-nums">
                                          {w.rank}
                                        </div>
                                      )}
                                      <a
                                        href={w.profileLink}
                                        className="relative flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 pr-2 transition-colors hover:bg-white/[0.04]"
                                      >
                                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 ring-1 ring-white/5">
                                          {w.profileImage ? (
                                            <img
                                              src={w.profileImage}
                                              alt=""
                                              className="h-full w-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                if (fallback) fallback.style.display = "flex";
                                              }}
                                            />
                                          ) : null}
                                          <div
                                            className="h-full w-full place-items-center text-white/50"
                                            style={{
                                              display: w.profileImage ? "none" : "flex",
                                            }}
                                            aria-hidden
                                          >
                                            <User className="h-5 w-5" />
                                          </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate font-medium text-white/95">{w.handle}</div>
                                          <div className="mt-0.5 flex items-center gap-1.5">
                                            <span className="max-w-[140px] truncate font-mono text-xs text-white/40" title={w.user}>
                                              {w.user.slice(0, 6)}…{w.user.slice(-4)}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={handleCopyWallet}
                                              className="shrink-0 rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                                              title="Copy wallet address"
                                            >
                                              {copiedWallet === w.user ? (
                                                <span className="text-[10px] font-medium text-emerald-400">Copied!</span>
                                              ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </a>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold tabular-nums text-emerald-400">
                                    {w.pnlFormatted}
                                  </td>
                                  <td className="py-3 px-3 text-right font-medium tabular-nums text-white/90">
                                    {w.allTimePnl != null
                                      ? (w.allTimePnl >= 0 ? "+" : "") + formatUSD(w.allTimePnl)
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right tabular-nums text-white/80">
                                    {w.winRate != null ? `${w.winRate.toFixed(1)}%` : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right tabular-nums">
                                    {w.stakeYield != null ? (
                                      <span className={cn("font-medium", w.stakeYield >= 0 ? "text-emerald-400" : "text-red-400")}>
                                        {w.stakeYield >= 0 ? "+" : ""}{w.stakeYield.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-white/50">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 pl-3 pr-5 text-right">
                                    {w.finalScore != null ? (
                                      <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg bg-amber-500/15 px-2 font-semibold tabular-nums text-amber-200">
                                        {Math.round(w.finalScore)}
                                      </span>
                                    ) : (
                                      <span className="text-white/50">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
            </GlassCard>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
          <div className="flex flex-col gap-2 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
            <div>
              All metrics: overall (all-time) data from Polymarket APIs. Activity feed is live.
            </div>
            <div className="text-white/35">Polymarket · Dashboard</div>
          </div>
        </div>
      </div>
    </div>
  );
}
