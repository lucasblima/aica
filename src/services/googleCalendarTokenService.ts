import { supabase } from './supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GoogleCalendarTokenService');

/**
 * Token Refresh Configuration
 * Implements exponential backoff retry strategy
 */
const TOKEN_REFRESH_CONFIG = {
    /** Maximum number of retry attempts */
    maxRetries: 3,
    /** Base delay in milliseconds (doubles with each retry: 1s, 2s, 4s) */
    baseDelayMs: 1000,
    /** Time buffer before expiry to trigger proactive refresh (5 minutes) */
    proactiveRefreshBufferMs: 5 * 60 * 1000,
    /** Minimum time between refresh attempts to prevent hammering (30 seconds) */
    minRefreshIntervalMs: 30 * 1000,
};

/**
 * Token refresh state tracking
 */
interface TokenRefreshState {
    lastAttemptTime: number | null;
    consecutiveFailures: number;
    lastErrorCode: string | null;
}

let refreshState: TokenRefreshState = {
    lastAttemptTime: null,
    consecutiveFailures: 0,
    lastErrorCode: null,
};

/**
 * Callback type for token refresh failure notifications
 */
type TokenRefreshFailureCallback = (error: {
    code: string;
    message: string;
    requiresReconnect: boolean;
    consecutiveFailures: number;
}) => void;

/** Registered callbacks for refresh failures */
const refreshFailureCallbacks: TokenRefreshFailureCallback[] = [];

/**
 * Register a callback to be notified when token refresh fails
 * Used by UI components to show user-friendly notifications
 */
export function onTokenRefreshFailure(callback: TokenRefreshFailureCallback): () => void {
    refreshFailureCallbacks.push(callback);
    return () => {
        const index = refreshFailureCallbacks.indexOf(callback);
        if (index > -1) {
            refreshFailureCallbacks.splice(index, 1);
        }
    };
}

/**
 * Notify all registered callbacks about a refresh failure
 */
function notifyRefreshFailure(error: {
    code: string;
    message: string;
    requiresReconnect: boolean;
}): void {
    const notification = {
        ...error,
        consecutiveFailures: refreshState.consecutiveFailures,
    };
    refreshFailureCallbacks.forEach(callback => {
        try {
            callback(notification);
        } catch (e) {
            log.error('Error in refresh failure callback:', { error: e });
        }
    });
}

/**
 * Reset refresh state after successful refresh
 */
function resetRefreshState(): void {
    refreshState = {
        lastAttemptTime: Date.now(),
        consecutiveFailures: 0,
        lastErrorCode: null,
    };
}

/**
 * Record a refresh failure
 */
function recordRefreshFailure(errorCode: string): void {
    refreshState.lastAttemptTime = Date.now();
    refreshState.consecutiveFailures++;
    refreshState.lastErrorCode = errorCode;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
    return TOKEN_REFRESH_CONFIG.baseDelayMs * Math.pow(2, attempt);
}


/**
 * Serviço de gerenciamento de tokens Google Calendar
 * Armazena tokens no banco de dados Supabase associados ao usuário autenticado
 * Garante que cada usuário tenha sua própria conexão e tokens
 */

