import type { FanState } from './types';

/**
 * Energy model (simulated, explainable).
 *
 * A typical 1200mm BLDC ceiling/pedestard fan draws roughly:
 *   speed 0 -> 0 W, speed 5 -> ~28 W  (BLDC is efficient)
 * We model a roughly quadratic power curve since fan power ~ rpm^3, but
 * scaled to the BLDC efficient envelope.
 *
 * AeroMind's savings come from:
 *   - turning off in empty rooms (manual would keep running at a fixed speed)
 *   - running lower speeds when comfortable
 *   - narrower swing reducing effective airflow duty
 *
 * "Manual baseline" assumes a typical user leaves the fan at a fixed speed
 * (default 3 = ~12W) whenever anyone is home, and at speed 2 even when the
 * room empties. AeroMind turns off / dials down instead.
 */

const MANUAL_DEFAULT_SPEED = 3;
const MANUAL_EMPTY_SPEED = 2;

export function speedToWatts(speed: number): number {
  if (speed <= 0) return 0;
  // ~28W at speed 5, quadratic-ish
  const norm = speed / 5;
  return Math.round(2 + 26 * Math.pow(norm, 2.1) * 10) / 10;
}

/** AeroMind live power */
export function aeromindPower(fan: FanState): number {
  if (!fan.on || fan.speed <= 0) return 0;
  // Narrower swing slightly reduces effective energy via less air moved
  const swingFactor = 0.85 + (fan.swing / 60) * 0.15;
  return Math.round(speedToWatts(fan.speed) * swingFactor * 10) / 10;
}

/** Manual baseline live power — assumes user leaves fan running */
export function manualBaselinePower(occupantsPresent: boolean): number {
  return speedToWatts(occupantsPresent ? MANUAL_DEFAULT_SPEED : MANUAL_EMPTY_SPEED);
}

export function accumulateEnergy(
  prev: { aeromindWh: number; manualWh: number; manualAdjustsAvoided: number },
  aeromindW: number,
  manualW: number,
  dtSeconds: number,
  decisionActive: boolean,
): { aeromindWh: number; manualWh: number; manualAdjustsAvoided: number } {
  const hours = dtSeconds / 3600;
  // Count an "adjustment avoided" when AeroMind changes speed away from the
  // manual default while people are present, or turns off in an empty room.
  const avoided =
    (decisionActive && Math.abs(aeromindW - manualW) > 0.5) ? 1 : 0;
  return {
    aeromindWh: prev.aeromindWh + (aeromindW * hours),
    manualWh: prev.manualWh + (manualW * hours),
    manualAdjustsAvoided: prev.manualAdjustsAvoided + avoided,
  };
}

export const MANUAL_DEFAULT = MANUAL_DEFAULT_SPEED;
