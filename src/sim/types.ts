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

/** User-tunable comfort preferences. Persisted to localStorage. */
export interface ComfortSettings {
  /** target comfortable temperature in °C (drives the speed bands) */
  targetTemp: number;
  /** temperature below which the fan turns off in auto mode */
  coolThreshold: number;
  /** RH above which a speed step is added */
  humidityHigh: number;
  /** RH below which a speed step is subtracted */
  humidityLow: number;
  /** a per-user bias added to the computed speed (-2..+2) */
  speedBias: number;
}

/** A captured snapshot of a simulation state, for history. */
export interface SimulationSnapshot {
  id: string;
  label: string;
  timestamp: number;
  occupants: Occupant[];
  sensors: SensorReadings;
  mode: Mode;
  decision: Decision;
  summary: AnalyticsSummary;
}

/** Result of projecting energy over a time horizon for the same conditions. */
export interface EnergyProjection {
  hours: number;
  aeromindWh: number;
  manualWh: number;
  savingsWh: number;
  savingsPct: number;
  aeromindKwh: number;
  manualKwh: number;
  savingsKwh: number;
  estCostAeromind: number;
  estCostManual: number;
  estCostSavings: number;
  co2KgSaved: number;
}

/** A structured report combining live + projected savings. */
export interface EnergyReportData {
  generatedAt: number;
  label: string;
  live: AnalyticsSummary;
  projection: EnergyProjection;
  comfort: ComfortSettings;
  topInsights: string[];
}
