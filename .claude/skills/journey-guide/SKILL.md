---
name: journey-guide
description: Guia da Consciencia - especialista no modulo Journey (autoconhecimento, momentos, streaks, CP, perguntas diarias, resumos semanais). Use quando trabalhar com moments, consciousness points, daily questions, weekly summaries, heatmaps, emotion tracking, ou unified timeline.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Journey Guide - Guia da Consciencia

Especialista no modulo de autoconhecimento do AICA Life OS. Gerencia momentos de vida, Consciousness Points (CP), perguntas diarias, resumos semanais, e a timeline unificada.

---

## Arquitetura do Modulo

```
src/modules/journey/
|-- components/
|   |-- capture/          # MomentCapture, QuickCapture, AudioRecorder, EmotionPicker, TagInput
|   |-- gamification/     # ConsciousnessScore (5 tiers)
|   |-- timeline/         # MomentCard, TimelineEventCard, TimelineFilter, UnifiedTimelineView
|   |-- insights/         # DailyQuestionCard, WeeklySummaryCard, ActivityHeatmap, EmotionTrendChart, PatternDashboard, ThemeClusters, PostCaptureInsight
|   |-- ceramic/          # CeramicMomentCard, LifeWeeksStrip, LifeDecadesStrip
|   |-- JourneyHeroCard.tsx
|   |-- JourneySearchPanel.tsx
|-- hooks/
|   |-- useMoments.ts               # CRUD de momentos
|   |-- useConsciousnessPoints.ts    # Stats e progresso CP
|   |-- useDailyQuestion.ts          # Pergunta diaria
|   |-- useDailyQuestionAI.ts        # Geracao AI de perguntas
|   |-- useJourneyFileSearch.ts      # Busca semantica v1
|   |-- useJourneyFileSearchV2.ts    # Busca semantica v2
|   |-- useJourneyPatterns.ts        # Trends, heatmap, temas
|   |-- useUnifiedTimeline.ts        # Timeline de 7 fontes
|   |-- useWeeklySummary.ts          # Resumo semanal AI
|   |-- useWhatsAppMessagesRealtime.ts
|-- services/
|   |-- momentService.ts             # createMoment, getMoments, analyzeMomentFull
|   |-- momentPersistenceService.ts  # createMomentEntry, transcribeAudio, sanitizeText
|   |-- momentIndexingService.ts     # indexJourneyMoment (File Search)
|   |-- consciousnessPointsService.ts # getUserConsciousnessStats, getCPLog
|   |-- questionService.ts           # getDailyQuestion, answerQuestion
|   |-- questionGenerationService.ts # triggerQuestionGeneration (circuit breaker)
|   |-- weeklySummaryService.ts      # generateWeeklySummary, addReflection
|   |-- unifiedTimelineService.ts    # getUnifiedTimeline (7 fontes)
|   |-- aiAnalysisService.ts         # analyzeContentRealtime
|   |-- dailyQuestionService.ts      # RPC wrapper para CP awards
|-- types/
|   |-- moment.ts            # Moment, CreateMomentInput, MomentType, AVAILABLE_EMOTIONS
|   |-- consciousnessPoints.ts # CPLevel, CPLevelName, CP_REWARDS, CP_LEVELS
|   |-- dailyQuestion.ts     # DailyQuestion, QuestionResponse, QuestionCategory
|   |-- weeklySummary.ts     # WeeklySummary, EmotionalTrend
|   |-- sentiment.ts         # Sentiment, SentimentAnalysis, DetectedPattern
|   |-- persistenceTypes.ts  # CreateMomentEntryInput, LifeArea, MomentCategory
|   |-- unifiedEvent.ts      # EventSource, UnifiedEvent (polymorphic)
|-- views/
|   |-- JourneyCardCollapsed.tsx
|   |-- JourneyFullScreen.tsx
|   |-- JourneyMasterCard.tsx
```

---

## Tabelas do Banco

| Tabela | Proposito |
|--------|-----------|
| `moments` | Entradas de diario (texto + audio). **USAR ESTA** (nao `moment_entries`) |
| `weekly_summaries` | Resumos semanais gerados por AI |
| `daily_questions` | Perguntas diarias (globais + AI-geradas) |
| `question_responses` | Respostas do usuario as perguntas |
| `user_consciousness_stats` | Estado de gamificacao (CP, level, streak) |
| `consciousness_points_log` | Log de transacoes CP |

### RPCs Criticas

```sql
award_consciousness_points(p_user_id, p_amount, p_reason)
get_journey_activity_heatmap(p_user_id, p_start_date, p_end_date)
update_moment_streak(p_user_id)
get_unanswered_question(p_user_id, p_limit)
```

---

## Sistema de Gamificacao (Consciousness Points)

### Recompensas

| Acao | CP |
|------|----|
| `moment_registered` | 5 |
| `question_answered` | 10 |
| `weekly_reflection` | 20 |
| `streak_7_days` | 50 |

### Niveis (5 Tiers)

| Nivel | Nome | Faixa | Cor |
|-------|------|-------|-----|
| 1 | Observador | 0-99 | slate-400 |
| 2 | Consciente | 100-499 | blue-500 |
| 3 | Reflexivo | 500-1,499 | purple-500 |
| 4 | Integrado | 1,500-4,999 | amber-500 |
| 5 | Mestre | 5,000+ | yellow-500 |

