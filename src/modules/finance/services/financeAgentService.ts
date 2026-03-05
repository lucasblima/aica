/**
 * Finance Agent Service
 *
 * Refatorado para usar backend seguro via Edge Functions
 * - Remove API key exposta no frontend
 * - Usa GeminiClient para chamadas autenticadas
 * - Mantém context building e conversation management local
 */

import { supabase } from '../../../services/supabaseClient'
import { GeminiClient } from '@/lib/gemini'
import type {
  FinanceTransaction,
  FinanceAgentMessage,
  AgentContext,
  DateRange,
} from '../types'
import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('FinanceAgentService')

// Initialize Gemini client
const geminiClient = GeminiClient.getInstance()

// =====================================================
// Constants
// =====================================================

const SYSTEM_PROMPT = `# Aica Finance Agent

Voce e o Aica Finance, um assistente financeiro pessoal inteligente integrado ao Aica Life OS.

## Personalidade
- Amigavel e acessivel, mas profissional
- Proativo em identificar oportunidades de melhoria
- Empatico com desafios financeiros
- Nunca julgue os habitos de gasto do usuario

## Capacidades
1. **Analise de Gastos**: Identificar padroes, anomalias e tendencias
2. **Sugestoes de Economia**: Recomendar cortes especificos baseados em dados
3. **Previsao de Fluxo de Caixa**: Projetar gastos futuros
4. **Categorizacao**: Ajudar a organizar transacoes
5. **Metas Financeiras**: Auxiliar no planejamento de objetivos

## Restricoes
- Nunca invente dados ou transacoes
- Sempre baseie respostas nos dados fornecidos
- Nao de conselhos de investimento especificos (encaminhe para profissional)
- Mantenha privacidade: nao mencione nomes de terceiros em transacoes

## Formato de Resposta
- Use markdown para formatacao
- Inclua valores em R$ quando relevante
- Seja conciso (max 300 palavras)
- Sugira acoes concretas
- Use emojis com moderacao para tornar a conversa mais amigavel`

// =====================================================
// Finance Agent Service
// =====================================================

export class FinanceAgentService {
  /**
   * Build context from user's financial data
   */
  async buildContext(
    userId: string,
    dateRange?: DateRange
  ): Promise<AgentContext> {
    try {
      let query = supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })

      if (dateRange) {
        query = query
          .gte('transaction_date', dateRange.start)
          .lte('transaction_date', dateRange.end)
      } else {
        // Default: last 3 months
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
        query = query.gte('transaction_date', threeMonthsAgo.toISOString().split('T')[0])
      }

      const { data: transactions, error } = await query

      if (error) throw error

      const txns = (transactions || []) as FinanceTransaction[]

      // Calculate summary
      const income = txns.filter((t) => t.type === 'income')
      const expenses = txns.filter((t) => t.type === 'expense')

      const totalIncome = income.reduce((sum, t) => {
          const amt = Number(t.amount);
          return sum + (Number.isFinite(amt) ? Math.abs(amt) : 0);
      }, 0)
      const totalExpenses = expenses.reduce((sum, t) => {
          const amt = Number(t.amount);
          return sum + (Number.isFinite(amt) ? Math.abs(amt) : 0);
      }, 0)

