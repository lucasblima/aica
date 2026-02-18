/**
 * Edge Function: finance-monthly-digest
 *
 * Generates a proactive monthly financial digest with AI insights.
 * Analyzes spending patterns for a given month and returns structured
 * highlights, savings opportunities, risk alerts, and a grade.
 *
 * Action: generate_digest
 * Input: { userId, month?, year? } — defaults to last completed month
 *
 * Gemini Model: gemini-2.5-flash (cost-effective)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { getCorsHeaders } from '../_shared/cors.ts'

// =============================================================================
// TYPES
// =============================================================================

interface DigestRequest {
  action: 'generate_digest'
  userId?: string
  month?: number
  year?: number
}

interface TransactionRow {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  transaction_date: string
  merchant_name?: string
  is_recurring?: boolean
}

interface DigestResult {
  highlights: string[]
  savings_opportunities: string[]
  risk_alerts: string[]
  month_grade: 'A' | 'B' | 'C' | 'D' | 'F'
  grade_explanation: string
  next_month_tip: string
}

interface MonthStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
  categoryBreakdown: Record<string, number>
  topExpenses: { description: string; amount: number; category: string }[]
  recurringExpenses: number
}

// =============================================================================
// HELPERS
// =============================================================================

function extractJSON(text: string): string {
  // Strip code fences FIRST
  let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').replace(/```\s*$/g, '')

  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]

  return cleaned.trim()
}

function getLastCompletedMonth(): { month: number; year: number } {
  const now = new Date()
  let month = now.getMonth() // 0-indexed, so January = 0
  let year = now.getFullYear()

  // If we're in the first few days, use the month before last
  // Otherwise use last month
  if (month === 0) {
    month = 12
    year -= 1
  }
  // month is already 0-indexed, so it's the previous month (1-indexed)
  return { month, year }
}

function getMonthName(month: number): string {
  const names = [
    '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return names[month] || `Mes ${month}`
}

function calculateStats(
  transactions: TransactionRow[],
  prevTransactions: TransactionRow[]
): { current: MonthStats; previous: MonthStats | null; percentChange: number | null } {
  const calcMonth = (txns: TransactionRow[]): MonthStats => {
    const income = txns.filter(t => t.type === 'income')
    const expenses = txns.filter(t => t.type === 'expense')

    const totalIncome = income.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {}
    expenses.forEach(t => {
      const cat = t.category || 'outros'
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(Number(t.amount))
    })

    // Top 5 expenses
    const topExpenses = expenses
      .map(t => ({
        description: t.description || t.merchant_name || 'Sem descricao',
        amount: Math.abs(Number(t.amount)),
        category: t.category || 'outros',
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Recurring expenses total
    const recurringExpenses = expenses
      .filter(t => t.is_recurring)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: txns.length,
      categoryBreakdown,
      topExpenses,
      recurringExpenses,
    }
  }

  const current = calcMonth(transactions)
  const previous = prevTransactions.length > 0 ? calcMonth(prevTransactions) : null

  let percentChange: number | null = null
  if (previous && previous.totalExpenses > 0) {
    percentChange = ((current.totalExpenses - previous.totalExpenses) / previous.totalExpenses) * 100
  }

  return { current, previous, percentChange }
}

// =============================================================================
// MAIN
// =============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: DigestRequest = await req.json()
    const { action } = body

    if (action !== 'generate_digest') {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine target month
    const defaultMonth = getLastCompletedMonth()
    const targetMonth = body.month || defaultMonth.month
    const targetYear = body.year || defaultMonth.year

    // Build date ranges
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0] // last day

    // Previous month range
    let prevMonth = targetMonth - 1
    let prevYear = targetYear
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear -= 1
    }
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

    // Fetch transactions for target month
    const { data: transactions, error: txError } = await supabase
      .from('finance_transactions')
      .select('id, description, amount, type, category, transaction_date, merchant_name, is_recurring')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('amount', { ascending: false })

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`)
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          digest: null,
          message: `Nenhuma transacao encontrada para ${getMonthName(targetMonth)} ${targetYear}`,
          month: targetMonth,
          year: targetYear,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch previous month for comparison
    const { data: prevTransactions } = await supabase
      .from('finance_transactions')
      .select('id, description, amount, type, category, transaction_date, merchant_name, is_recurring')
      .eq('user_id', user.id)
      .gte('transaction_date', prevStartDate)
      .lte('transaction_date', prevEndDate)

    // Calculate stats
    const { current, previous, percentChange } = calculateStats(
      transactions as TransactionRow[],
      (prevTransactions || []) as TransactionRow[]
    )

    // Build category breakdown text
    const categoryText = Object.entries(current.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => `  - ${cat}: R$ ${amount.toFixed(2)}`)
      .join('\n')

    const topExpensesText = current.topExpenses
      .map((e, i) => `  ${i + 1}. ${e.description} (${e.category}): R$ ${e.amount.toFixed(2)}`)
      .join('\n')

    const comparisonText = previous && percentChange !== null
      ? `\nComparacao com ${getMonthName(prevMonth)}:\n  - Despesas do mes anterior: R$ ${previous.totalExpenses.toFixed(2)}\n  - Variacao: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`
      : '\nNao ha dados do mes anterior para comparacao.'

    // Build Gemini prompt
    const prompt = `Voce e um consultor financeiro pessoal analisando os dados financeiros de um brasileiro.

Dados de ${getMonthName(targetMonth)} ${targetYear}:

Receita total: R$ ${current.totalIncome.toFixed(2)}
Despesa total: R$ ${current.totalExpenses.toFixed(2)}
Saldo do mes: R$ ${current.balance.toFixed(2)}
Total de transacoes: ${current.transactionCount}
Despesas recorrentes: R$ ${current.recurringExpenses.toFixed(2)}

Categorias de gasto:
${categoryText || '  Nenhuma categoria identificada'}

Top 5 maiores despesas:
${topExpensesText || '  Nenhuma despesa encontrada'}
${comparisonText}

Com base nesses dados, gere um resumo financeiro mensal estruturado em JSON:

{
  "highlights": ["string — 3 observacoes principais sobre o mes"],
  "savings_opportunities": ["string — 2-3 sugestoes especificas de economia"],
  "risk_alerts": ["string — padroes preocupantes ou incomuns, se houver"],
  "month_grade": "A ou B ou C ou D ou F",
  "grade_explanation": "string — explicacao breve da nota",
  "next_month_tip": "string — uma dica pratica para o proximo mes"
}

Regras:
- highlights deve ter exatamente 3 itens
- savings_opportunities deve ter 2-3 itens
- risk_alerts pode ser array vazio se nao houver alertas
- month_grade: A = excelente (saldo positivo alto), B = bom, C = regular, D = preocupante, F = critico
- Todos os textos em portugues brasileiro
- Seja especifico com valores e categorias
- Nao invente dados, use apenas o que foi fornecido
- Responda APENAS com o JSON, sem texto adicional`

    // Call Gemini 2.5 Flash via REST API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        },
        thinkingConfig: {
          thinkingBudget: 0,
        },
      }),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      throw new Error(`Gemini API error ${geminiResponse.status}: ${errText}`)
    }

    const geminiData = await geminiResponse.json()

    // Extract text from response, filtering out thought parts
    const parts = geminiData.candidates?.[0]?.content?.parts || []
    const textParts = parts.filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
    const rawText = textParts.map((p: { text: string }) => p.text).join('')

    if (!rawText) {
      throw new Error('Empty response from Gemini')
    }

    // Parse structured response
    const jsonStr = extractJSON(rawText)
    const digest: DigestResult = JSON.parse(jsonStr)

    // Validate structure
    if (!digest.highlights || !Array.isArray(digest.highlights)) {
      throw new Error('Invalid digest structure: missing highlights')
    }
    if (!digest.month_grade || !['A', 'B', 'C', 'D', 'F'].includes(digest.month_grade)) {
      digest.month_grade = 'C' // fallback
    }

    return new Response(
      JSON.stringify({
        success: true,
        digest,
        stats: {
          totalIncome: current.totalIncome,
          totalExpenses: current.totalExpenses,
          balance: current.balance,
          transactionCount: current.transactionCount,
          categoryBreakdown: current.categoryBreakdown,
          percentChangeFromPrevious: percentChange,
        },
        month: targetMonth,
        year: targetYear,
        monthName: getMonthName(targetMonth),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[finance-monthly-digest] Error:', error)
    const corsHeaders = getCorsHeaders(req)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
