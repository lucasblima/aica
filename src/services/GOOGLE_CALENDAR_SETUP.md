# Google Calendar Integration Setup

## Overview
This integration allows users to synchronize their Google Calendar events with the Aica Life OS timeline and agenda management system.

## Features
- **OAuth 2.0 Authentication**: Secure authorization with Google using incremental scopes
- **Calendar Event Sync**: Automatically fetch and display calendar events
- **Refresh Tokens**: Support for offline refresh tokens to enable background synchronization
- **Event Transformation**: Convert Google Calendar events to Timeline-compatible format
- **Auto-Sync**: Periodic synchronization at configurable intervals
- **Error Handling**: Graceful fallback and error recovery

## Setup Instructions

### 1. Configure Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing one)
3. Enable **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173` (development)
     - `http://localhost:5174` (alternative dev)
     - `https://yourdomain.com` (production)
   - Copy the **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# Google OAuth Configuration
VITE_GOOGLE_OAUTH_CLIENT_ID=your_client_id_here
VITE_GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
```

### 3. Update Supabase OAuth Settings

In your Supabase dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Enter the **Client ID** and **Client Secret**
4. Add authorized redirect URIs:
   - `https://gppebtrshbvuzatmebhr.supabase.co/auth/v1/callback`
   - Your app's domain(s)

## Usage

### 1. Add the Connect Component

```tsx
import GoogleCalendarConnect from '../components/GoogleCalendarConnect';

export default function MyAgenda() {
    return (
        <div>
            <GoogleCalendarConnect />
            {/* Rest of your component */}
        </div>
    );
}
```

### 2. Use the Hook for Events

```tsx
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';

export default function EventsList() {
    const {
        events,
        isConnected,
        isLoading,
        error,
        sync,
    } = useGoogleCalendarEvents({
        autoSync: true,
        syncInterval: 300, // 5 minutes
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    });

    if (!isConnected) {
        return <div>Please connect to Google Calendar</div>;
    }

    return (
        <div>
            <button onClick={sync}>Refresh</button>
            {events.map(event => (
                <div key={event.id}>
                    <h3>{event.title}</h3>
                    <p>{event.startTime}</p>
                </div>
            ))}
        </div>
    );
}
```

### 3. Display Events List

```tsx
import GoogleCalendarEventsList from '../components/GoogleCalendarEventsList';

export default function MyView() {
    return (
        <GoogleCalendarEventsList
            todayOnly={true}
            maxEvents={5}
            onEventClick={(eventId) => console.log('Clicked:', eventId)}
        />
    );
}
```

## Services and APIs

### `googleAuthService.ts`

Main authentication and token management service.

**Key Functions:**
- `connectGoogleCalendar()` - Start OAuth flow
- `disconnectGoogleCalendar()` - Revoke tokens
- `isGoogleCalendarConnected()` - Check connection status
- `getValidAccessToken()` - Get/refresh valid token
- `storeGoogleTokens()` - Store tokens locally

**Token Storage:**
- Uses `localStorage` with keys:
  - `google_calendar_access_token`
  - `google_calendar_refresh_token`
  - `google_calendar_token_expiry`
  - `google_calendar_connected`

### `googleCalendarService.ts`

Calendar API operations and event management.

**Key Functions:**
- `fetchCalendarEvents()` - Fetch events with filters
- `fetchTodayEvents()` - Get today's events
- `fetchWeekEvents()` - Get week's events
- `fetchDateRangeEvents()` - Get events in date range
- `fetchAvailableCalendars()` - List user's calendars
- `fetchGoogleUserInfo()` - Get user profile info
- `transformGoogleEvent()` - Convert to Timeline format

### `useGoogleCalendarEvents` Hook

React hook for managing calendar events and auto-sync.

**Options:**
```typescript
{
    autoSync?: boolean;        // Auto-sync on connect (default: true)
    syncInterval?: number;     // Sync interval in seconds (default: 300)
    startDate?: Date;         // Start date for events
    endDate?: Date;           // End date for events
}
```

