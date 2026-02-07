# Journey Module - Edge Functions & AI Integration Map

> Mapeamento completo de todas as integrações do módulo Minha Jornada com
> Supabase Edge Functions, Gemini AI e banco de dados.
>
> **Issue:** #198 | **Atualizado:** Fevereiro 2026

---

## Visao Geral

O modulo Journey tem **7 integrações AI** (6 via `gemini-chat` + 1 Edge Function dedicada) e **2 integrações File Search** (V1 legacy + V2 managed RAG).

```
Journey Module
├── AI Analysis (3 features)
│   ├── Real-time content analysis (debounced 3s)
│   ├── Post-capture insight
│   └── Moment clustering by theme
├── Daily Questions (3-level cascade)
│   ├── Level 1: AI-driven (Gemini)
│   ├── Level 2: Journey-specific
│   └── Level 3: Pool fallback
├── Weekly Summary (AI-powered)
├── Sentiment Analysis (async, per moment)
├── Question Generation (Edge Function dedicada)
└── File Search (RAG)
    ├── V1: Corpus-based (legacy)
    └── V2: Google Managed RAG
```

---

## 1. Integrações AI (GeminiClient -> gemini-chat)

Todas passam por `GeminiClient.getInstance().call()` que roteia para a Edge Function `gemini-chat`.

### A. Analise de Sentimento do Momento

| Campo | Valor |
|-------|-------|
| **Service** | `momentService.ts:339-380` |
| **Action** | `analyze_moment_sentiment` |
| **Model** | `fast` (gemini-2.0-flash) |
| **Trigger** | Async apos `createMoment()` (fire-and-forget) |
| **Returns** | `SentimentAnalysis` (sentiment, sentimentScore, emotions, triggers, energyLevel) |
| **Tracking** | Sim (`trackAIUsage`) |
| **Gamification** | `award_consciousness_points` (5 CP) + `update_moment_streak` |

**Prompt:** Definido no handler da Edge Function (server-side).

**Data Flow:**
```
MomentCapture.tsx -> createMoment()
  ├── INSERT moments table
  ├── analyzeMomentSentiment(content) [async, non-blocking]
  │   └── GeminiClient.call({ action: 'analyze_moment_sentiment' })
  │       └── UPDATE moments SET sentiment_data = {...}
  └── award_consciousness_points + update_moment_streak [fire-and-forget]
```

---

### B. Insight Pos-Captura

| Campo | Valor |
|-------|-------|
| **Service** | `aiAnalysisService.ts:110-218` |
| **Action** | `generate_post_capture_insight` |
| **Model** | auto |
| **Temperature** | 0.7 |
| **Max Tokens** | 200 |
| **Tracking** | Sim |

**Prompt:**
```
Analise este novo momento pessoal e identifique conexoes com momentos recentes.

Novo momento: "{newMoment}"

Momentos recentes (ultimos 7 dias):
{recentTexts}

Tags recorrentes: {topTags}

Retorne um JSON:
{
  "message": "insight em 1-2 linhas",
  "theme": "tema principal identificado",
  "relatedCount": numero,
  "action": "view_similar" | "view_patterns"
}
```

**Quando dispara:** Apos salvar novo momento, se houver momentos recentes para comparar.

---

### C. Analise em Tempo Real (Debounced)

| Campo | Valor |
|-------|-------|
| **Service** | `aiAnalysisService.ts:28-105` |
| **Action** | `analyze_content_realtime` |
| **Model** | auto |
| **Temperature** | 0.8 |
| **Max Tokens** | 150 |
| **Debounce** | 3 segundos de inatividade |
| **Tracking** | Sim |

**Prompt:**
```
Voce e um coach de auto-reflexao. Analise este momento pessoal e forneca UMA sugestao util.

Momento: "{content}"

Retorne um JSON:
{
  "type": "reflection" | "question" | "pattern",
  "message": "sua sugestao (maximo 2 linhas)"
}

Tipos:
- "reflection": Uma observacao ou reflexao
- "question": Uma pergunta profunda
- "pattern": Um padrao ou tema identificado

Seja conciso e empatico.
```

