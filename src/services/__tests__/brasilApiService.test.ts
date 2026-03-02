/**
 * Unit Tests for Brasil API Service
 *
 * Tests cover:
 * - lookupCEP: input sanitization, length validation, API call
 * - lookupCNPJ: input sanitization, length validation, API call
 * - lookupDDD: input sanitization, length validation
 *
 * The ExternalApiClient is mocked so no real Edge Function calls are made.
 *
 * @see src/services/brasilApiService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExternalApiError } from '@/lib/external-api'

// vi.hoisted runs BEFORE vi.mock hoisting, so mockCall is available in the factory
const { mockCall } = vi.hoisted(() => ({
  mockCall: vi.fn(),
}))

// Mock the ExternalApiClient singleton
vi.mock('@/lib/external-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/external-api')>()
  return {
    ...actual,
    ExternalApiClient: {
      getInstance: () => ({
        call: mockCall,
      }),
    },
  }
})

// Import AFTER mocking so the module-level `client` picks up the mock
import { lookupCEP, lookupCNPJ, lookupDDD } from '../brasilApiService'

describe('brasilApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('lookupCEP', () => {
    it('should sanitize input by removing dots and dashes', async () => {
      mockCall.mockResolvedValueOnce({
        success: true,
        data: {
          cep: '01001000',
          state: 'SP',
          city: 'Sao Paulo',
          neighborhood: 'Se',
          street: 'Praca da Se',
          location: { type: 'Point', coordinates: { longitude: '-46.63', latitude: '-23.55' } },
        },
      })

      await lookupCEP('01001-000')

      expect(mockCall).toHaveBeenCalledWith('brasil-cep', { cep: '01001000' })
    })

    it('should throw ExternalApiError for CEP with fewer than 8 digits', async () => {
      await expect(lookupCEP('1234567')).rejects.toThrow(ExternalApiError)
      await expect(lookupCEP('1234567')).rejects.toThrow('CEP must have exactly 8 digits')
    })

    it('should throw ExternalApiError for CEP with more than 8 digits', async () => {
      await expect(lookupCEP('123456789')).rejects.toThrow(ExternalApiError)
    })

    it('should return null when the API returns no data', async () => {
      mockCall.mockResolvedValueOnce({
        success: false,
        data: null,
      })

      const result = await lookupCEP('99999999')

      expect(result).toBeNull()
    })

    it('should return CepData on successful lookup', async () => {
      const mockCep = {
        cep: '01001000',
        state: 'SP',
        city: 'Sao Paulo',
        neighborhood: 'Se',
        street: 'Praca da Se',
        location: { type: 'Point', coordinates: { longitude: '-46.63', latitude: '-23.55' } },
      }

      mockCall.mockResolvedValueOnce({
        success: true,
        data: mockCep,
      })

      const result = await lookupCEP('01001000')

      expect(result).toEqual(mockCep)
    })

    it('should strip all non-digit characters from input', async () => {
      mockCall.mockResolvedValueOnce({ success: true, data: { cep: '01001000' } })

      await lookupCEP('01.001-000')

      expect(mockCall).toHaveBeenCalledWith('brasil-cep', { cep: '01001000' })
    })
  })

  describe('lookupCNPJ', () => {
    it('should throw ExternalApiError for CNPJ with fewer than 14 digits', async () => {
      await expect(lookupCNPJ('1234567890123')).rejects.toThrow(ExternalApiError)
      await expect(lookupCNPJ('1234567890123')).rejects.toThrow(
        'CNPJ must have exactly 14 digits'
      )
    })

    it('should throw ExternalApiError for CNPJ with more than 14 digits', async () => {
      await expect(lookupCNPJ('123456789012345')).rejects.toThrow(ExternalApiError)
    })

    it('should sanitize input by removing punctuation', async () => {
      mockCall.mockResolvedValueOnce({
        success: true,
        data: {
          cnpj: '00000000000191',
          razao_social: 'Banco do Brasil SA',
          nome_fantasia: 'Banco do Brasil',
          situacao_cadastral: 'Ativa',
          descricao_situacao_cadastral: 'Ativa',
        },
      })

      await lookupCNPJ('00.000.000/0001-91')

      expect(mockCall).toHaveBeenCalledWith('brasil-cnpj', { cnpj: '00000000000191' })
    })

    it('should return null when the API returns no data', async () => {
      mockCall.mockResolvedValueOnce({
        success: false,
        data: null,
      })

      const result = await lookupCNPJ('00000000000191')

      expect(result).toBeNull()
    })

    it('should return CnpjData on successful lookup', async () => {
      const mockCnpj = {
        cnpj: '00000000000191',
        razao_social: 'Banco do Brasil SA',
        nome_fantasia: 'Banco do Brasil',
        situacao_cadastral: 'Ativa',
        descricao_situacao_cadastral: 'Ativa',
      }

      mockCall.mockResolvedValueOnce({
        success: true,
        data: mockCnpj,
      })

      const result = await lookupCNPJ('00000000000191')

      expect(result).toEqual(mockCnpj)
    })
  })

  describe('lookupDDD', () => {
    it('should throw ExternalApiError for DDD with fewer than 2 digits', async () => {
      await expect(lookupDDD('1')).rejects.toThrow(ExternalApiError)
      await expect(lookupDDD('1')).rejects.toThrow('DDD must have exactly 2 digits')
    })

    it('should throw ExternalApiError for DDD with more than 2 digits', async () => {
      await expect(lookupDDD('123')).rejects.toThrow(ExternalApiError)
    })

    it('should return DddData on successful lookup', async () => {
      const mockDdd = {
        state: 'SP',
        cities: ['Sao Paulo', 'Guarulhos', 'Osasco'],
      }

      mockCall.mockResolvedValueOnce({
        success: true,
        data: mockDdd,
      })

      const result = await lookupDDD('11')

      expect(result).toEqual(mockDdd)
      expect(mockCall).toHaveBeenCalledWith('brasil-ddd', { ddd: '11' })
    })
  })
})
