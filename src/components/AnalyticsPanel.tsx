import { useMemo } from 'react';
import { TrendingDown, BarChart3, Zap, Sparkles } from 'lucide-react';
import type { AnalyticsSummary } from '@/sim/types';

interface AnalyticsPanelProps {
  summary: AnalyticsSummary;
}

export default function AnalyticsPanel({ summary }: AnalyticsPanelProps) {
  const pct = summary.savingsPct;
  const savingsPositive = summary.savingsWh > 0;

  // Mini chart of the recent power samples (last ~60)
  const chart = useMemo(() => {
    const s = summary.samples.slice(-90);
    if (s.length < 2) return null;
    const w = 100;
    const h = 38;
    const maxW = Math.max(0.5, ...s.map((d) => Math.max(d.aeromindW, d.manualW)));
    const step = w / (s.length - 1);
    const line = (key: 'aeromindW' | 'manualW') =>
      s
        .map((d, i) => `${(i * step).toFixed(2)},${(h - (d[key] / maxW) * h).toFixed(2)}`)
        .join(' ');
    return { w, h, manual: line('manualW'), aero: line('aeromindW'), maxW };
  }, [summary.samples]);

  const fmt = (wh: number) =>
    wh < 1 ? `${(wh * 1000).toFixed(1)} mWh` : `${wh.toFixed(3)} Wh`;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-500/15 text-mint-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Energy analytics</h3>
            <p className="text-[10px] text-white/45">AeroMind vs. typical manual use</p>
          </div>
        </div>
        <span className="rounded-full bg-mint-500/10 px-2 py-0.5 text-[10px] font-semibold text-mint-400">
          simulated
        </span>
      </div>

      {/* Savings hero */}
      <div className="relative overflow-hidden rounded-xl border border-mint-500/20 bg-gradient-to-br from-mint-500/10 to-transparent p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mint-400">
              <TrendingDown className="h-3.5 w-3.5" />
              Energy savings
            </p>
            <p className="mt-1 font-mono text-3xl font-extrabold text-mint-400">
              {pct.toFixed(0)}%
            </p>
            <p className="text-[11px] text-white/55">
              {fmt(summary.savingsWh)} saved over {Math.round(summary.runSeconds)}s of sim time
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-white/40">adjusts avoided</p>
            <p className="font-mono text-2xl font-bold text-white">{summary.manualAdjustsAvoided}</p>
            <p className="text-[10px] text-white/40">manual tweaks AeroMind made for you</p>
          </div>
        </div>
        {!savingsPositive && (
          <p className="mt-2 text-[10px] text-white/45">
            Savings build up once AeroMind can turn off or dial down vs. a constant manual setting.
          </p>
        )}
      </div>

      {/* Comparison bars */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-mint-400">
            <Sparkles className="h-3 w-3" /> AeroMind
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-mint-400">{fmt(summary.aeromindWh)}</p>
          <p className="text-[10px] text-white/40">cumulative estimated</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sun-400">
            <Zap className="h-3 w-3" /> Manual baseline
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-sun-400">{fmt(summary.manualWh)}</p>
          <p className="text-[10px] text-white/40">cumulative estimated</p>
        </div>
      </div>

      {/* Live power chart */}
      <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Live power draw (W)
        </p>
        {chart ? (
          <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="h-20 w-full" preserveAspectRatio="none">
            <polyline
              points={chart.manual}
              fill="none"
              stroke="#ff9326"
              strokeWidth="1.4"
              opacity="0.8"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={chart.aero}
              fill="none"
              stroke="#3ad6a0"
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <div className="flex h-20 items-center justify-center text-[11px] text-white/35">
            accumulating…
          </div>
        )}
        <div className="mt-1 flex items-center gap-4 text-[10px] text-white/50">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 rounded-full bg-mint-400" /> AeroMind
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 rounded-full bg-sun-500" /> Manual
          </span>
        </div>
      </div>
    </div>
  );
}
