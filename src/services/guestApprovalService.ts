/**
 * Guest Approval Service
 *
 * Manages guest approval link generation and sending for podcast episodes.
 * Integrates with Edge Function: send-guest-approval-link
 */

import { supabase } from './supabaseClient';
import { sendGuestApprovalLink as sendApprovalLinkEdge } from './edgeFunctionService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GuestApprovalService');


// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalLinkRequest {
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  method: 'email' | 'whatsapp';
}

export interface ApprovalLinkResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApprovalTokenData {
  token: string;
  url: string;
  expiresAt: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a secure random token using Web Crypto API
 */
const generateSecureToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a secure approval token for guest
 * Token is stored in podcast_episodes.approval_token
 */
export const generateApprovalToken = async (
  episodeId: string
): Promise<ApprovalTokenData | null> => {
  try {
    // Generate secure random token using Web Crypto API
    const token = generateSecureToken();

    // Set expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Update episode with approval token
    const { error: updateError } = await supabase
      .from('podcast_episodes')
      .update({
        approval_token: token,
        approval_token_created_at: new Date().toISOString(),
      })
      .eq('id', episodeId);

    if (updateError) {
      throw updateError;
    }

    // Construct approval URL
    const baseUrl = window.location.origin;
    const approvalUrl = `${baseUrl}/guest-approval/${episodeId}/${token}`;

    return {
      token,
      url: approvalUrl,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    log.error('Error generating approval token:', { error: error });
    return null;
  }
};

/**
 * Get existing approval token for episode
 * Returns null if token doesn't exist or is expired
 */
export const getApprovalToken = async (
  episodeId: string
): Promise<ApprovalTokenData | null> => {
  try {
    const { data: episode, error } = await supabase
      .from('podcast_episodes')
      .select('approval_token, approval_token_created_at')
      .eq('id', episodeId)
      .single();

    if (error || !episode?.approval_token) {
      return null;
    }

    // Check if token is expired (30 days)
    if (episode.approval_token_created_at) {
      const tokenAge = Date.now() - new Date(episode.approval_token_created_at).getTime();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      if (tokenAge > thirtyDaysInMs) {
        // Token expired, generate new one
        return generateApprovalToken(episodeId);
      }
    }

    // Token is valid, construct URL
    const baseUrl = window.location.origin;
    const approvalUrl = `${baseUrl}/guest-approval/${episodeId}/${episode.approval_token}`;

    const expiresAt = new Date(episode.approval_token_created_at);
    expiresAt.setDate(expiresAt.getDate() + 30);

    return {
      token: episode.approval_token,
      url: approvalUrl,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    log.error('Error getting approval token:', { error: error });
    return null;
  }
};

/**
 * Get or create approval token
 * Returns existing valid token or generates new one
 */
export const getOrCreateApprovalToken = async (
  episodeId: string
): Promise<ApprovalTokenData | null> => {
  const existingToken = await getApprovalToken(episodeId);
  if (existingToken) {
    return existingToken;
  }

  return generateApprovalToken(episodeId);
};

// ============================================================================
// SEND APPROVAL LINK
// ============================================================================

/**
 * Send approval link to guest via email or WhatsApp
 * Uses centralized Edge Function helper for unified error handling
 */
export const sendApprovalLink = async (
  request: ApprovalLinkRequest
): Promise<ApprovalLinkResponse> => {
  try {
    // Get or create approval token
    const tokenData = await getOrCreateApprovalToken(request.episodeId);

    if (!tokenData) {
      return {
        success: false,
        error: 'Falha ao gerar link de aprovação',
      };
    }

    // Validate required fields based on method
    if (request.method === 'email' && !request.guestEmail) {
      return {
        success: false,
        error: 'Email do convidado é obrigatório para envio por email',
      };
    }

    if (request.method === 'whatsapp' && !request.guestPhone) {
      return {
        success: false,
        error: 'Telefone do convidado é obrigatório para envio por WhatsApp',
      };
    }

    // Call Edge Function helper
    const response = await sendApprovalLinkEdge({
      episodeId: request.episodeId,
      guestName: request.guestName,
      guestEmail: request.guestEmail,
      guestPhone: request.guestPhone,
      approvalUrl: tokenData.url,
      method: request.method,
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Erro desconhecido ao enviar link',
      };
    }

    return {
      success: true,
      message: response.message || `Link enviado com sucesso via ${request.method}`,
    };
  } catch (error) {
    log.error('Error sending approval link:', { error: error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar link de aprovação',
    };
  }
};

// ============================================================================
// APPROVAL STATUS
// ============================================================================

/**
 * Check if guest has approved/rejected the episode data
 */
export const getApprovalStatus = async (
  episodeId: string
): Promise<{
  approved: boolean | null;
  approvedAt?: string;
  notes?: string;
} | null> => {
  try {
    const { data, error } = await supabase
      .from('podcast_guest_research')
      .select('approved_by_guest, approved_at, approval_notes')
      .eq('episode_id', episodeId)
      .maybeSingle();

    if (error) {
      log.error('Error fetching approval status:', { error: error });
      return null;
    }

    if (!data) {
      return { approved: null };
    }

    return {
      approved: data.approved_by_guest,
      approvedAt: data.approved_at,
      notes: data.approval_notes,
    };
  } catch (error) {
    log.error('Error getting approval status:', { error: error });
    return null;
  }
};

/**
 * Validate phone number format (Brazilian format)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;

  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Valid formats:
  // - 11 digits: 11987654321 (with country code)
  // - 10 digits: 1198765432
  // - 13 digits: 5511987654321 (with +55)
  return cleaned.length >= 10 && cleaned.length <= 13;
};

/**
 * Format phone number for WhatsApp (add country code if needed)
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  // If already has country code, return as is
  if (cleaned.startsWith('55')) {
    return cleaned;
  }

  // Add Brazil country code
  return `55${cleaned}`;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
