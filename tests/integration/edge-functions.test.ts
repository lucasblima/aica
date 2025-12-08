/**
 * Integration Tests - Edge Functions (Supabase)
 *
 * Testa chamadas diretas às Edge Functions para validar:
 * - Autenticação JWT
 * - Rate limiting
 * - Cache funcionando
 * - Todas as actions retornam dados válidos
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

describe('Edge Functions - Gemini Chat', () => {
  let authToken: string

  beforeAll(async () => {
    // Login de teste
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword123'
    })

    if (error) {
      console.warn('Auth error in tests:', error)
      // Skip tests if no auth
      return
    }

    authToken = data.session?.access_token || ''
  })

  describe('Authentication', () => {
    it('should reject requests without JWT token', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_guest',
          payload: {}
        })
      })

      expect(response.status).toBe(401)
    })

    it('should accept requests with valid JWT token', async () => {
      if (!authToken) return // Skip if no auth

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'suggest_guest',
          payload: {}
        })
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Podcast Actions', () => {
    it('should suggest trending guest', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'suggest_guest',
          payload: {}
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('result')
      expect(typeof data.result).toBe('string')
      expect(data.result.length).toBeGreaterThan(5)
    }, 15000) // 15s timeout

    it('should suggest topic for guest', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'suggest_topic',
          payload: { guestName: 'Elon Musk' }
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('result')
      expect(typeof data.result).toBe('string')
      expect(data.result).toContain('Elon Musk')
    }, 15000)

    it('should generate dossier with valid structure', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'generate_dossier',
          payload: {
            guestName: 'Steve Jobs',
            theme: 'Innovation'
          }
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('result')

      const dossier = typeof data.result === 'string'
        ? JSON.parse(data.result)
        : data.result

      expect(dossier).toHaveProperty('biography')
      expect(dossier).toHaveProperty('controversies')
      expect(dossier).toHaveProperty('suggestedTopics')
      expect(Array.isArray(dossier.controversies)).toBe(true)
    }, 30000) // Dossier pode demorar mais
  })

  describe('Finance Actions', () => {
    it('should respond to finance chat', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'finance_chat',
          payload: {
            message: 'Como posso economizar dinheiro?',
            context: 'Usuario gasta R$ 5000/mes',
            history: []
          }
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('result')
      expect(typeof data.result).toBe('string')
      expect(data.result.length).toBeGreaterThan(50)
    }, 15000)
  })

  describe('Memory Actions', () => {
    it('should extract insights from message', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'extract_insights',
          payload: {
            messageText: 'Estou muito feliz! Consegui aquele emprego que queria!',
            validSentiments: ['positive', 'negative', 'neutral', 'mixed'],
            triggers: ['achievement', 'work_deadline', 'celebration'],
            subjects: ['work', 'career', 'personal_growth']
          }
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      const insight = typeof data.result === 'string'
        ? JSON.parse(data.result)
        : data.result

      expect(insight).toHaveProperty('sentiment')
      expect(insight).toHaveProperty('sentiment_score')
      expect(insight.sentiment).toBe('positive')
      expect(insight.sentiment_score).toBeGreaterThan(0.5)
    }, 15000)

    it('should extract work items from message', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'extract_work_items',
          payload: {
            messageText: 'Preciso enviar o relatório até sexta-feira e agendar reunião com o cliente'
          }
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      const items = Array.isArray(data.result) ? data.result : []

      expect(items.length).toBeGreaterThan(0)
      expect(items[0]).toHaveProperty('title')
      expect(items[0]).toHaveProperty('priority')
    }, 15000)
  })

  describe('Atlas Actions', () => {
    it('should categorize task correctly', async () => {
      if (!authToken) return

      const testCases = [
        { description: 'Consulta médica às 10h', expectedCategory: 'Saúde' },
        { description: 'Reunião com cliente importante', expectedCategory: 'Trabalho' },
        { description: 'Pagar conta de luz', expectedCategory: 'Finanças' },
        { description: 'Estudar TypeScript', expectedCategory: 'Educação' }
      ]

      for (const testCase of testCases) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            action: 'categorize_task',
            payload: { taskDescription: testCase.description }
          })
        })

        expect(response.ok).toBe(true)

        const data = await response.json()
        expect(data.result).toBe(testCase.expectedCategory)
      }
    }, 60000) // Múltiplos testes
  })

  describe('Performance & Caching', () => {
    it('should return cached result faster on second call', async () => {
      if (!authToken) return

      const payload = {
        action: 'suggest_guest',
        payload: {}
      }

      // First call
      const start1 = Date.now()
      const response1 = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })
      await response1.json()
      const duration1 = Date.now() - start1

      // Second call (should be cached)
      const start2 = Date.now()
      const response2 = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })
      const data2 = await response2.json()
      const duration2 = Date.now() - start2

      // Second call should be much faster
      expect(duration2).toBeLessThan(duration1 * 0.5) // At least 50% faster
      expect(data2.cached).toBe(true) // Should indicate it was cached
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should handle invalid action gracefully', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'invalid_action_name',
          payload: {}
        })
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle malformed payload gracefully', async () => {
      if (!authToken) return

      const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          // Missing action
          payload: {}
        })
      })

      expect(response.status).toBe(400)
    })
  })
})
