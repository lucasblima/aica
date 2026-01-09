# AI Cost Tracking - Module Integration Checklist

Use este checklist quando integrar rastreamento em novo modulo.

## Pre-Integration

- [ ] Identificar todas as operacoes de IA no modulo
- [ ] Listar numero exato de linhas onde Gemini e chamado
- [ ] Mapear estrutura de resposta (tokens sao retornados?)
- [ ] Identificar quais operacoes sao criticas vs. opcionais
- [ ] Listar modelos Gemini usados (2.0-flash, 1.5-pro, etc)

## Implementation

- [ ] Adicionar import: `import { trackAIUsage } from '@/services/aiUsageTrackingService'`
- [ ] Para cada operacao:
  - [ ] Adicionar `const startTime = Date.now()` no inicio
  - [ ] Adicionar `trackAIUsage()` call apos resposta Gemini
  - [ ] Adicionar `.catch()` para error handling
  - [ ] Validar que funcao retorna o mesmo tipo antes/depois
  - [ ] Incluir operation_type correto (text_generation, embedding, etc)
  - [ ] Incluir module_type como nome do modulo
  - [ ] Adicionar metadata util (content_length, use_case, etc)
- [ ] Verificar TypeScript: `npm run typecheck`
- [ ] Verificar build: `npm run build`

## Testing

- [ ] Criar testes unitarios para trackAIUsage calls
- [ ] Criar E2E test para operacao completa
- [ ] Validar dados em ai_usage_analytics table
- [ ] Testar error handling (Supabase down, etc)
- [ ] Testar com missingSentinel token counts

**Test Query:**

```sql
-- Check that tracking works
SELECT 
  module_type,
  COUNT(*) as operations,
  SUM(total_cost_usd) as total_cost
FROM ai_usage_analytics
WHERE module_type = 'new_module'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY module_type;
```

## Documentation

- [ ] Adicionar operacao a docs/AI_COST_TRACKING_README.md
- [ ] Atualizar docs/diagrams/AI_TRACKING_FLOW_DIAGRAMS.md
- [ ] Criar documentacao especifica do modulo (como JOURNEY_AI_COST_TRACKING_INTEGRATION.md)
- [ ] Adicionar exemplos de custo estimado
- [ ] Documentar frequency de chamadas (real-time, daily, on-demand, etc)

## Deployment

- [ ] Run full test suite: `npm run test && npm run test:e2e`
- [ ] Create PR com todos os arquivos modificados
- [ ] Pedir code review
- [ ] Merge e deploy
- [ ] Monitor ai_usage_analytics para dados novos

**Verification SQL:**

```sql
-- Monitor new module tracking for 24 hours
SELECT 
  DATE(created_at) as date,
  HOUR(created_at) as hour,
  COUNT(*) as operation_count,
  SUM(total_cost_usd) as hourly_cost
FROM ai_usage_analytics
WHERE module_type = 'new_module'
  AND created_at >= NOW() - INTERVAL '1 day'
GROUP BY DATE(created_at), HOUR(created_at)
ORDER BY date DESC, hour DESC;
```

## Time Estimate

- Pre-integration: 30-60 min
- Implementation: 1-2 hours (depends on number of AI operations)
- Testing: 1-2 hours
- Documentation: 1 hour
- **Total:** 4-6 hours per module

## Common Patterns

### Pattern 1: Simple Text Generation

```typescript
import { trackAIUsage, extractGeminiUsageMetadata } from '@/services/aiUsageTrackingService';

const response = await gemini.generateContent(prompt);
trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  ...extractGeminiUsageMetadata(response),
  module_type: 'module_name'
});
return response.text();
```

### Pattern 2: With Wrapper (Recommended)

```typescript
import { withAITracking } from '@/services/aiUsageTrackingService';

const result = await withAITracking(
  () => gemini.generateContent(prompt),
  {
    operation_type: 'text_generation',
    ai_model: 'gemini-2.0-flash',
    module_type: 'module_name'
  }
);
```

### Pattern 3: Streaming Operations

```typescript
let totalInputTokens = 0;
let totalOutputTokens = 0;

for await (const chunk of stream) {
  yield chunk.text(); // User sees immediately
  
  if (chunk.usageMetadata) {
    totalInputTokens = chunk.usageMetadata.promptTokenCount;
    totalOutputTokens += chunk.usageMetadata.candidatesTokenCount;
  }
}

// Track AFTER stream completes
trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: totalInputTokens,
  output_tokens: totalOutputTokens,
  module_type: 'module_name'
});
```

### Pattern 4: Batch Operations

```typescript
import { trackAIUsageBatch } from '@/services/aiUsageTrackingService';

const operations = items.map(item => ({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash',
  input_tokens: item.usage.input,
  output_tokens: item.usage.output,
  module_type: 'module_name'
}));

await trackAIUsageBatch(operations);
```

## Validation Checklist

- [ ] All AI calls have corresponding trackAIUsage() calls
- [ ] No function returns changed (tracking is fire-and-forget)
- [ ] Error handling is graceful (tracking errors don't break functionality)
- [ ] module_type is consistent across all operations
- [ ] operation_type matches actual operation (text_generation, embedding, etc)
- [ ] Metadata includes useful context (use_case, content_length, etc)
- [ ] Database queries can filter by module_type
- [ ] Cost estimates are calculated correctly

---

**Reference Documents:**
- docs/AI_COST_TRACKING_README.md
- docs/architecture/AI_COST_TRACKING_ARCHITECTURE.md
- docs/JOURNEY_AI_COST_TRACKING_INTEGRATION.md (example)

**Last Updated:** 2026-01-08
