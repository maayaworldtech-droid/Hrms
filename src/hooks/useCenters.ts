import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { api } from '@/services/api';
import { Center } from '@/types';

/**
 * Shared, cached list of centers. Every screen that needs center names or geofences reads from here,
 * and Settings calls refreshCenters() after a change so all open screens update together.
 */

interface CentersState {
  centers: Center[];
  isLoading: boolean;
  error: string | null;
  loaded: boolean;
}

let state: CentersState = { centers: [], isLoading: false, error: null, loaded: false };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = (next: Partial<CentersState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const refreshCenters = (): Promise<void> => {
  if (inflight) return inflight;
  emit({ isLoading: true, error: null });
  inflight = api.centers
    .getAll()
    .then((centers) => emit({ centers, isLoading: false, loaded: true }))
    .catch((err: any) => emit({ isLoading: false, loaded: true, error: err?.message || 'Could not load centers' }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

export const useCenters = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!snapshot.loaded && !snapshot.isLoading) {
      void refreshCenters();
    }
  }, [snapshot.loaded, snapshot.isLoading]);

  const refresh = useCallback(() => refreshCenters(), []);

  return {
    centers: snapshot.centers,
    centerNames: snapshot.centers.map((c) => c.name),
    isLoading: snapshot.isLoading || !snapshot.loaded,
    error: snapshot.error,
    refresh,
  };
};

/** Old short names stored before centers were renamed; existing sessions may still carry them. */
const LEGACY_CENTER_NAMES: Record<string, string> = {
  hyderabad: 'Maaya World Hyderabad',
  'hyderabad center': 'Maaya World Hyderabad',
  vizag: 'Maaya World Vizag',
  visakhapatnam: 'Maaya World Vizag',
  'vizag center': 'Maaya World Vizag',
  bhubaneswar: 'Maaya World Bhubaneswar',
  'bhubaneswar center': 'Maaya World Bhubaneswar',
};

/** Finds a center by name (case-insensitive), accepting the legacy short names. */
export const findCenter = (centers: Center[], name?: string | null): Center | undefined => {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  const direct = centers.find((c) => c.name.toLowerCase() === clean);
  if (direct) return direct;
  const mapped = LEGACY_CENTER_NAMES[clean];
  return mapped ? centers.find((c) => c.name.toLowerCase() === mapped.toLowerCase()) : undefined;
};

export const centerTypeLabel = (type: Center['centerType']) => (type === 'GAMING_ZONE' ? 'Gaming zone' : 'Center');
