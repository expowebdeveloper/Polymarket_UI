import React, { useState } from 'react';
import ProfileStats from '../components/ProfileStats';
import '../styles/ProfileStatsDemo.css';

const ProfileStatsDemo: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState('0x17db3fcd93ba12d38382a0cade24b200185c5f6d');
    const [username, setUsername] = useState('fengdubiying');
    const [showStats, setShowStats] = useState(false);

    const handleFetchStats = () => {
        if (walletAddress) {
            setShowStats(true);
        }
    };

    return (
        <div className="profile-stats-demo-container">
            <div className="demo-header">
                <h1 className="demo-title">Profile Stats Dashboard</h1>
                <p className="demo-subtitle">View comprehensive statistics for any Polymarket trader</p>
            </div>

            <div className="demo-controls">
                <div className="input-group">
                    <label htmlFor="wallet-input" className="input-label">
                        Wallet Address
                        <span className="required">*</span>
                    </label>
                    <input
                        id="wallet-input"
                        type="text"
                        className="wallet-input"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x..."
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="username-input" className="input-label">
                        Username
                        <span className="optional">(optional)</span>
                    </label>
                    <input
                        id="username-input"
                        type="text"
                        className="username-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                    />
                </div>

                <button
                    className="fetch-button"
                    onClick={handleFetchStats}
                    disabled={!walletAddress}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Fetch Stats
                </button>
            </div>

            {showStats && (
                <div className="stats-display">
                    <ProfileStats
                        walletAddress={walletAddress}
                        username={username || undefined}
                    />
                </div>
            )}

            <div className="demo-info">
                <div className="info-card">
                    <h3 className="info-title">About Profile Stats</h3>
                    <p className="info-text">
                        This component fetches and displays comprehensive statistics for Polymarket traders, including:
                    </p>
                    <ul className="info-list">
                        <li>Total number of trades executed</li>
                        <li>Largest single win amount</li>
                        <li>Profile view count</li>
                        <li>Account join date</li>
                    </ul>
                </div>

                <div className="info-card">
                    <h3 className="info-title">Data Source</h3>
                    <p className="info-text">
                        Data is always fetched live from the Polymarket API.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileStatsDemo;
