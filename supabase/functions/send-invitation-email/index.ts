// ============================================================================
// EDGE FUNCTION: send-invitation-email
// Description: Sends invitation emails via Resend with branded HTML template
// Author: Backend Architect Agent
// Date: 2026-01-29
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://aica-staging-5p22u2w6jq-rj.a.run.app';

interface InvitationRequest {
  invitation_id: string;
  to_email: string;
  inviter_name: string;
  space_name: string;
  space_archetype: 'habitat' | 'ventures' | 'academia' | 'tribo';
  token: string;
}

interface ResendEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

// ============================================================================
// HTML EMAIL TEMPLATE
// ============================================================================

function generateEmailHTML(
  inviterName: string,
  spaceName: string,
  spaceArchetype: string,
  inviteLink: string
): string {
  const archetypeLabels: Record<string, string> = {
    habitat: 'Habitat (Família)',
    ventures: 'Ventures (Negócios)',
    academia: 'Academia (Educação)',
    tribo: 'Tribo (Comunidade)',
  };

  const archetypeColors: Record<string, string> = {
    habitat: '#10b981', // green
    ventures: '#3b82f6', // blue
    academia: '#8b5cf6', // purple
    tribo: '#f59e0b',   // amber
  };

  const archetypeLabel = archetypeLabels[spaceArchetype] || spaceArchetype;
  const archetypeColor = archetypeColors[spaceArchetype] || '#6366f1';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite para ${spaceName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${archetypeColor} 0%, ${archetypeColor}dd 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Aica Life OS
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                                ${archetypeLabel}
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: 600;">
                                Você foi convidado! 🎉
                            </h2>

                            <!-- Message -->
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #1e293b;">${inviterName}</strong> convidou você para participar do espaço de colaboração
                                <strong style="color: ${archetypeColor};">${spaceName}</strong> no Aica.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                Aica é sua plataforma inteligente para organizar a vida pessoal e profissional.
                                Conecte-se com pessoas importantes e gerencie tudo em um só lugar.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${inviteLink}"
                                           style="display: inline-block;
                                                  background: ${archetypeColor};
                                                  color: white;
                                                  text-decoration: none;
                                                  padding: 16px 40px;
                                                  border-radius: 12px;
                                                  font-size: 16px;
                                                  font-weight: 600;
                                                  box-shadow: 0 10px 25px ${archetypeColor}40;
                                                  transition: all 0.3s ease;">
                                            Aceitar Convite
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.5;">
                                Ou copie este link:<br>
                                <a href="${inviteLink}" style="color: ${archetypeColor}; word-break: break-all; text-decoration: none;">
                                    ${inviteLink}
                                </a>
                            </p>

                            <!-- Expiration Notice -->
                            <div style="margin: 30px 0 0 0;
                                        padding: 16px;
                                        background: #fef3c7;
                                        border-left: 4px solid #f59e0b;
                                        border-radius: 8px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                    ⏰ Este convite expira em <strong>7 dias</strong>.
                                    Não perca a oportunidade de colaborar!
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                                Enviado por <strong>${inviterName}</strong> via Aica Life OS
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                Se você não esperava este convite, pode ignorar este email.
                            </p>
                            <p style="margin: 15px 0 0 0; color: #cbd5e1; font-size: 11px;">
                                © ${new Date().getFullYear()} Aica Life OS. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// SEND EMAIL VIA RESEND
// ============================================================================

async function sendEmailViaResend(payload: ResendEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Resend API error: ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}

// ============================================================================
// UPDATE INVITATION EMAIL STATUS
// ============================================================================

async function updateInvitationEmailStatus(
  supabase: any,
  invitationId: string,
  status: 'sent' | 'failed',
  error?: string
) {
  const updateData: any = {
    email_delivery_status: status,
    email_sent_at: new Date().toISOString(),
  };

  if (error) {
    updateData.email_delivery_error = error;
  }

  const { error: dbError } = await supabase
    .from('connection_invitations')
    .update(updateData)
    .eq('id', invitationId);

  if (dbError) {
    console.error('Failed to update invitation status:', dbError);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Validate method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: InvitationRequest = await req.json();
    const { invitation_id, to_email, inviter_name, space_name, space_archetype, token } = body;

    // Validate required fields
    if (!invitation_id || !to_email || !inviter_name || !space_name || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: invitation_id, to_email, inviter_name, space_name, token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client (service role)
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate invite link
    const inviteLink = `${APP_BASE_URL}/invite/${token}`;

    // Generate HTML email
    const emailHTML = generateEmailHTML(
      inviter_name,
      space_name,
      space_archetype,
      inviteLink
    );

    // Send email via Resend
    const emailPayload: ResendEmailPayload = {
      from: 'Aica Life OS <noreply@aica.app>',
      to: to_email,
      subject: `${inviter_name} convidou você para ${space_name} no Aica`,
      html: emailHTML,
    };

    const result = await sendEmailViaResend(emailPayload);

    if (result.success) {
      // Update invitation status to 'sent'
      await updateInvitationEmailStatus(supabase, invitation_id, 'sent');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation email sent successfully',
          messageId: result.messageId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Update invitation status to 'failed' with error
      await updateInvitationEmailStatus(supabase, invitation_id, 'failed', result.error);

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
