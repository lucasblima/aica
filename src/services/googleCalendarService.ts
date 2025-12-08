import { getValidAccessToken, GoogleCalendarEvent } from './googleAuthService';

/**
 * Opções para buscar eventos
 */
export interface FetchEventsOptions {
    /** Data mínima (ISO 8601 format) */
    timeMin?: string;
    /** Data máxima (ISO 8601 format) */
    timeMax?: string;
    /** Número máximo de eventos a retornar */
    maxResults?: number;
    /** Se deve incluir eventos repetidos */
    singleEvents?: boolean;
    /** Ordem dos eventos: 'startTime' ou 'updated' */
    orderBy?: 'startTime' | 'updated';
    /** Filtro por texto */
    q?: string;
}

/**
 * Busca eventos do Google Calendar
 */
export async function fetchCalendarEvents(
    calendarId: string = 'primary',
    options: FetchEventsOptions = {},
    retryCount: number = 0
): Promise<GoogleCalendarEvent[]> {
    try {
        console.log('[fetchCalendarEvents] 🔍 Iniciando busca de eventos:', { calendarId, options, retryCount });

        const token = await getValidAccessToken();
        if (!token) {
            console.error('[fetchCalendarEvents] ❌ Token não disponível');
            throw new Error('Token de acesso não disponível. Autorize o Google Calendar primeiro.');
        }

        console.log('[fetchCalendarEvents] ✅ Token obtido com sucesso');

        // Montar query parameters
        const params = new URLSearchParams();

        if (options.timeMin) params.append('timeMin', options.timeMin);
        if (options.timeMax) params.append('timeMax', options.timeMax);
        params.append('maxResults', options.maxResults?.toString() || '25');
        params.append('singleEvents', (options.singleEvents !== false).toString());
        if (options.orderBy) params.append('orderBy', options.orderBy);
        if (options.q) params.append('q', options.q);

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

        console.log('[fetchCalendarEvents] 🌐 Fazendo requisição para:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log('[fetchCalendarEvents] 📡 Resposta recebida:', {
            status: response.status,
            ok: response.ok
        });

        if (!response.ok) {
            if (response.status === 401 && retryCount === 0) {
                console.warn('[fetchCalendarEvents] ⚠️ Token expirado (401) - tentando renovar e fazer retry...');

                // Forçar renovação do token e tentar novamente
                try {
                    // Importar função de refresh
                    const { getGoogleCalendarTokens, refreshAccessToken } = await import('./googleCalendarTokenService');
                    const tokens = await getGoogleCalendarTokens();

                    if (tokens?.refresh_token) {
                        console.log('[fetchCalendarEvents] 🔄 Renovando token...');
                        const newToken = await refreshAccessToken(tokens.refresh_token);

                        if (newToken) {
                            console.log('[fetchCalendarEvents] ✅ Token renovado - retrying...');
                            // Retry uma vez com o novo token
                            return await fetchCalendarEvents(calendarId, options, retryCount + 1);
                        }
                    }
                } catch (refreshError) {
                    console.error('[fetchCalendarEvents] ❌ Erro ao renovar token:', refreshError);
                }

                // Se chegou aqui, a renovação falhou
                console.error('[fetchCalendarEvents] ❌ Falha ao renovar token');
                throw new Error('Token expirado. Reconecte ao Google Calendar.');
            }
            console.error('[fetchCalendarEvents] ❌ Erro na resposta:', response.statusText);
            throw new Error(`Erro ao buscar eventos: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[fetchCalendarEvents] ✅ Dados processados:', {
            itemsCount: data.items?.length || 0
        });

        return data.items || [];
    } catch (error) {
        console.error('Erro ao buscar eventos do Google Calendar:', error);
        throw error;
    }
}

/**
 * Busca eventos de hoje
 */
export async function fetchTodayEvents(): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('[fetchTodayEvents] 📅 Buscando eventos de hoje:', {
        timeMin: today.toISOString(),
        timeMax: tomorrow.toISOString()
    });

    const events = await fetchCalendarEvents('primary', {
        timeMin: today.toISOString(),
        timeMax: tomorrow.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
    });

    console.log('[fetchTodayEvents] ✅ Eventos recebidos:', {
        count: events.length,
        events: events.map(e => ({
            summary: e.summary,
            start: e.start,
            end: e.end
        }))
    });

    return events;
}

/**
 * Busca eventos de uma semana específica
 */
export async function fetchWeekEvents(
    startDate: Date = new Date()
): Promise<GoogleCalendarEvent[]> {
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Começa no domingo

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return fetchCalendarEvents('primary', {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
    });
}

/**
 * Busca eventos de um período específico
 */
export async function fetchDateRangeEvents(
    startDate: Date,
    endDate: Date
): Promise<GoogleCalendarEvent[]> {
    return fetchCalendarEvents('primary', {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
    });
}

/**
 * Transforma evento do Google Calendar para formato da Timeline Líquida
 */
export interface TimelineEvent {
    id: string;
    title: string;
    description?: string;
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    duration: number; // em minutos
    attendees?: string[]; // emails dos participantes
    organizer?: string;
    isAllDay: boolean;
    source: 'google_calendar';
}

export function transformGoogleEvent(event: GoogleCalendarEvent): TimelineEvent {
    const startTime = event.start.dateTime || event.start.date || '';
    const endTime = event.end.dateTime || event.end.date || '';

    const isAllDay = !event.start.dateTime && !event.end.dateTime;

    let duration = 0;
    if (!isAllDay && event.start.dateTime && event.end.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        duration = Math.round((end.getTime() - start.getTime()) / 60000); // minutos
    }

    const attendeeEmails = event.attendees?.map(a => a.email) || [];

    return {
        id: `google-${event.id}`,
        title: event.summary,
        description: event.description,
        startTime,
        endTime,
        duration,
        attendees: attendeeEmails,
        organizer: event.organizer?.email,
        isAllDay,
        source: 'google_calendar',
    };
}

/**
 * Busca e transforma eventos do Google Calendar
 */
export async function fetchAndTransformEvents(
    startDate?: Date,
    endDate?: Date
): Promise<TimelineEvent[]> {
    console.log('[fetchAndTransformEvents] 🔄 Iniciando busca e transformação:', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
    });

    let events: GoogleCalendarEvent[];

    if (startDate && endDate) {
        console.log('[fetchAndTransformEvents] 📆 Modo: Data range');
        events = await fetchDateRangeEvents(startDate, endDate);
    } else if (startDate) {
        console.log('[fetchAndTransformEvents] 📆 Modo: Week events');
        events = await fetchWeekEvents(startDate);
    } else {
        console.log('[fetchAndTransformEvents] 📆 Modo: Today events');
        events = await fetchTodayEvents();
    }

    const transformedEvents = events.map(transformGoogleEvent);

    console.log('[fetchAndTransformEvents] ✅ Transformação concluída:', {
        originalCount: events.length,
        transformedCount: transformedEvents.length,
        transformedEvents
    });

    return transformedEvents;
}

/**
 * Busca calendários disponíveis do usuário
 */
export async function fetchAvailableCalendars(): Promise<Array<{
    id: string;
    summary: string;
    primary?: boolean;
    timeZone?: string;
}>> {
    try {
        const token = await getValidAccessToken();
        if (!token) {
            throw new Error('Token de acesso não disponível.');
        }

        const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar calendários: ${response.statusText}`);
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Erro ao buscar calendários:', error);
        throw error;
    }
}

/**
 * Busca informações do usuário do Google
 */
export async function fetchGoogleUserInfo(): Promise<{
    email: string;
    name?: string;
    picture?: string;
}> {
    try {
        const token = await getValidAccessToken();
        if (!token) {
            throw new Error('Token de acesso não disponível.');
        }

        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar info do usuário: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        throw error;
    }
}
