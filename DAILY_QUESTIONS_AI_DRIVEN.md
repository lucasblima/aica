# Sistema de Daily Questions AI-Driven (GAP 3)

## Visão Geral

Sistema híbrido de Daily Questions para o módulo Journey (Minha Vida) que utiliza integração Gemini para gerar perguntas contextuais e reflexivas baseadas no estado emocional e contexto do usuário.

## Arquitetura: Sistema em 3 Níveis

### Nível 1: AI-Driven (Gemini) - Premium

**Quando usar:** Primeira tentativa, usuário com contexto relevante
**Modelo:** `gemini-2.0-flash` (rápido, ~2-3s)
**Custo:** ~0.0005 USD por pergunta
**Vantagem:** Perguntas personalizadas e contextuais

```typescript
// Exemplo de pergunta AI-Driven:
"Como você está processando as emoções intensas do último dia?"
"Qual seria o primeiro passo concreto para sair dessa fase de transição?"
```

**Fluxo:**
1. Fetch contexto do usuário (burnouts, áreas críticas, trilhas ativas, histórico)
2. Monta prompt contextual com system instruction específica
3. Chama Gemini com timeout de 3s
4. Valida resposta (5-200 caracteres)
5. Se sucesso → retorna pergunta com source='ai'
6. Se falha/timeout → fallback para Nível 2

---

### Nível 2: Journey Fallback - Trilha Ativa

**Quando usar:** Gemini falhou ou rate limit
**Custo:** 0 USD (database query)
**Vantagem:** Perguntas específicas da jornada do usuário

```typescript
// Exemplos por trilha:
"Financial Recovery": "Qual é o primeiro passo para organizar suas finanças agora?"
"Burnout Recovery": "Você conseguiu descansar adequadamente nos últimos dias?"
"Health Recovery": "Como você está cuidando de sua saúde física hoje?"
```

**Fluxo:**
1. Query trilha mais crítica/ativa do usuário
2. Busca pergunta específica da trilha no banco de dados
3. Se não encontrar, usa mapa fixo de perguntas por tipo de trilha
4. Se trilha não existe → fallback para Nível 3

---

### Nível 3: Pool Fixo - Fallback Final

**Quando usar:** Ambos os níveis anteriores falharam
**Custo:** 0 USD
**Vantagem:** Sempre há uma pergunta disponível

```typescript
const FALLBACK_QUESTION_POOL = [
  "O que você quer conquistar hoje?",
  "Como você está se sentindo neste momento?",
  "Qual área da sua vida precisa de mais atenção?",
  "O que te deixaria orgulhoso hoje?",
  "Como você pode se cuidar melhor agora?",
  "Qual foi a melhor parte do seu dia?",
  "O que você aprendeu recentemente que mudou sua perspectiva?",
  "Como você quer se sentir nesta semana?"
]
```

**Fluxo:**
1. Seleciona pergunta aleatória do pool
2. Retorna sempre com sucesso

---

## Dados de Contexto Utilizados

### Health Status (Saúde Mental)
- **Burnouts:** Número de eventos de burnout registrados
- **Mentalização:** Depressão, ansiedade, overwhelm
- **Energia:** Nível de energia (0-100)

### Critical Areas (Áreas Críticas)
- Finanças com dívidas
- Saúde com problemas não resolvidos
- Relacionamentos em crise
- Carreira em transição

### Active Journeys (Trilhas Ativas)
- Financial Recovery
- Burnout Recovery
- Health Recovery
- Relationship Improvement
- Career Development
- Habit Formation

### Recent Responses (Histórico)
- Últimas 7 respostas
- Evita repetir perguntas recentes

### Moment History (Histórico Emocional)
- Últimos 10 momentos capturados
- Emoções e tags associadas

---

## Integração: Passo a Passo

### 1. Estrutura de Arquivos

```
src/modules/journey/
├── services/
│   ├── dailyQuestionService.ts        ← Novo! Serviço principal
│   └── questionService.ts             ← Existente, sem mudanças
├── hooks/
│   ├── useDailyQuestion.ts            ← Existente
│   └── useDailyQuestionAI.ts          ← Novo! Hook AI-powered
├── components/
│   └── insights/
│       └── DailyQuestionCard.tsx      ← Existente, compatível
└── types/
    └── dailyQuestion.ts               ← Existente

supabase/
├── functions/
│   └── gemini-chat/
│       ├── index.ts                   ← Aplicar patch
│       └── daily-question-handler.ts  ← Novo! Handler
└── migrations/
    └── 20251217_daily_questions_ai_integration.sql ← Novo! Schema

src/lib/gemini/
├── types.ts                           ← Atualizado
└── models.ts                          ← Atualizado
```

### 2. Usar o Hook no Componente

```typescript
import { useDailyQuestionAI } from '@/modules/journey/hooks/useDailyQuestionAI'

function ContextCard() {
  const { question, source, isLoading, error, answer } = useDailyQuestionAI()

  if (isLoading) return <div>Carregando pergunta...</div>
  if (error) return <div>Erro ao carregar pergunta</div>
  if (!question) return <div>Nenhuma pergunta disponível</div>

  return (
    <div>
      <p>Pergunta ({source}): {question.question_text}</p>
      <textarea onChange={e => setResponse(e.target.value)} />
      <button onClick={() => answer(response)}>Responder</button>
    </div>
  )
}
```

