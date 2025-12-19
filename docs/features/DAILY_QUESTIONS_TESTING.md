# Daily Questions AI-Driven - Testing Guide

## Teste 1: Verificar Service Básico

```bash
# 1. Importar no seu arquivo de teste
import { getDailyQuestionWithContext, logDailyQuestionUsage } from '@/modules/journey/services/dailyQuestionService'

# 2. Chamar função
const userId = 'test-user-id'
const result = await getDailyQuestionWithContext(userId)

# 3. Verificar resultado
console.log(`Source: ${result.source}`)  // 'ai', 'journey', ou 'pool'
console.log(`Question: ${result.question.question_text}`)
console.log(`Generated at: ${result.generatedAt}`)
```

## Teste 2: Testar Hook React

```typescript
import { useDailyQuestionAI } from '@/modules/journey/hooks/useDailyQuestionAI'

function TestComponent() {
  const {
    question,
    source,
    isLoading,
    error,
    answer,
    skip,
  } = useDailyQuestionAI()

  return (
    <div>
      <h2>Daily Question Test</h2>

      {isLoading && <p>Carregando...</p>}
      {error && <p>Erro: {error.message}</p>}

      {question && (
        <div>
          <p><strong>Pergunta:</strong> {question.question_text}</p>
          <p><strong>Source:</strong> {source}</p>
          <p><strong>Categoria:</strong> {question.category}</p>

          <textarea
            id="response"
            placeholder="Sua resposta..."
            rows={4}
          />

          <button
            onClick={async () => {
              const response = (document.getElementById('response') as HTMLTextAreaElement).value
              if (response.trim()) {
                try {
                  const result = await answer(response)
                  alert(`Respondida! CP ganho: ${result.cp_earned}`)
                } catch (err) {
                  alert(`Erro: ${err}`)
                }
              }
            }}
          >
            Responder
          </button>

          <button onClick={skip}>Pular</button>
        </div>
      )}
    </div>
  )
}
```

## Teste 3: Cenários de Contexto

### Cenário A: Usuário com Burnout

```sql
-- Setup: Criar momentos com burn_out
INSERT INTO moments (user_id, emotion, tags, content) VALUES
  ('user-123', 'burnt out', '["work", "stress"]', 'Muito cansado'),
  ('user-123', 'stressed', '["deadline"]', 'Prazo apertado'),
  ('user-123', 'anxious', '["future"]', 'Ansioso com o futuro');

-- Esperado:
-- Source: 'ai' or 'journey' (se há trilha burnout-recovery)
-- Categoria: 'energy'
-- Exemplo: "Como você pode descansar melhor hoje?"
```

### Cenário B: Usuário com Áreas Críticas

```sql
-- Setup: Áreas críticas
INSERT INTO user_areas (user_id, name, status, is_critical) VALUES
  ('user-456', 'Finanças', 'critical', true),
  ('user-456', 'Saúde', 'critical', true);

-- Esperado:
-- Source: 'ai' or 'journey'
-- Categoria: 'change'
-- Exemplo: "Qual seria o primeiro passo concreto para melhorar suas finanças?"
```

### Cenário C: Usuário Engajado

```sql
-- Setup: Muitas respostas recentes
INSERT INTO question_responses (user_id, question_id, response_text) VALUES
  ('user-789', 'q1', 'Resposta 1'),
  ('user-789', 'q2', 'Resposta 2'),
  ('user-789', 'q3', 'Resposta 3'),
  ('user-789', 'q4', 'Resposta 4'),
  ('user-789', 'q5', 'Resposta 5');

-- Esperado:
-- Source: 'ai' (pergunta contextual evitando repetição)
-- Exemplo: "O que você aprendeu ao responder essas perguntas?"
```

## Teste 4: Teste de Fallback

```typescript
// Simulando Gemini falha:

// Modificar dailyQuestionService.ts temporariamente:
async function generateAIDrivenQuestion(...) {
  // Simular timeout
  await new Promise(resolve => setTimeout(resolve, 4000))
  return null // Timeout
}

// Esperado:
// 1. Tenta Level 1 (AI) → falha por timeout
// 2. Tenta Level 2 (Journey) → sucesso se trilha ativa
// 3. Senão, Level 3 (Pool) → sempre sucesso
```

## Teste 5: Edge Function Diretamente

