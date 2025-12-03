import { supabase } from './supabaseClient';

/**
 * Chaves para localStorage - rastreamento de estado Google Calendar
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
 * Com suporte a refresh tokens para sincronização em background
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
    } catch (error) {
        console.error('Erro ao conectar Google Calendar:', error);
        throw error;
    }
}

/**
 * Desconecta o Google Calendar revogando tokens
 */
export async function disconnectGoogleCalendar(): Promise<void> {
    try {
        // Revogar tokens do localStorage
        localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_CALENDAR_REFRESH_KEY);
        localStorage.removeItem(GOOGLE_CALENDAR_EXPIRY_KEY);
        localStorage.removeItem(GOOGLE_CALENDAR_CONNECTED_KEY);

        // Se houver suporte, revogar tokens no servidor Supabase
        const { data } = await supabase.auth.getSession();
        if (data.session?.provider_token) {
            // Chamar endpoint de revogação do Google
            await revokeGoogleToken(data.session.provider_token);
        }
    } catch (error) {
        console.error('Erro ao desconectar Google Calendar:', error);
        throw error;
    }
}

/**
 * Verifica se o Google Calendar está conectado
 */
export async function isGoogleCalendarConnected(): Promise<boolean> {
    try {
        // Primeiro, checar localStorage para resposta rápida
        const storedConnection = localStorage.getItem(GOOGLE_CALENDAR_CONNECTED_KEY);
        if (storedConnection === 'true') {
            // Verificar se o token ainda é válido
            return await isTokenValid();
        }

        // Verificar se há sessão ativa do Supabase com Google
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.user_metadata?.provider === 'google') {
            localStorage.setItem(GOOGLE_CALENDAR_CONNECTED_KEY, 'true');
            return true;
        }

        return false;
    } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        return false;
    }
}

/**
 * Obtém o token de acesso válido (refresh se necessário)
 */
export async function getValidAccessToken(): Promise<string | null> {
    try {
        let accessToken = localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY);
        const expiryTime = localStorage.getItem(GOOGLE_CALENDAR_EXPIRY_KEY);

        // Se o token expirou, tentar refreshar
        if (expiryTime && Date.now() >= parseInt(expiryTime)) {
            const refreshToken = localStorage.getItem(GOOGLE_CALENDAR_REFRESH_KEY);
            if (refreshToken) {
                accessToken = await refreshAccessToken(refreshToken);
            }
        }

        return accessToken;
    } catch (error) {
        console.error('Erro ao obter token válido:', error);
        return null;
    }
}

/**
 * Armazena tokens após OAuth bem-sucedido
 * (Será chamado após redirect do OAuth)
 */
export function storeGoogleTokens(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
): void {
    localStorage.setItem(GOOGLE_CALENDAR_TOKEN_KEY, accessToken);

    if (refreshToken) {
        localStorage.setItem(GOOGLE_CALENDAR_REFRESH_KEY, refreshToken);
    }

    if (expiresIn) {
        const expiryTime = Date.now() + expiresIn * 1000;
        localStorage.setItem(GOOGLE_CALENDAR_EXPIRY_KEY, expiryTime.toString());
    }

    localStorage.setItem(GOOGLE_CALENDAR_CONNECTED_KEY, 'true');
}

/**
 * Validação interna de token
 */
async function isTokenValid(): Promise<boolean> {
    try {
        const token = localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY);
        if (!token) return false;

        // Fazer chamada GET simples ao Google Calendar API para validar
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        return response.ok;
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
}

/**
 * Refresh do token de acesso usando refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
        // Nota: Isso requer um backend específico ou proxy OAuth
        // Para implementação direta, use a API de refresh do Google
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '',
                client_secret: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET || '',
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }).toString(),
        });

        if (!response.ok) {
            throw new Error('Falha ao renovar token');
        }

        const data = await response.json();
        const newAccessToken = data.access_token;

        // Armazenar novo token
        localStorage.setItem(GOOGLE_CALENDAR_TOKEN_KEY, newAccessToken);

        if (data.expires_in) {
            const expiryTime = Date.now() + data.expires_in * 1000;
            localStorage.setItem(GOOGLE_CALENDAR_EXPIRY_KEY, expiryTime.toString());
        }

        return newAccessToken;
    } catch (error) {
        console.error('Erro ao renovar token:', error);
        return null;
    }
}

/**
 * Revoga token com Google
 */
async function revokeGoogleToken(token: string): Promise<void> {
    try {
        const response = await fetch(`https://oauth2.googleapis.com/revoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                token: token,
            }).toString(),
        });

        if (!response.ok) {
            console.warn('Aviso: Não foi possível revogar token completamente');
        }
    } catch (error) {
        console.error('Erro ao revogar token:', error);
    }
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
