import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { API_BASE_URL } from '../config';
import { headersWithNgrokSkip } from '../services/api';

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

type DistributionMetric = 'percent_of_trades' | 'percent_of_volume' | 'hit_rate';
type PerformanceMetric = 'avg_pnl_per_trade' | 'hit_rate' | 'avg_size';

type MetricMeta = {
  key: DistributionMetric | PerformanceMetric;
  label: string;
};

const DISTRIBUTION_METRICS: MetricMeta[] = [
  { key: 'percent_of_trades', label: '% Trades' },
  { key: 'percent_of_volume', label: '% Volume' },
  { key: 'hit_rate', label: 'Hit Rate' },
];

const PERFORMANCE_METRICS: MetricMeta[] = [
  { key: 'avg_pnl_per_trade', label: 'Avg PnL' },
  { key: 'hit_rate', label: 'Hit Rate' },
  { key: 'avg_size', label: 'Avg Size' },
];

const DISTRIBUTION_GRADIENTS = Array(7).fill('from-[#6C63FF] via-[#7F8CFF] to-[#9EE7F7]');

const PERFORMANCE_POSITIVE = '#8FE29C';
const PERFORMANCE_NEGATIVE = '#E57C73';
const PERFORMANCE_NEUTRAL = '#7dd3fc';
const PERFORMANCE_BUCKET_COLORS = [
  '#d6615d',
  '#d8843d',
  '#d2b046',
  '#63b264',
  '#68b7d7',
  '#6e6ad9',
  '#8a67ec',
];

function fmtPercent(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtCompactPercent(v: number): string {
  const pct = v * 100;
  const rounded = Math.round(pct);
  if (Math.abs(pct - rounded) < 0.05) {
    return `${rounded}%`;
  }
  return `${pct.toFixed(1)}%`;
}

function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtMetricValue(metric: DistributionMetric | PerformanceMetric, value: number): string {
  if (metric === 'percent_of_trades' || metric === 'percent_of_volume' || metric === 'hit_rate') {
    return fmtCompactPercent(value);
  }
  return fmtMoney(value);
}

function displayBucketLabel(bucket: OddsBucket): string {
  return `${Math.round(bucket.min_odds)}-${Math.round(bucket.max_odds)}c`;
}

function MiniTooltip({
  active, payload, label, formatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0f1d]/95 px-3 py-2 text-xs text-white shadow-2xl backdrop-blur-xl">
      <div className="mb-1 text-white/45">{label}</div>
      <div className="font-semibold text-white">{formatter(payload[0].value)}</div>
    </div>
  );
}

