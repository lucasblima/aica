# Task List: Reformulacao Card "Minha Jornada"

> **Branch**: `feature/journey-redesign`
> **Inicio Estimado**: 2025-12-07
> **Duracao**: 10-14 dias

---

## FASE 1: Database e Backend (Dias 1-2)

### 1.1 Migration Supabase
- [ ] Criar arquivo `supabase/migrations/20251207_journey_moments.sql`
- [ ] Tabela `moments` com campos completos
- [ ] Tabela `weekly_summaries`
- [ ] Tabela `daily_questions` com seed
- [ ] Tabela `question_responses`
- [ ] Tabela `consciousness_points_log`
- [ ] Adicionar colunas CP em `user_stats`
- [ ] RLS policies para todas as tabelas
- [ ] Triggers de `updated_at`
- [ ] Indexes otimizados
- [ ] **Rodar**: `npx supabase db push`

**Delegado para**: Backend Architect Agent

### 1.2 Storage Bucket
- [ ] Criar bucket `journey-audio`
- [ ] Policy: usuarios podem upload proprio audio
- [ ] Policy: usuarios podem ler proprio audio
- [ ] Policy: usuarios podem deletar proprio audio

**Delegado para**: Backend Architect Agent

### 1.3 Edge Function: analyze-moment-sentiment
- [ ] Criar `supabase/functions/analyze-moment-sentiment/index.ts`
- [ ] Prompt de analise de sentimento
- [ ] Retorno JSON estruturado
- [ ] **Deploy**: `npx supabase functions deploy analyze-moment-sentiment`

**Delegado para**: AI Integration Agent

### 1.4 Edge Function: generate-weekly-summary
- [ ] Criar `supabase/functions/generate-weekly-summary/index.ts`
- [ ] Buscar momentos da semana
- [ ] Gerar resumo com Gemini
- [ ] Salvar no banco
- [ ] **Deploy**: `npx supabase functions deploy generate-weekly-summary`

**Delegado para**: AI Integration Agent

---

## FASE 2: Types (Dia 2)

### 2.1 Criar estrutura de tipos
- [ ] `src/modules/journey/types/index.ts` (re-exports)
- [ ] `src/modules/journey/types/moment.ts`
  - [ ] `MomentType`
  - [ ] `SentimentLabel`
  - [ ] `Moment` interface
  - [ ] `MomentInput` interface
  - [ ] `MomentFilters` interface
- [ ] `src/modules/journey/types/sentiment.ts`
  - [ ] `SentimentAnalysis` interface
- [ ] `src/modules/journey/types/weeklySummary.ts`
  - [ ] `EmotionalTrend` type
  - [ ] `WeeklySummary` interface
- [ ] `src/modules/journey/types/consciousness.ts`
  - [ ] `CPReason` type
  - [ ] `CP_REWARDS` const
  - [ ] `ConsciousnessLevel` type
  - [ ] `LEVEL_THRESHOLDS` const
  - [ ] `ConsciousnessStats` interface
  - [ ] `DailyQuestion` interface
  - [ ] `QuestionResponse` interface

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 3: Services (Dias 2-3)

### 3.1 Moment Service
- [ ] `src/modules/journey/services/momentService.ts`
  - [ ] `create(userId, input)` - criar momento
  - [ ] `list(userId, filters, limit, offset)` - listar momentos
  - [ ] `getByWeek(userId, weekNumber, year)` - momentos por semana
  - [ ] `analyzeSentiment(content)` - chamar Edge Function
  - [ ] `calculateWeekNumber(userId)` - calcular semana de vida
  - [ ] `delete(momentId)` - deletar momento
  - [ ] `update(momentId, updates)` - atualizar momento
  - [ ] `getSentimentHistory(userId, days)` - historico sentimento

**Delegado para**: General-purpose Agent (Frontend)

