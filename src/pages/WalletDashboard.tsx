import { useState, useEffect } from 'react';
import { Search, Wallet, TrendingUp, TrendingDown, Activity as ActivityIcon, BarChart3, DollarSign, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
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
        fetchActivityForWallet(walletAddress, undefined, 1000), // Fetch all activities
        fetchPortfolioStats(walletAddress),
        fetchTraderDetails(walletAddress),
        fetchUserLeaderboardData(walletAddress, 'overall'), // Fetch user leaderboard data (try overall first)
        fetchTradeHistory(walletAddress), // Fetch trade history
      ]);

      // Set profile stats
      if (profileData.status === 'fulfilled') {
        setProfileStats(profileData.value);
      }

      // Set active positions
      if (positionsData.status === 'fulfilled') {
        setActivePositions(positionsData.value.positions || []);
      }

      // Set closed positions
      if (closedPositionsData.status === 'fulfilled') {
        const closedList = closedPositionsData.value || [];
        setAllClosedPositions(closedList);
      }

      // Set activities
      if (activitiesData.status === 'fulfilled') {
        const activitiesList = activitiesData.value.activities || [];
        setAllActivities(activitiesList);
      }

      // Set portfolio stats
      if (portfolioData.status === 'fulfilled') {
        setPortfolioStats(portfolioData.value);
      }

      // Set trader details
      if (traderData.status === 'fulfilled') {
        setTraderDetails(traderData.value);
      }

      // Set user leaderboard data (username, xUsername, profileImage, volume, etc.)
      if (leaderboardData.status === 'fulfilled') {
        setUserLeaderboardData(leaderboardData.value);
      } else if (leaderboardData.status === 'rejected') {
        // Log error but don't fail the whole page
        console.warn('Failed to fetch leaderboard data:', leaderboardData.reason);
      }

      // Set trade history
      if (tradeHistoryData.status === 'fulfilled') {
        setTradeHistory(tradeHistoryData.value);
      } else if (tradeHistoryData.status === 'rejected') {
        console.warn('Failed to fetch trade history:', tradeHistoryData.reason);
      }

      // Check for errors
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

  // Validate wallet address on change
  useEffect(() => {
    if (walletAddress.length === 42) {
      const isValid = validateWallet(walletAddress);
      setIsValidWallet(isValid);
      // Auto-fetch when a complete valid wallet is entered
      if (isValid && walletAddress) {
        fetchWalletData();
        // Reset pagination when wallet changes
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

  // Calculate summary stats
  const totalActiveValue = activePositions.reduce((sum, pos) => sum + (pos.current_value || 0), 0);
  const totalPnL = activePositions.reduce((sum, pos) => sum + (pos.cash_pnl || 0), 0);
  const totalClosedPnL = closedPositions.reduce((sum, pos) => sum + (pos.realized_pnl || 0), 0);
  
  // Calculate largest win and highest loss
  // Use portfolio stats worst_loss if available, otherwise calculate from closed positions
  const highestLoss = portfolioStats?.performance_metrics?.worst_loss !== undefined
    ? portfolioStats.performance_metrics.worst_loss
    : (allClosedPositions.length > 0
        ? Math.min(...allClosedPositions.map(pos => pos.realized_pnl || 0).filter(pnl => pnl < 0), 0)
        : 0);
  
  // Use profile stats largestWin if available, otherwise calculate from closed positions
  const largestWin = profileStats?.largestWin
    ? parseFloat(String(profileStats.largestWin))
    : (allClosedPositions.length > 0
        ? Math.max(...allClosedPositions.map(pos => pos.realized_pnl || 0).filter(pnl => pnl > 0), 0)
        : 0);

  return (
    <div className="space-y-6">
      {/* Wallet Input Section */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-400" />
          Wallet Dashboard
        </h2>
        <form onSubmit={handleWalletSubmit} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter wallet address (0x...)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                walletAddress && !isValidWallet
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-700 focus:ring-emerald-400'
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
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
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
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-400 bg-slate-800 flex items-center justify-center">
                    <User className="w-8 h-8 text-emerald-400" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-bold text-white">
                      {userLeaderboardData?.userName || profileStats?.username || traderDetails?.username || 'Unknown User'}
                    </h3>
                    {userLeaderboardData?.verifiedBadge && (
                      <span className="text-emerald-400" title="Verified">✓</span>
                    )}
                  </div>
                  {userLeaderboardData?.xUsername && (
                    <p className="text-slate-400 text-sm mb-1">
                      @{userLeaderboardData.xUsername}
                    </p>
                  )}
                  <p className="text-slate-400 font-mono text-sm">{walletAddress}</p>
                  {userLeaderboardData?.rank && (
                    <p className="text-slate-500 text-xs mt-1">Rank: #{userLeaderboardData.rank}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm mb-1">Portfolio Value / Balance</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {portfolioStats?.performance_metrics?.portfolio_value 
                    ? formatCurrency(portfolioStats.performance_metrics.portfolio_value)
                    : '$0.00'}
                </p>
                {userLeaderboardData?.vol !== undefined && (
                  <p className="text-slate-400 text-sm mt-2">
                    Volume: {formatCurrency(userLeaderboardData.vol)}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {profileStats && (
                <>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Total Trades</p>
                    <p className="text-2xl font-bold text-white">{profileStats.trades || 0}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Largest Win</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(largestWin)}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Highest Loss</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(highestLoss)}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Profile Views</p>
                    <p className="text-2xl font-bold text-white">{profileStats.views || 0}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Member Since</p>
                    <p className="text-lg font-bold text-white">
                      {profileStats.joinDate ? formatDate(profileStats.joinDate) : 'N/A'}
                    </p>
                  </div>
                </>
              )}
              {/* Volume from leaderboard data */}
              {userLeaderboardData && userLeaderboardData.vol !== undefined && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Volume</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(userLeaderboardData.vol)}
                  </p>
                </div>
              )}
            </div>

            {/* Portfolio Metrics */}
            {portfolioStats && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total PnL</p>
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
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Realized PnL</p>
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
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Unrealized PnL</p>
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
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {portfolioStats.performance_metrics?.win_rate?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">ROI</p>
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
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Investment</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(portfolioStats.performance_metrics?.total_investment || 0)}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Open Positions</p>
                  <p className="text-2xl font-bold text-white">
                    {portfolioStats.positions_summary?.open_positions_count || 0}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Closed Positions</p>
                  <p className="text-2xl font-bold text-white">
                    {portfolioStats.positions_summary?.closed_positions_count || 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Active Positions */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Active Positions ({activePositions.length})
            </h3>
            {activePositions.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No active positions</p>
            ) : (
              <div className="space-y-3">
                {activePositions.slice(0, 10).map((position, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">
                          {position.title || position.asset || 'Untitled Position'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Size</p>
                            <p className="text-white font-medium">{formatSize(position.size)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Avg Price</p>
                            <p className="text-white font-medium">
                              {formatCurrency(position.avg_price || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Value</p>
                            <p className="text-white font-medium">
                              {formatCurrency(position.current_value || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">PnL</p>
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

          {/* Closed Positions */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Closed Positions ({allClosedPositions.length})
            </h3>
            {allClosedPositions.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No closed positions</p>
            ) : (
              <>
                <div className="space-y-3">
                  {allClosedPositions
                    .slice((closedPositionsPage - 1) * pageSize, closedPositionsPage * pageSize)
                    .map((position, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">
                          {position.title || position.asset || 'Untitled Position'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Size</p>
                            <p className="text-white font-medium">{formatSize(position.size)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Avg Price</p>
                            <p className="text-white font-medium">
                              {formatCurrency(position.avg_price || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Final Price</p>
                            <p className="text-white font-medium">
                              {formatCurrency(position.cur_price || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Realized PnL</p>
                            <p
                              className={`font-medium ${
                                (position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {formatCurrency(position.realized_pnl || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                    ))}
                </div>
                
                {/* Pagination for Closed Positions */}
                {allClosedPositions.length > pageSize && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                    <div className="text-sm text-slate-400">
                      Showing {((closedPositionsPage - 1) * pageSize) + 1}-{Math.min(closedPositionsPage * pageSize, allClosedPositions.length)} of {allClosedPositions.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setClosedPositionsPage(p => Math.max(1, p - 1))}
                        disabled={closedPositionsPage === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          closedPositionsPage > 1
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-slate-400">
                        Page {closedPositionsPage} of {Math.ceil(allClosedPositions.length / pageSize)}
                      </span>
                      <button
                        onClick={() => setClosedPositionsPage(p => Math.min(Math.ceil(allClosedPositions.length / pageSize), p + 1))}
                        disabled={closedPositionsPage >= Math.ceil(allClosedPositions.length / pageSize)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          closedPositionsPage < Math.ceil(allClosedPositions.length / pageSize)
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
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

          {/* Trader Details / Analytics */}
          {traderDetails && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                Trader Analytics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{traderDetails.total_trades || 0}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Positions</p>
                  <p className="text-2xl font-bold text-white">{traderDetails.total_positions || 0}</p>
                </div>
                {traderDetails.final_score !== undefined && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Final Score</p>
                    <p className="text-2xl font-bold text-purple-400">{traderDetails.final_score?.toFixed(1) || 0}</p>
                  </div>
                )}
                {traderDetails.win_rate_percent !== undefined && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-blue-400">{traderDetails.win_rate_percent?.toFixed(1) || 0}%</p>
                  </div>
                )}
              </div>
              {traderDetails.pnl !== undefined && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total PnL</p>
                  <p className={`text-2xl font-bold ${(traderDetails.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(traderDetails.pnl || 0)}
                  </p>
                </div>
              )}
              {traderDetails.categories && Object.keys(traderDetails.categories).length > 0 && (
                <div className="mt-4">
                  <p className="text-slate-400 text-sm mb-2">Category Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(traderDetails.categories).map(([category, metrics]) => (
                      <div key={category} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{category}</span>
                          <span className={`text-sm font-medium ${(metrics.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(metrics.pnl || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Win Rate: </span>
                            <span className="text-white">{metrics.win_rate_percent?.toFixed(1) || 0}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Wins: </span>
                            <span className="text-emerald-400">{formatCurrency(metrics.total_wins || 0)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Losses: </span>
                            <span className="text-red-400">{formatCurrency(metrics.total_losses || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trade History Summary */}
          {tradeHistory && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                Trade History Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total PnL</p>
                  <p className={`text-2xl font-bold ${(tradeHistory.overall_metrics.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(tradeHistory.overall_metrics.total_pnl || 0)}
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">ROI</p>
                  <p className={`text-2xl font-bold ${(tradeHistory.overall_metrics.roi || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(tradeHistory.overall_metrics.roi || 0).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {(tradeHistory.overall_metrics.win_rate || 0).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Score</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {(tradeHistory.overall_metrics.score || 0).toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Open Positions</p>
                  <p className="text-xl font-bold text-white">{tradeHistory.open_positions.length}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Closed Positions</p>
                  <p className="text-xl font-bold text-white">{tradeHistory.closed_positions.length}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Total Trades</p>
                  <p className="text-xl font-bold text-white">{tradeHistory.overall_metrics.total_trades || tradeHistory.trades.length}</p>
                  {tradeHistory.overall_metrics.total_trades_with_pnl !== undefined && tradeHistory.overall_metrics.total_trades_with_pnl !== tradeHistory.overall_metrics.total_trades && (
                    <p className="text-xs text-slate-500 mt-1">
                      {tradeHistory.overall_metrics.total_trades_with_pnl} with PnL
                    </p>
                  )}
                </div>
              </div>
              {tradeHistory.category_breakdown && Object.keys(tradeHistory.category_breakdown).length > 0 && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Category Performance</p>
                  <div className="space-y-2">
                    {Object.entries(tradeHistory.category_breakdown).slice(0, 5).map(([category, metrics]) => (
                      <div key={category} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{category}</span>
                          <span className={`text-sm font-medium ${(metrics.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(metrics.pnl || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">ROI: </span>
                            <span className={`${(metrics.roi || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {(metrics.roi || 0).toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Win Rate: </span>
                            <span className="text-white">{(metrics.win_rate || 0).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Score: </span>
                            <span className="text-purple-400">{(metrics.score || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-400" />
              Recent Activity ({allActivities.length})
            </h3>
            {allActivities.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No recent activity</p>
            ) : (
              <>
                <div className="space-y-3">
                  {allActivities
                    .slice((activitiesPage - 1) * pageSize, activitiesPage * pageSize)
                    .map((activity, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
                            {activity.type || 'UNKNOWN'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        <h4 className="text-white font-medium mb-1">
                          {activity.title || activity.asset || 'Activity'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Size</p>
                            <p className="text-white font-medium">{formatSize(activity.size)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Price</p>
                            <p className="text-white font-medium">
                              {formatCurrency(activity.price || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">USDC Size</p>
                            <p className="text-white font-medium">
                              {formatCurrency(activity.usdc_size || 0)}
                            </p>
                          </div>
                          {activity.side && (
                            <div>
                              <p className="text-slate-400">Side</p>
                              <p
                                className={`font-medium ${
                                  activity.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {activity.side}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                    ))}
                </div>
                
                {/* Pagination for Activities */}
                {allActivities.length > pageSize && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                    <div className="text-sm text-slate-400">
                      Showing {((activitiesPage - 1) * pageSize) + 1}-{Math.min(activitiesPage * pageSize, allActivities.length)} of {allActivities.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActivitiesPage(p => Math.max(1, p - 1))}
                        disabled={activitiesPage === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          activitiesPage > 1
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-slate-400">
                        Page {activitiesPage} of {Math.ceil(allActivities.length / pageSize)}
                      </span>
                      <button
                        onClick={() => setActivitiesPage(p => Math.min(Math.ceil(allActivities.length / pageSize), p + 1))}
                        disabled={activitiesPage >= Math.ceil(allActivities.length / pageSize)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                          activitiesPage < Math.ceil(allActivities.length / pageSize)
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
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