**Quando dispara:** Enquanto usuario digita no campo de momento, apos 3s sem teclar.

---

### D. Resumo Semanal

| Campo | Valor |
|-------|-------|
| **Service** | `weeklySummaryService.ts:243-286` |
| **Action** | `generate_weekly_summary` |
| **Model** | `smart` (gemini-2.0-pro) |
| **Tracking** | Sim |
| **Gamification** | `award_consciousness_points` (20 CP por reflexao) |

**Payload:**
```typescript
{
  moments: [{
    id, content, emotion,
    sentiment_data: { sentiment, sentimentScore },
    tags[], created_at
  }]
}
```

**Prompt:** Definido no handler da Edge Function. Gera sumario com:
- Tendencia emocional geral
- Emocoes dominantes
- Momentos-chave da semana
- Insights sobre padroes
- Sugestao de foco para proxima semana

**Fallback:** `generateFallbackSummary()` - conta emocoes e extrai momentos-chave sem AI.

**Data Flow:**
```
useWeeklySummary() -> generateWeeklySummary(userId, year, weekNumber)
  ├── getMoments(week date range)
  ├── IF moments exist:
  │   └── generateSummaryWithAI(moments)
  │       └── GeminiClient.call({ action: 'generate_weekly_summary', model: 'smart' })
  ├── ELSE: generateFallbackSummary()
  └── UPSERT weekly_summaries table
```

---

### E. Clustering por Tema

| Campo | Valor |
|-------|-------|
| **Service** | `aiAnalysisService.ts:224-309` |
| **Action** | `cluster_moments_by_theme` |
| **Model** | auto |
| **Temperature** | 0.6 |
| **Max Tokens** | 500 |
| **Tracking** | Sim |

**Prompt:**
```
Analise estes momentos pessoais e agrupe-os por temas principais.

Momentos:
{momentsSummary}

Retorne um JSON array:
[
  {
    "theme": "nome do tema",
    "emoji": "emoji representativo",
    "momentIds": [indices dos momentos],
    "description": "descricao breve do tema"
  }
]

Maximo 5 temas. Seja especifico e empatico.
```

**Quando dispara:** Sob demanda, para visualizacao de padroes.

---

### F. Pergunta Diaria (3-Level Cascade)

| Campo | Valor |
|-------|-------|
| **Service** | `dailyQuestionService.ts:239-336` |
| **Action** | `generate_daily_question` |
| **Model** | `fast` |
| **Timeout** | 3s client-side (com fallback) |
| **Retry** | 2x com backoff exponencial (500ms base) |
| **Tracking** | Sim |

**System Prompt:**
```
Voce e um assistente compassivo de bem-estar para o Aica Life OS.

Responsabilidades:
- Gerar UMA pergunta reflexiva baseada no contexto
- Pergunta deve ser util para auto-compreensao ou acao
- Deve ser curta (maximo 15 palavras)
- Nunca repetir perguntas recentes
- Adaptar tom baseado no estado emocional

Estilo: Compaixao, linguagem simples, perguntas abertas
Formato: Responda APENAS com a pergunta
```

**Context (body):**
```
Estado do usuario:
- Saude: {burnoutCount} burnouts, {mentalHealthFlags}
- Areas criticas: {criticalAreas}
- Trilhas ativas: {activeJourneys}
- Emocoes recentes: {emotions from last moments}
- Respostas recentes (evitar repeticao): {last questions answered}

Gere uma pergunta reflexiva apropriada.
```

