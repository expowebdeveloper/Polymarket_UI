import { useState } from 'react';

interface TradingPanelProps {
  symbol: string;
}

export function TradingPanel({ symbol }: TradingPanelProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 rounded font-medium text-sm transition ${
            side === 'buy'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 rounded font-medium text-sm transition ${
            side === 'sell'
              ? 'bg-red-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['market', 'limit', 'stop'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition ${
              orderType === type
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {orderType !== 'market' && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Price</label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500">USD</span>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Amount</label>
          <div className="relative">
            <input
              type="text"
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <span className="absolute right-3 top-2 text-xs text-slate-500">BTC</span>
          </div>
        </div>

        <div className="flex gap-2">
          {['25%', '50%', '75%', '100%'].map((percent) => (
            <button
              key={percent}
              className="flex-1 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400 hover:bg-slate-700 transition"
            >
              {percent}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">Available</span>
            <span className="text-white font-medium">$10,245.50</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Total</span>
            <span className="text-white font-medium">$0.00</span>
          </div>
        </div>

        <button
          className={`w-full py-3 rounded font-medium text-sm transition ${
            side === 'buy'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {symbol.split('/')[0]}
        </button>
      </div>
    </div>
  );
}