```bash
# Chamar Edge Function via Supabase CLI

# Setup local
supabase start
supabase functions deploy gemini-chat

# Teste 1: Sucesso
curl -X POST http://localhost:54321/functions/v1/gemini-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "generate_daily_question",
    "payload": {
      "userContext": {
        "healthStatus": {
          "burnoutCount": 2,
          "mentalHealthFlags": ["burnout"]
        },
        "criticalAreas": [
          {
            "areaId": "area-1",
            "areaName": "Finanças",
            "severity": "high",
            "isBlocking": true
          }
        ],
        "activeJourneys": [
          {
            "areaId": "area-1",
            "journeyType": "financial-recovery",
            "completionPercentage": 30
          }
        ],
        "recentResponses": []
      },
      "systemPrompt": "Você é um assistente compassivo de bem-estar.",
      "contextSummary": "Usuário em burnout com problemas financeiros."
    }
  }'

# Teste 2: Verificar latência
time curl -X POST http://localhost:54321/functions/v1/gemini-chat \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_daily_question", "payload": {...}}'
```

## Teste 6: Cost Tracking

```sql
-- Verificar custos após testes

SELECT
  user_id,
  action,
  model,
  COUNT(*) as calls,
  AVG(response_time_ms) as avg_time_ms,
  SUM(cost_usd) as total_cost_usd,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
FROM gemini_api_logs
WHERE action = 'generate_daily_question'
  AND created_at > now() - interval '1 day'
GROUP BY user_id, action, model;

-- Esperado:
-- 1 call ≈ $0.0005 USD
-- response_time_ms: 2000-3000 ms (Gemini é rápido)
-- errors: 0 ou poucos
```

## Teste 7: Integração no ContextCard

```typescript
// Em src/modules/life/components/ContextCard.tsx

import { useDailyQuestionAI } from '@/modules/journey/hooks/useDailyQuestionAI'

export function ContextCard() {
  const dailyQuestion = useDailyQuestionAI()

  // Mostrar pergunta se não há evento urgente
  if (!hasUrgentEvent && dailyQuestion.question) {
    return (
      <div className="context-card">
        <h3>Pergunta do Dia</h3>
        <p>{dailyQuestion.question.question_text}</p>
        <p className="source">({dailyQuestion.source})</p>

        <textarea
          placeholder="Sua resposta..."
          onChange={(e) => setResponse(e.target.value)}
        />

        <button
          onClick={() => dailyQuestion.answer(response)}
          disabled={dailyQuestion.isSubmitting}
        >
          {dailyQuestion.isSubmitting ? 'Salvando...' : 'Responder'}
        </button>

        <button onClick={dailyQuestion.skip}>Pular</button>
      </div>
    )
  }

  return null // Mostrar próximo item se há evento urgente
}
```

## Teste 8: Performance

```typescript
// Medir tempo total do ciclo

async function measurePerformance() {
  const startTotal = performance.now()

  // 1. Fetch contexto
  const startContext = performance.now()
  const context = await getUserContext(userId)
  const contextTime = performance.now() - startContext

  // 2. Gerar pergunta
  const startQuestion = performance.now()
  const question = await generateAIDrivenQuestion(userId, context)
  const questionTime = performance.now() - startQuestion

  // 3. Salvar resposta
  const startResponse = performance.now()
  await saveDailyResponse(userId, question.id, 'test answer', 'ai')
  const responseTime = performance.now() - startResponse

  const totalTime = performance.now() - startTotal

  console.log(`
    Context Fetch: ${contextTime.toFixed(0)}ms
    Question Gen:  ${questionTime.toFixed(0)}ms
    Response Save: ${responseTime.toFixed(0)}ms
    ---
    Total:         ${totalTime.toFixed(0)}ms
  `)

  // Esperado:
  // Context Fetch: 100-200ms
  // Question Gen:  2000-3000ms (Gemini)
  // Response Save: 50-100ms
  // Total:         2200-3300ms
}
```

## Checklist de QA

- [ ] Service retorna pergunta em <3.5s
- [ ] Hook renderiza sem erro
- [ ] Resposta é salva no banco
- [ ] CP é atribuído corretamente
- [ ] Source é identificado corretamente
- [ ] Fallback funciona quando Gemini timeout
- [ ] Cache de 24h está funcionando
- [ ] Logs de custo são registrados
- [ ] Integração no ContextCard não quebra UI
- [ ] Performance é aceitável (<4s total)