      // Calculate category totals
      const categoryTotals = expenses.reduce((acc, t) => {
        const cat = t.category || 'other'
        acc[cat] = (acc[cat] || 0) + Math.abs(Number(t.amount))
        return acc
      }, {} as Record<string, number>)

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount }))

      // Determine period
      const dates = txns.map((t) => t.transaction_date).filter(Boolean).sort()
      const periodStart = dates[0] || new Date().toISOString().split('T')[0]
      const periodEnd = dates[dates.length - 1] || new Date().toISOString().split('T')[0]

      return {
        transactions: txns,
        summary: {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          topCategories,
          periodStart,
          periodEnd,
          transactionCount: txns.length,
        },
      }
    } catch (error) {
      log.error('[FinanceAgentService] Error building context:', error)
      throw error
    }
  }

  /**
   * Send message to agent and get response
   * Uses Edge Function backend for secure LLM calls
   */
  async chat(
    userId: string,
    sessionId: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    context: AgentContext
  ): Promise<string> {
    const startTime = Date.now()

    try {
      // Build context summary
      const contextSummary = this.buildContextSummary(context)

      // Prepare full context for the LLM
      const fullContext = `${SYSTEM_PROMPT}\n\n${contextSummary}`

      // Call backend via GeminiClient
      const response = await geminiClient.call({
        action: 'finance_chat',
        payload: {
          message,
          context: fullContext,
          history: history.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        },
        model: 'fast' // Finance chat uses fast model for quick responses
      })

      const assistantMessage = (response && typeof response.result === 'string' && response.result.trim())
          ? response.result
          : 'Desculpe, nao consegui processar sua pergunta. Tente reformular.'
      const responseTimeMs = Date.now() - startTime

      // Save conversation to database
      await this.saveConversation(userId, sessionId, message, assistantMessage, responseTimeMs)

      return assistantMessage

    } catch (error) {
      log.error('[FinanceAgentService] Chat error:', error)
      throw new Error('Erro ao comunicar com o assistente. Tente novamente.')
    }
  }

  /**
   * Build context summary for the prompt
   */
  private buildContextSummary(context: AgentContext): string {
    const { summary } = context

    const categoriesText = summary.topCategories
      .map((c) => `  - ${c.category}: R$ ${c.amount.toFixed(2)}`)
      .join('\n')

    return `## Contexto Financeiro do Usuario

**Periodo:** ${summary.periodStart} a ${summary.periodEnd}

**Resumo:**
- Total de receitas: R$ ${summary.totalIncome.toFixed(2)}
- Total de despesas: R$ ${summary.totalExpenses.toFixed(2)}
- Saldo do periodo: R$ ${summary.balance.toFixed(2)}
- Total de transacoes: ${summary.transactionCount}

**Principais categorias de gasto:**
${categoriesText || '  - Nenhuma transacao encontrada'}

Use estas informações para responder as perguntas do usuário sobre suas finanças.`
  }

  /**
   * Save conversation messages to database
   */
  private async saveConversation(
    userId: string,
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
    responseTimeMs: number
  ): Promise<void> {
    try {
      const messages: Partial<FinanceAgentMessage>[] = [
        {
          user_id: userId,
          session_id: sessionId,
          role: 'user',
          content: userMessage,
        },
        {
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: assistantMessage,
          model_used: 'gemini-2.5-flash', // Updated to match backend
          response_time_ms: responseTimeMs,
        },
      ]

      const { error } = await supabase
        .from('finance_agent_conversations')
        .insert(messages)

      if (error) {
        log.error('[FinanceAgentService] Error saving conversation:', error)
      }
    } catch (error) {
      log.error('[FinanceAgentService] Error saving conversation:', error)
    }
  }

  /**
   * Get conversation history for a session
   */
  async getSessionHistory(
    userId: string,
    sessionId: string
  ): Promise<FinanceAgentMessage[]> {
    try {
      const { data, error } = await supabase
        .from('finance_agent_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []) as FinanceAgentMessage[]
    } catch (error) {
      log.error('[FinanceAgentService] Error fetching history:', error)
      return []
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<{ sessionId: string; title?: string; lastMessageAt: string }[]> {
    try {
      const { data, error } = await supabase
        .from('finance_agent_conversations')
        .select('session_id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group by session and get latest
      const sessionsMap = new Map<string, { title?: string; lastMessageAt: string }>()

      for (const msg of data || []) {
        if (!sessionsMap.has(msg.session_id)) {
          sessionsMap.set(msg.session_id, {
            title: msg.title,
            lastMessageAt: msg.created_at,
          })
        }
      }

      return Array.from(sessionsMap.entries()).map(([sessionId, info]) => ({
        sessionId,
        ...info,
      }))
    } catch (error) {
      log.error('[FinanceAgentService] Error fetching sessions:', error)
      return []
    }
  }

  /**
   * Quick analysis: Analyze spending patterns
   * Uses backend for secure processing
   */
  async analyzeSpending(userId: string, context: AgentContext): Promise<string> {
    return this.chat(
      userId,
      crypto.randomUUID(),
      'Analise meus gastos dos ultimos meses e me de insights sobre onde posso economizar. Seja especifico sobre categorias e valores.',
      [],
      context
    )
  }

  /**
   * Quick analysis: Predict next month
   * Uses backend for secure processing
   */
  async predictNextMonth(userId: string, context: AgentContext): Promise<string> {
    return this.chat(
      userId,
      crypto.randomUUID(),
      'Com base no meu historico de transacoes, preveja meus gastos para o proximo mes e sugira um orcamento realista por categoria.',
      [],
      context
    )
  }

  /**
   * Quick analysis: Suggest savings
   * Uses backend for secure processing
   */
  async suggestSavings(userId: string, context: AgentContext): Promise<string> {
    return this.chat(
      userId,
      crypto.randomUUID(),
      'Identifique oportunidades de economia nas minhas finanças. Quais gastos posso reduzir ou eliminar? Seja pratico e especifico.',
      [],
      context
    )
  }

  /**
   * Quick analysis: Identify anomalies
   * Uses backend for secure processing
   */
  async identifyAnomalies(userId: string, context: AgentContext): Promise<string> {
    return this.chat(
      userId,
      crypto.randomUUID(),
      'Identifique transacoes anomalas ou fora do padrao no meu historico. Pode ser cobracas duplicadas, valores muito acima da media, ou gastos incomuns.',
      [],
      context
    )
  }
}

// Export singleton instance
export const financeAgentService = new FinanceAgentService()
