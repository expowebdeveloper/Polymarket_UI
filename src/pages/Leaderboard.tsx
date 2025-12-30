import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Medal } from 'lucide-react';
import { fetchTraders } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Trader } from '../types/api';

const stats = [
  { label: 'Total Traders', value: '12,847', change: '+234', isUp: true },
  { label: 'Active This Week', value: '8,923', change: '+12.5%', isUp: true },
  { label: 'Total Volume', value: '$124.5M', change: '+8.2%', isUp: true },
  { label: 'Avg ROI', value: '+23.4%', change: '+2.1%', isUp: true },
];

export function Leaderboard() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(50);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const loadTraders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchTraders(limit);
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

  // Filter traders with actual data
  const activeTraders = traders.filter(t => t.total_trades > 0);

  // Calculate pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(activeTraders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTraders = activeTraders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{stat.label}</span>
              {stat.isUp ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className={`text-xs font-medium ${stat.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold">Top Traders</h2>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading traders..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={loadTraders} />
        ) : currentTraders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No active traders found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-800">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Total Trades</th>
                    <th className="py-3 px-4">Total Positions</th>
                    <th className="py-3 px-4">First Trade</th>
                    <th className="py-3 px-4">Last Trade</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTraders.map((trader, index) => {
                    const rank = startIndex + index + 1;
                    return (
                      <tr
                        key={trader.wallet_address}
                        className="border-b border-slate-800 text-sm text-slate-300 hover:bg-slate-800/40 transition"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {rank === 1 && <Medal className="w-5 h-5 text-yellow-400" />}
                            {rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                            {rank === 3 && <Medal className="w-5 h-5 text-amber-600" />}
                            <span className="font-semibold">{rank}</span>
                          </div>
                        </td>
                        <td 
                          className="py-4 px-4 font-mono text-xs cursor-pointer hover:bg-slate-700/60 transition-all relative group"
                          onClick={() => {
                            navigator.clipboard.writeText(trader.wallet_address);
                            setCopiedWallet(trader.wallet_address);
                            setTimeout(() => setCopiedWallet(null), 2000);
                          }}
                          title={`Click to copy: ${trader.wallet_address}`}
                        >
                          <div className="flex items-center gap-1">
                            {trader.wallet_address.slice(0, 6)}...{trader.wallet_address.slice(-4)}
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-400">
                              📋
                            </span>
                          </div>
                          {copiedWallet === trader.wallet_address && (
                            <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-emerald-900/90 rounded z-10 text-xs font-bold text-emerald-300">
                              ✓ Copied!
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 font-medium text-emerald-400">
                          {trader.total_trades.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">{trader.total_positions}</td>
                        <td className="py-4 px-4 text-xs text-slate-400">
                          {trader.first_trade_date
                            ? new Date(trader.first_trade_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400">
                          {trader.last_trade_date
                            ? new Date(trader.last_trade_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
              <div className="text-sm text-slate-400">
                Showing {startIndex + 1}-{Math.min(endIndex, activeTraders.length)} of {activeTraders.length} active traders
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
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
                      className={`px-3 py-1.5 rounded text-sm transition ${currentPage === pageNum
                          ? 'bg-emerald-400/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


