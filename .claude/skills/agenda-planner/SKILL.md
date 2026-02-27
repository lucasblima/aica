---
name: agenda-planner
description: Planejador de Agenda - especialista no modulo Agenda (Google Calendar sync, eventos, agendamento, gestao de tempo, OAuth tokens). Use quando trabalhar com calendar sync, Google Calendar, eventos, reunioes, free/busy, time blocks, ou scheduling.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Agenda Planner - Planejador de Agenda

Especialista no modulo de calendario e gestao de tempo do AICA Life OS. Gerencia sincronizacao bidirecional com Google Calendar, OAuth tokens, mapeamento de entidades para eventos, e consultas de disponibilidade.

---

## Arquitetura do Modulo

> **NOTA**: O Agenda NAO possui `src/modules/agenda/` dedicado. A funcionalidade vive no Google Hub module + servicos compartilhados de calendario.

```
src/modules/google-hub/              # UI principal do Agenda
|-- pages/
|   |-- GoogleHubPage.tsx            # Pagina principal (calendar + email + drive)
|-- components/
|   |-- CalendarSection.tsx          # Status de conexao Google Calendar
|   |-- GmailSection.tsx             # Email (desabilitado — CASA assessment)
|   |-- DriveSection.tsx             # Drive (desabilitado — CASA assessment)
|   |-- GoogleContextPanel.tsx       # Painel cross-Google
|-- hooks/
|   |-- useEmailCategories.ts        # Categorizacao de emails
|   |-- useEmailTaskExtraction.ts    # Extracao de tarefas de emails
|-- services/
|   |-- emailIntelligenceService.ts  # Edge Function email-intelligence
|-- types/
|   |-- index.ts                     # EmailCategory, ExtractedTask

src/services/                        # Servicos de calendario
|-- calendarSyncService.ts           # Orquestrador de sync bidirecional
|-- calendarSyncTransforms.ts        # Transformacoes puras (entity → event)
|-- googleCalendarWriteService.ts    # CRUD Google Calendar API
|-- googleAuthService.ts             # OAuth flow + gerenciamento de scopes
|-- googleCalendarTokenService.ts    # Token storage, refresh, expiry

supabase/functions/                  # Edge Functions
|-- sync-workout-calendar/           # Sync Flux slots → Google Calendar
|-- fetch-athlete-calendar/          # Coach consulta free/busy do atleta
```

---

## Sync Bidirecional: AICA → Google Calendar

### Modulos Suportados

| Modulo | Funcao de Transform | Cor no Calendar | Tipo de Evento |
|--------|---------------------|-----------------|----------------|
| **Flux** | `fluxSlotToGoogleEvent()` | Teal (`colorId: 7`) | Timed (start + duration) |
| **Atlas** | `atlasTaskToGoogleEvent()` | Orange (`colorId: 6`) | Timed ou All-day |
| **Studio** | `studioEpisodeToGoogleEvent()` | Purple (`colorId: 3`) | Timed (default 10:00) |
| **Grants** | `grantDeadlineToGoogleEvent()` | Green (`colorId: 10`) | All-day |

### Fluxo de Sync

```
Entidade AICA (work_item, workout_slot, episode, opportunity)
    |
    v
calendarSyncTransforms.ts → converte para formato Google Calendar
    |
    v
calendarSyncService.syncEntityToGoogle(module, entityId, eventData)
    |
    |-- Verifica calendar_sync_map: evento ja existe?
    |   |-- Sim → updateCalendarEvent()
    |   |-- Nao → createCalendarEvent()
    |
    v
calendar_sync_map (registra mapeamento user + module + entity → google_event_id)
    |
    v
Google Calendar API
```

### Funcoes Principais (calendarSyncService)

```typescript
// Sync individual
syncEntityToGoogle(module: SyncModule, entityId: string, eventData: CalendarEvent)
  // Returns: { googleEventId, scopeUpgradeNeeded }

// Remover sync
unsyncEntityFromGoogle(module: SyncModule, entityId: string)

// Listar mapeamentos
getUserSyncMappings(module?: SyncModule)

// Sync em massa
bulkSyncFluxSlots(microcycleId: string, startDate: string)
bulkSyncAtlasTasks()
```

---

## OAuth e Tokens

### Scopes

```typescript
// Base (sempre solicitados)
const BASE_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',  // Read + write
  'https://www.googleapis.com/auth/userinfo.email',
];

// Futuros (CASA assessment necessario)
// gmail.modify, drive (desabilitados)
```

### Token Lifecycle

```
connectGoogleCalendar()
    → Redirect Google OAuth
    → handleOAuthCallback()
    → saveGoogleCalendarTokens() → google_calendar_tokens table
    |
    v
getValidAccessToken()
    |-- Token valido? → usar
    |-- Expira em <5min? → refreshAccessToken() (exponential backoff: 1s, 2s, 4s)
    |-- Expirado? → refresh
    |-- INVALID_GRANT? → disconnectGoogleCalendar() + notificar usuario
    |
    v
ScopeUpgradeRequired (403 insufficientPermissions)
    → upgradeCalendarScope() → re-consent com write scope
```

