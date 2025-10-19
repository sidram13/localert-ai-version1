
import { Coordinates } from '../types';

/**
 * Calculates the distance between two coordinates in kilometers.
 * @param pos1 - The first coordinate.
 * @param pos2 - The second coordinate.
 * @returns The distance in kilometers.
 */
export function getDistance(pos1: Coordinates, pos2: Coordinates): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(pos2.latitude - pos1.latitude);
  const dLon = deg2rad(pos2.longitude - pos1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(pos1.latitude)) * Math.cos(deg2rad(pos2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
