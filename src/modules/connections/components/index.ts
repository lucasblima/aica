/**
 * Connections Module - Shared Components
 *
 * This file exports all reusable React components for the Connections module.
 * These components follow the Ceramic design system and work with all four archetypes:
 * - Habitat: Condomínios e residências
 * - Ventures: Projetos e empresas
 * - Academia: Cursos, mentorias e aprendizado
 * - Tribo: Clubes e comunidades
 */

export { SpaceCard } from './SpaceCard';
export { SpaceHeader } from './SpaceHeader';
export { SpaceDetailsHeader } from './SpaceDetailsHeader';
export { SpaceMemberList } from './SpaceMemberList';
export { CreateSpaceWizard } from './CreateSpaceWizard';
export { ConnectionSpaceCard } from './ConnectionSpaceCard';
export { CreateConnectionModal } from './CreateConnectionModal';
export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbItem } from './Breadcrumbs';
export { ConnectionsLayout } from './ConnectionsLayout';

// Finance Integration Components
export { SpaceFinanceSummary } from './SpaceFinanceSummary';
export { MemberBalanceCard } from './MemberBalanceCard';
export { SplitPaymentTracker } from './SplitPaymentTracker';
export { SyncToFinanceButton } from './SyncToFinanceButton';

// Member Management Components
export { InviteMemberForm } from './InviteMemberForm';

// Member Display Components
export { MemberAvatarStack } from './MemberAvatarStack';

// Performance-Optimized Components
export { VirtualList, VirtualGrid } from './VirtualList';
export { OptimizedImage, OptimizedAvatar } from './OptimizedImage';
export * from './skeletons';

// WhatsApp Contact Components (Issue #92)
export { WhatsAppContactCard } from './WhatsAppContactCard';
export { WhatsAppContactList } from './WhatsAppContactList';
export { ContactFilters } from './ContactFilters';
export { ContactSearchBar } from './ContactSearchBar';

// WhatsApp Intent Timeline Components (Issue #186)
export { IntentTimelineCard } from './IntentTimelineCard';
export type { IntentTimelineCardProps } from './IntentTimelineCard';