**Cascade Flow:**
```
useDailyQuestionAI.fetchQuestion()
  ├── Level 1: AI-Driven (timeout 3s)
  │   ├── getUserContext()
  │   │   ├── Fetch recent moments (emotion, tags)
  │   │   ├── Fetch user_areas (critical areas)
  │   │   ├── Fetch user_journeys (active journeys)
  │   │   └── Fetch question_responses (last 5 answers)
  │   └── GeminiClient.call({ action: 'generate_daily_question' })
  │
  ├── Level 2: Journey Fallback (if AI fails/times out)
  │   ├── Fetch active journeys
  │   └── Return journey-specific question from DB or JOURNEY_QUESTION_MAP
  │
  └── Level 3: Pool Fallback (if no journeys)
      └── Return random from FALLBACK_QUESTION_POOL (hardcoded)
```

---

## 2. Edge Function Dedicada: generate-questions

| Campo | Valor |
|-------|-------|
| **Service** | `questionGenerationService.ts:379-412` |
| **Edge Function** | `generate-questions` |
| **Invocacao** | `supabase.functions.invoke('generate-questions')` |
| **Circuit Breaker** | 3 falhas -> 60s reset |
| **Retry** | 2x com backoff exponencial (so 5xx e 429) |

**Payload:**
```typescript
{
  batch_size: number,        // Default 5
  categories?: string[],     // Optional question categories
  force_regenerate?: boolean // Force new questions
}
```

**Response:**
```typescript
{
  success: boolean,
  questionsGenerated: number,
  questions: Array<{
    question_text: string,
    category: QuestionCategory,
    relevance_score: number,
    context_factors: string[]
  }>,
  contextUpdated: boolean,
  processingTimeMs?: number
}
```

**Auto-trigger:** `checkAndTriggerGenerationIfNeeded()` verifica via RPC
`check_should_generate_questions` e dispara em background se necessario.

---

## 3. File Search (RAG)

### V1 - Corpus-Based (Legacy)

| Campo | Valor |
|-------|-------|
| **Hook** | `useJourneyFileSearch.ts` |
| **Edge Function** | `file-search` (via GeminiClient) |
| **Actions** | `create_store`, `upload_document`, `search_documents`, `list_stores`, `delete_store` |

Indexa momentos como documentos markdown enriquecidos com metadados (emocao, tags, sentimento).

### V2 - Google Managed RAG

| Campo | Valor |
|-------|-------|
| **Hook** | `useJourneyFileSearchV2.ts` |
| **Edge Function** | `file-search-v2` (via GeminiClient) |
| **Actions** | `create_store_v2`, `upload_document_v2`, `query_v2`, `delete_document_v2`, `list_stores_v2` |
| **Max Results** | 10 |

**System Prompt (default):**
```
Voce e o agente de autoconhecimento do Aica Life OS.
Analise os momentos e reflexoes do usuario para responder a pergunta.
Identifique padroes emocionais, temas recorrentes e evolucao ao longo do tempo.
Responda em portugues brasileiro com empatia e sem julgamento.
Cite momentos especificos quando relevante.
```

---

## 4. Tabelas Supabase

| Tabela | Operacoes | Service | Notas |
|--------|-----------|---------|-------|
| `moments` | CRUD + sentiment async | momentService, momentPersistenceService | Tabela principal |
| `daily_questions` | Read (fetch active) | questionService, dailyQuestionService | Perguntas geradas |
| `question_responses` | Read/Upsert | questionService, dailyQuestionService | Respostas do usuario |
| `weekly_summaries` | Read/Upsert | weeklySummaryService | Resumos com AI |
| `user_consciousness_stats` | Read/Init | consciousnessPointsService | Gamificacao |
| `consciousness_points_log` | Read (via RPC) | consciousnessPointsService | Historico de CP |
| `user_question_context_bank` | Read/Upsert | questionGenerationService | Contexto para geracao |
| `user_areas` | Read (context) | dailyQuestionService | Areas do usuario |
| `user_journeys` | Read (context) | dailyQuestionService | Trilhas ativas |
| `whatsapp_messages` | Read (timeline) | unifiedTimelineService | Mensagens na timeline |
| `contact_network` | Read (JOIN) | unifiedTimelineService | Nomes dos contatos |

