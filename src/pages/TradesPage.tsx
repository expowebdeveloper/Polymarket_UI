import React, { useState } from 'react';
import { fetchTrades, fetchTradesFromDB } from '../services/api';
import type { Trade, TradesResponse } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import '../styles/TradesPage.css';

const TradesPage: React.FC = () => {
    const [walletAddress, setWalletAddress] = useState('0xdbade4c82fb72780a0db9a38f821d8671aba9c95');
    const [tradesData, setTradesData] = useState<TradesResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useDatabase, setUseDatabase] = useState(false);
    const [sideFilter, setSideFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const handleFetchTrades = async () => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            const data = useDatabase
                ? await fetchTradesFromDB(walletAddress, sideFilter === 'ALL' ? undefined : sideFilter)
                : await fetchTrades(walletAddress);
            setTradesData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load trades');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const formatNumber = (num: string | number): string => {
        const value = typeof num === 'string' ? parseFloat(num) : num;
        if (isNaN(value)) return '0';

        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(2)}M`;
        }
        if (value >= 1000) {
            return `${(value / 1000).toFixed(2)}K`;
        }
        return value.toFixed(2);
    };

    const formatPrice = (price: string): string => {
        const value = parseFloat(price);
        if (isNaN(value)) return '$0.00';
        return `$${value.toFixed(3)}`;
    };

    const filteredTrades = tradesData?.trades.filter(trade => {
        const matchesSide = sideFilter === 'ALL' || trade.side === sideFilter;
        const matchesSearch = !searchTerm ||
            trade.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trade.outcome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trade.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSide && matchesSearch;
    }) || [];

    return (
        <div className="trades-page-container">
            <div className="trades-header">
                <h1 className="trades-title">Trading History</h1>
                <p className="trades-subtitle">View and analyze all trades for any wallet address</p>
            </div>

            <div className="trades-controls">
                <div className="control-row">
                    <div className="input-group-trades">
                        <label htmlFor="wallet-input-trades" className="input-label-trades">
                            Wallet Address
                            <span className="required">*</span>
                        </label>
                        <input
                            id="wallet-input-trades"
                            type="text"
                            className="wallet-input-trades"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            placeholder="0x..."
                        />

                    </div>
                    <div className="toggle-group-trades">
                        <label className="toggle-label-trades">
                            <input
                                type="checkbox"
                                checked={useDatabase}
                                onChange={(e) => setUseDatabase(e.target.checked)}
                                className="toggle-checkbox-trades"
                            />
                            <span className="toggle-slider-trades"></span>
                            <span className="toggle-text-trades">Use Database Cache</span>
                        </label>
                    </div>

                    <button
                        className="fetch-button-trades"
                        onClick={handleFetchTrades}
                        disabled={!walletAddress || loading}
                    >
                        {loading ? 'Loading...' : 'Fetch Trades'}
                    </button>
                </div>

                {tradesData && (
                    <div className="filter-row">
                        <div className="search-box">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by title, outcome, or trader..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${sideFilter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setSideFilter('ALL')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-btn filter-btn-buy ${sideFilter === 'BUY' ? 'active' : ''}`}
                                onClick={() => setSideFilter('BUY')}
                            >
                                Buy
                            </button>
                            <button
                                className={`filter-btn filter-btn-sell ${sideFilter === 'SELL' ? 'active' : ''}`}
                                onClick={() => setSideFilter('SELL')}
                            >
                                Sell
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {loading && (
                <div className="trades-loading">
                    <LoadingSpinner message="Fetching trades..." />
                </div>
            )}

            {error && <ErrorMessage message={error} />}

            {tradesData && !loading && (
                <div className="trades-results">
                    <div className="results-header">
                        <div className="results-info">
                            <span className="results-count">{filteredTrades.length}</span>
                            <span className="results-label">trades found</span>
                        </div>
                        <div className="wallet-display">
                            <span className="wallet-label">Wallet:</span>
                            <span className="wallet-value">{tradesData.wallet_address.slice(0, 6)}...{tradesData.wallet_address.slice(-4)}</span>
                        </div>
                    </div>

                    <div className="trades-table-container">
                        <table className="trades-table">
                            <thead>
                                <tr>
                                    <th>Market</th>
                                    <th>Outcome</th>
                                    <th>Side</th>
                                    <th>Size</th>
                                    <th>Price</th>
                                    <th>Value</th>
                                    <th>Trader</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTrades.map((trade, index) => {
                                    const value = parseFloat(trade.size) * parseFloat(trade.price);
                                    return (
                                        <tr key={`${trade.transactionHash}-${index}`} className="trade-row">
                                            <td className="market-cell">
                                                <div className="market-info">
                                                    {trade.icon && (
                                                        <img src={trade.icon} alt="" className="market-icon" />
                                                    )}
                                                    <div className="market-text">
                                                        <div className="market-title">{trade.title || 'Unknown Market'}</div>
                                                        {trade.slug && (
                                                            <div className="market-slug">{trade.slug}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="outcome-cell">
                                                <span className={`outcome-badge outcome-${trade.outcome?.toLowerCase()}`}>
                                                    {trade.outcome || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="side-cell">
                                                <span className={`side-badge side-${trade.side.toLowerCase()}`}>
                                                    {trade.side}
                                                </span>
                                            </td>
                                            <td className="size-cell">{formatNumber(trade.size)}</td>
                                            <td className="price-cell">{formatPrice(trade.price)}</td>
                                            <td className="value-cell">${formatNumber(value)}</td>
                                            <td className="trader-cell">
                                                <div className="trader-info">
                                                    {trade.profileImage && (
                                                        <img src={trade.profileImage} alt="" className="trader-avatar" />
                                                    )}
                                                    <span className="trader-name">{trade.name || trade.pseudonym || 'Anonymous'}</span>
                                                </div>
                                            </td>
                                            <td className="time-cell">{formatTimestamp(trade.timestamp)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {filteredTrades.length === 0 && (
                        <div className="no-results">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p>No trades match your filters</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TradesPage;
