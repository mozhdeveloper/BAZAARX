/**
 * Buyer Stores — Barrel export
 * Types and helpers are extracted for maintainability.
 * The main useBuyerStore hook remains in buyerStore.ts (parent).
 *
 * Import from '@/stores/buyerStore' still works via the parent barrel.
 */

export * from './buyerTypes';
export { deriveBuyerName, demoSellers } from './buyerHelpers';
