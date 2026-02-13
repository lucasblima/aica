# AICA Life OS - OpenClaw Adaptation Architecture

> Adaptacao de padroes do framework open-source OpenClaw para a arquitetura serverless e privacy-first da AICA.

**Data**: Fevereiro 2026
**Status**: Planejamento
**Issue Epic**: #233

---

## Sumario Executivo

Este documento descreve 4 features inspiradas no OpenClaw, adaptadas para a stack AICA (Supabase Edge Functions + Gemini API):

1. **Life Council** (Conselho de Vida) - Fan-out/Fan-in de 3 personas AI
2. **Living User Dossier** (Manual Vivo do Usuario) - Memoria recursiva com `user_patterns`
3. **Model Router** (Roteador de Modelos) - Cascata de custo `callAI()`
4. **Auto-Correction** (Auto-Correcao) - Logging + alertas automaticos

### Diferencas Fundamentais vs OpenClaw

| Aspecto | OpenClaw | AICA |
|---------|----------|------|
| Runtime | Local (Python) | Serverless (Deno Edge Functions) |
| Estado | Stateful (cron jobs) | Stateless (save & forget) |
| Dados brutos | Armazena emails/Slack cru | Privacy-first (intent_summary only) |
| Modelos | GPT-4 cascade local | Gemini Flash/Pro via Edge Functions |
| Memoria | Cron sintetiza notas diarias | Trigger semanal → `user_patterns` |

---

## 1. Life Council (Conselho de Vida)

### 1.1 Visao Geral

Edge Function `run-life-council` que executa 3 analises paralelas e sintetiza um "Daily Insight".

```
                    ┌──────────────────┐
                    │   Data Collector  │
                    │   (Last 24h)      │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                v            v            v
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Filosofo │ │Estrateg. │ │Bio-Hacker│
        │(Journey) │ │ (Atlas)  │ │ (Rotina) │
        │Flash     │ │ Flash    │ │ Flash    │
        └─────┬────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────v──────┐
                    │ Synthesizer │
                    │ (Gemini Pro)│
                    └──────┬──────┘
                           │
                    ┌──────v──────┐
                    │ Save to DB  │
                    │daily_council│
                    │  _insights  │
                    └─────────────┘
```

### 1.2 Coleta de Dados (Data Collector)

A Edge Function busca dados das ultimas 24h do usuario:

```sql
-- Moments do Journey (ultimas 24h)
SELECT content, emotion, sentiment_data, tags, created_at
FROM moments
WHERE user_id = $1
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Daily report do Atlas (se existir para hoje)
SELECT report_content, insights_count, actions_identified
FROM daily_reports
WHERE user_id = $1
  AND report_date = CURRENT_DATE;

-- Work items completados/pendentes hoje
SELECT title, status, priority, priority_quadrant, completed_at, due_date
FROM work_items
WHERE user_id = $1
  AND (
    completed_at >= NOW() - INTERVAL '24 hours'
    OR (status IN ('todo', 'in_progress') AND due_date <= CURRENT_DATE + 1)
  );

-- Horarios dos logs (para Bio-Hacker analisar rotina)
SELECT created_at, type
FROM moments
WHERE user_id = $1
  AND created_at >= NOW() - INTERVAL '48 hours'
ORDER BY created_at;
```

### 1.3 Fan-out: 3 Personas (Paralelo)

Todas usam **Gemini 2.5 Flash** (baixo custo, < 3s cada):

#### Persona 1: O Filosofo/Terapeuta
```
INPUT: moments.content + moments.emotion + moments.sentiment_data
PROMPT: "Voce e um terapeuta humanista e filosofo pratico. Analise os registros
emocionais das ultimas 24h. Identifique:
1. Padrao emocional dominante (ansiedade, gratidao, frustracao, serenidade)
2. Possiveis gatilhos de estresse
3. Sinais de desalinhamento entre valores e acoes
4. Uma reflexao existencial breve e acolhedora
Responda em JSON: {pattern, triggers, misalignment, reflection}"
```

#### Persona 2: O Estrategista/COO
```
INPUT: work_items (completados + pendentes) + daily_reports
PROMPT: "Voce e um COO experiente. Analise a produtividade das ultimas 24h:
1. Taxa de conclusao (completos / total)
2. Alinhamento com Eisenhower (quais quadrantes foram priorizados?)
3. Gargalos identificados (tarefas atrasadas, sem deadline)
4. Sugestao tatica para as proximas 24h
Responda em JSON: {completionRate, quadrantFocus, bottlenecks, tacticalAdvice}"
```