interface GoogleCalendarToken {
    id: string;
    user_id: string;
    access_token: string;
    refresh_token?: string;
    token_expiry?: string; // ISO 8601 timestamp
    email?: string;
    name?: string;
    picture_url?: string;
    scopes?: string[];
    is_connected: boolean;
    last_sync?: string;
    last_refresh?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Salva os tokens do Google no banco de dados para o usuário autenticado
 */
export async function saveGoogleCalendarTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
    userInfo?: {
        email?: string;
        name?: string;
        picture?: string;
    },
    grantedScopes?: string[]
): Promise<GoogleCalendarToken> {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) {
            throw new Error('Usuário não autenticado. Faça login primeiro.');
        }

        const userId = session.session.user.id;
        const tokenExpiry = expiresIn
            ? new Date(Date.now() + expiresIn * 1000).toISOString()
            : null;

        // Verificar se já existe um registro para este usuário
        const { data: existingToken } = await supabase
            .from('google_calendar_tokens')
            .select('id')
            .eq('user_id', userId)
            .single();

        let result;

        if (existingToken) {
            // Atualizar token existente
            const updatePayload: Record<string, unknown> = {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expiry: tokenExpiry,
                    email: userInfo?.email,
                    name: userInfo?.name,
                    picture_url: userInfo?.picture,
                    is_connected: true,
                    last_sync: new Date().toISOString(),
            };
            if (grantedScopes) updatePayload.scopes = grantedScopes;

            result = await supabase
                .from('google_calendar_tokens')
                .update(updatePayload)
                .eq('user_id', userId)
                .select()
                .single();
        } else {
            // Criar novo registro
            const insertPayload: Record<string, unknown> = {
                    user_id: userId,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expiry: tokenExpiry,
                    email: userInfo?.email,
                    name: userInfo?.name,
                    picture_url: userInfo?.picture,
                    is_connected: true,
            };
            if (grantedScopes) insertPayload.scopes = grantedScopes;

            result = await supabase
                .from('google_calendar_tokens')
                .insert(insertPayload)
                .select()
                .single();
        }

        if (result.error) {
            throw new Error(`Erro ao salvar tokens: ${result.error.message}`);
        }

        return result.data as GoogleCalendarToken;
    } catch (error) {
        log.error('Erro ao salvar tokens Google Calendar:', { error: error });
        throw error;
    }
}

/**
 * Obtém os tokens do Google para o usuário autenticado
 */
export async function getGoogleCalendarTokens(): Promise<GoogleCalendarToken | null> {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) {
            log.warn('Usuário não autenticado');
            return null;
        }

        const { data, error } = await supabase
            .from('google_calendar_tokens')
            .select('*')
            .eq('user_id', session.session.user.id)
            .maybeSingle();

        if (error) {
            log.error('Erro ao buscar tokens:', { error: error });
            return null;
        }

        return data as GoogleCalendarToken | null;
    } catch (error) {
        log.error('Erro ao obter tokens Google Calendar:', { error: error });
        return null;
    }
}

/**
 * Verifica se o usuário tem Google Calendar conectado
 */
export async function isGoogleCalendarConnected(): Promise<boolean> {
    try {
        const tokens = await getGoogleCalendarTokens();

        if (!tokens || !tokens.is_connected) {
            return false;
        }

        // Verificar se o token expirou
        if (tokens.token_expiry) {
            const expiryTime = new Date(tokens.token_expiry).getTime();
            if (expiryTime < Date.now()) {
                // Token expirado, tentar renovar
                if (tokens.refresh_token) {
                    const refreshed = await refreshAccessToken(tokens.refresh_token);
                    return refreshed !== null;
                }
                return false;
            }
        }

        return true;
    } catch (error) {
        log.error('Erro ao verificar conexão Google Calendar:', { error: error });
        return false;
    }
}

/**
 * Obtém um token de acesso válido da sessão Supabase
 * O Supabase gerencia automaticamente a renovação dos tokens OAuth
 *
 * Implements proactive token refresh:
 * - Refreshes token if expiring within 5 minutes (configurable)
 * - Prevents failed API calls due to token expiration
 */
