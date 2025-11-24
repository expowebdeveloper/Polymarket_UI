import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const whaleTransactions = [
  {
    id: 1,
    address: '0x82a...7b1c',
    type: 'Buy',
    market: 'Will Bitcoin reach $100K by end of 2024?',
    amount: '$487,234.12',
    price: '0.72',
    timestamp: '2m ago',
    isUp: true,
    category: 'Crypto',
  },
  {
    id: 2,
    address: '0x3c4d...9a8e',
    type: 'Sell',
    market: 'Will Trump win the 2024 election?',
    amount: '$312,456.78',
    price: '0.58',
    timestamp: '5m ago',
    isUp: false,
    category: 'Politics',
  },
  {
    id: 3,
    address: '0x7a8f...2b3c',
    type: 'Buy',
    market: 'Will AI replace 50% of jobs by 2025?',
    amount: '$245,678.90',
    price: '0.68',
    timestamp: '12m ago',
    isUp: true,
    category: 'Economics',
  },
  {
    id: 4,
    address: '0x1b2c...5f6g',
    type: 'Buy',
    market: 'Will Ethereum hit $5K before Bitcoin hits $100K?',
    amount: '$189,234.56',
    price: '0.45',
    timestamp: '18m ago',
    isUp: true,
    category: 'Crypto',
  },
  {
    id: 5,
    address: '0x98e4...4f31',
    type: 'Sell',
    market: 'Will the Lakers win the NBA championship?',
    amount: '$156,789.01',
    price: '0.35',
    timestamp: '25m ago',
    isUp: false,
    category: 'Sports',
  },
  {
    id: 6,
    address: '0x5a6b...7c8d',
    type: 'Buy',
    market: 'Will Taylor Swift release a new album in 2024?',
    amount: '$134,567.89',
    price: '0.82',
    timestamp: '32m ago',
    isUp: true,
    category: 'Entertainment',
  },
];

const whaleStats = [
  { label: 'Total Whale Volume (24h)', value: '$12.4M', change: '+18.5%', isUp: true },
  { label: 'Active Whales', value: '247', change: '+12', isUp: true },
  { label: 'Largest Trade', value: '$487K', change: '2m ago', isUp: null },
  { label: 'Avg Trade Size', value: '$234K', change: '+5.2%', isUp: true },
];

const topWhales = [
  { rank: 1, address: '0x82a...7b1c', totalVolume: '$2.4M', trades: 47, avgSize: '$51K' },
  { rank: 2, address: '0x3c4d...9a8e', totalVolume: '$1.8M', trades: 32, avgSize: '$56K' },
  { rank: 3, address: '0x7a8f...2b3c', totalVolume: '$1.5M', trades: 28, avgSize: '$54K' },
];

export function WhaleTracker() {
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
        {/* Recent Whale Transactions */}
        <div className="lg:col-span-2 bg-slate-900 rounded-lg border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Recent Whale Activity</h2>
          </div>

          <div className="space-y-3">
            {whaleTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700/50 hover:bg-slate-750 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === 'Buy'
                          ? 'bg-emerald-400/20 text-emerald-400'
                          : 'bg-red-400/20 text-red-400'
                      }`}>
                        {transaction.type}
                      </span>
                      <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
                        {transaction.category}
                      </span>
                      <span className="text-xs text-slate-500">{transaction.timestamp}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{transaction.market}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="font-mono">{transaction.address}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 ml-4">
                    <div className="text-xl font-bold text-white">{transaction.amount}</div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-slate-400">Price:</span>
                      <span className="text-white font-medium">{transaction.price}</span>
                    </div>
                    {transaction.isUp ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Whales */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-2xl font-bold mb-6">Top Whales</h2>

          <div className="space-y-4">
            {topWhales.map((whale) => (
              <div
                key={whale.rank}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-400">#{whale.rank}</span>
                    <span className="font-mono text-sm text-white">{whale.address}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Volume:</span>
                    <span className="text-white font-medium">{whale.totalVolume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trades:</span>
                    <span className="text-white font-medium">{whale.trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Size:</span>
                    <span className="text-white font-medium">{whale.avgSize}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


