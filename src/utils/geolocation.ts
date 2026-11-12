import { Center } from '@/types';

/** Check-in geofence for one center, derived from the center record managed in Settings. */
export interface VenueGeofence {
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
}

/**
 * Builds the geofence for a center. Returns null when the center has no coordinates yet, so callers
 * can tell the employee to contact the admin instead of silently checking against another center.
 */
export function centerToVenue(center: Center | undefined | null): VenueGeofence | null {
  if (!center || center.latitude == null || center.longitude == null) return null;
  return {
    name: center.name,
    shortName: center.name,
    address: center.address,
    latitude: center.latitude,
    longitude: center.longitude,
    allowedRadiusMeters: center.radiusMeters || 250,
  };
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GeofenceCheckResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  allowedRadiusMeters: number;
  venue: VenueGeofence;
}

export function checkVenueGeofence(latitude: number, longitude: number, venue: VenueGeofence): GeofenceCheckResult {
  const distanceMeters = calculateDistanceMeters(latitude, longitude, venue.latitude, venue.longitude);
  return {
    isWithinRadius: distanceMeters <= venue.allowedRadiusMeters,
    distanceMeters,
    allowedRadiusMeters: venue.allowedRadiusMeters,
    venue,
  };
}