#### Persona 3: O Bio-Hacker/Coach
```
INPUT: timestamps dos logs (ultimas 48h)
PROMPT: "Voce e um coach de performance e biohacker. Analise os horarios de atividade:
1. Horario medio de primeiro/ultimo registro
2. Distribuicao de atividade (manha/tarde/noite)
3. Sinais de privacao de sono ou excesso de trabalho
4. Sugestao de otimizacao de rotina
Responda em JSON: {sleepEstimate, activityDistribution, overworkSignals, routineAdvice}"
```

### 1.4 Fan-in: Sintese (Gemini 2.5 Pro)

```
INPUT: Output das 3 personas acima
PROMPT: "Voce e o Conselheiro-Chefe do usuario. Recebeu 3 analises independentes:

FILOSOFO: {persona1_output}
ESTRATEGISTA: {persona2_output}
BIO-HACKER: {persona3_output}

Sintetize um 'Daily Insight' unico que:
1. Resolva conflitos entre perspectivas (ex: Estrategista quer mais trabalho,
   mas Filosofo detectou burnout → sugira descanso estrategico)
2. Priorize saude > consciencia > produtividade
3. Gere 1-3 acoes concretas para amanha
4. Tom: acolhedor, pratico, em portugues brasileiro

Responda em JSON:
{
  overallStatus: 'thriving' | 'balanced' | 'strained' | 'burnout_risk',
  headline: string (max 100 chars),
  synthesis: string (2-3 paragrafos),
  actions: [{action: string, module: 'journey'|'atlas'|'connections', priority: 'high'|'medium'}],
  conflictsResolved: string[]
}"
```

### 1.5 Tabela: `daily_council_insights`

```sql
CREATE TABLE IF NOT EXISTS daily_council_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Persona outputs (raw for debugging)
  philosopher_output JSONB NOT NULL,
  strategist_output JSONB NOT NULL,
  biohacker_output JSONB NOT NULL,

  -- Synthesized result
  overall_status TEXT NOT NULL CHECK (overall_status IN ('thriving', 'balanced', 'strained', 'burnout_risk')),
  headline TEXT NOT NULL,
  synthesis TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  conflicts_resolved TEXT[] DEFAULT '{}',

  -- Metadata
  model_used TEXT DEFAULT 'gemini-2.5-pro',
  total_tokens_used INTEGER,
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,

  -- One insight per user per day
  CONSTRAINT daily_council_unique UNIQUE (user_id, insight_date)
);

CREATE INDEX idx_council_user_date ON daily_council_insights(user_id, insight_date DESC);
ALTER TABLE daily_council_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own insights" ON daily_council_insights
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role inserts" ON daily_council_insights
  FOR INSERT WITH CHECK (true);
```

### 1.6 Frontend Hook: `useLifeCouncil`

```typescript
// src/modules/journey/hooks/useLifeCouncil.ts
interface DailyCouncilInsight {
  id: string;
  insight_date: string;
  overall_status: 'thriving' | 'balanced' | 'strained' | 'burnout_risk';
  headline: string;
  synthesis: string;
  actions: Array<{ action: string; module: string; priority: string }>;
  conflicts_resolved: string[];
  created_at: string;
  viewed_at: string | null;
}
```

### 1.7 Trigger: Quando Executar

- **Automatico**: Todo dia as 06:00 BRT via pg_cron (se usuario tem dados das ultimas 24h)
- **Manual**: Botao "Gerar Insight" no Journey dashboard
- **On-Demand**: Via GeminiClient action `'run_life_council'`

### 1.8 Estimativa de Custo

| Componente | Modelo | Tokens (est.) | Custo |
|-----------|--------|---------------|-------|
| 3x Personas | Flash | 3 x ~2K = 6K | ~$0.001 |
| Sintese | Pro | ~4K input + ~1K output | ~$0.02 |
| **Total/dia/usuario** | | ~11K | **~$0.021** |
| **Total/mes/usuario** | | ~330K | **~$0.63** |

---

## 2. Living User Dossier (Manual Vivo do Usuario)

### 2.1 Visao Geral

