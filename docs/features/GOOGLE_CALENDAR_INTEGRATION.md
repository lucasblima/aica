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
   - `https://uzywajqzbdbrfammshdg.supabase.co/auth/v1/callback`
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


---

# Testing Procedures



## ✅ Checklist de Implementação Completa

- [x] Componente `GoogleCalendarConnect.tsx` criado e integrado
- [x] Serviço `googleAuthService.ts` implementado
- [x] Serviço `googleCalendarTokenService.ts` implementado (multi-user)
- [x] Tabela `google_calendar_tokens` criada no Supabase
- [x] RLS policies configuradas para isolamento por usuário
- [x] `handleOAuthCallback()` integrado no `App.tsx`
- [x] Build sem erros

---

## 🧪 Teste 1: OAuth Flow - Um Usuário

### Setup
1. Limpar cache do navegador
2. Fazer logout completamente
3. Abrir app em `localhost:5173`

### Passos
```
1. ✅ Login com sua conta Google (Aica Life OS)
2. ✅ Navegar para Agenda
3. ✅ Ver card "Sincronizar Agenda"
4. ✅ Clicar em "Autorizar Acesso"
5. ✅ Popup Google aparecer
6. ✅ Selecionar conta Google
7. ✅ Aceitar permissões
8. ✅ Redirecionar automaticamente para a app
```

### Validações
- [ ] Console mostra: `[App] Google OAuth callback detected, saving tokens to database...`
- [ ] Console mostra: `[App] Google Calendar tokens saved successfully`
- [ ] Botão muda de "Autorizar Acesso" para "Sincronizado" (verde)
- [ ] No Supabase: Query `SELECT * FROM google_calendar_tokens WHERE user_id = ...` retorna 1 registro
- [ ] Record tem: `access_token`, `email`, `is_connected = true`

### Esperado ✅
```
Browser Console:
[App] Google OAuth callback detected, saving tokens to database...
[App] Google Calendar tokens saved successfully

UI:
✓ Botão verde "Sincronizado"
✓ Card mostra email da conta Google
```

---

## 🧪 Teste 2: Multi-Usuário - Mesmo Navegador

### Setup
1. Ter testado Teste 1 antes

### Passos
```
1. ✅ No navegador aberto, fazer Logout
2. ✅ Login com OUTRA conta Google (conta B)
3. ✅ Navegar para Agenda
4. ✅ Ver card "Sincronizar Agenda" (botão "Autorizar Acesso")
5. ✅ Clicar em "Autorizar Acesso"
6. ✅ Popup Google aparecer
7. ✅ Selecionar OUTRA conta Google (B)
8. ✅ Aceitar permissões
9. ✅ Redirecionar automaticamente
```

### Validações - CRÍTICA! 🔐
- [ ] User A tokens ainda existem no DB (SELECT com user_id A)
- [ ] User B tem NOVOS tokens (diferentes de A)
- [ ] User B tokens têm: `access_token` DIFERENTE de A
- [ ] User B tokens têm: `email` da conta B (ex: b@gmail.com)
- [ ] RLS Policy funciona:
  ```sql
  -- User A consegue ver apenas seus tokens
  SELECT * FROM google_calendar_tokens; -- Retorna APENAS tokens de A

  -- User B consegue ver apenas seus tokens
  SELECT * FROM google_calendar_tokens; -- Retorna APENAS tokens de B
  ```

### Esperado ✅
```
Supabase (Admin):
- google_calendar_tokens tem 2 registros
- Cada um com user_id diferente
- Cada um com access_token diferente
- Cada um com email diferente

RLS Policies:
- Usuário A não consegue ver tokens de B
- Usuário B não consegue ver tokens de A
```

---

## 🧪 Teste 3: Sincronização de Eventos

### Setup
1. Ter um usuário logado e autorizado (com token salvo)
2. Ter eventos no Google Calendar dessa conta

