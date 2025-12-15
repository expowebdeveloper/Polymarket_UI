import React, { useState, useEffect } from 'react';
import { fetchProfileStats, fetchProfileStatsFromDB } from '../services/api';
import type { ProfileStatsResponse } from '../types/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import '../styles/ProfileStats.css';

interface ProfileStatsProps {
    walletAddress: string;
    username?: string;
    useDatabase?: boolean;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({
    walletAddress,
    username,
    useDatabase = false
}) => {
    const [stats, setStats] = useState<ProfileStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = useDatabase
                    ? await fetchProfileStatsFromDB(walletAddress, username)
                    : await fetchProfileStats(walletAddress, username);
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load profile stats');
            } finally {
                setLoading(false);
            }
        };

        if (walletAddress) {
            loadStats();
        }
    }, [walletAddress, username, useDatabase]);

    if (loading) {
        return (
            <div className="profile-stats-loading">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error} />;
    }

    if (!stats) {
        return null;
    }

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    const formatCurrency = (value: string): string => {
        const num = parseFloat(value);
        if (isNaN(num)) return '$0';

        if (num >= 1000000) {
            return `$${(num / 1000000).toFixed(2)}M`;
        }
        if (num >= 1000) {
            return `$${(num / 1000).toFixed(2)}K`;
        }
        return `$${num.toFixed(2)}`;
    };

    return (
        <div className="profile-stats-container">
            <div className="profile-stats-header">
                <h2 className="profile-stats-title">Profile Statistics</h2>
                {stats.username && (
                    <div className="profile-username">@{stats.username}</div>
                )}
            </div>

            <div className="profile-stats-grid">
                <div className="stat-card stat-card-trades">
                    <div className="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M18 9l-5 5-4-4-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Trades</div>
                        <div className="stat-value">{formatNumber(stats.trades)}</div>
                    </div>
                </div>

                <div className="stat-card stat-card-win">
                    <div className="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Largest Win</div>
                        <div className="stat-value stat-value-currency">{formatCurrency(stats.largestWin)}</div>
                    </div>
                </div>

                <div className="stat-card stat-card-views">
                    <div className="stat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Profile Views</div>
                        <div className="stat-value">{formatNumber(stats.views)}</div>
                    </div>
                </div>

                {stats.joinDate && (
                    <div className="stat-card stat-card-date">
                        <div className="stat-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Member Since</div>
                            <div className="stat-value stat-value-date">{stats.joinDate}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="profile-stats-footer">
                <div className="wallet-address">
                    <span className="wallet-label">Wallet:</span>
                    <span className="wallet-value">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
            </div>
        </div>
    );
};

export default ProfileStats;
