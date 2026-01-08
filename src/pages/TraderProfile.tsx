import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Fish, Flame, TrendingUp, Info, DollarSign, RefreshCw, BarChart3, PieChart } from 'lucide-react';
import { fetchTraderDetails, fetchUserLeaderboardData, fetchTradeHistory, fetchPositionsForWallet, fetchActivityForWallet, fetchClosedPositionsForWallet } from '../services/api';
import { calculateLiveMetrics, ScoredMetrics } from '../utils/scoring';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useTheme } from '../contexts/ThemeContext';
import type { TraderDetails, UserLeaderboardData, TradeHistoryResponse } from '../types/api';

// Helper functions
const formatCurrency = (value: number | string | undefined): string => {
  if (!value && value !== 0) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

const formatWallet = (address: string): string => {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp: number | string | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

export function TraderProfile() {
  const { wallet } = useParams<{ wallet: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [traderDetails, setTraderDetails] = useState<TraderDetails | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<UserLeaderboardData | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryResponse | null>(null);
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [closedPositions, setClosedPositions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<ScoredMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'distribution'>('history');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (wallet) {
      loadTraderData();
    }
  }, [wallet]);

  const loadTraderData = async () => {
    if (!wallet) return;

    setLoading(true);
    setError(null);

    try {
      const [details, leaderboard, history, posRes, activityRes, closedRes] = await Promise.allSettled([
        fetchTraderDetails(wallet),
        fetchUserLeaderboardData(wallet, 'overall'),
        fetchTradeHistory(wallet),
        fetchPositionsForWallet(wallet),
        fetchActivityForWallet(wallet),
        fetchClosedPositionsForWallet(wallet),
      ]);

      if (details.status === 'fulfilled') {
        setTraderDetails(details.value);
      }

      if (leaderboard.status === 'fulfilled') {
        setLeaderboardData(leaderboard.value);
      }

      if (history.status === 'fulfilled') {
        setTradeHistory(history.value);
      }

      const currentPositions = posRes.status === 'fulfilled' ? posRes.value.positions : [];
      const currentActivities = activityRes.status === 'fulfilled' ? activityRes.value.activities : [];
      const currentClosedPositions = closedRes.status === 'fulfilled' ? closedRes.value : [];

      setActivePositions(currentPositions);
      setActivities(currentActivities);
      setClosedPositions(currentClosedPositions);

      // Perform unified scoring
      const metrics = calculateLiveMetrics(
        currentPositions,
        currentClosedPositions,
        currentActivities
      );
      setLiveMetrics(metrics);

      // Check if all failed
      if (details.status === 'rejected' && leaderboard.status === 'rejected' && history.status === 'rejected') {
        setError('Failed to load trader data');
      }
    } catch (err) {
      console.error('Error loading trader data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trader data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading trader profile..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadTraderData} />;
  }

  // Calculate metrics
  const finalScore = liveMetrics?.final_score ?? traderDetails?.final_score ?? 0;
  const topPercent = finalScore >= 90 ? 1 : finalScore >= 75 ? 5 : finalScore >= 50 ? 10 : finalScore >= 25 ? 25 : 50;
  const roi = liveMetrics?.roi ?? tradeHistory?.overall_metrics?.roi ?? leaderboardData?.pnl ?? 0;
  const winRate = liveMetrics?.win_rate ?? tradeHistory?.overall_metrics?.win_rate ?? traderDetails?.win_rate_percent ?? 0;
  const totalVolume = liveMetrics?.total_volume ?? tradeHistory?.overall_metrics?.total_volume ?? leaderboardData?.vol ?? 0;
  const totalTrades = liveMetrics?.total_trades ?? tradeHistory?.overall_metrics?.total_trades ?? traderDetails?.total_trades ?? 0;
  const wins = liveMetrics?.winning_trades ?? tradeHistory?.overall_metrics?.winning_trades ?? 0;
  const losses = liveMetrics?.losing_trades ?? tradeHistory?.overall_metrics?.losing_trades ?? 0;

  // Get recent trades (last 7 days sentiment)
  const recentTrades = tradeHistory?.trades
    ?.filter(trade => {
      const tradeDate = new Date(trade.timestamp * 1000);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return tradeDate >= sevenDaysAgo;
    })
    .slice(0, 15) || [];

  const recentWins = recentTrades.filter(t => (t.pnl || 0) > 0).length;
  const recentLosses = recentTrades.filter(t => (t.pnl || 0) < 0).length;
  const recentSentiment = recentTrades.length > 0
    ? ((recentWins - recentLosses) / recentTrades.length) * 100
    : 0;
  const tradeConfidence = recentTrades.length > 0 ? (recentWins / recentTrades.length) * 100 : 0;

  // Get closed positions for trade history
  const displayClosedPositions = closedPositions.length > 0 ? closedPositions : (tradeHistory?.closed_positions || []);
  const paginatedTrades = displayClosedPositions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(displayClosedPositions.length / pageSize);

  // Determine badges
  const badges = [];
  if (finalScore >= 90) badges.push({ label: 'Top 10', icon: Trophy, color: 'yellow' });
  if (totalVolume >= 100000) badges.push({ label: 'Whale', icon: Fish, color: 'blue' });
  if (recentWins >= 5 && recentLosses <= 2) badges.push({ label: 'Hot Streak', icon: Flame, color: 'purple' });

  const bgClass = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const borderClass = theme === 'dark' ? 'border-slate-800' : 'border-slate-200';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondaryClass = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const cardBgClass = theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50';
  const hoverClass = theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100';

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`p-2 ${hoverClass} rounded-lg transition`}
        >
          <ArrowLeft className={`w-5 h-5 ${textSecondaryClass}`} />
        </button>
        <div>
          <h1 className={`text-2xl font-bold ${textClass}`}>{formatWallet(wallet || '')}</h1>
          <p className={`${textSecondaryClass} text-sm`}>Trader Profile</p>
        </div>
      </div>

      {/* Final Score and Badges */}
      <div className={`${bgClass} rounded-lg border ${borderClass} p-6`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <span className={`text-6xl font-bold ${textClass}`}>{finalScore.toFixed(1)}</span>
              <span className={`text-xl ${textSecondaryClass}`}>Final Score</span>
            </div>
            <p className={textSecondaryClass}>Top {topPercent}% Trader</p>
          </div>
          <div className="flex gap-3">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${badge.color === 'yellow'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : badge.color === 'blue'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}
              >
                <badge.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className={`${cardBgClass} rounded-lg p-4 relative`}>
            <div className="absolute top-2 right-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className={`${textSecondaryClass} text-sm mb-1`}>ROI %</p>
            <p className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercentage(roi)}
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mt-1`}>All-time</p>
          </div>

          <div className={`${cardBgClass} rounded-lg p-4 relative`}>
            <div className="absolute top-2 right-2">
              <Info className={`w-4 h-4 ${textSecondaryClass}`} />
            </div>
            <p className={`${textSecondaryClass} text-sm mb-1`}>Win Rate</p>
            <p className={`text-2xl font-bold ${textClass}`}>{winRate.toFixed(1)}%</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mt-1`}>{wins} of {totalTrades} trades</p>
          </div>

          <div className={`${cardBgClass} rounded-lg p-4 relative`}>
            <div className="absolute top-2 right-2">
              <DollarSign className={`w-4 h-4 ${textSecondaryClass}`} />
            </div>
            <p className={`${textSecondaryClass} text-sm mb-1`}>Total Volume</p>
            <p className={`text-2xl font-bold ${textClass}`}>{formatCurrency(totalVolume)}</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mt-1`}>Across {tradeHistory?.category_breakdown ? Object.keys(tradeHistory.category_breakdown).length : 0} markets</p>
          </div>

          <div className={`${cardBgClass} rounded-lg p-4 relative`}>
            <div className="absolute top-2 right-2">
              <RefreshCw className={`w-4 h-4 ${textSecondaryClass}`} />
            </div>
            <p className={`${textSecondaryClass} text-sm mb-1`}>Total Trades</p>
            <p className={`text-2xl font-bold ${textClass}`}>{totalTrades}</p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mt-1`}>Since joining</p>
          </div>

          <div className={`${cardBgClass} rounded-lg p-4 relative`}>
            <div className="absolute top-2 right-2">
              <BarChart3 className={`w-4 h-4 ${textSecondaryClass}`} />
            </div>
            <p className={`${textSecondaryClass} text-sm mb-1`}>Total PnL</p>
            <p className={`text-2xl font-bold ${(tradeHistory?.overall_metrics?.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(tradeHistory?.overall_metrics?.total_pnl || 0)}
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} mt-1`}>Realized + Unrealized</p>
          </div>
        </div>
      </div>

      {/* Trade Details Section */}
      <div className={`${bgClass} rounded-lg border ${borderClass} p-6`}>
        {/* Tabs */}
        <div className={`flex gap-6 mb-6 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-2 font-medium transition ${activeTab === 'history'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : `${textSecondaryClass} ${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`
              }`}
          >
            Trade History
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`pb-3 px-2 font-medium transition ${activeTab === 'performance'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : `${textSecondaryClass} ${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`
              }`}
          >
            Performance Graph
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`pb-3 px-2 font-medium transition ${activeTab === 'distribution'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : `${textSecondaryClass} ${theme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`
              }`}
          >
            Market Distribution
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    <th className={`text-left py-3 px-4 ${textSecondaryClass} font-medium text-sm`}>MARKET</th>
                    <th className={`text-left py-3 px-4 ${textSecondaryClass} font-medium text-sm`}>OUTCOME</th>
                    <th className={`text-left py-3 px-4 ${textSecondaryClass} font-medium text-sm`}>PRICE</th>
                    <th className={`text-left py-3 px-4 ${textSecondaryClass} font-medium text-sm`}>PNL</th>
                    <th className={`text-left py-3 px-4 ${textSecondaryClass} font-medium text-sm`}>DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`text-center py-8 ${textSecondaryClass}`}>
                        No trades found
                      </td>
                    </tr>
                  ) : (
                    paginatedTrades.map((position, idx) => (
                      <tr key={idx} className={`border-b ${theme === 'dark' ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-200/50 hover:bg-slate-50/50'}`}>
                        <td className={`py-3 px-4 ${textClass} font-medium`}>
                          {position.title || 'Unknown Market'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${(position.realized_pnl || 0) >= 0
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                          >
                            {position.outcome || 'N/A'}
                          </span>
                        </td>
                        <td className={`py-3 px-4 ${textClass}`}>
                          {position.cur_price ? formatCurrency(position.cur_price) : 'N/A'}
                        </td>
                        <td
                          className={`py-3 px-4 font-medium ${(position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                        >
                          {(position.realized_pnl || 0) >= 0 ? '+' : ''}
                          {formatCurrency(position.realized_pnl || 0)}
                        </td>
                        <td className={`py-3 px-4 ${textSecondaryClass} text-sm`}>
                          {formatDate(position.timestamp)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${currentPage > 1
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    }`}
                >
                  &lt;
                </button>
                <span className="text-slate-400 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${currentPage < totalPages
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    }`}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <div className={`text-center py-12 ${textSecondaryClass}`}>
            Performance graph coming soon...
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="space-y-4">
            {tradeHistory?.category_breakdown && Object.keys(tradeHistory.category_breakdown).length > 0 ? (
              Object.entries(tradeHistory.category_breakdown).map(([category, metrics]) => (
                <div key={category} className={`${cardBgClass} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${textClass}`}>{category}</span>
                    <span className={`text-sm font-medium ${(metrics.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(metrics.pnl || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className={textSecondaryClass}>ROI: </span>
                      <span className={`${(metrics.roi || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatPercentage(metrics.roi)}
                      </span>
                    </div>
                    <div>
                      <span className={textSecondaryClass}>Win Rate: </span>
                      <span className={textClass}>{(metrics.win_rate || 0).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className={textSecondaryClass}>Trades: </span>
                      <span className={textClass}>{metrics.total_trades || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center py-12 ${textSecondaryClass}`}>No market distribution data available</div>
            )}
          </div>
        )}
      </div>

      {/* Recent Trade Sentiment */}
      <div className={`${bgClass} rounded-lg border ${borderClass} p-6`}>
        <h3 className={`text-lg font-semibold ${textClass} mb-4`}>Recent Trade Sentiment</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`${textSecondaryClass} text-sm`}>Last 7 days</span>
              <span className={`text-lg font-bold ${recentSentiment >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPercentage(recentSentiment)}
              </span>
            </div>
            {/* Placeholder for sentiment graph */}
            <div className={`h-20 ${cardBgClass} rounded-lg flex items-center justify-center`}>
              <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm`}>Sentiment graph placeholder</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`${textSecondaryClass} text-sm`}>Trade Confidence</span>
              <span className={`${textClass} font-medium`}>{tradeConfidence.toFixed(0)}%</span>
            </div>
            <div className={`w-full ${cardBgClass} rounded-full h-2`}>
              <div
                className="bg-emerald-400 h-2 rounded-full transition-all"
                style={{ width: `${tradeConfidence}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-emerald-400">{recentWins} Wins</span>
              <span className="text-red-400">{recentLosses} Losses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

