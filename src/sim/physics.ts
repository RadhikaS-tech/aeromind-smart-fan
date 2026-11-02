import type { Occupant, OccupantZone } from './types';

/**
 * Geometry helpers for the virtual room. The room is a unit square in
 * normalized [0..1] coordinates. The pedestal fan sits at the bottom-center
 * edge (0.5, 1.0) and blows "upward" (toward -Y) by default.
 */

export const FAN_POS = { x: 0.5, y: 1.0 };

export const ROOM_WIDTH_M = 5; // meters, for scale labels
export const ROOM_HEIGHT_M = 6;

/** Angle (deg) from fan toward an occupant. 0 = straight up, -90 = left, +90 = right. */
export function angleToOccupant(o: Occupant): number {
  const dx = o.x - FAN_POS.x;
  const dy = o.y - FAN_POS.y; // negative = up into room
  // atan2(x, -y) so that "up" is 0 deg
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

export function distanceToOccupant(o: Occupant): number {
  return Math.hypot(o.x - FAN_POS.x, o.y - FAN_POS.y);
}

export function activeOccupants(occ: Occupant[]): Occupant[] {
  return occ.filter((o) => o.active);
}

export function computeZones(occ: Occupant[]): OccupantZone[] {
  return activeOccupants(occ)
    .map((o) => ({
      id: o.id,
      label: o.label,
      angle: angleToOccupant(o),
      distance: distanceToOccupant(o),
      occupant: o,
    }))
    .sort((a, b) => a.distance - b.distance);
}

/** Smallest angular span (in degrees) that contains all zone angles, <=180. */
export function occupiedAngularSpan(zones: OccupantZone[]): number {
  if (zones.length === 0) return 0;
  if (zones.length === 1) return 0;
  const angles = zones.map((z) => z.angle);
  let min = angles[0];
  let max = angles[0];
  for (const a of angles) {
    min = Math.min(min, a);
    max = Math.max(max, a);
  }
  return Math.min(180, max - min);
}

export function midpointAngle(zones: OccupantZone[]): number {
  if (zones.length === 0) return 0;
  let min = zones[0].angle;
  let max = zones[0].angle;
  for (const z of zones) {
    min = Math.min(min, z.angle);
    max = Math.max(max, z.angle);
  }
  return (min + max) / 2;
}

/** Are two occupants "close together"? angular distance threshold in degrees. */
export function areClose(zones: OccupantZone[], threshold = 22): boolean {
  if (zones.length < 2) return false;
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (Math.abs(zones[i].angle - zones[j].angle) <= threshold) return true;
    }
  }
  return false;
}
