import { useState, useMemo } from 'react';
import { Search, Bell, Settings, User, Wallet, TrendingUp, TrendingDown, Trophy, Fish, Flame, ChevronDown, ChevronUp, ChevronRight, Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useLiveDashboard } from '../hooks/useLiveDashboard';

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

export function LiveDashboard() {
    const [walletInput, setWalletInput] = useState('');
    const [activeWallet, setActiveWallet] = useState('');
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'distribution' | 'activity' | 'active_positions' | 'closed_positions'>('history');
    const [distributionMetric, setDistributionMetric] = useState<'count' | 'capital'>('count');

    // Pagination states
    const [historyPage, setHistoryPage] = useState(1);
    const [activePositionsPage, setActivePositionsPage] = useState(1);
    const [closedPositionsPage, setClosedPositionsPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);
    const itemsPerPage = 20;

    const {
        loading,
        error,
        metrics,
        positions,
        closedPositions,
        activities,
        userPnL,
        refresh
    } = useLiveDashboard(activeWallet);

    const handleWalletSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (/^0x[a-fA-F0-9]{40}$/.test(walletInput)) {
            setActiveWallet(walletInput);
            // Reset pages when changing wallet
            setHistoryPage(1);
            setActivePositionsPage(1);
            setClosedPositionsPage(1);
            setActivityPage(1);
        }
    };

    // Helper function to categorize market (re-using logic from WalletDashboard)
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
        closedPositions.forEach(pos => {
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
        positions.forEach(pos => {
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
    }, [closedPositions, positions, categorizeMarket]);

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
        closedPositions.forEach(pos => {
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
    }, [closedPositions]);

    const performanceGraphData = useMemo(() => {
        if (!userPnL || userPnL.length === 0) return [];

        // Sort by timestamp and take last 20 Chronologically
        return userPnL
            .sort((a, b) => a.t - b.t)
            .slice(-20)
            .map(point => ({
                date: new Date(point.t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                cumulativePnl: point.p,
            }));
    }, [userPnL]);

    const shortenAddress = (address: string): string => {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}…${address.slice(-4)}`;
    };

    return (
        <div className={theme === "dark" ? "min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white" : "min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 text-slate-900"}>
            {/* TOP NAV */}
            <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur border-b border-slate-800">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-sm text-slate-400">{activeWallet ? shortenAddress(activeWallet) : 'No wallet connected'}</p>
                            <p className="text-xs text-slate-500">Live API Profile</p>
                        </div>
                        {activeWallet && <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-bold">LIVE</span>}
                    </div>

                    <div className="flex-1 px-10">
                        <form onSubmit={handleWalletSubmit} className="flex items-center gap-3 bg-slate-900/70 border border-emerald-500/30 rounded-full px-5 py-2 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                            <Search className="h-4 w-4 text-emerald-400" />
                            <input
                                className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                                placeholder="Enter wallet address (0x...)"
                                value={walletInput}
                                onChange={(e) => setWalletInput(e.target.value)}
                            />
                            {activeWallet && (
                                <button type="button" onClick={() => refresh()} disabled={loading} className="p-1 hover:text-emerald-400 disabled:opacity-50">
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </form>
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

            {!activeWallet && (
                <div className="flex flex-col items-center justify-center p-20 text-center">
                    <Wallet className="h-20 w-20 text-emerald-500/20 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Live API Dashboard</h2>
                    <p className="text-slate-400 max-w-md">Enter a wallet address above to calculate real-time metrics directly from Polymarket APIs.</p>
                </div>
            )}

            {loading && activeWallet && <div className="p-8"><LoadingSpinner message="Calculating live metrics..." /></div>}
            {error && <div className="p-8"><ErrorMessage message={error} onRetry={refresh} /></div>}

            {/* CONTENT */}
            {!loading && activeWallet && metrics && (
                <div className="px-8 py-6 space-y-6">
                    {/* FINAL RATING */}
                    <div className="bg-slate-900/70 border border-emerald-500/40 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.35)] p-6">
                        <p className="text-sm uppercase tracking-widest text-emerald-300/80">Final Rating (Live)</p>
                        <div className="flex items-end gap-6">
                            <p className="text-[60px] leading-none font-extrabold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                                {metrics.final_score.toFixed(1)}
                            </p>
                            <div className="flex gap-3 pb-2">
                                {metrics.final_score >= 95 && (
                                    <span className="px-6 py-2 rounded-full text-sm bg-slate-800/70 border text-emerald-300 shadow-[0_0_30px_rgba(34,197,94,0.6)] border-emerald-400">👑 Prediction King</span>
                                )}
                                {metrics.total_trades > 100 && (
                                    <span className="px-6 py-2 rounded-full text-sm bg-slate-800/70 border text-emerald-300 shadow-[0_0_30px_rgba(34,197,94,0.6)] border-emerald-400">🏅 High Volume</span>
                                )}
                                {metrics.total_volume >= 100000 && (
                                    <span className="px-6 py-2 rounded-full text-sm bg-slate-800/70 border text-emerald-300 shadow-[0_0_30px_rgba(34,197,94,0.6)] border-emerald-400">🐋 Whale</span>
                                )}
                                {metrics.streaks.current_streak >= 5 && (
                                    <span className="px-6 py-2 rounded-full text-sm bg-slate-800/70 border text-orange-300 shadow-[0_0_35px_rgba(251,146,60,0.7)] border-orange-400">🔥 Hot Streak</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-6 max-w-xl">
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 min-h-[72px] flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Predictions</p>
                                <p className="text-lg font-bold text-emerald-300">{metrics.total_trades}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 min-h-[72px] flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Total Volume</p>
                                <p className="text-lg font-bold text-emerald-300">{formatCurrency(metrics.total_volume)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 min-h-[72px] flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Win Rate</p>
                                <p className="text-lg font-bold text-emerald-300">{metrics.win_rate.toFixed(1)}%</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 min-h-[72px] flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Total PnL</p>
                                <p className="text-lg font-bold text-emerald-300">{formatCurrency(metrics.total_pnl)}</p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 p-6 shadow-[0_0_70px_rgba(34,197,94,0.45)]">
                            <div className="flex items-center justify-between text-center">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-200">🔥 Longest streak</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.longest_streak}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-200">👀 Current streak</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.current_streak}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-200">👍 Total wins</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.total_wins}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-200">👎 Total losses</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.total_losses}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-200">🏆 Largest Win</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{formatCurrency(metrics.largest_win)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PRIMARY METRICS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Net Profit</p>
                            </div>
                            <p className={`text-2xl font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(metrics.total_pnl)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Realized & Unrealized PnL</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Trophy className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Win Rate</p>
                            </div>
                            <p className="text-2xl font-bold text-white">{metrics.win_rate.toFixed(1)}%</p>
                            <p className="text-xs text-slate-500 mt-1">{metrics.streaks.total_wins} Wins / {metrics.streaks.total_losses} Losses</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                    <ActivityIcon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">ROI Score</p>
                            </div>
                            <p className="text-2xl font-bold text-white">{metrics.roi_score.toFixed(1)}</p>
                            <p className="text-xs text-slate-500 mt-1">Weighted ROI performance</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:scale-110 transition-transform">
                                    <Fish className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Risk Score</p>
                            </div>
                            <p className="text-2xl font-bold text-white">{(metrics.risk_score * 10).toFixed(1)}</p>
                            <p className="text-xs text-slate-500 mt-1">Downside risk assessment</p>
                        </div>
                    </div>

                    {/* ADVANCED METRICS TOGGLE */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full px-6 py-3 bg-slate-900/40 border border-slate-800 rounded-2xl hover:bg-slate-900/60 transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1 px-2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">EXTRA</div>
                                <span className="text-sm font-semibold text-slate-300">Advanced Scoring & Metrics</span>
                            </div>
                            {showAdvanced ? <ChevronUp className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" /> : <ChevronDown className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />}
                        </button>

                        {showAdvanced && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">PnL Score</p>
                                    <p className="text-xl font-bold text-white">{metrics.pnl_score.toFixed(1)}</p>
                                    <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(metrics.pnl_score, 100)}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Conf. Score</p>
                                    <p className="text-xl font-bold text-white">{metrics.confidence_score.toFixed(1)}</p>
                                    <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: `${Math.min(metrics.confidence_score, 100)}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Avg Win</p>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(metrics.total_pnl / (metrics.streaks.total_wins || 1))}</p>
                                </div>
                                <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Active Stakes</p>
                                    <p className="text-xl font-bold text-white">{positions.length} Positions</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* PERFORMANCE CHART */}
                        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold">Portfolio Performance</h3>
                                    <p className="text-sm text-slate-400">Cumulative PnL across last 20 activities</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                        <TrendingUp className="h-3 w-3" />
                                        Live Data
                                    </span>
                                </div>
                            </div>
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceGraphData}>
                                        <defs>
                                            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                            itemStyle={{ color: '#10b981' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulativePnl"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* QUICK STATS */}
                        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                            <h3 className="text-lg font-bold mb-4">Quick Insights</h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-slate-400">Largest Profit</p>
                                        <Flame className="h-4 w-4 text-orange-400" />
                                    </div>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(metrics.largest_win)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-slate-400">Buy Volume</p>
                                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <p className="text-xl font-bold text-white">{formatCurrency(metrics.buy_volume)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-slate-400">Sell Volume</p>
                                        <TrendingDown className="h-4 w-4 text-red-400" />
                                    </div>
                                    <p className="text-xl font-bold text-white">{formatCurrency(metrics.sell_volume)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABS SECTION */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden mb-12">
                        <div className="flex border-b border-slate-800 p-2 gap-2 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'history', label: 'Trade History' },
                                { id: 'active_positions', label: 'Active Positions' },
                                { id: 'closed_positions', label: 'Closed Positions' },
                                { id: 'performance', label: 'Performance' },
                                { id: 'distribution', label: 'Distribution' },
                                { id: 'activity', label: 'Activity' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {activeTab === 'history' && (
                                <div>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                    <th className="text-left py-3 px-4 font-medium">Market</th>
                                                    <th className="text-left py-3 px-4 font-medium">Side</th>
                                                    <th className="text-left py-3 px-4 font-medium">Size</th>
                                                    <th className="text-left py-3 px-4 font-medium">Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {activities
                                                    .filter(a => a.type === 'TRADE')
                                                    .slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage)
                                                    .map((trade, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30">
                                                            <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                                                                {trade.title || trade.slug || 'Market'}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trade.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                                    {trade.side}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-300">{formatSize(trade.size)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(trade.price)}</td>
                                                            <td className="py-3 px-4 text-slate-500 text-sm">{formatDate(trade.timestamp)}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* History Pagination */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-slate-400 text-sm">
                                            Showing {(historyPage - 1) * itemsPerPage + 1} to {Math.min(historyPage * itemsPerPage, activities.filter(a => a.type === 'TRADE').length)} of {activities.filter(a => a.type === 'TRADE').length} trades
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                                                disabled={historyPage === 1}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${historyPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 text-slate-300 text-sm">
                                                Page {historyPage} of {Math.ceil(activities.filter(a => a.type === 'TRADE').length / itemsPerPage) || 1}
                                            </span>
                                            <button
                                                onClick={() => setHistoryPage(prev => Math.min(Math.ceil(activities.filter(a => a.type === 'TRADE').length / itemsPerPage), prev + 1))}
                                                disabled={historyPage >= Math.ceil(activities.filter(a => a.type === 'TRADE').length / itemsPerPage)}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${historyPage >= Math.ceil(activities.filter(a => a.type === 'TRADE').length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'active_positions' && (
                                <div>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                    <th className="text-left py-3 px-4 font-medium">Market</th>
                                                    <th className="text-left py-3 px-4 font-medium">Outcome</th>
                                                    <th className="text-left py-3 px-4 font-medium">Size</th>
                                                    <th className="text-left py-3 px-4 font-medium">Avg Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Cur Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Unrealized PnL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {positions
                                                    .slice((activePositionsPage - 1) * itemsPerPage, activePositionsPage * itemsPerPage)
                                                    .map((position, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30">
                                                            <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                                                                {position.title || position.slug || 'Market'}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-300 text-sm">{position.outcome || 'N/A'}</td>
                                                            <td className="py-3 px-4 text-white font-medium">{formatSize(position.size)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.avg_price || 0)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.cur_price || 0)}</td>
                                                            <td className={`py-3 px-4 font-bold ${(position.cash_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {formatCurrency(position.cash_pnl || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Active Positions Pagination */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-slate-400 text-sm">
                                            Showing {(activePositionsPage - 1) * itemsPerPage + 1} to {Math.min(activePositionsPage * itemsPerPage, positions.length)} of {positions.length} positions
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setActivePositionsPage(prev => Math.max(1, prev - 1))}
                                                disabled={activePositionsPage === 1}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${activePositionsPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 text-slate-300 text-sm">
                                                Page {activePositionsPage} of {Math.ceil(positions.length / itemsPerPage) || 1}
                                            </span>
                                            <button
                                                onClick={() => setActivePositionsPage(prev => Math.min(Math.ceil(positions.length / itemsPerPage), prev + 1))}
                                                disabled={activePositionsPage >= Math.ceil(positions.length / itemsPerPage)}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${activePositionsPage >= Math.ceil(positions.length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'closed_positions' && (
                                <div>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                    <th className="text-left py-3 px-4 font-medium">Market</th>
                                                    <th className="text-left py-3 px-4 font-medium">Outcome</th>
                                                    <th className="text-left py-3 px-4 font-medium">Size</th>
                                                    <th className="text-left py-3 px-4 font-medium">Avg Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Exit Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Realized PnL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {closedPositions
                                                    .slice((closedPositionsPage - 1) * itemsPerPage, closedPositionsPage * itemsPerPage)
                                                    .map((position, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30">
                                                            <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                                                                {position.title || position.slug || 'Market'}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-300 text-sm">{position.outcome || 'N/A'}</td>
                                                            <td className="py-3 px-4 text-white font-medium">{formatSize(position.size)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.avg_price || 0)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.cur_price || 0)}</td>
                                                            <td className={`py-3 px-4 font-bold ${(position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {formatCurrency(position.realized_pnl || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Closed Positions Pagination */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-slate-400 text-sm">
                                            Showing {(closedPositionsPage - 1) * itemsPerPage + 1} to {Math.min(closedPositionsPage * itemsPerPage, closedPositions.length)} of {closedPositions.length} positions
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setClosedPositionsPage(prev => Math.max(1, prev - 1))}
                                                disabled={closedPositionsPage === 1}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${closedPositionsPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 text-slate-300 text-sm">
                                                Page {closedPositionsPage} of {Math.ceil(closedPositions.length / itemsPerPage) || 1}
                                            </span>
                                            <button
                                                onClick={() => setClosedPositionsPage(prev => Math.min(Math.ceil(closedPositions.length / itemsPerPage), prev + 1))}
                                                disabled={closedPositionsPage >= Math.ceil(closedPositions.length / itemsPerPage)}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${closedPositionsPage >= Math.ceil(closedPositions.length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'performance' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/30 border border-emerald-500/20 rounded-2xl p-6">
                                        <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            7-Day Profit Trend
                                        </h4>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={profitTrend}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                        formatter={(value: any) => [formatCurrency(value), 'Daily PnL']}
                                                    />
                                                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                                                        {profitTrend.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                                            <p className="text-sm text-slate-400 mb-1">Primary Edge</p>
                                            <p className="text-lg font-medium text-white">{primaryEdge}</p>
                                        </div>
                                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                                            <p className="text-sm text-slate-400 mb-1">Trading Efficiency</p>
                                            <p className="text-lg font-medium text-white">
                                                {((metrics.streaks.total_wins / (metrics.total_trades || 1)) * 100).toFixed(1)}% hit rate
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'distribution' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={marketDistribution}
                                                    innerRadius={80}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey={distributionMetric === 'count' ? 'trades_count' : 'capital'}
                                                >
                                                    {marketDistribution.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex gap-2 mb-6">
                                            <button
                                                onClick={() => setDistributionMetric('count')}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${distributionMetric === 'count' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                                            >
                                                BY TRADE COUNT
                                            </button>
                                            <button
                                                onClick={() => setDistributionMetric('capital')}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${distributionMetric === 'capital' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                                            >
                                                BY CAPITAL
                                            </button>
                                        </div>
                                        {marketDistribution.map((item, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-300 flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][idx % 4] }}></div>
                                                        {item.category}
                                                    </span>
                                                    <span className="text-white font-medium">{distributionMetric === 'count' ? `${item.trades_count} trades` : formatCurrency(item.capital)}</span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000"
                                                        style={{
                                                            width: `${(distributionMetric === 'count' ? (item.trades_count / metrics.total_trades) * 100 : (item.capital / metrics.total_volume) * 100)}%`,
                                                            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][idx % 4]
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {activities
                                            .slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage)
                                            .map((act, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl hover:bg-slate-800/50 transition-all border border-slate-700/50 group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-xl ${act.type === 'TRADE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'} group-hover:scale-110 transition-transform`}>
                                                            {act.type === 'TRADE' ? <ActivityIcon className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-white">{act.title || (act.type === 'TRADE' ? 'Polymarket Trade' : 'Wallet Activity')}</p>
                                                            <p className="text-xs text-slate-500">{formatDate(act.timestamp)} • <span className="uppercase">{act.type}</span></p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-white">{formatCurrency(act.usdc_size)}</p>
                                                        <p className="text-[10px] text-slate-600 font-mono flex items-center gap-1 justify-end">
                                                            {shortenAddress(act.transaction_hash)}
                                                            <ChevronRight className="h-3 w-3" />
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* Activity Pagination */}
                                    <div className="flex items-center justify-between mt-6">
                                        <div className="text-slate-400 text-sm">
                                            Showing {(activityPage - 1) * itemsPerPage + 1} to {Math.min(activityPage * itemsPerPage, activities.length)} of {activities.length} events
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                                                disabled={activityPage === 1}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activityPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 text-slate-300 text-sm font-medium">
                                                Page {activityPage} of {Math.ceil(activities.length / itemsPerPage) || 1}
                                            </span>
                                            <button
                                                onClick={() => setActivityPage(prev => Math.min(Math.ceil(activities.length / itemsPerPage), prev + 1))}
                                                disabled={activityPage >= Math.ceil(activities.length / itemsPerPage)}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activityPage >= Math.ceil(activities.length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white shadow-lg'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
