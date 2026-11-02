import type { Decision, FanState, Mode, Occupant, SensorReadings } from './types';
import {
  areClose,
  computeZones,
  midpointAngle,
  occupiedAngularSpan,
} from './physics';

/**
 * Comfort rules — explainable, human-readable heuristics.
 * Returns a target speed 0..5 and a list of human-readable reasons.
 *
 * Baseline: comfortable around 24C & 50% RH.
 *  - Hotter => higher speed. Each degree above 24C adds roughly one step
 *    beyond a neutral base.
 *  - High humidity reduces evaporative cooling, so we add speed when RH>60%
 *    and back off slightly when RH<35% (dry, fan feels cooler).
 *  - Below 21C we ramp down (slight breeze only), and at/below 18C the fan
 *    turns off in auto mode regardless of occupants.
 */
export function comfortSpeed(sensors: SensorReadings, occupantsPresent: boolean): {
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

  if (t <= 18) {
    reasons.push(`Room at ${t}°C is below the cooling threshold (18°C) — fan off.`);
    return { speed: 0, reasons };
  }

  let speed = 0;

  // Temperature band
  if (t >= 32) speed = 5;
  else if (t >= 29) speed = 4;
  else if (t >= 27) speed = 3;
  else if (t >= 25) speed = 2;
  else if (t >= 22) speed = 1;
  else speed = 1; // 18..22 -> gentle
  reasons.push(
    `Temperature ${t}°C maps to base speed ${speed} (comfort target ~24°C).`,
  );

  // Humidity adjustment
  if (rh >= 70) {
    speed = Math.min(5, speed + 1);
    reasons.push(`High humidity ${rh}% reduces evaporative cooling — +1 step.`);
  } else if (rh >= 60) {
    reasons.push(`Humidity ${rh}% is slightly elevated — holding speed.`);
  } else if (rh <= 35) {
    speed = Math.max(0, speed - 1);
    reasons.push(`Dry air ${rh}% makes airflow feel cooler — −1 step.`);
  } else {
    reasons.push(`Humidity ${rh}% is in the comfortable band.`);
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
): Decision {
  const zones = computeZones(occupants);
  const present = zones.length > 0;
  const comfort = comfortSpeed(sensors, present);

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
        ...comfort.reasons,
        'Empty room — AeroMind turns the fan off to save energy.',
      ],
      zones,
    };
  }
  if (comfort.speed === 0) {
    return {
      mode,
      fanOn: false,
      speed: 0,
      heading: 0,
      swing: 60,
      reason: [...comfort.reasons, 'Comfort conditions are cool enough — fan off in auto mode.'],
      zones,
    };
  }
  const aim = decideAutoAiming(zones);
  return {
    mode,
    fanOn: true,
    speed: comfort.speed,
    heading: aim.heading,
    swing: aim.swing,
    reason: [...comfort.reasons, ...aim.reasons],
    zones,
  };
}
