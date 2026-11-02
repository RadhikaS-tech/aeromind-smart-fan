import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wind, Cpu, CircleHelp as HelpCircle, SlidersHorizontal, FileText, CirclePlay as PlayCircle, Save } from 'lucide-react';
import type {
  AnalyticsSummary,
  ComfortSettings,
  EnergyReportData,
  EnergySample,
  FanState,
  Mode,
  Occupant,
  SensorReadings,
  SimulationSnapshot,
} from '@/sim/types';
import { decide, DEFAULT_COMFORT } from '@/sim/logic';
import {
  accumulateEnergy,
  aeromindPower,
  manualBaselinePower,
} from '@/sim/energy';
import { buildReport } from '@/sim/report';
import { DEFAULT_OCCUPANTS, SCENARIOS } from '@/sim/scenarios';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import RoomView from '@/components/RoomView';
import ControlPanel from '@/components/ControlPanel';
import TelemetryStrip from '@/components/TelemetryStrip';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import ExplainPanel from '@/components/ExplainPanel';
import HowItWorks from '@/components/HowItWorks';
import ComfortSettingsDrawer from '@/components/ComfortSettingsDrawer';
import EnergyReportDrawer from '@/components/EnergyReportDrawer';
import GuidedDemoOverlay from '@/components/GuidedDemoOverlay';
import SimulationHistoryPanel from '@/components/SimulationHistoryPanel';
import BeforeAfterComparison from '@/components/BeforeAfterComparison';

const TICK_MS = 250; // energy accumulation cadence
const INITIAL_SENSORS: SensorReadings = { temperature: 27, humidity: 55 };
const INITIAL_MANUAL: FanState = {
  speed: 3,
  heading: 0,
  swing: 40,
  phase: 0,
  on: true,
};
const MAX_HISTORY = 12;

function emptySummary(): AnalyticsSummary {
  return {
    aeromindWh: 0,
    manualWh: 0,
    savingsWh: 0,
    savingsPct: 0,
    manualAdjustsAvoided: 0,
    runSeconds: 0,
    samples: [],
  };
}