### 3. Otimizações de Custo

#### Rate Limiting
- Máx 1 pergunta AI por dia por usuário
- Cache de 24h se contexto não mudou

```typescript
const cacheKey = `daily_question_${userId}`
const cached = localStorage.getItem(cacheKey)
const cacheAge = Date.now() - JSON.parse(cached).timestamp
if (cacheAge < 24 * 60 * 60 * 1000) return cached
```

#### Timeout Agressivo
- Timeout de 3s no cliente
- Fallback automático se Gemini demora

```typescript
const timeoutPromise = new Promise(resolve =>
  setTimeout(() => resolve(null), 3000)
)
const result = await Promise.race([geminiPromise, timeoutPromise])
```

#### Logging de Custo
- Cada chamada registrada em `gemini_api_logs`
- Dashboard de custos disponível em `v_gemini_cost_analytics`

```sql
SELECT user_id, action, model, SUM(cost_usd) as total_cost
FROM v_gemini_cost_analytics
GROUP BY user_id, action, model
ORDER BY total_cost DESC;
```

---

## Estimativa de Custos

### Cenários

**Cenário 1: Usuário Ocasional (1x/semana)**
- 4 perguntas AI/mês
- ~0.002 USD/mês (negligível)

**Cenário 2: Usuário Engajado (1x/dia)**
- 30 perguntas AI/mês (com rate limiting)
- ~0.015 USD/mês

**Cenário 3: 10k Usuários Ativos**
- ~300 perguntas AI/dia
- ~0.15 USD/dia
- ~4.5 USD/mês

---

## Metrics & Monitoring

### Dashboard Query

```sql
SELECT
  action,
  COUNT(*) as calls,
  AVG(response_time_ms) as avg_time,
  SUM(cost_usd) as total_cost,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
  COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hits
FROM public.gemini_api_logs
WHERE action = 'generate_daily_question'
  AND created_at > now() - interval '7 days'
GROUP BY action
ORDER BY total_cost DESC;
```

### Engagement Metrics

```sql
SELECT
  qr.user_id,
  COUNT(qr.id) as total_responses,
  COUNT(CASE WHEN qr.question_source = 'ai' THEN 1 END) as ai_responses,
  (COUNT(CASE WHEN qr.question_source = 'ai' THEN 1 END)::float /
   COUNT(qr.id)) * 100 as ai_percentage
FROM question_responses qr
GROUP BY qr.user_id
ORDER BY ai_responses DESC;
```

---

## Troubleshooting

### Gemini Timeout (3s)

**Sintoma:** Perguntas do pool aparecem frequentemente
**Solução:** Verificar logs em `gemini_api_logs` table

```sql
SELECT response_time_ms, error_message, created_at
FROM gemini_api_logs
WHERE action = 'generate_daily_question' AND status = 'error'
ORDER BY created_at DESC LIMIT 10;
```

### Rate Limit (429)

**Sintoma:** Fallback para Level 2/3 frequentemente
**Solução:** Aumentar cache (24h → 48h) ou reduzir QPS

```typescript
// Em dailyQuestionService.ts, aumentar:
if (cacheAge < 48 * 60 * 60 * 1000) return cached
```

### Contexto Vazio

**Sintoma:** Perguntas genéricas mesmo com trilhas ativas
**Solução:** Verificar se `user_journeys` table tem dados

```sql
SELECT * FROM user_journeys WHERE status = 'active' LIMIT 10;
```

---

## Próximos Passos

1. **Persistência de Perguntas AI**
   - Opcionalmente, salvar perguntas geradas em cache
   - Reusar perguntas similares se contexto é igual

2. **Feedback Loop**
   - Rastrear se usuário respondeu a pergunta AI vs pool
   - Ajustar prompt baseado em engagement

3. **Personalization**
   - Aprender estilo de pergunta preferido por usuário
   - Ajustar tom/categoria baseado em histórico

4. **Streaming**
   - Se pergunta é muito longa, usar streaming
   - Mostrar progresso em tempo real

---

## Referências

- **Edge Function:** `supabase/functions/gemini-chat/daily-question-handler.ts`
- **Service:** `src/modules/journey/services/dailyQuestionService.ts`
- **Hook:** `src/modules/journey/hooks/useDailyQuestionAI.ts`
- **Migration:** `supabase/migrations/20251217_daily_questions_ai_integration.sql`
- **Patch:** `DAILY_QUESTION_GEMINI_PATCH.md`

## Autores

- AI Integration Agent (Gemini API Integration)
- Desenvolvido para GAP 3: Daily Questions AI-Driven

---

## Checklist de Implementação

- [ ] Aplicar migration Supabase
- [ ] Integrar daily-question-handler.ts ao gemini-chat/index.ts
- [ ] Deploy Edge Function
- [ ] Testar API diretamente
- [ ] Integrar hook no ContextCard
- [ ] Testar com diferentes contextos de usuário
- [ ] Monitorar logs de custo
- [ ] Documentar em wiki do projeto