### Configuracao de Refresh

```typescript
{
  maxRetries: 3,
  baseDelayMs: 1000,              // Exponential backoff
  proactiveRefreshBufferMs: 5min, // Refresh preventivo
  minRefreshIntervalMs: 30s,      // Anti-hammering
}
```

---

## Tabelas

### google_calendar_tokens

```typescript
interface GoogleCalendarToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token?: string;
  token_expiry?: string;         // ISO 8601
  email?: string;                // Google email
  name?: string;                 // Google display name
  picture_url?: string;
  scopes: string[];              // Granted OAuth scopes
  is_connected: boolean;
  last_sync?: string;
  last_refresh?: string;
  created_at: string;
  updated_at: string;
}
```

### calendar_sync_map

```typescript
interface CalendarSyncMapping {
  id: string;
  user_id: string;
  module: 'flux' | 'atlas' | 'studio' | 'grants';
  entity_id: string;             // ID da entidade AICA
  google_event_id: string;       // ID do evento no Google Calendar
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}
// Constraint: UNIQUE(user_id, module, entity_id)
```

### Tabelas Relacionadas

| Tabela | Relacao com Agenda |
|--------|-------------------|
| `workout_slots` | Coluna `calendar_event_id` + `calendar_synced_at` |
| `work_items` | Sync via `calendar_sync_map` (sem coluna dedicada) |
| `podcast_episodes` | Sync via `calendar_sync_map` |
| `grant_opportunities` | Sync via `calendar_sync_map` |

> **NOTA**: A tabela `calendar_events` listada no CLAUDE.md NAO existe ainda. O AICA usa Google Calendar como source of truth, nao uma tabela propria.

---

## Edge Functions

### sync-workout-calendar

Sync workout slots de um microciclo Flux para Google Calendar do atleta.

```typescript
// Request
{ microcycleId: string, weekNumber?: number, timezone?: string }

// Response
{
  success: boolean,
  synced: number,     // Eventos criados/atualizados
  skipped: number,    // Slots sem start_time
  failed: number,     // Erros de API
  events: Array<{ slotId, eventId, action: 'created' | 'updated' }>
}
```

Seguranca: verifica que o caller e o atleta OU o coach do atleta.

### fetch-athlete-calendar

Coach consulta disponibilidade do atleta (privacy-safe).

```typescript
// Request
{ athleteId: string, startDate: string, endDate: string }

// Response
{
  success: boolean,
  busySlots: Array<{ start: string, end: string }>  // Apenas horarios ocupados
}
```

**Privacidade**: Usa Google Calendar FreeBusy API — retorna APENAS intervalos busy/free, sem titulos ou detalhes de eventos.

---

## Integracoes por Modulo

### Atlas → Calendar
- `bulkSyncAtlasTasks()` sincroniza work_items com `due_date` ou `scheduled_time`
- Eventos timed (se tem hora) ou all-day (se so data)
- Formato: `[Tarefa] {titulo}`

### Flux → Calendar
- `bulkSyncFluxSlots()` sincroniza workout_slots com `start_time`
- Sequencial (nao paralelo) para respeitar rate limit Google (500 req/100s)
- Formato: `[Treino] {modalidade} ({intensidade}) - {duracao}min`

### Studio → Calendar
- Sincroniza podcast_episodes com `scheduled_date`
- Default 10:00 AM, duracao customizavel
- Formato: `[Podcast] {titulo} c/ {convidado}`

### Grants → Calendar
- Sincroniza grant_opportunities com `submission_deadline`
- Sempre all-day event
- Formato: `[Prazo] {titulo} c/ ({organizacao})`

---

## Padroes Criticos

### SEMPRE:
- Usar `getValidAccessToken()` para obter token (nunca acessar tabela diretamente)
- Verificar `ScopeUpgradeRequired` exception em operacoes de escrita
- Respeitar rate limit Google Calendar (500 req/100s) — sync sequencial
- Incluir `extendedProperties.private.aica_module` + `aica_entity_id` em eventos
- Usar timezone do usuario (`Intl.DateTimeFormat`)
- Testar com `calendarSyncTransforms` (funcoes puras, faceis de testar)

### NUNCA:
- Chamar Google Calendar API diretamente sem token refresh logic
- Fazer refresh de token mais frequente que 30s (anti-hammering)
- Expor titulos de eventos do atleta para o coach (usar FreeBusy API)
- Sync em paralelo (respeitar rate limits)
- Assumir que `calendar_events` table existe (nao existe)
- Armazenar tokens OAuth em localStorage (sempre Supabase table + RLS)

---

## Status Atual

**Implementado:**
- Google Calendar OAuth (calendar.events read/write)
- Sync AICA → Google Calendar (Atlas, Flux, Studio, Grants)
- Coach free/busy queries (privacy-safe)
- Token refresh com exponential backoff

**Pendente:**
- Gmail integration (CASA assessment ~$500-4500/ano)
- Google Drive integration (CASA assessment)
- Google → AICA sync (atualmente one-way only)
- Tabela `calendar_events` propria (depende de decisao arquitetural)
