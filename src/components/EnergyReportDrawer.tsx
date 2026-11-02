import { useMemo, useState } from 'react';
import {
  X,
  FileText,
  TrendingDown,
  Zap,
  Leaf,
  DollarSign,
  Clock,
  Download,
  Lightbulb,
} from 'lucide-react';
import type { EnergyReportData } from '@/sim/types';
import { COST_PER_KWH, CO2_PER_KWH } from '@/sim/report';

interface EnergyReportDrawerProps {
  open: boolean;
  onClose: () => void;
  report: EnergyReportData | null;
}

const HORIZON_OPTIONS = [1, 8, 24, 168] as const; // 1h, 8h, 1 day, 1 week
const HORIZON_LABELS: Record<number, string> = {
  1: '1 hour',
  8: '8 hours',
  24: '1 day',
  168: '1 week',
};

function fmtWh(wh: number): string {
  if (wh < 1) return `${(wh * 1000).toFixed(1)} mWh`;
  if (wh < 1000) return `${wh.toFixed(1)} Wh`;
  return `${(wh / 1000).toFixed(3)} kWh`;
}

function fmtCost(c: number): string {
  if (c < 0.01) return `<$0.01`;
  return `$${c.toFixed(2)}`;
}

export default function EnergyReportDrawer({ open, onClose, report }: EnergyReportDrawerProps) {
  const [horizon, setHorizon] = useState<number>(24);

  // The projection inside the report is pre-computed for a fixed horizon,
  // so we let the user pick a horizon and re-display the relevant row.
  // The report passed in always carries the full projection; we re-scale
  // the display proportionally so figures stay consistent.
  const display = useMemo(() => {
    if (!report) return null;
    const base = report.projection;
    const factor = horizon / base.hours;
    const aeromindWh = base.aeromindWh * factor;
    const manualWh = base.manualWh * factor;
    const savingsWh = Math.max(0, manualWh - aeromindWh);
    return {
      aeromindWh,
      manualWh,
      savingsWh,
      savingsPct: manualWh > 0.0001 ? (savingsWh / manualWh) * 100 : 0,
      costAero: (aeromindWh / 1000) * COST_PER_KWH,
      costManual: (manualWh / 1000) * COST_PER_KWH,
      costSavings: (savingsWh / 1000) * COST_PER_KWH,
      co2: (savingsWh / 1000) * CO2_PER_KWH,
    };
  }, [report, horizon]);

  if (!open || !report) return null;

  // Bar chart heights (capped at 100%)
  const maxWh = Math.max(display?.manualWh ?? 1, display?.aeromindWh ?? 1, 1);
  const aeroBar = ((display?.aeromindWh ?? 0) / maxWh) * 100;
  const manualBar = ((display?.manualWh ?? 0) / maxWh) * 100;

  const handleExport = () => {
    if (!display) return;
    const lines = [
      'AeroMind Energy Savings Report',
      '==============================',
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Scenario: ${report.label}`,
      `Horizon: ${HORIZON_LABELS[horizon]}`,
      '',
      `AeroMind energy:   ${fmtWh(display.aeromindWh)}  (est. ${fmtCost(display.costAero)})`,
      `Manual baseline:   ${fmtWh(display.manualWh)}  (est. ${fmtCost(display.costManual)})`,
      `Savings:           ${fmtWh(display.savingsWh)}  (${display.savingsPct.toFixed(0)}%)`,
      `Est. cost saved:   ${fmtCost(display.costSavings)}`,
      `Est. CO2 avoided:  ${display.co2.toFixed(4)} kg`,
      '',
      'Live session summary:',
      `  Run time:           ${Math.round(report.live.runSeconds)}s`,
      `  AeroMind cumulative: ${fmtWh(report.live.aeromindWh)}`,
      `  Manual cumulative:   ${fmtWh(report.live.manualWh)}`,
      `  Adjusts avoided:    ${report.live.manualAdjustsAvoided}`,
      '',
      'Insights:',
      ...report.topInsights.map((i) => `  - ${i}`),
      '',
      'Note: All figures are simulated estimates for demonstration.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aeromind-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Energy savings report"
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-panel animate-rise-in sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-500/15 text-mint-400">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Energy savings report</h2>
              <p className="text-[11px] text-white/50">{report.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
          {/* Horizon selector */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Projection horizon
          </p>
          <div className="mb-5 grid grid-cols-4 gap-2">
            {HORIZON_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                  horizon === h
                    ? 'border-mint-400/50 bg-mint-500/15 text-mint-300'
                    : 'border-white/5 bg-ink-900/40 text-white/60 hover:border-white/15 hover:text-white'
                }`}
              >
                {HORIZON_LABELS[h]}
              </button>
            ))}
          </div>

          {/* Savings hero */}
          <div className="relative overflow-hidden rounded-xl border border-mint-500/20 bg-gradient-to-br from-mint-500/10 to-transparent p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mint-400">
              <TrendingDown className="h-3.5 w-3.5" />
              Projected savings
            </p>
            <p className="mt-1 font-mono text-4xl font-extrabold text-mint-400">
              {display?.savingsPct.toFixed(0)}%
            </p>
            <p className="text-[11px] text-white/55">
              {fmtWh(display?.savingsWh ?? 0)} over {HORIZON_LABELS[horizon]}
            </p>
          </div>

          {/* Comparison bars */}
          <div className="mt-5 rounded-xl border border-white/5 bg-ink-900/40 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              Energy comparison ({HORIZON_LABELS[horizon]})
            </p>
            <div className="flex items-end justify-between gap-6" style={{ height: 140 }}>
              {/* AeroMind */}
              <div className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-xs font-bold text-mint-400">
                  {fmtWh(display?.aeromindWh ?? 0)}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-mint-600 to-mint-400 transition-all duration-500"
                    style={{ height: `${Math.max(2, aeroBar)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-mint-400">AeroMind</span>
              </div>
              {/* Manual */}
              <div className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-xs font-bold text-sun-400">
                  {fmtWh(display?.manualWh ?? 0)}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-sun-600 to-sun-400 transition-all duration-500"
                    style={{ height: `${Math.max(2, manualBar)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-sun-400">Manual</span>
              </div>
            </div>
          </div>

          {/* Stat grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <DollarSign className="h-3 w-3" /> Est. cost saved
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-mint-400">
                {fmtCost(display?.costSavings ?? 0)}
              </p>
              <p className="text-[10px] text-white/40">@ ${COST_PER_KWH}/kWh</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <Leaf className="h-3 w-3" /> CO₂ avoided
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-mint-400">
                {(display?.co2 ?? 0).toFixed(3)} kg
              </p>
              <p className="text-[10px] text-white/40">grid avg estimate</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-mint-400">
                <Zap className="h-3 w-3" /> AeroMind cost
              </p>
              <p className="mt-1 font-mono text-base font-bold text-mint-400">
                {fmtCost(display?.costAero ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sun-400">
                <Zap className="h-3 w-3" /> Manual cost
              </p>
              <p className="mt-1 font-mono text-base font-bold text-sun-400">
                {fmtCost(display?.costManual ?? 0)}
              </p>
            </div>
          </div>

          {/* Live session recap */}
          <div className="mt-5 rounded-xl border border-white/5 bg-ink-900/40 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <Clock className="h-3 w-3" /> Live session so far
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-mono text-sm font-bold text-mint-400">
                  {fmtWh(report.live.aeromindWh)}
                </p>
                <p className="text-[10px] text-white/40">AeroMind</p>
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-sun-400">
                  {fmtWh(report.live.manualWh)}
                </p>
                <p className="text-[10px] text-white/40">Manual</p>
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-white">
                  {report.live.manualAdjustsAvoided}
                </p>
                <p className="text-[10px] text-white/40">Adjusts avoided</p>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <Lightbulb className="h-3 w-3 text-sun-400" /> Key insights
            </p>
            <ul className="flex flex-col gap-2">
              {report.topInsights.map((ins, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-white/5 bg-ink-900/40 px-3 py-2 text-[11px] leading-relaxed text-white/65"
                >
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-breeze-400" />
                  {ins}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-center text-[10px] text-white/35">
            Projections assume current conditions persist. Actual results vary with usage.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-white/5 px-5 py-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:border-breeze-400/40 hover:text-breeze-300"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-mint-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400"
          >
            Close report
          </button>
        </div>
      </aside>
    </div>
  );
}