Sistema de memoria recursiva que sintetiza padroes do usuario em tabela `user_patterns`, atualizando semanalmente.

```
                 Domingo 23:00 BRT
                        │
                        v
              ┌─────────────────┐
              │ Weekly Synthesis │
              │ Edge Function    │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        v              v              v
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Council  │  │ Existing │  │  Weekly   │
  │ Insights │  │ Patterns │  │ Summaries │
  │ (7 dias) │  │(current) │  │ (Journey) │
  └──────────┘  └──────────┘  └──────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                ┌──────v──────┐
                │   Gemini    │
                │   2.5 Pro   │
                │  (Compare)  │
                └──────┬──────┘
                       │
                ┌──────v──────┐
                │ UPSERT into │
                │user_patterns│
                └─────────────┘
```

### 2.2 Tabela: `user_patterns`

```sql
CREATE TABLE IF NOT EXISTS user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern identity
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'productivity', 'emotional', 'routine', 'social',
    'health', 'learning', 'trigger', 'strength'
  )),
  pattern_key TEXT NOT NULL, -- e.g. "morning_meetings_block_exercise"

  -- Pattern content
  description TEXT NOT NULL,
  evidence TEXT[] DEFAULT '{}', -- Array of supporting observations
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence_score BETWEEN 0 AND 1),

  -- Embedding for RAG
  embedding VECTOR(768), -- text-embedding-004

  -- Lifecycle
  first_observed_at TIMESTAMPTZ DEFAULT NOW(),
  last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  times_observed INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique pattern per user
  CONSTRAINT user_pattern_unique UNIQUE (user_id, pattern_key)
);

CREATE INDEX idx_patterns_user ON user_patterns(user_id);
CREATE INDEX idx_patterns_type ON user_patterns(user_id, pattern_type);
CREATE INDEX idx_patterns_confidence ON user_patterns(user_id, confidence_score DESC);
CREATE INDEX idx_patterns_embedding ON user_patterns USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own patterns" ON user_patterns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages patterns" ON user_patterns
  FOR ALL USING (true);
```

### 2.3 Edge Function: `synthesize-user-patterns`

**Input**: Dados da semana (council insights + weekly summaries + patterns existentes)
**Output**: UPSERT de patterns novos ou confirmados

```
PROMPT: "Voce e um analista comportamental. Compare os dados desta semana com os
padroes conhecidos do usuario.

DADOS DA SEMANA:
{council_insights_7_days}
{weekly_summary}

PADROES ATUAIS (confidence_score):
{existing_patterns}

Para cada padrao:
1. Se CONFIRMADO esta semana: incremente confidence_score em 0.1 (max 1.0)
2. Se CONTRADITO: decremente confidence_score em 0.15
3. Se NOVO padrao detectado: crie com confidence_score 0.50
4. Se confidence < 0.20: marque como is_active = false

Retorne JSON: {
  updates: [{pattern_key, confidence_delta, evidence_new}],
  new_patterns: [{pattern_type, pattern_key, description, evidence}],
  deactivations: [pattern_key]
}"
```

### 2.4 Aplicacao Pratica: RAG no Atlas

Quando usuario planeja a semana no Atlas, buscar patterns relevantes:

```sql
-- RPC: get_relevant_patterns(user_id, context_embedding, limit)
CREATE OR REPLACE FUNCTION get_relevant_patterns(
  p_user_id UUID,
  p_embedding VECTOR(768),
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  pattern_key TEXT,
  description TEXT,
  confidence_score NUMERIC,
  pattern_type TEXT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT pattern_key, description, confidence_score, pattern_type
  FROM user_patterns
  WHERE user_id = p_user_id
    AND is_active = true
    AND confidence_score >= 0.40
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;
```

### 2.5 Exemplos de Patterns Gerados

| pattern_key | description | confidence |
|-------------|-------------|------------|
| `morning_meetings_block_exercise` | Usuario nao performa fisicamente quando tem compromissos antes das 09:00 | 0.85 |
| `friday_low_energy` | Energia consistentemente baixa as sextas-feiras, evitar tarefas criativas | 0.70 |
| `whatsapp_distraction_afternoon` | Pico de mensagens WhatsApp 14-16h correlaciona com queda de produtividade | 0.60 |
| `gratitude_boosts_next_day` | Momentos de gratidao no Journey correlacionam com +30% produtividade no dia seguinte | 0.75 |

