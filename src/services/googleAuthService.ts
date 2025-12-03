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

/**
 * DEPRECATED: Estas chaves foram substituídas por armazenamento no banco de dados
 * Mantidas por compatibilidade com código legado
 */
const GOOGLE_CALENDAR_TOKEN_KEY = 'google_calendar_access_token';
const GOOGLE_CALENDAR_REFRESH_KEY = 'google_calendar_refresh_token';
const GOOGLE_CALENDAR_EXPIRY_KEY = 'google_calendar_token_expiry';
const GOOGLE_CALENDAR_CONNECTED_KEY = 'google_calendar_connected';

/**
 * Escopo do Google Calendar para leitura
 */
const GOOGLE_CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Inicia o fluxo OAuth com Google para autorizar acesso ao Google Calendar
 * Após autorização, os tokens são salvos no banco de dados por usuário
 */
export async function connectGoogleCalendar(): Promise<void> {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                scopes: GOOGLE_CALENDAR_SCOPES.join(' '),
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
        console.error('Erro ao conectar Google Calendar:', error);
        throw error;
    }
}

/**
 * Processa o callback do OAuth e salva os tokens no banco de dados
 * Deve ser chamado após o redirecionamento do OAuth
 */
export async function handleOAuthCallback(): Promise<void> {
    try {
        // Obter a sessão atual (que agora contém o provider_token)
        const { data } = await supabase.auth.getSession();

        if (!data.session?.provider_token) {
            throw new Error('Token do Google não encontrado na sessão');
        }

        // Obter informações do usuário Google (opcional, para melhor UX)
        let userInfo: any = {};
        try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${data.session.provider_token}`,
                }
            });

            if (userInfoResponse.ok) {
                userInfo = await userInfoResponse.json();
            }
        } catch (err) {
            console.warn('Não foi possível obter informações do usuário Google:', err);
        }

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
    } catch (error) {
        console.error('Erro ao processar callback OAuth:', error);
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
        console.error('Erro ao desconectar Google Calendar:', error);
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
        console.error('Erro ao verificar conexão:', error);
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
        console.error('Erro ao obter token válido:', error);
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
