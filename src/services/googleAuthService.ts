import { createNamespacedLogger } from '@/lib/logger';
import { supabase } from './supabaseClient';
import {
    saveGoogleCalendarTokens,
    getGoogleCalendarTokens,
    getValidAccessToken as getValidAccessTokenFromDB,
    isGoogleCalendarConnected as isConnectedInDB,
    disconnectGoogleCalendar as disconnectFromDB,
    updateLastSyncTime,
    getGoogleUserInfo,
} from './googleCalendarTokenService';

const log = createNamespacedLogger('GoogleAuthService');

/**
 * DEPRECATED: Estas chaves foram substituídas por armazenamento no banco de dados
 * Mantidas por compatibilidade com código legado
 */
const GOOGLE_CALENDAR_TOKEN_KEY = 'google_calendar_access_token';
const GOOGLE_CALENDAR_REFRESH_KEY = 'google_calendar_refresh_token';
const GOOGLE_CALENDAR_EXPIRY_KEY = 'google_calendar_token_expiry';
const GOOGLE_CALENDAR_CONNECTED_KEY = 'google_calendar_connected';

/**
 * Google OAuth Scopes
 *
 * - calendar.events: Read/write access to calendar events (bidirectional sync)
 * - userinfo.email: Get user email for identification
 *
 * Note: Upgraded from calendar.readonly to calendar.events for bidirectional sync.
 * Existing users with readonly scope will be prompted to re-consent once.
 */
const ALL_GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events', // Read + write calendar events
    'https://www.googleapis.com/auth/userinfo.email',  // Get user email
];

/**
 * Inicia o fluxo OAuth com Google para autorizar acesso ao Google Calendar.
 * Após autorização, os tokens são salvos no banco de dados por usuário.
 *
 * Se já existir um token, revoga-o primeiro para forçar o Google a
 * re-exibir TODOS os escopos na tela de consentimento (evita o loop
 * onde Google lembra que o usuário negou Calendar).
 */
export async function connectGoogleCalendar(): Promise<void> {
    try {
        log.debug('[connectGoogleCalendar] Iniciando OAuth...');

        // Revogar token existente para resetar decisões de escopo cacheadas pelo Google
        try {
            const existingTokens = await getGoogleCalendarTokens();
            if (existingTokens?.access_token) {
                log.debug('[connectGoogleCalendar] Revogando token existente para resetar escopos...');
                await fetch('https://oauth2.googleapis.com/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ token: existingTokens.access_token }).toString(),
                });
            }
        } catch (revokeErr) {
            log.warn('[connectGoogleCalendar] Revogação do token falhou (prosseguindo):', revokeErr);
        }

        // Redirecionar de volta à página atual (não ao root) para UX contínua
        const calendarRedirectUrl = window.location.origin + window.location.pathname;
        log.debug('[connectGoogleCalendar] Redirect URL:', calendarRedirectUrl);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: calendarRedirectUrl,
                scopes: ALL_GOOGLE_SCOPES.join(' '),
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });

        if (error) {
            throw new Error(`Erro OAuth: ${error.message}`);
        }
    } catch (error) {
        log.error('Erro ao conectar Google Calendar:', error);
        throw error;
    }
}

/**
 * Processa o callback do OAuth e salva os tokens no banco de dados
 * Deve ser chamado após o redirecionamento do OAuth
 *
 * Verifica os escopos REALMENTE concedidos via tokeninfo endpoint
 * para detectar quando o usuário não concedeu acesso ao Calendar.
 */
