import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Star, User, DollarSign, Activity } from 'lucide-react';
import { fetchMarketOrders } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import type { MarketOrder, TraderRating } from '../types/api';

interface MarketDetailProps {
  marketSlug: string;
  marketTitle: string;
  onClose: () => void;
}

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

// Calculate trader ratings from orders
const calculateTraderRatings = (orders: MarketOrder[]): TraderRating[] => {
  const traderMap = new Map<string, TraderRating>();

  orders.forEach((order) => {
    const user = order.user;
    if (!traderMap.has(user)) {
      traderMap.set(user, {
        user,
        total_orders: 0,
        buy_orders: 0,
        sell_orders: 0,
        total_shares: 0,
        win_count: 0,
        lose_count: 0,
        rating: 0,
        total_volume: 0,
      });
    }

    const trader = traderMap.get(user)!;
    trader.total_orders++;
    trader.total_shares += order.shares_normalized;
    trader.total_volume += order.shares_normalized * order.price;

    if (order.side === 'BUY') {
      trader.buy_orders++;
      // For BUY orders, if token_label is "Yes", it's a win if price goes up
      // For simplicity, we'll count based on the outcome
      if (order.token_label === 'Yes' && order.price > 0.5) {
        trader.win_count++;
      } else if (order.token_label === 'No' && order.price < 0.5) {
        trader.win_count++;
      } else {
        trader.lose_count++;
      }
    } else {
      trader.sell_orders++;
      // For SELL orders, opposite logic
      if (order.token_label === 'Yes' && order.price < 0.5) {
        trader.win_count++;
      } else if (order.token_label === 'No' && order.price > 0.5) {
        trader.win_count++;
      } else {
        trader.lose_count++;
      }
    }
  });

  // Calculate rating (win rate)
  const traders = Array.from(traderMap.values()).map((trader) => {
    const total_trades = trader.win_count + trader.lose_count;
    trader.rating = total_trades > 0 ? (trader.win_count / total_trades) * 100 : 0;
    return trader;
  });

  // Sort by rating (descending), then by total volume
  return traders.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.total_volume - a.total_volume;
  });
};

export function MarketDetail({ marketSlug, marketTitle, onClose }: MarketDetailProps) {
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'trades' | 'traders'>('orders');
  const [traders, setTraders] = useState<TraderRating[]>([]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchMarketOrders(marketSlug, 1000, 0);
        setOrders(response.orders || []);
        
        // Calculate trader ratings
        const traderRatings = calculateTraderRatings(response.orders || []);
        setTraders(traderRatings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load market orders');
      } finally {
        setLoading(false);
      }
    };

    if (marketSlug) {
      loadOrders();
    }
  }, [marketSlug]);

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <LoadingSpinner message="Loading market details..." />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg border border-slate-800 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{marketTitle}</h2>
            <p className="text-slate-400 text-sm">Market: {marketSlug}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {error && (
          <div className="p-6">
            <ErrorMessage message={error} onRetry={() => window.location.reload()} />
          </div>
        )}

        {!error && (
          <>
            {/* Tabs */}
            <div className="border-b border-slate-800 px-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-3 font-medium transition ${
                    activeTab === 'orders'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Orders ({orders.length})
                </button>
                <button
                  onClick={() => setActiveTab('trades')}
                  className={`px-4 py-3 font-medium transition ${
                    activeTab === 'trades'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Trades ({tradesList.length})
                </button>
                <button
                  onClick={() => setActiveTab('traders')}
                  className={`px-4 py-3 font-medium transition ${
                    activeTab === 'traders'
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Best Traders ({traders.length})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No orders found</div>
                  ) : (
                    orders.map((order, idx) => (
                      <div
                        key={`${order.order_hash}-${idx}`}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  order.side === 'BUY'
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
                    ))
                  )}
                </div>
              )}

              {activeTab === 'trades' && (
                <div className="space-y-3">
                  {tradesList.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No trades found</div>
                  ) : (
                    tradesList.map((tradeOrders, idx) => {
                      const firstOrder = tradeOrders[0];
                      const totalValue = tradeOrders.reduce(
                        (sum, o) => sum + o.shares_normalized * o.price,
                        0
                      );

                      return (
                        <div
                          key={firstOrder.tx_hash}
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
                                key={orderIdx}
                                className="bg-slate-700/50 rounded p-2 flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      order.side === 'BUY'
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
                    })
                  )}
                </div>
              )}

              {activeTab === 'traders' && (
                <div className="space-y-3">
                  {traders.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No traders found</div>
                  ) : (
                    traders.slice(0, 50).map((trader, idx) => (
                      <div
                        key={trader.user}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                              <span className="text-emerald-400 font-bold">{idx + 1}</span>
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
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


