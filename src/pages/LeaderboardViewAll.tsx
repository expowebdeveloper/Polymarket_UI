import React, { useState, useEffect, useMemo } from 'react';
import { fetchViewAllLeaderboards } from '../services/api';
import type { AllLeaderboardsResponse, LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useTheme } from '../contexts/ThemeContext';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Users, Award, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

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
    const { theme } = useTheme();
    const [data, setData] = useState<AllLeaderboardsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<LeaderboardType>('final_score');
    const [showPercentiles, setShowPercentiles] = useState(true);
    const [selectedChart, setSelectedChart] = useState<'distribution' | 'top10' | 'scores' | 'radar'>('distribution');

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
        if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(2)}K`;
        return `$${val.toFixed(2)}`;
    };

    const formatPercent = (val: number) => `${val.toFixed(2)}%`;

    const getCurrentLeaderboard = (): LeaderboardEntry[] => {
        if (!data?.leaderboards) return [];
        return data.leaderboards[activeTab] || [];
    };

    const getLeaderboardTitle = (type: LeaderboardType): string => {
        const titles: Record<LeaderboardType, string> = {
            'w_shrunk': 'W_shrunk Leaderboard (Ascending - Best = Rank 1)',
            'roi_raw': 'ROI Raw Leaderboard (Descending - Best = Rank 1)',
            'roi_shrunk': 'ROI_shrunk Leaderboard (Ascending - Best = Rank 1)',
            'pnl_shrunk': 'PNL_shrunk Leaderboard (Ascending - Best = Rank 1)',
            'score_win_rate': 'Win Rate Score Leaderboard (Descending - Best = Rank 1)',
            'score_roi': 'ROI Score Leaderboard (Descending - Best = Rank 1)',
            'score_pnl': 'PNL Score Leaderboard (Descending - Best = Rank 1)',
            'score_risk': 'Risk Score Leaderboard (Descending - Best = Rank 1)',
            'final_score': 'Final Score Leaderboard (Descending - Best = Rank 1)'
        };
        return titles[type];
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        const currentLeaderboard = getCurrentLeaderboard();
        if (!currentLeaderboard || currentLeaderboard.length === 0) return null;

        // Top 10 for bar chart
        const top10 = currentLeaderboard.slice(0, 10).map((entry, idx) => ({
            rank: idx + 1,
            name: entry.name || entry.pseudonym || `${entry.wallet_address?.slice(0, 6)}...${entry.wallet_address?.slice(-4)}`,
            finalScore: entry.final_score || 0,
            roi: entry.roi || 0,
            pnl: entry.total_pnl || 0,
            winRate: entry.win_rate || 0,
        }));

        // Score distribution (bins)
        const distribution = [
            { range: '0-10', count: 0 },
            { range: '10-20', count: 0 },
            { range: '20-30', count: 0 },
            { range: '30-40', count: 0 },
            { range: '40-50', count: 0 },
            { range: '50-60', count: 0 },
            { range: '60-70', count: 0 },
            { range: '70-80', count: 0 },
            { range: '80-90', count: 0 },
            { range: '90-100', count: 0 },
        ];

        currentLeaderboard.forEach(entry => {
            const score = entry.final_score || 0;
            if (score >= 0 && score < 10) distribution[0].count++;
            else if (score >= 10 && score < 20) distribution[1].count++;
            else if (score >= 20 && score < 30) distribution[2].count++;
            else if (score >= 30 && score < 40) distribution[3].count++;
            else if (score >= 40 && score < 50) distribution[4].count++;
            else if (score >= 50 && score < 60) distribution[5].count++;
            else if (score >= 60 && score < 70) distribution[6].count++;
            else if (score >= 70 && score < 80) distribution[7].count++;
            else if (score >= 80 && score < 90) distribution[8].count++;
            else if (score >= 90 && score <= 100) distribution[9].count++;
        });

        // Score comparison for top 10
        const scoreComparison = top10.map(entry => ({
            name: entry.name,
            winRate: entry.winRate,
            roi: Math.min(entry.roi, 100), // Cap at 100 for visualization
            pnl: Math.min(Math.max(entry.pnl / 1000, -50), 50), // Normalize PnL
            finalScore: entry.finalScore,
        }));

        // Radar chart data for top trader
        const topTrader = currentLeaderboard[0];
        const radarData = topTrader ? [
            { metric: 'Win Rate', value: (topTrader.win_rate || 0) / 100 },
            { metric: 'ROI', value: Math.min((topTrader.roi || 0) / 100, 1) },
            { metric: 'PnL Score', value: topTrader.score_pnl || 0 },
            { metric: 'ROI Score', value: topTrader.score_roi || 0 },
            { metric: 'Risk Score', value: topTrader.score_risk || 0 },
            { metric: 'Final Score', value: (topTrader.final_score || 0) / 100 },
        ] : [];

        return {
            top10,
            distribution,
            scoreComparison,
            radarData,
        };
    }, [data, activeTab]);

    const textColor = theme === 'dark' ? '#cbd5e1' : '#475569';
    const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
    const bgColor = theme === 'dark' ? '#1e293b' : '#ffffff';
    const cardBg = theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50';
    const borderColor = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
    const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';

    const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

    if (loading) {
        return <LoadingSpinner message="Loading leaderboards..." />;
    }

    if (error) {
        return (
            <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} ${textPrimary} p-6`}>
                <ErrorMessage message={error} onRetry={loadData} />
            </div>
        );
    }

    if (!data) {
        return (
            <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} ${textPrimary} p-6`}>
                <ErrorMessage message="No data available" onRetry={loadData} />
            </div>
        );
    }

    const currentLeaderboard = getCurrentLeaderboard();

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} ${textPrimary} p-6`}>
            <div className="max-w-[95%] mx-auto space-y-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} mb-2 border-b-2 ${theme === 'dark' ? 'border-yellow-400' : 'border-yellow-600'} pb-2 flex items-center gap-3`}>
                        <Trophy className="w-10 h-10" />
                        All Leaderboards & Analytics
                    </h1>
                    <p className={`${textSecondary} mt-2`}>
                        Comprehensive leaderboard analysis with percentile information and performance metrics
                    </p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
                        <div className={`${textSecondary} text-sm mb-1 flex items-center gap-2`}>
                            <Users className="w-4 h-4" />
                            Total Traders
                        </div>
                        <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            {data.total_traders.toLocaleString()}
                        </div>
                    </div>
                    <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
                        <div className={`${textSecondary} text-sm mb-1 flex items-center gap-2`}>
                            <Award className="w-4 h-4" />
                            Population (≥5 trades)
                        </div>
                        <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            {data.population_traders.toLocaleString()}
                        </div>
                        <div className={`text-xs ${textSecondary} mt-1`}>Used for percentile calculations</div>
                    </div>
                    <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
                        <div className={`${textSecondary} text-sm mb-1 flex items-center gap-2`}>
                            <TrendingUp className="w-4 h-4" />
                            ROI Median
                        </div>
                        <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            {formatPercent(data.medians.roi_median)}
                        </div>
                    </div>
                    <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
                        <div className={`${textSecondary} text-sm mb-1 flex items-center gap-2`}>
                            <BarChart3 className="w-4 h-4" />
                            PnL Median
                        </div>
                        <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                            {formatCurrency(data.medians.pnl_median)}
                        </div>
                    </div>
                </div>

                {/* Percentile Information */}
                {showPercentiles && (
                    <div className={`${cardBg} rounded-lg p-6 border ${borderColor}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                                📊 Percentile Anchors (for Normalization)
                            </h2>
                            <button
                                onClick={() => setShowPercentiles(false)}
                                className={`${textSecondary} hover:${textPrimary} px-3 py-1 rounded ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                            >
                                Hide
                            </button>
                        </div>
                        <p className={`${textSecondary} text-sm mb-4`}>
                            These values are calculated from traders with ≥5 trades and used to normalize scores to 0-1 range.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded p-4 border ${borderColor}`}>
                                <div className={`${textSecondary} text-sm mb-2`}>W_shrunk Percentiles</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className={textSecondary}>1st:</span>
                                        <span className={`${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                                            {data.percentiles.w_shrunk_1_percent.toFixed(6)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={textSecondary}>99th:</span>
                                        <span className={`${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                                            {data.percentiles.w_shrunk_99_percent.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded p-4 border ${borderColor}`}>
                                <div className={`${textSecondary} text-sm mb-2`}>ROI_shrunk Percentiles</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className={textSecondary}>1st:</span>
                                        <span className={`${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                                            {data.percentiles.roi_shrunk_1_percent.toFixed(6)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={textSecondary}>99th:</span>
                                        <span className={`${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                                            {data.percentiles.roi_shrunk_99_percent.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded p-4 border ${borderColor}`}>
                                <div className={`${textSecondary} text-sm mb-2`}>PNL_shrunk Percentiles</div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className={textSecondary}>1st:</span>
                                        <span className={`${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                                            {data.percentiles.pnl_shrunk_1_percent.toFixed(6)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className={textSecondary}>99th:</span>
                                        <span className={`${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} font-mono`}>
                                            {data.percentiles.pnl_shrunk_99_percent.toFixed(6)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!showPercentiles && (
                    <button
                        onClick={() => setShowPercentiles(true)}
                        className={`${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'} px-4 py-2 rounded ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} border ${borderColor}`}
                    >
                        Show Percentile Information
                    </button>
                )}

                {/* Charts Section */}
                {chartData && currentLeaderboard.length > 0 && (
                    <div className={`${cardBg} rounded-lg p-6 border ${borderColor}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                📈 Performance Analytics
                            </h2>
                            <div className="flex gap-2">
                                {(['distribution', 'top10', 'scores', 'radar'] as const).map((chartType) => (
                                    <button
                                        key={chartType}
                                        onClick={() => setSelectedChart(chartType)}
                                        className={`px-4 py-2 rounded text-sm font-medium transition ${
                                            selectedChart === chartType
                                                ? `${theme === 'dark' ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'}`
                                                : `${theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`
                                        }`}
                                    >
                                        {chartType === 'distribution' && 'Distribution'}
                                        {chartType === 'top10' && 'Top 10'}
                                        {chartType === 'scores' && 'Scores'}
                                        {chartType === 'radar' && 'Radar'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Distribution Chart */}
                        {selectedChart === 'distribution' && (
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.distribution}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                        <XAxis dataKey="range" stroke={textColor} tick={{ fill: textColor }} />
                                        <YAxis stroke={textColor} tick={{ fill: textColor }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: bgColor,
                                                border: `1px solid ${gridColor}`,
                                                borderRadius: '8px',
                                                color: textColor,
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Top 10 Bar Chart */}
                        {selectedChart === 'top10' && (
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.top10} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                        <XAxis type="number" stroke={textColor} tick={{ fill: textColor }} />
                                        <YAxis dataKey="name" type="category" width={120} stroke={textColor} tick={{ fill: textColor }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: bgColor,
                                                border: `1px solid ${gridColor}`,
                                                borderRadius: '8px',
                                                color: textColor,
                                            }}
                                            formatter={(value: number) => value.toFixed(2)}
                                        />
                                        <Bar dataKey="finalScore" fill="#10b981" radius={[0, 8, 8, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Score Comparison Line Chart */}
                        {selectedChart === 'scores' && (
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.scoreComparison}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                        <XAxis dataKey="name" stroke={textColor} tick={{ fill: textColor }} angle={-45} textAnchor="end" height={100} />
                                        <YAxis stroke={textColor} tick={{ fill: textColor }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: bgColor,
                                                border: `1px solid ${gridColor}`,
                                                borderRadius: '8px',
                                                color: textColor,
                                            }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="winRate" stroke="#3b82f6" strokeWidth={2} name="Win Rate %" />
                                        <Line type="monotone" dataKey="roi" stroke="#8b5cf6" strokeWidth={2} name="ROI %" />
                                        <Line type="monotone" dataKey="finalScore" stroke="#10b981" strokeWidth={2} name="Final Score" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Radar Chart */}
                        {selectedChart === 'radar' && chartData.radarData.length > 0 && (
                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={chartData.radarData}>
                                        <PolarGrid stroke={gridColor} />
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: textColor }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fill: textColor }} />
                                        <Radar
                                            name="Top Trader"
                                            dataKey="value"
                                            stroke="#10b981"
                                            fill="#10b981"
                                            fillOpacity={0.6}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: bgColor,
                                                border: `1px solid ${gridColor}`,
                                                borderRadius: '8px',
                                                color: textColor,
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                        </div>
                        )}
                    </div>
                )}

                {/* Leaderboard Tabs */}
                <div className={`${cardBg} rounded-lg p-4 border ${borderColor}`}>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(['w_shrunk', 'roi_raw', 'roi_shrunk', 'pnl_shrunk', 'score_win_rate', 'score_roi', 'score_pnl', 'score_risk', 'final_score'] as LeaderboardType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded transition-colors text-sm font-medium ${
                                    activeTab === tab
                                        ? tab === 'final_score'
                                            ? `${theme === 'dark' ? 'bg-yellow-600' : 'bg-yellow-500'} text-white font-bold`
                                            : `${theme === 'dark' ? 'bg-purple-600' : 'bg-purple-500'} text-white`
                                        : `${theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`
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
                        <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                            {getLeaderboardTitle(activeTab)}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-full">
                                <thead>
                                    <tr className={theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}>
                                        <th className={`border ${borderColor} px-3 py-2 text-left text-sm ${textPrimary}`}>Rank</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-left text-sm ${textPrimary}`}>Wallet</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>Total PnL</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>ROI</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>Win Rate</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>Trades</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>W_shrunk</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>ROI_shrunk</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>PNL_shrunk</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>W_Score</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>ROI_Score</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>PNL_Score</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>Risk_Score</th>
                                        <th className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>Final_Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentLeaderboard.length > 0 ? (
                                        currentLeaderboard.map((entry, index) => (
                                            <tr 
                                                key={entry.wallet_address || index} 
                                                className={`${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} transition-colors`}
                                            >
                                                <td className={`border ${borderColor} px-3 py-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'} font-bold`}>
                                                    #{entry.rank || index + 1}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 font-mono text-xs ${textPrimary}`}>
                                                    {entry.name || entry.pseudonym || `${entry.wallet_address?.slice(0, 8)}...${entry.wallet_address?.slice(-6)}`}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${entry.total_pnl >= 0 ? (theme === 'dark' ? 'text-green-400' : 'text-green-600') : (theme === 'dark' ? 'text-red-400' : 'text-red-600')}`}>
                                                    {formatCurrency(entry.total_pnl)}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${entry.roi >= 0 ? (theme === 'dark' ? 'text-green-400' : 'text-green-600') : (theme === 'dark' ? 'text-red-400' : 'text-red-600')}`}>
                                                    {formatPercent(entry.roi)}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>
                                                    {formatPercent(entry.win_rate)}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>
                                                    {entry.total_trades}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-xs font-mono ${textPrimary}`}>
                                                    {entry.W_shrunk !== undefined && entry.W_shrunk !== null ? entry.W_shrunk.toFixed(6) : 'N/A'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-xs font-mono ${textPrimary}`}>
                                                    {entry.roi_shrunk !== undefined && entry.roi_shrunk !== null ? entry.roi_shrunk.toFixed(6) : 'N/A'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-xs font-mono ${textPrimary}`}>
                                                    {entry.pnl_shrunk !== undefined && entry.pnl_shrunk !== null ? entry.pnl_shrunk.toFixed(6) : 'N/A'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>
                                                    {entry.score_win_rate?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>
                                                    {entry.score_roi?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>
                                                    {entry.score_pnl?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm ${textPrimary}`}>
                                                    {entry.score_risk?.toFixed(4) || '0.0000'}
                                                </td>
                                                <td className={`border ${borderColor} px-3 py-2 text-right text-sm font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                                                    {entry.final_score?.toFixed(2) || '0.00'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={14} className={`border ${borderColor} px-4 py-8 text-center ${textSecondary}`}>
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
