# Daily Questions AI-Driven - Quick Start Guide

## O que foi implementado?

Sistema de Daily Questions que gera perguntas reflexivas personalizadas usando Gemini AI, com fallbacks automáticos para garantir 100% de disponibilidade.

## Estrutura em 3 Níveis

```
┌─────────────────────────────────────────────────────────────┐
│ USUÁRIO PEDE UMA PERGUNTA DO DIA                             │
└────────────────────────────┬────────────────────────────────┘
                             │
                    ╔════════v════════╗
                    ║ LEVEL 1: AI-DRIVEN
                    ║ Gemini Flash
                    ║ 2-3s, $0.0001
                    ╚════════╤════════╝
                             │
                    ┌────────┴────────┐
                    │  Sucesso?       │
                    │  Timeout?       │
                    │  Rate limit?    │
                    └────────┬────────┘
                             │ Não
                    ╔════════v════════╗
                    ║ LEVEL 2: JOURNEY
                    ║ Pergunta da
                    ║ trilha ativa
                    ║ <100ms, $0
                    ╚════════╤════════╝
                             │
                    ┌────────┴────────┐
                    │  Encontrou?     │
                    └────────┬────────┘
                             │ Não
                    ╔════════v════════╗
                    ║ LEVEL 3: POOL
                    ║ Pergunta genérica
                    ║ aleatória
                    ║ <1ms, $0
                    ╚════════╤════════╝
                             │
                    ┌────────┴────────┐
                    │  Sempre retorna │
                    │  uma pergunta!  │
                    └────────┬────────┘
                             │
                ┌────────────v────────────┐
                │ MOSTRAR PERGUNTA NO UI   │
                │ + SALVAR RESPOSTA        │
                │ + REGISTRAR CUSTO        │
                └──────────────────────────┘
```

## Arquivos Criados (8 files)

### 1. **Core Service** (TypeScript)
```
src/modules/journey/services/dailyQuestionService.ts
```
Orquestra o sistema em cascata:
- `getDailyQuestionWithContext()` - Função principal
- `generateAIDrivenQuestion()` - Chama Gemini
- `getJourneyQuestion()` - Fallback 2
- `getPoolQuestion()` - Fallback 3

### 2. **React Hook** (TypeScript)
```
src/modules/journey/hooks/useDailyQuestionAI.ts
```
Interface React para usar no componente:
```typescript
const { question, source, isLoading, answer, skip } = useDailyQuestionAI()
```

### 3. **Edge Function Handler** (TypeScript/Deno)
```
supabase/functions/gemini-chat/daily-question-handler.ts
```
Handler Gemini no backend:
- Chamada segura à API
- Timeout 2.5s
- Validação de resposta

### 4. **Database Migration** (SQL)
```
supabase/migrations/20251217_daily_questions_ai_integration.sql
```
Schema novo:
- `gemini_api_logs` - Rastreia custos
- Extensões em `daily_questions` e `question_responses`
- Views para analytics
- Functions para CP e logging

### 5. **Type Updates** (TypeScript)
```
src/lib/gemini/types.ts
src/lib/gemini/models.ts
```
Adicionado:
- `'generate_daily_question'` action
- Model mapping para `fast`

### 6. **Documentação Completa** (Markdown)
```
DAILY_QUESTIONS_AI_DRIVEN.md              (Visão completa)
DAILY_QUESTIONS_IMPLEMENTATION_SUMMARY.md (Sumário técnico)
DAILY_QUESTIONS_TESTING.md                (Guia de testes)
DAILY_QUESTION_GEMINI_PATCH.md            (Patch requerido)
```

## Como Usar

### Passo 1: Aplicar Migration
```bash
# No Supabase Dashboard:
# 1. Ir em SQL Editor
# 2. Abrir: supabase/migrations/20251217_daily_questions_ai_integration.sql
# 3. Executar
```

### Passo 2: Integrar Edge Function (IMPORTANTE)
```bash
# 1. Abrir: supabase/functions/gemini-chat/index.ts
# 2. Adicionar import no topo:
import { handleGenerateDailyQuestion } from "./daily-question-handler.ts"

# 3. Adicionar case no switch (procurar por case 'analyze_moment_sentiment'):
case 'generate_daily_question':
  result = await handleGenerateDailyQuestion(genAI, payload)
  break

# 4. Deploy:
supabase functions deploy gemini-chat
```

### Passo 3: Usar no Componente
```typescript
import { useDailyQuestionAI } from '@/modules/journey/hooks/useDailyQuestionAI'

function ContextCard() {
  const { question, source, isLoading, answer } = useDailyQuestionAI()

  if (isLoading) return <div>Carregando...</div>

  return (
    <div className="context-card">
      <h3>Pergunta do Dia</h3>
      <p>{question.question_text}</p>
      <p className="text-sm text-gray-500">({source})</p>

      <textarea id="resp" placeholder="Sua resposta..." />
      <button onClick={() => answer(document.getElementById('resp').value)}>
        Responder
      </button>
    </div>
  )
}
```

