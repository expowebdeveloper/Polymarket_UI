import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const positions = [
  { symbol: 'BTC', amount: '0.4523', value: '$30,678.45', change: '+12.34%', isUp: true },
  { symbol: 'ETH', amount: '5.6789', value: '$19,623.12', change: '+8.92%', isUp: true },
  { symbol: 'SOL', amount: '234.56', value: '$33,389.76', change: '-3.45%', isUp: false },
];

export function Portfolio() {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Portfolio</h3>
        <button className="text-xs text-emerald-400 hover:text-emerald-300 transition">View All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Total Balance</span>
          </div>
          <div className="text-2xl font-bold">$83,691.33</div>
          <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +8.67% ($6,683.33)
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">24h PnL</span>
          <div className="text-2xl font-bold text-emerald-400">+$2,451.23</div>
          <div className="text-xs text-slate-400 mt-1">+3.02%</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <span className="text-xs text-slate-400 block mb-1">Available Balance</span>
          <div className="text-2xl font-bold">$10,245.50</div>
          <div className="text-xs text-slate-400 mt-1">12.24% of total</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-800">
          <span>Asset</span>
          <span>Holdings</span>
          <span>Value</span>
          <span>Change</span>
        </div>

        {positions.map((position) => (
          <div key={position.symbol} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-slate-900">
                {position.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-medium">{position.symbol}</div>
                <div className="text-xs text-slate-400">{position.amount}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium">{position.value}</div>
              <div className={`text-xs flex items-center justify-end gap-1 ${position.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {position.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {position.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
