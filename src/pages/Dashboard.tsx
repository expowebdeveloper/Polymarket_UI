
import { useState, useEffect } from 'react';
import { ActivityFeed } from '../components/ActivityFeed';

interface DashboardStats {
  total_volume: string;
  tvl: string;
  open_interest: string;
  markets_volume: string;
  total_markets: string;
  total_traders: string;
  lp_rewards: string;
  total_trades: string;
  total_buys: string;
  total_sells: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Use env var or default to local
      const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${baseUrl}/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Placeholder data to prevent layout shift during loading if desired, 
  // or just show simple loading state.
  const displayStats = stats || {
    total_volume: "Loading...",
    tvl: "Loading...",
    open_interest: "Loading...",
    markets_volume: "Loading...",
    total_markets: "0",
    total_traders: "0",
    lp_rewards: "Loading...",
    total_trades: "0",
    total_buys: "0",
    total_sells: "0"
  };

  return (
    <div className=" overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 font-sans" style={{ maxHeight: "100vh" }}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {/* Logo Icon Mockup */}

          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            Polymarket Overview
          </h1>
          <p className="text-zinc-500 font-medium">
            Track activity in real time and analyze growth.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-2 bg-[#111] border border-zinc-800 px-3 py-1.5 rounded text-blue-400">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            System Status
          </span>
          <span>
            Last updated: {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left Column: Stats Grid (approx 75% width on XL) */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">

            {/* 1. Total Volume (Wide) */}
            <StatCard
              label="Total Volume"
              value={displayStats.total_volume}
              subtext="Global volume of share purchases in USDC base units."
              icon={<BarChartIcon />}
              wide={true}
            />

            {/* 2. TVL */}
            <StatCard
              label="Total Value Locked"
              value={displayStats.tvl}
              icon={<LockIcon />}
            />

            {/* 3. Open Interest */}
            <StatCard
              label="Open Interest"
              value={displayStats.open_interest}
              icon={<ActivityIcon />}
            />

            {/* 4. Markets Volume */}
            <StatCard
              label="Markets Volume"
              value={displayStats.markets_volume}
              icon={<ZapIcon />}
            />

            {/* 5. Total Markets */}
            <StatCard
              label="Total Markets"
              value={displayStats.total_markets}
              icon={<StoreIcon />}
            />

            {/* 6. Total Traders */}
            <StatCard
              label="Total Traders"
              value={displayStats.total_traders}
              icon={<UsersIcon />}
            />

            {/* 7. LP Rewards */}
            <StatCard
              label="Total LP Rewards"
              value={displayStats.lp_rewards}
              icon={<TrophyIcon />}
            />

            {/* 8. Total Trades (Wide Split) */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                label="Total Trades"
                value={displayStats.total_trades}
                icon={<GlobeIcon />}
              />

              <SplitStatCard
                label="Total Buys"
                value={displayStats.total_buys}
                ratio="73.55% Ratio"
                color="text-[#EDEDED]"
                icon={<TrendingUpIcon />}
              />

              <SplitStatCard
                label="Total Sells"
                value={displayStats.total_sells}
                ratio="26.45% Ratio"
                color="text-[#EDEDED]"
                icon={<TrendingDownIcon />}
              />
            </div>

          </div>
        </div>

        {/* Right Column: Live Activity Feed (approx 25% width on XL) */}
        <div className="w-full xl:w-[400px] shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Live Market Activity
            </h2>
          </div>

          <div className="h-[580px] overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-[-1px_1px_10px_1px_#b1b3b9] hover:shadow-[-1px_1px_10px_1px_#1e53be] transition-shadow duration-300 custom-scrollbar">
            <ActivityFeed />
          </div>
        </div>
      </div>

    </div>
  );
}

// --- Components ---

function StatCard({ label, value, subtext, icon, wide }: any) {
  return (
    <div className={`bg-[#0A0A0A] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between 
            shadow-[-1px_1px_10px_1px_#b1b3b9] hover:shadow-[-1px_1px_10px_1px_#1e53be]
            transition-all duration-300 ${wide ? 'lg:col-span-2' : ''}`}>
      <div>
        <div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs font-medium tracking-wide uppercase">
          {icon}
          {label}
        </div>
        <div className="text-xl md:text-2xl lg:text-3xl font-mono text-white tracking-tight">
          {value}
        </div>
      </div>
      {subtext && (
        <div className="mt-2 text-[10px] text-zinc-600 font-mono">
          {subtext}
        </div>
      )}
    </div>
  );
}

function SplitStatCard({ label, value, ratio, color, icon }: any) {
  return (
    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-5 flex flex-col justify-between 
            shadow-[-1px_1px_10px_1px_#b1b3b9] hover:shadow-[-1px_1px_10px_1px_#1e53be]
            transition-all duration-300">
      <div className="flex items-center justify-between text-zinc-500 mb-2 text-xs font-medium tracking-wide uppercase">
        <div className="flex items-center gap-2">
          {icon}
          {label}
        </div>
        <div className="font-mono text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
          {ratio}
        </div>
      </div>
      <div className={`text-xl md:text-2xl font-mono ${color} tracking-tight`}>
        {value}
      </div>
    </div>
  );
}

// --- Icons (Simple SVG Wrappers) ---
const BarChartIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-6" /></svg>;
const LockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const ActivityIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const ZapIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const StoreIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM21 9H3M12 3v18M12 9l-4 5h8l-4-5" /></svg>;
const UsersIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const TrophyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8M12 17v4M7 4h10M17 4v7a5 5 0 0 1-10 0V4" /></svg>;
const GlobeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const TrendingUpIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
const TrendingDownIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>;
