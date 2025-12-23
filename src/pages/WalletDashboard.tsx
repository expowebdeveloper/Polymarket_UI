import { useState, useEffect, useMemo } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, Activity as ActivityIcon, BarChart3, DollarSign, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { TradePerformanceGraph } from '../components/TradePerformanceGraph';
import { useTheme } from '../contexts/ThemeContext';
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
import type { Position, ClosedPosition, Activity, ProfileStatsResponse, UserLeaderboardData, TradeHistoryResponse, TraderDetails } from '../types/api';

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
  const { theme } = useTheme();
  const [walletAddress, setWalletAddress] = useState('');
  const [isValidWallet, setIsValidWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [allClosedPositions, setAllClosedPositions] = useState<ClosedPosition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [traderDetails, setTraderDetails] = useState<TraderDetails | null>(null);
  const [userLeaderboardData, setUserLeaderboardData] = useState<UserLeaderboardData | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryResponse | null>(null);
  
  // Pagination states
  const [closedPositionsPage, setClosedPositionsPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [pageSize] = useState(10);


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
        setActivePositions(positionsData.value.positions || []);
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
      if (traderData.status === 'fulfilled') {
        setTraderDetails(traderData.value);
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
        setClosedPositionsPage(1);
        setActivitiesPage(1);
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
  
  // Calculate largest win and highest loss
  const highestLoss = portfolioStats?.performance_metrics?.worst_loss !== undefined
    ? portfolioStats.performance_metrics.worst_loss
    : (allClosedPositions.length > 0
        ? Math.min(...allClosedPositions.map(pos => pos.realized_pnl || 0).filter(pnl => pnl < 0), 0)
        : 0);
  
  const largestWin = profileStats?.largestWin
    ? parseFloat(String(profileStats.largestWin))
    : (allClosedPositions.length > 0
        ? Math.max(...allClosedPositions.map(pos => pos.realized_pnl || 0).filter(pnl => pnl > 0), 0)
        : 0);

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
          {/* Profile Header */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                {/* Profile Image */}
                {userLeaderboardData?.profileImage && (
                  <img
                    src={userLeaderboardData.profileImage}
                    alt="Profile"
                    className="w-16 h-16 rounded-full border-2 border-emerald-400 object-cover"
                  />
                )}
                {!userLeaderboardData?.profileImage && (
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-400 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-8 h-8 text-emerald-400" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {userLeaderboardData?.userName || profileStats?.username || 'Unknown User'}
                    </h3>
                    {userLeaderboardData?.verifiedBadge && (
                      <span className="text-emerald-400" title="Verified">✓</span>
                    )}
                  </div>
                  {userLeaderboardData?.xUsername && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">
                      @{userLeaderboardData.xUsername}
                    </p>
                  )}
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">{walletAddress}</p>
                  {userLeaderboardData?.rank && (
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                      Rank: #{userLeaderboardData.rank}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {profileStats && (
                <>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Trades</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{profileStats.trades || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Largest Win</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(largestWin)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Highest Loss</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(highestLoss)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Profile Views</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{profileStats.views || 0}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Member Since</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {profileStats.joinDate ? formatDate(profileStats.joinDate) : 'N/A'}
                    </p>
                  </div>
                </>
              )}
              {userLeaderboardData && userLeaderboardData.vol !== undefined && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Volume</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(userLeaderboardData.vol)}
                  </p>
                </div>
              )}
            </div>

            {/* Portfolio Metrics */}
            {portfolioStats && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total PnL</p>
                  <p
                    className={`text-2xl font-bold ${
                      (portfolioStats.pnl_metrics?.total_pnl || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(portfolioStats.pnl_metrics?.total_pnl || 0)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Realized PnL</p>
                  <p
                    className={`text-2xl font-bold ${
                      (portfolioStats.pnl_metrics?.realized_pnl || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(portfolioStats.pnl_metrics?.realized_pnl || 0)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Unrealized PnL</p>
                  <p
                    className={`text-2xl font-bold ${
                      (portfolioStats.pnl_metrics?.unrealized_pnl || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(portfolioStats.pnl_metrics?.unrealized_pnl || 0)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">ROI</p>
                  <p
                    className={`text-2xl font-bold ${
                      (portfolioStats.performance_metrics?.roi || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {portfolioStats.performance_metrics?.roi?.toFixed(2) || 0}%
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total Investment</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(portfolioStats.performance_metrics?.total_investment || 0)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Open Positions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {portfolioStats.positions_summary?.open_positions_count || 0}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Closed Positions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {portfolioStats.positions_summary?.closed_positions_count || 0}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {portfolioStats.performance_metrics?.win_rate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Graph */}
          {performanceGraphData && performanceGraphData.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Recent Trades Performance (Last {performanceGraphData.length} Trades)
              </h3>
              <TradePerformanceGraph trades={performanceGraphData} />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Recent Trades Performance
              </h3>
              <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
                {loading ? 'Loading trade data...' : 'No trade data available for performance graph'}
              </div>
            </div>
          )}

          {/* Active Positions */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Active Positions ({activePositions.length})
            </h3>
            {activePositions.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-center py-8">No active positions</p>
            ) : (
              <div className="space-y-3">
                {activePositions.slice(0, 10).map((position, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          {position.title || position.asset || 'Untitled Position'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Size</p>
                            <p className="text-slate-900 dark:text-white font-medium">{formatSize(position.size)}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Avg Price</p>
                            <p className="text-slate-900 dark:text-white font-medium">
                              {formatCurrency(position.avg_price || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">Current Value</p>
                            <p className="text-slate-900 dark:text-white font-medium">
                              {formatCurrency(position.current_value || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400">PnL</p>
                            <p
                              className={`font-medium ${
                                (position.cash_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {formatCurrency(position.cash_pnl || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Closed Positions - Table Format */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Closed Positions ({allClosedPositions.length})
            </h3>
            {allClosedPositions.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-center py-8">No closed positions</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Market</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Size</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Avg Price</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Final Price</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Realized PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                  {allClosedPositions
                    .slice((closedPositionsPage - 1) * pageSize, closedPositionsPage * pageSize)
                    .map((position, idx) => (
                          <tr
                    key={idx}
                            className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  >
                            <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                          {position.title || position.asset || 'Untitled Position'}
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white">{formatSize(position.size)}</td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white">
                              {formatCurrency(position.avg_price || 0)}
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white">
                              {formatCurrency(position.cur_price || 0)}
                            </td>
                            <td
                              className={`py-3 px-4 font-medium ${
                                (position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {formatCurrency(position.realized_pnl || 0)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {allClosedPositions.length > pageSize && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {((closedPositionsPage - 1) * pageSize) + 1}-{Math.min(closedPositionsPage * pageSize, allClosedPositions.length)} of {allClosedPositions.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setClosedPositionsPage(p => Math.max(1, p - 1))}
                        disabled={closedPositionsPage === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          closedPositionsPage > 1
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Page {closedPositionsPage} of {Math.ceil(allClosedPositions.length / pageSize)}
                      </span>
                      <button
                        onClick={() => setClosedPositionsPage(p => Math.min(Math.ceil(allClosedPositions.length / pageSize), p + 1))}
                        disabled={closedPositionsPage >= Math.ceil(allClosedPositions.length / pageSize)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          closedPositionsPage < Math.ceil(allClosedPositions.length / pageSize)
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Trades - Table Format */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <ActivityIcon className="w-5 h-5 text-blue-400" />
              Recent Trades ({allActivities.length})
            </h3>
            {allActivities.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 text-center py-8">No recent trades</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">TRADE Date</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Market</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Size</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Price</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">USDC Size</th>
                        <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Side</th>
                      </tr>
                    </thead>
                    <tbody>
                  {allActivities
                    .slice((activitiesPage - 1) * pageSize, activitiesPage * pageSize)
                    .map((activity, idx) => (
                          <tr
                    key={idx}
                            className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                          >
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                            {formatDate(activity.timestamp)}
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                          {activity.title || activity.asset || 'Activity'}
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white">{formatSize(activity.size)}</td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white">
                              {formatCurrency(activity.price || 0)}
                            </td>
                            <td className="py-3 px-4 text-slate-900 dark:text-white">
                              {formatCurrency(activity.usdc_size || 0)}
                            </td>
                            <td className="py-3 px-4">
                          {activity.side && (
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    activity.side === 'BUY'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {activity.side}
                                </span>
                          )}
                            </td>
                          </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {allActivities.length > pageSize && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {((activitiesPage - 1) * pageSize) + 1}-{Math.min(activitiesPage * pageSize, allActivities.length)} of {allActivities.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivitiesPage(p => Math.max(1, p - 1))}
                        disabled={activitiesPage === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          activitiesPage > 1
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Page {activitiesPage} of {Math.ceil(allActivities.length / pageSize)}
                      </span>
                      <button
                        onClick={() => setActivitiesPage(p => Math.min(Math.ceil(allActivities.length / pageSize), p + 1))}
                        disabled={activitiesPage >= Math.ceil(allActivities.length / pageSize)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          activitiesPage < Math.ceil(allActivities.length / pageSize)
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed opacity-50'
                        }`}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
