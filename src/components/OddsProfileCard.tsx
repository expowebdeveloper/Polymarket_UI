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

export function OddsProfileCard({ walletAddress, totalTrades }: { walletAddress: string; totalTrades?: number }) {
  const [data, setData] = useState<OddsProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [leftMetric, setLeftMetric] = useState<LeftMetric>('percent_of_trades');
  const [rightMetric, setRightMetric] = useState<RightMetric>('avg_pnl_per_trade');

  useEffect(() => {
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
  }, [walletAddress]);

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

  if (!data || data.total_trades === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-2xl shadow-[0_16px_60px_-24px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-28 w-[420px] -translate-x-1/2 rounded-full bg-sky-500/6 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Odds Profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Entry odds distribution across {(totalTrades || data.total_positions || data.total_trades).toLocaleString()} trades
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