export async function handleOAuthCallback(): Promise<{ calendarScopeGranted: boolean }> {
    try {
        log.debug('[handleOAuthCallback] Iniciando processamento do callback OAuth...');

        // Obter a sessão atual (que agora contém o provider_token)
        const { data } = await supabase.auth.getSession();

        log.debug('[handleOAuthCallback] Session data:', {
            hasSession: !!data.session,
            hasProviderToken: !!data.session?.provider_token,
            hasProviderRefreshToken: !!data.session?.provider_refresh_token,
            userId: data.session?.user?.id,
        });

        if (!data.session?.provider_token) {
            throw new Error('Token do Google não encontrado na sessão');
        }

        log.debug('[handleOAuthCallback] Provider token encontrado!');

        // Obter informações do usuário Google (opcional, para melhor UX)
        let userInfo: any = {};
        try {
            log.debug('[handleOAuthCallback] Buscando informações do usuário Google...');
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${data.session.provider_token}`,
                }
            });

            if (userInfoResponse.ok) {
                userInfo = await userInfoResponse.json();
                log.debug('[handleOAuthCallback] Informações do usuário obtidas:', {
                    email: userInfo.email,
                    name: userInfo.name,
                });
            }
        } catch (err) {
            log.warn('[handleOAuthCallback] Não foi possível obter informações do usuário Google:', err);
        }

        // Verificar escopos REALMENTE concedidos via tokeninfo
        let actualScopes = ALL_GOOGLE_SCOPES; // fallback
        let calendarScopeGranted = true;
        try {
            const tokenInfoResponse = await fetch(
                `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${data.session.provider_token}`
            );
            if (tokenInfoResponse.ok) {
                const tokenInfo = await tokenInfoResponse.json();
                if (tokenInfo.scope) {
                    actualScopes = (tokenInfo.scope as string).split(' ');
                    calendarScopeGranted = actualScopes.some(
                        (s: string) => s.includes('calendar.events') || s.includes('calendar')
                    );
                    log.debug('[handleOAuthCallback] Escopos reais concedidos:', {
                        actualScopes,
                        calendarScopeGranted,
                    });
                }
            }
        } catch (err) {
            log.warn('[handleOAuthCallback] Não foi possível verificar escopos reais:', err);
        }

        log.debug('[handleOAuthCallback] Salvando tokens no banco de dados...');

        // Salvar tokens com os escopos REALMENTE concedidos
        await saveGoogleCalendarTokens(
            data.session.provider_token,
            data.session.provider_refresh_token,
            undefined, // O Supabase não fornece expires_in no callback
            {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
            },
            actualScopes // Salva escopos reais, não os solicitados
        );

        log.debug('[handleOAuthCallback] Tokens salvos com sucesso!', { calendarScopeGranted });
        return { calendarScopeGranted };
    } catch (error) {
        log.error('[handleOAuthCallback] Erro ao processar callback OAuth:', error);
        throw error;
    }
}

/**
 * Desconecta o Google Calendar revogando tokens e removendo do banco de dados
 */
export async function disconnectGoogleCalendar(): Promise<void> {
    try {
        // Usar a nova função de desconexão do banco de dados
        await disconnectFromDB();
    } catch (error) {
        log.error('Erro ao desconectar Google Calendar:', error);
        throw error;
    }
}

/**
 * Verifica se o Google Calendar está conectado para o usuário autenticado
 */
export async function isGoogleCalendarConnected(): Promise<boolean> {
    try {
        // Verificar se há tokens no banco de dados para o usuário
        return await isConnectedInDB();
    } catch (error) {
        log.error('Erro ao verificar conexão:', error);
        return false;
    }
}

/**
 * Obtém o token de acesso válido, renovando se necessário
 * Usa tokens armazenados no banco de dados por usuário
 */
export async function getValidAccessToken(): Promise<string | null> {
    try {
        // Usar a função do banco de dados que gerencia renovação automática
        return await getValidAccessTokenFromDB();
    } catch (error) {
        log.error('Erro ao obter token válido:', error);
        return null;
    }
}

/**
 * DEPRECATED: Função legada - use handleOAuthCallback() em vez disso
 * Armazena tokens após OAuth bem-sucedido no banco de dados
 */
export async function storeGoogleTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
): Promise<void> {
    // Usar a nova função que armazena no banco de dados
    await saveGoogleCalendarTokens(accessToken, refreshToken, expiresIn);
}

/**
 * Tipo de estrutura de eventos do Google Calendar
 */
export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus: string;
    }>;
    organizer?: {
        email: string;
        displayName?: string;
    };
    transparency?: string; // 'opaque' ou 'transparent'
    status: 'confirmed' | 'tentative' | 'cancelled';
    extendedProperties?: {
        private?: Record<string, string>;
        shared?: Record<string, string>;
    };
}

/**
 * Triggers re-consent flow with current (write) scopes.
 * Used when a user previously consented to readonly but now needs write access.
 */
export async function upgradeCalendarScope(): Promise<void> {
    return connectGoogleCalendar();
}