---

## 3. Model Router (Roteador de Modelos)

### 3.1 Visao Geral

Utilitario `callAI()` que roteia chamadas para o modelo mais custo-eficiente baseado em complexidade.

### 3.2 Cascata de Modelos

```
Nivel BAIXO (< 200ms target)
├── Gemini Flash (Edge Function)
├── Uso: Categorizar transacao, extrair tags, classificar prioridade
└── Custo: ~$0.0001/chamada

Nivel MEDIO (< 3s target)
├── Gemini Flash (default)
├── Se low-confidence → fallback para Gemini Pro
├── Uso: Resumo WhatsApp, chat simples, sentiment analysis
└── Custo: ~$0.001/chamada

Nivel ALTO (< 15s target)
├── Gemini 2.5 Pro (direto)
├── Uso: Life Council synthesis, grant writing, planejamento complexo
└── Custo: ~$0.02/chamada
```

### 3.3 Implementacao: Edge Function Utility

```typescript
// supabase/functions/_shared/model-router.ts

type ComplexityLevel = 'low' | 'medium' | 'high';

interface CallAIOptions {
  prompt: string;
  systemPrompt?: string;
  complexity: ComplexityLevel;
  userId?: string;
  operationType?: string;
  expectJson?: boolean;
  temperature?: number;
}

interface CallAIResult {
  text: string;
  model: string;
  tokens: { input: number; output: number };
  latencyMs: number;
  wasEscalated: boolean;
  confidence?: number;
}

const MODEL_MAP: Record<ComplexityLevel, string> = {
  low: 'gemini-2.5-flash',
  medium: 'gemini-2.5-flash',
  high: 'gemini-2.5-pro',
};

const ESCALATION_MAP: Record<ComplexityLevel, string | null> = {
  low: null,           // No escalation
  medium: 'gemini-2.5-pro',  // Flash → Pro
  high: null,          // Already at max
};

async function callAI(options: CallAIOptions): Promise<CallAIResult> {
  const model = MODEL_MAP[options.complexity];
  const startTime = Date.now();

  // Primary call
  let result = await callGemini(model, options);

  // Confidence-based escalation for medium complexity
  if (options.complexity === 'medium' && ESCALATION_MAP.medium) {
    const confidence = assessConfidence(result.text, options.expectJson);
    if (confidence < 0.6) {
      // Escalate to Pro
      result = await callGemini(ESCALATION_MAP.medium, options);
      result.wasEscalated = true;
    }
  }

  // Track usage
  await trackUsage(options.userId, options.operationType, result);

  return result;
}
```

### 3.4 Confidence Assessment

```typescript
function assessConfidence(text: string, expectJson?: boolean): number {
  let score = 1.0;

  // JSON validity check
  if (expectJson) {
    try { JSON.parse(text); }
    catch { score -= 0.4; }
  }

  // Length heuristics
  if (text.length < 20) score -= 0.3;  // Too short
  if (text.includes('I cannot') || text.includes('I\'m not sure')) score -= 0.3;

  // Repetition detection
  const words = text.split(' ');
  const uniqueRatio = new Set(words).size / words.length;
  if (uniqueRatio < 0.3) score -= 0.2;  // Too repetitive

  return Math.max(0, score);
}
```

### 3.5 Mapeamento de Actions para Niveis

```typescript
// Atualizar USE_CASE_TO_COMPLEXITY em models.ts
const USE_CASE_TO_COMPLEXITY: Record<string, ComplexityLevel> = {
  // LOW
  'categorize_task': 'low',
  'suggest_priority': 'low',
  'generate_tags': 'low',
  'analyze_moment_sentiment': 'low',

  // MEDIUM
  'chat_aica': 'medium',
  'finance_chat': 'medium',
  'extract_insights': 'medium',
  'generate_daily_question': 'medium',

  // HIGH
  'run_life_council': 'high',
  'generate_field_content': 'high',
  'generate_dossier': 'high',
  'generate_weekly_summary': 'high',
  'synthesize_patterns': 'high',
};
```

### 3.6 Economia Estimada

| Cenario | Sem Router | Com Router | Economia |
|---------|-----------|------------|----------|
| 100 chamadas/dia | $2.00 (tudo Pro) | $0.35 (70% Flash) | **82%** |
| 1000 chamadas/dia | $20.00 | $3.50 | **82%** |
| Mes (30 dias) | $600.00 | $105.00 | **$495/mes** |

