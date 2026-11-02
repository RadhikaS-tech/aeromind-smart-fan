import { useEffect } from 'react';
import {
  X,
  Wind,
  Cpu,
  Thermometer,
  Droplets,
  Users,
  GitBranch,
  Zap,
  Gauge,
  ArrowRight,
  CircuitBoard,
  ShieldCheck,
} from 'lucide-react';

interface HowItWorksProps {
  open: boolean;
  onClose: () => void;
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="relative flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-breeze-500/15 text-breeze-300">
          {icon}
        </div>
        {n < 5 && <div className="mt-1 w-px flex-1 bg-gradient-to-b from-breeze-500/40 to-transparent" />}
      </div>
      <div className="pb-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-breeze-400">STEP {n}</span>
          <h4 className="text-sm font-bold text-white">{title}</h4>
        </div>
        <div className="mt-1 text-[12px] leading-relaxed text-white/65">{children}</div>
      </div>
    </div>
  );
}

function Rule({ label, children, accent }: { label: string; children: string; accent: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
        {label}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">{children}</p>
    </div>
  );
}

export default function HowItWorks({ open, onClose }: HowItWorksProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="How AeroMind works">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-panel animate-rise-in sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-breeze-400 to-breeze-600 shadow-glow">
              <Cpu className="h-4.5 w-4.5 text-ink-950" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">How AeroMind works</h2>
              <p className="text-[11px] text-white/50">The software layer, end to end</p>
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
          {/* Intro */}
          <p className="mb-5 text-[12px] leading-relaxed text-white/65">
            AeroMind is an <span className="font-semibold text-white">intelligent software layer</span> that sits
            on top of any existing smart BLDC fan. It reads simple sensors, reasons with explainable
            rules, and drives the fan's speed and swing — turning it off when no one's around. This
            demo runs entirely in your browser; the same logic runs on a real controller.
          </p>

          {/* Pipeline */}
          <div className="rounded-xl border border-white/5 bg-ink-900/40 p-4">
            <Step n={1} icon={<Users className="h-4 w-4" />} title="Sense occupants">
              A top-down virtual room tracks up to three occupants. In a real deployment this would
              come from a PIR, mmWave radar, or low-res thermal sensor. The controller computes each
              person's <span className="font-mono text-breeze-300">angle</span> and distance from the fan.
            </Step>
            <Step n={2} icon={<Thermometer className="h-4 w-4" />} title="Read comfort sensors">
              Temperature and humidity feed the comfort model. The sliders here simulate those
              readings; on hardware they'd be a DHT-style sensor sampled every few seconds.
            </Step>
            <Step n={3} icon={<GitBranch className="h-4 w-4" />} title="Decide with rules">
              The rule engine turns inputs into a speed, aim heading, and swing width — no black-box
              ML, so every choice is auditable. See the rules below.
            </Step>
            <Step n={4} icon={<Gauge className="h-4 w-4" />} title="Drive the fan">
              AeroMind commands the fan's speed (0–5) and oscillation angle. Narrow swing focuses on
              a cluster; wide swing covers spread-out occupants.
            </Step>
            <Step n={5} icon={<Zap className="h-4 w-4" />} title="Measure & save">
              An energy model compares AeroMind against a typical "leave it at speed 3" user. Savings
              come from idle-off, lower speeds, and focused airflow.
            </Step>
          </div>

          {/* Comfort rules */}
          <h3 className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/60">
            <CircuitBoard className="h-3.5 w-3.5 text-breeze-400" />
            Comfort rule engine
          </h3>
          <p className="mt-1.5 mb-3 text-[11px] leading-relaxed text-white/55">
            Target comfort is ~24°C at 50% RH. Each rule produces a plain-language line you'll see in
            the "Why AeroMind chose this" panel.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Rule label="Temperature" accent="#ff9326">
              ≥32°C → 5 · ≥29 → 4 · ≥27 → 3 · ≥25 → 2 · ≥22 → 1 · ≤18 → OFF
            </Rule>
            <Rule label="Humidity" accent="#22c2ff">
              RH ≥70% adds a speed step · RH ≤35% subtracts one (dry air feels cooler)
            </Rule>
            <Rule label="Occupancy" accent="#3ad6a0">
              No occupants → fan OFF regardless of temperature (primary energy saver)
            </Rule>
            <Rule label="Aiming" accent="#3ad6a0">
              Single occupant → aim directly, ±12° · clustered → narrow to the cluster · spread → widen to cover both
            </Rule>
          </div>

          {/* Energy model */}
          <h3 className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/60">
            <Zap className="h-3.5 w-3.5 text-sun-400" />
            Energy model (simulated)
          </h3>
          <p className="mt-1.5 mb-3 text-[11px] leading-relaxed text-white/55">
            A BLDC fan draws roughly 0–28W across its speed range. AeroMind's power scales with
            speed² and a small swing factor; the manual baseline assumes a user leaves the fan at
            speed 3 when occupied and speed 2 when the room is empty. AeroMind turns off instead.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-mint-500/20 bg-mint-500/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-mint-400">AeroMind</p>
              <p className="mt-0.5 font-mono text-[11px] text-white/65">P ≈ speed² scaling + swing factor</p>
              <p className="mt-0.5 text-[10px] text-white/45">Off when empty or cool</p>
            </div>
            <div className="rounded-lg border border-sun-500/20 bg-sun-500/5 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sun-400">Manual baseline</p>
              <p className="mt-0.5 font-mono text-[11px] text-white/65">Fixed speed 3 (occupied) / 2 (empty)</p>
              <p className="mt-0.5 text-[10px] text-white/45">Stays on when forgotten</p>
            </div>
          </div>

          {/* Hardware mapping */}
          <h3 className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/60">
            <CircuitBoard className="h-3.5 w-3.5 text-breeze-400" />
            From demo to real hardware
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {[
              ['Occupants', 'PIR / mmWave radar / thermal array', 'GPIO or I²C sensor'],
              ['Temperature & humidity', 'DHT22 / SHTC3', 'Single-wire or I²C'],
              ['Fan speed', 'BLDC driver PWM', '0–5 mapped to PWM duty'],
              ['Swing angle', 'Servo / stepper on the head', 'PWM angle command'],
            ].map(([what, sensor, iface]) => (
              <div
                key={what}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-ink-900/40 px-3 py-2 text-[11px]"
              >
                <span className="w-28 shrink-0 font-semibold text-white/75">{what}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/30" />
                <span className="flex-1 text-white/55">{sensor}</span>
                <span className="shrink-0 font-mono text-[10px] text-breeze-400/80">{iface}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-mint-500/20 bg-mint-500/5 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-400" />
            <p className="text-[11px] leading-relaxed text-white/60">
              <span className="font-semibold text-mint-400">Privacy-first:</span> occupancy can be a
              simple yes/no count from a radar module — no cameras, no images, no personally
              identifiable data ever leaves the room.
            </p>
          </div>

          <p className="mt-5 text-center text-[10px] text-white/35">
            Every reading and saving shown in this app is simulated for demonstration.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-3">
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-breeze-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-breeze-400"
          >
            <Wind className="h-4 w-4" />
            Got it — back to the demo
          </button>
        </div>
      </aside>
    </div>
  );
}
