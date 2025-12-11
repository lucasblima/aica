# Persistência de Dados: journey_moments vs moments - Mapeamento Completo

**Status**: Versão 1.0 - Análise de schema existente + propostas
**Data**: Dezembro 2025
**Objetivo**: Clarificar relação entre `journey_moments` e `moments`, definir fluxos de persistência

---

## 1. Situação Atual: Análise Crítica

### 1.1 Problema Identificado

Atualmente existem **dois sistemas paralelos** de armazenamento de momentos:

1. **`moments`** - Nova tabela (criada em `20251206_journey_redesign.sql`)
   - Armazena: tipo (audio/text/both), conteúdo, emoção, sentiment_data
   - Foco: Captura de momentos da jornada emocional
   - Estrutura: Completa com audio, transcription, sentiment analysis

2. **`journey_moments`** - Sistema legado (referenciado em `journeyService.ts`)
   - Armazena: content, mood, type (moment/question_answer/reflection)
   - Foco: Histórico genérico da jornada
   - Estrutura: Simplificada, sem audio

### Problema UX Principal
- **Confusão conceitual**: "Minha Jornada" vs "Meus Momentos"
- **Dados fragmentados**: Um momento pode estar em uma ou outra tabela
- **Sem sincronização**: Updates em um não refletem no outro

---

## 2. Schema Atual Detalhado

### 2.1 Tabela `moments` (Nova - Recomendada)

```sql
CREATE TABLE moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content (core)
  type TEXT NOT NULL CHECK (type IN ('audio', 'text', 'both')),
  content TEXT,                    -- Text content or transcription
  audio_url TEXT,                  -- Supabase Storage URL

  -- Emotion & Sentiment (structured analysis)
  emotion TEXT,                    -- Selected emotion emoji/name (e.g., 'sad', 'happy')
  sentiment_data JSONB,            -- {score: 0.8, label: 'positive', ...}

  -- Metadata
  tags TEXT[],                     -- Quick tags: #saúde #trabalho
  location TEXT,                   -- Optional

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT moments_user_id_created_at_idx UNIQUE (user_id, created_at)
);

-- Indexes
CREATE INDEX idx_moments_user_id ON moments(user_id);
CREATE INDEX idx_moments_created_at ON moments(created_at DESC);
CREATE INDEX idx_moments_tags ON moments USING GIN(tags);
CREATE INDEX idx_moments_sentiment ON moments USING GIN(sentiment_data);
```

**Vantagens**:
- Suporta audio nativamente
- Sentiment analysis estruturada
- Timestamps com timezone
- Bem indexada

**Desvantagens**:
- Não armazena "tipo de momento" (question_answer, reflection)
- Sem integração com weekly_summaries
- Sem "week_number"

---

### 2.2 Tabela `journey_moments` (Legado - Deprecada)

```sql
-- Assumida pela análise de journeyService.ts
CREATE TABLE journey_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT,
  mood VARCHAR(50),
  type TEXT CHECK (type IN ('moment', 'question_answer', 'reflection')),
  question_id UUID,                -- Se for question_answer
  week_number INT,                 -- ISO week para agregação
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Vantagens**:
- Rastreia tipo de entrada (moment vs question vs reflection)
- Week_number para agregação semanal
- question_id para rastrear perguntas respondidas

**Desvantagens**:
- Sem audio
- Sem sentiment analysis estruturada
- Sem emotion picker
- Sem tags

---

## 3. Proposta de Solução: Consolidação com Contexto

### 3.1 Nova Tabela: `moment_entries` (Unificada)

Substituir ambas `moments` e `journey_moments` por uma tabela unificada:

```sql
-- =====================================================
-- TABLE: moment_entries
-- Purpose: Unificar todos os tipos de momentos/entradas da jornada
-- =====================================================

