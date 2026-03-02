# AICA Life OS — API Integrations Month 1 Design

**Data:** 2026-03-02
**Sessao:** feat-api-integrations-arsenal
**Base:** Hibrido (Plano 90 Dias + BrasilAPI do Strategic Arsenal)
**Escopo:** 5 APIs no Month 1 — Atlas como principal consumidor

---

## Contexto

O AICA tem forte integracao Gemini (79 Edge Functions) e Google APIs, mas zero APIs externas de dados. Este design cobre a camada de foundation: infraestrutura compartilhada + 5 APIs gratuitas para enriquecer o Atlas.

**APIs do Month 1:**

| # | API | Uso | Cache TTL | Rate Limit |
|---|-----|-----|-----------|------------|
| 1 | Nager.Date | Feriados brasileiros | 30 dias | Ilimitado |
| 2 | Open-Meteo | Previsao climatica | 3h | 10K/dia |
| 3 | ipapi.co | Geolocalizacao/timezone | 24h (1 call/vida) | 1K/dia |
| 4 | Cloudflare Turnstile | CAPTCHA invisivel | Sem cache | Ilimitado |
| 5 | BrasilAPI | CEP, CNPJ, bancos, DDD | 7d/24h/30d | Ilimitado |

---

## Arquitetura: Abordagem A — Shared Infrastructure Layer

```
Frontend: ExternalApiClient.getInstance().call('weather', { lat, lng })
    -> Edge Function: external-weather
        -> _shared/external-api.ts (cache, retry, error mapping)
            -> Open-Meteo API
```

Todas as chamadas passam por Edge Functions (consistente com GeminiClient). Nenhuma API chamada diretamente do frontend.

---

## Secao 1: Shared Infrastructure (`_shared/external-api.ts`)

Modulo reutilizavel para todas as Edge Functions de API externa.

### Responsabilidades

- **Cache com TTL**: In-memory Map no Deno, TTL configuravel por API
- **Retry com exponential backoff**: Max 3 tentativas, backoff 1s/2s/4s
- **Error mapping padronizado**: `{ success, data?, error?, source, cached, latencyMs }`
- **Request logging**: Timestamp, API, latencia, status, cache hit/miss
- **Rate limit tracking**: Contador por API para respeitar free tiers

### Interface

```typescript
interface ExternalApiConfig {
  name: string;              // 'brasilapi' | 'open-meteo' | 'nager-date' | 'ipapi'
  baseUrl: string;
  cacheTtlSeconds: number;
  maxRetries: number;
  rateLimitPerDay?: number;
}

interface ExternalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  cached: boolean;
  latencyMs: number;
}

async function fetchExternalApi<T>(
  config: ExternalApiConfig,
  path: string,
  options?: { cacheKey?: string; skipCache?: boolean }
): Promise<ExternalApiResponse<T>>
```

### TTLs por API

| API | Cache TTL | Rationale |
|-----|-----------|-----------|
| BrasilAPI CEP | 7 dias | CEPs raramente mudam |
| BrasilAPI CNPJ | 24h | Dados cadastrais estaveis |
| BrasilAPI Bancos/DDD | 30 dias | Dados quase estaticos |
| Nager.Date Holidays | 30 dias | Feriados fixos por ano |
| Open-Meteo | 3h | Previsao muda frequentemente |
| ipapi.co | 24h | Timezone do usuario e estavel |

---

## Secao 2: Edge Functions — Month 1

### 1. `external-holidays` (Nager.Date)

- **Endpoint**: `GET https://date.nager.at/api/v3/PublicHolidays/{year}/BR`
- **Trigger**: 1 chamada/ano, resultado cacheado no Supabase (`brazilian_holidays` table)
- **Retorno**: Array de `{ date, name, localName }`
- **Uso**: Badge visual em tarefas agendadas em feriado + warning ao criar/editar work_item
- **Fallback**: Se API falhar, usar tabela do ano anterior (feriados fixos cobrem ~80%)

### 2. `external-weather` (Open-Meteo)

- **Endpoint**: `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=temperature_2m,precipitation,weathercode&timezone=auto`
- **Trigger**: Chamada com lat/lng do perfil, cache 3h no Supabase
- **Retorno**: Previsao horaria 48h -> Gemini gera insight em PT-BR
- **Dependencia**: Precisa de lat/lng do `external-geolocation` ou input manual

### 3. `external-geolocation` (ipapi.co)

