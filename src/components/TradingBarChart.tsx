import { TrendingUp } from "lucide-react";


export function TradingBarChart() {
  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];
  const indicators = ["MA", "EMA", "RSI", "MACD", "BB"];

  // Example bar data (you can replace with real API values)
  const bars = [40, 80, 55, 95, 60, 100, 30, 70, 50, 90, 45];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800">
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Total Market Volume By Category </h2>

            <div className="flex items-center gap-4 mt-1">
              <span className="text-3xl font-bold text-emerald-400">
                $67,842.50
              </span>

              <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +2.45% (+$1,623.45)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {timeframes.map((tf) => (
              <button
                key={tf}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${tf === "1h"
                    ? "bg-emerald-400/20 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800"
                  }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* INDICATORS */}
        <div className="flex items-center gap-2">
          {indicators.map((indicator) => (
            <button
              key={indicator}
              className="px-3 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400 hover:bg-slate-700 transition"
            >
              {indicator}
            </button>
          ))}
        </div>
      </div>

      {/* CHART SECTION */}
      <div className="p-4 h-96 flex items-center justify-center relative overflow-hidden">
        {/* Horizontal Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-4 px-4">
          {[100, 75, 50, 25, 0].map((v) => (
            <div
              key={v}
              className="flex items-center justify-between text-xs text-slate-600"
            >
              <span>{v}</span>
              <div className="flex-1 mx-4 border-t border-slate-800/50"></div>
            </div>
          ))}
        </div>

        {/* SVG BAR GRAPH */}
        <svg
          className="w-full h-full"
          viewBox="0 0 800 300"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="barFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {bars.map((value, i) => {
            const barWidth = 40;
            const gap = 25;
            const x = i * (barWidth + gap);
            const height = (value / 100) * 260;
            const y = 280 - height;

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={height}
                fill="url(#barFill)"
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
                rx="4"
              />
            );
          })}
        </svg>

        {/* X Axis Time Labels */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-slate-600">
          {[
            "00:00",
            "04:00",
            "08:00",
            "12:00",
            "16:00",
            "20:00",
            "24:00",
          ].map((time) => (
            <span key={time}>{time}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