CREATE TABLE moment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ========== CONTENT ==========
  -- Texto e áudio
  content TEXT,                              -- Text content or audio transcription
  audio_url TEXT,                            -- Supabase Storage URL (if audio)
  audio_duration_seconds INT,                -- Duration of audio clip
  audio_transcribed_at TIMESTAMPTZ,          -- When transcription was completed

  -- ========== TYPE & CONTEXT ==========
  entry_type VARCHAR(50) NOT NULL,           -- 'moment', 'reflection', 'question_answer', 'weekly_summary'
  source TEXT CHECK (source IN ('manual', 'voice', 'imported')), -- How it was created

  -- If this is a question_answer
  question_id UUID REFERENCES daily_questions(id) ON DELETE SET NULL,
  question_text TEXT,                        -- Denormalized for reference

  -- If this is a reflection on a weekly_summary
  weekly_summary_id UUID REFERENCES weekly_summaries(id) ON DELETE SET NULL,

  -- ========== EMOTION & SENTIMENT ==========
  emotion_selected TEXT,                     -- User-selected emotion/mood
  emotion_intensity INT CHECK (emotion_intensity >= 0 AND emotion_intensity <= 10), -- 1-10 scale
  emotion_categories TEXT[],                 -- Can have multiple: ['anger', 'sadness', ...]

  -- Sentiment analysis (AI-generated)
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_label VARCHAR(20),               -- 'very_positive', 'positive', 'neutral', 'negative', 'very_negative'
  sentiment_generated_at TIMESTAMPTZ,        -- When AI analysis was done

  -- ========== CATEGORIZATION ==========
  tags TEXT[],                               -- User/AI tags: #health #work #relationships
  life_areas TEXT[],                         -- Categorized areas touched: ['health', 'finance', 'relationships']
  is_shared_with_associations UUID[],        -- Which associations can see this

  -- ========== LOCATION & CONTEXT ==========
  location TEXT,                             -- Optional: where this happened
  weather_notes TEXT,                        -- Optional: weather context
  people_involved TEXT[],                    -- Optional: who was involved

  -- ========== WEEK TRACKING ==========
  week_number INT NOT NULL,                  -- ISO week number
  year INT NOT NULL,                         -- Year
  day_of_week INT,                           -- 0-6 (0 = Sunday)

  -- ========== TIMESTAMPS ==========
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  happened_at TIMESTAMPTZ,                   -- When the event actually occurred (optional)

  -- ========== INDEXING ==========
  CONSTRAINT moment_entries_user_week_unique UNIQUE(user_id, created_at)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_moment_entries_user_id ON moment_entries(user_id);
