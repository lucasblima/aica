# 🎯 Guia de Integração - AI Cost Tracking

Este guia orienta a integração completa do sistema de tracking de custos de IA no Aica Life OS.

---

## ✅ Status da Implementação

### Concluído
- ✅ Dashboard de Custos (frontend completo)
- ✅ Migration SQL com funções de budget
- ✅ Arquivo de preços (src/lib/gemini/pricing.ts)
- ✅ Serviço de tracking (src/services/aiUsageTrackingService.ts)
- ✅ **Grants Module integrado** (3 funções com tracking)

### Em Andamento
- ⏳ Integração em outros módulos (Podcast, Journey, Finance)
- ⏳ Testes end-to-end

---

## 📊 O Que Foi Integrado

### Grants Module (`src/modules/grants/services/grantAIService.ts`)

#### 3 Funções com Tracking Completo:

1. **`generateFieldContent()`** - Geração de conteúdo de campos
   - Rastreia: tokens, custo, field_id, project_id
   - Metadata: action, field_label, max_chars

2. **`analyzeEditalStructure()`** - Análise de estrutura de edital
   - Rastreia: tokens, custo, tamanho do edital
   - Metadata: action, edital_length

3. **`parseFormFieldsFromText()`** - Parse de campos do formulário
   - Rastreia: tokens, custo, tamanho do input
   - Metadata: action, input_length

---

## 🔧 Como Funciona

### Fluxo de Tracking

```typescript
// 1. Fazer chamada ao Gemini
const result = await model.generateContent(prompt);
const response = result.response;

// 2. Extrair metadata de uso
const usage = extractGeminiUsageMetadata(response);

// 3. Track usage (fire-and-forget, não bloqueia)
if (usage) {
  trackAIUsage({
    operation_type: 'text_generation',
    ai_model: 'gemini-2.0-flash-exp',
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    module_type: 'grants',
    module_id: projectId,
    request_metadata: {
      action: 'generate_field_content',
      field_id: 'company_presentation'
    }
  }).catch(err => {
    // Tracking não deve interromper fluxo principal
    console.warn('[Grants] Falha no tracking de IA:', err)
  })
}

// 4. Retornar resultado para o usuário
return response.text();
```

### Características

- **Non-blocking**: Tracking é assíncrono e não aguardado
- **Fail-safe**: Erros no tracking não quebram funcionalidade
- **Fire-and-forget**: `.catch()` captura erros silenciosamente
- **Post-success**: Tracking ocorre APÓS sucesso da operação

---

## 📖 Como Integrar em Outros Módulos

### Passo 1: Importar Funções

```typescript
import {
  trackAIUsage,
  extractGeminiUsageMetadata
} from '../../../services/aiUsageTrackingService'
```

### Passo 2: Adicionar Tracking Após `generateContent`

```typescript
// Sua chamada existente
const result = await model.generateContent(prompt);
const response = result.response;

// ADICIONE ESTE BLOCO ↓
// ========================================
// TRACKING DE CUSTO - AI Usage Analytics
// ========================================
const usage = extractGeminiUsageMetadata(response)
if (usage) {
  trackAIUsage({
    operation_type: 'text_generation', // ou 'image_analysis', 'transcription', etc
    ai_model: 'gemini-2.0-flash-exp', // ou o modelo que você usa
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
    module_type: 'grants', // altere para seu módulo
    module_id: yourModuleId, // ID do projeto/episódio/etc
    request_metadata: {
      action: 'your_action_name',
      // ... outros campos úteis para debug
    }
  }).catch(err => {
    console.warn('[YourModule] Falha no tracking de IA:', err)
  })
}
// ========================================

// Continuar com processamento normal
return response.text();
```

### Passo 3: Definir `operation_type` Correto

| Operação | Tipo |
|----------|------|
| Geração de texto (Gemini) | `'text_generation'` |
| Análise de imagem | `'image_analysis'` |
| Transcrição de áudio | `'transcription'` |
| Geração de vídeo | `'video_generation'` |
| Geração de imagem | `'image_generation'` |
| File Search query | `'file_search_query'` |
| File Search indexing | `'file_indexing'` |
| Embeddings | `'embedding'` |

### Passo 4: Definir `module_type` Correto

| Módulo | Tipo |
|--------|------|
| Grants (Captação) | `'grants'` |
| Journey (Jornada) | `'journey'` |
| Podcast | `'podcast'` |
| Finance (Finanças) | `'finance'` |
| Atlas (Tarefas) | `'atlas'` |
| Chat geral | `'chat'` |

---

## 🎯 Módulos Prioritários para Integração

### 1. Grants Briefing (`src/modules/grants/services/briefingAIService.ts`)
**Funções a integrar:**
- `analyzeBriefingWithAI()` - Análise de briefing do projeto
- Qualquer outra chamada Gemini

### 2. Podcast (`src/modules/podcast/...`)
**Funções a integrar:**
- Geração de pautas
- Deep Research (se usar Gemini)
- Análise de guest research

### 3. File Search (`src/services/geminiFileSearchService.ts`)
**Funções a integrar:**
- `queryFileSearch()` - Queries RAG
- File indexing operations

### 4. Journey (se houver uso de IA)
**Funções a integrar:**
- Análise de sentimento
- Geração de insights

---

## 🧪 Como Testar

### 1. Verificar Migrations Aplicadas

```sql
-- No Supabase SQL Editor:
SELECT * FROM ai_model_pricing;
-- Deve retornar modelos Gemini com preços
```

