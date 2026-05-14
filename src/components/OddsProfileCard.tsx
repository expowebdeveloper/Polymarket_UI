import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { API_BASE_URL } from '../config';
import { headersWithNgrokSkip } from '../services/api';

// Types
interface OddsBucket {
  bucket: string;
  label: string;
  min_odds: number;
  max_odds: number;
  trade_count: number;
  total_stake: number;
  total_pnl: number;
  percent_of_trades: number;
  percent_of_volume: number;
  avg_pnl_per_trade: number;
  hit_rate: number;
  avg_size: number;
  percent_of_total_pnl: number | null;
}

interface OddsProfileData {
  buckets: OddsBucket[];
  tags: string[];
  total_trades: number;
  total_positions: number;
  skipped_no_odds: number;
  total_stake: number;
  total_pnl: number;
}

type LeftMetric = 'percent_of_trades' | 'percent_of_volume' | 'percent_of_total_pnl';
type RightMetric = 'avg_pnl_per_trade' | 'hit_rate' | 'avg_size';

// Formatters
function fmtPercent(v: number): string { return `${(v * 100).toFixed(1)}%`; }
function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

const BUCKET_COLORS = [
  '#ef4444', // 0-10  red (contrarian)
  '#f97316', // 10-25 orange
  '#eab308', // 25-40 yellow
  '#22c55e', // 40-60 green (balanced)
  '#06b6d4', // 60-75 cyan
  '#6366f1', // 75-90 indigo
  '#8b5cf6', // 90-100 violet (bond)
];

function MiniTooltip({
  active, payload, label, formatter,
}: {
  active?: boolean; payload?: any[]; label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur">
      <div className="text-white/60 mb-1">{label}</div>
      <div className="font-semibold">{formatter(payload[0].value)}</div>
    </div>
  );
}

