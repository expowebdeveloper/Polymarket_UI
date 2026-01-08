import { useState, useMemo } from 'react';
import { Search, Bell, Settings, User, Wallet, Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

// Helper function to format size
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
    const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'distribution' | 'activity' | 'active_positions' | 'closed_positions'>('history');

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
        }
    };

    const performanceGraphData = useMemo(() => {
        if (!userPnL || userPnL.length === 0) return [];

        // Sort by timestamp and take last 20
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
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-bold">LIVE</span>
                    </div>

                    <form onSubmit={handleWalletSubmit} className="flex-1 px-10">
                        <div className="flex items-center gap-3 bg-slate-900/70 border border-emerald-500/30 rounded-full px-5 py-2 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                            <Search className="h-4 w-4 text-emerald-400" />
                            <input
                                className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                                placeholder="Enter wallet address (0x...)"
                                value={walletInput}
                                onChange={(e) => setWalletInput(e.target.value)}
                            />
                            {activeWallet && (
                                <button onClick={() => refresh()} disabled={loading} className="p-1 hover:text-emerald-400 disabled:opacity-50">
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                    </form>

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

            {!loading && activeWallet && metrics && (
                <div className="px-8 py-6 space-y-6">
                    {/* FINAL RATING */}
                    <div className="bg-slate-900/70 border border-emerald-500/40 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.35)] p-6">
                        <p className="text-sm uppercase tracking-widest text-emerald-300/80">Live API Rating</p>
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
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-6 max-w-xl">
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Predictions</p>
                                <p className="text-lg font-bold text-emerald-300">{metrics.total_trades}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Total PnL</p>
                                <p className="text-lg font-bold text-emerald-300">{formatCurrency(metrics.total_pnl)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">Win Rate</p>
                                <p className="text-lg font-bold text-emerald-300">{metrics.win_rate.toFixed(1)}%</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-800/70 to-purple-950/90 border border-purple-600/30 rounded-2xl px-3 py-3 flex flex-col justify-center items-center text-center">
                                <p className="text-xs text-slate-300 mb-0.5">ROI</p>
                                <p className="text-lg font-bold text-emerald-300">{metrics.roi.toFixed(1)}%</p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 p-6 shadow-[0_0_70px_rgba(34,197,94,0.45)]">
                            <div className="flex items-center justify-between text-center">
                                <div className="flex-1 border-r border-emerald-500/20">
                                    <p className="text-sm font-medium text-emerald-200">🔥 Current streak</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.current_streak}</p>
                                </div>
                                <div className="flex-1 border-r border-emerald-500/20">
                                    <p className="text-sm font-medium text-emerald-200">📊 Win Count</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.total_wins}</p>
                                </div>
                                <div className="flex-1 border-r border-emerald-500/20">
                                    <p className="text-sm font-medium text-emerald-200">📉 Loss Count</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.streaks.total_losses}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-200">🛡️ Risk Score</p>
                                    <p className="text-3xl font-extrabold text-emerald-300">{metrics.risk_score.toFixed(3)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PERFORMANCE CHART */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <ActivityIcon className="h-5 w-5 text-emerald-500" />
                            Real-time Performance (Last 20 Points)
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={performanceGraphData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#10b981' }}
                                        formatter={(value: any) => [formatCurrency(value), 'Total PnL']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulativePnl"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ fill: '#10b981', r: 4 }}
                                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* POSITIONS TABS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            {['active_positions', 'closed_positions', 'activity'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {tab.replace('_', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
                            {activeTab === 'active_positions' && (
                                <table className="w-full text-left">
                                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Market</th>
                                            <th className="px-6 py-4">Size</th>
                                            <th className="px-6 py-4">Avg Price</th>
                                            <th className="px-6 py-4">PnL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {positions.map((pos, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {pos.icon && <img src={pos.icon} className="h-8 w-8 rounded-full" />}
                                                        <div>
                                                            <p className="font-medium text-sm">{pos.title || 'Unknown Market'}</p>
                                                            <p className="text-xs text-slate-500 uppercase">{pos.outcome || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">{formatSize(pos.size)}</td>
                                                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(pos.avg_price)}</td>
                                                <td className={`px-6 py-4 text-sm font-bold ${pos.cash_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatCurrency(pos.cash_pnl)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'closed_positions' && (
                                <table className="w-full text-left">
                                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Market</th>
                                            <th className="px-6 py-4">PnL</th>
                                            <th className="px-6 py-4">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {closedPositions.map((pos, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {pos.icon && <img src={pos.icon} className="h-8 w-8 rounded-full" />}
                                                        <div>
                                                            <p className="font-medium text-sm">{pos.title || 'Unknown Market'}</p>
                                                            <p className="text-xs text-slate-500 uppercase">{pos.outcome || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-4 text-sm font-bold ${pos.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatCurrency(pos.realized_pnl)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400">{formatDate(pos.created_at || '')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'activity' && (
                                <div className="p-4 space-y-3">
                                    {activities.slice(0, 50).map((act, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all border border-slate-700/50">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${act.type === 'TRADE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    <ActivityIcon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">{act.title || (act.type === 'TRADE' ? 'Polymarket Trade' : 'Activity')}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(act.timestamp)} • {act.type}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold">{formatCurrency(act.usdc_size)}</p>
                                                <p className="text-[10px] text-slate-600 font-mono tracking-tighter">{shortenAddress(act.transaction_hash)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
