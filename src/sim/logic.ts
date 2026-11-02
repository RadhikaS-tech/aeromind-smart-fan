import type { ComfortSettings, Decision, FanState, Mode, Occupant, SensorReadings } from './types';
import {
  areClose,
  computeZones,
  midpointAngle,
  occupiedAngularSpan,
} from './physics';

export const DEFAULT_COMFORT: ComfortSettings = {
  targetTemp: 24,
  coolThreshold: 18,
  humidityHigh: 70,
  humidityLow: 35,
  speedBias: 0,
};

/**
 * Comfort rules — explainable, human-readable heuristics.
 * Returns a target speed 0..5 and a list of human-readable reasons.
 *
 * Baseline: comfortable around `settings.targetTemp`°C & ~50% RH.
 *  - Hotter => higher speed, in bands offset from the target.
 *  - High humidity reduces evaporative cooling, so we add speed when RH
 *    exceeds `humidityHigh` and back off below `humidityLow` (dry feels cooler).
 *  - At/below `coolThreshold` the fan turns off in auto mode regardless of occupants.
 *  - `speedBias` lets a user who runs warmer/cooler nudge the final speed.
 */
export function comfortSpeed(
  sensors: SensorReadings,
  occupantsPresent: boolean,
  settings: ComfortSettings = DEFAULT_COMFORT,
): {
  speed: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  const t = sensors.temperature;
  const rh = sensors.humidity;

  if (!occupantsPresent) {
    reasons.push('No occupants detected — fan idle.');
    return { speed: 0, reasons };
  }

  if (t <= settings.coolThreshold) {
    reasons.push(`Room at ${t}°C is below the cooling threshold (${settings.coolThreshold}°C) — fan off.`);
    return { speed: 0, reasons };
  }

  let speed = 0;
  const tgt = settings.targetTemp;

  // Temperature band — offsets relative to the comfort target
  if (t >= tgt + 8) speed = 5;
  else if (t >= tgt + 5) speed = 4;
  else if (t >= tgt + 3) speed = 3;
  else if (t >= tgt + 1) speed = 2;
  else if (t >= tgt - 2) speed = 1;
  else speed = 1; // coolThreshold..tgt-2 -> gentle
  reasons.push(
    `Temperature ${t}°C maps to base speed ${speed} (comfort target ~${tgt}°C).`,
  );

  // Humidity adjustment
  if (rh >= settings.humidityHigh) {
    speed = Math.min(5, speed + 1);
    reasons.push(`High humidity ${rh}% reduces evaporative cooling — +1 step.`);
  } else if (rh >= settings.humidityHigh - 10) {
    reasons.push(`Humidity ${rh}% is slightly elevated — holding speed.`);
  } else if (rh <= settings.humidityLow) {
    speed = Math.max(0, speed - 1);
    reasons.push(`Dry air ${rh}% makes airflow feel cooler — −1 step.`);
  } else {
    reasons.push(`Humidity ${rh}% is in the comfortable band.`);
  }

  // Personal speed bias
  if (settings.speedBias !== 0) {
    const before = speed;
    speed = Math.max(0, Math.min(5, speed + settings.speedBias));
    const sign = settings.speedBias > 0 ? '+' : '';
    reasons.push(
      `Personal preference bias (${sign}${settings.speedBias}) adjusted speed ${before} → ${speed}.`,
    );
  }

  return { speed, reasons };
}

/** Decide swing (half-amplitude in degrees) and heading in auto mode. */
function decideAutoAiming(zones: ReturnType<typeof computeZones>) {
  const reasons: string[] = [];
  if (zones.length === 0) {
    return { heading: 0, swing: 60, reasons: ['No occupied zones — centered idle sweep.'] };
  }
  const heading = midpointAngle(zones);
  const span = occupiedAngularSpan(zones);
  const close = areClose(zones);
  let swing: number;
  if (zones.length === 1) {
    // Aim directly, gentle oscillation
    swing = 12;
    reasons.push(
      `Single occupant at ${zones[0].label} — aiming directly with a narrow ±12° oscillation.`,
    );
  } else if (close) {
    // Close together — narrow swing covering the cluster
    swing = Math.min(18, Math.max(10, span / 2 + 6));
    reasons.push(
      `Occupants are clustered within ${Math.round(span)}° — narrowing swing to ±${Math.round(swing)}° to focus the cluster.`,
    );
  } else {
    // Spread out — widen swing to cover both
    swing = Math.min(60, Math.max(span / 2 + 8, 22));
    reasons.push(
      `Occupants spread across ${Math.round(span)}° — widening swing to ±${Math.round(swing)}° to cover both zones.`,
    );
  }
  return { heading, swing, reasons };
}

export function decide(
  mode: Mode,
  sensors: SensorReadings,
  occupants: Occupant[],
  manualFan: FanState,
  comfort: ComfortSettings = DEFAULT_COMFORT,
): Decision {
  const zones = computeZones(occupants);
  const present = zones.length > 0;
  const c = comfortSpeed(sensors, present, comfort);

  if (mode === 'manual') {
    return {
      mode,
      fanOn: present && manualFan.speed > 0,
      speed: manualFan.speed,
      heading: manualFan.heading,
      swing: manualFan.swing,
      reason: [
        'Manual mode — user-controlled speed and swing.',
        present
          ? `${zones.length} occupant(s) present.`
          : 'No occupants detected; fan still responds to manual speed.',
      ],
      zones,
    };
  }

  // Auto mode
  if (!present) {
    return {
      mode,
      fanOn: false,
      speed: 0,
      heading: 0,
      swing: 60,
      reason: [
        ...c.reasons,
        'Empty room — AeroMind turns the fan off to save energy.',
      ],
      zones,
    };
  }
  if (c.speed === 0) {
    return {
      mode,
      fanOn: false,
      speed: 0,
      heading: 0,
      swing: 60,
      reason: [...c.reasons, 'Comfort conditions are cool enough — fan off in auto mode.'],
      zones,
    };
  }
  const aim = decideAutoAiming(zones);
  return {
    mode,
    fanOn: true,
    speed: c.speed,
    heading: aim.heading,
    swing: aim.swing,
    reason: [...c.reasons, ...aim.reasons],
    zones,
  };
}
