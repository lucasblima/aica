import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * calculate-monthly-commissions
 *
 * Monthly cron job (1st of each month) or manual call.
 * Generates commission ledger entries for all active evangelists
 * with confirmed referrals for the PREVIOUS month.
 *
 * POST /functions/v1/calculate-monthly-commissions
 * Authorization: Bearer <service-role-key>
 * Body: { month?: string } — optional override (format: 'YYYY-MM-01'), default = previous month
 */

/** Tier → commission rate mapping. Tier 1 gets no commission. */
const TIER_COMMISSION_RATES: Record<number, number> = {
  2: 0.20,
  3: 0.30,
  4: 0.30,
}

/**
 * Returns the first day of the previous month in 'YYYY-MM-01' format.
 * E.g., called on 2026-04-15 → '2026-03-01'
 */
function getPreviousMonth(): string {
  const now = new Date()
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth() // getUTCMonth() is 0-indexed
  return `${year}-${String(month).padStart(2, '0')}-01`
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Validate service_role key — this is a cron/admin-only function
    const authHeader = req.headers.get('Authorization')
    const expectedKey = supabaseServiceKey
    if (!authHeader || authHeader.replace('Bearer ', '') !== expectedKey) {
      console.log('[calculate-monthly-commissions] Unauthorized: invalid or missing service_role key')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized — requires service_role key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 1. Determine period_month
    const body = await req.json().catch(() => ({}))
    const periodMonth: string = body.month || getPreviousMonth()

    // Validate format
    if (!/^\d{4}-\d{2}-01$/.test(periodMonth)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid month format. Use YYYY-MM-01' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[calculate-monthly-commissions] Starting for period_month=${periodMonth}`)

    // 2. Idempotency check — abort if ledger entries already exist for this period
    const { count: existingCount, error: countError } = await supabase
      .from('commission_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('period_month', periodMonth)

    if (countError) {
      throw new Error(`Failed to check existing entries: ${countError.message}`)
    }

    if (existingCount && existingCount > 0) {
      console.log(`[calculate-monthly-commissions] Already ${existingCount} entries for ${periodMonth}, skipping`)
      return new Response(
        JSON.stringify({
          success: true,
          period_month: periodMonth,
          evangelists_processed: 0,
          entries_created: 0,
          total_commission: 0,
          skipped_reason: 'already_calculated',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Query all active evangelists with tier >= 2
    const { data: evangelists, error: evError } = await supabase
      .from('evangelists')
      .select('id, user_id, tier')
      .eq('status', 'active')
      .gte('tier', 2)

    if (evError) {
      throw new Error(`Failed to fetch evangelists: ${evError.message}`)
    }

    if (!evangelists || evangelists.length === 0) {
      console.log('[calculate-monthly-commissions] No active evangelists with tier >= 2 found')
      return new Response(
        JSON.stringify({
          success: true,
          period_month: periodMonth,
          evangelists_processed: 0,
          entries_created: 0,
          total_commission: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[calculate-monthly-commissions] Found ${evangelists.length} eligible evangelists`)

    let totalEntriesCreated = 0
    let totalCommission = 0
    let evangelistsProcessed = 0

    // 4. For each evangelist, process confirmed conversions
    for (const evangelist of evangelists) {
      const commissionRate = TIER_COMMISSION_RATES[evangelist.tier]
      if (!commissionRate) {
        console.log(`[calculate-monthly-commissions] No rate for tier ${evangelist.tier}, skipping evangelist ${evangelist.id}`)
        continue
      }

      // Calculate period boundaries
      const periodStart = periodMonth // already 'YYYY-MM-01'
      const [y, m] = periodMonth.split('-').map(Number)
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

      // 4a. Get referral conversions confirmed in this period
      const { data: conversions, error: convError } = await supabase
        .from('referral_conversions')
        .select('id, plan_value')
        .eq('evangelist_id', evangelist.id)
        .eq('status', 'confirmed')
        .gte('confirmed_at', periodStart)
        .lt('confirmed_at', nextMonth)

      if (convError) {
        console.error(`[calculate-monthly-commissions] Error fetching conversions for evangelist ${evangelist.id}: ${convError.message}`)
        continue
      }

      if (!conversions || conversions.length === 0) {
        continue
      }

      const entriesToInsert = []

      for (const conversion of conversions) {
        // 4c. Check if ledger entry already exists for this conversion + period
        const { count: entryExists, error: checkError } = await supabase
          .from('commission_ledger')
          .select('id', { count: 'exact', head: true })
          .eq('referral_conversion_id', conversion.id)
          .eq('period_month', periodMonth)

        if (checkError) {
          console.error(`[calculate-monthly-commissions] Error checking existing entry for conversion ${conversion.id}: ${checkError.message}`)
          continue
        }

        if (entryExists && entryExists > 0) {
          console.log(`[calculate-monthly-commissions] Entry already exists for conversion ${conversion.id} in ${periodMonth}, skipping`)
          continue
        }

        // 4d. Build ledger entry
        const grossAmount = Number(conversion.plan_value)
        const commissionAmount = grossAmount * commissionRate

        entriesToInsert.push({
          evangelist_id: evangelist.id,
          referral_conversion_id: conversion.id,
          period_month: periodMonth,
          gross_amount: grossAmount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          status: 'calculated',
        })
      }

      // Batch insert for this evangelist
      if (entriesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('commission_ledger')
          .insert(entriesToInsert)

        if (insertError) {
          console.error(`[calculate-monthly-commissions] Error inserting entries for evangelist ${evangelist.id}: ${insertError.message}`)
          continue
        }

        totalEntriesCreated += entriesToInsert.length
        totalCommission += entriesToInsert.reduce((sum, e) => sum + e.commission_amount, 0)
        evangelistsProcessed++

        console.log(`[calculate-monthly-commissions] Evangelist ${evangelist.id}: ${entriesToInsert.length} entries, R$${entriesToInsert.reduce((s, e) => s + e.commission_amount, 0).toFixed(2)}`)
      }
    }

    console.log(`[calculate-monthly-commissions] Done: ${evangelistsProcessed} evangelists, ${totalEntriesCreated} entries, R$${totalCommission.toFixed(2)} total`)

    return new Response(
      JSON.stringify({
        success: true,
        period_month: periodMonth,
        evangelists_processed: evangelistsProcessed,
        entries_created: totalEntriesCreated,
        total_commission: Math.round(totalCommission * 100) / 100,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const err = error as Error
    console.error('[calculate-monthly-commissions] Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