export async function getValidAccessToken(): Promise<string | null> {
    const timestamp = new Date().toISOString();

    try {
        log.debug(`[getValidAccessToken] [${timestamp}] Obtaining valid token...`);

        // First: try to get updated token from Supabase session
        // Supabase automatically renews expired tokens
        log.debug('[getValidAccessToken] Checking Supabase session for provider_token...');
        const { data: session } = await supabase.auth.getSession();

        if (session?.session?.provider_token) {
            log.debug('[getValidAccessToken] Provider token found in Supabase session');

            // Update token in database
            if (session.session.user?.id) {
                log.debug('[getValidAccessToken] Updating token in database...');
                await supabase
                    .from('google_calendar_tokens')
                    .update({
                        access_token: session.session.provider_token,
                        last_sync: new Date().toISOString(),
                    })
                    .eq('user_id', session.session.user.id);
            }

            return session.session.provider_token;
        }

        log.debug('[getValidAccessToken] No provider_token in session, checking database...');

        // Fallback: get from database
        const tokens = await getGoogleCalendarTokens();

        if (!tokens) {
            log.error('[getValidAccessToken] ERROR_CODE=TOKEN_NOT_FOUND: No token in database');
            throw new Error('Token não encontrado. Autorize o Google Calendar primeiro.');
        }

        log.debug('[getValidAccessToken] Token info from database:', {
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            tokenExpiry: tokens.token_expiry,
            isConnected: tokens.is_connected,
        });

        // Check if token needs refresh (expired or expiring soon)
        if (tokens.token_expiry) {
            const expiryTime = new Date(tokens.token_expiry).getTime();
            const timeUntilExpiry = expiryTime - Date.now();
            const timeUntilExpiryMinutes = Math.round(timeUntilExpiry / 60000);

            log.debug('[getValidAccessToken] Token expiration status:', {
                expiryTime: new Date(tokens.token_expiry).toISOString(),
                timeUntilExpiryMinutes,
                proactiveRefreshThresholdMinutes: Math.round(TOKEN_REFRESH_CONFIG.proactiveRefreshBufferMs / 60000),
            });

            // Proactive refresh: refresh if expiring within buffer time
            const needsRefresh = timeUntilExpiry < TOKEN_REFRESH_CONFIG.proactiveRefreshBufferMs;
            const isExpired = timeUntilExpiry < 0;

            if (needsRefresh) {
                if (isExpired) {
                    log.warn('[getValidAccessToken] Token EXPIRED. Attempting refresh...');
                } else {
                    log.debug(`[getValidAccessToken] Token expiring in ${timeUntilExpiryMinutes} minutes. Proactive refresh...`);
                }

                if (tokens.refresh_token) {
                    log.debug('[getValidAccessToken] Refresh token available, initiating refresh...');
                    const newAccessToken = await refreshAccessToken(tokens.refresh_token);

                    if (newAccessToken) {
                        log.debug('[getValidAccessToken] Token refreshed successfully');
                        return newAccessToken;
                    }

                    log.error('[getValidAccessToken] ERROR_CODE=REFRESH_FAILED: Token refresh failed');

                    // If token is expired and refresh failed, throw error
                    if (isExpired) {
                        throw new Error('Token expirado e refresh falhou. Reconecte ao Google Calendar.');
                    }

                    // If not expired yet, return current token and log warning
                    log.warn('[getValidAccessToken] Refresh failed but token not yet expired. Using current token.');
                } else {
                    log.error('[getValidAccessToken] ERROR_CODE=NO_REFRESH_TOKEN: No refresh token available');

                    if (isExpired) {
                        throw new Error('Token expirado. Reconecte ao Google Calendar.');
                    }
                }
            }
        }

        log.debug('[getValidAccessToken] Returning access_token from database');
        return tokens.access_token;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.error(`[getValidAccessToken] ERROR: ${errorMessage}`, { error });
        return null;
    }
}

/**
 * Classifies token refresh errors for appropriate handling
 */
interface TokenRefreshError {
    code: string;
    message: string;
    isRetryable: boolean;
    requiresReconnect: boolean;
}

function classifyRefreshError(status: number, errorData: Record<string, unknown>): TokenRefreshError {
    const errorString = JSON.stringify(errorData).toLowerCase();

    // Invalid grant - token revoked or expired permanently
    if (status === 400 && errorString.includes('invalid_grant')) {
        return {
            code: 'INVALID_GRANT',
            message: 'Refresh token revogado ou expirado. Reconexão necessaria.',
            isRetryable: false,
            requiresReconnect: true,
        };
    }

    // Rate limiting
    if (status === 429) {
        return {
            code: 'RATE_LIMITED',
            message: 'Limite de requisicoes excedido. Aguarde alguns minutos.',
            isRetryable: true,
            requiresReconnect: false,
        };
    }

    // Server errors - retryable
    if (status >= 500 && status < 600) {
        return {
            code: `SERVER_ERROR_${status}`,
            message: 'Erro temporário no servidor Google. Tentando novamente.',
            isRetryable: true,
            requiresReconnect: false,
        };
    }

    // Unauthorized - likely credential issue
    if (status === 401) {
        return {
            code: 'UNAUTHORIZED',
            message: 'Credenciais invalidas. Reconexão necessaria.',
            isRetryable: false,
            requiresReconnect: true,
        };
    }

    // Other client errors - not retryable
    if (status >= 400 && status < 500) {
        return {
            code: `CLIENT_ERROR_${status}`,
            message: errorData.error as string || 'Erro na requisicao de refresh.',
            isRetryable: false,
            requiresReconnect: false,
        };
    }

    // Network or unknown errors - retryable
    return {
        code: 'UNKNOWN_ERROR',
        message: 'Erro desconhecido. Tentando novamente.',
        isRetryable: true,
        requiresReconnect: false,
    };
}

