/**
 * Fire-and-forget usage logging for all Edge Functions.
 * Wraps the `log_interaction` RPC so callers don't need to
 * remember parameter names or worry about error handling.
 *
 * Never blocks the main flow — errors are silently caught and logged.
 */

export interface UsageLogParams {
  action: string
  module: string | null
  model: string
  tokensIn?: number
  tokensOut?: number
}

export async function logInteraction(
  supabaseClient: any,
  userId: string,
  params: UsageLogParams
): Promise<void> {
  try {
    await supabaseClient.rpc('log_interaction', {
      p_user_id: userId,
      p_action: params.action,
      p_module: params.module || null,
      p_model: params.model,
      p_tokens_in: params.tokensIn || 0,
      p_tokens_out: params.tokensOut || 0,
    })
  } catch {
    // Fire-and-forget: tracking errors never break main flow
  }
}
