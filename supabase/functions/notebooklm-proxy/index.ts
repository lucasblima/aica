import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

const TAG = '[notebooklm-proxy]'
const NLM_SERVICE_URL = Deno.env.get('NLM_SERVICE_URL') || 'http://localhost:8082'

interface ProxyRequest {
  action: string
  payload?: Record<string, unknown>
}

const ACTION_MAP: Record<string, { method: string; path: string }> = {
  generate_audio: { method: 'POST', path: '/generate/audio' },
  get_job_status: { method: 'GET', path: '/jobs' },
  list_notebooks: { method: 'GET', path: '/notebooks' },
  delete_notebook: { method: 'DELETE', path: '/notebooks' },
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user token' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    const { action, payload = {} }: ProxyRequest = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'action is required' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const route = ACTION_MAP[action]
    if (!route) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: jsonHeaders }
      )
    }

    let url = `${NLM_SERVICE_URL}${route.path}`
    if (action === 'get_job_status' && payload.job_id) {
      url = `${url}/${payload.job_id}`
    }
    if (action === 'delete_notebook' && payload.notebook_id) {
      url = `${url}/${payload.notebook_id}`
    }

    const fetchOptions: RequestInit = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    }

    if (route.method === 'POST') {
      fetchOptions.body = JSON.stringify(payload)
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    console.log(TAG, `Action ${action} -> ${response.status} for user ${user.id}`)

    return new Response(
      JSON.stringify(data),
      { status: response.status, headers: jsonHeaders }
    )

  } catch (error) {
    console.error(TAG, 'Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: jsonHeaders }
    )
  }
})