### Passos
```
1. ✅ Em AgendaView, verificar GoogleCalendarEventsList
2. ✅ Deve aparecer lista de eventos de hoje
3. ✅ Cada evento mostra: hora, título, participantes
4. ✅ Clicar em "Sincronizar" (botão refresh)
5. ✅ Vê loading
6. ✅ Eventos atualizam
```

### Validações
- [ ] Console mostra fetch bem-sucedido para Google Calendar API
- [ ] Eventos aparecem em ordem chronológica
- [ ] Nenhum erro de "Token não encontrado"
- [ ] `last_sync` timestamp atualizado no DB

### Esperado ✅
```
Console (Network):
GET https://www.googleapis.com/calendar/v3/calendars/primary/events?...
Status: 200 OK

UI:
- Lista de eventos de hoje
- Cada evento com hora, título, participantes
```

---

## 🧪 Teste 4: Token Refresh Automático

### Setup
1. Ter usuário autorizado
2. Ter token que vai expirar em breve (ou simular)

### Passos (Simulação)
```
1. ✅ Autorizar Google Calendar
2. ✅ Verificar token_expiry no DB
3. ✅ Aguardar até 5min antes da expiração
4. ✅ Tentar sincronizar eventos
5. ✅ Sistema deve renovar token automaticamente
```

### Validações
- [ ] `last_refresh` timestamp é atualizado
- [ ] `access_token` muda (novo token)
- [ ] Sem erro "Token expirado"
- [ ] Sincronização continua funcionando

### Esperado ✅
```
Database (google_calendar_tokens):
- access_token: [NOVO TOKEN]
- last_refresh: [AGORA]
- token_expiry: [NOVA DATA]
```

---

## 🧪 Teste 5: Desconexão

### Setup
1. Ter usuário autorizado

### Passos
```
1. ✅ Estar logado com conta Google
2. ✅ Ver card "Sincronizar Agenda" com botão "Desconectar"
3. ✅ Clicar em botão "Desconectar"
4. ✅ Card volta ao estado "Autorizar Acesso"
```

### Validações
- [ ] `is_connected` no DB muda para `false`
- [ ] Tokens são revogados com Google
- [ ] Próxima tentativa de sincronizar retorna erro
- [ ] Button volta ao estado "Autorizar Acesso"

### Esperado ✅
```
Database (google_calendar_tokens):
- is_connected: false

UI:
- Botão volta para "Autorizar Acesso"
- Sem erros no console
```

---

## 🧪 Teste 6: Múltiplos Navegadores/Dispositivos

### Setup
1. Ter o mesmo usuário em 2 navegadores/devices

### Passos
```
Browser 1 (Desktop):
1. ✅ Login
2. ✅ Autorizar Google Calendar
3. ✅ Vê eventos sincronizados

Browser 2 (Mobile/Incognito):
4. ✅ Login com MESMA conta
5. ✅ Navegar para Agenda
6. ✅ Card deve mostrar "Sincronizado" (não pede autorizar)
7. ✅ Consegue ver eventos (usando mesmo token do DB)
```

### Validações
- [ ] Ambos navegadores veem a mesma conta Google conectada
- [ ] Tokens no DB são os mesmos (não há duplication)
- [ ] Não precisa re-autorizar em Browser 2
- [ ] Ambos sincronizam a MESMA agenda

### Esperado ✅
```
Database:
- 1 único registro em google_calendar_tokens para este user_id
- Nenhuma duplicação de tokens

UI:
- Browser 1: "Sincronizado"
- Browser 2: "Sincronizado" (mesmo status)
```

---

## 🔍 Debugging

### Console Logs Esperados
```javascript
// Ao autorizar
[App] Google OAuth callback detected, saving tokens to database...
[App] Google Calendar tokens saved successfully

// Ao sincronizar eventos
[useGoogleCalendarEvents] Fetching events...
[useGoogleCalendarEvents] Events fetched: 5 eventos

// Ao renovar token
[googleCalendarTokenService] Token refresh needed, refreshing...
[googleCalendarTokenService] Token refreshed successfully
```