### 3.2 Consciousness Points Service
- [ ] `src/modules/journey/services/consciousnessPointsService.ts`
  - [ ] `awardCP(userId, reason, referenceId, referenceType)`
  - [ ] `getStats(userId)` - retorna ConsciousnessStats
  - [ ] `updateStreak(userId)` - atualiza streak e verifica bonus
  - [ ] `calculateLevel(cp)` - calcula nivel
  - [ ] `calculateProgress(cp, level)` - progresso para proximo nivel
  - [ ] Helpers: `getLevelName`, `getLevelNumber`, `getLevelDisplayName`, `getLevelEmoji`

**Delegado para**: Gamification Agent

### 3.3 Question Service
- [ ] `src/modules/journey/services/questionService.ts`
  - [ ] `getDailyQuestion(userId)` - pergunta do dia (rotativa)
  - [ ] `answerQuestion(userId, questionId, response)`
  - [ ] `hasAnsweredToday(userId)` - verificar se respondeu hoje
  - [ ] `getResponseHistory(userId, limit)`

**Delegado para**: General-purpose Agent (Frontend)

### 3.4 Weekly Summary Service
- [ ] `src/modules/journey/services/weeklySummaryService.ts`
  - [ ] `generate(userId, weekNumber, year)` - chama Edge Function
  - [ ] `get(userId, weekNumber, year)` - busca resumo existente
  - [ ] `getCurrentWeekSummary(userId)` - resumo semana atual
  - [ ] `addReflection(summaryId, reflection)` - adicionar reflexao

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 4: Hooks (Dias 3-4)

### 4.1 useMoments Hook
- [ ] `src/modules/journey/hooks/useMoments.ts`
  - [ ] Estado: `moments`, `isLoading`, `error`, `hasMore`
  - [ ] `loadMoments(offset, append)`
  - [ ] `createMoment(input)` - com award CP
  - [ ] `deleteMoment(momentId)`
  - [ ] `loadMore()` - paginacao
  - [ ] `refresh()`

**Delegado para**: General-purpose Agent (Frontend)

### 4.2 useAudioRecorder Hook
- [ ] `src/modules/journey/hooks/useAudioRecorder.ts`
  - [ ] Estado: `isRecording`, `isPaused`, `duration`, `audioUrl`, `audioBlob`, `waveformData`
  - [ ] `startRecording()` - inicia gravacao + waveform
  - [ ] `stopRecording()` - para e gera blob
  - [ ] `pauseRecording()` / `resumeRecording()`
  - [ ] `uploadAudio()` - faz upload para Supabase Storage
  - [ ] `reset()` - limpa estado
  - [ ] Limite de 3 minutos

**Delegado para**: General-purpose Agent (Frontend)

### 4.3 useConsciousnessPoints Hook
- [ ] `src/modules/journey/hooks/useConsciousnessPoints.ts`
  - [ ] Estado: `stats`, `isLoading`
  - [ ] `refresh()` - recarrega stats
  - [ ] Retorna `ConsciousnessStats` tipado

**Delegado para**: Gamification Agent

### 4.4 useDailyQuestion Hook
- [ ] `src/modules/journey/hooks/useDailyQuestion.ts`
  - [ ] Estado: `question`, `hasAnswered`, `isLoading`
  - [ ] `answer(response)` - responder pergunta
  - [ ] `skip()` - pular pergunta

**Delegado para**: General-purpose Agent (Frontend)

### 4.5 useWeeklySummary Hook
- [ ] `src/modules/journey/hooks/useWeeklySummary.ts`
  - [ ] Estado: `summary`, `isLoading`, `isGenerating`
  - [ ] `generate()` - gerar novo resumo
  - [ ] `addReflection(text)` - adicionar reflexao

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 5: Components - Capture (Dias 4-5)

### 5.1 MomentCapture (Container)
- [ ] `src/modules/journey/components/capture/MomentCapture.tsx`
  - [ ] Tabs: Audio | Texto | Ambos
  - [ ] Integra AudioRecorder ou textarea
  - [ ] EmotionPicker
  - [ ] TagInput
  - [ ] Botao "Salvar Momento"
  - [ ] Estado de loading/submitting

