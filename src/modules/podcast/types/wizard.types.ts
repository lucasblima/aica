/**
 * Wizard Types for Guest Identification Wizard
 * Defines all types used in the multi-step guest identification process
 */

// Wizard step identifiers
export type WizardStep =
  | 'guest-type'           // Step 0: Choose guest type
  | 'search-public'        // Step 1a: Search for public figure
  | 'manual-form'          // Step 1b: Manual contact entry
  | 'confirm-profile'      // Step 2: Confirm public figure profile (public-figure only)
  | 'episode-details';     // Step 3: Final episode details

// Guest type selection
export type GuestType = 'public-figure' | 'direct-contact';

// Guest profile from Gemini Deep Research (for public figures)
export interface GuestProfile {
  fullName: string;
  title?: string;
  biography?: string;
  occupation?: string;
  achievements?: string[];
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  imageUrl?: string;
}

// Wizard state management
export interface WizardState {
  currentStep: WizardStep;
  guestType: GuestType | null;

  // Guest data
  guestData: {
    name: string;
    email?: string;
    phone?: string;
    reference?: string;
    confirmedProfile?: GuestProfile;
  };

  // Episode data
  episodeData: {
    theme: string;
    themeMode: 'auto' | 'manual';
    season: number;
    location: string;
    scheduledDate?: string;
    scheduledTime?: string;
  };
}

// Final data structure when wizard is completed
export interface EpisodeCreationData {
  // Guest information
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_reference?: string;
  guest_profile?: GuestProfile;

  // Episode information
  episode_theme: string;
  theme_mode: 'auto' | 'manual';
  season: number;
  location: string;
  scheduled_date?: string;
  scheduled_time?: string;

  // Metadata
  status: 'draft';
}
