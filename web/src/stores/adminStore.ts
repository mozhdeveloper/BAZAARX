/**
 * Admin Store — Barrel re-export
 * The monolithic adminStore has been split into domain-specific files
 * under ./admin/ for better maintainability.
 *
 * All existing imports from '@/stores/adminStore' continue to work unchanged.
 */
export * from './admin';
