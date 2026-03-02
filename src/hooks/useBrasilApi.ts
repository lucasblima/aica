/**
 * useBrasilApi Hooks
 *
 * React Query wrappers for Brazilian data lookups (CEP, CNPJ).
 * Each hook is enabled only when the input has the correct digit count.
 */

import { useQuery } from '@tanstack/react-query'
import { lookupCEP, lookupCNPJ } from '@/services/brasilApiService'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

/**
 * Strips non-digit characters
 */
function digitsOnly(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

/**
 * Looks up a Brazilian CEP (postal code).
 * Only fires when the sanitized input has exactly 8 digits.
 *
 * @param cep - Raw or formatted CEP string (e.g. "01310-100" or "01310100")
 */
export function useCEPLookup(cep: string | null) {
  const clean = digitsOnly(cep)
  const isValid = clean.length === 8

  return useQuery({
    queryKey: ['brasil-cep', clean],
    queryFn: () => lookupCEP(clean),
    enabled: isValid,
    staleTime: SEVEN_DAYS_MS,
    gcTime: SEVEN_DAYS_MS,
    retry: 1,
  })
}

/**
 * Looks up a Brazilian CNPJ (company registration number).
 * Only fires when the sanitized input has exactly 14 digits.
 *
 * @param cnpj - Raw or formatted CNPJ string (e.g. "12.345.678/0001-90")
 */
export function useCNPJLookup(cnpj: string | null) {
  const clean = digitsOnly(cnpj)
  const isValid = clean.length === 14

  return useQuery({
    queryKey: ['brasil-cnpj', clean],
    queryFn: () => lookupCNPJ(clean),
    enabled: isValid,
    staleTime: ONE_DAY_MS,
    gcTime: SEVEN_DAYS_MS,
    retry: 1,
  })
}
