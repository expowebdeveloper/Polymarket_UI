import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

interface TradeData {
  date: string;
  pnl: number;
  cumulativePnl: number;
}

interface TradePerformanceGraphProps {
  trades: TradeData[];
}

export function TradePerformanceGraph({ trades }: TradePerformanceGraphProps) {
  const { theme } = useTheme();

  if (!trades || trades.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-600 dark:text-slate-400">
        No trade data available
      </div>
    );
  }

  const textColor = theme === 'dark' ? '#cbd5e1' : '#475569';
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const bgColor = theme === 'dark' ? '#1e293b' : '#ffffff';

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={trades}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={textColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: textColor }}
          />
          <YAxis
            stroke={textColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: textColor }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: bgColor,
              border: `1px solid ${gridColor}`,
              borderRadius: '8px',
              color: textColor,
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative PnL']}
            labelStyle={{ color: textColor }}
          />
          <Area
            type="monotone"
            dataKey="cumulativePnl"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorPnl)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


