/**
 * Admin Stores — Barrel export
 * All admin domain stores split into separate files for maintainability.
 * Import from '@/stores/adminStore' still works via the parent barrel.
 */

export * from './adminTypes';
export { useAdminAuth } from './adminAuthStore';
export { useAdminCategories } from './adminCategoriesStore';
export { useAdminSellers } from './adminSellersStore';
export { useAdminBuyers } from './adminBuyersStore';
export { useAdminStats } from './adminStatsStore';
export { useAdminVouchers } from './adminVouchersStore';
export { useAdminReviews } from './adminReviewsStore';
export { useAdminProducts } from './adminProductsStore';
export { useAdminPayouts } from './adminPayoutsStore';