export default function App() {
  const [occupants, setOccupants] = useState<Occupant[]>(DEFAULT_OCCUPANTS);
  const [sensors, setSensors] = useState<SensorReadings>(INITIAL_SENSORS);
  const [mode, setMode] = useState<Mode>('auto');
  const [manualFan, setManualFan] = useState<FanState>(INITIAL_MANUAL);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary);
  const [howOpen, setHowOpen] = useState(false);
  const [comfortOpen, setComfortOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [reportData, setReportData] = useState<EnergyReportData | null>(null);

  // Persisted state
  const [comfort, setComfort] = useLocalStorage<ComfortSettings>(
    'aeromind:comfort',
    DEFAULT_COMFORT,
  );
  const [history, setHistory] = useLocalStorage<SimulationSnapshot[]>(
    'aeromind:history',
    [],
  );

  const lastTickRef = useRef<number>(performance.now());
  // Mirror live state into refs so the interval reads fresh values without nesting setters
  const stateRef = useRef({ occupants, sensors, mode, manualFan, comfort });
  stateRef.current = { occupants, sensors, mode, manualFan, comfort };

  // Compute the decision
  const decision = useMemo(
    () => decide(mode, sensors, occupants, manualFan, comfort),
    [mode, sensors, occupants, manualFan, comfort],
  );

  // Live fan state used by the visualizer
  const liveFan: FanState = useMemo(() => {
    if (mode === 'manual') {
      return {
        ...manualFan,
        on: manualFan.speed > 0,
      };
    }
    return {
      speed: decision.speed,
      heading: decision.heading,
      swing: decision.swing,
      phase: 0,
      on: decision.fanOn,
    };
  }, [mode, manualFan, decision]);

  const moveOccupant = useCallback((id: string, x: number, y: number) => {
    setOccupants((prev) => prev.map((o) => (o.id === id ? { ...o, x, y } : o)));
    setActiveScenario(null);
  }, []);

  const toggleOccupant = useCallback((id: string) => {
    setOccupants((prev) => prev.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));
    setActiveScenario(null);
  }, []);

  const applyScenario = useCallback((id: string) => {
    const s = SCENARIOS.find((x) => x.id === id);
    if (!s) return;
    setOccupants(s.occupants.map((o) => ({ ...o })));
    setSensors({ temperature: s.temperature, humidity: s.humidity });
    setActiveScenario(id);
  }, []);

  // Used by the guided demo to set up a step's scenario + mode
  const applyDemoStep = useCallback(
    (occ: Occupant[], sen: SensorReadings, md: Mode) => {
      setOccupants(occ.map((o) => ({ ...o })));
      setSensors(sen);
      setMode(md);
      setActiveScenario(null);
    },
    [],
  );

  const reset = useCallback(() => {
    setOccupants(DEFAULT_OCCUPANTS.map((o) => ({ ...o })));
    setSensors(INITIAL_SENSORS);
    setMode('auto');
    setManualFan(INITIAL_MANUAL);
    setActiveScenario(null);
    setSummary(emptySummary());
    lastTickRef.current = performance.now();
  }, []);

  // Energy accumulation loop
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const { occupants: occ, sensors: sen, mode: md, manualFan: mf, comfort: cf } = stateRef.current;
      const present = occ.some((o) => o.active);
      const d = decide(md, sen, occ, mf, cf);
      const liveOn = md === 'manual' ? mf.speed > 0 : d.fanOn;
      const liveSpeed = md === 'manual' ? mf.speed : d.speed;
      const liveSwing = md === 'manual' ? mf.swing : d.swing;
      const aW = liveOn
        ? aeromindPower({ ...mf, on: liveOn, speed: liveSpeed, swing: liveSwing })
        : 0;
      const mW = manualBaselinePower(present);

      setSummary((prev) => {
        const energy = accumulateEnergy(
          {
            aeromindWh: prev.aeromindWh,
            manualWh: prev.manualWh,
            manualAdjustsAvoided: prev.manualAdjustsAvoided,
          },
          aW,
          mW,
          dt,
          md === 'auto',
        );
        const sample: EnergySample = {
          t: prev.runSeconds + dt,
          aeromindW: aW,
          manualW: mW,
          speed: liveSpeed,
        };
        const samples = [...prev.samples, sample].slice(-200);
        const savingsWh = Math.max(0, energy.manualWh - energy.aeromindWh);
        const savingsPct = energy.manualWh > 0.0001 ? (savingsWh / energy.manualWh) * 100 : 0;
        return {
          aeromindWh: energy.aeromindWh,
          manualWh: energy.manualWh,
          savingsWh,
          savingsPct,
          manualAdjustsAvoided: energy.manualAdjustsAvoided,
          runSeconds: prev.runSeconds + dt,
          samples,
        };
      });
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, []);

  // Snapshot management
  const saveSnapshot = useCallback(() => {
    const scenarioName = activeScenario
      ? SCENARIOS.find((s) => s.id === activeScenario)?.name ?? 'Custom'
      : 'Custom';
    const snap: SimulationSnapshot = {
      id: `snap-${Date.now()}`,
      label: `${scenarioName} · ${mode === 'auto' ? 'Auto' : 'Manual'}`,
      timestamp: Date.now(),
      occupants: occupants.map((o) => ({ ...o })),
      sensors: { ...sensors },
      mode,
      decision,
      summary,
    };
    setHistory((prev) => [snap, ...prev].slice(0, MAX_HISTORY));
  }, [activeScenario, mode, occupants, sensors, decision, summary, setHistory]);

  const restoreSnapshot = useCallback(
    (snap: SimulationSnapshot) => {
      setOccupants(snap.occupants.map((o) => ({ ...o })));
      setSensors({ ...snap.sensors });
      setMode(snap.mode);
      setActiveScenario(null);
    },
    [],
  );

  const deleteSnapshot = useCallback(
    (id: string) => setHistory((prev) => prev.filter((s) => s.id !== id)),
    [setHistory],
  );

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  // Generate report on demand
  const generateReport = useCallback(() => {
    const scenarioName = activeScenario
      ? SCENARIOS.find((s) => s.id === activeScenario)?.name ?? 'Custom'
      : 'Custom';
    const data = buildReport(
      `${scenarioName} · ${mode === 'auto' ? 'Auto' : 'Manual'}`,
      summary,
      decision,
      sensors,
      occupants,
      mode,
      manualFan,
      comfort,
      24,
    );
    setReportData(data);
    setReportOpen(true);
  }, [activeScenario, mode, summary, decision, sensors, occupants, manualFan, comfort]);

  const liveAeroW = liveFan.on ? aeromindPower(liveFan) : 0;
  const present = occupants.some((o) => o.active);
  const liveManualW = manualBaselinePower(present);

  const toolbarBtn =
    'flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/50 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-breeze-400/40 hover:text-breeze-300';

  return (
    <div className="app-bg min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-breeze-400 to-breeze-600 shadow-glow">
              <Wind className="h-5 w-5 text-ink-950" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-mint-500 ring-2 ring-ink-950">
                <Cpu className="h-2.5 w-2.5 text-ink-950" />
              </span>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight sm:text-lg">
                AeroMind
              </h1>
              <p className="text-[11px] text-white/50">
                Intelligent software layer for smart BLDC fans
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:flex ${
                mode === 'auto'
                  ? 'bg-mint-500/15 text-mint-400'
                  : 'bg-sun-500/15 text-sun-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${mode === 'auto' ? 'bg-mint-400' : 'bg-sun-400'} animate-pulse-soft`} />
              {mode === 'auto' ? 'AUTO' : 'MANUAL'}
            </span>
            <button onClick={() => setDemoOpen(true)} className={toolbarBtn} title="Guided live demo">
              <PlayCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Demo</span>
            </button>
            <button onClick={() => setComfortOpen(true)} className={toolbarBtn} title="Comfort settings">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Comfort</span>
            </button>
            <button onClick={generateReport} className={toolbarBtn} title="Energy report">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button
              onClick={() => setHowOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-900/50 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-breeze-400/40 hover:text-breeze-300"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">How it works</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Left: room visualization */}
          <section className="xl:col-span-7 2xl:col-span-8">
            <div className="rounded-2xl border border-white/5 bg-ink-900/30 p-3 shadow-panel sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Virtual room</h2>
                  <p className="text-[11px] text-white/45">
                    Top-down view · drag occupants · {present ? 'occupied' : 'empty'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {occupants.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => toggleOccupant(o.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                        o.active
                          ? 'border-breeze-400/30 bg-breeze-500/10 text-breeze-200'
                          : 'border-white/10 bg-ink-900/50 text-white/40'
                      }`}
                      title={o.active ? 'Click to remove' : 'Click to add'}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${o.active ? 'bg-mint-400' : 'bg-ink-500'}`}
                      />
                      {o.label.replace('Person ', 'P')}
                    </button>
                  ))}
                </div>
              </div>
              <RoomView
                occupants={occupants}
                onMoveOccupant={moveOccupant}
                fan={liveFan}
                decision={decision}
              />
              <p className="mt-2 text-[10px] leading-relaxed text-white/35">
                The fan (bottom-center) oscillates within its swing cone. The green center line is
                the aim heading; the dashed blue circles mark each occupied zone. Click the person
                chips above to add/remove occupants, or drag the glowing dots on the floor.
              </p>
            </div>

            <div className="mt-5 animate-rise-in">
              <TelemetryStrip
                fan={liveFan}
                decision={decision}
                aeromindW={liveAeroW}
                manualW={liveManualW}
              />
            </div>
          </section>

          {/* Right: controls + analytics + explain */}
          <section className="flex flex-col gap-5 xl:col-span-5 2xl:col-span-4">
            <div className="rounded-2xl border border-white/5 bg-ink-900/30 p-4 shadow-panel">
              <ControlPanel
                mode={mode}
                onModeChange={setMode}
                sensors={sensors}
                onSensorsChange={setSensors}
                manualFan={manualFan}
                onManualFanChange={setManualFan}
                onReset={reset}
                onScenario={applyScenario}
                activeScenario={activeScenario}
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="rounded-2xl border border-white/5 bg-ink-900/30 p-4 shadow-panel">
                <ExplainPanel decision={decision} />
              </div>
              <div className="rounded-2xl border border-white/5 bg-ink-900/30 p-4 shadow-panel">
                <AnalyticsPanel summary={summary} />
              </div>

              {/* Before / after comparison */}
              <div className="rounded-2xl border border-white/5 bg-ink-900/30 p-4 shadow-panel">
                <BeforeAfterComparison
                  sensors={sensors}
                  occupants={occupants}
                  manualFan={manualFan}
                  comfort={comfort}
                />
              </div>

              {/* Simulation history */}
              <div className="rounded-2xl border border-white/5 bg-ink-900/30 p-4 shadow-panel">
                <div className="mb-3 flex items-center justify-end">
                  <button
                    onClick={saveSnapshot}
                    className="flex items-center gap-1.5 rounded-lg bg-breeze-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-breeze-300 transition hover:bg-breeze-500/25"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save snapshot
                  </button>
                </div>
                <SimulationHistoryPanel
                  history={history}
                  onRestore={restoreSnapshot}
                  onDelete={deleteSnapshot}
                  onClear={clearHistory}
                />
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-8 border-t border-white/5 pt-4 text-center text-[11px] text-white/35">
          AeroMind is a software-only simulation. Sensor readings, energy, and savings are
          estimates for demonstration. A real deployment would feed live sensor data into the same
          rule engine.
        </footer>
      </main>

      <HowItWorks open={howOpen} onClose={() => setHowOpen(false)} />
      <ComfortSettingsDrawer
        open={comfortOpen}
        onClose={() => setComfortOpen(false)}
        settings={comfort}
        onChange={setComfort}
      />
      <EnergyReportDrawer
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        report={reportData}
      />
      <GuidedDemoOverlay
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        comfort={comfort}
        onApplyScenario={applyDemoStep}
      />
    </div>
  );
}
