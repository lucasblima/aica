/**
 * Guest Approval Service
 *
 * Handles all backend operations for guest approval workflow:
 * - Sending approval links via email/WhatsApp
 * - Verifying approval tokens
 * - Processing approval/rejection submissions
 * - Updating approval status in database
 */

import { supabase } from '@/services/supabaseClient';

interface SendApprovalLinkRequest {
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  approvalUrl: string;
  approvalToken: string;
  method: 'email' | 'whatsapp' | 'link';
}

interface SendApprovalLinkResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface ProcessApprovalRequest {
  episodeId: string;
  approvalToken: string;
  approved: boolean;
  notes: string;
}

interface ProcessApprovalResponse {
  success: boolean;
  message: string;
  approvalId?: string;
  error?: string;
}

/**
 * Send approval link to guest via specified method
 *
 * Supports three methods:
 * 1. Email - Sends approval link via email service
 * 2. WhatsApp - Sends approval link via WhatsApp API
 * 3. Link - Returns link for manual sharing (no sending)
 */
export async function sendApprovalLink(
  request: SendApprovalLinkRequest
): Promise<SendApprovalLinkResponse> {
  const { episodeId, guestName, guestEmail, guestPhone, approvalUrl, method } = request;

  try {
    // Validate required fields
    if (!episodeId || !guestName || !approvalUrl) {
      return {
        success: false,
        error: 'Campos obrigatórios faltando: episodeId, guestName, approvalUrl',
      };
    }

    // Validate method-specific requirements
    if (method === 'email' && !guestEmail) {
      return {
        success: false,
        error: 'Email do convidado não fornecido',
      };
    }

    if (method === 'whatsapp' && !guestPhone) {
      return {
        success: false,
        error: 'Telefone do convidado não fornecido',
      };
    }

    // Method: Email
    if (method === 'email') {
      return await sendApprovalLinkViaEmail(
        episodeId,
        guestName,
        guestEmail!,
        approvalUrl
      );
    }

    // Method: WhatsApp
    if (method === 'whatsapp') {
      return await sendApprovalLinkViaWhatsApp(
        episodeId,
        guestName,
        guestPhone!,
        approvalUrl
      );
    }

    // Method: Link only
    return {
      success: true,
      message: 'Link gerado com sucesso. Compartilhe manualmente com o convidado.',
    };
  } catch (error) {
    console.error('[sendApprovalLink] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar link de aprovação',
    };
  }
}

/**
 * Send approval link via email using SendGrid or similar service
 *
 * TODO: Implement with your email service provider
 * Options:
 * - SendGrid
 * - Resend
 * - Postmark
 * - AWS SES
 */
async function sendApprovalLinkViaEmail(
  episodeId: string,
  guestName: string,
  guestEmail: string,
  approvalUrl: string
): Promise<SendApprovalLinkResponse> {
  try {
    // Call your email API or Edge Function
    const response = await fetch('/api/podcast/send-approval-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episodeId,
        guestName,
        guestEmail,
        approvalUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Email API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: `Email de aprovação enviado para ${guestEmail}`,
    };
  } catch (error) {
    console.error('[sendApprovalLinkViaEmail] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar email',
    };
  }
}

/**
 * Send approval link via WhatsApp using Twilio or similar service
 *
 * TODO: Implement with your WhatsApp service provider
 * Options:
 * - Twilio
 * - Meta WhatsApp API
 * - Messagebird
 */
async function sendApprovalLinkViaWhatsApp(
  episodeId: string,
  guestName: string,
  guestPhone: string,
  approvalUrl: string
): Promise<SendApprovalLinkResponse> {
  try {
    // Call your WhatsApp API or Edge Function
    const response = await fetch('/api/podcast/send-approval-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episodeId,
        guestName,
        guestPhone,
        approvalUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `WhatsApp API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: `Mensagem WhatsApp enviada para ${guestPhone}`,
    };
  } catch (error) {
    console.error('[sendApprovalLinkViaWhatsApp] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar WhatsApp',
    };
  }
}

/**
 * Verify approval token is valid
 *
 * Checks:
 * - Token exists in database
 * - Token matches the one provided
 * - Token is not expired (> 30 days old)
 */
export async function verifyApprovalToken(
  episodeId: string,
  approvalToken: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data: episode, error } = await supabase
      .from('podcast_episodes')
      .select('approval_token, approval_token_created_at')
      .eq('id', episodeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!episode) {
      return { valid: false, error: 'Episódio não encontrado' };
    }

    if (episode.approval_token !== approvalToken) {
      return { valid: false, error: 'Token de aprovação inválido' };
    }

    if (episode.approval_token_created_at) {
      const tokenAge = Date.now() - new Date(episode.approval_token_created_at).getTime();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      if (tokenAge > thirtyDaysInMs) {
        return { valid: false, error: 'Token de aprovação expirado' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('[verifyApprovalToken] Error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erro ao verificar token',
    };
  }
}

/**
 * Process guest approval or rejection
 *
 * Saves approval status to podcast_guest_research table
 */
export async function processApproval(
  request: ProcessApprovalRequest
): Promise<ProcessApprovalResponse> {
  const { episodeId, approvalToken, approved, notes } = request;

  try {
    // Verify token first
    const tokenValid = await verifyApprovalToken(episodeId, approvalToken);
    if (!tokenValid.valid) {
      return {
        success: false,
        error: tokenValid.error || 'Token inválido',
      };
    }

    // Update podcast_guest_research with approval status
    const { error, data } = await supabase
      .from('podcast_guest_research')
      .update({
        approved_by_guest: approved,
        approved_at: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('episode_id', episodeId)
      .select('id')
      .single();

    if (error) {
      // If no guest research record exists, create one
      if (error.code === 'PGRST116') {
        const { error: insertError, data: insertData } = await supabase
          .from('podcast_guest_research')
          .insert({
            episode_id: episodeId,
            approved_by_guest: approved,
            approved_at: new Date().toISOString(),
            approval_notes: notes,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        return {
          success: true,
          message: `Aprovação ${approved ? 'registrada' : 'rejeitada'} com sucesso`,
          approvalId: insertData?.id,
        };
      }

      throw error;
    }

    return {
      success: true,
      message: `Aprovação ${approved ? 'registrada' : 'rejeitada'} com sucesso`,
      approvalId: data?.id,
    };
  } catch (error) {
    console.error('[processApproval] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar aprovação',
    };
  }
}

/**
 * Get approval status for an episode
 */
export async function getApprovalStatus(episodeId: string) {
  try {
    const { data, error } = await supabase
      .from('podcast_guest_research')
      .select('approved_by_guest, approved_at, approval_notes')
      .eq('episode_id', episodeId)
      .maybeSingle();

    if (error) {
      console.error('[getApprovalStatus] Error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getApprovalStatus] Error:', error);
    return null;
  }
}

/**
 * Invalidate approval token (revoke link)
 *
 * Sets token to null, making link unusable
 */
export async function revokeApprovalToken(episodeId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('podcast_episodes')
      .update({
        approval_token: null,
        approval_token_created_at: null,
      })
      .eq('id', episodeId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('[revokeApprovalToken] Error:', error);
    return false;
  }
}
