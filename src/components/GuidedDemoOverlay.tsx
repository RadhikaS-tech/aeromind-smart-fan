import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Users,
  UserX,
  Thermometer,
  Bot,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type {
  ComfortSettings,
  Decision,
  FanState,
  Mode,
  Occupant,
  SensorReadings,
} from '@/sim/types';
import { decide } from '@/sim/logic';
import { SCENARIOS } from '@/sim/scenarios';

interface GuidedDemoOverlayProps {
  open: boolean;
  onClose: () => void;
  comfort: ComfortSettings;
  /** Called when a step sets up a scenario so the main UI can mirror it. */
  onApplyScenario: (occupants: Occupant[], sensors: SensorReadings, mode: Mode) => void;
}

interface DemoStep {
  title: string;
  scenarioId: string;
  mode: Mode;
  narration: string;
  /** A function that produces the expected decision for verification text */
  highlight: string;
}

const STEPS: DemoStep[] = [
  {
    title: 'Welcome — meet AeroMind',
    scenarioId: 'single',
    mode: 'auto',
    narration:
      'AeroMind is an intelligent layer that reads the room and drives a smart BLDC fan for you. Over the next few steps you will see exactly how it decides speed, swing, and when to switch off — all with explainable rules. Let us start with a single person in the room.',
    highlight: 'One occupant is detected. AeroMind aims directly with a narrow swing.',
  },
  {
    title: 'Single occupant — focused airflow',
    scenarioId: 'single',
    mode: 'auto',
    narration:
      'With one person seated off-center, AeroMind calculates their angle from the fan and aims straight at them. The swing stays narrow (±12°) so no energy is wasted sweeping empty space. The decision panel explains the heading and speed choice in plain language.',
    highlight: 'Narrow swing focuses all airflow on the person who is actually present.',
  },
  {
    title: 'Two people spread out — wider swing',
    scenarioId: 'multiple',
    mode: 'auto',
    narration:
      'Now two people sit far apart. AeroMind widens the oscillation to cover both zones and aims at the midpoint between them. Notice how the swing cone in the room view grows — that is AeroMind adapting its coverage to the occupants spread.',
    highlight: 'Swing width grows to cover the angular span between both occupants.',
  },
  {
    title: 'Clustered occupants — narrow to the group',
    scenarioId: 'clustered',
    mode: 'auto',
    narration:
      'When people sit close together, a wide sweep would waste energy on empty corners. AeroMind detects the cluster and narrows the swing to focus just that group, while still keeping everyone in the breeze.',
    highlight: 'A tight cluster gets a focused, narrow swing instead of a wide sweep.',
  },
  {
    title: 'Empty room — the biggest energy saver',
    scenarioId: 'empty',
    mode: 'auto',
    narration:
      'The room is now empty. A typical user might leave the fan running, but AeroMind turns it off immediately — no occupants, no airflow needed. This single rule is where most of the energy savings come from.',
    highlight: 'Zero occupants means the fan switches off, regardless of temperature.',
  },
  {
    title: 'Manual mode — you take the wheel',
    scenarioId: 'single',
    mode: 'manual',
    narration:
      'In manual mode you control speed, heading, and swing yourself. AeroMind still tracks the energy comparison in the background so you can see how your choices stack up against the auto mode. Switch back to auto any time to let AeroMind take over.',
    highlight: 'Manual mode gives you full control while the energy comparison keeps running.',
  },
];

