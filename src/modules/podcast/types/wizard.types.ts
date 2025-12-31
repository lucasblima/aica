/**
 * Guest Identification Wizard Type Definitions
 *
 * Types for the multi-step wizard used in podcast episode creation.
 */

// ============================================================================
// WIZARD FLOW TYPES
// ============================================================================

/**
 * Available wizard steps
 */
export type WizardStep =
  | 'guest-type'         // Step 0: Choose between Public Figure or Direct Contact
  | 'search-public'      // Step 1a: Search for public figure by name
  | 'manual-form'        // Step 1b: Manual contact entry
  | 'confirm-profile'    // Step 2: Confirm researched profile (public-figure only)
  | 'episode-details';   // Step 3: Episode details and scheduling

/**
 * Guest type selection
 */
export type GuestType = 'public-figure' | 'direct-contact';

/**
 * Theme generation mode
 */
export type ThemeMode = 'auto' | 'manual';

// ============================================================================
// GUEST PROFILE TYPES
// ============================================================================

/**
 * Researched guest profile from Gemini API
 *
 * This is the structured data returned by the guest research service
 * after searching for a public figure.
 */
export interface GuestProfile {
  /** Full name of the guest */
  name: string;

  /** Professional title or role */
  title: string;

  /** 2-3 sentence biography */
  biography: string;

  /** Array of recent notable facts or achievements (last 2 years) */
  recent_facts: string[];

  /** Topics the guest is known for or passionate about */
  topics_of_interest: string[];

  /** Significant controversies an interviewer should be aware of */
  controversies?: string[];

  /** Profile image URL (optional) */
  image_url?: string;

  /** Confidence score of the research (0-100) */
  confidence_score?: number;

  /** When the profile was researched */
  researched_at?: string;

  /** Whether reliable information was found */
  is_reliable?: boolean;
}

// ============================================================================
// WIZARD STATE TYPES
// ============================================================================

/**
 * Complete wizard state
 */
export interface WizardState {
  /** Current step in the wizard */
  currentStep: WizardStep;

  /** Selected guest type */
  guestType: GuestType | null;

  /** Guest data collected throughout the wizard */
  guestData: {
    /** Guest name */
    name: string;

    /** Email (for direct contact) */
    email?: string;

    /** Phone (for direct contact) */
    phone?: string;

    /** Reference/context for guest search (e.g., "CEO Tesla") */
    reference?: string;

    /** Confirmed guest profile after research (public-figure only) */
    confirmedProfile?: GuestProfile;
  };

  /** Episode data collected in final step */
  episodeData: {
    /** Episode theme/topic */
    theme: string;

    /** How theme was generated (auto by AI or manual by user) */
    themeMode: ThemeMode;

    /** Season number */
    season: number;

    /** Recording location */
    location: string;

    /** Scheduled date (YYYY-MM-DD) */
    scheduledDate?: string;

    /** Scheduled time (HH:MM) */
    scheduledTime?: string;
  };
}

// ============================================================================
// EPISODE CREATION TYPES
// ============================================================================

/**
 * Final data structure for creating an episode
 *
 * This combines guest data and episode data for submission to the backend.
 */
export interface EpisodeCreationData {
  // Guest information
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_reference?: string;
  guest_profile?: GuestProfile;

  // Episode information
  episode_theme: string;
  theme_mode: ThemeMode;
  season: number;
  location: string;
  scheduled_date?: string;
  scheduled_time?: string;

  // Metadata
  status: 'draft' | 'in_progress' | 'recorded' | 'published';
}