---

## 5. RPC Functions

| RPC | Chamado por | Parametros |
|-----|-------------|------------|
| `award_consciousness_points` | momentService, weeklySummaryService, questionService | `p_user_id`, `p_points`, `p_reason`, `p_reference_id`, `p_reference_type` |
| `update_moment_streak` | momentService | (implicit user_id) |
| `increment_questions_answered` | questionService | (implicit user_id) |
| `increment_summaries_reflected` | weeklySummaryService | (implicit user_id) |
| `check_should_generate_questions` | questionGenerationService | Returns: `should_generate`, `unanswered_count`, `total_available`, `hours_since_last_generation`, `daily_generation_count` |

---

## 6. Model Selection

| Action | Model | Custo | Razao |
|--------|-------|-------|-------|
| `analyze_moment_sentiment` | fast (2.0-flash) | Baixo | Alta frequencia, resposta simples |
| `generate_post_capture_insight` | auto | Baixo | Resposta curta (200 tokens) |
| `analyze_content_realtime` | auto | Baixo | Debounced, resposta curta (150 tokens) |
| `generate_weekly_summary` | smart (2.0-pro) | Medio | Analise complexa, qualidade importa |
| `cluster_moments_by_theme` | auto | Baixo | Classificacao estruturada |
| `generate_daily_question` | fast | Baixo | Timeout 3s, resposta de 1 linha |

---

## 7. Arquivos-Chave

### Services
| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `services/aiAnalysisService.ts` | 28-309 | 3 features AI (realtime, insight, clustering) |
| `services/dailyQuestionService.ts` | 239-336 | 3-level cascade + context building |
| `services/questionGenerationService.ts` | 379-412 | Edge Function + circuit breaker |
| `services/momentService.ts` | 24-124 | CRUD + async sentiment |
| `services/weeklySummaryService.ts` | 243-286 | AI summary generation |
| `services/consciousnessPointsService.ts` | 27-204 | CP management + leaderboard |
| `services/unifiedTimelineService.ts` | 225-375 | Timeline aggregation |

### Hooks
| Arquivo | Funcao |
|---------|--------|
| `hooks/useDailyQuestionAI.ts` | Hook + cached variant (24h localStorage) |
| `hooks/useConsciousnessPoints.ts` | CP stats + achievements |
| `hooks/useWeeklySummary.ts` | Summary fetch + generation |
| `hooks/useJourneyFileSearch.ts` | File Search V1 (corpus) |
| `hooks/useJourneyFileSearchV2.ts` | File Search V2 (managed RAG) |

### Types
| Arquivo | Tipos |
|---------|-------|
| `types/moment.ts` | Moment, MomentFilter, EmotionValue, AVAILABLE_EMOTIONS |
| `types/dailyQuestion.ts` | DailyQuestion, QuestionResponse |
| `types/weeklySummary.ts` | WeeklySummary, WeeklySummaryData |
| `types/consciousnessPoints.ts` | CP stats, CP log, level progression |
| `types/sentiment.ts` | SentimentAnalysis, Sentiment, EmotionalTrend |
| `types/unifiedEvent.ts` | UnifiedEvent (union), WhatsAppEvent, MomentEvent, etc. |

---

## 8. Problemas Conhecidos

| Issue | Status | Descricao |
|-------|--------|-----------|
| #197 | Closed | `message_type` column inexistente no whatsapp_messages |
| #199 | Closed | MomentEvent mapeava campos inexistentes |
| #200 | Closed | `sentiment_data.confidence` nao existe (usa `sentimentScore`) |
| #201 | Open | `transcribeAudio()` retorna placeholder hardcoded |
| #202 | Closed | localStorage sem SSR guard + erro silenciado |

---

*Mantido por: Lucas Boscacci Lima + Claude*
*Referencia: Issue #198*