## Exemplo: Diferentes Contextos

### Usuário em Burnout
```
getUserContext() →
  healthStatus.burnoutCount = 3
  activeJourneys = [{journeyType: 'burnout-recovery'}]

→ generateAIDrivenQuestion()
→ Pergunta AI: "Como você pode descansar melhor hoje?"
```

### Usuário com Dívidas
```
getUserContext() →
  criticalAreas = [{areaName: 'Finanças', severity: 'high'}]
  activeJourneys = [{journeyType: 'financial-recovery'}]

→ generateAIDrivenQuestion()
→ Pergunta AI: "Qual seria o primeiro passo concreto?"
```

### Sem Contexto (Novo Usuário)
```
getUserContext() →
  (vazio ou mínimo)

→ generateAIDrivenQuestion()
→ Timeout/Erro
→ getJourneyQuestion()
→ Vazio
→ getPoolQuestion()
→ "O que você quer conquistar hoje?"
```

## Custo & Performance

### Custo por Pergunta AI
```
Tokens: ~520 (500 input + 20 output)
Modelo: gemini-2.0-flash
Custo: ~$0.0001 USD

Escala: 10k usuários, 1x/dia
= 300,000 perguntas/mês
= ~$30 USD/mês
```

### Performance
```
Level 1 (AI): 2-3 segundos (+ 1s Supabase)
Level 2 (Journey): 50-100ms
Level 3 (Pool): <1ms

Total com sucesso: ~3.5s
Total com fallback: ~200ms
```

### Otimizações
- ✅ Cache 24h em localStorage
- ✅ Rate limit: 1x/dia/usuário
- ✅ Timeout agressivo: 3s → fallback
- ✅ Logging de custo por usuário

## Monitoramento

### Ver custos diários
```sql
SELECT
  DATE(created_at) as day,
  COUNT(*) as calls,
  SUM(cost_usd) as cost
FROM gemini_api_logs
WHERE action = 'generate_daily_question'
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Ver engajamento
```sql
SELECT
  COUNT(CASE WHEN question_source = 'ai' THEN 1 END) as ai_responses,
  COUNT(CASE WHEN question_source = 'journey' THEN 1 END) as journey_responses,
  COUNT(CASE WHEN question_source = 'pool' THEN 1 END) as pool_responses
FROM question_responses
WHERE responded_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Sempre fallback para pool?
```
Motivo: Gemini está retornando erro
Solução: Verificar gemini_api_logs table
SELECT error_message FROM gemini_api_logs
WHERE action = 'generate_daily_question' AND status = 'error'
LIMIT 5;
```

### Timeout frequente?
```
Motivo: Gemini > 3s ou rede lenta
Solução: Aumentar cache para 48h
// Em useDailyQuestionAI.ts:
if (cacheAge < 48 * 60 * 60 * 1000) return cached
```

### Contexto sempre vazio?
```
Motivo: Tabelas sem dados
Solução: Verificar dados nas tabelas
SELECT COUNT(*) FROM moments WHERE user_id = 'test-id';
SELECT COUNT(*) FROM user_journeys WHERE user_id = 'test-id';
```

## Checklist Implementação

```
ANTES de usar em produção:

[ ] Migration aplicada no Supabase
[ ] Edge Function patched e deployed
[ ] Hook integrado no componente ContextCard
[ ] Testado com dados reais
[ ] Monitorado custos por 24h
[ ] Dashboard de custos configurado
[ ] Team informado sobre o novo recurso
```

## Documentação Completa

Para mais detalhes, ver:

1. **DAILY_QUESTIONS_AI_DRIVEN.md** - Arquitetura completa
2. **DAILY_QUESTIONS_TESTING.md** - Como testar cada componente
3. **DAILY_QUESTION_GEMINI_PATCH.md** - Exato código a adicionar
4. **DAILY_QUESTIONS_IMPLEMENTATION_SUMMARY.md** - Sumário técnico detalhado

## Próximos Passos Sugeridos

1. **Feedback Loop** (1 semana)
   - Rastrear qual % de respostas são AI vs pool
   - Ajustar prompt se baixo engajamento

2. **Personalization** (2 semanas)
   - Aprender categoria preferida por usuário
   - Ajustar tom baseado em histórico

3. **Streaming** (3 semanas)
   - Se pergunta > 50 chars, usar streaming
   - Mostrar digitação em tempo real

4. **Analytics Dashboard** (1 mês)
   - Visualizar engagement por source
   - Custos por user/dia/semana

## Suporte

Qualquer dúvida, ver arquivos de documentação ou testar localmente com:

```bash
npm run dev
# Ir a http://localhost:5173
# Testar useDailyQuestionAI no ContextCard
```

---

**Status:** Pronto para produção após aplicar patch da Edge Function

**Commit:** 7275684 - feat(journey): Implement Daily Questions AI-Driven with Gemini integration

