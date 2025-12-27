import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Activity as ActivityIcon, BarChart3, Database, User } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { TradePerformanceGraph } from '../components/TradePerformanceGraph';
import { fetchDBDashboard, syncDBDashboard } from '../services/api';
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

export function DBWalletDashboard() {
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

    // Pagination states
    const [closedPositionsPage, setClosedPositionsPage] = useState(1);
    const [activitiesPage, setActivitiesPage] = useState(1);
    const [pageSize] = useState(10);


    const fetchWalletData = async () => {
        if (!validateWallet(walletAddress)) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Trigger full sync from server to DB first
            setLoading(true);
            setError(null);
            console.log('Syncing wallet data from server...');
            await syncDBDashboard(walletAddress);

            // 2. Fetch all data from DB endpoint
            console.log('Fetching synced data from database...');
            const data = await fetchDBDashboard(walletAddress);

            if (data) {
                setProfileStats(data.profile);
                setUserLeaderboardData(data.leaderboard);
                setPortfolioStats(data.portfolio);
                setActivePositions(data.positions || []);
                setAllClosedPositions(data.closed_positions || []);
                setAllActivities(data.activities || []);
                setTradeHistory(data.trade_history);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load wallet data from DB');
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
                let timestamp = Date.now() / 1000;
                if (pos.created_at) {
                    timestamp = new Date(pos.created_at).getTime() / 1000;
                } else if ((pos as any).timestamp) { // DB closed positions have timestamp
                    timestamp = (pos as any).timestamp;
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
                        <Database className="w-6 h-6 text-purple-400" />
                        DB Wallet Dashboard
                    </h2>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800">
                            Local Database Mode
                        </span>
                        <div className="text-right">
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Portfolio Value</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {portfolioStats?.performance_metrics?.portfolio_value
                                    ? formatCurrency(portfolioStats.performance_metrics.portfolio_value)
                                    : '$0.00'}
                            </p>
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
                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 focus:outline-none focus:ring-2 ${walletAddress && !isValidWallet
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-300 dark:border-slate-700 focus:ring-purple-500 dark:focus:ring-purple-400'
                                }`}
                        />
                        {walletAddress && !isValidWallet && (
                            <p className="text-red-400 text-sm mt-1">Invalid wallet address format</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={!isValidWallet || loading}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Searching...' : 'Search DB'}
                    </button>
                </form>
            </div>

            {loading && <LoadingSpinner message="Syncing and fetching data from database... This may take a minute." />}
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
                                        className="w-16 h-16 rounded-full border-2 border-purple-400 object-cover"
                                    />
                                )}
                                {!userLeaderboardData?.profileImage && (
                                    <div className="w-16 h-16 rounded-full border-2 border-purple-400 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <User className="w-8 h-8 text-purple-400" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {userLeaderboardData?.userName || profileStats?.username || 'Unknown User'}
                                        </h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">{walletAddress}</p>
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
                        </div>

                        {/* Portfolio Metrics */}
                        {portfolioStats && (
                            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Total PnL</p>
                                    <p
                                        className={`text-2xl font-bold ${(portfolioStats.performance_metrics?.total_pnl || 0) >= 0
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                            }`}
                                    >
                                        {formatCurrency(portfolioStats.performance_metrics?.total_pnl || 0)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Realized PnL</p>
                                    <p
                                        className={`text-2xl font-bold ${(portfolioStats.performance_metrics?.realized_pnl || 0) >= 0
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                            }`}
                                    >
                                        {formatCurrency(portfolioStats.performance_metrics?.realized_pnl || 0)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Unrealized PnL</p>
                                    <p
                                        className={`text-2xl font-bold ${(portfolioStats.performance_metrics?.unrealized_pnl || 0) >= 0
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                            }`}
                                    >
                                        {formatCurrency(portfolioStats.performance_metrics?.unrealized_pnl || 0)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">ROI</p>
                                    <p
                                        className={`text-2xl font-bold ${(portfolioStats.performance_metrics?.roi || 0) >= 0
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
                            </div>
                        )}
                    </div>

                    {/* Performance Graph */}
                    {performanceGraphData && performanceGraphData.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                <BarChart3 className="w-5 h-5 text-purple-400" />
                                Recent Trades Performance (Last {performanceGraphData.length} Trades)
                            </h3>
                            <TradePerformanceGraph trades={performanceGraphData} />
                        </div>
                    )}

                    {/* Active Positions */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Active Positions ({activePositions.length})
                        </h3>
                        {activePositions.length === 0 ? (
                            <p className="text-slate-600 dark:text-slate-400 text-center py-8">No active positions found in database</p>
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
                                                            className={`font-medium ${(position.cash_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
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
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                            Closed Positions ({allClosedPositions.length})
                        </h3>
                        {allClosedPositions.length === 0 ? (
                            <p className="text-slate-600 dark:text-slate-400 text-center py-8">No closed positions found in database</p>
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
                                                            className={`py-3 px-4 font-medium ${(position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                                }`}
                                                        >
                                                            {formatCurrency(position.realized_pnl || 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                {allClosedPositions.length > pageSize && (
                                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                            Showing {((closedPositionsPage - 1) * pageSize) + 1}-{Math.min(closedPositionsPage * pageSize, allClosedPositions.length)} of {allClosedPositions.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Pagination controls */}
                                            <button
                                                onClick={() => setClosedPositionsPage(p => Math.max(1, p - 1))}
                                                disabled={closedPositionsPage === 1}
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded text-sm disabled:opacity-50"
                                            >Prev</button>
                                            <button
                                                onClick={() => setClosedPositionsPage(p => Math.min(Math.ceil(allClosedPositions.length / pageSize), p + 1))}
                                                disabled={closedPositionsPage >= Math.ceil(allClosedPositions.length / pageSize)}
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded text-sm disabled:opacity-50"
                                            >Next</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Recent Trades */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                            <ActivityIcon className="w-5 h-5 text-blue-400" />
                            Recent Trades ({allActivities.length})
                        </h3>
                        {allActivities.length === 0 ? (
                            <p className="text-slate-600 dark:text-slate-400 text-center py-8">No recent trades found in database</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Date</th>
                                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Market</th>
                                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Size</th>
                                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-medium text-sm">Price</th>
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
                                                        <td className="py-3 px-4">
                                                            {activity.side && (
                                                                <span
                                                                    className={`px-2 py-1 rounded text-xs font-medium ${activity.side === 'BUY'
                                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                                        : 'bg-red-500/20 text-red-400'
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
                                {/* Simplified pagination for activity */}
                                {allActivities.length > pageSize && (
                                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                                        <div className="text-sm text-slate-600 dark:text-slate-400">
                                            Showing {((activitiesPage - 1) * pageSize) + 1}-{Math.min(activitiesPage * pageSize, allActivities.length)} of {allActivities.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setActivitiesPage(p => Math.max(1, p - 1))}
                                                disabled={activitiesPage === 1}
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded text-sm disabled:opacity-50"
                                            >Prev</button>
                                            <button
                                                onClick={() => setActivitiesPage(p => Math.min(Math.ceil(allActivities.length / pageSize), p + 1))}
                                                disabled={activitiesPage >= Math.ceil(allActivities.length / pageSize)}
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded text-sm disabled:opacity-50"
                                            >Next</button>
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
