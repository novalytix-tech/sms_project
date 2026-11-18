import { UserRole } from '../types';

/**
 * TEMPORARY bridge for modules that still read the browser-side demo store
 * (services/storage.ts + data/seedData.ts) instead of the backend API.
 * Those modules look up "the current teacher/student/parent" by these local ids.
 * Delete this file once every module reads from the API (see AUDIT.md).
 */
export const LEGACY_REFERENCE_IDS: Partial<Record<UserRole, string>> = {
  teacher: 'teach-1',
  parent: 'parent-patel',
  student: 'stud-1',
  supplier: 'supp-1',
};
