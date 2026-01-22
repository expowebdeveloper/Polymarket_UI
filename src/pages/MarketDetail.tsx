import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Gift } from 'lucide-react';
import { fetchMarketOrders, fetchMarketDetails, fetchRewardsMarket, fetchMarketTraders, fetchMarketOrderCount } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { MarketOrder, TraderRating, Market, RewardsMarketData } from '../types/api';

// Helper function to format currency
const formatCurrency = (value: number | string | undefined): string => {
  if (!value && value !== 0) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

// Helper function to format date
const formatDate = (timestamp: number): string => {
  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
};

// Helper function to format wallet address
const formatWallet = (address: string): string => {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function MarketDetailPage() {
  const { marketSlug } = useParams<{ marketSlug: string }>();
  const navigate = useNavigate();
  const [market, setMarket] = useState<Market | null>(null);

  // Data States
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [traders, setTraders] = useState<TraderRating[]>([]);
  const [rewardsMarket, setRewardsMarket] = useState<RewardsMarketData | null>(null);

  // Pagination States
  const ITEMS_PER_PAGE = 100;
  const [activeTab, setActiveTab] = useState<'orders' | 'trades' | 'traders' | 'rewards'>('orders');

  const [ordersPage, setOrdersPage] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);


  const [tradersPage, setTradersPage] = useState(0);
  const [tradersLoading, setTradersLoading] = useState(false);
  const [totalTraders, setTotalTraders] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingRewards, setLoadingRewards] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const loadMarketData = async () => {
      if (!marketSlug) {
        setError('Market slug is required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      let fetchedMarket: Market | null = null;

      // 1. Critical: Market Details (Blocking)
      try {
        fetchedMarket = await fetchMarketDetails(marketSlug);
        setMarket(fetchedMarket);
      } catch (err) {
        // Only block if we can't get basic market info
        console.error("Critical error fetching market details", err);
        setError(err instanceof Error ? err.message : 'Failed to load market data');
        setLoading(false);
        return;
      }

      // Render the page immediately after basic details are loaded
      setLoading(false);

      // 2. Non-Critical: Orders List (Async/Background)
      const loadOrders = async () => {
        try {
          setOrdersLoading(true);
          const ordersResponse = await fetchMarketOrders(marketSlug, ITEMS_PER_PAGE, 0);
          setOrders(ordersResponse.orders || []);

          if (ordersResponse.pagination?.total) {
            setTotalOrders(ordersResponse.pagination.total);
          }
          return ordersResponse.orders;
        } catch (err) {
          console.error("Failed to load orders", err);
          return [];
        } finally {
          setOrdersLoading(false);
        }
      };

      // 3. Non-Critical: Total Count (Async/Background)
      const loadCount = async () => {
        try {
          const res = await fetchMarketOrderCount(marketSlug);
          if (res.total > 0) setTotalOrders(res.total);
        } catch (err) {
          console.error("Failed to fetch total count", err);
        }
      };

      // 4. Non-Critical: Best Traders (Async/Background - Slow)
      const loadTraders = async () => {
        try {
          setTradersLoading(true);
          const tradersResponse = await fetchMarketTraders(marketSlug, ITEMS_PER_PAGE, 0);
          setTraders(tradersResponse.traders || []);

          if (tradersResponse.pagination?.total) {
            setTotalTraders(tradersResponse.pagination.total);
          }
        } catch (err) {
          console.error("Failed to load traders", err);
        } finally {
          setTradersLoading(false);
        }
      };

      // Fire off background tasks
      // We store the orders promise because rewards might need to inspect the first order for condition_id fallback
      const ordersPromise = loadOrders();
      loadCount();
      loadTraders();

      // 5. Non-Critical: Rewards (Dependent on Market/Orders)
      const loadRewards = async () => {
        try {
          // Wait for orders to finish if we need them for fallback condition_id
          const fetchedOrders = await ordersPromise;

          const conditionId = fetchedMarket?.condition_id ||
            (fetchedOrders && fetchedOrders.length > 0 ? fetchedOrders[0].condition_id : null);

          if (conditionId) {
            setLoadingRewards(true);
            const rewardsResponse = await fetchRewardsMarket(conditionId);
            if (rewardsResponse.data && rewardsResponse.data.length > 0) {
              setRewardsMarket(rewardsResponse.data[0]);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch rewards (background)', err);
        } finally {
          setLoadingRewards(false);
        }
      };

      loadRewards();
    };

    loadMarketData();
  }, [marketSlug]);

  // Load Orders Page
  const loadOrdersPage = async (page: number) => {
    if (!marketSlug) return;
    setOrdersLoading(true);
    try {
      const offset = page * ITEMS_PER_PAGE;
      const response = await fetchMarketOrders(marketSlug, ITEMS_PER_PAGE, offset);
      setOrders(response.orders || []);

      // Update total orders if returned (usually only on first page, but good to check)
      if (response.pagination?.total) {
        setTotalOrders(response.pagination.total);
      }

      setOrdersPage(page);
    } catch (err) {
      console.error("Failed to load orders page", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load Traders Page
  const loadTradersPage = async (page: number) => {
    if (!marketSlug) return;
    setTradersLoading(true);
    try {
      const offset = page * ITEMS_PER_PAGE;
      const response = await fetchMarketTraders(marketSlug, ITEMS_PER_PAGE, offset);
      setTraders(response.traders || []);

      if (response.pagination?.total) {
        setTotalTraders(response.pagination.total);
      }

      setTradersPage(page);
    } catch (err) {
      console.error("Failed to load traders page", err);
    } finally {
      setTradersLoading(false);
    }
  };

  // Group orders by transaction hash to show trades
  const trades = orders.reduce((acc, order) => {
    const txHash = order.tx_hash;
    if (!acc[txHash]) {
      acc[txHash] = [];
    }
    acc[txHash].push(order);
    return acc;
  }, {} as Record<string, MarketOrder[]>);

  const tradesList = Object.values(trades);

  // Get market title from market details, first order, or slug
  const marketTitle = market?.question || market?.title ||
    (orders.length > 0 ? orders[0].title : null) ||
    marketSlug || 'Market Details';

  // Get market metadata
  const marketVolume = market?.volume || 0;
  const marketLiquidity = market?.liquidity || 0;
  const marketStatus = market?.status || 'Unknown';
  const marketCategory = market?.category || (market?.tags && market.tags[0]) || 'Uncategorized';
  const marketEndDate = market?.endDate || market?.end_date || 'N/A';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/markets')}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold text-white">Loading market details...</h1>
        </div>
        <LoadingSpinner message="Loading market details..." />
      </div>
    );
  }

  const PaginationControls = ({
    page,
    totalItems,
    itemsPerPage,
    onPageChange,
    loading
  }: {
    page: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (newPage: number) => void,
    loading: boolean
  }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = page * itemsPerPage + 1;
    const end = Math.min((page + 1) * itemsPerPage, totalItems);

    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = 0; i < totalPages; i++) {
        if (i === 0 || i === totalPages - 1 || (i >= page - delta && i <= page + delta)) {
          range.push(i);
        }
      }

      let l;
      for (let i of range) {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            rangeWithDots.push('...');
          }
        }
        rangeWithDots.push(i);
        l = i;
      }
      return rangeWithDots;
    };

    if (totalItems === 0) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-700/50 pt-4 mt-6 gap-4">
        <span className="text-sm text-slate-400">
          Showing {start} to {end} of {totalItems.toLocaleString()} entries
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1 text-sm rounded transition bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
          >
            Previous
          </button>

          {getPageNumbers().map((pageNum, idx) => (
            pageNum === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-slate-500">...</span>
            ) : (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum as number)}
                disabled={loading}
                className={`px-3 py-1 text-sm rounded transition ${page === pageNum
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                {(pageNum as number) + 1}
              </button>
            )
          ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 py-1 text-sm rounded transition bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/markets')}
          className="p-2 hover:bg-slate-800 rounded-lg transition"
        >
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{marketTitle}</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-400 text-sm">Market: {marketSlug}</p>
            <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded capitalize">
              {marketStatus}
            </span>
            <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
              {marketCategory}
            </span>
            {marketVolume > 0 && (
              <span className="text-slate-400 text-xs">
                Volume: {formatCurrency(marketVolume)}
              </span>
            )}
            {marketLiquidity > 0 && (
              <span className="text-slate-400 text-xs">
                Liquidity: {formatCurrency(marketLiquidity)}
              </span>
            )}
            <span className="text-slate-400 text-xs">
              Ends: {marketEndDate}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      )}

      {!error && (
        <>
          {/* Tabs */}
          <div className="bg-slate-900 rounded-lg border border-slate-800">
            <div className="border-b border-slate-800 px-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-3 font-medium transition ${activeTab === 'orders'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Orders ({totalOrders > 0 ? totalOrders : '...'})
                </button>
                <button
                  onClick={() => setActiveTab('trades')}
                  className={`px-4 py-3 font-medium transition ${activeTab === 'trades'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Trades
                </button>
                <button
                  onClick={() => setActiveTab('traders')}
                  className={`px-4 py-3 font-medium transition ${activeTab === 'traders'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  Best Traders
                </button>
                {rewardsMarket && (
                  <button
                    onClick={() => setActiveTab('rewards')}
                    className={`px-4 py-3 font-medium transition ${activeTab === 'rewards'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      Rewards
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {ordersLoading ? (
                    <LoadingSpinner message="Loading orders..." />
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No orders found</div>
                  ) : (
                    <>
                      {orders.map((order, idx) => (
                        <div
                          key={`${order.order_hash}-${order.timestamp}-${idx}`}
                          className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${order.side === 'BUY'
                                    ? 'bg-emerald-400/20 text-emerald-400'
                                    : 'bg-red-400/20 text-red-400'
                                    }`}
                                >
                                  {order.side}
                                </span>
                                <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
                                  {order.token_label}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {formatDate(order.timestamp)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Price</p>
                                  <p className="text-white font-medium">{order.price.toFixed(4)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Shares</p>
                                  <p className="text-white font-medium">
                                    {order.shares_normalized.toFixed(4)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400">User</p>
                                  <p className="text-white font-mono text-xs">
                                    {formatWallet(order.user)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Value</p>
                                  <p className="text-white font-medium">
                                    {formatCurrency(order.shares_normalized * order.price)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <PaginationControls
                    page={ordersPage}
                    totalItems={totalOrders}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={loadOrdersPage}
                    loading={ordersLoading}
                  />
                </div>
              )}

              {activeTab === 'trades' && (
                <div className="space-y-3">
                  {ordersLoading ? (
                    <LoadingSpinner message="Loading trades..." />
                  ) : tradesList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No trades found</div>
                  ) : (
                    <>
                      {tradesList.map((tradeOrders, idx) => {
                        const firstOrder = tradeOrders[0];
                        const totalValue = tradeOrders.reduce(
                          (sum, o) => sum + o.shares_normalized * o.price,
                          0
                        );

                        return (
                          <div
                            key={`${firstOrder.tx_hash}-${idx}`}
                            className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-sm text-slate-400 mb-1">
                                  Transaction: {formatWallet(firstOrder.tx_hash)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDate(firstOrder.timestamp)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-400 text-sm">Total Value</p>
                                <p className="text-white font-bold">{formatCurrency(totalValue)}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {tradeOrders.map((order, orderIdx) => (
                                <div
                                  key={`${order.order_hash}-${orderIdx}`}
                                  className="bg-slate-700/50 rounded p-2 flex items-center justify-between text-sm"
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${order.side === 'BUY'
                                        ? 'bg-emerald-400/20 text-emerald-400'
                                        : 'bg-red-400/20 text-red-400'
                                        }`}
                                    >
                                      {order.side}
                                    </span>
                                    <span className="text-slate-300">{order.token_label}</span>
                                    <span className="text-slate-400">
                                      {order.shares_normalized.toFixed(4)} @ {order.price.toFixed(4)}
                                    </span>
                                  </div>
                                  <span className="text-white font-medium">
                                    {formatCurrency(order.shares_normalized * order.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <PaginationControls
                    page={ordersPage}
                    totalItems={totalOrders}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={loadOrdersPage}
                    loading={ordersLoading}
                  />
                </div>
              )}

              {activeTab === 'traders' && (
                <div className="space-y-3">
                  {tradersLoading ? (
                    <LoadingSpinner message="Loading traders..." />
                  ) : traders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No traders found</div>
                  ) : (
                    <>
                      {traders.map((trader, idx) => (
                        <div
                          key={trader.user}
                          className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                <span className="text-emerald-400 font-bold">{(tradersPage * ITEMS_PER_PAGE) + idx + 1}</span>
                              </div>
                              <div>
                                <p className="text-white font-medium font-mono text-sm">
                                  {formatWallet(trader.user)}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                  <span>{trader.total_orders} orders</span>
                                  <span>{trader.buy_orders} buys</span>
                                  <span>{trader.sell_orders} sells</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-2xl font-bold text-emerald-400">
                                  {trader.rating.toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-xs text-slate-400">
                                {trader.win_count}W / {trader.lose_count}L
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Vol: {formatCurrency(trader.total_volume)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <PaginationControls
                    page={tradersPage}
                    totalItems={totalTraders}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={loadTradersPage}
                    loading={tradersLoading}
                  />
                </div>
              )}

              {activeTab === 'rewards' && (
                <div className="space-y-6">
                  {loadingRewards ? (
                    <div className="text-center py-12">
                      <LoadingSpinner message="Loading rewards data..." />
                    </div>
                  ) : rewardsMarket ? (
                    <>
                      {/* Rewards Market Overview */}
                      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50">
                        <div className="flex items-center gap-3 mb-4">
                          <Gift className="w-6 h-6 text-emerald-400" />
                          <h3 className="text-xl font-bold text-white">Rewards Market</h3>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-slate-400 text-sm mb-1">Question</p>
                            <p className="text-white font-medium">{rewardsMarket.question}</p>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-slate-400 text-sm mb-1">Market Competitiveness</p>
                              <p className="text-white font-medium">{rewardsMarket.market_competitiveness.toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm mb-1">Max Spread</p>
                              <p className="text-white font-medium">{rewardsMarket.rewards_max_spread}%</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm mb-1">Min Size</p>
                              <p className="text-white font-medium">{formatCurrency(rewardsMarket.rewards_min_size)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm mb-1">Condition ID</p>
                              <p className="text-white font-mono text-xs break-all">{rewardsMarket.condition_id}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tokens */}
                      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50">
                        <h3 className="text-lg font-bold text-white mb-4">Outcomes</h3>
                        <div className="space-y-3">
                          {rewardsMarket.tokens.map((token, idx) => (
                            <div
                              key={token.token_id}
                              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">{token.outcome}</p>
                                  <p className="text-slate-400 text-xs font-mono mt-1">
                                    Token ID: {token.token_id.slice(0, 20)}...
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-slate-400 text-sm mb-1">Price</p>
                                  <p className="text-emerald-400 font-bold text-lg">
                                    {(token.price * 100).toFixed(2)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rewards Config */}
                      {rewardsMarket.rewards_config && rewardsMarket.rewards_config.length > 0 && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50">
                          <h3 className="text-lg font-bold text-white mb-4">Rewards Configuration</h3>
                          <div className="space-y-4">
                            {rewardsMarket.rewards_config.map((config, idx) => (
                              <div
                                key={config.id}
                                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50"
                              >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-slate-400 text-sm mb-1">Rate per Day</p>
                                    <p className="text-white font-medium">{formatCurrency(config.rate_per_day)}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 text-sm mb-1">Total Rewards</p>
                                    <p className="text-white font-medium">{formatCurrency(config.total_rewards)}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 text-sm mb-1">Total Days</p>
                                    <p className="text-white font-medium">{config.total_days.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 text-sm mb-1">Period</p>
                                    <p className="text-white font-medium text-xs">
                                      {config.start_date} to {config.end_date}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-600">
                                  <p className="text-slate-400 text-xs font-mono">
                                    Asset: {config.asset_address}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Market Image */}
                      {rewardsMarket.image && (
                        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700/50">
                          <h3 className="text-lg font-bold text-white mb-4">Market Image</h3>
                          <img
                            src={rewardsMarket.image}
                            alt={rewardsMarket.question}
                            className="max-w-[200px] h-auto rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      No rewards data available for this market
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}