**Delegado para**: General-purpose Agent (Frontend)

### 5.2 AudioRecorder
- [ ] `src/modules/journey/components/capture/AudioRecorder.tsx`
  - [ ] Botao gravar (com animacao)
  - [ ] Waveform em tempo real
  - [ ] Timer HH:MM:SS
  - [ ] Botoes pause/resume/stop
  - [ ] Player de preview apos gravacao
  - [ ] Indicador de limite (3 min)

**Delegado para**: General-purpose Agent (Frontend)

### 5.3 EmotionPicker
- [ ] `src/modules/journey/components/capture/EmotionPicker.tsx`
  - [ ] Grid de emojis (20-30 opcoes)
  - [ ] Campo de busca
  - [ ] Modo compacto (dropdown)
  - [ ] Modo expandido (grid)
  - [ ] Categorias: positive, neutral, negative

**Delegado para**: General-purpose Agent (Frontend)

### 5.4 TagInput
- [ ] `src/modules/journey/components/capture/TagInput.tsx`
  - [ ] Input com autocomplete
  - [ ] Tags rapidas: #saude #trabalho #relacionamento #insight #gratidao
  - [ ] Criar novas tags
  - [ ] Remover tags selecionadas
  - [ ] Max 5 tags por momento

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 6: Components - Timeline (Dias 5-6)

### 6.1 MomentTimeline
- [ ] `src/modules/journey/components/timeline/MomentTimeline.tsx`
  - [ ] Lista virtual (react-window ou similar)
  - [ ] Infinite scroll
  - [ ] Agrupa por semana
  - [ ] Empty state elegante
  - [ ] Loading skeleton

**Delegado para**: General-purpose Agent (Frontend)

### 6.2 MomentCard
- [ ] `src/modules/journey/components/timeline/MomentCard.tsx`
  - [ ] Timestamp humanizado ("Ha 3 dias, terca as 14h")
  - [ ] Preview: waveform (audio) ou texto truncado
  - [ ] Indicador emocao (emoji + cor borda)
  - [ ] Indicador sentimento (verde/amarelo/vermelho)
  - [ ] Expandir para ver transcricao/detalhes
  - [ ] Acoes: deletar, editar tags

**Delegado para**: General-purpose Agent (Frontend)

### 6.3 TimelineFilters
- [ ] `src/modules/journey/components/timeline/TimelineFilters.tsx`
  - [ ] Filtro periodo (hoje, semana, mes, custom)
  - [ ] Filtro emocao (multi-select)
  - [ ] Filtro sentimento
  - [ ] Filtro tags
  - [ ] Botao limpar filtros

**Delegado para**: General-purpose Agent (Frontend)

### 6.4 WeekSeparator
- [ ] `src/modules/journey/components/timeline/WeekSeparator.tsx`
  - [ ] Linha divisoria visual
  - [ ] Label "Semana X de Y"
  - [ ] Mini resumo (X momentos, sentimento medio)
  - [ ] Link para resumo semanal completo

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 7: Components - Insights (Dias 6-7)

### 7.1 WeeklySummaryCard
- [ ] `src/modules/journey/components/insights/WeeklySummaryCard.tsx`
  - [ ] Header: "Resumo da Semana X"
  - [ ] Trend indicator (seta up/down/stable)
  - [ ] Emocoes dominantes (badges)
  - [ ] Texto do resumo (colapsavel)
  - [ ] Insights em lista
  - [ ] Sugestao para proxima semana
  - [ ] Campo de reflexao pessoal

**Delegado para**: General-purpose Agent (Frontend)

### 7.2 EmotionalGraph
- [ ] `src/modules/journey/components/insights/EmotionalGraph.tsx`
  - [ ] Grafico de linha (Recharts)
  - [ ] Eixo X: dias
  - [ ] Eixo Y: sentiment score (-1 a 1)
  - [ ] Cores por zona (verde, amarelo, vermelho)
  - [ ] Tooltip com detalhes
  - [ ] Responsivo

**Delegado para**: General-purpose Agent (Frontend)

