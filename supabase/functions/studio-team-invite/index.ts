/**
 * Edge Function: studio-team-invite
 * Studio Creative Hub — Team Collaboration
 *
 * Purpose:
 * - Create a team member invitation record in studio_team_members
 * - Send invitation email via SendGrid (gracefully skips if key unavailable)
 *
 * Input:  { memberEmail: string, memberName?: string, role: 'admin'|'editor'|'designer'|'viewer', projectName?: string }
 * Output: { success: true, data: { memberId: string, status: 'pending' } }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'
import { withHealthTracking } from '../_shared/health-tracker.ts'
import { createNamespacedLogger } from '../_shared/logger.ts'

const logger = createNamespacedLogger('studio-team-invite')

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@aica.guru'

// =============================================================================
// TYPES
// =============================================================================

interface TeamInviteRequest {
  memberEmail: string
  memberName?: string
  role: 'admin' | 'editor' | 'designer' | 'viewer'
  projectName?: string
}

const VALID_ROLES = ['admin', 'editor', 'designer', 'viewer'] as const

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  designer: 'Designer',
  viewer: 'Visualizador',
}

// =============================================================================
// EMAIL
// =============================================================================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

function buildInviteEmailHtml(
  toEmail: string,
  memberName: string,
  role: string,
  projectName: string | undefined,
  inviterEmail: string
): string {
  const roleLabel = escapeHtml(ROLE_LABELS[role] || role)
  const safeMemberName = escapeHtml(memberName)
  const safeProjectName = projectName ? escapeHtml(projectName) : undefined
  const safeInviterEmail = escapeHtml(inviterEmail)
  const safeToEmail = escapeHtml(toEmail)
  const projectLine = safeProjectName
    ? `<p>Voce foi convidado para colaborar no projeto <strong>${safeProjectName}</strong> como <strong>${roleLabel}</strong>.</p>`
    : `<p>Voce foi convidado para colaborar no Studio AICA como <strong>${roleLabel}</strong>.</p>`

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #8b5cf6; margin: 0;">Studio AICA</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Producao de Conteudo Colaborativa</p>
          </div>

          <h2>Ola ${safeMemberName}!</h2>

          ${projectLine}

          <p><strong>${safeInviterEmail}</strong> te convidou para fazer parte da equipe.</p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="https://aica.guru/studio"
               style="background-color: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Acessar Studio AICA
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">
            Ao acessar a plataforma com o email <strong>${safeToEmail}</strong>, voce tera acesso automatico como ${roleLabel}.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />

          <p style="font-size: 12px; color: #999;">
            Este e um convite automatico do Studio AICA. Se voce nao esperava este email, pode ignora-lo com seguranca.
          </p>
        </div>
      </body>
    </html>
  `
}

async function sendInviteEmail(
  toEmail: string,
  memberName: string,
  role: string,
  projectName: string | undefined,
  inviterEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    logger.warn('SendGrid API key not configured — skipping email, DB record will still be created')
    return { success: true }
  }

  const subject = 'Convite para colaborar no Studio AICA'
  const htmlContent = buildInviteEmailHtml(toEmail, memberName, role, projectName, inviterEmail)

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
            to: [{ email: toEmail, name: memberName }],
            subject,
          },
        ],
        from: { email: FROM_EMAIL, name: 'Studio AICA' },
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('SendGrid API error:', { status: response.status, body: errorText })
      return { success: false, error: `SendGrid API error: ${response.status}` }
    }

    logger.info('Invitation email sent', { to: toEmail, role })
    return { success: true }
  } catch (error) {
    logger.error('SendGrid request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

// =============================================================================
// HANDLER
// =============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // --- Auth ---
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Validate input ---
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: TeamInviteRequest = await req.json()

    if (!body.memberEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo "memberEmail" e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.role || !VALID_ROLES.includes(body.role as typeof VALID_ROLES[number])) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Campo "role" deve ser um dos valores: ${VALID_ROLES.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normalize email
    const memberEmail = body.memberEmail.trim().toLowerCase()
    const memberName = body.memberName?.trim() || memberEmail

    // --- Check for existing pending/active invitation ---
    const { data: existing } = await supabaseClient
      .from('studio_team_members')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('member_email', memberEmail)
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          error: existing.status === 'active'
            ? 'Este membro ja faz parte da equipe'
            : 'Ja existe um convite pendente para este email',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Insert team member record ---
    const insertResult = await withHealthTracking(
      { functionName: 'studio-team-invite', actionName: 'insert_team_member' },
      supabaseClient,
      async () => {
        const { data, error } = await supabaseClient
          .from('studio_team_members')
          .insert({
            user_id: user.id,
            member_email: memberEmail,
            member_name: memberName,
            role: body.role,
            status: 'pending',
          })
          .select('id, status')
          .single()

        if (error) throw new Error(`DB insert failed: ${error.message}`)
        return data
      }
    )

    // --- Send email (best-effort) ---
    const emailResult = await sendInviteEmail(
      memberEmail,
      memberName,
      body.role,
      body.projectName,
      user.email || 'unknown'
    )

    if (!emailResult.success && SENDGRID_API_KEY) {
      logger.warn('Email failed but DB record created', {
        memberId: insertResult.id,
        emailError: emailResult.error,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          memberId: insertResult.id,
          status: 'pending',
          emailSent: emailResult.success && !!SENDGRID_API_KEY,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    logger.error('studio-team-invite error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
