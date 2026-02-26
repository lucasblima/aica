/**
 * Billing Module - Public API
 *
 * Barrel export for the billing module.
 * Includes pricing page and usage dashboard.
 * Lazy-loaded by AppRouter.tsx
 */

// ============================================
// PAGES
// ============================================

export { PricingPage } from './pages/PricingPage';
export { UsageDashboardPage } from './pages/UsageDashboardPage';
export { ManageSubscriptionPage } from './pages/ManageSubscriptionPage';
export { AdminCouponsPage } from './pages/AdminCouponsPage';

// ============================================
// COMPONENTS
// ============================================

export { PlanCard } from './components/PlanCard';
export { UsageStatsCard } from './components/UsageStatsCard';
export { PixPaymentModal } from './components/PixPaymentModal';
