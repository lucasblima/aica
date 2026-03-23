import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

const ALLOWED_ORIGINS = ['https://aica.guru', 'https://dev.aica.guru', 'http://localhost:5173']

interface TelegramLoginData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

async function validateTelegramHash(
  data: TelegramLoginData,
  botToken: string,
): Promise<boolean> {
  const encoder = new TextEncoder()

  // Build data_check_string: all fields except hash, sorted, key=value, joined by \n
  const { hash, ...fields } = data
  const dataCheckString = Object.entries(fields)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')

  // secret_key = SHA256(bot_token)
  const secretKeyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(botToken))

  // HMAC-SHA256(data_check_string, secret_key)
  const secretKey = await crypto.subtle.importKey(
    'raw',
    secretKeyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString))
  const computedHash = [...new Uint8Array(signature)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHash === hash
}

serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data: TelegramLoginData = await req.json()

    // 1. Validate auth_date freshness (5 minutes)
    const now = Math.floor(Date.now() / 1000)
    if (now - data.auth_date > 300) {
      return new Response(
        JSON.stringify({ success: false, error: 'Login expirado. Tente novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Validate HMAC-SHA256
    const valid = await validateTelegramHash(data, botToken)
    if (!valid) {
      console.error('[validate-telegram-login] HMAC validation failed for telegram_id:', data.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Dados de login invalidos.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Create admin Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://aica.guru'

    // 4. Look up existing user by telegram_id
    const { data: telegramUser } = await supabase
      .rpc('get_telegram_user', { p_telegram_id: data.id })

    let userEmail: string

    if (telegramUser && telegramUser.length > 0) {
      // Existing user — get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
        telegramUser[0].user_id,
      )
      if (authError || !authUser?.user?.email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao buscar conta.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      userEmail = authUser.user.email
    } else {
      // New user — create guest account (same pattern as telegram-webhook /start)
      const syntheticEmail = `tg_${data.id}@telegram.aica.guru`

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          source: 'telegram_bot',
        },
      })

      if (createError) {
        // User might already exist (race condition) — try to find by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const existing = existingUsers?.users?.find(u => u.email === syntheticEmail)
        if (existing) {
          userEmail = syntheticEmail
        } else {
          console.error('[validate-telegram-login] createUser error:', createError)
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao criar conta.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      } else {
        userEmail = syntheticEmail

        // Insert telegram link record
        await supabase.from('user_telegram_links').upsert({
          user_id: newUser.user.id,
          telegram_id: data.id,
          telegram_username: data.username || null,
          telegram_first_name: data.first_name,
          telegram_photo_url: data.photo_url || null,
          status: 'linked',
          consent_given: false,
        }, { onConflict: 'telegram_id' })
      }
    }

    // 5. Generate magic link (no email sent — we return the URL directly)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: {
        redirectTo: `${frontendUrl}/welcome?source=telegram`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[validate-telegram-login] generateLink error:', linkError)
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar link de acesso.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: linkData.properties.action_link,
        first_name: data.first_name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const err = error as Error
    console.error('[validate-telegram-login] Unexpected error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
