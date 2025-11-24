import { Trophy, TrendingUp, TrendingDown, Medal, Award } from 'lucide-react';

const leaderboardData = [
  {
    rank: 1,
    address: '0x82a...7b1c',
    totalPnL: '$2,487,234.12',
    roi: '+342.8%',
    winRate: '89.2%',
    totalTrades: 1247,
    volume: '$487K',
    isUp: true,
    badge: 'Whale',
    badgeColor: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    rank: 2,
    address: '0x3c4d...9a8e',
    totalPnL: '$1,923,456.78',
    roi: '+278.5%',
    winRate: '82.1%',
    totalTrades: 987,
    volume: '$312K',
    isUp: true,
    badge: 'Top 10',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    rank: 3,
    address: '0x7a8f...2b3c',
    totalPnL: '$1,234,567.89',
    roi: '+127.3%',
    winRate: '73.8%',
    totalTrades: 654,
    volume: '$245K',
    isUp: true,
    badge: 'Hot Streak',
    badgeColor: 'bg-pink-500/20 text-pink-300',
  },
  {
    rank: 4,
    address: '0x1b2c...5f6g',
    totalPnL: '$987,654.32',
    roi: '+98.7%',
    winRate: '67.3%',
    totalTrades: 432,
    volume: '$189K',
    isUp: true,
    badge: 'Rising',
    badgeColor: 'bg-green-500/20 text-green-300',
  },
  {
    rank: 5,
    address: '0x98e4...4f31',
    totalPnL: '$765,432.10',
    roi: '+76.2%',
    winRate: '71.5%',
    totalTrades: 321,
    volume: '$156K',
    isUp: true,
    badge: 'Active',
    badgeColor: 'bg-slate-500/20 text-slate-300',
  },
];

const stats = [
  { label: 'Total Traders', value: '12,847', change: '+234', isUp: true },
  { label: 'Active This Week', value: '8,923', change: '+12.5%', isUp: true },
  { label: 'Total Volume', value: '$124.5M', change: '+8.2%', isUp: true },
  { label: 'Avg ROI', value: '+23.4%', change: '+2.1%', isUp: true },
];

export function Leaderboard() {
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Total PnL</th>
                <th className="py-3 px-4">ROI</th>
                <th className="py-3 px-4">Win Rate</th>
                <th className="py-3 px-4">Trades</th>
                <th className="py-3 px-4">Volume</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((trader) => (
                <tr
                  key={trader.rank}
                  className="border-b border-slate-800 text-sm text-slate-300 hover:bg-slate-800/40 transition"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {trader.rank === 1 && <Medal className="w-5 h-5 text-yellow-400" />}
                      {trader.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                      {trader.rank === 3 && <Medal className="w-5 h-5 text-amber-600" />}
                      <span className="font-semibold">{trader.rank}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-mono">{trader.address}</td>
                  <td className={`py-4 px-4 font-bold ${trader.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trader.totalPnL}
                  </td>
                  <td className={`py-4 px-4 font-medium ${trader.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trader.roi}
                  </td>
                  <td className="py-4 px-4">{trader.winRate}</td>
                  <td className="py-4 px-4">{trader.totalTrades.toLocaleString()}</td>
                  <td className="py-4 px-4">{trader.volume}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${trader.badgeColor}`}>
                      {trader.badge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
          <div className="text-sm text-slate-400">
            Showing 1-5 of 12,847 traders
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition">
              Previous
            </button>
            <button className="px-3 py-1.5 bg-emerald-400/20 text-emerald-400 rounded text-sm">
              1
            </button>
            <button className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition">
              2
            </button>
            <button className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition">
              3
            </button>
            <button className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-sm hover:bg-slate-700 transition">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


