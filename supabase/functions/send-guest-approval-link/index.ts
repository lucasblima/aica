/**
 * Supabase Edge Function: send-guest-approval-link
 *
 * Sends podcast guest approval links via email or WhatsApp
 *
 * Usage:
 * POST /functions/v1/send-guest-approval-link
 * {
 *   "episodeId": "uuid",
 *   "guestName": "string",
 *   "guestEmail": "email@example.com",
 *   "guestPhone": "+5511999999999",
 *   "approvalUrl": "https://podcast.com/approval/...",
 *   "method": "email" | "whatsapp"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendMessage } from '../_shared/evolution-client.ts';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'AI_Comtxae_4006';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@podcast.com';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_ANON_KEY') || ''
);

interface SendApprovalLinkRequest {
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  approvalUrl: string;
  method: 'email' | 'whatsapp';
}

/**
 * Send email via SendGrid
 */
async function sendEmailViaSendGrid(
  toEmail: string,
  guestName: string,
  approvalUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    return {
      success: false,
      error: 'SendGrid API key not configured',
    };
  }

  const subject = 'Aprovação de Informações para Podcast';
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Olá ${guestName}!</h2>

          <p>Estamos felizes em ter você em nosso podcast. Antes de gravarmos o episódio, gostaríamos que você revisasse suas informações.</p>

          <p><strong>Por favor, clique no link abaixo para revisar e aprovar seus dados:</strong></p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${approvalUrl}"
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Revisar Informações
            </a>
          </div>

          <p>Ou copie e cole este link no seu navegador:</p>
          <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
            ${approvalUrl}
          </p>

          <p><strong>Este link expira em 30 dias.</strong></p>

          <p>Se houver qualquer dúvida ou correção necessária, você poderá adicionar comentários na página de aprovação.</p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

          <p style="font-size: 12px; color: #666;">
            Este é um link automático. Por favor, não responda este email.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail }],
            subject: subject,
          },
        ],
        from: { email: FROM_EMAIL },
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid Error:', error);
      return {
        success: false,
        error: `SendGrid API error: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('SendGrid request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send WhatsApp message via Evolution API
 */
async function sendWhatsAppViaEvolution(
  toPhone: string,
  guestName: string,
  approvalUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_INSTANCE_NAME) {
    return {
      success: false,
      error: 'Evolution instance name not configured',
    };
  }

  // Format phone number for WhatsApp (remove non-digits and ensure format)
  const phoneNumber = toPhone.replace(/\D/g, '');

  // Evolution API expects format: 5511999999999@s.whatsapp.net
  const remoteJid = phoneNumber.includes('@')
    ? phoneNumber
    : `${phoneNumber}@s.whatsapp.net`;

  const message = `Olá ${guestName}! 🎙️\n\nPor favor, revise suas informações para o podcast clicando no link abaixo:\n\n${approvalUrl}\n\nEste link expira em 30 dias.`;

  try {
    console.log('[send-guest-approval-link] Sending message to:', remoteJid);
    console.log('[send-guest-approval-link] Instance:', EVOLUTION_INSTANCE_NAME);

    const result = await sendMessage(
      EVOLUTION_INSTANCE_NAME,
      remoteJid,
      message
    );

    console.log('[send-guest-approval-link] Evolution API response:', JSON.stringify(result));

    // Check if message was sent successfully
    // Evolution API may return different response structures
    if (result && (result.key || result.message || result.data)) {
      // Message sent successfully
      return { success: true };
    }

    // If we got here, something went wrong
    console.error('[send-guest-approval-link] Unexpected response:', result);
    return {
      success: false,
      error: typeof result === 'string' ? result : JSON.stringify(result),
    };
  } catch (error) {
    console.error('[send-guest-approval-link] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp',
    };
  }
}

/**
 * Save approval link history to database
 */
async function saveApprovalLinkHistory(
  episodeId: string,
  guestEmail: string | undefined,
  guestPhone: string | undefined,
  method: string
) {
  try {
    await supabase.from('approval_link_history').insert({
      episode_id: episodeId,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      method: method,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save approval link history:', error);
    // Don't fail the request if history saving fails
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: SendApprovalLinkRequest = await req.json();

    // Validate required fields
    if (!body.episodeId || !body.guestName || !body.approvalUrl || !body.method) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: episodeId, guestName, approvalUrl, method',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate method and required fields for that method
    if (body.method === 'email' && !body.guestEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email method requires guestEmail',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.method === 'whatsapp' && !body.guestPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WhatsApp method requires guestPhone',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let result;

    // Send via selected method
    if (body.method === 'email') {
      result = await sendEmailViaSendGrid(body.guestEmail!, body.guestName, body.approvalUrl);
    } else if (body.method === 'whatsapp') {
      result = await sendWhatsAppViaEvolution(body.guestPhone!, body.guestName, body.approvalUrl);
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid method. Must be "email" or "whatsapp"',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save approval link history
    await saveApprovalLinkHistory(body.episodeId, body.guestEmail, body.guestPhone, body.method);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Approval link sent via ${body.method}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-guest-approval-link:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