- **Endpoint**: `GET https://ipapi.co/json/`
- **Trigger**: 1 unica chamada no primeiro login
- **Retorno**: `{ timezone, city, latitude, longitude, country_code }`
- **Rate limit critico**: 1K/dia — nunca chamar mais de 1x por usuario
- **Persiste**: timezone, city, lat, lng, source em `profiles`

### 4. `external-turnstile-verify` (Cloudflare Turnstile)

- **Frontend**: Widget Turnstile no signup/login gera token
- **Edge Function**: Valida via `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
- **Sem cache**: Cada validacao e unica
- **Secret key**: Armazenada em Supabase Secrets

### 5. `external-brasil` (BrasilAPI)

- **Endpoints**:
  - CEP: `GET https://brasilapi.com.br/api/cep/v2/{cep}` (cache 7d)
  - CNPJ: `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (cache 24h)
  - Bancos: `GET https://brasilapi.com.br/api/banks/v1` (cache 30d)
  - DDD: `GET https://brasilapi.com.br/api/ddd/v1/{ddd}` (cache 30d)
- **Uma Edge Function com `action` parameter** (mesma API base)
- **Uso imediato**: CEP para perfil do usuario, CNPJ/bancos para modulos futuros

---

## Secao 3: Frontend

### ExternalApiClient Singleton

```
src/lib/external-api/
├── client.ts          # Singleton ExternalApiClient
├── types.ts           # Interfaces compartilhadas
├── cache.ts           # React Query integration
└── index.ts           # Barrel export
```

```typescript
ExternalApiClient.getInstance().call('weather', { latitude, longitude })
ExternalApiClient.getInstance().call('holidays', { year: 2026 })
ExternalApiClient.getInstance().call('geolocation', {})
ExternalApiClient.getInstance().call('brasil-cep', { cep: '01310-100' })
ExternalApiClient.getInstance().call('turnstile-verify', { token })
```

Internamente cada `call()` faz `supabase.functions.invoke('external-{api}', { body })`.

### Services

```
src/services/
├── holidayService.ts        # getHolidays(year), isHoliday(date), getNextHoliday()
├── weatherService.ts        # getWeatherForecast(lat, lng), getWeatherInsight()
├── geolocationService.ts    # detectLocation(), getUserLocation()
├── brasilApiService.ts      # lookupCEP(cep), lookupCNPJ(cnpj), listBanks()
└── turnstileService.ts      # verifyToken(token)
```

### React Hooks

```
src/hooks/
├── useHolidays.ts           # React Query, staleTime: 24h
├── useWeatherInsight.ts     # React Query, staleTime: 3h, depende de useUserLocation
├── useUserLocation.ts       # Chama geolocation 1x, persiste no perfil
└── useBrasilApi.ts          # useCEPLookup(cep), useCNPJLookup(cnpj)
```

React Query como cache layer com `staleTime` alinhado ao TTL da Edge Function.

---

## Secao 4: UI — Onde os dados aparecem

### WeatherInsightCard (3 estados)

| Estado | Condicao | UI |
|--------|----------|----|
| **Completo** | Tem lat/lng + dados Open-Meteo | Icone clima + temperatura + insight Gemini |
| **Conectar** | Sem lat/lng (VPN/bloqueio/novo) | "Ative sua localizacao para insights de clima" + botao "Conectar" |
| **Erro** | Tem lat/lng mas Open-Meteo falhou | Card nao aparece (degradacao silenciosa) |

**Botao "Conectar" abre modal com 3 opcoes:**
1. "Detectar automaticamente" → `navigator.geolocation.getCurrentPosition()` (browser API)
2. "Informar meu CEP" → campo CEP com auto-complete via BrasilAPI → geocoding
3. "Selecionar cidade" → dropdown capitais brasileiras (hardcoded, zero API)

### Holiday Badge em Work Items

- Badge inline no `WorkItemCard`: pill `🎌 Feriado: Tiradentes` ao lado da data
- Warning toast ao criar/editar work_item em feriado

### BrasilAPI CEP — Perfil do usuario

- Campo CEP com auto-complete de endereco (cidade, estado, bairro, logradouro)
- Alimenta lat/lng como fallback se ipapi falhar

### Turnstile — Login/Signup

- Widget Cloudflare invisivel (managed mode)
- Se desafio necessario: widget compacto inline

### Fluxo visual

