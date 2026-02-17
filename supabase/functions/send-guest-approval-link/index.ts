/**
 * Supabase Edge Function: send-guest-approval-link
 *
 * Sends podcast guest approval links via email.
 * WhatsApp method removed (Evolution API deprecated — zero ban risk).
 *
 * Usage:
 * POST /functions/v1/send-guest-approval-link
 * {
 *   "episodeId": "uuid",
 *   "guestName": "string",
 *   "guestEmail": "email@example.com",
 *   "approvalUrl": "https://podcast.com/approval/...",
 *   "method": "email"
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@aica.guru';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_ANON_KEY') || ''
);

interface SendApprovalLinkRequest {
  episodeId: string;
  guestName: string;
  guestEmail?: string;
  approvalUrl: string;
  method: 'email';
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
 * Save approval link history to database
 */
async function saveApprovalLinkHistory(
  episodeId: string,
  guestEmail: string,
  method: string
) {
  try {
    await supabase.from('approval_link_history').insert({
      episode_id: episodeId,
      guest_email: guestEmail,
      method: method,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save approval link history:', error);
    // Don't fail the request if history saving fails
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate method and required fields for that method
    if (!body.guestEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'guestEmail is required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.method !== 'email') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only "email" method is supported. WhatsApp sending was removed.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendEmailViaSendGrid(body.guestEmail, body.guestName, body.approvalUrl);

    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save approval link history
    await saveApprovalLinkHistory(body.episodeId, body.guestEmail, body.method);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Approval link sent via ${body.method}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-guest-approval-link:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
