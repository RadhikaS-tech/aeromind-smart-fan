import { History, Trash2, Clock, ArrowUpRight } from 'lucide-react';
import type { SimulationSnapshot } from '@/sim/types';

interface SimulationHistoryPanelProps {
  history: SimulationSnapshot[];
  onRestore: (snap: SimulationSnapshot) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function SimulationHistoryPanel({
  history,
  onRestore,
  onDelete,
  onClear,
}: SimulationHistoryPanelProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-breeze-500/15 text-breeze-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Simulation history</h3>
            <p className="text-[10px] text-white/45">
              {history.length} saved snapshot{history.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white/50 transition hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-ink-900/30 py-8 text-center">
          <History className="h-6 w-6 text-white/25" />
          <p className="text-[11px] text-white/45">No snapshots yet.</p>
          <p className="max-w-[220px] text-[10px] leading-relaxed text-white/30">
            Use the "Save snapshot" button to capture the current room, sensors, and energy totals.
            Snapshots persist across page reloads.
          </p>
        </div>
      ) : (
        <div className="scroll-thin flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
          {history.map((snap) => (
            <div
              key={snap.id}
              className="group rounded-xl border border-white/5 bg-ink-900/40 p-3 transition hover:border-white/15"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{snap.label}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/40">
                    <Clock className="h-2.5 w-2.5" />
                    {timeAgo(snap.timestamp)}
                    <span className="mx-1 text-white/20">·</span>
                    {snap.mode === 'auto' ? 'Auto' : 'Manual'}
                    <span className="mx-1 text-white/20">·</span>
                    {snap.decision.zones.length} occupant{snap.decision.zones.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onRestore(snap)}
                    className="flex items-center gap-1 rounded-lg bg-breeze-500/10 px-2 py-1 text-[10px] font-semibold text-breeze-300 transition hover:bg-breeze-500/20"
                    title="Restore this snapshot"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    Restore
                  </button>
                  <button
                    onClick={() => onDelete(snap.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white/40 transition hover:bg-rose-500/10 hover:text-rose-400"
                    title="Delete snapshot"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-800/50 px-2 py-1">
                  <p className="font-mono text-[11px] font-bold text-mint-400">
                    {snap.summary.savingsPct.toFixed(0)}%
                  </p>
                  <p className="text-[9px] text-white/40">saved</p>
                </div>
                <div className="rounded-lg bg-ink-800/50 px-2 py-1">
                  <p className="font-mono text-[11px] font-bold text-sun-400">
                    {snap.sensors.temperature}°
                  </p>
                  <p className="text-[9px] text-white/40">temp</p>
                </div>
                <div className="rounded-lg bg-ink-800/50 px-2 py-1">
                  <p className="font-mono text-[11px] font-bold text-white">
                    {Math.round(snap.summary.runSeconds)}s
                  </p>
                  <p className="text-[9px] text-white/40">run</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