```
┌──────────────────────────────────────────┐
│  Atlas Dashboard                          │
│  ┌──────────────────────────────────────┐ │
│  │ ☀️ 26°C — Melhor janela pra corrida  │ │  ← WeatherInsightCard
│  │ 7-9h, sem chuva prevista             │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │ Task: Preparar apresentacao       │    │
│  │ 📅 21/04  🎌 Feriado: Tiradentes │    │  ← Holiday Badge
│  └───────────────────────────────────┘    │
│                                           │
│  ┌───────────────────────────────────┐    │
│  │ Task: Enviar proposta             │    │
│  │ 📅 22/04                          │    │  ← Sem badge (dia util)
│  └───────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## Secao 5: Database

### Nova tabela: `brazilian_holidays`

```sql
CREATE TABLE brazilian_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  local_name TEXT,
  year INTEGER NOT NULL,
  holiday_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, year)
);
-- Dados publicos, sem RLS (cache compartilhado)
```

### Nova tabela: `weather_cache`

```sql
CREATE TABLE weather_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude DECIMAL(8,5) NOT NULL,
  longitude DECIMAL(8,5) NOT NULL,
  forecast_data JSONB NOT NULL,
  gemini_insight TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(latitude, longitude)
);
-- Cache compartilhado por localizacao, sem RLS
```

### Alteracao em `profiles`

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  detected_timezone TEXT,
  detected_city TEXT,
  detected_latitude DECIMAL(8,5),
  detected_longitude DECIMAL(8,5),
  location_source TEXT;  -- 'ipapi' | 'browser' | 'cep' | 'manual'
```

### Tabelas NAO necessarias

- Turnstile: validacao stateless
- BrasilAPI: cache in-memory na Edge Function, resultados salvos no perfil/entidade
- Geolocation: resultado salvo em `profiles`

---

## Secao 6: Testing + Error Handling + Monitoramento

### Unit Tests (Vitest)

| Camada | O que testar |
|--------|-------------|
| `_shared/external-api.ts` | Cache hit/miss, retry logic, rate limit, error mapping |
| Services | Transformacao de dados, fallbacks |
| Hooks | Loading/error/success states, React Query config |
| Components | Render nos 3 estados (completo/conectar/erro) |

Mocks no nivel do `ExternalApiClient.call()` — nunca chamar API real em teste.

### E2E Tests (Playwright)

- Signup com Turnstile → nao bloqueia fluxo
- Atlas com lat/lng → WeatherInsightCard completo
- Atlas sem lat/lng → estado "Conectar"
- Work_item em feriado → warning toast

### Error Handling — Degradacao Graciosa

| API | Se falhar... | Fallback |
|-----|-------------|----------|
| Nager.Date | Holidays nao carregam | Tabela do ano anterior. Se vazia, badge nao aparece |
| Open-Meteo | Weather falha | Card invisivel. Proximo request tenta de novo |
| ipapi.co | Geolocalizacao falha | WeatherInsightCard mostra "Conectar" com opcoes manuais |
| BrasilAPI | CEP lookup falha | Campo editavel manualmente + toast discreto |
| Turnstile | Validacao falha | Retry 1x. Se persistir, fail-open + log de alerta |

### Monitoramento

- `externalApiTrackingService` (template do `aiUsageTrackingService`)
- Tabela `external_api_usage`: `{ api, endpoint, latency_ms, cache_hit, success, error_code }`
- Alerta se taxa de erro > 20% em janela de 1h (via health-tracker)

---

## Decisoes Arquiteturais

1. **Tudo via Edge Functions** — consistente com GeminiClient, sem CORS issues, API keys seguras
2. **ExternalApiClient singleton** — ponto unico de entrada, facil de mockar
3. **Cache em 2 niveis** — in-memory na Edge Function (rapido) + Supabase table (persistente)
4. **React Query no frontend** — staleTime alinhado com TTL do backend
5. **Degradacao graciosa** — nenhuma API externa e ponto de falha critico
6. **Geolocation com 3 fallbacks** — ipapi → browser API → CEP → manual

---

## Fora de Escopo (Month 2-3)

- ZenQuotes (Jornada, Month 2)
- Google Cloud NL API (Jornada, Month 2, condicional)
- AwesomeAPI cambio (Finance, Month 3)
- BCB SGS indicadores (Finance, Month 3)
- brapi.dev Bovespa (Finance, Month 3, condicional)
- Resend email (Global, Month 3)
