import type { UserRole } from '@/types';

/**
 * Maaya World has exactly three kinds of people: the admin who runs every center, one manager
 * per center, and the staff at each center. Screens show this label instead of free-text job
 * titles, which in older records read like an IT company ("Senior Engineering Manager").
 */
export const accessLabel = (role?: UserRole | string): string =>
  role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Center manager' : 'Staff';
