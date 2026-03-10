import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

const PLAN_VALUES: Record<string, number> = {
  pro: 39.90,
  teams: 149.00,
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth client for JWT validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[track-referral] Missing authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      console.log('[track-referral] Unauthorized:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Service client for DB operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse and validate request body
    const { referral_code, plan } = await req.json()

    if (!referral_code || !plan) {
      console.log('[track-referral] Missing required fields:', { referral_code, plan })
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: referral_code, plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!(plan in PLAN_VALUES)) {
      console.log('[track-referral] Invalid plan:', plan)
      return new Response(
        JSON.stringify({ success: false, error: `Invalid plan. Must be one of: ${Object.keys(PLAN_VALUES).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 1. Validate referral_code exists and evangelist is active
    const { data: evangelist, error: evangelistError } = await supabase
      .from('evangelists')
      .select('id, user_id')
      .eq('referral_code', referral_code)
      .eq('status', 'active')
      .single()

    if (evangelistError || !evangelist) {
      console.log('[track-referral] Invalid or inactive referral code:', referral_code, evangelistError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or inactive referral code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 1b. Block self-referral
    if (evangelist.user_id === user.id) {
      console.log('[track-referral] Self-referral blocked:', user.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Check if user was already referred (unique constraint on referred_user_id)
    const { data: existingConversion } = await supabase
      .from('referral_conversions')
      .select('id')
      .eq('referred_user_id', user.id)
      .single()

    if (existingConversion) {
      console.log('[track-referral] User already referred:', user.id)
      return new Response(
        JSON.stringify({ success: false, error: 'User has already been referred' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Get plan_value
    const plan_value = PLAN_VALUES[plan]

    // 4. Create referral_conversions record
    const { error: conversionError } = await supabase
      .from('referral_conversions')
      .insert({
        evangelist_id: evangelist.id,
        referred_user_id: user.id,
        referral_code,
        plan,
        plan_value,
        status: 'pending',
        converted_at: new Date().toISOString(),
      })

    if (conversionError) {
      console.error('[track-referral] Failed to create conversion:', conversionError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to register referral conversion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 5. Update profiles with referred_by_code
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referred_by_code: referral_code })
      .eq('id', user.id)

    if (profileError) {
      console.error('[track-referral] Failed to update profile:', profileError.message)
      // Non-fatal: conversion was already recorded, log but don't fail
    }

    // 6. Get evangelist name from profiles for the response
    const { data: evangelistProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', evangelist.user_id)
      .single()

    const evangelist_name = evangelistProfile?.full_name || 'Evangelista AICA'

    console.log('[track-referral] Referral tracked successfully:', {
      referral_code,
      user_id: user.id,
      plan,
      evangelist_name,
    })

    return new Response(
      JSON.stringify({ success: true, evangelist_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const err = error as Error
    console.error('[track-referral] Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