/**
 * Attempt a single token refresh call to the Edge Function
 */
async function attemptTokenRefresh(
    refreshToken: string,
    supabaseUrl: string,
    supabaseAnonKey: string
): Promise<{ success: true; accessToken: string; expiresIn: number } | { success: false; error: TokenRefreshError }> {
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/oauth-token-refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            const classifiedError = classifyRefreshError(response.status, errorData);
            return { success: false, error: classifiedError };
        }

        const data = await response.json();
        return {
            success: true,
            accessToken: data.access_token,
            expiresIn: data.expires_in,
        };
    } catch (error) {
        // Network errors are retryable
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: error instanceof Error ? error.message : 'Erro de rede',
                isRetryable: true,
                requiresReconnect: false,
            },
        };
    }
}

/**
 * Renova o token de acesso usando o refresh token
 *
 * SECURITY: Client secret removido do frontend - agora usa Edge Function
 * A Edge Function oauth-token-refresh gerencia tokens server-side de forma segura
 *
 * Implements exponential backoff retry strategy:
 * - Attempt 1: immediate
 * - Attempt 2: after 1 second
 * - Attempt 3: after 2 seconds
 * - Attempt 4: after 4 seconds
 */
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    log.debug(`[refreshAccessToken] [${timestamp}] Starting token refresh with retry logic...`);
    log.debug('[refreshAccessToken] Refresh token present:', !!refreshToken);
    log.debug('[refreshAccessToken] Current refresh state:', {
        consecutiveFailures: refreshState.consecutiveFailures,
        lastErrorCode: refreshState.lastErrorCode,
    });

    // Check minimum refresh interval to prevent hammering
    if (refreshState.lastAttemptTime) {
        const timeSinceLastAttempt = Date.now() - refreshState.lastAttemptTime;
        if (timeSinceLastAttempt < TOKEN_REFRESH_CONFIG.minRefreshIntervalMs) {
            const waitTime = TOKEN_REFRESH_CONFIG.minRefreshIntervalMs - timeSinceLastAttempt;
            log.debug(`[refreshAccessToken] Rate limiting: waiting ${waitTime}ms before retry`);
            await sleep(waitTime);
        }
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        log.error('[refreshAccessToken] ERROR_CODE=CONFIG_MISSING: Supabase configuration missing');
        recordRefreshFailure('CONFIG_MISSING');
        return null;
    }

    let lastError: TokenRefreshError | null = null;

    // Retry loop with exponential backoff
    for (let attempt = 0; attempt <= TOKEN_REFRESH_CONFIG.maxRetries; attempt++) {
        if (attempt > 0) {
            const delay = getRetryDelay(attempt - 1);
            log.debug(`[refreshAccessToken] Retry attempt ${attempt}/${TOKEN_REFRESH_CONFIG.maxRetries} after ${delay}ms delay`);
            await sleep(delay);
        }

        log.debug(`[refreshAccessToken] Attempt ${attempt + 1}/${TOKEN_REFRESH_CONFIG.maxRetries + 1} - Calling Edge Function...`);

        const result = await attemptTokenRefresh(refreshToken, supabaseUrl, supabaseAnonKey);

        if (result.success) {
            const elapsedMs = Date.now() - startTime;
            log.debug(`[refreshAccessToken] SUCCESS after ${attempt + 1} attempt(s) in ${elapsedMs}ms`);
            log.debug('[refreshAccessToken] New token received:', {
                hasAccessToken: true,
                expiresIn: result.expiresIn,
            });

            // Save the new token to database
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.user?.id) {
                const newExpiry = new Date(Date.now() + result.expiresIn * 1000).toISOString();

                log.debug('[refreshAccessToken] Saving new token to database...', {
                    userId: session.session.user.id,
                    newExpiry,
                });

                const { error } = await supabase
                    .from('google_calendar_tokens')
                    .update({
                        access_token: result.accessToken,
                        token_expiry: newExpiry,
                        last_refresh: new Date().toISOString(),
                    })
                    .eq('user_id', session.session.user.id);

                if (error) {
                    log.error('[refreshAccessToken] ERROR_CODE=DB_SAVE_FAILED: Error saving token:', { error });
                } else {
                    log.debug('[refreshAccessToken] Token saved successfully');
                }
            }

            // Reset refresh state on success
            resetRefreshState();
            return result.accessToken;
        }

        // Handle error (narrowing: result.success was true above with early return)
        lastError = (result as { success: false; error: TokenRefreshError }).error;
        log.warn(`[refreshAccessToken] Attempt ${attempt + 1} failed: ERROR_CODE=${lastError.code}: ${lastError.message}`);

        // If error is not retryable, break immediately
        if (!lastError.isRetryable) {
            log.debug('[refreshAccessToken] Error is not retryable, stopping retry loop');
            break;
        }
    }

    // All retries exhausted or non-retryable error
    const elapsedMs = Date.now() - startTime;
    recordRefreshFailure(lastError?.code || 'UNKNOWN');

    log.error(`[refreshAccessToken] FAILED after ${elapsedMs}ms - ERROR_CODE=${lastError?.code}: ${lastError?.message}`);
    log.error('[refreshAccessToken] Consecutive failures:', refreshState.consecutiveFailures);

    // Handle permanent failures requiring reconnection
    if (lastError?.requiresReconnect) {
        log.warn('[refreshAccessToken] Refresh token invalid/revoked. Disconnecting Google Calendar...');

        // Notify UI about the failure
        notifyRefreshFailure({
            code: lastError.code,
            message: lastError.message,
            requiresReconnect: true,
        });

        await disconnectGoogleCalendar();
        return null;
    }

    // Notify UI about transient failures (after max retries)
    if (refreshState.consecutiveFailures >= TOKEN_REFRESH_CONFIG.maxRetries) {
        notifyRefreshFailure({
            code: lastError?.code || 'MAX_RETRIES_EXCEEDED',
            message: 'Falha ao sincronizar calendário apos multiplas tentativas. Verifique sua conexão.',
            requiresReconnect: false,
        });
    }

    return null;
}