export default function GuidedDemoOverlay({
  open,
  onClose,
  comfort,
  onApplyScenario,
}: GuidedDemoOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const step = STEPS[stepIdx];

  const applyStep = useCallback(
    (idx: number) => {
      const s = STEPS[idx];
      const scenario = SCENARIOS.find((x) => x.id === s.scenarioId);
      if (!scenario) return;
      onApplyScenario(
        scenario.occupants.map((o) => ({ ...o })),
        { temperature: scenario.temperature, humidity: scenario.humidity },
        s.mode,
      );
    },
    [onApplyScenario],
  );

  // Apply the current step's scenario whenever the step changes
  useEffect(() => {
    if (open) applyStep(stepIdx);
  }, [open, stepIdx, applyStep]);

  // Auto-play timer
  useEffect(() => {
    if (!open || !playing) return;
    timerRef.current = window.setTimeout(() => {
      setStepIdx((prev) => {
        if (prev >= STEPS.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 6500);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open, playing, stepIdx]);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setPlaying(false);
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Compute the decision for the current step so we can show it live
  const scenario = SCENARIOS.find((x) => x.id === step.scenarioId);
  const dummyManual: FanState = { speed: 3, heading: 0, swing: 40, phase: 0, on: true };
  const decision: Decision | null = scenario
    ? decide(
        step.mode,
        { temperature: scenario.temperature, humidity: scenario.humidity },
        scenario.occupants,
        dummyManual,
        comfort,
      )
    : null;

  const goNext = () => setStepIdx((p) => Math.min(STEPS.length - 1, p + 1));
  const goPrev = () => setStepIdx((p) => Math.max(0, p - 1));
  const restart = () => {
    setStepIdx(0);
    setPlaying(false);
  };

  const scenarioIcon =
    step.scenarioId === 'empty' ? <UserX className="h-4 w-4" /> : <Users className="h-4 w-4" />;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Guided live demo"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-ink-900 shadow-panel animate-rise-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-breeze-400 to-breeze-600 shadow-glow">
              <Bot className="h-4.5 w-4.5 text-ink-950" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Guided live demo</h2>
              <p className="text-[11px] text-white/50">
                Step {stepIdx + 1} of {STEPS.length} · watch AeroMind decide in real time
              </p>
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

        {/* Progress bar */}
        <div className="h-1 w-full bg-ink-800">
          <div
            className="h-full bg-gradient-to-r from-breeze-500 to-mint-500 transition-all duration-500"
            style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="scroll-thin max-h-[55vh] overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-breeze-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-breeze-300">
              {step.mode === 'auto' ? 'Auto mode' : 'Manual mode'}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-ink-800/60 px-2.5 py-1 text-[10px] font-medium text-white/60">
              {scenarioIcon}
              {scenario?.name ?? step.scenarioId}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold text-white">{step.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-white/70">{step.narration}</p>

          {/* Live decision card */}
          {decision && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                decision.fanOn
                  ? 'border-mint-500/20 bg-mint-500/5'
                  : 'border-white/10 bg-ink-900/50'
              }`}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                <Sparkles className="h-3 w-3 text-breeze-400" /> AeroMind's decision right now
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className="rounded-lg bg-ink-900/60 px-2.5 py-1.5">
                  <span className="text-white/45">Status: </span>
                  <span className={decision.fanOn ? 'font-bold text-mint-400' : 'font-bold text-white/70'}>
                    {decision.fanOn ? 'RUNNING' : 'OFF'}
                  </span>
                </span>
                {decision.fanOn && (
                  <>
                    <span className="rounded-lg bg-ink-900/60 px-2.5 py-1.5">
                      <span className="text-white/45">Speed: </span>
                      <span className="font-bold text-breeze-300">{decision.speed}/5</span>
                    </span>
                    <span className="rounded-lg bg-ink-900/60 px-2.5 py-1.5">
                      <span className="text-white/45">Swing: </span>
                      <span className="font-bold text-breeze-300">±{Math.round(decision.swing)}°</span>
                    </span>
                    <span className="rounded-lg bg-ink-900/60 px-2.5 py-1.5">
                      <span className="text-white/45">Heading: </span>
                      <span className="font-bold text-breeze-300">{Math.round(decision.heading)}°</span>
                    </span>
                  </>
                )}
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {decision.reason.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[11px] leading-relaxed text-white/70"
                  >
                    <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-breeze-400" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlight callout */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-breeze-500/20 bg-breeze-500/5 p-3">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-breeze-400" />
            <p className="text-[11px] leading-relaxed text-white/65">
              <span className="font-semibold text-breeze-300">Takeaway: </span>
              {step.highlight}
            </p>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-3 border-t border-white/5 px-5 py-3">
          <button
            onClick={restart}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-white/60 transition hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              disabled={stepIdx === 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-ink-900/50 text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-30"
              aria-label="Previous step"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex h-9 items-center gap-2 rounded-lg bg-breeze-500 px-4 text-sm font-semibold text-ink-950 transition hover:bg-breeze-400"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={goNext}
              disabled={stepIdx === STEPS.length - 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-ink-900/50 text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-30"
              aria-label="Next step"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
