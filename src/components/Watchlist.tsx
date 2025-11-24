import { Star, TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

const watchlist = [
  { symbol: 'BTC/USD', price: '67,842.50', change: '+2.45%', isUp: true },
  { symbol: 'ETH/USD', price: '3,456.80', change: '+1.82%', isUp: true },
  { symbol: 'SOL/USD', price: '142.35', change: '-0.63%', isUp: false },
  { symbol: 'XRP/USD', price: '0.6234', change: '+3.21%', isUp: true },
  { symbol: 'ADA/USD', price: '0.4567', change: '-1.05%', isUp: false },
  { symbol: 'AVAX/USD', price: '37.89', change: '+4.12%', isUp: true },
  { symbol: 'DOT/USD', price: '6.78', change: '-2.34%', isUp: false },
  { symbol: 'MATIC/USD', price: '0.8901', change: '+1.56%', isUp: true },
];

export function Watchlist({ selectedSymbol, onSelectSymbol }: WatchlistProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Watchlist</h3>
        <Star className="w-4 h-4 text-slate-400 hover:text-yellow-400 cursor-pointer transition" />
      </div>

      <div className="space-y-1">
        {watchlist.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onSelectSymbol(item.symbol)}
            className={`w-full text-left p-2 rounded-lg transition ${
              selectedSymbol === item.symbol
                ? 'bg-slate-800'
                : 'hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium">{item.symbol.split('/')[0]}</span>
              {item.isUp ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
            </div>
            <div className="text-xs font-medium mb-0.5">${item.price}</div>
            <div className={`text-xs ${item.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.change}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