---

## 4. Auto-Correction (Auto-Correcao)

### 4.1 Visao Geral

Sistema que monitora falhas de IA em Edge Functions e gera alertas automaticos quando um prompt falha repetidamente.

### 4.2 Tabela: `ai_function_health`

```sql
CREATE TABLE IF NOT EXISTS ai_function_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Function identity
  function_name TEXT NOT NULL,
  action_name TEXT NOT NULL,

  -- Error tracking
  consecutive_failures INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  total_calls INTEGER DEFAULT 0,
  last_error_message TEXT,
  last_error_context JSONB,

  -- Health status
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'critical')),
  alert_generated_at TIMESTAMPTZ,
  alert_acknowledged_at TIMESTAMPTZ,

  -- Prompt versioning
  current_prompt_hash TEXT,
  last_successful_prompt_hash TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT function_action_unique UNIQUE (function_name, action_name)
);

ALTER TABLE ai_function_health ENABLE ROW LEVEL SECURITY;

-- Only service role can write, authenticated users can read their alerts
CREATE POLICY "Authenticated can read health" ON ai_function_health
  FOR SELECT USING (true);
CREATE POLICY "Service role manages" ON ai_function_health
  FOR ALL USING (true);
```

### 4.3 Edge Function Wrapper

```typescript
// supabase/functions/_shared/health-tracker.ts

interface HealthTrackOptions {
  functionName: string;
  actionName: string;
  promptHash?: string;
}

async function trackSuccess(opts: HealthTrackOptions, supabaseClient: any) {
  await supabaseClient.rpc('track_ai_success', {
    p_function_name: opts.functionName,
    p_action_name: opts.actionName,
    p_prompt_hash: opts.promptHash || null,
  });
}

async function trackFailure(
  opts: HealthTrackOptions,
  error: Error,
  context: Record<string, any>,
  supabaseClient: any
) {
  const result = await supabaseClient.rpc('track_ai_failure', {
    p_function_name: opts.functionName,
    p_action_name: opts.actionName,
    p_error_message: error.message,
    p_error_context: context,
  });

  // Check if alert threshold reached
  if (result.data?.should_alert) {
    console.error(
      `[AUTO-CORRECTION] ALERT: ${opts.functionName}/${opts.actionName} ` +
      `has ${result.data.consecutive_failures} consecutive failures. ` +
      `Consider refactoring the prompt.`
    );
  }
}
```

### 4.4 RPCs de Tracking

