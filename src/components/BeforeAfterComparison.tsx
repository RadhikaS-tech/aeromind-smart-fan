import { useMemo, useState } from 'react';
import { GitCompareArrows, Zap, TrendingDown, Clock } from 'lucide-react';
import type {
  ComfortSettings,
  FanState,
  Mode,
  Occupant,
  SensorReadings,
} from '@/sim/types';
import { decide } from '@/sim/logic';
import { aeromindPower, manualBaselinePower } from '@/sim/energy';
import { projectEnergy } from '@/sim/report';

interface BeforeAfterComparisonProps {
  sensors: SensorReadings;
  occupants: Occupant[];
  manualFan: FanState;
  comfort: ComfortSettings;
}

const HORIZONS = [1, 8, 24] as const;
const HORIZON_LABELS: Record<number, string> = { 1: '1h', 8: '8h', 24: '24h' };

function fmtWh(wh: number): string {
  if (wh < 1) return `${(wh * 1000).toFixed(0)} mWh`;
  if (wh < 1000) return `${wh.toFixed(1)} Wh`;
  return `${(wh / 1000).toFixed(2)} kWh`;
}

export default function BeforeAfterComparison({
  sensors,
  occupants,
  manualFan,
  comfort,
}: BeforeAfterComparisonProps) {
  const [horizon, setHorizon] = useState<number>(8);

  // "Before" = manual baseline (user leaves fan at fixed speed)
  // "After" = AeroMind auto mode under the SAME conditions
  const present = occupants.some((o) => o.active);

  const { before, after, deltaWh, deltaPct } = useMemo(() => {
    const beforeProj = projectEnergy(
      sensors,
      occupants,
      'manual' as Mode,
      { ...manualFan, speed: 3, heading: 0, swing: 40, on: true },
      comfort,
      horizon,
    );
    const afterProj = projectEnergy(
      sensors,
      occupants,
      'auto' as Mode,
      manualFan,
      comfort,
      horizon,
    );
    const delta = Math.max(0, beforeProj.manualWh - afterProj.aeromindWh);
    const pct = beforeProj.manualWh > 0.0001 ? (delta / beforeProj.manualWh) * 100 : 0;
    return {
      before: beforeProj.manualWh,
      after: afterProj.aeromindWh,
      deltaWh: delta,
      deltaPct: pct,
    };
  }, [sensors, occupants, manualFan, comfort, horizon]);

  // Live power for the badge
  const autoDecision = decide('auto', sensors, occupants, manualFan, comfort);
  const liveAeroW = autoDecision.fanOn
    ? aeromindPower({
        ...manualFan,
        on: true,
        speed: autoDecision.speed,
        swing: autoDecision.swing,
      })
    : 0;
  const liveManualW = manualBaselinePower(present);

  const maxWh = Math.max(before, after, 0.001);
  const beforeBar = (before / maxWh) * 100;
  const afterBar = (after / maxWh) * 100;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sun-500/15 text-sun-400">
            <GitCompareArrows className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Before / after</h3>
            <p className="text-[10px] text-white/45">Manual baseline vs. AeroMind auto</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-ink-900/60 p-0.5">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                horizon === h
                  ? 'bg-sun-500/20 text-sun-300'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {HORIZON_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      {/* Delta hero */}
      <div className="relative overflow-hidden rounded-xl border border-mint-500/20 bg-gradient-to-br from-mint-500/10 to-transparent p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-mint-400">
          <TrendingDown className="h-3 w-3" />
          Energy reduction
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-extrabold text-mint-400">
            {deltaPct.toFixed(0)}%
          </span>
          <span className="text-[11px] text-white/55">= {fmtWh(deltaWh)} saved</span>
        </div>
        <p className="text-[10px] text-white/40">
          over {HORIZON_LABELS[horizon]} · same room, same sensors, same occupants
        </p>
      </div>

      {/* Side-by-side bars */}
      <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
        <div className="flex items-end justify-between gap-4" style={{ height: 120 }}>
          {/* Before */}
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-sun-400">{fmtWh(before)}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-sun-600 to-sun-400 transition-all duration-500"
                style={{ height: `${Math.max(3, beforeBar)}%` }}
              />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-sun-400">
              <Zap className="h-2.5 w-2.5" /> Before
            </span>
          </div>
          {/* Arrow */}
          <div className="flex flex-col items-center self-center">
            <GitCompareArrows className="h-5 w-5 text-white/30" />
          </div>
          {/* After */}
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-mint-400">{fmtWh(after)}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-mint-600 to-mint-400 transition-all duration-500"
                style={{ height: `${Math.max(3, afterBar)}%` }}
              />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-mint-400">
              <Zap className="h-2.5 w-2.5" /> After
            </span>
          </div>
        </div>
      </div>

      {/* Live power context */}
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-900/40 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          <Clock className="h-3 w-3" /> Live power now
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="font-mono font-bold text-sun-400">{liveManualW.toFixed(1)}W</span>
          <span className="text-white/30">→</span>
          <span className="font-mono font-bold text-mint-400">{liveAeroW.toFixed(1)}W</span>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-white/35">
        "Before" assumes a typical user leaves the fan at speed 3. "After" is AeroMind in auto mode
        under identical conditions — so the only difference is the intelligence layer.
      </p>
    </div>
  );
}
