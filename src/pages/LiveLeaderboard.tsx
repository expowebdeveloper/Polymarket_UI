import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { fetchLiveLeaderboard } from '../services/api';
import type { LeaderboardResponse, LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import '../styles/LiveLeaderboard.css';

const LiveLeaderboard: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'all' | 'roi' | 'pnl' | 'risk'>('all');
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchLiveLeaderboard(activeTab);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
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

    const getTopTraders = () => {
        if (!data?.entries) return [];
        return data.entries.slice(0, 3);
    };

    const renderCharts = () => {
        if (!data?.entries || data.entries.length === 0) return null;

        const chartData = data.entries.slice(0, 10); // Top 10 for charts

        if (activeTab === 'risk') {
            return (
                <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                type="number"
                                dataKey="score_risk"
                                name="Risk Score"
                                domain={[0, 1]}
                                stroke="#94a3b8"
                            />
                            <YAxis
                                type="number"
                                dataKey="roi"
                                name="ROI"
                                unit="%"
                                stroke="#94a3b8"
                            />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                            <Legend />
                            <Scatter name="Traders" data={chartData} fill="#f59e0b" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return (
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="wallet_address" tickFormatter={(val) => val.slice(0, 6)} stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            formatter={(value: number, name: string) => [
                                name === 'total_pnl' ? formatCurrency(value) : formatPercent(value),
                                name === 'total_pnl' ? 'PnL' : 'ROI'
                            ]}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="total_pnl" name="Total PnL" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="roi" name="ROI" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="live-leaderboard-container">
            <div className="leaderboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1 className="leaderboard-title">Live Leaderboard</h1>
                        <p className="leaderboard-subtitle">
                            Real-time ranking of top traders based on proprietary scoring algorithms
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/leaderboard/all')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                    >
                        📊 View All Leaderboards & Percentiles
                    </button>
                </div>
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    marginTop: '1rem'
                }}>
                    <p style={{ margin: 0, color: '#c4b5fd', fontSize: '0.875rem' }}>
                        💡 <strong>Looking for W_shrunk leaderboard and percentile information?</strong> Click the button above to view all leaderboards including W_shrunk, ROI_shrunk, PNL_shrunk, and percentile anchors (1st and 99th percentiles) used in score calculations.
                    </p>
                </div>
            </div>

            <div className="leaderboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    Overall
                </button>
                <button
                    className={`tab-btn tab-roi ${activeTab === 'roi' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roi')}
                >
                    ROI Leaderboard
                </button>
                <button
                    className={`tab-btn tab-pnl ${activeTab === 'pnl' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pnl')}
                >
                    PnL Leaderboard
                </button>
                <button
                    className={`tab-btn tab-risk ${activeTab === 'risk' ? 'active' : ''}`}
                    onClick={() => setActiveTab('risk')}
                >
                    Risk Analysis
                </button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <LoadingSpinner message="Calculating live scores..." />
                </div>
            ) : error ? (
                <ErrorMessage message={error} onRetry={loadData} />
            ) : (
                <>
                    {/* Top 3 Cards */}
                    <div className="top-stats-grid">
                        {getTopTraders().map((trader, index) => (
                            <div key={trader.wallet_address} className="stat-card">
                                <div className={`stat-rank rank-${index + 1}`}>#{index + 1}</div>
                                <div className="stat-wallet">
                                    {trader.name || `${trader.wallet_address.slice(0, 6)}...${trader.wallet_address.slice(-4)}`}
                                </div>
                                <div className="stat-metric-value">
                                    {activeTab === 'roi' ? formatPercent(trader.roi) :
                                        activeTab === 'pnl' ? formatCurrency(trader.total_pnl) :
                                            activeTab === 'risk' ? trader.score_risk?.toFixed(2) :
                                                trader.score_pnl?.toFixed(2)}
                                </div>
                                <div className="stat-metric-label">
                                    {activeTab === 'roi' ? 'ROI' :
                                        activeTab === 'pnl' ? 'Total PnL' :
                                            activeTab === 'risk' ? 'Risk Score' :
                                                'Overall Score'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="charts-section">
                        <h2 className="chart-title">Performance visualization</h2>
                        {renderCharts()}
                    </div>

                    {/* Table */}
                    <div className="leaderboard-table-container">
                        <table className="live-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Trader</th>
                                    <th>Total PnL</th>
                                    <th>ROI</th>
                                    <th>Win Rate</th>
                                    <th>Total Trades</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.entries.map((entry, index) => (
                                    <tr key={entry.wallet_address}>
                                        <td className="rank-cell">#{index + 1}</td>
                                        <td className="wallet-cell">
                                            {entry.name || `${entry.wallet_address.slice(0, 6)}...${entry.wallet_address.slice(-4)}`}
                                        </td>
                                        <td className={`metric-cell ${entry.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                                            {formatCurrency(entry.total_pnl)}
                                        </td>
                                        <td className={`metric-cell ${entry.roi >= 0 ? 'positive' : 'negative'}`}>
                                            {formatPercent(entry.roi)}
                                        </td>
                                        <td className="metric-cell">{formatPercent(entry.win_rate)}</td>
                                        <td className="metric-cell">{entry.total_trades}</td>
                                        <td>
                                            <div className="score-bar-bg">
                                                <div
                                                    className="score-bar-fill"
                                                    style={{
                                                        width: `${(activeTab === 'risk' ? (entry.score_risk || 0) : (entry.score_pnl || 0)) * 100}%`,
                                                        backgroundColor: activeTab === 'risk' ? '#f59e0b' : '#8b5cf6'
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default LiveLeaderboard;
