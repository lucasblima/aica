import { supabase } from './supabaseClient';

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
    }
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
            result = await supabase
                .from('google_calendar_tokens')
                .update({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expiry: tokenExpiry,
                    email: userInfo?.email,
                    name: userInfo?.name,
                    picture_url: userInfo?.picture,
                    is_connected: true,
                    last_sync: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .select()
                .single();
        } else {
            // Criar novo registro
            result = await supabase
                .from('google_calendar_tokens')
                .insert({
                    user_id: userId,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_expiry: tokenExpiry,
                    email: userInfo?.email,
                    name: userInfo?.name,
                    picture_url: userInfo?.picture,
                    is_connected: true,
                })
                .select()
                .single();
        }

        if (result.error) {
            throw new Error(`Erro ao salvar tokens: ${result.error.message}`);
        }

        return result.data as GoogleCalendarToken;
    } catch (error) {
        console.error('Erro ao salvar tokens Google Calendar:', error);
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
            console.warn('Usuário não autenticado');
            return null;
        }

        const { data, error } = await supabase
            .from('google_calendar_tokens')
            .select('*')
            .eq('user_id', session.session.user.id)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar tokens:', error);
            return null;
        }

        return data as GoogleCalendarToken | null;
    } catch (error) {
        console.error('Erro ao obter tokens Google Calendar:', error);
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
        console.error('Erro ao verificar conexão Google Calendar:', error);
        return false;
    }
}

/**
 * Obtém um token de acesso válido, renovando se necessário
 */
export async function getValidAccessToken(): Promise<string | null> {
    try {
        const tokens = await getGoogleCalendarTokens();

        if (!tokens) {
            throw new Error('Token não encontrado. Autorize o Google Calendar primeiro.');
        }

        // Verificar se o token expirou
        if (tokens.token_expiry) {
            const expiryTime = new Date(tokens.token_expiry).getTime();
            const timeUntilExpiry = expiryTime - Date.now();

            // Se vai expirar em menos de 5 minutos, renovar agora
            if (timeUntilExpiry < 5 * 60 * 1000 && tokens.refresh_token) {
                const newToken = await refreshAccessToken(tokens.refresh_token);
                if (newToken) {
                    return newToken;
                }
            }
        }

        return tokens.access_token;
    } catch (error) {
        console.error('Erro ao obter token válido:', error);
        return null;
    }
}

/**
 * Renova o token de acesso usando o refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
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
            throw new Error('Falha ao renovar token de acesso');
        }

        const data = await response.json();
        const newAccessToken = data.access_token;
        const expiresIn = data.expires_in;

        // Atualizar token no banco de dados
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user?.id) {
            const newExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();

            await supabase
                .from('google_calendar_tokens')
                .update({
                    access_token: newAccessToken,
                    token_expiry: newExpiry,
                    last_refresh: new Date().toISOString(),
                })
                .eq('user_id', session.session.user.id);
        }

        return newAccessToken;
    } catch (error) {
        console.error('Erro ao renovar token de acesso:', error);
        return null;
    }
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
                console.warn('Aviso: Não foi possível revogar token com Google:', err);
            }
        }

        // Marcar como desconectado no banco de dados
        await supabase
            .from('google_calendar_tokens')
            .update({ is_connected: false })
            .eq('user_id', session.session.user.id);
    } catch (error) {
        console.error('Erro ao desconectar Google Calendar:', error);
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
        console.error('Erro ao atualizar último sync:', error);
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
        console.error('Erro ao obter informações do usuário Google:', error);
        return null;
    }
}
