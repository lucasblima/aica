/**
 * External API integration library
 *
 * Provides a singleton client for calling third-party APIs
 * securely through Supabase Edge Functions.
 *
 * @module lib/external-api
 */

export { ExternalApiClient, useExternalApi } from './client'
export { ExternalApiError } from './types'
export type {
  ExternalApiName,
  ExternalApiResponse,
  HolidayData,
  WeatherData,
  GeolocationData,
  CepData,
  CnpjData,
  BankData,
  DddData,
} from './types'
