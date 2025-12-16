import React, { useState, useEffect } from 'react';
import { fetchAllLeaderboards } from '../services/api';
import type { AllLeaderboardsResponse, LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

type LeaderboardType = 'w_shrunk' | 'roi_raw' | 'roi_shrunk' | 'pnl_shrunk' | 'score_win_rate' | 'score_roi' | 'score_pnl' | 'score_risk';

const AllLeaderboards: React.FC = () => {
    const [data, setData] = useState<AllLeaderboardsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<LeaderboardType>('score_pnl');
    const [showPercentiles, setShowPercentiles] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAllLeaderboards();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load leaderboards');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatPercent = (val: number) => `${val.toFixed(2)}%`;

    const getCurrentLeaderboard = (): LeaderboardEntry[] => {
        if (!data?.leaderboards) return [];
        return data.leaderboards[activeTab] || [];
    };

    const getLeaderboardTitle = (type: LeaderboardType): string => {
        const titles: Record<LeaderboardType, string> = {
            'w_shrunk': 'W_shrunk (Ascending)',
            'roi_raw': 'ROI Raw (Descending)',
            'roi_shrunk': 'ROI_shrunk (Ascending)',
            'pnl_shrunk': 'PNL_shrunk (Ascending)',
            'score_win_rate': 'Win Rate Score',
            'score_roi': 'ROI Score',
            'score_pnl': 'PnL Score',
            'score_risk': 'Risk Score'
        };
        return titles[type];
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadData} />;
    }

    if (!data) {
        return <ErrorMessage message="No data available" onRetry={loadData} />;
    }

    const currentLeaderboard = getCurrentLeaderboard();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-yellow-400 mb-2">All Leaderboards</h1>
                    <p className="text-slate-400">Complete leaderboard system with percentile information</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1">Total Traders</div>
                        <div className="text-2xl font-bold text-yellow-400">{data.total_traders}</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1">Population (≥5 trades)</div>
                        <div className="text-2xl font-bold text-green-400">{data.population_traders}</div>
                        <div className="text-xs text-slate-500 mt-1">Used for percentile calculations</div>
                    </div>
                </div>

                {/* Percentile Information */}
                {showPercentiles && (
                    <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-purple-400">📊 Percentile Anchors</h2>
                            <button
                                onClick={() => setShowPercentiles(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                Hide
                            </button>
                        </div>
                        <p className="text-slate-400 text-sm mb-4">
                            These values are calculated from traders with ≥5 trades and used to normalize scores to 0-1 range.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900 rounded p-4 border border-slate-700">
                                <div className="text-slate-400 text-sm mb-2">W_shrunk Percentiles</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">1st:</span>
                                        <span className="text-yellow-400 font-mono">{data.percentiles.w_shrunk_1_percent.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">99th:</span>
                                        <span className="text-yellow-400 font-mono">{data.percentiles.w_shrunk_99_percent.toFixed(6)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded p-4 border border-slate-700">
                                <div className="text-slate-400 text-sm mb-2">ROI_shrunk Percentiles</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">1st:</span>
                                        <span className="text-yellow-400 font-mono">{data.percentiles.roi_shrunk_1_percent.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">99th:</span>
                                        <span className="text-yellow-400 font-mono">{data.percentiles.roi_shrunk_99_percent.toFixed(6)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded p-4 border border-slate-700">
                                <div className="text-slate-400 text-sm mb-2">PNL_shrunk Percentiles</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">1st:</span>
                                        <span className="text-yellow-400 font-mono">{data.percentiles.pnl_shrunk_1_percent.toFixed(6)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">99th:</span>
                                        <span className="text-yellow-400 font-mono">{data.percentiles.pnl_shrunk_99_percent.toFixed(6)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!showPercentiles && (
                    <button
                        onClick={() => setShowPercentiles(true)}
                        className="mb-4 text-purple-400 hover:text-purple-300"
                    >
                        Show Percentile Information
                    </button>
                )}

                {/* Median Information */}
                <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
                    <h3 className="text-lg font-bold text-green-400 mb-3">📊 Median Values (used in Shrinkage)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded p-3 border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">ROI Median</div>
                            <div className="text-xl font-bold text-green-400">{formatPercent(data.medians.roi_median)}</div>
                        </div>
                        <div className="bg-slate-900 rounded p-3 border border-slate-700">
                            <div className="text-slate-400 text-sm mb-1">PnL Median (Adjusted)</div>
                            <div className="text-xl font-bold text-green-400">{formatCurrency(data.medians.pnl_median)}</div>
                        </div>
                    </div>
                </div>

                {/* Leaderboard Tabs */}
                <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setActiveTab('w_shrunk')}
                            className={`px-4 py-2 rounded ${activeTab === 'w_shrunk' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            W_shrunk
                        </button>
                        <button
                            onClick={() => setActiveTab('roi_raw')}
                            className={`px-4 py-2 rounded ${activeTab === 'roi_raw' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            ROI Raw
                        </button>
                        <button
                            onClick={() => setActiveTab('roi_shrunk')}
                            className={`px-4 py-2 rounded ${activeTab === 'roi_shrunk' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            ROI_shrunk
                        </button>
                        <button
                            onClick={() => setActiveTab('pnl_shrunk')}
                            className={`px-4 py-2 rounded ${activeTab === 'pnl_shrunk' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            PNL_shrunk
                        </button>
                        <button
                            onClick={() => setActiveTab('score_win_rate')}
                            className={`px-4 py-2 rounded ${activeTab === 'score_win_rate' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            Win Rate Score
                        </button>
                        <button
                            onClick={() => setActiveTab('score_roi')}
                            className={`px-4 py-2 rounded ${activeTab === 'score_roi' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            ROI Score
                        </button>
                        <button
                            onClick={() => setActiveTab('score_pnl')}
                            className={`px-4 py-2 rounded ${activeTab === 'score_pnl' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            PnL Score
                        </button>
                        <button
                            onClick={() => setActiveTab('score_risk')}
                            className={`px-4 py-2 rounded ${activeTab === 'score_risk' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            Risk Score
                        </button>
                    </div>

                    {/* Current Leaderboard Table */}
                    <div className="overflow-x-auto">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">{getLeaderboardTitle(activeTab)}</h3>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-900">
                                    <th className="border border-slate-700 px-4 py-2 text-left">Rank</th>
                                    <th className="border border-slate-700 px-4 py-2 text-left">Wallet</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">Total PnL</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">ROI</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">Win Rate</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">Trades</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">W_shrunk</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">ROI_shrunk</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">PNL_shrunk</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">W_Score</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">ROI_Score</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">PNL_Score</th>
                                    <th className="border border-slate-700 px-4 py-2 text-right">Risk_Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentLeaderboard.slice(0, 50).map((entry, index) => (
                                    <tr key={entry.wallet_address || index} className="hover:bg-slate-700">
                                        <td className="border border-slate-700 px-4 py-2 text-green-400 font-bold">#{entry.rank || index + 1}</td>
                                        <td className="border border-slate-700 px-4 py-2 font-mono text-sm">
                                            {entry.name || `${entry.wallet_address?.slice(0, 8)}...${entry.wallet_address?.slice(-6)}`}
                                        </td>
                                        <td className={`border border-slate-700 px-4 py-2 text-right ${entry.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(entry.total_pnl)}
                                        </td>
                                        <td className={`border border-slate-700 px-4 py-2 text-right ${entry.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatPercent(entry.roi)}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right">{formatPercent(entry.win_rate)}</td>
                                        <td className="border border-slate-700 px-4 py-2 text-right">{entry.total_trades}</td>
                                        <td className="border border-slate-700 px-4 py-2 text-right font-mono text-xs">
                                            {entry.W_shrunk?.toFixed(6) || 'N/A'}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right font-mono text-xs">
                                            {entry.roi_shrunk?.toFixed(6) || 'N/A'}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right font-mono text-xs">
                                            {entry.pnl_shrunk?.toFixed(6) || 'N/A'}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right">
                                            {entry.score_win_rate?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right">
                                            {entry.score_roi?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right">
                                            {entry.score_pnl?.toFixed(4) || '0.0000'}
                                        </td>
                                        <td className="border border-slate-700 px-4 py-2 text-right">
                                            {entry.score_risk?.toFixed(4) || '0.0000'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {currentLeaderboard.length === 0 && (
                            <div className="text-center py-8 text-slate-400">No data available for this leaderboard</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllLeaderboards;

