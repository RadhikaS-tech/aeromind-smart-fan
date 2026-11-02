import { useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Thermometer,
  Snowflake,
  Droplets,
  Gauge,
  RotateCcw,
} from 'lucide-react';
import type { ComfortSettings } from '@/sim/types';
import { DEFAULT_COMFORT } from '@/sim/logic';

interface ComfortSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: ComfortSettings;
  onChange: (s: ComfortSettings) => void;
}

function Field({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  icon,
  hint,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  icon: React.ReactNode;
  hint: string;
  accent: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          {icon}
          {label}
        </span>
        <span className="font-mono text-sm font-semibold" style={{ color: accent }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />
      <p className="mt-1 text-[10px] leading-relaxed text-white/40">{hint}</p>
    </div>
  );
}

export default function ComfortSettingsDrawer({
  open,
  onClose,
  settings,
  onChange,
}: ComfortSettingsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const set = (patch: Partial<ComfortSettings>) => onChange({ ...settings, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Personalized comfort settings"
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-panel animate-rise-in sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-breeze-500/15 text-breeze-300">
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Comfort settings</h2>
              <p className="text-[11px] text-white/50">Personalize how AeroMind responds</p>
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
          <p className="mb-5 text-[12px] leading-relaxed text-white/65">
            These preferences adjust AeroMind's auto-mode rules so the fan behaves the way{' '}
            <span className="font-semibold text-white">you</span> like it. Changes apply instantly and
            are saved to this browser.
          </p>

          <div className="flex flex-col gap-5 rounded-xl border border-white/5 bg-ink-900/40 p-4">
            <Field
              label="Comfort target"
              value={settings.targetTemp}
              min={20}
              max={28}
              step={0.5}
              unit="°C"
              icon={<Thermometer className="h-3.5 w-3.5 text-sun-400" />}
              accent="#ff9326"
              hint="The temperature you find comfortable. Speed bands shift around this target."
              onChange={(v) => set({ targetTemp: v })}
            />
            <Field
              label="Cool-off threshold"
              value={settings.coolThreshold}
              min={14}
              max={22}
              step={0.5}
              unit="°C"
              icon={<Snowflake className="h-3.5 w-3.5 text-breeze-300" />}
              accent="#5dd4ff"
              hint="Below this temperature the fan turns off in auto mode, even with people present."
              onChange={(v) => set({ coolThreshold: v })}
            />
            <Field
              label="High-humidity trigger"
              value={settings.humidityHigh}
              min={55}
              max={85}
              step={1}
              unit="%"
              icon={<Droplets className="h-3.5 w-3.5 text-breeze-300" />}
              accent="#22c2ff"
              hint="When humidity rises above this, AeroMind adds one speed step to aid evaporative cooling."
              onChange={(v) => set({ humidityHigh: v })}
            />
            <Field
              label="Low-humidity trigger"
              value={settings.humidityLow}
              min={20}
              max={45}
              step={1}
              unit="%"
              icon={<Droplets className="h-3.5 w-3.5 text-breeze-300" />}
              accent="#22c2ff"
              hint="Below this humidity the air already feels cool, so AeroMind drops one speed step."
              onChange={(v) => set({ humidityLow: v })}
            />
            <Field
              label="Speed bias"
              value={settings.speedBias}
              min={-2}
              max={2}
              step={1}
              icon={<Gauge className="h-3.5 w-3.5 text-mint-400" />}
              accent="#3ad6a0"
              hint="Run warmer or cooler than average? Nudge every auto speed up or down by this many steps."
              onChange={(v) => set({ speedBias: v })}
            />
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-breeze-500/20 bg-breeze-500/5 p-3">
            <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-breeze-400" />
            <p className="text-[11px] leading-relaxed text-white/60">
              Your settings are stored locally and reloaded every visit. The "Why AeroMind chose this"
              panel will reference these values so you can see exactly how they affect each decision.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-white/5 px-5 py-3">
          <button
            onClick={() => onChange({ ...DEFAULT_COMFORT })}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:border-rose-400/40 hover:text-rose-400"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-breeze-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-breeze-400"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}
