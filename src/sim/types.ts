export type Mode = 'auto' | 'manual';

export interface Occupant {
  id: string;
  label: string;
  /** normalized 0..1 coordinates within the room */
  x: number;
  y: number;
  active: boolean;
}

export interface FanState {
  /** 0..5 speed steps */
  speed: number;
  /** center swing angle in degrees, 0 = pointing "up" (toward -Y) */
  heading: number;
  /** half-swing amplitude in degrees (0..60). total sweep = 2*swing */
  swing: number;
  /** oscillation phase in radians */
  phase: number;
  on: boolean;
}

export interface RoomConfig {
  /** aspect ratio width/height in meters (for display scale only) */
  width: number;
  height: number;
}

export interface SensorReadings {
  /** degrees celsius */
  temperature: number;
  /** percent 0..100 */
  humidity: number;
}

export interface OccupantZone {
  id: string;
  label: string;
  /** angle from fan to occupant in degrees (0 = up) */
  angle: number;
  /** distance in normalized units 0..~1 */
  distance: number;
  occupant: Occupant;
}

export interface Decision {
  mode: Mode;
  fanOn: boolean;
  speed: number;
  heading: number;
  swing: number;
  reason: string[];
  zones: OccupantZone[];
}

export interface EnergySample {
  t: number;
  aeromindW: number;
  manualW: number;
  speed: number;
}

export interface AnalyticsSummary {
  aeromindWh: number;
  manualWh: number;
  savingsWh: number;
  savingsPct: number;
  manualAdjustsAvoided: number;
  runSeconds: number;
  samples: EnergySample[];
}