```sql
-- Track successful AI call
CREATE OR REPLACE FUNCTION track_ai_success(
  p_function_name TEXT,
  p_action_name TEXT,
  p_prompt_hash TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO ai_function_health (function_name, action_name, total_calls, current_prompt_hash, health_status)
  VALUES (p_function_name, p_action_name, 1, p_prompt_hash, 'healthy')
  ON CONFLICT (function_name, action_name) DO UPDATE SET
    consecutive_failures = 0,
    total_calls = ai_function_health.total_calls + 1,
    health_status = 'healthy',
    current_prompt_hash = COALESCE(p_prompt_hash, ai_function_health.current_prompt_hash),
    last_successful_prompt_hash = COALESCE(p_prompt_hash, ai_function_health.last_successful_prompt_hash),
    updated_at = NOW();
END;
$$;

-- Track failed AI call (returns should_alert boolean)
CREATE OR REPLACE FUNCTION track_ai_failure(
  p_function_name TEXT,
  p_action_name TEXT,
  p_error_message TEXT,
  p_error_context JSONB DEFAULT '{}'
)
RETURNS TABLE (should_alert BOOLEAN, consecutive_failures INTEGER)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_failures INTEGER;
  v_status TEXT;
BEGIN
  INSERT INTO ai_function_health (
    function_name, action_name, consecutive_failures, total_failures, total_calls,
    last_error_message, last_error_context, health_status
  )
  VALUES (
    p_function_name, p_action_name, 1, 1, 1,
    p_error_message, p_error_context, 'degraded'
  )
  ON CONFLICT (function_name, action_name) DO UPDATE SET
    consecutive_failures = ai_function_health.consecutive_failures + 1,
    total_failures = ai_function_health.total_failures + 1,
    total_calls = ai_function_health.total_calls + 1,
    last_error_message = p_error_message,
    last_error_context = p_error_context,
    health_status = CASE
      WHEN ai_function_health.consecutive_failures + 1 >= 3 THEN 'critical'
      WHEN ai_function_health.consecutive_failures + 1 >= 1 THEN 'degraded'
      ELSE 'healthy'
    END,
    alert_generated_at = CASE
      WHEN ai_function_health.consecutive_failures + 1 = 3 THEN NOW()
      ELSE ai_function_health.alert_generated_at
    END,
    updated_at = NOW()
  RETURNING ai_function_health.consecutive_failures, ai_function_health.health_status
  INTO v_failures, v_status;

  -- Also log to ai_tracking_errors for historical record
  INSERT INTO ai_tracking_errors (operation_type, ai_model, error_message, error_context)
  VALUES (p_function_name || '/' || p_action_name, 'gemini', p_error_message, p_error_context);

  RETURN QUERY SELECT (v_failures >= 3), v_failures;
END;
$$;

-- Get health dashboard
CREATE OR REPLACE FUNCTION get_ai_health_dashboard()
RETURNS TABLE (
  function_name TEXT,
  action_name TEXT,
  health_status TEXT,
  consecutive_failures INTEGER,
  success_rate NUMERIC,
  last_error TEXT,
  alert_generated_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    function_name,
    action_name,
    health_status,
    consecutive_failures,
    CASE WHEN total_calls > 0
      THEN ROUND((total_calls - total_failures)::NUMERIC / total_calls * 100, 1)
      ELSE 100
    END as success_rate,
    last_error_message,
    alert_generated_at
  FROM ai_function_health
  ORDER BY
    CASE health_status WHEN 'critical' THEN 0 WHEN 'degraded' THEN 1 ELSE 2 END,
    consecutive_failures DESC;
$$;
```

### 4.5 Integracao com Frontend

```typescript
// src/hooks/useAIHealth.ts
// Dashboard de saude das Edge Functions AI
// Visivel em Settings > AI Health (admin only)
```

---

## 5. Cronograma de Implementacao

### Fase 1: Model Router (1 sessao)
- [ ] Criar `_shared/model-router.ts` utility
- [ ] Adicionar `USE_CASE_TO_COMPLEXITY` em `models.ts`
- [ ] Integrar em `gemini-chat` Edge Function
- [ ] Tests unitarios

### Fase 2: Auto-Correction (1 sessao)
- [ ] Migration: `ai_function_health` table + RPCs
- [ ] Criar `_shared/health-tracker.ts`
- [ ] Integrar em 3 Edge Functions piloto (gemini-chat, extract-intent, generate-questions)
- [ ] Hook `useAIHealth` + dashboard simples

### Fase 3: Life Council (2 sessoes)
- [ ] Migration: `daily_council_insights` table
- [ ] Edge Function: `run-life-council` (data collector + 3 personas + synthesis)
- [ ] Hook: `useLifeCouncil`
- [ ] UI: Card no Journey dashboard
- [ ] pg_cron schedule (06:00 BRT)

### Fase 4: Living User Dossier (2 sessoes)
- [ ] Migration: `user_patterns` table + RPCs
- [ ] Edge Function: `synthesize-user-patterns`
- [ ] Integracao RAG com Atlas (get_relevant_patterns)
- [ ] Hook: `useUserPatterns`
- [ ] UI: Patterns viewer no Journey
- [ ] pg_cron schedule (domingo 23:00 BRT)

### Total: ~6 sessoes de desenvolvimento

---

## 6. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Life Council sem dados suficientes | Require minimo 3 moments + 1 task para gerar |
| Custo de Pro na sintese | Context caching do user profile (ate 90% economia) |
| Patterns com falsos positivos | confidence_score + minimum 3 observations |
| Edge Function timeout (30s) | Fan-out paralelo + Flash (< 3s cada) |
| pg_cron nao disponivel em Supabase hosted | Usar webhook schedule externo (cron-job.org) |

---

## Referencias

- OpenClaw Council of Agents: Fan-out/Fan-in pattern
- OpenClaw Memory System: Recursive synthesis
- OpenClaw Model Cascade: Cost optimization
- OpenClaw Self-Documentation: Auto-correction
- AICA WhatsApp Pipeline: Privacy-first pattern (golden reference)