**Return Value:**
```typescript
{
    events: TimelineEvent[];          // Fetched events
    isConnected: boolean;             // Connection status
    isLoading: boolean;               // Loading state
    error: string | null;             // Error message
    lastSyncTime: Date | null;        // Last sync timestamp
    sync(): Promise<void>;            // Manual sync trigger
    addLocalEvent(event): void;       // Add local event
    fetchEvents(start?, end?): Promise<void>;
}
```

## Scopes

The integration requests the following Google OAuth scopes:

```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/userinfo.email
```

These scopes provide:
- **Read-only access** to calendar events
- **Access to email** for user identification
- **No write permissions** (safe and minimal)

## Event Structure

Events are transformed to the `TimelineEvent` format:

```typescript
interface TimelineEvent {
    id: string;                    // Unique identifier
    title: string;                 // Event title
    description?: string;          // Event description
    startTime: string;            // ISO 8601 datetime
    endTime: string;              // ISO 8601 datetime
    duration: number;             // Duration in minutes
    attendees?: string[];         // Attendee emails
    organizer?: string;           // Organizer email
    isAllDay: boolean;            // All-day event flag
    source: 'google_calendar';    // Source identifier
}
```

## Error Handling

The integration includes robust error handling:

1. **Token Expiration**: Automatically refreshes expired tokens
2. **Connection Loss**: Gracefully handles disconnections
3. **API Errors**: Clear error messages for user feedback
4. **Invalid Tokens**: Re-prompts for authorization

## Security Considerations

1. **Tokens are stored in localStorage**
   - Suitable for single-user apps
   - Consider IndexedDB or sessionStorage for enhanced security

2. **Refresh tokens are rotated** automatically by Google

3. **Scopes are minimal**
   - Read-only access to calendar
   - No write permissions
   - No access to other services

4. **SSL/HTTPS is required** in production

## Troubleshooting

### "Token de acesso não disponível"
- User hasn't authorized Google Calendar yet
- Token may have expired and failed to refresh
- **Solution**: Click "Autorizar Acesso" again

### "Erro ao renovar token"
- `VITE_GOOGLE_OAUTH_CLIENT_ID` or `CLIENT_SECRET` may be missing
- Client secret should only be used server-side
- **Solution**: Implement token refresh on your backend

### Events not syncing
- Check browser console for errors
- Verify Google Calendar API is enabled in Cloud Console
- Ensure scopes are correct
- **Solution**: Clear localStorage and reconnect

### CORS errors
- Requires backend proxy or CORS configuration
- Direct calls to Google API from browser may be blocked
- **Solution**: Implement a backend endpoint for token refresh

## Frontend-Only Limitations

This is a **frontend-only implementation**. For production, consider:

1. **Backend token refresh** - Don't expose client secret in frontend
2. **Token encryption** - Encrypt tokens in localStorage
3. **Session management** - Use secure HTTP-only cookies
4. **Rate limiting** - Implement rate limiting on frontend calls

## Integration with Timeline

The events can be integrated with the existing DailyTimeline component:

```tsx
// In AgendaView.tsx
const googleEvents = useGoogleCalendarEvents();

const mergedTimelineEvents = useMemo(() => {
    return [
        ...timelineTasks.map(transformTaskToEvent),
        ...googleEvents.events
    ].sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
}, [timelineTasks, googleEvents.events]);

return (
    <DailyTimeline
        events={mergedTimelineEvents}
        // ... other props
    />
);
```

## Future Enhancements

- [ ] Event creation from Timeline
- [ ] Multi-calendar support
- [ ] Calendar event filtering
- [ ] Notification integration
- [ ] Offline mode with sync queue
- [ ] Event color coding
- [ ] Recurring event expansion
- [ ] Conflict detection with tasks
