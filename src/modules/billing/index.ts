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
export { ManageSubscriptionPage } from './pages/ManageSubscriptionPage';
export { AdminCouponsPage } from './pages/AdminCouponsPage';
export { AdminPortalPage } from './pages/AdminPortalPage';
export { PricingSimulatorPage } from './pages/PricingSimulatorPage';
export { default as UsageDashboardPage } from './pages/UsageDashboardPage';

// ============================================
// COMPONENTS
// ============================================

export { PlanCard } from './components/PlanCard';
export { PixPaymentModal } from './components/PixPaymentModal';
