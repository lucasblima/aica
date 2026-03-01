/**
 * Grants Module Services
 * Barrel export for all grant-related services
 *
 * @module modules/grants/services
 */

// Document Processing
export * from './documentProcessingService';
export * from './documentService';

// Grant Management
export * from './grantService';
export * from './grantAIService';
export * from './grantTaskGenerator';
export * from './grantTaskSync';

// Organizations
export * from './organizationService';
export * from './organizationDocumentService';
export * from './organizationVenturesService';

// Projects & Opportunities
export * from './opportunityDocumentService';
export * from './projectDocumentService';

// Sponsorship
export * from './sponsorshipService';
export * from './prospectService';

// Incentive Laws
export * from './incentiveLawService';

// Presentation Generation (Issue #117 - Phase 3)
export * from './presentationRAGService';
export * from './presentationPrompts';
export * from './presentationContentGenerator';
export * from './presentationContentSchemas';

// Researcher Scoring (Issue #575 - Sprint 6)
export * from './researcherScoring';

// Utilities
export * from './briefingAIService';
// Note: pdfService.ts is deprecated - use processEdital from @/services/edgeFunctionService instead
// PDF processing now happens server-side via Google File Search