### Streak
- Dias consecutivos com momentos registrados
- 7 dias = bonus 50 CP
- `current_streak` e `longest_streak` em `user_consciousness_stats`

---

## Integracoes AI

| Feature | Edge Function | Acao | Modelo |
|---------|---------------|------|--------|
| Analise de momento | `gemini-chat` | `analyze_moment_full` | gemini-2.5-flash |
| Transcricao audio | `gemini-chat` | `transcribe_audio` | gemini-2.5-flash |
| Resumo semanal | `gemini-chat` | via `generateSummaryWithAI()` | gemini-2.5-flash |
| Geracao de perguntas | `generate-questions` | direto | gemini-2.5-flash |
| Analise real-time | `gemini-chat` | `analyzeContentRealtime()` | gemini-2.5-flash |
| Busca semantica | `file-search-corpus` | RAG por usuario | File Search API |
| Extracao de intencao | `extract-intent` | source=`journey` | gemini-2.5-flash |

---

## Fluxo: Captura de Momento

```
Usuario digita texto (ou grava audio)
    |
    v
MomentCapture / QuickCapture
    |-- EmotionPicker (20 emocoes)
    |-- TagInput (#saude, #trabalho, etc.)
    |-- AudioRecorder (webm, max 5min)
    |
    v
momentPersistenceService.createMomentEntry()
    |-- Se audio: transcribeAudio(blob) → gemini-chat → texto
    |-- sanitizeText()
    |-- INSERT em `moments`
    |-- award_consciousness_points(5, 'moment_registered')
    |-- update_moment_streak()
    |
    v [fire-and-forget]
momentService.analyzeMomentFull()
    |-- Sentimento, tags AI, insights
    |-- UPDATE moments SET sentiment_data
```

## Fluxo: Pergunta Diaria

```
questionGenerationService.checkAndTriggerGenerationIfNeeded()
    |-- Verifica se ha perguntas disponiveis
    |-- Se nao: chama generate-questions Edge Function
    |-- Circuit breaker previne spam
    |
    v
questionService.getDailyQuestion(userId)
    |-- Retorna pergunta nao respondida
    |-- Se TODAS respondidas: retorna null (NAO reciclar!)
    |
    v
DailyQuestionCard exibe
    |-- Textarea para resposta
    |-- Suporte a audio (AudioRecorder)
    |
    v
questionService.answerQuestion()
    |-- INSERT em question_responses
    |-- award_consciousness_points(10, 'question_answered')
```

## Fluxo: Resumo Semanal

```
weeklySummaryService.generateCurrentWeeklySummary()
    |-- Busca momentos da semana
    |-- Busca respostas da semana
    |-- Chama generateSummaryWithAI()
    |     |-- Prompt com: momentos, emocoes, temas, respostas
    |     |-- Retorna: emotionalTrend, dominantEmotions, keyMoments, insights, suggestedFocus
    |-- INSERT em weekly_summaries
    |
    v
WeeklySummaryCard exibe
    |-- Tendencia emocional (ascending/stable/descending/volatile)
    |-- Emocoes dominantes
    |-- Momentos-chave
    |-- Insights e foco sugerido
    |-- Opcao de adicionar reflexao pessoal (+20 CP)
```

---

## Unified Timeline (7 Fontes)

```typescript
type EventSource = 'whatsapp' | 'moment' | 'task' | 'approval' | 'activity' | 'question' | 'summary'
```

- Agrupa eventos por dia
- Suporte a filtros (fonte, data, emocao, tags, sentimento)
- Type guards: `isWhatsAppEvent()`, `isMomentEvent()`, `isQuestionEvent()`
- Real-time subscription para WhatsApp messages

---

## Padroes Criticos

### SEMPRE:
- Usar tabela `moments` (NAO `moment_entries`)
- CP awards via RPC `award_consciousness_points` (SECURITY DEFINER)
- `validateSession()` usa `getSession()` — so refresh se token expira em <60s
- Circuit breaker em `questionGenerationService` para prevenir loops
- Audio: formatos webm, ogg, mp3, mpeg, mp4, wav, m4a, aac (max 25MB)

### NUNCA:
- Chamar `supabase.auth.refreshSession()` incondicionalmente (causa logout cascade)
- Reciclar perguntas ja respondidas (retornar `null` quando todas respondidas)
- Auto-refresh de pergunta apos resposta (loop infinito)
- Armazenar raw text de WhatsApp (apenas `intent_summary`, max 100 chars)

---

## Emocoes Disponiveis (20)

feliz, grato, calmo, animado, esperancoso, amado, orgulhoso, inspirado, curioso, determinado, neutro, cansado, ansioso, triste, frustrado, irritado, solitario, confuso, entediado, sobrecarregado

## Tags Rapidas

#saude, #trabalho, #relacionamento, #familia, #financas, #crescimento, #criatividade, #espiritualidade, #aprendizado, #lazer

## Life Areas

health, relationships, work, finance, personal-growth, spirituality, creativity, learning

---

## Backfill System

`useJourneyPatterns` inclui sistema de backfill para momentos antigos sem tags/mood/sentiment:
- Rate-limited: 50 momentos/sessao
- Delay 1.2s entre chamadas Gemini
- Progress tracking: processed/total/failed
- Iniciado via `startBackfill()`
