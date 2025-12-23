import { Search, Filter, TrendingUp, TrendingDown, Medal, Trophy, User, DollarSign, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboardTraders } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { LeaderboardTrader, PaginationInfo } from '../types/api';

const categories = ['overall', 'politics', 'sports', 'crypto', 'entertainment', 'economics'];
const timePeriods = ['all', '1m', '3m', '6m', '1y'];
const sortOptions = [
  { value: 'VOL', label: 'Volume' },
  { value: 'PNL', label: 'PnL' },
  { value: 'ROI', label: 'ROI' }
];

// Helper function to format currency
const formatCurrency = (value: number | string | undefined): string => {
  if (!value && value !== 0) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

// Helper function to format percentage
const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'N/A';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

// Helper function to format wallet address
const formatWallet = (address: string): string => {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function Traders() {
  const navigate = useNavigate();
  const [traders, setTraders] = useState<LeaderboardTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('all');
  const [selectedSort, setSelectedSort] = useState('VOL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
    loadTraders(1);
  }, [selectedCategory, selectedTimePeriod, selectedSort]);

  const loadTraders = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const response = await fetchLeaderboardTraders(
        selectedCategory,
        selectedTimePeriod,
        selectedSort,
        pageSize,
        offset
      );
      setTraders(response.traders || []);
      setPagination(response.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traders');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!pagination || newPage <= Math.ceil((pagination.total || pageSize) / pageSize))) {
      loadTraders(newPage);
    }
  };

  // Client-side filtering for search
  const filteredTraders = traders.filter((trader) => {
    const searchLower = searchQuery.toLowerCase();
    const wallet = trader.wallet_address?.toLowerCase() || '';
    const userName = trader.userName?.toLowerCase() || '';
    const xUsername = trader.xUsername?.toLowerCase() || '';
    
    return wallet.includes(searchLower) || 
           userName.includes(searchLower) || 
           xUsername.includes(searchLower);
  });

  // Calculate pagination info
  const totalPages = pagination ? Math.ceil((pagination.total || pageSize) / pageSize) : 1;
  const canGoPrevious = currentPage > 1;
  const canGoNext = pagination ? pagination.has_more : false;

  if (loading) {
    return <LoadingSpinner message="Loading traders..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadTraders} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by wallet, username, or X handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  selectedCategory === category
                    ? 'bg-emerald-400/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Period:</span>
            <select
              value={selectedTimePeriod}
              onChange={(e) => setSelectedTimePeriod(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {timePeriods.map((period) => (
                <option key={period} value={period}>
                  {period === 'all' ? 'All Time' : period.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Traders List */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold capitalize">
            Top Traders - {selectedCategory}
          </h2>
          {pagination && (
            <div className="text-sm text-slate-400">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.total || filteredTraders.length)} of {pagination.total || filteredTraders.length}
            </div>
          )}
        </div>

        {filteredTraders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No traders found matching your criteria.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredTraders.map((trader, index) => {
                const rank = trader.rank || ((currentPage - 1) * pageSize) + index + 1;
                const isPositivePnl = trader.pnl >= 0;
                const isPositiveRoi = trader.roi !== null && trader.roi !== undefined && trader.roi >= 0;
                
                return (
                  <div
                    key={trader.wallet_address}
                    onClick={() => navigate(`/traders/${trader.wallet_address}`)}
                    className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition border border-slate-700/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Rank */}
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-700">
                          {rank <= 3 ? (
                            <Medal className={`w-6 h-6 ${
                              rank === 1 ? 'text-yellow-400' :
                              rank === 2 ? 'text-slate-300' :
                              'text-amber-600'
                            }`} />
                          ) : (
                            <span className="text-emerald-400 font-bold">{rank}</span>
                          )}
                        </div>

                        {/* Profile Image */}
                        {trader.profileImage && (
                          <img
                            src={trader.profileImage}
                            alt={trader.userName || 'Trader'}
                            className="w-12 h-12 rounded-full border-2 border-slate-700"
                          />
                        )}

                        {/* Trader Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">
                              {trader.userName || formatWallet(trader.wallet_address)}
                            </h3>
                            {trader.verifiedBadge && (
                              <span className="text-blue-400">✓</span>
                            )}
                            {trader.xUsername && (
                              <span className="text-slate-400 text-sm">@{trader.xUsername}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            {formatWallet(trader.wallet_address)}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 mb-1">Volume</p>
                            <p className="text-white font-medium">{formatCurrency(trader.vol)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1">PnL</p>
                            <p className={`font-medium flex items-center gap-1 ${
                              isPositivePnl ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {isPositivePnl ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              {formatCurrency(trader.pnl)}
                            </p>
                          </div>
                          {trader.roi !== null && trader.roi !== undefined && (
                            <div>
                              <p className="text-slate-400 mb-1">ROI</p>
                              <p className={`font-medium flex items-center gap-1 ${
                                isPositiveRoi ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {isPositiveRoi ? (
                                  <TrendingUp className="w-4 h-4" />
                                ) : (
                                  <TrendingDown className="w-4 h-4" />
                                )}
                                {formatPercentage(trader.roi)}
                              </p>
                            </div>
                          )}
                          {trader.winRate !== null && trader.winRate !== undefined && (
                            <div>
                              <p className="text-slate-400 mb-1">Win Rate</p>
                              <p className="text-white font-medium">{formatPercentage(trader.winRate)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-400 mb-1">Trades</p>
                            <p className="text-white font-medium">{trader.totalTrades.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                <div className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!canGoPrevious || loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                      canGoPrevious && !loading
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            currentPage === pageNum
                              ? 'bg-emerald-400/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!canGoNext || loading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                      canGoNext && !loading
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

