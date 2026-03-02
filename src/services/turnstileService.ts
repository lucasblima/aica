/**
 * Cloudflare Turnstile Service
 *
 * Verifies Turnstile CAPTCHA tokens via the Edge Function.
 * Uses a fail-open strategy: verification errors are treated as success
 * to avoid blocking legitimate users when the verification service is down.
 */

import { ExternalApiClient } from '@/lib/external-api'

const client = ExternalApiClient.getInstance()

/**
 * Verifies a Cloudflare Turnstile token.
 *
 * Fail-open: returns `true` if the verification service errors,
 * so users are never blocked by an infrastructure outage.
 *
 * @param token - The Turnstile response token from the widget
 * @returns true if verification passed (or service is unavailable)
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const response = await client.call<{ verified: boolean }>(
      'turnstile-verify',
      { token }
    )

    if (!response.success) {
      // Fail-open: treat service errors as verified
      return true
    }

    return response.data?.verified ?? true
  } catch {
    // Fail-open: any exception means we let the user through
    return true
  }
}
