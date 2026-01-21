/**
 * Onboarding Service
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Service layer for onboarding operations including:
 * - User profile management
 * - Onboarding step tracking
 * - WhatsApp session management
 * - Credits management
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type {
  UserProfile,
  WhatsAppSession,
  UserCredits,
  OnboardingStep,
  OnboardingData,
} from '../types';

const log = createNamespacedLogger('OnboardingService');

// =============================================================================
// USER PROFILE
// =============================================================================

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found - this is expected for new users
      return null;
    }
    log.error('Error fetching user profile:', error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Create or initialize user profile
 */
export async function initializeUserProfile(userId: string): Promise<UserProfile | null> {
  // First check if profile exists
  const existing = await getUserProfile(userId);
  if (existing) {
    return existing;
  }

  // Create new profile with default values
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      onboarding_step: 'welcome',
    })
    .select()
    .single();

  if (error) {
    log.error('Error creating user profile:', error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Update onboarding step
 */
export async function updateOnboardingStep(
  userId: string,
  step: OnboardingStep
): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      onboarding_step: step,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    log.error('Error updating onboarding step:', error);
    return false;
  }

  return true;
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      onboarding_step: 'ready',
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    log.error('Error completing onboarding:', error);
    return false;
  }

  return true;
}

// =============================================================================
// WHATSAPP SESSION
// =============================================================================

/**
 * Get WhatsApp session for user
 */
export async function getWhatsAppSession(userId: string): Promise<WhatsAppSession | null> {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Error fetching WhatsApp session:', error);
    return null;
  }

  return data as WhatsAppSession;
}

/**
 * Create WhatsApp session
 */
export async function createWhatsAppSession(
  userId: string,
  instanceName: string
): Promise<WhatsAppSession | null> {
  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .insert({
      user_id: userId,
      instance_name: instanceName,
      status: 'disconnected',
    })
    .select()
    .single();

  if (error) {
    log.error('Error creating WhatsApp session:', error);
    return null;
  }

  return data as WhatsAppSession;
}

/**
 * Update WhatsApp session status
 */
export async function updateWhatsAppSessionStatus(
  sessionId: string,
  status: WhatsAppSession['status'],
  additionalData?: Partial<WhatsAppSession>
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({
      status,
      ...additionalData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    log.error('Error updating WhatsApp session:', error);
    return false;
  }

  return true;
}

// =============================================================================
// USER CREDITS
// =============================================================================

/**
 * Get user credits
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    log.error('Error fetching user credits:', error);
    return null;
  }

  return data as UserCredits;
}

/**
 * Initialize user credits (called on signup)
 */
export async function initializeUserCredits(userId: string): Promise<UserCredits | null> {
  // Use the database function for atomic initialization
  const { data, error } = await supabase.rpc('initialize_user_credits', {
    p_user_id: userId,
  });

  if (error) {
    log.error('Error initializing user credits:', error);
    return null;
  }

  // Fetch the created/existing credits
  return getUserCredits(userId);
}

// =============================================================================
// AGGREGATED DATA
// =============================================================================

/**
 * Get all onboarding data for a user
 */
export async function getOnboardingData(userId: string): Promise<OnboardingData> {
  const [profile, session, credits] = await Promise.all([
    getUserProfile(userId),
    getWhatsAppSession(userId),
    getUserCredits(userId),
  ]);

  return {
    profile,
    session,
    credits,
  };
}

/**
 * Initialize all onboarding data for a new user
 */
export async function initializeOnboardingData(userId: string): Promise<OnboardingData> {
  const [profile, credits] = await Promise.all([
    initializeUserProfile(userId),
    initializeUserCredits(userId),
  ]);

  return {
    profile,
    session: null, // Session is created when user starts pairing
    credits,
  };
}
