import React, { useState, useEffect } from 'react';
import { fetchViewAllLeaderboards } from '../services/api';
import type { AllLeaderboardsResponse, LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

type LeaderboardType = 
    | 'w_shrunk' 
    | 'roi_raw' 
    | 'roi_shrunk' 
    | 'pnl_shrunk' 
    | 'score_win_rate' 
    | 'score_roi' 
    | 'score_pnl' 
    | 'score_risk' 
    | 'final_score';

const LeaderboardViewAll: React.FC = () => {
    const [data, setData] = useState<AllLeaderboardsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<LeaderboardType>('final_score');
    const [showPercentiles, setShowPercentiles] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchViewAllLeaderboards();
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
            'w_shrunk': '1. W_shrunk Leaderboard (Ascending - Best = Rank 1)',
            'roi_raw': '2. ROI Raw Leaderboard (Descending - Best = Rank 1)',
            'roi_shrunk': '3. ROI_shrunk Leaderboard (Ascending - Best = Rank 1)',
            'pnl_shrunk': '4. PNL_shrunk Leaderboard (Ascending - Best = Rank 1)',
            'score_win_rate': '5. Win Rate Score Leaderboard (Descending - Best = Rank 1)',
            'score_roi': '6. ROI Score Leaderboard (Descending - Best = Rank 1)',
            'score_pnl': '7. PNL Score Leaderboard (Descending - Best = Rank 1)',
            'score_risk': '8. Risk Score Leaderboard (Descending - Best = Rank 1)',
            'final_score': '9. Final Score Leaderboard (Descending - Best = Rank 1)'
        };
        return titles[type];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6">
                <ErrorMessage message={error} onRetry={loadData} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6">
                <ErrorMessage message="No data available" onRetry={loadData} />
            </div>
        );
    }

    const currentLeaderboard = getCurrentLeaderboard();

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6">
            <div className="max-w-[95%] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-yellow-400 mb-2 border-b-2 border-yellow-400 pb-2">
                        📊 All Leaderboards & Percentile Information
                    </h1>
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
                            <h2 className="text-2xl font-bold text-purple-400">📊 Percentile Anchors (for Normalization)</h2>
                            <button
                                onClick={() => setShowPercentiles(false)}
                                className="text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-700 hover:bg-slate-600"
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
                        className="mb-4 text-purple-400 hover:text-purple-300 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
                    >
                        Show Percentile Information
                    </button>
                )}

                {/* Median Information */}
                <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
                    <h3 className="text-lg font-bold text-green-400 mb-3">📊 Median Values (used in Shrinkage)</h3>
                    <p className="text-slate-400 text-sm mb-3">
                        These medians are calculated from traders with ≥5 trades and used in the shrinkage formulas.
                    </p>
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
                        {(['w_shrunk', 'roi_raw', 'roi_shrunk', 'pnl_shrunk', 'score_win_rate', 'score_roi', 'score_pnl', 'score_risk', 'final_score'] as LeaderboardType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded transition-colors ${
                                    activeTab === tab
                                        ? tab === 'final_score'
                                            ? 'bg-yellow-600 text-white font-bold'
                                            : 'bg-purple-600 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                            >
                                {tab === 'w_shrunk' && 'W_shrunk'}
                                {tab === 'roi_raw' && 'ROI Raw'}
                                {tab === 'roi_shrunk' && 'ROI_shrunk'}
                                {tab === 'pnl_shrunk' && 'PNL_shrunk'}
                                {tab === 'score_win_rate' && 'Win Rate Score'}
                                {tab === 'score_roi' && 'ROI Score'}
                                {tab === 'score_pnl' && 'PnL Score'}
                                {tab === 'score_risk' && 'Risk Score'}
                                {tab === 'final_score' && 'Final Score'}
                            </button>
                        ))}
                    </div>

                    {/* Current Leaderboard Table */}
                    <div className="overflow-x-auto">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">{getLeaderboardTitle(activeTab)}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-full">
                                <thead>
                                    <tr className="bg-slate-900">
                                        <th className="border border-slate-700 px-3 py-2 text-left text-sm">Rank</th>
                                        <th className="border border-slate-700 px-3 py-2 text-left text-sm">Wallet</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">Total PnL</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">ROI</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">Win Rate</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">Trades</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">W_shrunk</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">ROI_shrunk</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">PNL_shrunk</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">W_Score</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">ROI_Score</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">PNL_Score</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">Risk_Score</th>
                                        <th className="border border-slate-700 px-3 py-2 text-right text-sm">Final_Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentLeaderboard.length > 0 ? (
                                        currentLeaderboard.map((entry, index) => (
                                            <tr 
                                                key={entry.wallet_address || index} 
                                                className="hover:bg-slate-700 transition-colors"
                                            >
                                                <td className="border border-slate-700 px-3 py-2 text-green-400 font-bold">
                                                    #{entry.rank || index + 1}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 font-mono text-xs">
                                                    {entry.name || entry.pseudonym || `${entry.wallet_address?.slice(0, 8)}...${entry.wallet_address?.slice(-6)}`}
                                                </td>
                                                <td className={`border border-slate-700 px-3 py-2 text-right text-sm ${entry.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatCurrency(entry.total_pnl)}
                                                </td>
                                                <td className={`border border-slate-700 px-3 py-2 text-right text-sm ${entry.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatPercent(entry.roi)}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm">
                                                    {formatPercent(entry.win_rate)}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm">
                                                    {entry.total_trades}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-xs font-mono">
                                                    {entry.W_shrunk !== undefined && entry.W_shrunk !== null ? entry.W_shrunk.toFixed(6) : 'N/A'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-xs font-mono">
                                                    {entry.roi_shrunk !== undefined && entry.roi_shrunk !== null ? entry.roi_shrunk.toFixed(6) : 'N/A'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-xs font-mono">
                                                    {entry.pnl_shrunk !== undefined && entry.pnl_shrunk !== null ? entry.pnl_shrunk.toFixed(6) : 'N/A'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm">
                                                    {entry.score_win_rate?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm">
                                                    {entry.score_roi?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm">
                                                    {entry.score_pnl?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm">
                                                    {entry.score_risk?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className="border border-slate-700 px-3 py-2 text-right text-sm font-bold text-yellow-400">
                                                    {entry.final_score?.toFixed(2) || '0.00'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={14} className="border border-slate-700 px-4 py-8 text-center text-slate-400">
                                                No data available for this leaderboard
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaderboardViewAll;



