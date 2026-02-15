// ============================================================================
// EDGE FUNCTION: send-athlete-invite
// Description: Sends training-invite emails to athletes via Resend
// Reference: send-invitation-email (same Resend + HTML pattern)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ALLOWED_ORIGINS = [
  'https://aica.guru',
  'https://dev.aica.guru',
  'http://localhost:5173',
  'http://localhost:5174',
];

interface AthleteInviteRequest {
  athleteId: string;
  athleteName: string;
  athleteEmail: string;
  coachName: string;
}

// ============================================================================
// CORS
// ============================================================================

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// ============================================================================
// HTML EMAIL TEMPLATE
// ============================================================================

function generateEmailHTML(athleteName: string, coachName: string, ctaLink: string): string {
  const accentColor = '#f59e0b'; // amber — Flux module color

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite de Treino</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                Aica Life OS
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">
                                Flux &mdash; Treinamento Inteligente
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: 600;">
                                Oi, ${athleteName}!
                            </h2>

                            <!-- Message -->
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #1e293b;">${coachName}</strong> te convidou para acompanhar seus treinos pela plataforma Aica.
                            </p>

                            <p style="margin: 0 0 30px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                Com a Aica, seu treinador consegue planejar e acompanhar sua
                                periodiza&ccedil;&atilde;o de forma inteligente. Acesse seus treinos,
                                veja o que est&aacute; programado e acompanhe sua evolu&ccedil;&atilde;o
                                &mdash; tudo em um s&oacute; lugar.
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${ctaLink}"
                                           style="display: inline-block;
                                                  background: ${accentColor};
                                                  color: white;
                                                  text-decoration: none;
                                                  padding: 16px 40px;
                                                  border-radius: 12px;
                                                  font-size: 16px;
                                                  font-weight: 600;
                                                  box-shadow: 0 10px 25px ${accentColor}40;">
                                            Acessar Meus Treinos
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Alternative Link -->
                            <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.5;">
                                Ou copie este link:<br>
                                <a href="${ctaLink}" style="color: ${accentColor}; word-break: break-all; text-decoration: none;">
                                    ${ctaLink}
                                </a>
                            </p>

                            <!-- Account hint -->
                            <div style="margin: 30px 0 0 0;
                                        padding: 16px;
                                        background: #fef3c7;
                                        border-left: 4px solid ${accentColor};
                                        border-radius: 8px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                    Crie uma conta gratuita usando este mesmo e-mail e seu
                                    perfil de atleta ser&aacute; vinculado automaticamente.
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                                Enviado por <strong>${coachName}</strong> via Aica Life OS
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                Se voc&ecirc; n&atilde;o esperava este convite, pode ignorar este email.
                            </p>
                            <p style="margin: 15px 0 0 0; color: #cbd5e1; font-size: 11px;">
                                &copy; ${new Date().getFullYear()} Aica Life OS. Todos os direitos reservados.
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

async function sendEmailViaResend(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    return { success: true, messageId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate JWT — coach must be authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AthleteInviteRequest = await req.json();
    const { athleteId, athleteName, athleteEmail, coachName } = body;

    // Validate required fields
    if (!athleteId || !athleteName || !athleteEmail || !coachName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: athleteId, athleteName, athleteEmail, coachName',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(athleteEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CTA link
    const ctaLink = 'https://aica.guru/meu-treino';

    // Generate HTML email
    const emailHTML = generateEmailHTML(athleteName, coachName, ctaLink);

    // Send email via Resend
    const result = await sendEmailViaResend({
      from: 'Aica Life OS <noreply@aica.app>',
      to: athleteEmail,
      subject: `${coachName} te convidou para acompanhar seus treinos na AICA`,
      html: emailHTML,
    });

    // Initialize Supabase client (service role) for DB updates
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (result.success) {
      // Update athlete record — mark invite as sent
      const { error: dbError } = await supabase
        .from('athletes')
        .update({
          invitation_sent_at: new Date().toISOString(),
          invitation_email_status: 'sent',
          invitation_status: 'pending',
        })
        .eq('id', athleteId);

      if (dbError) {
        console.error('Failed to update athlete invitation status:', dbError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Athlete invitation email sent successfully',
          messageId: result.messageId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update athlete record — mark invite as failed
      const { error: dbError } = await supabase
        .from('athletes')
        .update({
          invitation_sent_at: new Date().toISOString(),
          invitation_email_status: 'failed',
        })
        .eq('id', athleteId);

      if (dbError) {
        console.error('Failed to update athlete invitation status:', dbError);
      }

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('send-athlete-invite error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
