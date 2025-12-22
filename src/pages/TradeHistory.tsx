import React, { useState } from 'react';
import { fetchTradeHistory } from '../services/api';
import type { TradeHistoryResponse, TradeHistoryTrade, TradeHistoryOpenPosition, TradeHistoryClosedPosition, CategoryMetrics } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const TradeHistory: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState('0xdbade4c82fb72780a0db9a38f821d8671aba9c95');
    const [tradeHistory, setTradeHistory] = useState<TradeHistoryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'open' | 'closed' | 'trades' | 'categories'>('overview');

    const handleFetchHistory = async () => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchTradeHistory(walletAddress);
            setTradeHistory(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load trade history');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number | null | undefined): string => {
        if (num === null || num === undefined || isNaN(num)) return 'N/A';
        const value = num;
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(2)}K`;
        }
        return `$${value.toFixed(2)}`;
    };

    const formatPercent = (num: number | null | undefined): string => {
        if (num === null || num === undefined || isNaN(num)) return 'N/A';
        const sign = num >= 0 ? '+' : '';
        return `${sign}${num.toFixed(2)}%`;
    };

    const formatTimestamp = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const getPnLColor = (pnl: number | null | undefined): string => {
        if (pnl === null || pnl === undefined || isNaN(pnl)) return 'text-gray-400';
        return pnl >= 0 ? 'text-green-400' : 'text-red-400';
    };

    const getROIColor = (roi: number | null | undefined): string => {
        if (roi === null || roi === undefined || isNaN(roi)) return 'text-gray-400';
        return roi >= 0 ? 'text-green-400' : 'text-red-400';
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Trade History</h1>
                    <p className="text-gray-400">Comprehensive trading performance analysis with category breakdowns</p>
                </div>

                {/* Wallet Input */}
                <div className="bg-slate-900 rounded-lg p-4 mb-6">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">
                                Wallet Address <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                        <button
                            onClick={handleFetchHistory}
                            disabled={!walletAddress || loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                        >
                            {loading ? 'Loading...' : 'Fetch History'}
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <LoadingSpinner message="Loading trade history..." />
                    </div>
                )}

                {error && <ErrorMessage message={error} />}

                {tradeHistory && !loading && (
                    <>
                        {/* Overall Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-900 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Total PnL</div>
                                <div className={`text-2xl font-bold ${getPnLColor(tradeHistory.overall_metrics.total_pnl)}`}>
                                    {formatNumber(tradeHistory.overall_metrics.total_pnl)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Realized: {formatNumber(tradeHistory.overall_metrics.realized_pnl)} | 
                                    Unrealized: {formatNumber(tradeHistory.overall_metrics.unrealized_pnl)}
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">ROI</div>
                                <div className={`text-2xl font-bold ${getROIColor(tradeHistory.overall_metrics.roi)}`}>
                                    {formatPercent(tradeHistory.overall_metrics.roi)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Volume: {formatNumber(tradeHistory.overall_metrics.total_volume)}
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {tradeHistory.overall_metrics.win_rate.toFixed(2)}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {tradeHistory.overall_metrics.winning_trades}W / {tradeHistory.overall_metrics.losing_trades}L
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-4">
                                <div className="text-sm text-gray-400 mb-1">Score</div>
                                <div className="text-2xl font-bold text-purple-400">
                                    {tradeHistory.overall_metrics.score.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {tradeHistory.overall_metrics.total_trades} trades
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="bg-slate-900 rounded-lg mb-6">
                            <div className="flex border-b border-slate-700">
                                {[
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'open', label: `Open Positions (${tradeHistory.open_positions.length})` },
                                    { id: 'closed', label: `Closed Positions (${tradeHistory.closed_positions.length})` },
                                    { id: 'trades', label: `All Trades (${tradeHistory.trades.length})` },
                                    { id: 'categories', label: 'Category Breakdown' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-6 py-3 font-medium transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-b-2 border-blue-500 text-blue-400'
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6">
                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-xl font-semibold mb-4">Summary</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-slate-800 rounded-lg p-4">
                                                    <div className="text-sm text-gray-400">Open Positions</div>
                                                    <div className="text-2xl font-bold">{tradeHistory.open_positions.length}</div>
                                                </div>
                                                <div className="bg-slate-800 rounded-lg p-4">
                                                    <div className="text-sm text-gray-400">Closed Positions</div>
                                                    <div className="text-2xl font-bold">{tradeHistory.closed_positions.length}</div>
                                                </div>
                                                <div className="bg-slate-800 rounded-lg p-4">
                                                    <div className="text-sm text-gray-400">Total Trades</div>
                                                    <div className="text-2xl font-bold">{tradeHistory.trades.length}</div>
                                                </div>
                                                <div className="bg-slate-800 rounded-lg p-4">
                                                    <div className="text-sm text-gray-400">Categories</div>
                                                    <div className="text-2xl font-bold">{Object.keys(tradeHistory.category_breakdown).length}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Open Positions Tab */}
                                {activeTab === 'open' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="text-left py-3 px-4">Market</th>
                                                    <th className="text-left py-3 px-4">Outcome</th>
                                                    <th className="text-right py-3 px-4">Size</th>
                                                    <th className="text-right py-3 px-4">Avg Price</th>
                                                    <th className="text-right py-3 px-4">Current Value</th>
                                                    <th className="text-right py-3 px-4">PnL</th>
                                                    <th className="text-right py-3 px-4">ROI</th>
                                                    <th className="text-right py-3 px-4">Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tradeHistory.open_positions.map((pos) => (
                                                    <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {pos.icon && (
                                                                    <img src={pos.icon} alt="" className="w-6 h-6 rounded" />
                                                                )}
                                                                <span className="font-medium">{pos.title || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">{pos.outcome || 'N/A'}</td>
                                                        <td className="text-right py-3 px-4">{pos.size.toFixed(4)}</td>
                                                        <td className="text-right py-3 px-4">{formatNumber(pos.avg_price)}</td>
                                                        <td className="text-right py-3 px-4">{formatNumber(pos.current_value)}</td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getPnLColor(pos.cash_pnl)}`}>
                                                            {formatNumber(pos.cash_pnl)}
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getROIColor(pos.roi)}`}>
                                                            {formatPercent(pos.roi)}
                                                        </td>
                                                        <td className="text-right py-3 px-4">
                                                            <span className="px-2 py-1 bg-slate-700 rounded text-xs">{pos.category}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {tradeHistory.open_positions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="text-center py-8 text-gray-400">
                                                            No open positions
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Closed Positions Tab */}
                                {activeTab === 'closed' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="text-left py-3 px-4">Market</th>
                                                    <th className="text-left py-3 px-4">Outcome</th>
                                                    <th className="text-right py-3 px-4">Avg Price</th>
                                                    <th className="text-right py-3 px-4">Exit Price</th>
                                                    <th className="text-right py-3 px-4">Realized PnL</th>
                                                    <th className="text-right py-3 px-4">ROI</th>
                                                    <th className="text-right py-3 px-4">Date</th>
                                                    <th className="text-right py-3 px-4">Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tradeHistory.closed_positions.map((pos) => (
                                                    <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {pos.icon && (
                                                                    <img src={pos.icon} alt="" className="w-6 h-6 rounded" />
                                                                )}
                                                                <span className="font-medium">{pos.title || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">{pos.outcome || 'N/A'}</td>
                                                        <td className="text-right py-3 px-4">{formatNumber(pos.avg_price)}</td>
                                                        <td className="text-right py-3 px-4">{formatNumber(pos.cur_price)}</td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getPnLColor(pos.realized_pnl)}`}>
                                                            {formatNumber(pos.realized_pnl)}
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getROIColor(pos.roi)}`}>
                                                            {formatPercent(pos.roi)}
                                                        </td>
                                                        <td className="text-right py-3 px-4 text-sm text-gray-400">
                                                            {formatTimestamp(pos.timestamp)}
                                                        </td>
                                                        <td className="text-right py-3 px-4">
                                                            <span className="px-2 py-1 bg-slate-700 rounded text-xs">{pos.category}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {tradeHistory.closed_positions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="text-center py-8 text-gray-400">
                                                            No closed positions
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* All Trades Tab */}
                                {activeTab === 'trades' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="text-left py-3 px-4">Market</th>
                                                    <th className="text-left py-3 px-4">Side</th>
                                                    <th className="text-right py-3 px-4">Size</th>
                                                    <th className="text-right py-3 px-4">Entry Price</th>
                                                    <th className="text-right py-3 px-4">Exit Price</th>
                                                    <th className="text-right py-3 px-4">PnL</th>
                                                    <th className="text-right py-3 px-4">ROI</th>
                                                    <th className="text-right py-3 px-4">Date</th>
                                                    <th className="text-right py-3 px-4">Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tradeHistory.trades.map((trade) => (
                                                    <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {trade.icon && (
                                                                    <img src={trade.icon} alt="" className="w-6 h-6 rounded" />
                                                                )}
                                                                <span className="font-medium">{trade.title || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`px-2 py-1 rounded text-xs ${
                                                                trade.side === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                                                            }`}>
                                                                {trade.side}
                                                            </span>
                                                        </td>
                                                        <td className="text-right py-3 px-4">{trade.size.toFixed(4)}</td>
                                                        <td className="text-right py-3 px-4">{formatNumber(trade.entry_price)}</td>
                                                        <td className="text-right py-3 px-4">{formatNumber(trade.exit_price)}</td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getPnLColor(trade.pnl)}`}>
                                                            {formatNumber(trade.pnl)}
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getROIColor(trade.roi)}`}>
                                                            {formatPercent(trade.roi)}
                                                        </td>
                                                        <td className="text-right py-3 px-4 text-sm text-gray-400">
                                                            {formatTimestamp(trade.timestamp)}
                                                        </td>
                                                        <td className="text-right py-3 px-4">
                                                            <span className="px-2 py-1 bg-slate-700 rounded text-xs">{trade.category}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {tradeHistory.trades.length === 0 && (
                                                    <tr>
                                                        <td colSpan={9} className="text-center py-8 text-gray-400">
                                                            No trades found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Category Breakdown Tab */}
                                {activeTab === 'categories' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="text-left py-3 px-4">Category</th>
                                                    <th className="text-right py-3 px-4">PnL</th>
                                                    <th className="text-right py-3 px-4">ROI</th>
                                                    <th className="text-right py-3 px-4">Win Rate</th>
                                                    <th className="text-right py-3 px-4">Score</th>
                                                    <th className="text-right py-3 px-4">Wins</th>
                                                    <th className="text-right py-3 px-4">Losses</th>
                                                    <th className="text-right py-3 px-4">Total Trades</th>
                                                    <th className="text-right py-3 px-4">Volume</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(tradeHistory.category_breakdown).map(([category, metrics]) => (
                                                    <tr key={category} className="border-b border-slate-800 hover:bg-slate-800">
                                                        <td className="py-3 px-4 font-medium">
                                                            <span className="px-2 py-1 bg-slate-700 rounded">{category}</span>
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getPnLColor(metrics.pnl)}`}>
                                                            {formatNumber(metrics.pnl)}
                                                        </td>
                                                        <td className={`text-right py-3 px-4 font-medium ${getROIColor(metrics.roi)}`}>
                                                            {formatPercent(metrics.roi)}
                                                        </td>
                                                        <td className="text-right py-3 px-4">{metrics.win_rate.toFixed(2)}%</td>
                                                        <td className="text-right py-3 px-4 text-purple-400">{metrics.score.toFixed(1)}</td>
                                                        <td className="text-right py-3 px-4 text-green-400">{metrics.winning_trades}</td>
                                                        <td className="text-right py-3 px-4 text-red-400">{metrics.losing_trades}</td>
                                                        <td className="text-right py-3 px-4">{metrics.total_trades}</td>
                                                        <td className="text-right py-3 px-4 text-gray-400">{formatNumber(metrics.total_volume)}</td>
                                                    </tr>
                                                ))}
                                                {Object.keys(tradeHistory.category_breakdown).length === 0 && (
                                                    <tr>
                                                        <td colSpan={9} className="text-center py-8 text-gray-400">
                                                            No category data available
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TradeHistory;