### Queries SQL para Debug

```sql
-- Ver tokens do usuário atual
SELECT id, user_id, email, is_connected, last_sync, last_refresh, created_at
FROM google_calendar_tokens
WHERE user_id = auth.uid();

-- Ver todos os tokens (admin)
SELECT user_id, email, is_connected, last_sync, created_at
FROM google_calendar_tokens
ORDER BY created_at DESC;

-- Ver tokens expirados (admin)
SELECT user_id, email, token_expiry
FROM google_calendar_tokens
WHERE token_expiry < now() AND is_connected = true;
```

### Verificação de RLS Policies

```sql
-- Como User A - deve ver APENAS seus tokens
SELECT * FROM google_calendar_tokens;
-- Resultado: 1 linha (ou vazio se não autorizado)

-- Como User B - deve ver APENAS seus tokens (diferentes de A)
SELECT * FROM google_calendar_tokens;
-- Resultado: 1 linha diferente de A (ou vazio se não autorizado)
```

---

## 📋 Checklist Final de Testes

### Funcionalidade
- [ ] Teste 1: OAuth Flow - Um usuário
- [ ] Teste 2: Multi-usuário - Mesmo navegador
- [ ] Teste 3: Sincronização de eventos
- [ ] Teste 4: Token refresh automático
- [ ] Teste 5: Desconexão
- [ ] Teste 6: Múltiplos navegadores

### Segurança
- [ ] RLS policies funcionando
- [ ] User A não vê tokens de B
- [ ] Tokens não são expostos no localStorage
- [ ] Tokens não aparecem no DevTools

### Performance
- [ ] Sem erros no console
- [ ] Build sem warnings
- [ ] Sincronização < 2 segundos
- [ ] Token refresh silencioso

### UX
- [ ] Botão muda corretamente
- [ ] Eventos aparecem em tempo real
- [ ] Mensagens de erro claras
- [ ] Sem necessidade de refresh manual

---

## 🚀 Deploy para Produção

Antes de deployar, garantir:

1. ✅ Variáveis de ambiente configuradas:
   ```env
   VITE_GOOGLE_OAUTH_CLIENT_ID=...
   VITE_GOOGLE_OAUTH_CLIENT_SECRET=...
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

2. ✅ Supabase projeto configurado:
   - Tabela `google_calendar_tokens` criada
   - RLS policies aplicadas
   - Índices criados

3. ✅ Google Cloud Console:
   - OAuth app configurado
   - Redirect URIs incluem domínio de produção
   - Scopes configurados corretamente

4. ✅ Testes em staging:
   - Rodar todos os testes acima
   - Verificar tokens salvando no DB
   - Validar sincronização

5. ✅ Monitoring:
   - Verificar logs do Supabase
   - Monitorar erros de OAuth
   - Alertas para tokens não renovados

---

## 📞 Troubleshooting

### "Token não encontrado"
- [ ] Usuário autorizou? (`is_connected = true`)
- [ ] Token não expirou? (`token_expiry > now()`)
- [ ] RLS policy permitindo acesso?

### "OAuth redirect não funciona"
- [ ] Redirect URI configurado no Google Cloud?
- [ ] Domínio bate com Google Console?
- [ ] CORS habilitado?

### "Eventos não aparecem"
- [ ] Token válido? (`curl -H "Authorization: Bearer $TOKEN" https://www.googleapis.com/calendar/v3/calendars/primary`)
- [ ] Usuário tem eventos hoje?
- [ ] Scopes incluem `calendar.readonly`?

### "RLS Policy bloqueando"
- [ ] Row level security habilitado?
- [ ] Policy condicional está correta?
- [ ] Service role consegue fazer queries admin?

---

## 📝 Notas

- Tokens são criptografados no repouso (Supabase padrão)
- Refresh tokens renovados automaticamente
- Não há necessidade de re-autorizar após logout/login
- Funciona com múltiplos calendários (future enhancement)
- Background sync pode ser implementado com Edge Functions

