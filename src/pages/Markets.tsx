import { MarketCard } from '../components/MarketCard';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

import { fetchMarkets } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Market, PaginationInfo } from '../types/api';

const marketCategories = ['All', 'Politics', 'Sports', 'Crypto', 'Finance', 'Geopolitics', 'Tech', 'Culture'];



// Helper function to extract category from market
const getMarketCategory = (market: Market): string => {
  if (market.category) return market.category;
  if (market.tags && market.tags.length > 0) {
    const tag = market.tags[0];
    return typeof tag === 'string' ? tag : 'Uncategorized';
  }
  return 'Uncategorized';
};



// Helper function to get market title
const getMarketTitle = (market: Market): string => {
  return market.question || market.title || 'Untitled Market';
};



export function Markets() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketStatus, setMarketStatus] = useState('active');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(24); // Increased for grid view

  useEffect(() => {
    setCurrentPage(1);
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

  const toggleFavorite = (marketId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(marketId)) {
      newFavorites.delete(marketId);
    } else {
      newFavorites.add(marketId);
    }
    setFavorites(newFavorites);
  };

  // Client-side filtering
  const filteredMarkets = markets.filter((market) => {
    const category = getMarketCategory(market);
    const title = getMarketTitle(market);

    // Simple category matching
    const matchesCategory = selectedCategory === 'All' ||
      category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = pagination ? Math.ceil((pagination.total || pageSize) / pageSize) : 1;
  const canGoPrevious = currentPage > 1;
  const canGoNext = pagination ? pagination.has_more : false;

  if (loading && markets.length === 0) {
    return <LoadingSpinner message="Loading markets..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadMarkets} />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Area */}
      <div className="flex flex-col gap-4">
        {/* Main Search Row */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#2C3F5E] border-none rounded-lg text-sm text-white placeholder-slate-400 focus:ring-1 focus:ring-slate-600 outline-none"
            />
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative min-w-[120px]">
            <select
              value={marketStatus}
              onChange={(e) => setMarketStatus(e.target.value)}
              className="w-full h-full px-3 py-2.5 bg-[#2C3F5E] text-slate-200 text-sm rounded-lg appearance-none cursor-pointer border-none outline-none focus:ring-1 focus:ring-slate-600"
            >
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Categories Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {marketCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      {filteredMarkets.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="mb-2">No markets found</div>
          <div className="text-sm">Try adjusting your filters or search query</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMarkets.map((market, index) => {
            // Generate a stable key
            const marketSlug = (market.slug && market.slug.trim()) ||
              (market.market_slug && market.market_slug.trim()) ||
              market.id ||
              market.market_id;
            const uniqueKey = marketSlug || `market-${index}`;

            return (
              <MarketCard
                key={uniqueKey}
                market={market}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.has(uniqueKey)}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-center gap-2 mt-8 py-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!canGoPrevious || loading}
            className={`p-2 rounded-lg transition-colors ${canGoPrevious && !loading
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm text-slate-400 px-4">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!canGoNext || loading}
            className={`p-2 rounded-lg transition-colors ${canGoNext && !loading
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}


