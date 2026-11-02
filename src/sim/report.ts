import type {
  AnalyticsSummary,
  ComfortSettings,
  Decision,
  EnergyProjection,
  EnergyReportData,
  FanState,
  Mode,
  Occupant,
  SensorReadings,
} from './types';
import { decide } from './logic';
import { aeromindPower, manualBaselinePower } from './energy';

/** Assumed electricity tariff in USD per kWh for cost projections. */
const COST_PER_KWH = 0.15;
/** Approximate kg CO₂ avoided per kWh saved (grid average). */
const CO2_PER_KWH = 0.42;

/**
 * Project energy usage over `hours` assuming the current conditions stay
 * fixed. Both AeroMind and the manual baseline are evaluated against the
 * SAME sensors/occupants/mode so the comparison is apples-to-apples.
 */
export function projectEnergy(
  sensors: SensorReadings,
  occupants: Occupant[],
  mode: Mode,
  manualFan: FanState,
  comfort: ComfortSettings,
  hours: number,
): EnergyProjection {
  const present = occupants.some((o) => o.active);
  const d = decide(mode, sensors, occupants, manualFan, comfort);
  const liveOn = mode === 'manual' ? manualFan.speed > 0 : d.fanOn;
  const liveSpeed = mode === 'manual' ? manualFan.speed : d.speed;
  const liveSwing = mode === 'manual' ? manualFan.swing : d.swing;
  const aW = liveOn
    ? aeromindPower({ ...manualFan, on: liveOn, speed: liveSpeed, swing: liveSwing })
    : 0;
  const mW = manualBaselinePower(present);

  const aeromindWh = aW * hours;
  const manualWh = mW * hours;
  const savingsWh = Math.max(0, manualWh - aeromindWh);
  const savingsPct = manualWh > 0.0001 ? (savingsWh / manualWh) * 100 : 0;

  return {
    hours,
    aeromindWh,
    manualWh,
    savingsWh,
    savingsPct,
    aeromindKwh: aeromindWh / 1000,
    manualKwh: manualWh / 1000,
    savingsKwh: savingsWh / 1000,
    estCostAeromind: (aeromindWh / 1000) * COST_PER_KWH,
    estCostManual: (manualWh / 1000) * COST_PER_KWH,
    estCostSavings: (savingsWh / 1000) * COST_PER_KWH,
    co2KgSaved: (savingsWh / 1000) * CO2_PER_KWH,
  };
}

/** Build a human-readable energy report from the live summary + a projection. */
export function buildReport(
  label: string,
  live: AnalyticsSummary,
  decision: Decision,
  sensors: SensorReadings,
  occupants: Occupant[],
  mode: Mode,
  manualFan: FanState,
  comfort: ComfortSettings,
  hours: number,
): EnergyReportData {
  const projection = projectEnergy(
    sensors,
    occupants,
    mode,
    manualFan,
    comfort,
    hours,
  );

  const insights: string[] = [];
  if (projection.savingsWh > 0) {
    insights.push(
      `AeroMind saves ~${projection.savingsWh.toFixed(1)} Wh (${projection.savingsPct.toFixed(0)}%) over ${hours}h under current conditions.`,
    );
  } else if (projection.savingsWh === 0 && projection.manualWh > 0) {
    insights.push(
      'No savings right now — AeroMind matches the manual baseline under these conditions.',
    );
  }
  if (decision.zones.length === 0) {
    insights.push('The room is empty, so AeroMind keeps the fan off — the biggest single saver.');
  } else if (decision.zones.length === 1) {
    insights.push('A single occupant means a focused, narrow swing instead of a wide sweep.');
  } else {
    insights.push(`${decision.zones.length} occupants detected — swing width adapts to their spread.`);
  }
  if (projection.co2KgSaved > 0) {
    insights.push(
      `Projected CO₂ avoided: ~${projection.co2KgSaved.toFixed(3)} kg over ${hours}h.`,
    );
  }
  if (comfort.speedBias !== 0) {
    insights.push(
      `Your personal speed bias (${comfort.speedBias > 0 ? '+' : ''}${comfort.speedBias}) is shifting every auto decision.`,
    );
  }

  return {
    generatedAt: Date.now(),
    label,
    live,
    projection,
    comfort,
    topInsights: insights,
  };
}

export { COST_PER_KWH, CO2_PER_KWH };