/**
 * Desconecta Google Calendar para o usuário autenticado
 */
export async function disconnectGoogleCalendar(): Promise<void> {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) {
            throw new Error('Usuário não autenticado');
        }

        const tokens = await getGoogleCalendarTokens();

        if (tokens?.access_token) {
            // Tentar revogar o token com Google (opcional, best practice)
            try {
                await fetch(`https://oauth2.googleapis.com/revoke`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        token: tokens.access_token,
                    }).toString(),
                });
            } catch (err) {
                log.warn('Aviso: Não foi possível revogar token com Google:', err);
            }
        }

        // Marcar como desconectado no banco de dados
        await supabase
            .from('google_calendar_tokens')
            .update({ is_connected: false })
            .eq('user_id', session.session.user.id);
    } catch (error) {
        log.error('Erro ao desconectar Google Calendar:', { error: error });
        throw error;
    }
}

/**
 * Atualiza o timestamp de última sincronização
 */
export async function updateLastSyncTime(): Promise<void> {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) {
            return;
        }

        await supabase
            .from('google_calendar_tokens')
            .update({ last_sync: new Date().toISOString() })
            .eq('user_id', session.session.user.id);
    } catch (error) {
        log.error('Erro ao atualizar último sync:', { error: error });
    }
}

/**
 * Obtém informações do usuário Google Calendar conectado
 */
export async function getGoogleUserInfo(): Promise<{
    email?: string;
    name?: string;
    picture?: string;
} | null> {
    try {
        const tokens = await getGoogleCalendarTokens();

        if (!tokens) {
            return null;
        }

        return {
            email: tokens.email || undefined,
            name: tokens.name || undefined,
            picture: tokens.picture_url || undefined,
        };
    } catch (error) {
        log.error('Erro ao obter informações do usuário Google:', { error: error });
        return null;
    }
}

