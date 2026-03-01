// src/telegram-mini-app/services/miniAppAuthService.ts
import WebApp from '@twa-dev/sdk'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface MiniAppUser {
  id: string
  display_name: string
  avatar_url: string | null
  telegram_username: string | null
}

export interface AuthResult {
  linked: boolean
  session_token?: string
  user?: MiniAppUser
  telegram_user?: {
    id: number
    first_name: string
    username?: string
  }
}

/**
 * Validate initData with our Edge Function and get session token.
 * Returns null if initData is unavailable (not running inside Telegram).
 */
export async function authenticateMiniApp(): Promise<AuthResult | null> {
  const initData = WebApp.initData
  if (!initData) return null

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/telegram-mini-app-auth`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ initData }),
    }
  )

  if (!res.ok) {
    console.error('[mini-app-auth] Failed:', res.status, await res.text())
    return null
  }

  return res.json()
}
