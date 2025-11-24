interface RecentTradesProps {
  symbol: string;
}

const trades = [
  { price: '67,842.50', amount: '0.0234', time: '14:32:45', isBuy: true },
  { price: '67,841.20', amount: '0.1456', time: '14:32:42', isBuy: false },
  { price: '67,843.00', amount: '0.0567', time: '14:32:40', isBuy: true },
  { price: '67,840.50', amount: '0.2345', time: '14:32:38', isBuy: false },
  { price: '67,842.00', amount: '0.0890', time: '14:32:35', isBuy: true },
  { price: '67,841.50', amount: '0.1234', time: '14:32:33', isBuy: true },
  { price: '67,839.00', amount: '0.3456', time: '14:32:30', isBuy: false },
];

export function RecentTrades({ symbol }: RecentTradesProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Recent Trades</h3>

      <div className="text-xs">
        <div className="grid grid-cols-3 gap-2 text-slate-500 mb-1">
          <span>Price (USD)</span>
          <span className="text-right">Amount (BTC)</span>
          <span className="text-right">Time</span>
        </div>

        <div className="space-y-0.5">
          {trades.map((trade, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <span className={trade.isBuy ? 'text-emerald-400' : 'text-red-400'}>
                {trade.price}
              </span>
              <span className="text-right text-slate-300">{trade.amount}</span>
              <span className="text-right text-slate-400">{trade.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