### 7.3 PatternDetector
- [ ] `src/modules/journey/components/insights/PatternDetector.tsx`
  - [ ] Lista de padroes detectados
  - [ ] Icone por tipo (tempo, gatilho, crescimento)
  - [ ] Explicacao breve
  - [ ] Acoes sugeridas

**Delegado para**: General-purpose Agent (Frontend)

### 7.4 DailyQuestionCard
- [ ] `src/modules/journey/components/insights/DailyQuestionCard.tsx`
  - [ ] Pergunta do dia destacada
  - [ ] Textarea para resposta
  - [ ] Botoes: "Responder" | "Pular" | "Lembrar depois"
  - [ ] Indicador CP a ganhar (+10)
  - [ ] Animacao de recompensa apos responder

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 8: Components - Gamification (Dia 7)

### 8.1 ConsciousnessScore
- [ ] `src/modules/journey/components/gamification/ConsciousnessScore.tsx`
  - [ ] Numero total de CP
  - [ ] Barra de progresso para proximo nivel
  - [ ] Nome do nivel atual
  - [ ] Preview do proximo nivel

**Delegado para**: Gamification Agent

### 8.2 LevelBadge
- [ ] `src/modules/journey/components/gamification/LevelBadge.tsx`
  - [ ] Icone/emoji do nivel
  - [ ] Nome do nivel
  - [ ] Cor por nivel
  - [ ] Tamanhos: sm, md, lg

**Delegado para**: Gamification Agent

### 8.3 StreakIndicator
- [ ] `src/modules/journey/components/gamification/StreakIndicator.tsx`
  - [ ] Numero de dias consecutivos
  - [ ] Icone de fogo
  - [ ] Animacao pulsante se streak ativo
  - [ ] Record de streak

**Delegado para**: Gamification Agent

### 8.4 PointsAnimation
- [ ] `src/modules/journey/components/gamification/PointsAnimation.tsx`
  - [ ] "+X CP" flutuante
  - [ ] Animacao de subida e fade
  - [ ] Som satisfatorio (opcional)
  - [ ] Confetti em ganhos grandes

**Delegado para**: Gamification Agent

---

## FASE 9: Views (Dias 7-9)

### 9.1 JourneyCardCollapsed
- [ ] `src/modules/journey/views/JourneyCardCollapsed.tsx`
  - [ ] Header: icone + "Minha Jornada"
  - [ ] ConsciousnessScore compacto
  - [ ] Ultimo momento (preview)
  - [ ] Sparkline de humor (7 dias)
  - [ ] Indicador pergunta pendente (pulsante)
  - [ ] Botao/area clicavel para expandir

**Delegado para**: General-purpose Agent (Frontend)

### 9.2 JourneyFullScreen
- [ ] `src/modules/journey/views/JourneyFullScreen.tsx`
  - [ ] Layout 3 zonas (topo, centro, rodape)
  - [ ] Zona Superior: MomentCapture
  - [ ] Zona Central: MomentTimeline + TimelineFilters
  - [ ] Zona Inferior: Tabs (Resumo | Grafico | Perguntas)
  - [ ] Botao voltar/colapsar
  - [ ] Transicao suave

**Delegado para**: General-purpose Agent (Frontend)

---

## FASE 10: Integracao (Dias 9-10)

### 10.1 Atualizar LifeWeeksGrid
- [ ] Modificar `src/components/LifeWeeksGrid.tsx`
  - [ ] Importar `JourneyCardCollapsed`
  - [ ] Importar `JourneyFullScreen`
  - [ ] Render condicional baseado em `isExpanded`
  - [ ] Manter logica de birth_date
  - [ ] Transicao animada entre estados

**Delegado para**: General-purpose Agent (Frontend)

### 10.2 Atualizar GeminiClient
- [ ] Modificar `src/lib/gemini/types.ts`
  - [ ] Adicionar action `analyze_sentiment`
  - [ ] Adicionar action `generate_weekly_summary`

**Delegado para**: AI Integration Agent

