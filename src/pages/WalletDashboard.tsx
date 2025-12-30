import { useState, useEffect, useMemo } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, Trophy, Fish, Flame, ChevronDown, ChevronUp, ChevronRight, Flag, Coins, DollarSign, Activity as ActivityIcon, Target } from 'lucide-react';
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

// Helper function to format size (handles number, string, or undefined)
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

export function WalletDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isValidWallet, setIsValidWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [allClosedPositions, setAllClosedPositions] = useState<ClosedPosition[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [userLeaderboardData, setUserLeaderboardData] = useState<UserLeaderboardData | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryResponse | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'distribution' | 'activity'>('history');
  const [distributionMetric, setDistributionMetric] = useState<'roi' | 'win_rate' | 'risk'>('roi');
  const [historyPage, setHistoryPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const itemsPerPage = 20;


  const fetchWalletData = async () => {
    if (!validateWallet(walletAddress)) return;

    setLoading(true);
    setError(null);

    try {
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
        setActivePositions([]); // Set empty array on error
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
      // Trader details fetched but not used in UI (kept for future use)
      // if (traderData.status === 'fulfilled') {
      //   setTraderDetails(traderData.value);
      // }
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
        setUserLeaderboardData(null);
        setTradeHistory(null);
      }
    } else {
      setIsValidWallet(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateWallet(walletAddress)) {
      fetchWalletData();
    }
  };
  
  // Calculate highest loss
  const highestLoss = portfolioStats?.performance_metrics?.worst_loss !== undefined
    ? portfolioStats.performance_metrics.worst_loss
    : (allClosedPositions.length > 0
        ? Math.min(...allClosedPositions.map(pos => pos.realized_pnl || 0).filter(pnl => pnl < 0), 0)
        : 0);

  // Calculate streaks, wins, losses, rewards, and market distribution
  const streaks = useMemo(() => {
    if (!allClosedPositions || allClosedPositions.length === 0) {
      return { longest_streak: 0, current_streak: 0, total_wins: 0, total_losses: 0 };
    }
    
    // Sort by created_at or timestamp (oldest first)
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
    // From closed positions
    allClosedPositions.forEach(pos => {
      const stake = (parseFloat(String((pos as any).total_bought || pos.size || 0)) * parseFloat(String(pos.avg_price || 0)));
      volume += stake;
    });
    // From active positions
    activePositions.forEach(pos => {
      volume += parseFloat(String(pos.initial_value || 0));
    });
    // From activities
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

  // Calculate detailed market distribution with ROI and Win Rate
  const marketDistribution = useMemo(() => {
    const categoryStats = new Map<string, {
      capital: number;
      totalPnl: number;
      wins: number;
      losses: number;
      trades: number;
      markets: Set<string>;
    }>();
    
    // Process closed positions
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
    
    // Process active positions for capital
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
    
    // Calculate totals and percentages
    const totalCapital = Array.from(categoryStats.values()).reduce((sum, s) => sum + s.capital, 0);
    
    const distribution = Array.from(categoryStats.entries()).map(([category, stats]) => {
      const roiPercent = stats.capital > 0 ? (stats.totalPnl / stats.capital * 100) : 0;
      const winRatePercent = stats.trades > 0 ? (stats.wins / stats.trades * 100) : 0;
      const capitalPercent = totalCapital > 0 ? (stats.capital / totalCapital * 100) : 0;
      const riskScore = stats.capital > 0 ? (Math.abs(stats.totalPnl < 0 ? stats.totalPnl : 0) / stats.capital) : 0;
      
      return {
        category,
        market: category,
        capital: stats.capital,
        capital_percent: capitalPercent,
        roi_percent: roiPercent,
        win_rate_percent: winRatePercent,
        trades_count: stats.trades,
        wins: stats.wins,
        losses: stats.losses,
        total_pnl: stats.totalPnl,
        risk_score: riskScore,
        unique_markets: stats.markets.size
      };
    });
    
    return distribution.sort((a, b) => b.capital - a.capital);
  }, [allClosedPositions, activePositions, categorizeMarket]);

  // Calculate primary edge
  const primaryEdge = useMemo(() => {
    if (marketDistribution.length === 0) return "No trading data available.";
    
    const primary = marketDistribution[0];
    let edge = `Primary edge in ${primary.category} markets with `;
    
    if (primary.roi_percent > 0) {
      edge += primary.roi_percent > 50 ? "high ROI " : "consistent ROI ";
    } else {
      edge += "moderate ROI ";
    }
    
    if (primary.risk_score < 0.1) {
      edge += "and low risk.";
    } else if (primary.risk_score < 0.3) {
      edge += "and moderate risk.";
    } else {
      edge += "and high risk.";
    }
    
    return edge;
  }, [marketDistribution]);

  // Calculate profit trend for last 7 days
  const profitTrend = useMemo(() => {
    const days: { [key: string]: { day: string; profit: number } } = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      const dayName = dayNames[date.getDay()];
      days[dayKey] = { day: dayName, profit: 0 };
    }
    
    // Aggregate PnL by day from closed positions
    allClosedPositions.forEach(pos => {
      if (pos.created_at) {
        const tradeDate = new Date(pos.created_at);
        const dayKey = tradeDate.toISOString().split('T')[0];
        
        if (days[dayKey]) {
          days[dayKey].profit += parseFloat(String(pos.realized_pnl || 0));
        }
      }
    });
    
    // Convert to array and calculate cumulative
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

  // Get scoring metrics from trade history or calculate from portfolio
  const scoringMetrics = useMemo(() => {
    const finalScore = (tradeHistory?.overall_metrics as any)?.final_score || 
                      (tradeHistory?.overall_metrics as any)?.score || 
                      (userLeaderboardData?.rank ? (100 - Number(userLeaderboardData.rank)) : 0);
    
    return {
      final_score: finalScore,
      total_pnl: portfolioStats?.pnl_metrics?.total_pnl || portfolioStats?.performance_metrics?.total_pnl || 0,
      roi: portfolioStats?.performance_metrics?.roi || tradeHistory?.overall_metrics?.roi || 0,
      win_rate: portfolioStats?.performance_metrics?.win_rate || tradeHistory?.overall_metrics?.win_rate || 0,
      win_rate_percent: portfolioStats?.performance_metrics?.win_rate || tradeHistory?.overall_metrics?.win_rate || 0,
      total_trades: profileStats?.trades || allClosedPositions.length || 0,
      score_risk: (tradeHistory?.overall_metrics as any)?.risk_score || 0,
      roi_shrunk: (tradeHistory?.overall_metrics as any)?.roi_shrunk || 0,
    };
  }, [tradeHistory, portfolioStats, userLeaderboardData, profileStats, allClosedPositions]);

  // Process trade data for performance graph (last 10 trades)
  // Use closed positions if trade history is not available
  const performanceGraphData = useMemo(() => {
    let dataSource: Array<{ timestamp: number; pnl: number }> = [];
    
    // Try to use trade history first
    if (tradeHistory && tradeHistory.trades && tradeHistory.trades.length > 0) {
      dataSource = tradeHistory.trades.map(trade => ({
        timestamp: trade.timestamp || 0,
        pnl: trade.pnl || 0,
      }));
    } 
    // Fallback to closed positions if trade history is not available
    else if (allClosedPositions && allClosedPositions.length > 0) {
      // Convert closed positions to trade-like format
      dataSource = allClosedPositions.map(pos => {
        // Use created_at if available, otherwise use current time
        let timestamp = Date.now() / 1000;
        if (pos.created_at) {
          timestamp = new Date(pos.created_at).getTime() / 1000;
        }
        return {
          timestamp,
          pnl: pos.realized_pnl || 0,
        };
      });
    } else {
      return [];
    }

    if (dataSource.length === 0) {
      return [];
    }

    // Get last 10 items, sorted by timestamp
    const recentTrades = [...dataSource]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .reverse(); // Reverse to show chronological order

    // Calculate cumulative PnL
    let cumulativePnl = 0;
    return recentTrades.map((item) => {
      const pnl = item.pnl || 0;
      cumulativePnl += pnl;
      
      // Format date
      const date = item.timestamp
        ? new Date(item.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'N/A';

      return {
        date,
        pnl,
        cumulativePnl,
      };
    });
  }, [tradeHistory, allClosedPositions]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-400" />
          Wallet Dashboard
        </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <input
                type="text"
                placeholder="Q Search markets..."
                className="bg-transparent border-none outline-none text-sm w-48 text-slate-900 dark:text-white"
              />
            </div>
            <div className="text-right">
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Portfolio Value / Balance</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {portfolioStats?.performance_metrics?.portfolio_value 
                  ? formatCurrency(portfolioStats.performance_metrics.portfolio_value)
                  : '$0.00'}
              </p>
              {userLeaderboardData?.vol !== undefined && (
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Volume: {formatCurrency(userLeaderboardData.vol)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Search Input */}
        <form onSubmit={handleWalletSubmit} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 focus:outline-none focus:ring-2 ${
                walletAddress && !isValidWallet
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500 dark:focus:ring-emerald-400'
              }`}
            />
            {walletAddress && !isValidWallet && (
              <p className="text-red-400 text-sm mt-1">Invalid wallet address format</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!isValidWallet || loading}
            className="px-6 py-3 bg-emerald-400 text-white rounded-lg font-medium hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </form>
      </div>

      {loading && <LoadingSpinner message="Loading wallet data..." />}
      {error && <ErrorMessage message={error} onRetry={fetchWalletData} />}

      {/* Wallet Information Display */}
      {!loading && isValidWallet && walletAddress && (
        <>
          {/* Trader Metrics Header - Matching Image Design */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            {/* Title and Wallet */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">Trader Metrics - Expandable Live...</h2>
              <p className="text-slate-400 font-mono text-sm">{walletAddress}</p>
              <p className="text-slate-500 text-sm mt-1">Trader Profile</p>
            </div>

            {/* Final Score & Badges */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Final Score</p>
                  <p className="text-5xl font-bold text-emerald-400">
                    {scoringMetrics?.final_score?.toFixed(1) || '0.0'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {scoringMetrics?.final_score >= 90 && (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Top 10
                    </span>
                  )}
                  {totalVolume >= 100000 && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium flex items-center gap-1">
                      <Fish className="w-3 h-3" />
                      Whale
                    </span>
                  )}
                  {streaks.current_streak >= 5 && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Hot Streak
                    </span>
                  )}
                </div>
                {scoringMetrics?.final_score >= 90 && (
                  <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                    Top 1% Trader
                  </span>
                )}
              </div>
            </div>

            {/* Streaks Section */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-slate-400 text-xs">LONGEST STREAK</p>
                    <p className="text-white font-bold text-lg">{streaks.longest_streak}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-slate-400 text-xs">CURRENT STREAK</p>
                    <p className="text-white font-bold text-lg">{streaks.current_streak}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-slate-400 text-xs">TOTAL WINS</p>
                    <p className="text-white font-bold text-lg">{streaks.total_wins}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-slate-400 text-xs">TOTAL LOSSES</p>
                    <p className="text-white font-bold text-lg">{streaks.total_losses}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-slate-400 text-xs">REWARD EARNED</p>
                    <p className="text-white font-bold text-lg">{formatCurrency(rewardsEarned)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">ROI %</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {scoringMetrics?.roi?.toFixed(2) || '0.00'}%
                </p>
                <p className="text-slate-500 text-xs mt-1">All-time</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Win Rate</p>
                <p className="text-2xl font-bold text-white">
                  {scoringMetrics?.win_rate_percent?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {streaks.total_wins} of {streaks.total_wins + streaks.total_losses} trades
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Total Volume</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalVolume)}</p>
                <p className="text-slate-500 text-xs mt-1">Across {marketDistribution.length} markets</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Total Trades</p>
                <p className="text-2xl font-bold text-white">{scoringMetrics?.total_trades || 0}</p>
                <p className="text-slate-500 text-xs mt-1">Since joining</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-1">Total PnL</p>
                <p className={`text-2xl font-bold ${(scoringMetrics?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(scoringMetrics?.total_pnl || 0)}
                </p>
                <p className="text-slate-500 text-xs mt-1">Realized + Unrealized</p>
              </div>
            </div>

            {/* Advanced Metrics Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showAdvanced ? 'Hide Advanced' : 'View Advanced Metrics'}
              </button>
            </div>

            {/* Advanced Metrics Section */}
            {showAdvanced && (
              <div className="grid grid-cols-5 gap-4 mt-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Risk Score</p>
                  <p className="text-2xl font-bold text-white">{(scoringMetrics?.score_risk || 0).toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Max Drawdown</p>
                  <p className="text-2xl font-bold text-red-400">
                    {highestLoss ? `${highestLoss.toFixed(1)}%` : '0.0%'}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Worst Loss</p>
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(highestLoss)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">ROI (Shrunk)</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {scoringMetrics?.roi_shrunk ? `+${scoringMetrics.roi_shrunk.toFixed(1)}%` : '0.0%'}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Market Concentration</p>
                  <p className="text-2xl font-bold text-white">
                    {marketDistribution.length > 0 
                      ? `${((marketDistribution[0]?.trades_count || 0) / (Number(scoringMetrics?.total_trades) || 1) * 100).toFixed(0)}%`
                      : '0%'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Tabs Section */}
          <div className="bg-slate-900 rounded-lg border border-slate-800">
            {/* Tab Headers */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('history');
                  setHistoryPage(1); // Reset to first page when switching tabs
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'text-white border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Trade History
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'performance'
                    ? 'text-white border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setActiveTab('distribution')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'distribution'
                    ? 'text-white border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Market Distribution
              </button>
              <button
                onClick={() => {
                  setActiveTab('activity');
                  setActivityPage(1); // Reset to first page when switching tabs
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'activity'
                    ? 'text-white border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Activity
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'history' && (
                <div>
                  <div className="overflow-x-auto mb-4">
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
                        {allClosedPositions
                          .slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage)
                          .map((position, idx) => (
                          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-3 px-4 text-slate-300 text-sm">
                              {formatDate(position.created_at)}
                            </td>
                            <td className="py-3 px-4 text-white font-medium">
                              {position.title || position.slug || 'Market'}
                            </td>
                            <td className="py-3 px-4 text-white">{formatSize((position as any).total_bought || position.size)}</td>
                            <td className="py-3 px-4 text-white">{formatCurrency(position.avg_price || 0)}</td>
                            <td className={`py-3 px-4 font-medium ${
                              (position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
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
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-slate-400 text-sm">
                      Showing {(historyPage - 1) * itemsPerPage + 1} to {Math.min(historyPage * itemsPerPage, allClosedPositions.length)} of {allClosedPositions.length} trades
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                        disabled={historyPage === 1}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${
                          historyPage === 1
                            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        }`}
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-slate-300 text-sm">
                        Page {historyPage} of {Math.ceil(allClosedPositions.length / itemsPerPage) || 1}
                      </span>
                      <button
                        onClick={() => setHistoryPage(prev => Math.min(Math.ceil(allClosedPositions.length / itemsPerPage), prev + 1))}
                        disabled={historyPage >= Math.ceil(allClosedPositions.length / itemsPerPage)}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${
                          historyPage >= Math.ceil(allClosedPositions.length / itemsPerPage)
                            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Trader Profit Trends (Last 7 Days)</h3>
                  {profitTrend && profitTrend.length > 0 ? (
                    <div className="h-80 min-h-[320px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                        <LineChart data={profitTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="day" 
                            stroke="#9CA3AF"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis 
                            stroke="#9CA3AF"
                            style={{ fontSize: '12px' }}
                          />
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
                <div className="space-y-6">
                  {/* Primary Edge Summary */}
                  {primaryEdge && (
                    <div className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                      <p className="text-slate-300 text-sm">{primaryEdge}</p>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  )}

                  {/* Donut Chart and Table Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Donut Chart */}
                    <div className="bg-slate-800/50 rounded-lg p-6">
                      <h4 className="text-white font-semibold mb-4">Capital Allocation by Market</h4>
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
                                formatter={(value: any, _name: string, props: any) => {
                                  try {
                                    // Recharts Pie chart tooltip structure
                                    const payload = props?.payload || props;
                                    if (!payload) {
                                      return ['', ''];
                                    }
                                    
                                    // Get index from payload
                                    const index = payload.index ?? payload.payloadIndex ?? 0;
                                    
                                    // Get entry from marketDistribution
                                    const entry = marketDistribution[index];
                                    if (!entry || !entry.category) {
                                      return ['', ''];
                                    }
                                    
                                    const capital = Number(value) || entry.capital || 0;
                                    const tradesCount = entry.trades_count || 0;
                                    
                                    return [
                                      `$${capital.toFixed(2)} in ${tradesCount} trades`,
                                      entry.category
                                    ];
                                  } catch (error) {
                                    console.error('Tooltip formatter error:', error);
                                    return ['', ''];
                                  }
                                }}
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
                      
                      {/* Legend */}
                      {marketDistribution.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {marketDistribution.map((entry: any, idx: number) => {
                            const colors: Record<string, string> = {
                              'Politics': '#A855F7',
                              'Crypto': '#10B981',
                              'Sports': '#3B82F6',
                              'Macro / Rates': '#F97316',
                              'Other': '#6B7280'
                            };
                            return (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: colors[entry.category] || '#6B7280' }}
                                />
                                <span className="text-slate-300">{entry.category}:</span>
                                <span className="text-white font-medium">{entry.capital_percent.toFixed(0)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right: Table */}
                    <div className="bg-slate-800/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-semibold">Capital Allocation by Market</h4>
                        {/* Metric Tabs */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDistributionMetric('roi')}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              distributionMetric === 'roi'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                          >
                            ROI %
                          </button>
                          <button
                            onClick={() => setDistributionMetric('win_rate')}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              distributionMetric === 'win_rate'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                          >
                            Win Rate
                          </button>
                          <button
                            onClick={() => setDistributionMetric('risk')}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              distributionMetric === 'risk'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                          >
                            Risk
                          </button>
                        </div>
                      </div>
                      
                      {marketDistribution.length > 0 ? (
                        <div className="space-y-3">
                          {marketDistribution.map((entry: any, idx: number) => {
                            const icons: Record<string, any> = {
                              'Politics': Flag,
                              'Crypto': Coins,
                              'Sports': Target,
                              'Macro / Rates': DollarSign,
                              'Other': ActivityIcon
                            };
                            const Icon = icons[entry.category] || ActivityIcon;
                            const winRatePercent = entry.win_rate_percent || 0;
                            const roiPercent = entry.roi_percent || 0;
                            const riskPercent = (entry.risk_score || 0) * 100;
                            
                            // Determine which value to show in the progress bar based on selected metric
                            const getProgressValue = () => {
                              switch (distributionMetric) {
                                case 'roi':
                                  // Normalize ROI to 0-100% range (assuming ROI can be -100% to +200% or similar)
                                  // For display, we'll show absolute ROI as percentage, capped at 100%
                                  return Math.min(Math.abs(roiPercent), 100);
                                case 'win_rate':
                                  return winRatePercent;
                                case 'risk':
                                  // Risk is already a percentage (0-100)
                                  return Math.min(riskPercent, 100);
                                default:
                                  return winRatePercent;
                              }
                            };
                            
                            const getProgressLabel = () => {
                              switch (distributionMetric) {
                                case 'roi':
                                  return 'ROI %';
                                case 'win_rate':
                                  return 'Win Rate';
                                case 'risk':
                                  return 'Risk';
                                default:
                                  return 'Win Rate';
                              }
                            };
                            
                            const getProgressDisplayValue = () => {
                              switch (distributionMetric) {
                                case 'roi':
                                  return `${roiPercent >= 0 ? '+' : ''}${roiPercent.toFixed(0)}%`;
                                case 'win_rate':
                                  return `${winRatePercent.toFixed(0)}%`;
                                case 'risk':
                                  return `${riskPercent.toFixed(1)}%`;
                                default:
                                  return `${winRatePercent.toFixed(0)}%`;
                              }
                            };
                            
                            const progressValue = getProgressValue();
                            const progressLabel = getProgressLabel();
                            const progressDisplayValue = getProgressDisplayValue();
                            
                            // Determine color based on metric and value
                            const getProgressColor = () => {
                              if (distributionMetric === 'roi') {
                                return roiPercent >= 0 ? 'bg-emerald-400' : 'bg-red-400';
                              } else if (distributionMetric === 'win_rate') {
                                return winRatePercent >= 50 ? 'bg-emerald-400' : 'bg-red-400';
                              } else if (distributionMetric === 'risk') {
                                // Lower risk is better, so inverse the color logic
                                return riskPercent <= 30 ? 'bg-emerald-400' : riskPercent <= 60 ? 'bg-yellow-400' : 'bg-red-400';
                              }
                              return 'bg-emerald-400';
                            };
                            
                            return (
                              <div key={idx} className="bg-slate-900/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-slate-400" />
                                    <span className="text-white font-medium">{entry.category}</span>
                                  </div>
                                  {distributionMetric === 'roi' && (
                                    <span className={`text-lg font-bold ${
                                      entry.roi_percent >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                      {entry.roi_percent >= 0 ? '+' : ''}{entry.roi_percent.toFixed(0)}%
                                    </span>
                                  )}
                                  {distributionMetric === 'win_rate' && (
                                    <span className="text-lg font-bold text-white">
                                      {winRatePercent.toFixed(0)}%
                                    </span>
                                  )}
                                  {distributionMetric === 'risk' && (
                                    <span className="text-lg font-bold text-white">
                                      {riskPercent.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {/* Dynamic Progress Bar */}
                                  <div>
                                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                      <span>{progressLabel}</span>
                                      <span>{progressDisplayValue}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${getProgressColor()}`}
                                        style={{ width: `${Math.min(progressValue, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                  {/* Additional Info */}
                                  <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>{entry.trades_count} trades</span>
                                    <span>{formatCurrency(entry.capital)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">No market distribution data available</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Wallet Activity</h3>
                  {allActivities && allActivities.length > 0 ? (
                    <>
                      <div className="space-y-3 mb-4">
                        {allActivities
                          .slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage)
                          .map((activity, idx) => {
                        const activityDate = activity.timestamp 
                          ? new Date(activity.timestamp * 1000).toLocaleString()
                          : 'N/A';
                        
                        const getActivityTypeColor = (type: string) => {
                          switch (type) {
                            case 'TRADE':
                              return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                            case 'REDEEM':
                              return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                            case 'REWARD':
                              return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                            default:
                              return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                          }
                        };

                        return (
                          <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getActivityTypeColor(activity.type || 'UNKNOWN')}`}>
                                    {activity.type || 'UNKNOWN'}
                                  </span>
                                  {activity.title && (
                                    <span className="text-white font-medium text-sm">{activity.title}</span>
                                  )}
                                </div>
                                {activity.slug && (
                                  <p className="text-slate-400 text-xs mb-1">{activity.slug}</p>
                                )}
                                {activity.outcome && (
                                  <p className="text-slate-300 text-sm">Outcome: {activity.outcome}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {activity.usdc_size && (
                                  <p className={`text-lg font-bold ${
                                    (activity.type === 'REWARD' || activity.type === 'REDEEM') 
                                      ? 'text-emerald-400' 
                                      : activity.side === 'SELL' 
                                      ? 'text-emerald-400' 
                                      : 'text-blue-400'
                                  }`}>
                                    {activity.side === 'SELL' ? '+' : activity.type === 'REWARD' || activity.type === 'REDEEM' ? '+' : ''}
                                    {formatCurrency(activity.usdc_size)}
                                  </p>
                                )}
                                <p className="text-slate-500 text-xs mt-1">{activityDate}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                              {activity.size && (
                                <span>Size: {formatSize(activity.size)}</span>
                              )}
                              {activity.price && (
                                <span>Price: ${Number(activity.price).toFixed(4)}</span>
                              )}
                              {activity.transaction_hash && (
                                <span className="truncate max-w-[200px]" title={activity.transaction_hash}>
                                  TX: {activity.transaction_hash.slice(0, 10)}...
                                </span>
                              )}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                      
                      {/* Pagination Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-slate-400 text-sm">
                          Showing {(activityPage - 1) * itemsPerPage + 1} to {Math.min(activityPage * itemsPerPage, allActivities.length)} of {allActivities.length} activities
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                            disabled={activityPage === 1}
                            className={`px-4 py-2 rounded text-sm font-medium transition ${
                              activityPage === 1
                                ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                            }`}
                          >
                            Previous
                          </button>
                          <span className="px-4 py-2 text-slate-300 text-sm">
                            Page {activityPage} of {Math.ceil(allActivities.length / itemsPerPage) || 1}
                          </span>
                          <button
                            onClick={() => setActivityPage(prev => Math.min(Math.ceil(allActivities.length / itemsPerPage), prev + 1))}
                            disabled={activityPage >= Math.ceil(allActivities.length / itemsPerPage)}
                            className={`px-4 py-2 rounded text-sm font-medium transition ${
                              activityPage >= Math.ceil(allActivities.length / itemsPerPage)
                                ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-400 text-center py-8">No activity data available</p>
                  )}
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
