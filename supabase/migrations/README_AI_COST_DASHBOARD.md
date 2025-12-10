# AI Cost Dashboard - Setup Guide

Este guia orienta a configuração do Dashboard de Custos de IA no Aica Life OS.

## 1. Aplicar Migrations

Execute as seguintes migrations no Supabase SQL Editor (nesta ordem):

### a) Migration principal de budget
```sql
-- Arquivo: 20251209000000_add_ai_budget_to_users.sql
-- Adiciona funções para gerenciar orçamento de IA
```

Navegue até: **Supabase Dashboard → SQL Editor → New Query**

Cole o conteúdo do arquivo `20251209000000_add_ai_budget_to_users.sql` e execute.

## 2. Criar Dados de Teste (Opcional)

Para testar o dashboard com dados realistas:

### a) Obter seu User ID
No SQL Editor, execute:
```sql
SELECT id, email FROM auth.users WHERE email = 'seu-email@exemplo.com';
```

### b) Popular dados de teste
1. Abra o arquivo `TEST_DATA_ai_usage_analytics.sql`
2. **IMPORTANTE**: Substitua `'YOUR_USER_ID_HERE'` pelo UUID obtido no passo anterior
3. Execute o script no SQL Editor

O script irá criar:
- ~90 registros de uso de IA nos últimos 30 dias
- Variação realística de custos ao longo do tempo
- Diferentes tipos de operações (text generation, transcription, file search, etc)
- Diferentes modelos (gemini-2.0-flash-exp, veo-2, imagen-3)
- Custo total estimado: ~$12-15 USD

### c) Verificar dados criados
```sql
-- Total de registros
SELECT COUNT(*) as total_records FROM ai_usage_analytics;

-- Custo total dos últimos 30 dias
SELECT SUM(total_cost_usd) as total_cost_last_30_days
FROM ai_usage_analytics
WHERE created_at >= CURRENT_DATE - 30;

-- Breakdown por operação
SELECT operation_type, COUNT(*) as count, SUM(total_cost_usd) as total_cost
FROM ai_usage_analytics
GROUP BY operation_type
ORDER BY total_cost DESC;
```

## 3. Configurar Orçamento

Após fazer login no Aica Life OS:

1. Clique no ícone de **Settings** (engrenagem) no canto superior direito
2. Clique em **"Custos de IA"** no menu dropdown
3. No dashboard, clique no botão **"Orçamento"**
4. Defina um valor (sugestão para teste: $50.00)
5. Clique em **"Salvar"**

## 4. Testar Funcionalidades

### ✅ Checklist de Testes

- [ ] **Dashboard carrega corretamente** - Todos os cards e charts aparecem
- [ ] **Monthly Cost Card** - Mostra custo atual, orçamento e progresso
- [ ] **Cost Trend Chart** - Gráfico de linha dos últimos 30 dias
- [ ] **Operation Breakdown** - Gráfico de rosca com breakdown por tipo
- [ ] **Model Breakdown** - Gráfico de barras com breakdown por modelo
- [ ] **Top 5 Operations** - Tabela com operações mais caras
- [ ] **Budget Modal** - Abre ao clicar em "Orçamento"
- [ ] **Budget Update** - Salva novo orçamento e atualiza dashboard
- [ ] **Budget Alert** - Banner de alerta aparece quando >80% do orçamento
- [ ] **Refresh Button** - Recarrega dados ao clicar
- [ ] **Back Button** - Retorna para a tela principal

### Testar Empty States

Para testar o dashboard sem dados:

```sql
-- Deletar dados de teste (CUIDADO!)
DELETE FROM ai_usage_analytics WHERE user_id = 'SEU_USER_ID';
```

- [ ] Dashboard mostra mensagens apropriadas quando não há dados
- [ ] Charts exibem estado vazio

### Testar Responsividade

- [ ] **Desktop (>1024px)** - Todos os elementos visíveis
- [ ] **Tablet (768-1024px)** - Layout ajusta corretamente
- [ ] **Mobile (<768px)** - Tabela oculta colunas menos importantes

## 5. Estrutura do Dashboard

### Components Criados

```
src/components/aiCost/
├── AICostDashboard.tsx          # Container principal
├── MonthlyCostCard.tsx          # Card de resumo mensal
├── CostTrendChart.tsx           # Gráfico de tendência (SVG)
├── OperationBreakdownChart.tsx  # Gráfico de rosca (SVG)
├── ModelBreakdownChart.tsx      # Gráfico de barras (SVG)
├── BudgetAlertBanner.tsx        # Banner de alerta
├── TopExpensiveOperationsTable.tsx  # Tabela top 5
└── BudgetSettingsModal.tsx      # Modal de configuração
```

### Services Criados

```
src/services/
├── aiCostAnalyticsService.ts    # Serviço de analytics
└── userSettingsService.ts       # Serviço de preferências
```

### Types Criados

```
src/types/
└── aiCost.ts                    # Tipos TypeScript completos
```

## 6. Integração com Módulos

O sistema de tracking está pronto para ser integrado com:

- **Grants** - Tracking de file search, text generation
- **Podcast** - Tracking de transcription, video generation
- **Journey** - Tracking de image analysis
- **Finance** - Tracking de chat interactions
- **Atlas** - Tracking de task suggestions

Para adicionar tracking em um módulo, use:

```typescript
import { trackAIUsage } from '../services/aiCostAnalyticsService';

// Após fazer uma chamada à API Gemini
await trackAIUsage({
  user_id: userId,
  operation_type: 'text_generation',
  ai_model: 'gemini-2.0-flash-exp',
  input_tokens: response.usageMetadata.promptTokenCount,
  output_tokens: response.usageMetadata.candidatesTokenCount,
  total_tokens: response.usageMetadata.totalTokenCount,
  total_cost_usd: calculateCost(response.usageMetadata),
  module_type: 'grants',
  module_id: projectId
});
```

## 7. Troubleshooting

### Problema: Dashboard não carrega
- Verifique se as migrations foram aplicadas
- Verifique o console do navegador para erros
- Confirme que o user_id está correto

### Problema: Charts não aparecem
- Verifique se existem dados em `ai_usage_analytics`
- Execute as queries de verificação na seção 2c

### Problema: Budget não salva
- Verifique RLS policies na tabela `auth.users`
- Confirme que o usuário está autenticado
- Verifique logs no console

## 8. Preços de Referência (Gemini)

Para configuração de custos realísticos:

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|----------------------|------------------------|
| gemini-2.0-flash-exp | $0.10 | $0.40 |
| gemini-1.5-pro | $1.25 | $5.00 |
| gemini-1.5-flash | $0.075 | $0.30 |

| Serviço | Preço |
|---------|-------|
| File Search (indexing) | $0.15/1000 docs |
| File Search (query) | $0.05/query |
| Transcription | $0.025/min |
| Video Generation (Veo) | ~$5/minute |
| Image Generation (Imagen) | ~$2/image |

---

**Status**: ✅ Dashboard implementado e pronto para uso
**Última atualização**: 2025-12-09
