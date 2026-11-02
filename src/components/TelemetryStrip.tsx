import { Fan, Gauge, Compass, Zap, Users, Power } from 'lucide-react';
import type { Decision, FanState } from '@/sim/types';
import { aeromindPower } from '@/sim/energy';

interface TelemetryStripProps {
  fan: FanState;
  decision: Decision;
  aeromindW: number;
  manualW: number;
}

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-900/40 px-3.5 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accent}22`, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
        <p className="truncate font-mono text-lg font-bold leading-tight" style={{ color: accent }}>
          {value}
        </p>
        {sub && <p className="truncate text-[10px] text-white/40">{sub}</p>}
      </div>
    </div>
  );
}

export default function TelemetryStrip({ fan, decision, aeromindW, manualW }: TelemetryStripProps) {
  const zones = decision.zones;
  const zoneText =
    zones.length === 0
      ? 'none'
      : zones.map((z) => `${z.label} ${Math.round(z.angle)}°`).join('  ·  ');
  const totalSwing = fan.on ? fan.swing * 2 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
      <Stat
        icon={<Power className="h-4 w-4" />}
        label="Fan status"
        value={fan.on ? 'RUNNING' : 'IDLE'}
        sub={fan.on ? `speed ${fan.speed}/5` : 'auto off'}
        accent={fan.on ? '#3ad6a0' : '#64748b'}
      />
      <Stat
        icon={<Gauge className="h-4 w-4" />}
        label="Fan speed"
        value={`${fan.speed}/5`}
        sub={fan.on ? 'live' : 'off'}
        accent="#22c2ff"
      />
      <Stat
        icon={<Compass className="h-4 w-4" />}
        label="Swing angle"
        value={fan.on ? `±${Math.round(fan.swing)}°` : '—'}
        sub={fan.on ? `total ${Math.round(totalSwing)}°` : 'centered'}
        accent="#5dd4ff"
      />
      <Stat
        icon={<Users className="h-4 w-4" />}
        label="Occupied zones"
        value={`${zones.length}`}
        sub={zoneText}
        accent="#3ad6a0"
      />
      <Stat
        icon={<Zap className="h-4 w-4" />}
        label="AeroMind power"
        value={`${aeromindW.toFixed(1)} W`}
        sub="estimated live"
        accent="#3ad6a0"
      />
      <Stat
        icon={<Fan className="h-4 w-4" />}
        label="Manual baseline"
        value={`${manualW.toFixed(1)} W`}
        sub="what a user would draw"
        accent="#ff9326"
      />
    </div>
  );
}