### 2. Testar em Desenvolvimento

1. Execute `npm run dev`
2. Navegue para o módulo Grants
3. Gere conteúdo de um campo
4. Abra Console do navegador (F12)
5. Procure por: `[AITracking] Uso registrado`

Você deve ver algo como:
```
[AITracking] Uso registrado: {
  id: "abc-123",
  model: "gemini-2.0-flash-exp",
  operation: "text_generation",
  tokens: 3700,
  cost: "$0.000370",
  module: "grants"
}
```

### 3. Verificar no Dashboard

1. Settings (⚙️) → Custos de IA
2. Deve aparecer o custo registrado
3. Breakdown por módulo deve mostrar "grants"

### 4. Verificar no Banco

```sql
-- Total de registros tracking
SELECT COUNT(*) FROM ai_usage_analytics;

-- Registros recentes
SELECT
  operation_type,
  ai_model,
  total_tokens,
  total_cost_usd,
  module_type,
  created_at
FROM ai_usage_analytics
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Problema: Tracking não aparece no dashboard

**Verificar:**
1. Migration aplicada? `SELECT * FROM ai_model_pricing;`
2. Registros criados? `SELECT COUNT(*) FROM ai_usage_analytics;`
3. Console tem erros? Abrir DevTools (F12)
4. Função está sendo chamada? Adicionar `console.log` antes de `trackAIUsage`

### Problema: `extractGeminiUsageMetadata` retorna null

**Solução:**
```typescript
// Debug: verificar estrutura do response
console.log('Response structure:', response);
console.log('Usage metadata:', response.usageMetadata);

// Alternativa manual:
trackAIUsage({
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash-exp',
  input_tokens: response.usageMetadata?.promptTokenCount || 0,
  output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
  total_tokens: response.usageMetadata?.totalTokenCount || 0,
  module_type: 'grants'
})
```

### Problema: Erro "operation_type not in enum"

**Solução:**
Use apenas os tipos válidos listados em `src/types/aiCost.ts`:
- `text_generation`
- `image_generation`
- `video_generation`
- `audio_generation`
- `transcription`
- `file_indexing`
- `file_search_query`
- `image_analysis`
- `embedding`

---

## 📈 Próximos Passos

### Curto Prazo (Esta Semana)
1. ✅ Integrar tracking em Grants Module (CONCLUÍDO)
2. ⏳ Integrar em Briefing AI Service
3. ⏳ Integrar em File Search Service
4. ⏳ Testar end-to-end com dados reais

### Médio Prazo (Este Mês)
5. ⏳ Integrar em Podcast Module
6. ⏳ Integrar em Journey Module (se houver IA)
7. ⏳ Integrar em Finance Agent
8. ⏳ Monitorar custos reais e ajustar orçamentos

### Longo Prazo
9. ⏳ Criar alertas automáticos por email
10. ⏳ Implementar rate limiting baseado em budget
11. ⏳ Dashboard de comparação mês a mês
12. ⏳ Relatórios exportáveis (CSV/PDF)

---

## 📚 Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/gemini/pricing.ts` | Preços dos modelos Gemini |
| `src/services/aiUsageTrackingService.ts` | Serviço principal de tracking |
| `src/types/aiCost.ts` | Types TypeScript |
| `src/modules/grants/services/grantAIService.ts` | ✅ Exemplo de integração |
| `src/components/aiCost/AICostDashboard.tsx` | Dashboard frontend |
| `supabase/migrations/EXECUTE_AI_BUDGET_MIGRATION.sql` | Migration de budget |
| `supabase/migrations/TEST_DATA_ai_usage_analytics.sql` | Dados de teste |

---

## 🎓 Exemplo Completo

```typescript
// arquivo: src/modules/exemplo/services/exemploAIService.ts

import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  trackAIUsage,
  extractGeminiUsageMetadata
} from '../../../services/aiUsageTrackingService'

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!)
const MODEL_NAME = 'gemini-2.0-flash-exp'

export async function generateContentWithTracking(
  prompt: string,
  moduleId: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  // 1. Fazer chamada ao Gemini
  const result = await model.generateContent(prompt)
  const response = result.response

  // 2. Extrair metadata
  const usage = extractGeminiUsageMetadata(response)

  // 3. Track (fire-and-forget)
  if (usage) {
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: MODEL_NAME,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      total_tokens: usage.total_tokens,
      module_type: 'exemplo',
      module_id: moduleId,
      request_metadata: {
        action: 'generate_content',
        prompt_length: prompt.length
      }
    }).catch(err => {
      console.warn('[Exemplo] Falha no tracking:', err)
    })
  }

  // 4. Retornar resultado
  return response.text()
}
```

---

## ✅ Checklist de Integração

Para cada módulo:

- [ ] Importar `trackAIUsage` e `extractGeminiUsageMetadata`
- [ ] Identificar todas as chamadas `generateContent`
- [ ] Adicionar bloco de tracking após cada chamada
- [ ] Definir `operation_type` correto
- [ ] Definir `module_type` correto
- [ ] Passar `module_id` quando disponível
- [ ] Adicionar `request_metadata` útil para debug
- [ ] Usar `.catch()` para não quebrar fluxo
- [ ] Testar em dev
- [ ] Verificar registro no dashboard
- [ ] Commit e deploy

---

**Última atualização:** 2025-12-09
**Status:** ✅ Grants Module integrado com sucesso
**Próximo:** Integrar Briefing AI Service
