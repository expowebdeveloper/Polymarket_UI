import { useState } from 'react';
import { Activity as ActivityIcon, Filter, TrendingUp, TrendingDown, Award, RefreshCw } from 'lucide-react';
import { fetchActivityForWallet } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Activity, ActivitiesResponse } from '../types/api';

export function Activity() {
    const [walletAddress, setWalletAddress] = useState('');
    const [activityType, setActivityType] = useState<string>('');
    const [activitiesData, setActivitiesData] = useState<ActivitiesResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const validateWallet = (address: string): boolean => {
        return address.startsWith('0x') && address.length === 42;
    };

    const handleFetchActivity = async () => {
        if (!validateWallet(walletAddress)) {
            setError('Invalid wallet address. Must be 42 characters starting with 0x');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await fetchActivityForWallet(
                walletAddress,
                activityType || undefined,
                1000 // Fetch up to 1000 activities
            );
            setActivitiesData(data);
            setCurrentPage(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch activity');
            setActivitiesData(null);
        } finally {
            setLoading(false);
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

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const toNumber = (value: number | string): number => {
        return typeof value === 'string' ? parseFloat(value) : value;
    };

    const getActivityTypeColor = (type: string) => {
        switch (type.toUpperCase()) {
            case 'TRADE':
                return 'bg-blue-400/20 text-blue-400';
            case 'REDEEM':
                return 'bg-emerald-400/20 text-emerald-400';
            case 'REWARD':
                return 'bg-purple-400/20 text-purple-400';
            default:
                return 'bg-slate-400/20 text-slate-400';
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type.toUpperCase()) {
            case 'TRADE':
                return <RefreshCw className="w-4 h-4" />;
            case 'REDEEM':
                return <TrendingUp className="w-4 h-4" />;
            case 'REWARD':
                return <Award className="w-4 h-4" />;
            default:
                return <ActivityIcon className="w-4 h-4" />;
        }
    };

    // Pagination
    const totalActivities = activitiesData?.count || 0;
    const totalPages = Math.ceil(totalActivities / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedActivities = activitiesData?.activities.slice(startIndex, endIndex) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <ActivityIcon className="w-8 h-8 text-emerald-400" />
                <h1 className="text-3xl font-bold">Wallet Activity</h1>
            </div>

            {/* Wallet Input & Filter */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
                <h2 className="text-xl font-bold mb-4">Enter Wallet Address</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono text-sm"
                    />
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select
                            value={activityType}
                            onChange={(e) => setActivityType(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-400"
                        >
                            <option value="">All Types</option>
                            <option value="TRADE">Trade</option>
                            <option value="REDEEM">Redeem</option>
                            <option value="REWARD">Reward</option>
                        </select>
                    </div>
                    <button
                        onClick={handleFetchActivity}
                        disabled={loading || !walletAddress}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition whitespace-nowrap"
                    >
                        {loading ? 'Fetching...' : 'Fetch Activity'}
                    </button>
                </div>
                {error && !loading && (
                    <div className="mt-4">
                        <ErrorMessage message={error} onRetry={handleFetchActivity} />
                    </div>
                )}
            </div>

            {/* Activity Timeline */}
            {loading ? (
                <div className="bg-slate-900 rounded-lg border border-slate-800 p-12">
                    <LoadingSpinner message="Fetching activity..." />
                    <p className="text-center text-sm text-slate-400 mt-4">
                        This may take up to 30 seconds...
                    </p>
                </div>
            ) : activitiesData && paginatedActivities.length > 0 ? (
                <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">Activity Timeline</h3>
                        <span className="text-sm text-slate-400">
                            {totalActivities} total activities
                        </span>
                    </div>

                    <div className="space-y-4">
                        {paginatedActivities.map((activity: Activity, index: number) => (
                            <div
                                key={index}
                                className="bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 mt-1">
                                        {activity.icon ? (
                                            <img src={activity.icon} alt="" className="w-10 h-10 rounded" />
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                                                {getActivityIcon(activity.type)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h4 className="font-semibold text-white">
                                                    {activity.title || 'Unknown Market'}
                                                </h4>
                                                {activity.slug && (
                                                    <p className="text-xs text-slate-500">{activity.slug}</p>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getActivityTypeColor(activity.type)}`}>
                                                {getActivityIcon(activity.type)}
                                                {activity.type}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                            {activity.outcome && (
                                                <div>
                                                    <span className="text-xs text-slate-400">Outcome</span>
                                                    <p className={`text-sm font-medium ${activity.outcome === 'YES' ? 'text-emerald-400' : 'text-red-400'
                                                        }`}>
                                                        {activity.outcome}
                                                    </p>
                                                </div>
                                            )}
                                            {activity.side && (
                                                <div>
                                                    <span className="text-xs text-slate-400">Side</span>
                                                    <p className={`text-sm font-medium ${activity.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                                                        }`}>
                                                        {activity.side}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-xs text-slate-400">Size</span>
                                                <p className="text-sm font-medium text-white">
                                                    {toNumber(activity.size).toFixed(2)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400">Value</span>
                                                <p className="text-sm font-medium text-white">
                                                    {formatCurrency(activity.usdc_size)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400">Price</span>
                                                <p className="text-sm font-medium text-white">
                                                    ${toNumber(activity.price).toFixed(3)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-slate-400">Time</span>
                                                <p className="text-sm text-white">
                                                    {formatDate(activity.timestamp)}
                                                </p>
                                            </div>
                                        </div>

                                        {activity.transaction_hash && (
                                            <a
                                                href={`https://polygonscan.com/tx/${activity.transaction_hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                                            >
                                                {activity.transaction_hash.slice(0, 10)}...{activity.transaction_hash.slice(-8)}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                            <div className="text-sm text-slate-400">
                                Showing {startIndex + 1} to {Math.min(endIndex, totalActivities)} of {totalActivities} activities
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            return page === 1 ||
                                                page === totalPages ||
                                                Math.abs(page - currentPage) <= 1;
                                        })
                                        .map((page, idx, arr) => (
                                            <div key={page} className="flex items-center gap-2">
                                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                    <span className="text-slate-600">...</span>
                                                )}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`px-3 py-2 rounded-lg transition font-medium ${page === currentPage
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
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition font-medium"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : activitiesData && paginatedActivities.length === 0 ? (
                <div className="bg-slate-900 rounded-lg border border-slate-800 p-12 text-center">
                    <ActivityIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">No activity found for this wallet</p>
                </div>
            ) : null}
        </div>
    );
}
