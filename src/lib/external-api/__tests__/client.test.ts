/**
 * Unit Tests for ExternalApiClient
 *
 * Tests cover:
 * - Singleton pattern (getInstance returns same instance)
 * - Edge Function routing (holidays, brasil-cep, brasil-cnpj)
 * - Brasil API action parameter injection
 * - Error handling (ExternalApiError on Edge Function failure)
 *
 * @see src/lib/external-api/client.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before any imports that use it
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { supabase } from '@/services/supabaseClient'
import { ExternalApiClient } from '../client'
import { ExternalApiError } from '../types'

const mockInvoke = vi.mocked(supabase.functions.invoke)

describe('ExternalApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Singleton', () => {
    it('should return the same instance on repeated calls', () => {
      const a = ExternalApiClient.getInstance()
      const b = ExternalApiClient.getInstance()
      expect(a).toBe(b)
    })
  })

  describe('Edge Function routing', () => {
    it('should route "holidays" to the external-holidays Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, data: [] },
        error: null,
      })

      const client = ExternalApiClient.getInstance()
      await client.call('holidays', { year: 2026 })

      expect(mockInvoke).toHaveBeenCalledWith('external-holidays', {
        body: { year: 2026 },
      })
    })

    it('should route "brasil-cep" to external-brasil with action "cep"', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, data: { cep: '01001000' } },
        error: null,
      })

      const client = ExternalApiClient.getInstance()
      await client.call('brasil-cep', { cep: '01001000' })

      expect(mockInvoke).toHaveBeenCalledWith('external-brasil', {
        body: { action: 'cep', cep: '01001000' },
      })
    })

    it('should route "brasil-cnpj" to external-brasil with action "cnpj"', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, data: { cnpj: '00000000000191' } },
        error: null,
      })

      const client = ExternalApiClient.getInstance()
      await client.call('brasil-cnpj', { cnpj: '00000000000191' })

      expect(mockInvoke).toHaveBeenCalledWith('external-brasil', {
        body: { action: 'cnpj', cnpj: '00000000000191' },
      })
    })

    it('should route "weather" to external-weather Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, data: {} },
        error: null,
      })

      const client = ExternalApiClient.getInstance()
      await client.call('weather', { latitude: -23.55, longitude: -46.63 })

      expect(mockInvoke).toHaveBeenCalledWith('external-weather', {
        body: { latitude: -23.55, longitude: -46.63 },
      })
    })

    it('should route "geolocation" to external-geolocation Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, data: {} },
        error: null,
      })

      const client = ExternalApiClient.getInstance()
      await client.call('geolocation')

      expect(mockInvoke).toHaveBeenCalledWith('external-geolocation', {
        body: {},
      })
    })
  })

  describe('Error handling', () => {
    it('should throw ExternalApiError when Edge Function returns an error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Internal Server Error', context: {}, name: 'FunctionsHttpError' },
      })

      const client = ExternalApiClient.getInstance()

      await expect(client.call('holidays', { year: 2026 })).rejects.toThrow(
        ExternalApiError
      )
    })

    it('should include the API name in the error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'timeout', context: {}, name: 'FunctionsHttpError' },
      })

      const client = ExternalApiClient.getInstance()

      try {
        await client.call('holidays', { year: 2026 })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ExternalApiError)
        expect((err as ExternalApiError).api).toBe('holidays')
      }
    })

    it('should include the error message from the Edge Function', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Rate limit exceeded', context: {}, name: 'FunctionsHttpError' },
      })

      const client = ExternalApiClient.getInstance()

      try {
        await client.call('weather', { latitude: 0, longitude: 0 })
        expect.fail('Should have thrown')
      } catch (err) {
        expect((err as ExternalApiError).message).toBe('Rate limit exceeded')
      }
    })
  })

  describe('Response passthrough', () => {
    it('should return the data from the Edge Function response', async () => {
      const mockData = {
        success: true,
        data: [{ date: '2026-01-01', name: 'Confraternizacao Universal' }],
      }

      mockInvoke.mockResolvedValueOnce({
        data: mockData,
        error: null,
      })

      const client = ExternalApiClient.getInstance()
      const result = await client.call('holidays', { year: 2026 })

      expect(result).toEqual(mockData)
    })
  })
})
