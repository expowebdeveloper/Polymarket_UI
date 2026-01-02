import React, { useState, useEffect } from 'react';
import { fetchLiveLeaderboard, fetchBiggestWinners, fetchDailyVolumeLeaderboard, fetchMonthlyVolumeLeaderboard } from '../services/api';
import type { LeaderboardResponse, LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Trophy, TrendingUp, Copy, Check, RefreshCw, Database } from 'lucide-react';
import '../styles/LiveLeaderboard.css';

type TimePeriod = 'day' | 'week' | 'month' | 'all';
type OrderBy = 'PNL' | 'VOL';
type ViewType = 'leaderboard' | 'biggest_winners' | 'daily_volume' | 'monthly_volume';

export const LiveLeaderboard: React.FC = () => {
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
    const [orderBy, setOrderBy] = useState<OrderBy>('PNL');
    const [viewType, setViewType] = useState<ViewType>('leaderboard');
    const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);

    useEffect(() => {
        loadData();
    }, [timePeriod, orderBy, viewType, currentPage]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            let result: LeaderboardResponse;
            if (viewType === 'biggest_winners') {
                result = await fetchBiggestWinners(timePeriod, 20, 0);
            } else if (viewType === 'daily_volume') {
                const offset = (currentPage - 1) * itemsPerPage;
                result = await fetchDailyVolumeLeaderboard(itemsPerPage, offset, orderBy);
            } else if (viewType === 'monthly_volume') {
                const offset = (currentPage - 1) * itemsPerPage;
                result = await fetchMonthlyVolumeLeaderboard(itemsPerPage, offset, orderBy);
            } else {
                result = await fetchLiveLeaderboard(timePeriod, orderBy, 20, 0);
            }
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load live leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
        if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(2)}K`;
        return `$${val.toFixed(2)}`;
    };

    const copyWallet = (wallet: string) => {
        navigator.clipboard.writeText(wallet);
        setCopiedWallet(wallet);
        setTimeout(() => setCopiedWallet(null), 2000);
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return null;
    };

    return (
        <div className="live-leaderboard-container">
            <div className="leaderboard-header">
                <h1 className="leaderboard-title">Live Leaderboard</h1>
                <p className="leaderboard-subtitle">
                    Real-time leaderboard data from Polymarket API
                </p>
            </div>

            {/* Tabs */}
            <div className="leaderboard-tabs">
                <button
                    className={`tab-btn ${viewType === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => {
                        setViewType('leaderboard');
                        setCurrentPage(1);
                    }}
                >
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                </button>
                <button
                    className={`tab-btn ${viewType === 'biggest_winners' ? 'active' : ''}`}
                    onClick={() => {
                        setViewType('biggest_winners');
                        setCurrentPage(1);
                    }}
                >
                    <TrendingUp className="w-4 h-4" />
                    Biggest Winners
                </button>
                <button
                    className={`tab-btn ${viewType === 'daily_volume' ? 'active' : ''}`}
                    onClick={() => {
                        setViewType('daily_volume');
                        setTimePeriod('day');
                        setCurrentPage(1);
                    }}
                >
                    <Database className="w-4 h-4" />
                    Daily Volume (DB)
                </button>
                <button
                    className={`tab-btn ${viewType === 'monthly_volume' ? 'active' : ''}`}
                    onClick={() => {
                        setViewType('monthly_volume');
                        setTimePeriod('month');
                        setCurrentPage(1);
                    }}
                >
                    <Database className="w-4 h-4" />
                    Monthly Volume (DB)
                </button>
            </div>

            {/* Filters */}
            <div className="filters-container">
                {viewType !== 'daily_volume' && viewType !== 'monthly_volume' && (
                    <div className="filter-group">
                        <label>Time Period:</label>
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                            className="filter-select"
                        >
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                )}
                {(viewType === 'leaderboard' || viewType === 'daily_volume' || viewType === 'monthly_volume') && (
                    <div className="filter-group">
                        <label>Order By:</label>
                        <select
                            value={orderBy}
                            onChange={(e) => setOrderBy(e.target.value as OrderBy)}
                            className="filter-select"
                        >
                            <option value="PNL">PnL</option>
                            <option value="VOL">Volume</option>
                        </select>
                    </div>
                )}
                <button
                    onClick={loadData}
                    className="refresh-btn"
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Leaderboard Table */}
            <div className="leaderboard-table-container">
                {loading ? (
                    <LoadingSpinner message="Loading live leaderboard..." />
                ) : error ? (
                    <ErrorMessage message={error} onRetry={loadData} />
                ) : !data || data.entries.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        No data available
                    </div>
                ) : (
                    <>
                        <div className="table-header">
                            <h3>
                                {viewType === 'biggest_winners'
                                    ? 'Biggest Winners'
                                    : viewType === 'daily_volume'
                                        ? `Daily ${orderBy === 'PNL' ? 'PnL' : 'Volume'} Leaderboard (DB)`
                                        : viewType === 'monthly_volume'
                                            ? `Monthly ${orderBy === 'PNL' ? 'PnL' : 'Volume'} Leaderboard (DB)`
                                            : `${orderBy === 'PNL' ? 'PnL' : 'Volume'} Leaderboard`}
                            </h3>
                            <span className="period-badge">{(data?.period || timePeriod).toUpperCase()}</span>
                        </div>
                        <table className="live-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Trader</th>
                                    <th>Wallet Address</th>
                                    {viewType === 'biggest_winners' ? (
                                        <>
                                            <th>PnL</th>
                                            <th>Initial Value</th>
                                            <th>Final Value</th>
                                        </>
                                    ) : (viewType === 'daily_volume' || viewType === 'monthly_volume') ? (
                                        <>
                                            <th
                                                onClick={() => setOrderBy('VOL')}
                                                style={{ cursor: 'pointer', color: orderBy === 'VOL' ? '#60a5fa' : 'inherit' }}
                                                className="sortable-header"
                                            >
                                                Volume {orderBy === 'VOL' && '↓'}
                                            </th>
                                            <th
                                                onClick={() => setOrderBy('PNL')}
                                                style={{ cursor: 'pointer', color: orderBy === 'PNL' ? '#60a5fa' : 'inherit' }}
                                                className="sortable-header"
                                            >
                                                PnL {orderBy === 'PNL' && '↓'}
                                            </th>
                                        </>
                                    ) : (
                                        <>
                                            <th>{orderBy === 'PNL' ? 'PnL' : 'Volume'}</th>
                                            {orderBy === 'PNL' && <th>Volume</th>}
                                            {orderBy === 'VOL' && <th>PnL</th>}
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.entries.map((entry: LeaderboardEntry) => (
                                    <tr key={entry.wallet_address}>
                                        <td className="rank-cell">
                                            <div className="rank-container">
                                                {getRankIcon(entry.rank)}
                                                <span>{entry.rank}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="trader-info">
                                                {entry.profile_image ? (
                                                    <img
                                                        src={entry.profile_image}
                                                        alt={entry.name || entry.pseudonym || 'Trader'}
                                                        className="profile-image"
                                                    />
                                                ) : (
                                                    <div className="profile-placeholder">
                                                        {(entry.name || entry.pseudonym || entry.wallet_address).charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="trader-name">
                                                        {entry.name || entry.pseudonym || 'Anonymous'}
                                                    </div>
                                                    {entry.pseudonym && entry.name && (
                                                        <div className="trader-pseudonym">
                                                            @{entry.pseudonym}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="wallet-cell">
                                            <div className="wallet-container">
                                                <span>{entry.wallet_address}</span>
                                                <button
                                                    onClick={() => copyWallet(entry.wallet_address)}
                                                    className="copy-btn"
                                                    title="Copy wallet address"
                                                >
                                                    {copiedWallet === entry.wallet_address ? (
                                                        <Check className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        {viewType === 'biggest_winners' ? (
                                            <>
                                                <td className={`metric-cell ${entry.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                                                    {formatCurrency(entry.total_pnl)}
                                                </td>
                                                <td className="metric-cell">
                                                    {formatCurrency(entry.total_stakes || 0)}
                                                </td>
                                                <td className="metric-cell">
                                                    {formatCurrency((entry.total_stakes || 0) + entry.total_pnl)}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className={`metric-cell ${orderBy === 'PNL' ? (entry.total_pnl >= 0 ? 'positive' : 'negative') : ''}`}>
                                                    {orderBy === 'PNL'
                                                        ? formatCurrency(entry.total_pnl)
                                                        : formatCurrency(entry.total_stakes || 0)}
                                                </td>
                                                {orderBy === 'PNL' && (
                                                    <td className="metric-cell">
                                                        {formatCurrency(entry.total_stakes || 0)}
                                                    </td>
                                                )}
                                                {orderBy === 'VOL' && (
                                                    <td className={`metric-cell ${entry.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                                                        {formatCurrency(entry.total_pnl)}
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(viewType === 'daily_volume' || viewType === 'monthly_volume') && data.entries.length === itemsPerPage && (
                            <div className="pagination-container" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={() => {
                                        if (currentPage > 1) {
                                            setCurrentPage(currentPage - 1);
                                        }
                                    }}
                                    disabled={currentPage === 1 || loading}
                                    className="pagination-btn"
                                    style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #334155', background: currentPage === 1 ? '#1e293b' : '#0f172a', color: '#e2e8f0', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                >
                                    Previous
                                </button>
                                <span style={{ color: '#94a3b8' }}>Page {currentPage}</span>
                                <button
                                    onClick={() => {
                                        setCurrentPage(currentPage + 1);
                                    }}
                                    disabled={loading}
                                    className="pagination-btn"
                                    style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', cursor: 'pointer' }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveLeaderboard;
