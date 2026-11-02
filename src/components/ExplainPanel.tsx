import { Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Decision } from '@/sim/types';

interface ExplainPanelProps {
  decision: Decision;
}

export default function ExplainPanel({ decision }: ExplainPanelProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-breeze-500/15 text-breeze-400">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Why AeroMind chose this</h3>
          <p className="text-[10px] text-white/45">Explainable decision trace</p>
        </div>
      </div>

      <div
        className={`rounded-xl border p-3 ${
          decision.fanOn
            ? 'border-mint-500/20 bg-mint-500/5'
            : 'border-white/10 bg-ink-900/40'
        }`}
      >
        <div className="flex items-center gap-2">
          {decision.fanOn ? (
            <CheckCircle2 className="h-4 w-4 text-mint-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-white/60" />
          )}
          <span className="text-xs font-semibold text-white">
            {decision.mode === 'auto' ? 'Auto decision' : 'Manual override'}
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {decision.reason.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-white/70">
              <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-breeze-400" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {decision.zones.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Occupied zones detected
          </p>
          <div className="flex flex-col gap-1.5">
            {decision.zones.map((z) => (
              <div
                key={z.id}
                className="flex items-center justify-between rounded-lg bg-ink-800/50 px-2.5 py-1.5"
              >
                <span className="flex items-center gap-2 text-xs text-white/80">
                  <span className="inline-block h-2 w-2 rounded-full bg-mint-400" />
                  {z.label}
                </span>
                <span className="font-mono text-[11px] text-white/55">
                  {Math.round(z.angle)}° · {Math.round(z.distance * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-white/35">
        All readings are simulated. The same rule engine could run on a real BLDC fan controller
        given temperature, humidity, and occupancy sensors.
      </p>
    </div>
  );
}