### 10.3 Atualizar Gamification Service
- [ ] Modificar `src/services/gamificationService.ts`
  - [ ] Adicionar CP_REWARDS do Journey
  - [ ] Adicionar badges do Journey
  - [ ] Integrar com sistema existente

**Delegado para**: Gamification Agent

---

## FASE 11: Testes (Dias 10-11)

### 11.1 Testes Unitarios
- [ ] Testar `momentService` (mock Supabase)
- [ ] Testar `consciousnessPointsService`
- [ ] Testar calculos de nivel e streak

**Delegado para**: Testing & QA Agent

### 11.2 Testes E2E
- [ ] `tests/e2e/journey.spec.ts`
  - [ ] Criar momento de texto
  - [ ] Gravar momento de audio
  - [ ] Responder pergunta diaria
  - [ ] Visualizar timeline
  - [ ] Verificar CP awarded
  - [ ] Visualizar resumo semanal

**Delegado para**: Testing & QA Agent

### 11.3 Testes Mobile
- [ ] Testar em viewport mobile
- [ ] Verificar touch interactions
- [ ] Testar gravacao de audio mobile

**Delegado para**: Testing & QA Agent

---

## FASE 12: Polish (Dias 11-14)

### 12.1 Animacoes
- [ ] Transicoes Framer Motion
  - [ ] Collapse/expand suave
  - [ ] Cards entrando na timeline
  - [ ] Badges aparecendo
- [ ] Confetti em eventos especiais
- [ ] Waveform animado
- [ ] Loading skeletons

**Delegado para**: General-purpose Agent (Frontend)

### 12.2 Sons (Opcional)
- [ ] Som ao salvar momento
- [ ] Som ao ganhar CP
- [ ] Som de level up
- [ ] Toggle para desativar sons

**Delegado para**: General-purpose Agent (Frontend)

### 12.3 Estados Vazios
- [ ] Empty state: nenhum momento
- [ ] Empty state: nenhum resumo
- [ ] Empty state: pergunta ja respondida
- [ ] Ilustracoes ou mensagens motivacionais

**Delegado para**: General-purpose Agent (Frontend)

### 12.4 Error Handling
- [ ] Toast de erro ao falhar gravacao
- [ ] Retry automatico em falhas de rede
- [ ] Fallback se analise sentimento falhar
- [ ] Mensagens de erro amigaveis

**Delegado para**: General-purpose Agent (Frontend)

### 12.5 Cron Job Resumo Semanal
- [ ] Configurar pg_cron ou GitHub Actions
- [ ] Gerar resumo domingo a noite
- [ ] Notificar usuario segunda-feira

**Delegado para**: Backend Architect Agent

---

## COMANDOS DE EXECUCAO

```bash
# Criar branch
git checkout -b feature/journey-redesign

# Aplicar migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy analyze-moment-sentiment
npx supabase functions deploy generate-weekly-summary

# Rodar testes
npm run test
npm run test:e2e -- --grep "journey"

# Build
npm run build

# Commit final
git add .
git commit -m "feat(journey): complete redesign of Minha Jornada card

- Add moments capture (audio/text) with sentiment analysis
- Implement Consciousness Points gamification system
- Add weekly AI-generated summaries
- Create timeline with emotional tracking
- Add daily reflection questions

Closes #XXX"
```

---

## METRICAS DE SUCESSO

### Funcionalidade
- [ ] Usuario pode criar momento em < 30s
- [ ] Analise de sentimento retorna em < 3s
- [ ] Timeline carrega 50 items em < 1s
- [ ] Resumo semanal gerado em < 15s

### Qualidade
- [ ] 0 erros criticos em producao
- [ ] Cobertura de testes > 70%
- [ ] Lighthouse score > 85

### Engajamento (pos-lancamento)
- [ ] 80% usuarios registram 1+ momento/semana
- [ ] 50% respondem pergunta do dia
- [ ] Streak medio > 3 dias

---

**Data de Criacao**: 2025-12-06
**Ultima Atualizacao**: 2025-12-06
