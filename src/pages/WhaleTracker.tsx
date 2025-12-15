import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { fetchTraders } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Trader } from '../types/api';

const whaleStats = [
  { label: 'Total Whale Volume (24h)', value: '$12.4M', change: '+18.5%', isUp: true },
  { label: 'Active Whales', value: '247', change: '+12', isUp: true },
  { label: 'Largest Trade', value: '$487K', change: '2m ago', isUp: null },
  { label: 'Avg Trade Size', value: '$234K', change: '+5.2%', isUp: true },
];

export function WhaleTracker() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTraders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchTraders(50);
      setTraders(response.traders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load traders data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraders();
  }, []);

  // Filter for whale traders (those with significant activity)
  const whaleTraders = traders
    .filter(t => t.total_trades >= 50)
    .sort((a, b) => b.total_trades - a.total_trades)
    .slice(0, 10);

  const topWhales = whaleTraders.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {whaleStats.map((stat, index) => (
          <div key={index} className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{stat.label}</span>
              {stat.isUp !== null && (
                stat.isUp ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )
              )}
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className={`text-xs font-medium ${stat.isUp === null ? 'text-slate-400' : stat.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Whale Activity */}
        <div className="lg:col-span-2 bg-slate-900 rounded-lg border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Whale Traders</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              <LoadingSpinner message="Loading whale traders..." />
              <p className="text-center text-sm text-slate-400">
                This may take up to 60 seconds for large datasets...
              </p>
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadTraders} />
          ) : whaleTraders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No whale traders found
            </div>
          ) : (
            <div className="space-y-3">
              {whaleTraders.map((trader, index) => (
                <div
                  key={trader.wallet_address}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700/50 hover:bg-slate-750 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-emerald-400/20 text-emerald-400 rounded text-xs font-medium">
                          #{index + 1}
                        </span>
                        <span className="text-xs text-slate-500">
                          {trader.last_trade_date
                            ? new Date(trader.last_trade_date).toLocaleString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                        <span className="font-mono text-white">
                          {trader.wallet_address.slice(0, 10)}...{trader.wallet_address.slice(-8)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Total Trades: </span>
                          <span className="text-emerald-400 font-medium">
                            {trader.total_trades.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Positions: </span>
                          <span className="text-white font-medium">
                            {trader.total_positions}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Whales */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-2xl font-bold mb-6">Top Whales</h2>

          {loading ? (
            <LoadingSpinner message="Loading..." size="sm" />
          ) : error ? (
            <div className="text-center py-4 text-red-400 text-sm">{error}</div>
          ) : topWhales.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              No data available
            </div>
          ) : (
            <div className="space-y-4">
              {topWhales.map((whale, index) => (
                <div
                  key={whale.wallet_address}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-400">#{index + 1}</span>
                      <span className="font-mono text-xs text-white">
                        {whale.wallet_address.slice(0, 6)}...{whale.wallet_address.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Trades:</span>
                      <span className="text-emerald-400 font-medium">
                        {whale.total_trades.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Positions:</span>
                      <span className="text-white font-medium">{whale.total_positions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">First Trade:</span>
                      <span className="text-white font-medium text-xs">
                        {whale.first_trade_date
                          ? new Date(whale.first_trade_date).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