/**
 * Get current token refresh state for monitoring/debugging
 */
export function getTokenRefreshState(): {
    consecutiveFailures: number;
    lastErrorCode: string | null;
    lastAttemptTime: Date | null;
} {
    return {
        consecutiveFailures: refreshState.consecutiveFailures,
        lastErrorCode: refreshState.lastErrorCode,
        lastAttemptTime: refreshState.lastAttemptTime
            ? new Date(refreshState.lastAttemptTime)
            : null,
    };
}

/**
 * Remove a specific scope from the user's granted scopes in DB.
 * Does NOT revoke the token — the backend will refuse to use the removed scope.
 * If no scopes remain after removal, performs a full disconnect.
 */
export async function removeScope(scopeSubstring: string): Promise<void> {
    try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) {
            throw new Error('Usuário não autenticado');
        }

        const tokens = await getGoogleCalendarTokens();
        if (!tokens?.scopes) return;

        const updatedScopes = tokens.scopes.filter(
            (s: string) => !s.includes(scopeSubstring)
        );

        // If no meaningful scopes remain, do a full disconnect
        if (updatedScopes.length <= 1 && updatedScopes.every((s: string) => s.includes('userinfo'))) {
            await disconnectGoogleCalendar();
            return;
        }

        await supabase
            .from('google_calendar_tokens')
            .update({ scopes: updatedScopes })
            .eq('user_id', session.session.user.id);

        log.debug('Scope removed:', { removed: scopeSubstring, remaining: updatedScopes });
    } catch (error) {
        log.error('Error removing scope:', { error, scopeSubstring });
        throw error;
    }
}

/**
 * Check if the user has Gmail read scope granted.
 */
export async function hasGmailScope(): Promise<boolean> {
    try {
        const tokens = await getGoogleCalendarTokens();
        if (!tokens || !tokens.scopes) return false;
        return tokens.scopes.some(
            (s: string) => s.includes('gmail.readonly') || s.includes('gmail')
        );
    } catch (error) {
        log.error('Error checking Gmail scope:', { error });
        return false;
    }
}

/**
 * Check if the user has Google Drive read scope granted.
 */
export async function hasDriveScope(): Promise<boolean> {
    try {
        const tokens = await getGoogleCalendarTokens();
        if (!tokens || !tokens.scopes) return false;
        return tokens.scopes.some(
            (s: string) => s.includes('drive.readonly') || s.includes('drive')
        );
    } catch (error) {
        log.error('Error checking Drive scope:', { error });
        return false;
    }
}

/**
 * Check if the user has calendar write (calendar.events) scope.
 * Returns false if only calendar.readonly was granted.
 */
export async function hasCalendarWriteScope(): Promise<boolean> {
    try {
        const tokens = await getGoogleCalendarTokens();
        if (!tokens || !tokens.scopes) return false;
        return tokens.scopes.some(
            (s: string) => s === 'https://www.googleapis.com/auth/calendar.events' ||
                           s === 'https://www.googleapis.com/auth/calendar'
        );
    } catch (error) {
        log.error('Error checking calendar write scope:', { error });
        return false;
    }
}

/**
 * Check if token needs refresh based on expiry time
 * Useful for UI components to show warning before expiry
 */
export async function getTokenExpiryStatus(): Promise<{
    isExpired: boolean;
    isExpiringSoon: boolean;
    timeUntilExpiryMs: number | null;
    expiryTime: Date | null;
} | null> {
    try {
        const tokens = await getGoogleCalendarTokens();

        if (!tokens || !tokens.token_expiry) {
            return null;
        }

        const expiryTime = new Date(tokens.token_expiry);
        const timeUntilExpiryMs = expiryTime.getTime() - Date.now();

        return {
            isExpired: timeUntilExpiryMs < 0,
            isExpiringSoon: timeUntilExpiryMs < TOKEN_REFRESH_CONFIG.proactiveRefreshBufferMs,
            timeUntilExpiryMs: timeUntilExpiryMs > 0 ? timeUntilExpiryMs : null,
            expiryTime,
        };
    } catch (error) {
        log.error('Error checking token expiry status:', { error });
        return null;
    }
}
