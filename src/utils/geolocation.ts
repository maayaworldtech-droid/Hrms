export interface VenueGeofence {
  name: string;
  shortName: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
}

export const VENUE_GEOFENCES: Record<string, VenueGeofence> = {
  Hyderabad: {
    name: 'Maaya World Hyderabad',
    shortName: 'Hyderabad Center',
    address: 'Prism Mall, Financial District, Gachibowli',
    latitude: 17.4326,
    longitude: 78.3411,
    allowedRadiusMeters: 250,
  },
  Vizag: {
    name: 'Maaya World Visakhapatnam',
    shortName: 'Vizag Center',
    address: 'Beach Road, Opp. TU 142 Aircraft Museum',
    latitude: 17.7196,
    longitude: 83.3328,
    allowedRadiusMeters: 250,
  },
  Bhubaneswar: {
    name: 'Maaya World Bhubaneswar',
    shortName: 'Bhubaneswar Center',
    address: 'KIIT Chowk, Patia Square',
    latitude: 20.3541,
    longitude: 85.8175,
    allowedRadiusMeters: 250,
  },
};

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

export function checkVenueGeofence(
  latitude: number,
  longitude: number,
  locationName: string = 'Hyderabad'
): GeofenceCheckResult {
  const venue = VENUE_GEOFENCES[locationName] || VENUE_GEOFENCES['Hyderabad'];
  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    venue.latitude,
    venue.longitude
  );

  return {
    isWithinRadius: distanceMeters <= venue.allowedRadiusMeters,
    distanceMeters,
    allowedRadiusMeters: venue.allowedRadiusMeters,
    venue,
  };
}

export interface SimulatedLocationPreset {
  id: string;
  label: string;
  description: string;
  latitude: number;
  longitude: number;
  locationKey: string;
  isInside: boolean;
}

export const TEST_LOCATION_PRESETS: Record<string, SimulatedLocationPreset[]> = {
  Hyderabad: [
    {
      id: 'hyd-on-premise',
      label: 'On-Premise (Prism Mall, Hyderabad)',
      description: 'At venue entrance (~18m from GPS beacon)',
      latitude: 17.4327,
      longitude: 78.3412,
      locationKey: 'Hyderabad',
      isInside: true,
    },
    {
      id: 'hyd-off-premise',
      label: 'Off-Premise (Remote / Home)',
      description: 'Outside venue radius (~14.2 km away in Begumpet)',
      latitude: 17.3850,
      longitude: 78.4867,
      locationKey: 'Hyderabad',
      isInside: false,
    },
  ],
  Vizag: [
    {
      id: 'vzg-on-premise',
      label: 'On-Premise (Beach Road, Vizag)',
      description: 'At venue entrance (~15m from GPS beacon)',
      latitude: 17.7197,
      longitude: 83.3329,
      locationKey: 'Vizag',
      isInside: true,
    },
    {
      id: 'vzg-off-premise',
      label: 'Off-Premise (Remote / Home)',
      description: 'Outside venue radius (~12.5 km away in Gajuwaka)',
      latitude: 17.6868,
      longitude: 83.2185,
      locationKey: 'Vizag',
      isInside: false,
    },
  ],
  Bhubaneswar: [
    {
      id: 'bbsr-on-premise',
      label: 'On-Premise (KIIT Chowk, Bhubaneswar)',
      description: 'At venue entrance (~16m from GPS beacon)',
      latitude: 20.3542,
      longitude: 85.8176,
      locationKey: 'Bhubaneswar',
      isInside: true,
    },
    {
      id: 'bbsr-off-premise',
      label: 'Off-Premise (Remote / Home)',
      description: 'Outside venue radius (~6.4 km away in Master Canteen)',
      latitude: 20.2961,
      longitude: 85.8245,
      locationKey: 'Bhubaneswar',
      isInside: false,
    },
  ],
};

