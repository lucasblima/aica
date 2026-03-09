import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * confirm-referral — Cron / admin Edge Function
 *
 * Confirms referral conversions that have been pending for 30+ days,
 * recalculates evangelist tiers, and creates commission ledger entries.
 */

interface ReferralConversion {
  id: string
  evangelist_id: string
  plan_value: number
  status: string
  converted_at: string
}

interface ConfirmDetail {
  conversion_id: string
  evangelist_id: string
  new_tier: number
  commission_rate: number
  commission_amount: number
}

/** Map evangelist tier to commission rate */
function getCommissionRate(tier: number): number {
  switch (tier) {
    case 1: return 0     // Semente — no commission
    case 2: return 0.20  // Ativador — 20%
    case 3: return 0.30  // Catalisador — 30%
    case 4: return 0.30  // Embaixador — 30%
    default: return 0
  }
}

/** First day of the current month as YYYY-MM-DD */
function getCurrentPeriodMonth(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Service client — cron/admin function, uses service_role directly
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Query pending conversions older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: pendingConversions, error: fetchError } = await supabase
      .from('referral_conversions')
      .select('id, evangelist_id, plan_value, status, converted_at')
      .eq('status', 'pending')
      .lte('converted_at', thirtyDaysAgo)

    if (fetchError) {
      throw new Error(`Failed to fetch pending conversions: ${fetchError.message}`)
    }

    const conversions: ReferralConversion[] = pendingConversions ?? []
    console.log(`[confirm-referral] Found ${conversions.length} pending conversion(s) to confirm`)

    if (conversions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, confirmed_count: 0, details: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const details: ConfirmDetail[] = []
    const periodMonth = getCurrentPeriodMonth()

    for (const conversion of conversions) {
      console.log(`[confirm-referral] Processing conversion ${conversion.id} for evangelist ${conversion.evangelist_id}`)

      // 2a. Update status to confirmed
      const { error: updateError } = await supabase
        .from('referral_conversions')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', conversion.id)

      if (updateError) {
        console.error(`[confirm-referral] Failed to confirm conversion ${conversion.id}: ${updateError.message}`)
        continue
      }

      // 2b. Recalculate evangelist tier
      const { error: rpcError } = await supabase
        .rpc('recalculate_evangelist_tier', { p_evangelist_id: conversion.evangelist_id })

      if (rpcError) {
        console.error(`[confirm-referral] Failed to recalculate tier for evangelist ${conversion.evangelist_id}: ${rpcError.message}`)
        // Continue — conversion is already confirmed, tier recalc can be retried
      }

      // 2c. Re-fetch evangelist to get the NEW tier
      const { data: evangelist, error: evangelistError } = await supabase
        .from('evangelists')
        .select('tier')
        .eq('id', conversion.evangelist_id)
        .single()

      if (evangelistError || !evangelist) {
        console.error(`[confirm-referral] Failed to fetch evangelist ${conversion.evangelist_id}: ${evangelistError?.message}`)
        continue
      }

      const commissionRate = getCommissionRate(evangelist.tier)
      const commissionAmount = conversion.plan_value * commissionRate

      // 2d. Create commission ledger entry
      const { error: ledgerError } = await supabase
        .from('commission_ledger')
        .insert({
          evangelist_id: conversion.evangelist_id,
          referral_conversion_id: conversion.id,
          period_month: periodMonth,
          gross_amount: conversion.plan_value,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          status: 'calculated',
        })

      if (ledgerError) {
        console.error(`[confirm-referral] Failed to create ledger entry for conversion ${conversion.id}: ${ledgerError.message}`)
        continue
      }

      console.log(`[confirm-referral] Confirmed conversion ${conversion.id} — tier ${evangelist.tier}, commission ${commissionAmount}`)

      details.push({
        conversion_id: conversion.id,
        evangelist_id: conversion.evangelist_id,
        new_tier: evangelist.tier,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
      })
    }

    console.log(`[confirm-referral] Done. Confirmed ${details.length}/${conversions.length} conversion(s)`)

    return new Response(
      JSON.stringify({ success: true, confirmed_count: details.length, details }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const err = error as Error
    console.error('[confirm-referral] Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
