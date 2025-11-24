import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketOverviewProps {
  onSelectSymbol: (symbol: string) => void;
}

const markets = [
  { symbol: 'BTC/USD', price: '67,842.50', change: '+2.45%', isUp: true, title: "Total Positions", value: "14" },
  { symbol: 'ETH/USD', price: '3,456.80', change: '+1.82%', isUp: true, title: "Active Positions", value: "0" },
  { symbol: 'SOL/USD', price: '142.35', change: '-0.63%', isUp: false, title: "Total Wins", value: "$12,685,747.18" },
  { symbol: 'XRP/USD', price: '0.6234', change: '+3.21%', isUp: true, title: "Total Losses", value: "-$32,326,485.30" },
  { symbol: 'ADA/USD', price: '0.4567', change: '-1.05%', isUp: false, title: "Current Value", value: "$0.01" },
  { symbol: 'DOGE/USD', price: '0.1234', change: '+5.67%', isUp: true, title: "Overall PnL", value: "-$19,640,738.12" },
];


export function MarketOverview({ onSelectSymbol }: MarketOverviewProps) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <h2 className="text-sm font-semibold mb-3 text-slate-300">Market Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {markets.map((market) => (
          <button
            key={market.symbol}
            onClick={() => onSelectSymbol(market.symbol)}
            className="bg-slate-800 rounded-lg p-3 hover:bg-slate-750 transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-400">{market.title}</span>
              {market.isUp ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
            </div>

            {/* <div className="text-lg font-bold mb-1">${market.price}</div> */}

            <div className={`text-xs font-medium ${market.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {market.value}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
