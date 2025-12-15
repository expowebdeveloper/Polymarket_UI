import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, CheckCircle } from 'lucide-react';
import { fetchPositionsForWallet, fetchClosedPositionsForWallet } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Position, PositionsResponse, ClosedPosition } from '../types/api';

type TabType = 'active' | 'closed';

export function Positions() {
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [walletAddress, setWalletAddress] = useState('');

    // Active positions state
    const [activePositionsData, setActivePositionsData] = useState<PositionsResponse | null>(null);
    const [activeLoading, setActiveLoading] = useState(false);
    const [activeError, setActiveError] = useState<string | null>(null);

    // Closed positions state
    const [closedPositionsData, setClosedPositionsData] = useState<ClosedPosition[] | null>(null);
    const [closedLoading, setClosedLoading] = useState(false);
    const [closedError, setClosedError] = useState<string | null>(null);
    const [closedCurrentPage, setClosedCurrentPage] = useState(1);
    const closedItemsPerPage = 20;

    const validateWallet = (address: string): boolean => {
        return address.startsWith('0x') && address.length === 42;
    };

    const handleFetchPositions = async () => {
        if (!validateWallet(walletAddress)) {
            if (activeTab === 'active') {
                setActiveError('Invalid wallet address. Must be 42 characters starting with 0x');
            } else {
                setClosedError('Invalid wallet address. Must be 42 characters starting with 0x');
            }
            return;
        }

        if (activeTab === 'active') {
            try {
                setActiveLoading(true);
                setActiveError(null);
                const data = await fetchPositionsForWallet(walletAddress);
                setActivePositionsData(data);
            } catch (err) {
                setActiveError(err instanceof Error ? err.message : 'Failed to fetch active positions');
                setActivePositionsData(null);
            } finally {
                setActiveLoading(false);
            }
        } else {
            try {
                setClosedLoading(true);
                setClosedError(null);
                const data = await fetchClosedPositionsForWallet(walletAddress);
                setClosedPositionsData(data);
                setClosedCurrentPage(1); // Reset to first page on new fetch
            } catch (err) {
                setClosedError(err instanceof Error ? err.message : 'Failed to fetch closed positions');
                setClosedPositionsData(null);
            } finally {
                setClosedLoading(false);
            }
        }
    };

    const formatCurrency = (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numValue);
    };

    const formatPercent = (value: number | string) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`;
    };

    const toNumber = (value: number | string): number => {
        return typeof value === 'string' ? parseFloat(value) : value;
    };

    // Calculate active positions stats
    const activeTotalPositions = activePositionsData?.count || 0;
    const activeTotalCurrentValue = activePositionsData?.positions.reduce((sum, pos) => sum + toNumber(pos.current_value), 0) || 0;
    const activeTotalPnL = activePositionsData?.positions.reduce((sum, pos) => sum + toNumber(pos.cash_pnl), 0) || 0;
    const activeTotalInitialValue = activePositionsData?.positions.reduce((sum, pos) => sum + toNumber(pos.initial_value), 0) || 0;
    const activeAvgPnLPercent = activeTotalInitialValue > 0 ? (activeTotalPnL / activeTotalInitialValue) * 100 : 0;

    // Calculate closed positions stats
    const closedTotalPositions = closedPositionsData?.length || 0;
    const closedTotalRealizedPnL = closedPositionsData?.reduce((sum, pos) => sum + toNumber(pos.realized_pnl), 0) || 0;

    // Pagination for closed positions
    const closedTotalPages = Math.ceil(closedTotalPositions / closedItemsPerPage);
    const closedStartIndex = (closedCurrentPage - 1) * closedItemsPerPage;
    const closedEndIndex = closedStartIndex + closedItemsPerPage;
    const closedPaginatedData = closedPositionsData?.slice(closedStartIndex, closedEndIndex) || [];

    const currentLoading = activeTab === 'active' ? activeLoading : closedLoading;
    const currentError = activeTab === 'active' ? activeError : closedError;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-emerald-400" />
                <h1 className="text-3xl font-bold">Wallet Positions</h1>
            </div>

            {/* Wallet Input */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
                <h2 className="text-xl font-bold mb-4">Enter Wallet Address</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono text-sm"
                    />
                    <button
                        onClick={handleFetchPositions}
                        disabled={currentLoading || !walletAddress}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
                    >
                        {currentLoading ? 'Fetching...' : 'Fetch Positions'}
                    </button>
                </div>
                {currentError && !currentLoading && (
                    <div className="mt-4">
                        <ErrorMessage message={currentError} onRetry={handleFetchPositions} />
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'active'
                            ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        Active Positions
                    </button>
                    <button
                        onClick={() => setActiveTab('closed')}
                        className={`flex-1 px-6 py-4 font-semibold transition ${activeTab === 'closed'
                            ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                    >
                        Closed Positions
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Active Positions Tab */}
                    {activeTab === 'active' && (
                        <>
                            {/* Summary Stats */}
                            {activePositionsData && !activeLoading && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Total Positions</span>
                                            <Wallet className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div className="text-2xl font-bold">{activeTotalPositions}</div>
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Current Value</span>
                                            <DollarSign className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div className="text-2xl font-bold">{formatCurrency(activeTotalCurrentValue)}</div>
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Total PnL</span>
                                            {activeTotalPnL >= 0 ? (
                                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            )}
                                        </div>
                                        <div className={`text-2xl font-bold ${activeTotalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(activeTotalPnL)}
                                        </div>
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Avg PnL %</span>
                                            {activeAvgPnLPercent >= 0 ? (
                                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            )}
                                        </div>
                                        <div className={`text-2xl font-bold ${activeAvgPnLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatPercent(activeAvgPnLPercent)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active Positions Table */}
                            {activeLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner message="Fetching active positions..." />
                                    <p className="text-center text-sm text-slate-400 mt-4">
                                        This may take up to 30 seconds...
                                    </p>
                                </div>
                            ) : activePositionsData && activePositionsData.positions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-800">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Market</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Outcome</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Price</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Price</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Value</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">PnL</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">PnL %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {activePositionsData.positions.map((position: Position, index: number) => (
                                                <tr key={index} className="hover:bg-slate-800/50 transition">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {position.icon && <img src={position.icon} alt="" className="w-6 h-6 rounded" />}
                                                            <div>
                                                                <div className="font-medium text-white text-sm">{position.title || 'Unknown Market'}</div>
                                                                {position.slug && <div className="text-xs text-slate-500">{position.slug}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${position.outcome === 'YES' ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'}`}>
                                                            {position.outcome || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm text-white">{toNumber(position.size).toFixed(2)}</td>
                                                    <td className="px-4 py-4 text-right text-sm text-white">${toNumber(position.avg_price).toFixed(3)}</td>
                                                    <td className="px-4 py-4 text-right text-sm text-white">${toNumber(position.cur_price).toFixed(3)}</td>
                                                    <td className="px-4 py-4 text-right text-sm text-white font-medium">{formatCurrency(position.current_value)}</td>
                                                    <td className={`px-4 py-4 text-right text-sm font-semibold ${toNumber(position.cash_pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(position.cash_pnl)}
                                                    </td>
                                                    <td className={`px-4 py-4 text-right text-sm font-semibold ${toNumber(position.percent_pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatPercent(position.percent_pnl)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : activePositionsData && activePositionsData.positions.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400 text-lg">No active positions found for this wallet</p>
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* Closed Positions Tab */}
                    {activeTab === 'closed' && (
                        <>
                            {/* Summary Stats */}
                            {closedPositionsData && !closedLoading && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Total Closed</span>
                                            <CheckCircle className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div className="text-2xl font-bold">{closedTotalPositions}</div>
                                    </div>

                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Total Realized PnL</span>
                                            {closedTotalRealizedPnL >= 0 ? (
                                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            )}
                                        </div>
                                        <div className={`text-2xl font-bold ${closedTotalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatCurrency(closedTotalRealizedPnL)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Closed Positions Table */}
                            {closedLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner message="Fetching closed positions..." />
                                    <p className="text-center text-sm text-slate-400 mt-4">
                                        This may take up to 30 seconds...
                                    </p>
                                </div>
                            ) : closedPositionsData && closedPositionsData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-800">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Market</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Outcome</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Price</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Final Price</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Realized PnL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {closedPaginatedData.map((position: ClosedPosition, index: number) => (
                                                <tr key={index} className="hover:bg-slate-800/50 transition">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {position.icon && <img src={position.icon} alt="" className="w-6 h-6 rounded" />}
                                                            <div>
                                                                <div className="font-medium text-white text-sm">{position.title || 'Unknown Market'}</div>
                                                                {position.slug && <div className="text-xs text-slate-500">{position.slug}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${position.outcome === 'YES' ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'}`}>
                                                            {position.outcome || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm text-white">${toNumber(position.avg_price).toFixed(3)}</td>
                                                    <td className="px-4 py-4 text-right text-sm text-white">${toNumber(position.cur_price).toFixed(3)}</td>
                                                    <td className={`px-4 py-4 text-right text-sm font-semibold ${toNumber(position.realized_pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(position.realized_pnl)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Pagination Controls */}
                                    {closedTotalPages > 1 && (
                                        <div className="flex items-center justify-between px-4 py-4 border-t border-slate-800">
                                            <div className="text-sm text-slate-400">
                                                Showing {closedStartIndex + 1} to {Math.min(closedEndIndex, closedTotalPositions)} of {closedTotalPositions} positions
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setClosedCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={closedCurrentPage === 1}
                                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
                                                >
                                                    Previous
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    {Array.from({ length: closedTotalPages }, (_, i) => i + 1)
                                                        .filter(page => {
                                                            // Show first page, last page, current page, and pages around current
                                                            return page === 1 ||
                                                                page === closedTotalPages ||
                                                                Math.abs(page - closedCurrentPage) <= 1;
                                                        })
                                                        .map((page, idx, arr) => (
                                                            <div key={page} className="flex items-center gap-2">
                                                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                                    <span className="text-slate-600">...</span>
                                                                )}
                                                                <button
                                                                    onClick={() => setClosedCurrentPage(page)}
                                                                    className={`px-3 py-2 rounded-lg transition font-medium ${page === closedCurrentPage
                                                                            ? 'bg-emerald-500 text-white'
                                                                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                                                                        }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            </div>
                                                        ))}
                                                </div>
                                                <button
                                                    onClick={() => setClosedCurrentPage(prev => Math.min(closedTotalPages, prev + 1))}
                                                    disabled={closedCurrentPage === closedTotalPages}
                                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : closedPositionsData && closedPositionsData.length === 0 ? (
                                <div className="py-12 text-center">
                                    <CheckCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <p className="text-slate-400 text-lg">No closed positions found for this wallet</p>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
