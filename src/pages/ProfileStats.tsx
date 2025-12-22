import React, { useState, useEffect } from 'react';
import { fetchEnhancedProfileStats, fetchTopTraders } from '../services/api';
import type { EnhancedProfileStatsResponse } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import '../styles/ProfileStats.css';

const ProfileStats: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'wallet' | 'username'>('wallet');
    const [stats, setStats] = useState<EnhancedProfileStatsResponse | null>(null);
    const [topTraders, setTopTraders] = useState<EnhancedProfileStatsResponse[]>([]);
    const [rank1Trader, setRank1Trader] = useState<EnhancedProfileStatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    // Load top traders and rank 1 on mount
    useEffect(() => {
        loadTopTraders();
    }, []);

    const loadTopTraders = async () => {
        try {
            setLoading(true);
            setError(null);
            const traders = await fetchTopTraders(3);
            if (traders && traders.length > 0) {
                setTopTraders(traders);
                // Rank 1 is the first one
                setRank1Trader(traders[0]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load top traders');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a search query');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            let result: EnhancedProfileStatsResponse;
            if (searchType === 'wallet') {
                result = await fetchEnhancedProfileStats(searchQuery.trim(), undefined, undefined);
            } else {
                result = await fetchEnhancedProfileStats(undefined, searchQuery.trim(), undefined);
            }
            
            setStats(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile stats');
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleCardExpansion = (wallet: string) => {
        const newExpanded = new Set(expandedCards);
        if (newExpanded.has(wallet)) {
            newExpanded.delete(wallet);
        } else {
            newExpanded.add(wallet);
        }
        setExpandedCards(newExpanded);
    };

    const formatCurrency = (value: number): string => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(2)}K`;
        }
        return `$${value.toFixed(2)}`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const TraderCard: React.FC<{ trader: EnhancedProfileStatsResponse; isPreview?: boolean }> = ({ trader, isPreview = false }) => {
        const isExpanded = expandedCards.has(trader.proxyAddress);
        const displayName = trader.pseudonym || trader.name || trader.username || 'Unknown';
        
        return (
            <div className={`trader-card ${isPreview ? 'preview-card' : ''}`}>
                <div className="trader-card-header">
                    <div className="trader-info">
                        {trader.profileImage && (
                            <img src={trader.profileImage} alt={displayName} className="trader-avatar" />
                        )}
                        <div>
                            <h3 className="trader-name">{displayName}</h3>
                            {trader.rank && (
                                <span className="rank-badge">Rank #{trader.rank}</span>
                            )}
                        </div>
                    </div>
                    {trader.username && (
                        <div className="trader-username">@{trader.username}</div>
                    )}
                </div>

                <div className="highlighted-metrics">
                    <div className="metric-row">
                        <div className="metric-item">
                            <span className="metric-label">Final Score</span>
                            <span className="metric-value score-value">{trader.finalScore.toFixed(1)}</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Top %</span>
                            <span className="metric-value">{trader.topPercent.toFixed(2)}%</span>
                        </div>
                    </div>
                    <div className="metric-row">
                        <div className="metric-item">
                            <span className="metric-label">Ranking</span>
                            <span className="metric-value tag-value">{trader.rankingTag}</span>
                        </div>
                    </div>
                    <div className="metric-row">
                        <div className="metric-item">
                            <span className="metric-label">Longest Streak</span>
                            <span className="metric-value">{trader.longestWinningStreak}</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Current Streak</span>
                            <span className="metric-value">{trader.currentWinningStreak}</span>
                        </div>
                    </div>
                </div>

                <button
                    className="view-details-btn"
                    onClick={() => toggleCardExpansion(trader.proxyAddress)}
                >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={isExpanded ? 'rotated' : ''}
                    >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {isExpanded && (
                    <div className="details-section">
                        <div className="details-grid">
                            <div className="detail-item">
                                <span className="detail-label">Biggest Win</span>
                                <span className="detail-value positive">{formatCurrency(trader.biggestWin)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Worst Loss</span>
                                <span className="detail-value negative">{formatCurrency(trader.worstLoss)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Maximum Stake</span>
                                <span className="detail-value">{formatCurrency(trader.maximumStake)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Portfolio Value</span>
                                <span className="detail-value">{formatCurrency(trader.portfolioValue)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Avg Stake Value</span>
                                <span className="detail-value">{formatCurrency(trader.averageStakeValue)}</span>
                            </div>
                        </div>
                        <div className="additional-info">
                            <div className="info-item">
                                <span>Total Trades:</span>
                                <span>{formatNumber(trader.totalTrades)}</span>
                            </div>
                            <div className="info-item">
                                <span>Total PnL:</span>
                                <span className={trader.totalPnl >= 0 ? 'positive' : 'negative'}>
                                    {formatCurrency(trader.totalPnl)}
                                </span>
                            </div>
                            <div className="info-item">
                                <span>ROI:</span>
                                <span className={trader.roi >= 0 ? 'positive' : 'negative'}>
                                    {trader.roi.toFixed(2)}%
                                </span>
                            </div>
                            <div className="info-item">
                                <span>Win Rate:</span>
                                <span>{trader.winRate.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="wallet-address">
                    <span className="wallet-label">Wallet:</span>
                    <span className="wallet-value">{trader.proxyAddress.slice(0, 6)}...{trader.proxyAddress.slice(-4)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="profile-stats-page">
            <div className="page-header">
                <h1>Profile Stats</h1>
                <p>Search for traders by username or wallet address</p>
            </div>

            <div className="search-section">
                <div className="search-controls">
                    <div className="search-type-toggle">
                        <button
                            className={searchType === 'wallet' ? 'active' : ''}
                            onClick={() => setSearchType('wallet')}
                        >
                            Wallet Address
                        </button>
                        <button
                            className={searchType === 'username' ? 'active' : ''}
                            onClick={() => setSearchType('username')}
                        >
                            Username
                        </button>
                    </div>
                    <div className="search-input-group">
                        <input
                            type="text"
                            className="search-input"
                            placeholder={searchType === 'wallet' ? '0x...' : 'Enter username'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button className="search-button" onClick={handleSearch} disabled={loading}>
                            {loading ? <LoadingSpinner /> : 'Search'}
                        </button>
                    </div>
                </div>
            </div>

            {error && <ErrorMessage message={error} />}

            {loading && !stats && !rank1Trader && (
                <div className="loading-container">
                    <LoadingSpinner />
                </div>
            )}

            {/* Rank 1 Preview Card */}
            {rank1Trader && !stats && (
                <div className="preview-section">
                    <h2 className="section-title">Rank #1 Trader Preview</h2>
                    <TraderCard trader={rank1Trader} isPreview={true} />
                </div>
            )}

            {/* Search Result */}
            {stats && (
                <div className="search-result-section">
                    <h2 className="section-title">Search Result</h2>
                    <TraderCard trader={stats} />
                </div>
            )}

            {/* Top 3 Traders */}
            {topTraders.length > 0 && (
                <div className="top-traders-section">
                    <h2 className="section-title">Top 3 Traders</h2>
                    <div className="traders-grid">
                        {topTraders.map((trader) => (
                            <TraderCard key={trader.proxyAddress} trader={trader} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileStats;



