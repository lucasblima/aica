# Gemini API Proxy - Documentação

## Visão Geral

Esta API fornece acesso seguro ao Google Gemini API através de um proxy com autenticação, rate limiting e cache integrado.

**Base URL (Produção)**: `https://seu-projeto.supabase.co/functions/v1`
**Base URL (Local)**: `http://localhost:54321/functions/v1`

---

## Autenticação

Todas as requests devem incluir um token JWT válido do Supabase Auth:

```http
Authorization: Bearer <seu_access_token>
```

### Exemplo de obtenção do token (Frontend):

```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session.access_token
```

---

## Endpoints

### 1. POST `/gemini-chat`

Endpoint principal para chamadas ao Gemini API.

#### Request

```typescript
{
  action: string              // Ação a executar (ver lista abaixo)
  payload: Record<string, any> // Dados específicos da ação
  model?: 'fast' | 'smart'    // Modelo a usar (padrão: 'fast')
  stream?: boolean            // Habilitar streaming (WIP)
}
```

#### Response

```typescript
{
  result: any                 // Resultado da operação
  cached?: boolean            // Se veio do cache
  latencyMs?: number          // Latência em ms
  tokensUsed?: {              // Tokens consumidos (futuro)
    input: number
    output: number
  }
}
```

#### Exemplo

```typescript
const response = await fetch('https://seu-projeto.supabase.co/functions/v1/gemini-chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'suggest_guest',
    payload: {}
  })
})

const data = await response.json()
console.log(data.result) // "Convide Neil deGrasse Tyson..."
```

---

## Ações Disponíveis

### Podcast

#### `suggest_guest`
Sugere um convidado interessante para podcast.

**Payload**: `{}`
**Response**: `string` (nome e justificativa)

**Exemplo**:
```typescript
{
  action: 'suggest_guest',
  payload: {}
}
```

---

#### `suggest_topic`
Sugere tema para episódio com convidado específico.

**Payload**: `{ guestName: string }`
**Response**: `string` (tema sugerido)

**Exemplo**:
```typescript
{
  action: 'suggest_topic',
  payload: { guestName: 'Neil deGrasse Tyson' }
}
```

---

#### `generate_dossier`
Gera dossiê completo sobre convidado.

**Payload**:
```typescript
{
  guestName: string
  theme?: string
}
```

**Response**: `string` (dossiê markdown)

**Cache**: 7 dias

---

### Atlas (Tarefas)

#### `categorize_task`
Categoriza automaticamente uma tarefa.

**Payload**: `{ taskDescription: string }`
**Response**: `string` (categoria)

**Categorias possíveis**: Trabalho, Pessoal, Saúde, Educação, Finanças, Outros

**Exemplo**:
```typescript
{
  action: 'categorize_task',
  payload: { taskDescription: 'Marcar consulta no dentista' }
}
// Response: "Saúde"
```

---

#### `suggest_priority`
Sugere prioridade baseada na Matriz de Eisenhower.

**Payload**:
```typescript
{
  taskDescription: string
  deadline?: string
}
```

**Response**: `number` (1-4)

**Prioridades**:
- `1`: Urgente e Importante
- `2`: Importante mas não urgente
- `3`: Urgente mas não importante
- `4`: Nem urgente nem importante

---

### Chat

#### `chat_aica` | `finance_chat`
Chat contextual com Aica.

**Payload**:
```typescript
{
  message: string
  context?: any
  history?: Array<{ role: string, content: string }>
}
```

**Response**: `string` (resposta do chat)

**Cache**: Não cacheado

---

## Rate Limiting

### Limites

- **Por hora**: 100 requests
- **Por dia**: 1000 requests

### Response quando limite excedido

**Status**: `429 Too Many Requests`

```json
{
  "error": "Hourly rate limit exceeded",
  "reset_at": "2025-12-06T15:30:00Z"
}
```