function SegmentTabs<T extends string>({
  options,
  active,
  onChange,
  activeClassName,
}: {
  options: Array<{ key: T; label: string }>;
  active: T;
  onChange: (key: T) => void;
  activeClassName: string;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {options.map((option) => {
        const isActive = active === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-xl px-4 py-2 text-xs font-medium tracking-wide transition-all duration-300 ${
              isActive
                ? `${activeClassName} shadow-[0_8px_24px_rgba(0,0,0,0.24)]`
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function InsightBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{title}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function OddsProfileCard({
  walletAddress,
  totalTrades,
  closedPositions,
}: {
  walletAddress: string;
  totalTrades?: number;
  closedPositions?: any[];
}) {
  const [data, setData] = useState<OddsProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [distributionMetric, setDistributionMetric] = useState<DistributionMetric>('percent_of_trades');
  const [performanceMetric, setPerformanceMetric] = useState<PerformanceMetric>('avg_pnl_per_trade');
  const [hoveredDistributionKey, setHoveredDistributionKey] = useState<string | null>(null);

  useEffect(() => {
    if (closedPositions && closedPositions.length > 0) {
      const bucketDefs = [
        { bucket: '0-10', min: 0, max: 10 },
        { bucket: '10-25', min: 10, max: 25 },
        { bucket: '25-40', min: 25, max: 40 },
        { bucket: '40-60', min: 40, max: 60 },
        { bucket: '60-75', min: 60, max: 75 },
        { bucket: '75-90', min: 75, max: 90 },
        { bucket: '90-100', min: 90, max: 100 },
      ];
      const groups: Record<string, { trades: number; stake: number; pnl: number; wins: number }> = {};
      bucketDefs.forEach((b) => {
        groups[b.bucket] = { trades: 0, stake: 0, pnl: 0, wins: 0 };
      });

      let totalT = 0;
      let totalS = 0;
      let totalP = 0;

      for (const pos of closedPositions) {
        const price = parseFloat(pos.avgPrice || pos.avg_price || pos.price || '0');
        if (!price || price <= 0) continue;
        const odds = price > 1 ? price : price * 100;
        if (odds < 0 || odds > 100) continue;

        const bucketName = bucketDefs.find((b) => (
          b.max === 100 ? odds >= b.min && odds <= b.max : odds >= b.min && odds < b.max
        ))?.bucket;
        if (!bucketName) continue;

        const bought = parseFloat(pos.totalBought || pos.total_bought || pos.size || '0');
        const stake = price <= 1 ? bought * price : bought;
        const pnl = parseFloat(pos.realizedPnl || pos.realized_pnl || pos.pnl || '0');
        if (!isFinite(stake) || !isFinite(pnl)) continue;

        groups[bucketName].trades += 1;
        groups[bucketName].stake += stake;
        groups[bucketName].pnl += pnl;
        if (pnl > 0) groups[bucketName].wins += 1;
        totalT += 1;
        totalS += stake;
        totalP += pnl;
      }

      const safeDiv = (n: number, d: number) => (d === 0 ? 0 : n / d);
      const buckets = bucketDefs.map((b) => {
        const g = groups[b.bucket];
        return {
          bucket: b.bucket,
          label: `${b.min}-${b.max}c`,
          min_odds: b.min,
          max_odds: b.max,
          trade_count: g.trades,
          total_stake: g.stake,
          total_pnl: g.pnl,
          percent_of_trades: safeDiv(g.trades, totalT),
          percent_of_volume: safeDiv(g.stake, totalS),
          avg_pnl_per_trade: safeDiv(g.pnl, g.trades),
          hit_rate: safeDiv(g.wins, g.trades),
          avg_size: safeDiv(g.stake, g.trades),
          percent_of_total_pnl: totalP > 0 ? safeDiv(g.pnl, totalP) : null,
        };
      });

      const tags: string[] = [];
      setData({
        buckets,
        tags,
        total_trades: totalT,
        total_positions: closedPositions.length,
        skipped_no_odds: closedPositions.length - totalT,
        total_stake: totalS,
        total_pnl: totalP,
      });
      setLoading(false);
      return;
    }

    if (!walletAddress) return;
    const ac = new AbortController();
    const doFetch = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard/odds-profile/${walletAddress}`, {
          signal: ac.signal,
          headers: headersWithNgrokSkip(`${API_BASE_URL}/dashboard/odds-profile`, { accept: 'application/json' }),
        });
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

  const distributionData = useMemo(() => {
    if (!data?.buckets) return [];
    return data.buckets.map((bucket) => ({
      key: bucket.bucket,
      label: displayBucketLabel(bucket),
      value: bucket[distributionMetric],
    }));
  }, [data, distributionMetric]);

  const performanceData = useMemo(() => {
    if (!data?.buckets) return [];
    return data.buckets.map((bucket) => ({
      key: bucket.bucket,
      label: displayBucketLabel(bucket),
      value: bucket[performanceMetric],
    }));
  }, [data, performanceMetric]);

  const distributionExtremes = useMemo(() => {
    if (!distributionData.length) return { best: 'N/A', worst: 'N/A' };
    const best = distributionData.reduce((max, row) => (row.value > max.value ? row : max), distributionData[0]);
    const worst = distributionData.reduce((min, row) => (row.value < min.value ? row : min), distributionData[0]);
    return { best: best.label, worst: worst.label };
  }, [distributionData]);

  const performanceExtremes = useMemo(() => {
    if (!performanceData.length) return { best: 'N/A', worst: 'N/A' };
    const best = performanceData.reduce((max, row) => (row.value > max.value ? row : max), performanceData[0]);
    const worst = performanceData.reduce((min, row) => (row.value < min.value ? row : min), performanceData[0]);
    return { best: best.label, worst: worst.label };
  }, [performanceData]);

  const distributionMax = useMemo(
    () => Math.max(...distributionData.map((row) => row.value), 0.0001),
    [distributionData],
  );

  const performanceDomain = useMemo(() => {
    if (!performanceData.length) return [-1, 1];
    const maxAbs = Math.max(...performanceData.map((row) => Math.abs(row.value)), 1);
    return [-maxAbs * 1.15, maxAbs * 1.15];
  }, [performanceData]);

  const performanceTooltipFormatter = (value: number) => fmtMetricValue(performanceMetric, value);
  const distributionTooltipFormatter = (value: number) => fmtMetricValue(distributionMetric, value);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(4,8,20,0.96))] p-7 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        <div className="flex items-center justify-center py-20">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-cyan-400" />
          <span className="ml-4 text-sm text-slate-300">Loading odds profile...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;
  if (data.total_trades === 0 && !closedPositions?.length) return null;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.10),_transparent_38%),linear-gradient(180deg,rgba(10,15,29,0.98),rgba(6,10,22,0.98))] p-4 sm:p-5 lg:p-6 shadow-[0_26px_80px_-36px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -top-12 right-1/4 h-32 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-12 h-20 w-64 rounded-full bg-cyan-400/5 blur-3xl" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-white">Odds Profile</h3>
          <p className="mt-1 text-sm text-slate-400">
            Entry odds distribution across {data.total_trades.toLocaleString()} trades
            {totalTrades && totalTrades > data.total_trades && (
              <span className="text-slate-500"> out of {totalTrades.toLocaleString()}</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Distribution</p>
            <SegmentTabs
              options={DISTRIBUTION_METRICS as Array<{ key: DistributionMetric; label: string }>}
              active={distributionMetric}
              onChange={setDistributionMetric}
              activeClassName="bg-indigo-500/25 text-indigo-100 border border-indigo-300/20"
            />
          </div>

          <div className="space-y-5">
            {distributionData.map((row, index) => {
              const percent = distributionMax > 0 ? (row.value / distributionMax) * 100 : 0;
              const isHovered = hoveredDistributionKey === row.key;
              return (
                <div
                  key={row.key}
                  className={`relative rounded-2xl px-2 transition-all duration-300 ${
                    isHovered ? 'bg-white/[0.035] shadow-[0_12px_32px_-24px_rgba(125,211,252,0.55)]' : ''
                  }`}
                  onMouseEnter={() => setHoveredDistributionKey(row.key)}
                  onMouseLeave={() => setHoveredDistributionKey(null)}
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{row.label}</span>
                    <span
                      className={`font-medium transition-all duration-300 ${
                        isHovered ? 'translate-x-0 scale-[1.03] text-cyan-100' : 'text-white'
                      }`}
                    >
                      {fmtMetricValue(distributionMetric, row.value)}
                    </span>
                  </div>
                  <div className="relative">
                    <div
                      className={`pointer-events-none absolute -top-16 z-10 -translate-x-1/2 transform transition-all duration-300 ${
                        isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                      }`}
                      style={{ left: `${Math.min(Math.max(percent, 8), 92)}%` }}
                    >
                      <div className="rounded-2xl border border-white/10 bg-[#080d18]/95 px-3 py-2 text-center shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl">
                        <div className="text-[11px] text-white/45">{row.label}</div>
                        <div className="mt-1 text-sm font-semibold text-white">{fmtMetricValue(distributionMetric, row.value)}</div>
                      </div>
                    </div>
                    <div
                      className={`h-4 overflow-hidden rounded-full bg-white/[0.07] ring-1 ring-white/5 transition-all duration-300 ${
                        isHovered ? 'bg-white/[0.09] ring-cyan-300/15' : ''
                      }`}
                    >
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${DISTRIBUTION_GRADIENTS[index]} transition-all duration-500 ease-out ${
                          isHovered ? 'brightness-110 saturate-125' : ''
                        }`}
                        style={{
                          width: `${Math.max(percent, 0)}%`,
                          boxShadow: isHovered ? '0 0 22px rgba(125, 211, 252, 0.28)' : 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InsightBox title="Best Bucket" value={distributionExtremes.best} />
            <InsightBox title="Worst Bucket" value={distributionExtremes.worst} />
          </div>
        </section>

        <section className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Performance</p>
            <SegmentTabs
              options={PERFORMANCE_METRICS as Array<{ key: PerformanceMetric; label: string }>}
              active={performanceMetric}
              onChange={setPerformanceMetric}
              activeClassName="bg-emerald-500/20 text-emerald-100 border border-emerald-300/20"
            />
          </div>

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 18, right: 8, left: 0, bottom: 44 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(148,163,184,0.92)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  height={68}
                />
                <YAxis
                  tick={{ fill: 'rgba(148,163,184,0.82)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  domain={performanceDomain}
                  tickFormatter={(v) => {
                    if (performanceMetric === 'hit_rate') return `${Math.round(v * 100)}%`;
                    if (performanceMetric === 'avg_size') return fmtMoney(v);
                    return typeof v === 'number' ? `${v > 0 ? '+' : ''}${Math.round(v)}` : `${v}`;
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  content={(props: any) => <MiniTooltip {...props} formatter={performanceTooltipFormatter} />}
                />
                <Bar dataKey="value" radius={[14, 14, 0, 0]} barSize={40} animationDuration={350}>
                  {performanceData.map((entry, index) => {
                    const fill =
                      performanceMetric === 'avg_pnl_per_trade'
                        ? entry.value > 0
                          ? PERFORMANCE_POSITIVE
                          : entry.value < 0
                            ? PERFORMANCE_NEGATIVE
                            : PERFORMANCE_NEUTRAL
                        : PERFORMANCE_BUCKET_COLORS[index] ?? PERFORMANCE_NEUTRAL;
                    return <Cell key={entry.key} fill={fill} fillOpacity={0.95} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InsightBox title="Best Bucket" value={performanceExtremes.best} />
            <InsightBox title="Worst Bucket" value={performanceExtremes.worst} />
          </div>
        </section>
      </div>
    </div>
  );
}
