/**
 * Brasil API Service
 *
 * Brazilian-specific lookups (CEP, CNPJ, banks, DDD)
 * via the shared external-brasil Edge Function.
 */

import { ExternalApiClient } from '@/lib/external-api'
import type { CepData, CnpjData, BankData, DddData } from '@/lib/external-api'
import { ExternalApiError } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

/**
 * Strips non-digit characters from a string
 */
function sanitize(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Looks up a Brazilian postal code (CEP).
 *
 * @param cep - 8-digit CEP (punctuation is stripped automatically)
 * @throws ExternalApiError if the CEP is invalid
 */
export async function lookupCEP(cep: string): Promise<CepData | null> {
  const clean = sanitize(cep)
  if (clean.length !== 8) {
    throw new ExternalApiError(
      'CEP must have exactly 8 digits',
      'brasil-cep'
    )
  }

  const response = await client.call<CepData>('brasil-cep', { cep: clean })

  if (!response.success || !response.data) {
    return null
  }

  return response.data
}

/**
 * Looks up a Brazilian company registration number (CNPJ).
 *
 * @param cnpj - 14-digit CNPJ (punctuation is stripped automatically)
 * @throws ExternalApiError if the CNPJ is invalid
 */
export async function lookupCNPJ(cnpj: string): Promise<CnpjData | null> {
  const clean = sanitize(cnpj)
  if (clean.length !== 14) {
    throw new ExternalApiError(
      'CNPJ must have exactly 14 digits',
      'brasil-cnpj'
    )
  }

  const response = await client.call<CnpjData>('brasil-cnpj', { cnpj: clean })

  if (!response.success || !response.data) {
    return null
  }

  return response.data
}

/**
 * Lists all Brazilian banks registered with the Central Bank.
 */
export async function listBanks(): Promise<BankData[]> {
  const response = await client.call<BankData[]>('brasil-banks')

  if (!response.success || !response.data) {
    return []
  }

  return response.data
}

/**
 * Lists cities associated with a Brazilian DDD area code.
 *
 * @param ddd - 2-digit area code
 */
export async function lookupDDD(ddd: string): Promise<DddData | null> {
  const clean = sanitize(ddd)
  if (clean.length !== 2) {
    throw new ExternalApiError(
      'DDD must have exactly 2 digits',
      'brasil-ddd'
    )
  }

  const response = await client.call<DddData>('brasil-ddd', { ddd: clean })

  if (!response.success || !response.data) {
    return null
  }

  return response.data
}
