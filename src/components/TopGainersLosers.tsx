import React from "react";

const data = [
  {
    rank: 1,
    trader: "0x82a...7b1c",
    roi: "+342.8%",
    roiColor: "text-emerald-400",
    winRate: "89.2%",
    volume: "$487K",
    markets: 18,
    status: "Whale",
    statusColor: "bg-yellow-500/20 text-yellow-400",
  },
  {
    rank: 2,
    trader: "0x3c4d...9a8e",
    roi: "+278.5%",
    roiColor: "text-emerald-400",
    winRate: "82.1%",
    volume: "$312K",
    markets: 24,
    status: "Top 10",
    statusColor: "bg-blue-500/20 text-blue-300",
  },
  {
    rank: 3,
    trader: "0x7a8f...2b3c",
    roi: "+127.3%",
    roiColor: "text-emerald-400",
    winRate: "73.8%",
    volume: "$245K",
    markets: 12,
    status: "Hot Streak",
    statusColor: "bg-pink-500/20 text-pink-300",
  },
  {
    rank: 4,
    trader: "0x1b2c...5f6g",
    roi: "+98.7%",
    roiColor: "text-emerald-400",
    winRate: "67.3%",
    volume: "$189K",
    markets: 15,
    status: "Rising",
    statusColor: "bg-green-500/20 text-green-300",
  },
  {
    rank: 5,
    trader: "0x98e4...4f31",
    roi: "+76.2%",
    roiColor: "text-emerald-400",
    winRate: "71.5%",
    volume: "$156K",
    markets: 21,
    status: "Active",
    statusColor: "bg-slate-500/20 text-slate-300",
  },
  {
    rank: 198,
    trader: "0x6j7x...2m3n",
    roi: "-45.8%",
    roiColor: "text-red-400",
    winRate: "32.1%",
    volume: "$78K",
    markets: 9,
    status: "At Risk",
    statusColor: "bg-orange-500/20 text-orange-300",
  },
  {
    rank: 199,
    trader: "0x4p5q...8r9s",
    roi: "-52.3%",
    roiColor: "text-red-400",
    winRate: "28.7%",
    volume: "$45K",
    markets: 6,
    status: "Losing Streak",
    statusColor: "bg-red-500/20 text-red-300",
  },
];

export function TopGainersLosers() {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-6 w-full overflow-x-auto shadow-lg mt-4">
      {/* Title Section */}
      <h2 className="text-lg font-semibold text-slate-200 mb-1">
        Top Gainers & Losers
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        Sorted by ROI performance
      </p>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
            <th className="py-2">RANK</th>
            <th className="py-2">TRADER</th>
            <th className="py-2">ROI %</th>
            <th className="py-2">WIN RATE</th>
            <th className="py-2">VOLUME</th>
            <th className="py-2">MARKETS</th>
            <th className="py-2">STATUS</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-slate-800 text-sm text-slate-300 hover:bg-slate-800/40 transition"
            >
              <td className="py-3 font-semibold flex items-center gap-1">
                {row.rank <= 3 && (
                  <>
                    {row.rank === 1 && <span className="text-yellow-400">🥇</span>}
                    {row.rank === 2 && <span className="text-gray-400">🥈</span>}
                    {row.rank === 3 && <span className="text-yellow-600">🥉</span>}
                  </>
                )}
                {row.rank}
              </td>

              <td>{row.trader}</td>

              <td className={`${row.roiColor} font-medium`}>{row.roi}</td>

              <td>{row.winRate}</td>

              <td>{row.volume}</td>

              <td>{row.markets}</td>

              <td>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${row.statusColor}`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
