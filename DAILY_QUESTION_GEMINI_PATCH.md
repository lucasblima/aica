# Daily Question Gemini Integration Patch

## Objetivo

Integrar o handler `handleGenerateDailyQuestion` ao arquivo `supabase/functions/gemini-chat/index.ts` para suportar geração de perguntas dinâmicas com IA.

## Passos de Integração

### 1. Adicionar Import no topo do arquivo `gemini-chat/index.ts`

```typescript
import {
  handleGenerateDailyQuestion,
  type GenerateDailyQuestionPayload,
  type GenerateDailyQuestionResult,
} from "./daily-question-handler.ts"
```

### 2. Adicionar Interface no seção TYPES

```typescript
interface GenerateDailyQuestionPayload {
  userContext: {
    healthStatus: {
      burnoutCount: number
      mentalHealthFlags: string[]
      energyLevel?: number
    }
    criticalAreas: Array<{
      areaId: string
      areaName: string
      severity: 'low' | 'medium' | 'high'
      isBlocking: boolean
    }>
    activeJourneys: Array<{
      areaId: string
      journeyType: string
      completionPercentage: number
    }>
    recentResponses: Array<{
      questionText: string
      answer: string
      date: string
    }>
  }
  systemPrompt: string
  contextSummary: string
}
```

### 3. Adicionar Case no Switch Statement

No switch case da ação dentro do servidor (busque por `switch (action)`):

```typescript
case 'generate_daily_question':
  result = await handleGenerateDailyQuestion(genAI, payload as GenerateDailyQuestionPayload)
  break
```

## Localização do Switch Statement

Procure pela linha:
```typescript
switch (action) {
  case 'analyze_moment_sentiment':
```

E adicione o novo case antes do `default`.

## Verificação

Após aplicar o patch:

1. Faça rebuild da Edge Function:
   ```bash
   supabase functions deploy gemini-chat
   ```

2. Teste com curl:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/gemini-chat \
     -H "Content-Type: application/json" \
     -d '{
       "action": "generate_daily_question",
       "payload": {
         "userContext": {
           "healthStatus": {
             "burnoutCount": 0,
             "mentalHealthFlags": []
           },
           "criticalAreas": [],
           "activeJourneys": [],
           "recentResponses": []
         },
         "systemPrompt": "Você é um assistente de bem-estar",
         "contextSummary": "Gere uma pergunta reflexiva simples"
       }
     }'
   ```

## Arquivos Relacionados

- `src/modules/journey/services/dailyQuestionService.ts` - Service layer
- `src/modules/journey/hooks/useDailyQuestionAI.ts` - React hook
- `src/lib/gemini/types.ts` - Tipos Gemini (action adicionada)
- `src/lib/gemini/models.ts` - Model mapping (adicionado)
- `supabase/migrations/20251217_daily_questions_ai_integration.sql` - Schema

## Notas Importantes

1. O handler implementa timeout de 2.5s para garantir fallback rápido
2. Retorna string vazia se timeout, permitindo cascata para Level 2/3
3. Toda chamada é logada em `gemini_api_logs` para cost tracking
4. Suporta 3 categorias: energy, change, learning, reflection, gratitude
