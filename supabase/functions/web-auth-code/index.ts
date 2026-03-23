import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

const ALLOWED_ORIGINS = ['https://aica.guru', 'https://dev.aica.guru', 'http://localhost:5173']

serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const { action, session_token } = body

    if (action === 'create') {
      // Create a new 6-digit code
      const { data, error } = await supabase.rpc('create_web_auth_code')

      if (error || !data || data.length === 0) {
        console.error('[web-auth-code] create error:', error)
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao gerar codigo.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          code: data[0].code,
          session_token: data[0].session_token,
          expires_at: data[0].expires_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'poll') {
      if (!session_token) {
        return new Response(
          JSON.stringify({ success: false, error: 'session_token required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data, error } = await supabase.rpc('poll_web_auth_code', {
        p_session_token: session_token,
      })

      if (error || !data || data.length === 0) {
        return new Response(
          JSON.stringify({ success: true, status: 'not_found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: data[0].status,
          redirect_url: data[0].magic_link_url || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use "create" or "poll".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const err = error as Error
    console.error('[web-auth-code] error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
