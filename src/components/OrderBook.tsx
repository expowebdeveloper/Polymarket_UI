interface OrderBookProps {
  symbol: string;
}

const bids = [
  { price: '67,842.50', amount: '0.1234', total: '8,372.45' },
  { price: '67,841.20', amount: '0.4567', total: '30,982.13' },
  { price: '67,840.00', amount: '0.2345', total: '15,907.18' },
  { price: '67,839.50', amount: '0.7890', total: '53,527.41' },
  { price: '67,838.00', amount: '0.3456', total: '23,441.77' },
];

const asks = [
  { price: '67,843.00', amount: '0.2134', total: '14,477.46' },
  { price: '67,844.50', amount: '0.5678', total: '38,522.29' },
  { price: '67,845.00', amount: '0.1234', total: '8,371.52' },
  { price: '67,846.20', amount: '0.8901', total: '60,402.88' },
  { price: '67,847.00', amount: '0.4567', total: '30,993.93' },
];

export function OrderBook({ symbol }: OrderBookProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Order Book</h3>

      <div className="text-xs mb-2">
        <div className="grid grid-cols-3 gap-2 text-slate-500 mb-1">
          <span>Price (USD)</span>
          <span className="text-right">Amount (BTC)</span>
          <span className="text-right">Total</span>
        </div>

        <div className="space-y-0.5 mb-3">
          {asks.reverse().map((ask, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 relative">
              <div className="absolute inset-0 bg-red-500/10 origin-right" style={{ transform: `scaleX(${(i + 1) * 0.2})` }}></div>
              <span className="text-red-400 relative z-10">{ask.price}</span>
              <span className="text-right text-slate-300 relative z-10">{ask.amount}</span>
              <span className="text-right text-slate-400 relative z-10">{ask.total}</span>
            </div>
          ))}
        </div>

        <div className="py-2 my-2 bg-slate-800 rounded text-center font-bold text-emerald-400">
          67,842.50
        </div>

        <div className="space-y-0.5">
          {bids.map((bid, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 relative">
              <div className="absolute inset-0 bg-emerald-500/10 origin-right" style={{ transform: `scaleX(${(5 - i) * 0.2})` }}></div>
              <span className="text-emerald-400 relative z-10">{bid.price}</span>
              <span className="text-right text-slate-300 relative z-10">{bid.amount}</span>
              <span className="text-right text-slate-400 relative z-10">{bid.total}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
