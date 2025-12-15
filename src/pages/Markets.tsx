import { Search, Filter, TrendingUp, TrendingDown, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMarkets } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Market, PaginationInfo } from '../types/api';

const marketCategories = ['All', 'Politics', 'Sports', 'Crypto', 'Entertainment', 'Economics'];

// Helper function to format currency
const formatCurrency = (value: number | string | undefined): string => {
  if (!value) return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
};

// Helper function to extract category from market
const getMarketCategory = (market: Market): string => {
  if (market.category) return market.category;
  if (market.tags && market.tags.length > 0) {
    const tag = market.tags[0];
    return typeof tag === 'string' ? tag : 'Uncategorized';
  }
  return 'Uncategorized';
};

// Helper function to get market price
const getMarketPrice = (market: Market): string => {
  if (market.price !== undefined) return market.price.toString();
  if (market.outcomePrices) {
    const prices = Object.values(market.outcomePrices);
    if (prices.length > 0) return prices[0].toString();
  }
  return '0.50';
};

// Helper function to get market title
const getMarketTitle = (market: Market): string => {
  return market.question || market.title || 'Untitled Market';
};

// Helper function to get end date
const getEndDate = (market: Market): string => {
  return market.endDate || market.end_date || 'N/A';
};

export function Markets() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState('active');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when status changes
    loadMarkets(1);
  }, [marketStatus]);

  const loadMarkets = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const response = await fetchMarkets(marketStatus, pageSize, offset);
      setMarkets(response.markets || []);
      setPagination(response.pagination || null);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!pagination || newPage <= Math.ceil((pagination.total || pageSize) / pageSize))) {
      loadMarkets(newPage);
    }
  };

  const toggleFavorite = (marketId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(marketId)) {
      newFavorites.delete(marketId);
    } else {
      newFavorites.add(marketId);
    }
    setFavorites(newFavorites);
  };

  // Client-side filtering for category and search (applied to current page)
  const filteredMarkets = markets.filter((market) => {
    const marketId = market.id || market.market_id || market.slug || '';
    const category = getMarketCategory(market);
    const title = getMarketTitle(market);
    
    const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate pagination info
  const totalPages = pagination ? Math.ceil((pagination.total || pageSize) / pageSize) : 1;
  const canGoPrevious = currentPage > 1;
  const canGoNext = pagination ? pagination.has_more : false;

  if (loading) {
    return <LoadingSpinner message="Loading markets..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadMarkets} />;
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
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Status:</span>
            <select
              value={marketStatus}
              onChange={(e) => setMarketStatus(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            {marketCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'bg-emerald-400/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Markets List */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold capitalize">
            {marketStatus} Markets
          </h2>
          {pagination && (
            <div className="text-sm text-slate-400">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.total || filteredMarkets.length)} of {pagination.total || filteredMarkets.length}
            </div>
          )}
        </div>

        {filteredMarkets.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No markets found matching your criteria.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredMarkets.map((market, index) => {
              // Check for slug in multiple possible field names (slug, market_slug, etc.)
              const marketSlug = (market.slug && market.slug.trim() && market.slug) 
                || (market.market_slug && market.market_slug.trim() && market.market_slug)
                || market.id 
                || market.market_id;
              
              // Use the actual slug/id as the key - prioritize slug, never use market-{index} pattern
              // If no slug/id exists, create a unique key based on available data
              const uniqueKey = marketSlug 
                ? marketSlug 
                : (market.id || market.market_id || `idx-${index}`);
              
              const marketId = marketSlug || market.id || market.market_id || `temp-${index}`;
              const category = getMarketCategory(market);
              const title = getMarketTitle(market);
              const price = getMarketPrice(market);
              const endDate = getEndDate(market);
              const isFavorite = favorites.has(marketId);
              
              // Calculate volume and liquidity from market data
              const volume = market.volume || 0;
              const liquidity = market.liquidity || 0;
              
              // For display purposes, we'll show a placeholder for change
              // In a real implementation, you'd calculate this from price history
              const change = '+0.0%';
              const isUp = true;

              const handleMarketClick = () => {
                // Only navigate if we have a real slug (not a fallback)
                if (marketSlug) {
                  navigate(`/markets/${encodeURIComponent(marketSlug)}`);
                }
              };

              return (
                <div
                  key={uniqueKey}
                  className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition border border-slate-700/50 cursor-pointer"
                  onClick={handleMarketClick}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(marketId);
                          }}
                          className="hover:opacity-70 transition"
                        >
                          <Star
                            className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`}
                          />
                        </button>
                        <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
                          {category}
                        </span>
                        <span className="text-xs text-slate-500">Ends: {endDate}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
                      <div className="flex items-center gap-6 text-sm">
                        {volume > 0 && (
                          <div>
                            <span className="text-slate-400">Volume: </span>
                            <span className="text-white font-medium">{formatCurrency(volume)}</span>
                          </div>
                        )}
                        {liquidity > 0 && (
                          <div>
                            <span className="text-slate-400">Liquidity: </span>
                            <span className="text-white font-medium">{formatCurrency(liquidity)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{price}</div>
                        <div className={`text-sm font-medium flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isUp ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {change}
                        </div>
                      </div>
                      <button 
                        className="px-4 py-2 bg-emerald-400 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarketClick();
                        }}
                      >
                        View Details
                      </button>
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


