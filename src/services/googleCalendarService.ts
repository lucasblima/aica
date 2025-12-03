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
    options: FetchEventsOptions = {}
): Promise<GoogleCalendarEvent[]> {
    try {
        const token = await getValidAccessToken();
        if (!token) {
            throw new Error('Token de acesso não disponível. Autorize o Google Calendar primeiro.');
        }

        // Montar query parameters
        const params = new URLSearchParams();

        if (options.timeMin) params.append('timeMin', options.timeMin);
        if (options.timeMax) params.append('timeMax', options.timeMax);
        params.append('maxResults', options.maxResults?.toString() || '25');
        params.append('singleEvents', (options.singleEvents !== false).toString());
        if (options.orderBy) params.append('orderBy', options.orderBy);
        if (options.q) params.append('q', options.q);

        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token expirado. Reconecte ao Google Calendar.');
            }
            throw new Error(`Erro ao buscar eventos: ${response.statusText}`);
        }

        const data = await response.json();
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

    return fetchCalendarEvents('primary', {
        timeMin: today.toISOString(),
        timeMax: tomorrow.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
    });
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
    let events: GoogleCalendarEvent[];

    if (startDate && endDate) {
        events = await fetchDateRangeEvents(startDate, endDate);
    } else if (startDate) {
        events = await fetchWeekEvents(startDate);
    } else {
        events = await fetchTodayEvents();
    }

    return events.map(transformGoogleEvent);
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
