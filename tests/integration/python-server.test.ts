/**
 * Integration Tests - Python Server (Easypanel)
 *
 * Testa chamadas diretas ao servidor Python para validar:
 * - Health check
 * - PDF processing com PII sanitization
 * - Embedding generation
 * - Text sanitization
 * - Sentiment analysis
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const PYTHON_SERVER_URL = process.env.VITE_LLM_API_URL || 'http://localhost:8001'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

describe('Python Server - Integration Tests', () => {
  let authToken: string

  beforeAll(async () => {
    // Login de teste
    const { data } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword123'
    })

    authToken = data.session?.access_token || ''
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/health`)

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('status')
      expect(data.status).toBe('healthy')
      expect(data).toHaveProperty('timestamp')
    })

    it('should include version info', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/health`)
      const data = await response.json()

      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('python_version')
    })
  })

  describe('PII Sanitization', () => {
    it('should sanitize text with CPF', async () => {
      const textWithCPF = 'Meu CPF é 123.456.789-10 e moro em São Paulo'

      const response = await fetch(`${PYTHON_SERVER_URL}/sanitize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textWithCPF,
          context: 'financial'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('sanitized_text')
      expect(data.sanitized_text).not.toContain('123.456.789-10')
      expect(data.sanitized_text).toContain('[CPF_REDACTED]')
      expect(data).toHaveProperty('pii_detected')
      expect(data.pii_detected).toBe(true)
    })

    it('should sanitize text with CNPJ', async () => {
      const textWithCNPJ = 'Empresa CNPJ 12.345.678/0001-90'

      const response = await fetch(`${PYTHON_SERVER_URL}/sanitize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textWithCNPJ,
          context: 'financial'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.sanitized_text).toContain('[CNPJ_REDACTED]')
      expect(data).toHaveProperty('pii_stats')
      expect(data.pii_stats.cnpj_count).toBeGreaterThan(0)
    })

    it('should sanitize email addresses', async () => {
      const textWithEmail = 'Meu email é contato@empresa.com.br'

      const response = await fetch(`${PYTHON_SERVER_URL}/sanitize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textWithEmail,
          context: 'general'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.sanitized_text).not.toContain('contato@empresa.com.br')
      expect(data.sanitized_text).toContain('[EMAIL_REDACTED]')
    })

    it('should sanitize multiple PII types', async () => {
      const textWithMultiplePII = `
        Nome: João Silva
        CPF: 123.456.789-10
        Email: joao@example.com
        Telefone: (11) 98765-4321
        Conta: 12345-6
      `

      const response = await fetch(`${PYTHON_SERVER_URL}/sanitize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textWithMultiplePII,
          context: 'financial'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.sanitized_text).toContain('[CPF_REDACTED]')
      expect(data.sanitized_text).toContain('[EMAIL_REDACTED]')
      expect(data.sanitized_text).toContain('[PHONE_REDACTED]')

      expect(data.pii_stats.total_pii_count).toBeGreaterThan(3)
    })
  })

  describe('PDF Processing', () => {
    it('should process PDF and extract transactions', async () => {
      if (!authToken) return

      // Create mock base64 PDF
      const mockPdfContent = 'Mock bank statement content with transactions'
      const base64Pdf = Buffer.from(mockPdfContent).toString('base64')

      const response = await fetch(`${PYTHON_SERVER_URL}/process-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          file_base64: base64Pdf,
          user_id: 'test-user-id',
          sanitize_pii: true
        })
      })

      // Note: This might fail with mock data, adjust based on actual implementation
      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('transactions')
      expect(data).toHaveProperty('pii_sanitized')
      expect(data.pii_sanitized).toBe(true)
    }, 60000) // PDF processing pode demorar

    it('should detect and sanitize PII in PDF', async () => {
      if (!authToken) return

      // Mock PDF with PII
      const pdfWithPII = 'Extrato Bancário\nCPF: 123.456.789-10\nConta: 12345-6'
      const base64Pdf = Buffer.from(pdfWithPII).toString('base64')

      const response = await fetch(`${PYTHON_SERVER_URL}/process-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          file_base64: base64Pdf,
          user_id: 'test-user-id',
          sanitize_pii: true
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('pii_stats')
      expect(data.pii_stats).toHaveProperty('cpf_count')
      expect(data.pii_stats.cpf_count).toBeGreaterThan(0)
    }, 60000)
  })

  describe('Embedding Generation', () => {
    it('should generate embeddings for single text', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: ['Este é um texto de teste para embedding']
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('embeddings')
      expect(Array.isArray(data.embeddings)).toBe(true)
      expect(data.embeddings.length).toBe(1)
      expect(Array.isArray(data.embeddings[0])).toBe(true)
      expect(data.embeddings[0].length).toBeGreaterThan(100) // text-embedding-004 tem 768 dimensões
    })

    it('should generate embeddings for batch of texts', async () => {
      const texts = [
        'Primeira mensagem',
        'Segunda mensagem',
        'Terceira mensagem'
      ]

      const response = await fetch(`${PYTHON_SERVER_URL}/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.embeddings.length).toBe(3)

      // All embeddings should have same dimension
      const dimension = data.embeddings[0].length
      expect(data.embeddings[1].length).toBe(dimension)
      expect(data.embeddings[2].length).toBe(dimension)
    })

    it('should handle empty text gracefully', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/generate-embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: ['']
        })
      })

      // Should either return zero vector or error
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Sentiment Analysis', () => {
    it('should analyze positive sentiment', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Estou muito feliz e animado com o novo projeto!'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('sentiment')
      expect(data.sentiment).toBe('positive')
      expect(data).toHaveProperty('score')
      expect(data.score).toBeGreaterThan(0.5)
    })

    it('should analyze negative sentiment', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Estou muito triste e desapontado com os resultados'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.sentiment).toBe('negative')
      expect(data.score).toBeLessThan(-0.3)
    })

    it('should analyze neutral sentiment', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'A reunião está marcada para terça-feira às 15h'
        })
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.sentiment).toBe('neutral')
      expect(Math.abs(data.score)).toBeLessThan(0.3)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing authentication', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/process-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_base64: 'test',
          user_id: 'test',
          sanitize_pii: true
        })
      })

      expect(response.status).toBe(401)
    })

    it('should handle invalid base64 PDF', async () => {
      if (!authToken) return

      const response = await fetch(`${PYTHON_SERVER_URL}/process-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          file_base64: 'invalid-base64-!@#$',
          user_id: 'test-user-id',
          sanitize_pii: true
        })
      })

      expect([400, 500]).toContain(response.status)
    })

    it('should handle malformed request body', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/sanitize-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing 'text' field
          context: 'financial'
        })
      })

      expect(response.status).toBe(422) // Unprocessable entity
    })
  })

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await fetch(`${PYTHON_SERVER_URL}/health`, {
        headers: {
          'Origin': 'http://localhost:5173'
        }
      })

      expect(response.headers.get('access-control-allow-origin')).toBeTruthy()
    })
  })
})
