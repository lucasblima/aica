/**
 * Academia Archetype - Main Index
 *
 * The "Library" of Learning - Complete archetype for educational growth.
 *
 * Design Philosophy: "Cultivo da Mente"
 * - Elegant typography and whitespace
 * - Paper-like aesthetic
 * - Silent library atmosphere
 * - Knowledge curation over consumption
 *
 * Features:
 * - Learning journeys (courses, books, certifications)
 * - Zettelkasten-style knowledge notes
 * - Mentorship relationships (giving & receiving)
 * - Academic credentials portfolio
 */

// Types
export * from './types';

// Services
export * from './services/journeyService';
export * from './services/noteService';
export * from './services/mentorshipService';
export * from './services/credentialService';

// Hooks
export * from './hooks/useJourneys';
export * from './hooks/useNotes';
export * from './hooks/useMentorships';
export * from './hooks/useCredentials';

// Components
export * from './components';

// Views
export * from './views';
