import { useCallback } from 'react';
import {
  RotateCcw,
  Thermometer,
  Droplets,
  Fan,
  Hand,
  Bot,
  Gauge,
  Move,
  Users,
  UserX,
  Sparkles,
} from 'lucide-react';
import type { FanState, Mode, SensorReadings } from '@/sim/types';
import { SCENARIOS } from '@/sim/scenarios';
import { MANUAL_DEFAULT } from '@/sim/energy';

interface ControlPanelProps {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  sensors: SensorReadings;
  onSensorsChange: (s: SensorReadings) => void;
  manualFan: FanState;
  onManualFanChange: (f: FanState) => void;
  onReset: () => void;
  onScenario: (id: string) => void;
  activeScenario: string | null;
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  icon,
  disabled,
  onChange,
  hint,
  accent = 'breeze',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onChange: (v: number) => void;
  hint?: string;
  accent?: 'breeze' | 'sun' | 'mint';
}) {
  const accentColor =
    accent === 'sun' ? '#ff9326' : accent === 'mint' ? '#16b888' : '#22c2ff';
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          {icon}
          {label}
        </span>
        <span className="font-mono text-sm font-semibold" style={{ color: accentColor }}>
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
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(to right, ${accentColor} ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      {hint && <p className="mt-1 text-[10px] text-white/40">{hint}</p>}
    </div>
  );
}

export default function ControlPanel({
  mode,
  onModeChange,
  sensors,
  onSensorsChange,
  manualFan,
  onManualFanChange,
  onReset,
  onScenario,
  activeScenario,
}: ControlPanelProps) {
  const manualDisabled = mode === 'auto';

  const scenarioIcons: Record<string, React.ReactNode> = {
    single: <Users className="h-3.5 w-3.5" />,
    multiple: <Users className="h-3.5 w-3.5" />,
    clustered: <Users className="h-3.5 w-3.5" />,
    empty: <UserX className="h-3.5 w-3.5" />,
  };

  const setManual = useCallback(
    (patch: Partial<FanState>) => onManualFanChange({ ...manualFan, ...patch }),
    [manualFan, onManualFanChange],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          Operation mode
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-900/60 p-1">
          <button
            onClick={() => onModeChange('auto')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              mode === 'auto'
                ? 'bg-breeze-500 text-ink-950 shadow-glow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Bot className="h-4 w-4" />
            Auto
          </button>
          <button
            onClick={() => onModeChange('manual')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              mode === 'manual'
                ? 'bg-sun-500 text-ink-950 shadow-glow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Hand className="h-4 w-4" />
            Manual
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/45">
          {mode === 'auto'
            ? 'AeroMind reads sensors and occupants to aim and set speed automatically.'
            : 'You drive the fan. AeroMind still tracks the energy comparison.'}
        </p>
      </div>

      {/* Sensors */}
      <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
          <Sparkles className="h-3.5 w-3.5 text-breeze-400" />
          Simulated sensors
        </p>
        <div className="flex flex-col gap-4">
          <Slider
            label="Temperature"
            value={sensors.temperature}
            min={16}
            max={36}
            step={0.5}
            unit="°C"
            icon={<Thermometer className="h-3.5 w-3.5 text-sun-400" />}
            accent="sun"
            onChange={(v) => onSensorsChange({ ...sensors, temperature: v })}
            hint="Comfort target ~24°C. Below 18°C fan turns off in auto."
          />
          <Slider
            label="Humidity"
            value={sensors.humidity}
            min={20}
            max={90}
            step={1}
            unit="%"
            icon={<Droplets className="h-3.5 w-3.5 text-breeze-300" />}
            accent="breeze"
            onChange={(v) => onSensorsChange({ ...sensors, humidity: v })}
            hint="Above 60% adds a speed step; below 35% subtracts one."
          />
        </div>
      </div>

      {/* Manual controls */}
      <div className={`rounded-xl border border-white/5 bg-ink-900/40 p-3 ${manualDisabled ? '' : ''}`}>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
          <Fan className="h-3.5 w-3.5 text-sun-400" />
          Manual fan controls
        </p>
        <div className="flex flex-col gap-4">
          <Slider
            label="Fan speed"
            value={manualFan.speed}
            min={0}
            max={5}
            step={1}
            icon={<Gauge className="h-3.5 w-3.5 text-sun-400" />}
            accent="sun"
            disabled={manualDisabled}
            onChange={(v) => setManual({ speed: v })}
            hint="0 = off, 5 = max. Only applies in manual mode."
          />
          <Slider
            label="Center heading"
            value={manualFan.heading}
            min={-60}
            max={60}
            step={1}
            unit="°"
            icon={<Move className="h-3.5 w-3.5 text-sun-400" />}
            accent="sun"
            disabled={manualDisabled}
            onChange={(v) => setManual({ heading: v })}
            hint="Where the fan points (0 = straight ahead)."
          />
          <Slider
            label="Swing half-angle"
            value={manualFan.swing}
            min={0}
            max={60}
            step={1}
            unit="°"
            icon={<Move className="h-3.5 w-3.5 text-sun-400" />}
            accent="sun"
            disabled={manualDisabled}
            onChange={(v) => setManual({ swing: v })}
            hint="Total sweep = 2× this. 0 = no oscillation."
          />
        </div>
      </div>

      {/* Scenarios */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          Sample scenarios
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => onScenario(s.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition ${
                activeScenario === s.id
                  ? 'border-breeze-400/50 bg-breeze-500/15 text-white shadow-glow'
                  : 'border-white/5 bg-ink-900/40 text-white/70 hover:border-white/15 hover:text-white'
              }`}
            >
              {scenarioIcons[s.id]}
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2.5 text-sm font-semibold text-white/80 transition hover:border-rose-400/40 hover:text-rose-400"
      >
        <RotateCcw className="h-4 w-4" />
        Reset simulation
      </button>

      <p className="text-[10px] leading-relaxed text-white/35">
        Manual baseline assumes a typical user leaves the fan at speed {MANUAL_DEFAULT} when occupied and speed 2 when empty. AeroMind turns off / dials down instead.
      </p>
    </div>
  );
}