CREATE INDEX idx_moment_entries_created_at ON moment_entries(created_at DESC);
CREATE INDEX idx_moment_entries_week ON moment_entries(user_id, week_number, year);
CREATE INDEX idx_moment_entries_type ON moment_entries(user_id, entry_type);
CREATE INDEX idx_moment_entries_emotion ON moment_entries(emotion_selected);
CREATE INDEX idx_moment_entries_tags ON moment_entries USING GIN(tags);
CREATE INDEX idx_moment_entries_life_areas ON moment_entries USING GIN(life_areas);
CREATE INDEX idx_moment_entries_sentiment ON moment_entries(sentiment_score DESC);
CREATE INDEX idx_moment_entries_question_id ON moment_entries(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX idx_moment_entries_weekly_summary_id ON moment_entries(weekly_summary_id) WHERE weekly_summary_id IS NOT NULL;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE moment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON moment_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON moment_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON moment_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON moment_entries FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_moment_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_moment_entries_updated_at_trigger
  BEFORE UPDATE ON moment_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_moment_entries_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE moment_entries IS 'Unified table for all types of journey entries: moments, reflections, question answers, and weekly reflections';
COMMENT ON COLUMN moment_entries.entry_type IS 'Type of entry: moment (freeform), reflection (on specific topic), question_answer (daily question), weekly_summary (reflection on week)';
COMMENT ON COLUMN moment_entries.emotion_intensity IS 'User''s perceived intensity of the emotion (1-10 scale)';
COMMENT ON COLUMN moment_entries.sentiment_score IS 'AI-analyzed sentiment (-1 to 1, where -1 is very negative, 1 is very positive)';
```

---

## 4. Mapeamento de Migração: Antigo → Novo

### 4.1 Migração de Dados (SQL)

```sql
-- =====================================================
-- MIGRATION: Consolidate moments and journey_moments
-- =====================================================

-- Step 1: Criar nova tabela (veja schema acima)
-- (já criado)

-- Step 2: Migrar dados de journey_moments para moment_entries
INSERT INTO moment_entries (
  id,
  user_id,
  content,
  entry_type,
  emotion_selected,
  question_id,
  week_number,
  year,
  created_at,
  updated_at,
  tags
)
SELECT
  gen_random_uuid(),
  user_id,
  content,
  type,                           -- 'moment', 'question_answer', 'reflection'
  mood,                           -- Usar como emotion_selected (será normalizado)
  question_id,
  week_number,
  EXTRACT(YEAR FROM created_at)::INT,
  created_at,
  created_at,
  ARRAY[]::TEXT[]                 -- Sem tags no legacy
FROM journey_moments
WHERE created_at > NOW() - INTERVAL '2 years'; -- Migrar últimos 2 anos

-- Step 3: Migrar dados de moments para moment_entries
INSERT INTO moment_entries (
  id,
  user_id,
  content,
  audio_url,
  entry_type,
  emotion_selected,
  emotion_intensity,
  sentiment_score,
  sentiment_label,
  tags,
  week_number,
  year,
  created_at,
  updated_at,
  day_of_week
)
SELECT
  m.id,
  m.user_id,
  m.content,
  m.audio_url,
  'moment',                       -- Todos os moments históricos são do tipo 'moment'
  m.emotion,
  5,                              -- Default intensity (será ajustado)
  (m.sentiment_data->>'score')::FLOAT,
  m.sentiment_data->>'label',
  m.tags,
  EXTRACT(WEEK FROM m.created_at)::INT,
  EXTRACT(YEAR FROM m.created_at)::INT,
  m.created_at,
  m.updated_at,
  EXTRACT(DOW FROM m.created_at)::INT
FROM moments m
WHERE m.created_at > NOW() - INTERVAL '2 years'; -- Últimos 2 anos

-- Step 4: Deprecar tabelas antigas (manter por backward compatibility)
-- Não dropar imediatamente; guardar por 1 mês antes de deletar
ALTER TABLE journey_moments RENAME TO journey_moments_deprecated;
ALTER TABLE moments RENAME TO moments_deprecated;

-- Step 5: Criar views de compatibilidade (se necessário)
CREATE VIEW moments_legacy AS
SELECT
  id,
  user_id,
  content,
  NULL::TEXT as audio_url,
  emotion_selected as emotion,
  jsonb_build_object('score', sentiment_score, 'label', sentiment_label) as sentiment_data,
  tags,
  created_at,
  updated_at
FROM moment_entries
WHERE entry_type = 'moment';

CREATE VIEW journey_moments_legacy AS
SELECT
  id,
  user_id,
  content,
  emotion_selected as mood,
  entry_type as type,
  question_id,
  week_number,
  created_at
FROM moment_entries
WHERE entry_type IN ('moment', 'question_answer', 'reflection');
```

---

## 5. Fluxo de Persistência: Onboarding → moment_entries

### 5.1 Fluxo Completo do Passo 1 ao Passo 2

```
PASSO 1: Trilhas Contextuais
┌─────────────────────────────────────┐
│ Usuário responde 3-4 perguntas      │
│ por trilha (health, finance, etc)   │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│ POST /api/onboarding/capture-context                │
│ {                                                   │
│   userId: string                                    │
│   trailId: string                                   │
│   responses: [                                      │
│     { questionId, selectedAnswerIds }              │
│   ]                                                 │
│ }                                                   │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│ INSERT into onboarding_context_    │
│ captures (veja doc anterior)        │
│                                     │
│ Armazena:                           │
│ - Respostas estruturadas (JSON)    │
│ - Trail score (0-10)               │
│ - Recommended modules              │
└────────────┬────────────────────────┘
             │
             ↓
        PASSO 2: Compartilhar Momento
┌──────────────────────────────────────────────────────┐
│ UI: Moment Capture with Multiple Choice              │
│                                                      │
│ 1. "Que tipo de momento você quer compartilhar?"     │
│    - [ ] Um desafio que superei                      │
│    - [ ] Uma alegria importante                      │
│    - [ ] Uma reação forte                            │
│    - [ ] Algo que aprendi                            │
│    - [ ] Outra coisa (descrevir)                     │
│                                                      │
│ 2. "Como você está se sentindo?"                     │
│    [Emotion picker com 😢😐😊😄😡]                  │
│                                                      │
│ 3. "Em qual área da vida isso afeta?"               │
│    - [ ] Saúde                                       │
│    - [ ] Relacionamentos                             │
│    - [ ] Trabalho/Carreira                           │
│    - [ ] Financeiro                                  │
│    - [ ] Pessoal/Espiritual                          │
│                                                      │
│ 4. [Optional] "Descreva um pouco mais..."           │
│    [Text input com suggestion: "Você pode descrever │
│     em suas próprias palavras ou deixar vazio"]     │
│                                                      │
│ 5. [Optional] "Quer gravar um áudio?"               │
│    [Audio recorder]                                 │
└────────────┬─────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────┐
│ POST /api/journey/create-moment                      │
│ {                                                    │
│   userId: string                                    │
│   momentType: 'challenge' | 'joy' | 'reaction' |   │
│              'learning' | 'other'                  │
│   emotion: 'sad' | 'neutral' | 'happy' |          │
│            'excited' | 'angry'                     │
│   lifeAreas: ['health', 'relationships']           │
│   content?: string                                 │
│   audioFile?: Blob                                 │
│ }                                                   │
└────────────┬─────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────┐
│ Backend Processing:                                  │
│                                                      │
│ 1. Upload audio (se fornecido):                      │
│    - Enviar para Supabase Storage                   │
│    - Receber URL                                    │
│                                                      │
│ 2. Transcrição (se audio):                          │
│    - Chamar Whisper API ou similar                  │
│    - Atualizar content com transcrição             │
│                                                      │
│ 3. Sentiment Analysis (se content):                 │
│    - Chamar API de sentiment (Gemini, etc)          │
│    - Extrair: score (-1 a 1), label               │
│                                                      │
│ 4. Categorização automática (AI):                   │
│    - Detectar tags adicionais                      │
│    - Validar life_areas                           │
│    - Atribuir emotion_intensity (1-10)            │
│                                                      │
│ 5. INSERT into moment_entries:                      │
│    {                                                │
│      id: gen_random_uuid(),                        │
│      user_id,                                       │
│      content: userText || transcription,           │
│      audio_url: (se upload),                       │
│      entry_type: 'moment',                         │
│      emotion_selected: emotion,                    │
│      emotion_intensity: 7,                         │
│      sentiment_score: 0.75,                        │
│      sentiment_label: 'positive',                  │
│      tags: ['@challenge', '@reflection'],          │
│      life_areas: lifeAreas,                        │
│      week_number: ISO week,                        │
│      year,                                          │
│      day_of_week,                                   │
│      created_at: NOW(),                            │
│      updated_at: NOW()                             │
│    }                                                │
│                                                      │
│ 6. Award Consciousness Points:                      │
│    - +10 points para criar momento                 │
│    - +5 bonus se emoção intensa                    │
│    - +10 bonus se com áudio                        │
│    - Chamar award_consciousness_points()           │
│                                                      │
│ 7. Atualizar user_consciousness_stats:             │
│    - Incrementar streak                            │
│    - Atualizar total_moments                       │
│    - Validar level up                              │
└────────────┬─────────────────────────────────────────┘
             │
             ↓
     PASSO 3: Recomendações
┌──────────────────────────────────────────────────────┐
│ Response: {                                          │
│   momentId: string                                   │
│   pointsAwarded: 25                                 │
│   leveledUp: false,                                 │
│   nextStep: 'view_modules' | 'complete_trails'     │
│   suggestedModules: []                              │
│ }                                                    │
│                                                      │
│ Se usuário completou todas as trilhas:             │
│   → Mostrar recomendações personalizadas           │
│ Se não:                                             │
│   → "Continue com próxima trilha?" ou "Pular"      │
└──────────────────────────────────────────────────────┘
```

---

## 6. Estrutura de Dados: Query Patterns

### 6.1 Query: Buscar momentos de uma semana específica

```typescript
// Service: journeyService.ts

export async function getMomentsForWeek(
  userId: string,
  weekNumber: number,
  year: number
): Promise<MomentEntry[]> {
  const { data, error } = await supabase
    .from('moment_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

### 6.2 Query: Buscar momentos com filtro de emoção

```typescript
export async function getMomentsByEmotion(
  userId: string,
  emotion: string,
  limit: number = 20
): Promise<MomentEntry[]> {
  const { data, error } = await supabase
    .from('moment_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('emotion_selected', emotion)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
```

### 6.3 Query: Buscar momentos com tags (múltiplas)

```typescript
export async function getMomentsByTags(
  userId: string,
  tags: string[]
): Promise<MomentEntry[]> {
  const { data, error } = await supabase
    .from('moment_entries')
    .select('*')
    .eq('user_id', userId)
    .overlaps('tags', tags)  // GIN index para arrays
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

### 6.4 Query: Agregar dados para Weekly Summary

```typescript
export async function getWeekSummaryData(
  userId: string,
  weekNumber: number,
  year: number
) {
  const { data: moments, error } = await supabase
    .from('moment_entries')
    .select('emotion_selected, sentiment_score, content, tags')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Agregar dados
  const result = {
    totalEntries: moments?.length || 0,
    dominantEmotions: getDominantEmotions(moments),
    avgSentiment: getAverageSentiment(moments),
    topTags: getTopTags(moments),
    emotionalTrend: detectTrend(moments)
  };

  return result;
}
```

---

## 7. TypeScript Interfaces (Atualizado)

```typescript
// moment_entries types

export interface MomentEntry {
  id: string;
  user_id: string;

  // Content
  content: string;
  audio_url?: string;
  audio_duration_seconds?: number;
  audio_transcribed_at?: string;

  // Type & Context
  entry_type: 'moment' | 'reflection' | 'question_answer' | 'weekly_summary';
  source: 'manual' | 'voice' | 'imported';

  // Relations
  question_id?: string;
  question_text?: string;
  weekly_summary_id?: string;

  // Emotion & Sentiment
  emotion_selected?: string;
  emotion_intensity?: number; // 0-10
  emotion_categories?: string[];

  sentiment_score?: number; // -1 to 1
  sentiment_label?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  sentiment_generated_at?: string;

  // Categorization
  tags?: string[];
  life_areas?: string[];
  is_shared_with_associations?: string[];

  // Context
  location?: string;
  weather_notes?: string;
  people_involved?: string[];

  // Week tracking
  week_number: number;
  year: number;
  day_of_week?: number; // 0-6

  // Timestamps
  created_at: string;
  updated_at: string;
  happened_at?: string;
}

export interface CreateMomentEntryInput {
  user_id: string;
  content?: string;
  audio_file?: Blob;
  emotion_selected?: string;
  emotion_intensity?: number;
  tags?: string[];
  life_areas?: string[];
  location?: string;
  happened_at?: Date;
}

export interface MomentStats {
  total_moments: number;
  avg_sentiment_score: number;
  dominant_emotion: string;
  most_mentioned_life_area: string;
  this_week_total: number;
  this_month_total: number;
  emotional_trend: 'improving' | 'stable' | 'declining';
}
```

---

## 8. Integração com Outras Tabelas

### 8.1 Relacionamento: moment_entries ← weekly_summaries

```sql
-- weekly_summaries armazena:
-- - summary_data: { keyMoments: [{id, preview, sentiment}], ... }
-- - Essas IDs de moment_entries podem ser consultadas diretamente

-- Query para gerar weekly summary
SELECT
  me.id,
  me.content,
  me.sentiment_score,
  me.emotion_selected
FROM moment_entries me
WHERE me.user_id = 'user-id'
  AND me.week_number = 50
  AND me.year = 2025
ORDER BY
  ABS(me.sentiment_score) DESC,  -- Maior impacto emocional
  me.sentiment_score DESC         -- Depois positivos
LIMIT 5;
```

### 8.2 Relacionamento: moment_entries ← daily_questions

```sql
-- Quando usuário responde question_id:1 na segunda-feira
INSERT INTO moment_entries (
  id, user_id, entry_type, question_id, question_text,
  content, week_number, year, created_at
) VALUES (
  gen_random_uuid(),
  'user-id',
  'question_answer',
  'question-id-1',
  'O que te trouxe energia essa semana?',
  'Conversar com meus amigos no fim de semana',
  50, 2025, NOW()
);

-- Isso torna possível:
-- - Ver histórico de respostas a uma pergunta
-- - Analisar mudanças nas respostas ao longo do tempo
-- - Incluir question_answers no weekly summary
```

### 8.3 Relacionamento: moment_entries ← onboarding_context_captures

```
Se usuário responde "preocupações financeiras" na trilha de Finance:
→ Módulos recomendados: ['budget_builder', 'debt_management', ...]

Quando usuário cria momento sobre finanças:
→ Sistema detecta life_areas = ['finance']
→ Sistema sugere: "Parece ser sobre finanças! Quer explorar o módulo Budget Builder?"

Fluxo:
1. onboarding_context_captures[trailId='finance'].recommended_modules
2. moment_entries[life_areas contains 'finance']
3. Match → Sugestão personalizada
```

---

## 9. Checklist de Implementação

- [ ] Criar nova tabela `moment_entries` com migrations
- [ ] Migrar dados de `journey_moments` e `moments`
- [ ] Atualizar `journeyService.ts` para usar `moment_entries`
- [ ] Criar views de compatibilidade (backward compatibility)
- [ ] Atualizar tipos TypeScript
- [ ] Testar queries de read/write
- [ ] Testar queries de agregação (weekly summary)
- [ ] Implementar sentiment analysis pipeline
- [ ] Implementar audio transcription pipeline
- [ ] Implementar auto-tagging (AI)
- [ ] Testes E2E para onboarding → moment capture → persistence
- [ ] Documentar deprecated tables
- [ ] Deprecar tabelas antigas após 30 dias

---

## 10. Fallback & Backward Compatibility

### 10.1 Views de Compatibilidade

```sql
-- Para código legado que ainda referencia 'journey_moments'
CREATE VIEW journey_moments AS
SELECT
  id,
  user_id,
  content,
  emotion_selected as mood,
  entry_type as type,
  question_id,
  week_number,
  created_at
FROM moment_entries
WHERE entry_type IN ('moment', 'question_answer', 'reflection');

-- Para código legado que ainda referencia 'moments'
CREATE VIEW moments AS
SELECT
  id,
  user_id,
  content,
  audio_url,
  emotion_selected as emotion,
  jsonb_build_object(
    'score', sentiment_score,
    'label', sentiment_label
  ) as sentiment_data,
  tags,
  location,
  created_at,
  updated_at
FROM moment_entries
WHERE entry_type = 'moment';
```

### 10.2 Triggers para Sincronização (se views não forem suficientes)

```sql
-- Se precisa manter tabelas legacy sincronizadas temporariamente:
-- (Não recomendado - remover após transição completa)

CREATE TRIGGER sync_moment_entries_to_journey_moments
AFTER INSERT ON moment_entries
FOR EACH ROW
WHEN (NEW.entry_type IN ('moment', 'question_answer', 'reflection'))
EXECUTE FUNCTION sync_to_journey_moments();

CREATE OR REPLACE FUNCTION sync_to_journey_moments()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO journey_moments_deprecated (
    id, user_id, content, mood, type, question_id, week_number, created_at
  ) VALUES (
    NEW.id, NEW.user_id, NEW.content, NEW.emotion_selected,
    NEW.entry_type, NEW.question_id, NEW.week_number, NEW.created_at
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. Timeline de Deprecação

**Fase 1 (Semana 1)**: Criar `moment_entries`, migrar dados, criar views
**Fase 2 (Semanas 2-3)**: Atualizar frontend para usar `moment_entries`
**Fase 3 (Semana 4)**: Teste completo de onboarding → moment capture
**Fase 4 (Semanas 5-6)**: Monitorar, fix bugs, coletar feedback
**Fase 5 (Semana 7)**: Remover views de compatibilidade, limpar código legado
**Fase 6 (Semana 8)**: Deletar tabelas `journey_moments_deprecated` e `moments_deprecated`

---

**Documentação criada**: 11/12/2025
**Próximo passo**: LANDING_PAGE_SPLASH_SCREEN_SPEC.md