function TabButton({
  active, label, onClick,
}: {
  active: boolean; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-[11px] font-medium transition ${
        active ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-white/40 hover:text-white/60'
      }`}
    >
      {label}
    </button>
  );
}

export function OddsProfileCard({ walletAddress, totalTrades, closedPositions }: { walletAddress: string; totalTrades?: number; closedPositions?: any[] }) {
  const [data, setData] = useState<OddsProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [leftMetric, setLeftMetric] = useState<LeftMetric>('percent_of_trades');
  const [rightMetric, setRightMetric] = useState<RightMetric>('avg_pnl_per_trade');

  // Compute odds profile client-side if closed positions are passed, else fetch from API
  useEffect(() => {
    if (closedPositions && closedPositions.length > 0) {
      // Client-side calculation using same data as the profile page
      const bucketDefs = [
        { bucket: "0-10", label: "Contrarian", min: 0, max: 10 },
        { bucket: "10-25", label: "10–25c", min: 10, max: 25 },
        { bucket: "25-40", label: "25–40c", min: 25, max: 40 },
        { bucket: "40-60", label: "Balanced", min: 40, max: 60 },
        { bucket: "60-75", label: "60–75c", min: 60, max: 75 },
        { bucket: "75-90", label: "75–90c", min: 75, max: 90 },
        { bucket: "90-100", label: "Bond Trader", min: 90, max: 100 },
      ];
      const groups: Record<string, { trades: number; stake: number; pnl: number; wins: number }> = {};
      bucketDefs.forEach(b => { groups[b.bucket] = { trades: 0, stake: 0, pnl: 0, wins: 0 }; });

      let totalT = 0, totalS = 0, totalP = 0;

      for (const pos of closedPositions) {
        const price = parseFloat(pos.avgPrice || pos.avg_price || pos.price || '0');
        if (!price || price <= 0) continue;
        const odds = price > 1 ? price : price * 100;
        if (odds < 0 || odds > 100) continue;

        const bucketName = bucketDefs.find(b =>
          b.max === 100 ? (odds >= b.min && odds <= b.max) : (odds >= b.min && odds < b.max)
        )?.bucket;
        if (!bucketName) continue;

        const bought = parseFloat(pos.totalBought || pos.total_bought || pos.size || '0');
        const stake = price <= 1 ? bought * price : bought;
        const pnl = parseFloat(pos.realizedPnl || pos.realized_pnl || pos.pnl || '0');
        if (!isFinite(stake) || !isFinite(pnl)) continue;

        groups[bucketName].trades += 1;
        groups[bucketName].stake += stake;
        groups[bucketName].pnl += pnl;
        if (pnl > 0) groups[bucketName].wins += 1;
        totalT++; totalS += stake; totalP += pnl;
      }

      const safeDiv = (n: number, d: number) => d === 0 ? 0 : n / d;
      const buckets = bucketDefs.map(b => {
        const g = groups[b.bucket];
        return {
          bucket: b.bucket, label: b.label, min_odds: b.min, max_odds: b.max,
          trade_count: g.trades, total_stake: g.stake, total_pnl: g.pnl,
          percent_of_trades: safeDiv(g.trades, totalT),
          percent_of_volume: safeDiv(g.stake, totalS),
          avg_pnl_per_trade: safeDiv(g.pnl, g.trades),
          hit_rate: safeDiv(g.wins, g.trades),
          avg_size: safeDiv(g.stake, g.trades),
          percent_of_total_pnl: totalP > 0 ? safeDiv(g.pnl, totalP) : null,
        };
      });

      const tags: string[] = [];
      const c = buckets.find(b => b.bucket === '0-10');
      const bd = buckets.find(b => b.bucket === '90-100');
      if (c && c.percent_of_trades >= 0.5) tags.push('contrarian');
      if (bd && bd.percent_of_trades >= 0.5) tags.push('bond_trader');

      setData({ buckets, tags, total_trades: totalT, total_positions: closedPositions.length, skipped_no_odds: closedPositions.length - totalT, total_stake: totalS, total_pnl: totalP });
      setLoading(false);
      return;
    }

    if (!walletAddress) return;
    const ac = new AbortController();
    const doFetch = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/dashboard/odds-profile/${walletAddress}`,
          { signal: ac.signal, headers: headersWithNgrokSkip(`${API_BASE_URL}/dashboard/odds-profile`, { accept: 'application/json' }) }
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') console.error('Odds profile fetch error:', err);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    doFetch();
    return () => ac.abort();
  }, [walletAddress, closedPositions?.length]);

  // Left chart data (horizontal bars)
  const leftChartData = useMemo(() => {
    if (!data?.buckets) return [];
    return data.buckets.map((b) => ({
      name: b.label,
      value: leftMetric === 'percent_of_total_pnl' ? (b.percent_of_total_pnl ?? 0) : b[leftMetric],
    }));
  }, [data, leftMetric]);

  // Right chart data (vertical bars)
  const rightChartData = useMemo(() => {
    if (!data?.buckets) return [];
    return data.buckets.map((b) => ({
      name: b.label,
      value: b[rightMetric],
    }));
  }, [data, rightMetric]);

  const leftFormatter = (v: number) => {
    return fmtPercent(v);
  };

  const rightFormatter = (v: number) => {
    if (rightMetric === 'hit_rate') return fmtPercent(v);
    return fmtMoney(v);
  };

  const rightTickFormatter = (v: number) => {
    if (rightMetric === 'hit_rate') return `${(v * 100).toFixed(0)}%`;
    return fmtMoney(v);
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-2xl">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-sky-400" />
          <span className="ml-3 text-sm text-white/40">Loading odds profile...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;
  if (data.total_trades === 0 && !closedPositions?.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-2xl shadow-[0_16px_60px_-24px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-28 w-[420px] -translate-x-1/2 rounded-full bg-sky-500/6 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Odds Profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Entry odds distribution across {data.total_trades.toLocaleString()} trades
            {totalTrades && totalTrades > data.total_trades && (
              <span className="text-white/20"> out of {totalTrades.toLocaleString()}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                tag === 'contrarian'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-violet-500/30 bg-violet-500/10 text-violet-400'
              }`}
            >
              {tag === 'contrarian' ? 'Contrarian' : 'Bond Trader'}
            </span>
          ))}
        </div>
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Horizontal bars (% metrics) */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Distribution</p>
            <div className="flex gap-1">
              <TabButton active={leftMetric === 'percent_of_trades'} label="% Trades" onClick={() => setLeftMetric('percent_of_trades')} />
              <TabButton active={leftMetric === 'percent_of_volume'} label="% Volume" onClick={() => setLeftMetric('percent_of_volume')} />
              <TabButton active={leftMetric === 'percent_of_total_pnl'} label="% PnL" onClick={() => setLeftMetric('percent_of_total_pnl')} />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leftChartData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <XAxis
                  type="number"
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.60)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={(props: any) => <MiniTooltip {...props} formatter={leftFormatter} />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                  {leftChartData.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT — Vertical bars (performance metrics) */}
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Performance</p>
            <div className="flex gap-1">
              <TabButton active={rightMetric === 'avg_pnl_per_trade'} label="Avg PnL" onClick={() => setRightMetric('avg_pnl_per_trade')} />
              <TabButton active={rightMetric === 'hit_rate'} label="Hit Rate" onClick={() => setRightMetric('hit_rate')} />
              <TabButton active={rightMetric === 'avg_size'} label="Avg Size" onClick={() => setRightMetric('avg_size')} />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rightChartData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-40}
                  textAnchor="end"
                  height={60}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={rightTickFormatter}
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={(props: any) => <MiniTooltip {...props} formatter={rightFormatter} />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={28}>
                  {rightChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        rightMetric === 'avg_pnl_per_trade'
                          ? (entry.value >= 0 ? '#22c55e' : '#ef4444')
                          : BUCKET_COLORS[i]
                      }
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
