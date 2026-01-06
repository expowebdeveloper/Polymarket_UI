import { useState, useEffect, useMemo } from 'react';
import { Search, Bell, Settings, User, ChevronDown, ChevronUp } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  fetchPositionsForWallet,
  fetchClosedPositionsForWallet,
  fetchActivityForWallet,
  fetchProfileStats,
  fetchPortfolioStats,
  fetchTraderDetails,
  fetchUserLeaderboardData,
  fetchTradeHistory,
  syncTradesForWallet,
} from '../services/api';
import type { Position, ClosedPosition, Activity, ProfileStatsResponse, UserLeaderboardData, TradeHistoryResponse } from '../types/api';

// Helper function to format currency
const formatCurrency = (value: number | string | undefined): string => {
  if (!value && value !== 0) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

// Helper function to format date
const formatDate = (date: string | number | undefined): string => {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

// Helper function to format size
const formatSize = (size: number | string | undefined): string => {
  if (size === undefined || size === null) return '0.0000';
  const num = typeof size === 'string' ? parseFloat(size) : size;
  if (isNaN(num)) return '0.0000';
  return num.toFixed(4);
};

// Helper function to validate wallet address
const validateWallet = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Helper function to shorten wallet address
const shortenAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

export function WalletDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isValidWallet, setIsValidWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'distribution'>('history');

  // Data states
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [allClosedPositions, setAllClosedPositions] = useState<ClosedPosition[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [userLeaderboardData, setUserLeaderboardData] = useState<UserLeaderboardData | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryResponse | null>(null);

  const fetchWalletData = async () => {
    if (!validateWallet(walletAddress)) return;

    setLoading(true);
    setError(null);

    try {
      // First sync trades to ensure fresh data
      try {
        await syncTradesForWallet(walletAddress);
      } catch (e) {
        console.warn("Auto-sync failed, proceeding with existing data", e);
      }

      // Fetch all data in parallel
      const [
        profileData,
        positionsData,
        closedPositionsData,
        activitiesData,
        portfolioData,
        traderData,
        leaderboardData,
        tradeHistoryData,
      ] = await Promise.allSettled([
        fetchProfileStats(walletAddress),
        fetchPositionsForWallet(walletAddress),
        fetchClosedPositionsForWallet(walletAddress),
        fetchActivityForWallet(walletAddress, undefined, 1000),
        fetchPortfolioStats(walletAddress),
        fetchTraderDetails(walletAddress),
        fetchUserLeaderboardData(walletAddress, 'overall'),
        fetchTradeHistory(walletAddress),
      ]);

      if (profileData.status === 'fulfilled') {
        setProfileStats(profileData.value);
      }
      if (positionsData.status === 'fulfilled') {
        setActivePositions(positionsData.value?.positions || []);
      } else if (positionsData.status === 'rejected') {
        console.warn('Failed to fetch positions:', positionsData.reason);
        setActivePositions([]);
      }
      if (closedPositionsData.status === 'fulfilled') {
        const closedList = closedPositionsData.value || [];
        setAllClosedPositions(closedList);
      }
      if (activitiesData.status === 'fulfilled') {
        const activitiesList = activitiesData.value.activities || [];
        setAllActivities(activitiesList);
      }
      if (portfolioData.status === 'fulfilled') {
        setPortfolioStats(portfolioData.value);
      }
      if (leaderboardData.status === 'fulfilled') {
        setUserLeaderboardData(leaderboardData.value);
      } else if (leaderboardData.status === 'rejected') {
        console.warn('Failed to fetch leaderboard data:', leaderboardData.reason);
      }
      if (tradeHistoryData.status === 'fulfilled') {
        setTradeHistory(tradeHistoryData.value);
      } else if (tradeHistoryData.status === 'rejected') {
        console.warn('Failed to fetch trade history:', tradeHistoryData.reason);
      }

      const errors = [
        profileData.status === 'rejected' ? 'Profile stats' : null,
        positionsData.status === 'rejected' ? 'Positions' : null,
        closedPositionsData.status === 'rejected' ? 'Closed positions' : null,
        activitiesData.status === 'rejected' ? 'Activities' : null,
        portfolioData.status === 'rejected' ? 'Portfolio stats' : null,
        traderData.status === 'rejected' ? 'Trader details' : null,
        leaderboardData.status === 'rejected' ? 'Leaderboard data' : null,
        tradeHistoryData.status === 'rejected' ? 'Trade history' : null,
      ].filter(Boolean);

      if (errors.length > 0 && errors.length === 8) {
        setError(`Failed to load wallet data: ${errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress.length === 42) {
      const isValid = validateWallet(walletAddress);
      setIsValidWallet(isValid);
      if (isValid && walletAddress) {
        fetchWalletData();
      }
    } else {
      setIsValidWallet(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  // Calculate highest loss
  const highestLoss = portfolioStats?.performance_metrics?.worst_loss !== undefined
    ? portfolioStats.performance_metrics.worst_loss
    : (allClosedPositions.length > 0
      ? Math.min(...allClosedPositions.map(pos => pos.realized_pnl || 0).filter(pnl => pnl < 0), 0)
      : 0);

  // Calculate streaks, wins, losses
  const streaks = useMemo(() => {
    if (!allClosedPositions || allClosedPositions.length === 0) {
      return { longest_streak: 0, current_streak: 0, total_wins: 0, total_losses: 0 };
    }

    const sorted = [...allClosedPositions].sort((a, b) => {
      const timeA = (a as any).timestamp || (a.created_at ? new Date(a.created_at).getTime() : 0);
      const timeB = (b as any).timestamp || (b.created_at ? new Date(b.created_at).getTime() : 0);
      return timeA - timeB;
    });

    let longestStreak = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let totalWins = 0;
    let totalLosses = 0;

    for (const pos of sorted) {
      const pnl = pos.realized_pnl || 0;
      if (pnl > 0) {
        totalWins++;
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (pnl < 0) {
        totalLosses++;
        longestStreak = Math.max(longestStreak, maxStreak);
        currentStreak = 0;
        maxStreak = 0;
      }
    }

    longestStreak = Math.max(longestStreak, maxStreak);

    return {
      longest_streak: longestStreak,
      current_streak: currentStreak,
      total_wins: totalWins,
      total_losses: totalLosses,
    };
  }, [allClosedPositions]);

  // Calculate rewards earned
  const rewardsEarned = useMemo(() => {
    return allActivities
      .filter(activity => activity.type === 'REWARD')
      .reduce((sum, activity) => sum + (parseFloat(String(activity.usdc_size || 0))), 0);
  }, [allActivities]);

  // Calculate total volume
  const totalVolume = useMemo(() => {
    let volume = 0;
    allClosedPositions.forEach(pos => {
      const stake = (parseFloat(String((pos as any).total_bought || pos.size || 0)) * parseFloat(String(pos.avg_price || 0)));
      volume += stake;
    });
    activePositions.forEach(pos => {
      volume += parseFloat(String(pos.initial_value || 0));
    });
    allActivities.forEach(activity => {
      if (activity.usdc_size) {
        volume += parseFloat(String(activity.usdc_size));
      }
    });
    return volume || userLeaderboardData?.vol || portfolioStats?.performance_metrics?.total_investment || 0;
  }, [allClosedPositions, activePositions, allActivities, userLeaderboardData, portfolioStats]);

  // Helper function to categorize market
  const categorizeMarket = useMemo(() => {
    return (title: string, slug: string): string => {
      const titleLower = (title || "").toLowerCase();
      const slugLower = (slug || "").toLowerCase();
      const combined = `${titleLower} ${slugLower}`;

      if (['president', 'election', 'politics', 'trump', 'biden', 'senate', 'congress', 'vote', 'poll', 'democrat', 'republican', 'political'].some(k => combined.includes(k))) {
        return "Politics";
      }
      if (['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'blockchain', 'defi', 'nft', 'token', 'coin'].some(k => combined.includes(k))) {
        return "Crypto";
      }
      if (['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'baseball', 'hockey', 'sports', 'game', 'match', 'championship', 'super bowl', 'world cup'].some(k => combined.includes(k))) {
        return "Sports";
      }
      if (['fed', 'federal reserve', 'interest rate', 'inflation', 'gdp', 'unemployment', 'macro', 'rates', 'treasury', 'bond', 'economic'].some(k => combined.includes(k))) {
        return "Macro / Rates";
      }
      return "Other";
    };
  }, []);

  // Calculate market distribution
  const marketDistribution = useMemo(() => {
    const categoryStats = new Map<string, {
      capital: number;
      totalPnl: number;
      wins: number;
      losses: number;
      trades: number;
      markets: Set<string>;
    }>();

    allClosedPositions.forEach(pos => {
      const title = pos.title || "Unknown";
      const slug = pos.slug || "Unknown";
      const category = categorizeMarket(title, slug);

      const stake = parseFloat(String((pos as any).total_bought || pos.size || 0)) * parseFloat(String(pos.avg_price || 0));
      const pnl = parseFloat(String(pos.realized_pnl || 0));

      if (!categoryStats.has(category)) {
        categoryStats.set(category, {
          capital: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0,
          trades: 0,
          markets: new Set()
        });
      }

      const stats = categoryStats.get(category)!;
      stats.capital += stake;
      stats.totalPnl += pnl;
      stats.trades += 1;
      stats.markets.add(slug);

      if (pnl > 0) {
        stats.wins += 1;
      } else if (pnl < 0) {
        stats.losses += 1;
      }
    });

    activePositions.forEach(pos => {
      const title = pos.title || "Unknown";
      const slug = pos.slug || "Unknown";
      const category = categorizeMarket(title, slug);

      const capital = parseFloat(String(pos.initial_value || 0));

      if (!categoryStats.has(category)) {
        categoryStats.set(category, {
          capital: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0,
          trades: 0,
          markets: new Set()
        });
      }

      categoryStats.get(category)!.capital += capital;
      categoryStats.get(category)!.markets.add(slug);
    });

    const totalCapital = Array.from(categoryStats.values()).reduce((sum, s) => sum + s.capital, 0);

    const distribution = Array.from(categoryStats.entries()).map(([category, stats]) => {
      const roiPercent = stats.capital > 0 ? (stats.totalPnl / stats.capital * 100) : 0;
      const winRatePercent = stats.trades > 0 ? (stats.wins / stats.trades * 100) : 0;
      const capitalPercent = totalCapital > 0 ? (stats.capital / totalCapital * 100) : 0;

      return {
        category,
        capital: stats.capital,
        capital_percent: capitalPercent,
        roi_percent: roiPercent,
        win_rate_percent: winRatePercent,
        trades_count: stats.trades,
        wins: stats.wins,
        losses: stats.losses,
        total_pnl: stats.totalPnl,
        unique_markets: stats.markets.size
      };
    });

    return distribution.sort((a, b) => b.capital - a.capital);
  }, [allClosedPositions, activePositions, categorizeMarket]);

  // Get scoring metrics
  const scoringMetrics = useMemo(() => {
    const finalScore = (tradeHistory?.overall_metrics as any)?.final_score ||
      (tradeHistory?.overall_metrics as any)?.score ||
      (userLeaderboardData?.rank ? (100 - Number(userLeaderboardData.rank)) : 0);

    return {
      final_score: finalScore,
      total_pnl: portfolioStats?.pnl_metrics?.total_pnl || portfolioStats?.performance_metrics?.total_pnl || 0,
      roi: portfolioStats?.performance_metrics?.roi || tradeHistory?.overall_metrics?.roi || 0,
      win_rate: tradeHistory?.overall_metrics?.win_rate || portfolioStats?.performance_metrics?.win_rate || 0,
      win_rate_percent: tradeHistory?.overall_metrics?.win_rate || portfolioStats?.performance_metrics?.win_rate || 0,
      total_trades: tradeHistory?.overall_metrics?.total_trades || profileStats?.trades || allClosedPositions.length || 0,
      score_risk: (tradeHistory?.overall_metrics as any)?.risk_score || 0,
      roi_shrunk: (tradeHistory?.overall_metrics as any)?.roi_shrunk || 0,
    };
  }, [tradeHistory, portfolioStats, userLeaderboardData, profileStats, allClosedPositions]);

  // Calculate profit trend for last 7 days
  const profitTrend = useMemo(() => {
    const days: { [key: string]: { day: string; profit: number } } = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];
      days[dayKey] = { day: dayName, profit: 0 };
    }

    allClosedPositions.forEach(pos => {
      if (pos.created_at) {
        const tradeDate = new Date(pos.created_at);
        const dayKey = tradeDate.toISOString().split('T')[0];

        if (days[dayKey]) {
          days[dayKey].profit += parseFloat(String(pos.realized_pnl || 0));
        }
      }
    });

    let cumulative = 0;
    return Object.keys(days).sort().map(dayKey => {
      cumulative += days[dayKey].profit;
      return {
        day: days[dayKey].day,
        date: dayKey,
        profit: days[dayKey].profit,
        cumulative_profit: cumulative
      };
    });
  }, [allClosedPositions]);

  const primaryMetrics = [
    { label: "ROI %", value: `${scoringMetrics?.roi >= 0 ? '+' : ''}${(scoringMetrics?.roi || 0).toFixed(2)}%`, sub: "All-time" },
    { label: "Win Rate", value: `${(scoringMetrics?.win_rate_percent || 0).toFixed(0)}%`, sub: `${streaks.total_wins} of ${streaks.total_wins + streaks.total_losses} trades` },
    { label: "Total Volume", value: formatCurrency(totalVolume), sub: `Across ${marketDistribution.length} markets` },
    { label: "Total Trades", value: String(scoringMetrics?.total_trades || 0), sub: "Since joining" },
    { label: "Total PnL", value: formatCurrency(scoringMetrics?.total_pnl || 0), sub: "Realized + Unrealized" },
  ];

  const advancedMetrics = [
    { label: "Risk Score", value: (scoringMetrics?.score_risk || 0).toFixed(2) },
    { label: "Max Drawdown", value: `${highestLoss ? highestLoss.toFixed(1) : '0.0'}%` },
    { label: "Worst Loss", value: formatCurrency(highestLoss) },
    { label: "Avg Stake", value: formatCurrency(totalVolume / (scoringMetrics?.total_trades || 1)) },
    { label: "Stake Volatility", value: "0.31" },
    { label: "Consistency", value: `${((streaks.total_wins / (streaks.total_wins + streaks.total_losses || 1)) * 100).toFixed(0)}%` },
    { label: "ROI (Shrunk)", value: `${scoringMetrics?.roi_shrunk ? '+' + scoringMetrics.roi_shrunk.toFixed(1) : '0.0'}%` },
    { label: "Trade Frequency", value: `${((scoringMetrics?.total_trades || 0) / 30).toFixed(1)} / day` },
    { label: "Market Concentration", value: `${marketDistribution.length > 0 ? ((marketDistribution[0]?.trades_count || 0) / (Number(scoringMetrics?.total_trades) || 1) * 100).toFixed(0) : '0'}%` },
    { label: "Confidence Score", value: `${(scoringMetrics?.final_score / 10 || 0).toFixed(1)} / 10` },
  ];

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white"
          : "min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-900"
      }
    >
      {/* TOP NAV */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-slate-400">{walletAddress ? shortenAddress(walletAddress) : 'No wallet connected'}</p>
            <p className="text-xs text-slate-500">Trader Profile</p>
          </div>

          <div className="flex-1 px-10">
            <div className="flex items-center gap-3 bg-slate-900/70 border border-emerald-500/30 rounded-full px-5 py-2 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
              <Search className="h-4 w-4 text-emerald-400" />
              <input
                className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                placeholder="Enter wallet address (0x...)"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              className={`px-3 py-1 rounded ${theme === "dark" ? "text-emerald-400" : "text-emerald-700"}`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
            <Bell className="h-5 w-5 text-slate-400 cursor-pointer" />
            <Settings className="h-5 w-5 text-slate-400 cursor-pointer" />
            <User className="h-5 w-5 text-slate-400 cursor-pointer" />
          </div>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingSpinner message="Loading wallet data..." /></div>}
      {error && <div className="p-8"><ErrorMessage message={error} onRetry={fetchWalletData} /></div>}

      {/* CONTENT */}
      {!loading && isValidWallet && walletAddress && (
        <div className="px-8 py-6 space-y-6">
          {/* FINAL RATING */}
          <div className="bg-slate-900/70 border border-emerald-500/40 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.35)] p-6">
            <p className="text-sm uppercase tracking-widest text-emerald-300/80">Final Rating</p>
            <div className="flex items-end gap-6">
              <p className="text-[60px] leading-none font-extrabold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                {scoringMetrics?.final_score?.toFixed(1) || '0.0'}
              </p>
              <div className="flex gap-3 pb-2">
                {scoringMetrics?.final_score >= 95 && <Badge text="👑 Prediction King" glow="strong" />}
                {scoringMetrics?.total_trades > 100 && <Badge text="🏅 Polymarket Badge Holder" glow="strong" />}
                {totalVolume >= 100000 && <Badge text="🐋 Whale" glow="strong" />}
                {streaks.current_streak >= 5 && <Badge text="🔥 Hot Streak" glow="fire" />}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6 max-w-xl">
              <MiniStat label="Balance" value={formatCurrency(portfolioStats?.performance_metrics?.portfolio_value || 0)} />
              <MiniStat label="Volume" value={formatCurrency(totalVolume)} />
              <MiniStat label="Predictions" value={String(scoringMetrics?.total_trades || 0)} />
              <MiniStat label="Total PnL" value={formatCurrency(scoringMetrics?.total_pnl || 0)} />
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 p-6 shadow-[0_0_70px_rgba(34,197,94,0.45)]">
              <div className="flex items-center justify-between text-center">
                <Streak label="🔥 Longest streak" value={String(streaks.longest_streak)} />
                <Streak label="👀 Current streak" value={String(streaks.current_streak)} />
                <Streak label="👍 Total wins" value={String(streaks.total_wins)} />
                <Streak label="👎 Total losses" value={String(streaks.total_losses)} />
                <Streak label="🎁 Reward earned" value={formatCurrency(rewardsEarned)} />
              </div>
            </div>
          </div>

          {/* PRIMARY METRICS */}
          <div className="grid grid-cols-5 gap-4">
            {primaryMetrics.map((m) => (
              <div
                key={m.label}
                className="bg-gradient-to-b from-purple-900/80 to-purple-950/90 border border-purple-700/40 rounded-2xl shadow-[0_0_30px_rgba(124,58,237,0.15)] p-4 text-center"
              >
                <p className="text-sm text-slate-400">{m.label}</p>
                <p className="text-xl font-bold text-emerald-400">{m.value}</p>
                <p className="text-xs text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-start">
            <button
              className="text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? (
                <>
                  Hide Extra Metrics <ChevronUp />
                </>
              ) : (
                <>
                  View Extra Metrics <ChevronDown />
                </>
              )}
            </button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-5 gap-4">
              {advancedMetrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-gradient-to-b from-purple-900/80 to-purple-950/90 border border-purple-700/40 rounded-2xl shadow-[0_0_30px_rgba(124,58,237,0.15)] p-4 text-center"
                >
                  <p className="text-sm text-slate-400">{m.label}</p>
                  <p className="text-lg font-semibold text-emerald-400">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* TABS */}
          <div className="bg-slate-900/60 inline-flex rounded-lg p-1">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-md transition ${activeTab === 'history'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Trade History
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-2 rounded-md transition ${activeTab === 'performance'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-6 py-2 rounded-md transition ${activeTab === 'distribution'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              Market Distribution
            </button>
          </div>

          {activeTab === 'history' && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl mt-4 p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Trade Date</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Market</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Size</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Price</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">PnL</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allClosedPositions.slice(0, 20).map((position, idx) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-300 text-sm">
                          {formatDate(position.created_at)}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {position.title || position.slug || 'Market'}
                        </td>
                        <td className="py-3 px-4 text-white">{formatSize((position as any).total_bought || position.size)}</td>
                        <td className="py-3 px-4 text-white">{formatCurrency(position.avg_price || 0)}</td>
                        <td className={`py-3 px-4 font-medium ${(position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(position.realized_pnl || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700/50 text-slate-300">
                            Closed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl mt-4 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Trader Profit Trends (Last 7 Days)</h3>
              {profitTrend && profitTrend.length > 0 ? (
                <div className="h-80 min-h-[320px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                    <LineChart data={profitTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="day" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value: any) => [`$${value.toFixed(2)}`, 'Profit']}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative_profit"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No profit trend data available</p>
              )}
            </div>
          )}

          {activeTab === 'distribution' && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl mt-4 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Market Distribution</h3>
              {marketDistribution.length > 0 ? (
                <div className="h-64 min-h-[256px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                    <PieChart>
                      <Pie
                        data={marketDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="capital"
                        label={({ capital_percent }: any) => `${capital_percent.toFixed(0)}%`}
                      >
                        {marketDistribution.map((entry: any, index: number) => {
                          const colors: Record<string, string> = {
                            'Politics': '#A855F7',
                            'Crypto': '#10B981',
                            'Sports': '#3B82F6',
                            'Macro / Rates': '#F97316',
                            'Other': '#6B7280'
                          };
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[entry.category] || '#6B7280'}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No data available</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 min-h-[72px] flex flex-col justify-center items-center text-center">
      <p className="text-xs text-slate-300 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-emerald-300">{value}</p>
    </div>
  );
}

function Streak({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <p className="text-sm font-medium text-emerald-200">{label}</p>
      <p className="text-3xl font-extrabold text-emerald-300">{value}</p>
    </div>
  );
}

function Badge({ text, glow }: { text: string; glow?: "strong" | "fire" }) {
  const glowClass =
    glow === "strong"
      ? "shadow-[0_0_30px_rgba(34,197,94,0.6)] border-emerald-400"
      : glow === "fire"
        ? "shadow-[0_0_35px_rgba(251,146,60,0.7)] border-orange-400 text-orange-300"
        : "shadow-[0_0_20px_rgba(16,185,129,0.25)]";

  return (
    <span
      className={`px-6 py-2 rounded-full text-sm bg-slate-800/70 border text-emerald-300 ${glowClass}`}
    >
      {text}
    </span>
  );
}
