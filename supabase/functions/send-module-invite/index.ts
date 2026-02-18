// ============================================================================
// EDGE FUNCTION: send-module-invite
// Description: Sends module-specific invitation emails to platform contacts
//              via Resend. Generalized from send-athlete-invite.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ModuleInviteRequest {
  contactId: string;
  module: string;
  portalPath: string;
  customMessage?: string;
}

// Module configuration map
const MODULE_CONFIG: Record<string, { color: string; label: string; subtitle: string; cta: string }> = {
  flux: {
    color: '#f59e0b',
    label: 'Flux',
    subtitle: 'Treinamento Inteligente',
    cta: 'Acessar Meus Treinos',
  },
  studio: {
    color: '#8b5cf6',
    label: 'Studio',
    subtitle: 'Produ\u00e7\u00e3o de Conte\u00fado',
    cta: 'Acessar Meu Epis\u00f3dio',
  },
  connections: {
    color: '#3b82f6',
    label: 'Connections',
    subtitle: 'Rede de Contatos',
    cta: 'Acessar Meu Perfil',
  },
  grants: {
    color: '#10b981',
    label: 'Grants',
    subtitle: 'Editais e Projetos',
    cta: 'Acessar Meu Projeto',
  },
};

const DEFAULT_MODULE_CONFIG = {
  color: '#6366f1',
  label: 'Aica',
  subtitle: 'Plataforma Inteligente',
  cta: 'Acessar a Plataforma',
};

// ============================================================================
// HTML EMAIL TEMPLATE
// ============================================================================

function generateEmailHTML(
  contactName: string,
  ownerName: string,
  ctaLink: string,
  moduleConfig: { color: string; label: string; subtitle: string; cta: string },
  customMessage?: string,
): string {
  const accentColor = moduleConfig.color;
  const messageBlock = customMessage
    ? `<p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                ${customMessage}
                            </p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite - ${moduleConfig.label}</title>
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
                                ${moduleConfig.label} &mdash; ${moduleConfig.subtitle}
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: 600;">
                                Oi, ${contactName}!
                            </h2>

                            <!-- Default message -->
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                <strong style="color: #1e293b;">${ownerName}</strong> te convidou para a plataforma Aica.
                            </p>

                            <!-- Custom message (if provided) -->
                            ${messageBlock}

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
                                            ${moduleConfig.cta}
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
                                    perfil ser&aacute; vinculado automaticamente.
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                                Enviado por <strong>${ownerName}</strong> via Aica Life OS
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

    // Validate JWT — owner must be authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ModuleInviteRequest = await req.json();
    const { contactId, module, portalPath, customMessage } = body;

    // Validate required fields
    if (!contactId || !module || !portalPath) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: contactId, module, portalPath',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client (service role) for DB reads/writes
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch contact from platform_contacts
    const { data: contact, error: contactError } = await supabase
      .from('platform_contacts')
      .select('id, display_name, email, owner_id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate contact has email
    if (!contact.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact does not have an email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact has an invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get owner name from auth.users
    const { data: ownerData, error: ownerError } = await supabase
      .auth.admin.getUserById(contact.owner_id);

    let ownerName = 'Aica';
    if (!ownerError && ownerData?.user) {
      ownerName = ownerData.user.user_metadata?.full_name
        || ownerData.user.user_metadata?.name
        || ownerData.user.email?.split('@')[0]
        || 'Aica';
    }

    // Resolve module config (fallback to default if unknown module)
    const moduleConfig = MODULE_CONFIG[module] || {
      ...DEFAULT_MODULE_CONFIG,
      label: module.charAt(0).toUpperCase() + module.slice(1),
    };

    // CTA link
    const ctaLink = `https://aica.guru${portalPath}`;

    // Generate HTML email
    const emailHTML = generateEmailHTML(
      contact.display_name || 'convidado',
      ownerName,
      ctaLink,
      moduleConfig,
      customMessage,
    );

    // Send email via Resend
    const result = await sendEmailViaResend({
      from: 'Aica Life OS <noreply@aica.guru>',
      to: contact.email,
      subject: `${ownerName} te convidou para o ${moduleConfig.label} na AICA`,
      html: emailHTML,
    });

    if (result.success) {
      // Update platform_contacts — mark invite as sent
      const { error: dbError } = await supabase
        .from('platform_contacts')
        .update({
          invitation_status: 'sent',
          invitation_sent_at: new Date().toISOString(),
        })
        .eq('id', contactId);

      if (dbError) {
        console.error('Failed to update contact invitation status:', dbError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Module invitation email sent successfully',
          messageId: result.messageId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('send-module-invite: Resend failed:', result.error);

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('send-module-invite error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
