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
 * Google OAuth Scopes — Minimum privilege required
 *
 * Only the scopes actually used by the application are requested:
 * - calendar.readonly: Read-only access to calendar events (Agenda sync)
 * - userinfo.email: Get user email for identification
 *
 * AICA does NOT modify the user's calendar (read-only).
 * Google Contacts scopes were removed — contact sync uses WhatsApp/manual input.
 */
const ALL_GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly', // Read calendar events
    'https://www.googleapis.com/auth/userinfo.email',    // Get user email
];

/**
 * Inicia o fluxo OAuth com Google para autorizar acesso ao Google Calendar
 * Após autorização, os tokens são salvos no banco de dados por usuário
 */
export async function connectGoogleCalendar(): Promise<void> {
    try {
        // Debug logs para diagnosticar server_error
        const redirectUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
        log.debug('[OAuth Debug] Iniciando OAuth...');
        log.debug('[OAuth Debug] Redirect URL:', redirectUrl);
        log.debug('[OAuth Debug] Window origin:', window.location.origin);
        log.debug('[OAuth Debug] VITE_FRONTEND_URL:', import.meta.env.VITE_FRONTEND_URL);
        log.debug('[connectGoogleCalendar] 🔐 Solicitando escopos OAuth:', ALL_GOOGLE_SCOPES);
        log.debug('[connectGoogleCalendar] 🔑 Escopos concatenados:', ALL_GOOGLE_SCOPES.join(' '));

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                scopes: ALL_GOOGLE_SCOPES.join(' '),
                queryParams: {
                    access_type: 'offline', // Garante refresh token
                    prompt: 'consent', // Força popup de consentimento
                }
            }
        });

        if (error) {
            throw new Error(`Erro OAuth: ${error.message}`);
        }

        // Após o OAuth ser concluído com sucesso, a sessão será atualizada
        // Use handleOAuthCallback() para processar os tokens
    } catch (error) {
        log.error('Erro ao conectar Google Calendar:', error);
        throw error;
    }
}

/**
 * Processa o callback do OAuth e salva os tokens no banco de dados
 * Deve ser chamado após o redirecionamento do OAuth
 */
export async function handleOAuthCallback(): Promise<void> {
    try {
        log.debug('[handleOAuthCallback] 🔄 Iniciando processamento do callback OAuth...');

        // Obter a sessão atual (que agora contém o provider_token)
        const { data } = await supabase.auth.getSession();

        log.debug('[handleOAuthCallback] 📋 Session data:', {
            hasSession: !!data.session,
            hasProviderToken: !!data.session?.provider_token,
            hasProviderRefreshToken: !!data.session?.provider_refresh_token,
            userId: data.session?.user?.id,
        });

        if (!data.session?.provider_token) {
            throw new Error('Token do Google não encontrado na sessão');
        }

        log.debug('[handleOAuthCallback] ✅ Provider token encontrado!');

        // Obter informações do usuário Google (opcional, para melhor UX)
        let userInfo: any = {};
        try {
            log.debug('[handleOAuthCallback] 🔍 Buscando informações do usuário Google...');
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${data.session.provider_token}`,
                }
            });

            if (userInfoResponse.ok) {
                userInfo = await userInfoResponse.json();
                log.debug('[handleOAuthCallback] ✅ Informações do usuário obtidas:', {
                    email: userInfo.email,
                    name: userInfo.name,
                });
            }
        } catch (err) {
            log.warn('[handleOAuthCallback] ⚠️ Não foi possível obter informações do usuário Google:', err);
        }

        log.debug('[handleOAuthCallback] 💾 Salvando tokens no banco de dados...');

        // Salvar tokens no banco de dados associados ao usuário
        await saveGoogleCalendarTokens(
            data.session.provider_token,
            data.session.provider_refresh_token,
            undefined, // O Supabase não fornece expires_in no callback
            {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
            }
        );

        log.debug('[handleOAuthCallback] ✅ Tokens salvos com sucesso!');
    } catch (error) {
        log.error('[handleOAuthCallback] ❌ Erro ao processar callback OAuth:', error);
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
}