### Headers de rate limit (futuro)

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1701878400
```

---

## Cache

### TTL por ação

| Ação | TTL |
|------|-----|
| `suggest_guest` | 24 horas |
| `suggest_topic` | 24 horas |
| `generate_dossier` | 7 dias |
| `categorize_task` | 24 horas |
| `suggest_priority` | 1 hora |
| `chat_*` | Não cacheado |

### Como funciona

1. Request é hasheada (MD5) baseada em `action + payload`
2. Cache é consultado antes de chamar Gemini
3. Se encontrado e não expirado, retorna imediatamente
4. Caso contrário, chama Gemini e cacheia resultado

### Invalidar cache

Não há endpoint para invalidar cache manualmente. O cache expira automaticamente baseado no TTL.

---

## WebSocket (Gemini Live)

### Endpoint: `/gemini-live`

**Protocolo**: WebSocket
**Autenticação**: Query param `?token=<jwt_token>`

### Conectar

```typescript
const { data: { session } } = await supabase.auth.getSession()
const ws = new WebSocket(
  `wss://seu-projeto.supabase.co/functions/v1/gemini-live?token=${session.access_token}`
)

ws.onopen = () => {
  console.log('Conectado ao Gemini Live')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Resposta:', data)
}

// Enviar áudio
ws.send(JSON.stringify({
  realtimeInput: {
    mediaChunks: [{ data: audioBase64 }]
  }
}))
```

### Limites

- **Sessões simultâneas**: 10 por usuário

---

## Códigos de Erro

| Código | Significado | Solução |
|--------|-------------|---------|
| `401` | Não autenticado | Incluir header `Authorization` válido |
| `429` | Rate limit excedido | Aguardar reset (ver `reset_at`) |
| `500` | Erro do servidor | Tentar novamente com backoff |
| `503` | Gemini API indisponível | Aguardar e tentar novamente |

---

## Modelos Disponíveis

### `fast` (padrão)
- **Modelo**: `gemini-2.0-flash`
- **Uso**: Tarefas rápidas e simples
- **Latência**: Baixa (~1-3s)
- **Custo**: Menor

### `smart`
- **Modelo**: `gemini-2.5-flash`
- **Uso**: Tarefas complexas e análises profundas
- **Latência**: Média (~3-10s)
- **Custo**: Médio

---

## Exemplos de Uso

### TypeScript / React

```typescript
import { supabase } from '@/config/supabaseClient'

async function callGemini(action: string, payload: any) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, payload })
    }
  )

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`)
  }

  return response.json()
}

// Uso
const result = await callGemini('categorize_task', {
  taskDescription: 'Comprar leite'
})
console.log(result.result) // "Pessoal"
```

### Usando biblioteca `lib/gemini`

```typescript
import { GeminiClient } from '@/lib/gemini'

const gemini = GeminiClient.getInstance()

const result = await gemini.call({
  action: 'suggest_guest',
  payload: {}
})

console.log(result.result)
```

---

## Monitoramento

### Consultar suas métricas

```sql
SELECT
  action,
  COUNT(*) as total_calls,
  AVG(latency_ms) as avg_latency,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hits
FROM llm_metrics
WHERE user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY total_calls DESC;
```

### Ver seus rate limits

```sql
SELECT
  hourly_count,
  daily_count,
  total_requests
FROM rate_limits
WHERE user_id = auth.uid();
```

---

## Changelog

### v1.0 (2025-12-06)
- ✅ Endpoint `/gemini-chat` com 8 ações
- ✅ WebSocket `/gemini-live`
- ✅ Rate limiting (100/hora, 1000/dia)
- ✅ Cache inteligente com TTL
- ✅ Autenticação via Supabase Auth
- ✅ Retry automático em falhas

### Roadmap
- [ ] Streaming de respostas longas
- [ ] Métricas de tokens consumidos
- [ ] Webhooks para notificações
- [ ] Admin dashboard de uso
