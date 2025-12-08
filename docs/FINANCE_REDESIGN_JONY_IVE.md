# Finance Module Redesign - Jony Ive Style
## Filosofia de Design

**"Simplicity is the ultimate sophistication"** - Steve Jobs

### Princípios:
1. **Minimalismo Radical**: Remover tudo que não é essencial
2. **Hierarquia Clara**: O mais importante domina visualmente
3. **Espaço em Branco**: Deixar a informação respirar
4. **Tipografia Forte**: Números grandes e bold para informações críticas
5. **Cor com Propósito**: Usar cor apenas para comunicar significado

---

## Problemas Identificados

### 1. Saldo Acumulado Incorreto ✅ CORRIGIDO
- **Problema**: Mostrava R$ 13.046,21 ao invés de R$ 1.833,76
- **Causa**: Somava todas as transações sem considerar saldo inicial
- **Solução**: Usar `closing_balance` do último statement

### 2. Categorização Pobre (82% em "Outros")
- **Problema**: Gemini AI não está categorizando corretamente
- **Causas Possíveis**:
  - Prompt do Gemini muito genérico
  - Descrições das transações ruins
  - Falta de contexto brasileiro
- **Soluções**:
  - Melhorar prompt com exemplos brasileiros
  - Adicionar keywords específicas (Pix, TED, Ifood, etc.)
  - Implementar ML local para re-categorização

### 3. Foco Errado
- **Problema**: Dashboard mostra dados passados, não ajuda no planejamento
- **Solução**: Nova view focada em ORÇAMENTO MENSAL

---

## Nova Arquitetura de Informação

### View Principal: "Meu Orçamento"

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    DEZEMBRO 2025                        │
│                                                         │
│              R$ 1.833,76 disponível                     │
│              ━━━━━━━━━━━━━━━━━━━━━━                    │
│              de R$ 3.500,00 planejados                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Categorias com Progress Bars

```
┌─────────────────────────────────────────────────────────┐
│ 🏠 Moradia                  R$ 1.200 / R$ 1.500         │
│ ████████████████░░░░  80%                               │
│                                                         │
│ 🍽️  Alimentação            R$ 450 / R$ 800             │
│ ████████████░░░░░░░░  56%                               │
│                                                         │
│ 🚗 Transporte              R$ 320 / R$ 400              │
│ ████████████████░░░░  80%                               │
│                                                         │
│ 💡 Serviços                R$ 180 / R$ 250              │
│ ██████████████░░░░░░  72%                               │
│                                                         │
│ 🎬 Lazer                   R$ 95 / R$ 200               │
│ █████████░░░░░░░░░░░  48%                               │
│                                                         │
│ 📦 Outros                  R$ 40 / R$ 150               │
│ █████░░░░░░░░░░░░░░░  27%                               │
└─────────────────────────────────────────────────────────┘
```

### Previsões Inteligentes

```
┌─────────────────────────────────────────────────────────┐
│                    PROJEÇÃO DO MÊS                      │
│                                                         │
│  Com base no seu histórico:                             │
│                                                         │
│  • Alimentação tende a aumentar R$ 150 na última semana│
│  • Você tem conta de luz vencendo em 5 dias (R$ 180)   │
│  • Padrão indica mais R$ 200 em transporte até dia 30  │
│                                                         │
│  📊 Saldo previsto: R$ 1.303,76                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes Redesenhados

### 1. Hero Section - Saldo do Mês
```tsx
<div className="h-screen flex items-center justify-center">
  <div className="text-center">
    <p className="text-sm uppercase tracking-widest text-gray-400 mb-4">
      Dezembro 2025
    </p>
    <h1 className="text-9xl font-thin text-gray-900 mb-2">
      R$ 1.833,76
    </h1>
    <p className="text-lg text-gray-500">
      disponível de R$ 3.500 planejados
    </p>
  </div>
</div>
```

### 2. Category Card - Minimalista
```tsx
<div className="group hover:bg-gray-50 transition p-6 rounded-2xl">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🏠</span>
      <h3 className="text-lg font-medium">Moradia</h3>
    </div>
    <div className="text-right">
      <p className="text-2xl font-bold">R$ 1.200</p>
      <p className="text-sm text-gray-500">de R$ 1.500</p>
    </div>
  </div>

  {/* Progress Bar */}
  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full bg-blue-500 transition-all duration-500"
      style={{ width: '80%' }}
    />
  </div>

  {/* Alert if > 90% */}
  {percentage > 90 && (
    <p className="text-xs text-orange-600 mt-2">
      ⚠️ Você já gastou 95% do orçamento desta categoria
    </p>
  )}
</div>
```

### 3. Smart Insights - IA Proativa
```tsx
<div className="bg-gradient-to-r from-blue-50 to-transparent p-6 rounded-2xl border border-blue-100">
  <div className="flex gap-4">
    <div className="text-4xl">💡</div>
    <div>
      <h4 className="font-bold mb-2">Insight: Padrão Detectado</h4>
      <p className="text-gray-600 text-sm leading-relaxed">
        Você tende a gastar R$ 150 a mais em alimentação nas duas
        últimas semanas do mês. Considere ajustar seu orçamento.
      </p>
    </div>
  </div>
</div>
```

---

## Estrutura de Navegação

### 1. View: "Meu Orçamento" (Default)
- Hero com saldo disponível
- Categorias com progress bars
- Insights e previsões

### 2. View: "Histórico"
- Timeline mensal (Cards minimalistas)
- Cobertura 2025 (já existe, melhorar)

### 3. View: "Configurações"
- Definir orçamento por categoria
- Ajustar categorização manual
- Gerenciar extratos

---

## Paleta de Cores - Minimalista

### Cores Principais
```css
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-900: #111827;
```

### Cores de Status
```css
--green-500: #10b981;  /* Meta atingida */
--blue-500: #3b82f6;    /* Progresso normal */
--orange-500: #f59e0b;  /* Atenção (> 80%) */
--red-500: #ef4444;     /* Alerta (> 100%) */
```

### Cores de Categorias
```css
--category-housing: #6366f1;    /* Indigo */
--category-food: #f59e0b;       /* Amber */
--category-transport: #10b981;  /* Green */
--category-health: #ec4899;     /* Pink */
--category-entertainment: #8b5cf6; /* Purple */
--category-other: #6b7280;      /* Gray */
```

---

## Melhorias de Categorização

### Prompt Melhorado para Gemini AI

```
Você é um especialista em categorização de transações financeiras brasileiras.

Categorias disponíveis:
1. 🏠 housing (Moradia): Aluguel, condomínio, IPTU, reformas, móveis
2. 🍽️  food (Alimentação): Supermercado, restaurante, delivery, Ifood, Rappi
3. 🚗 transport (Transporte): Uber, 99, combustível, estacionamento, manutenção
4. 💊 health (Saúde): Farmácia, consultas, exames, plano de saúde
5. 📚 education (Educação): Cursos, livros, mensalidade, material escolar
6. 🎬 entertainment (Lazer): Cinema, streaming, shows, viagens
7. 🛍️  shopping (Compras): Roupas, eletrônicos, presentes
8. 💰 salary (Salário): Salário, bonificação, 13º
9. 💼 freelance (Freelance): Trabalhos autônomos, consultorias
10. 📈 investment (Investimento): Ações, fundos, tesouro direto
11. 🔄 transfer (Transferência): Pix, TED, DOC entre contas próprias
12. 📦 other (Outros): Apenas se não couber em nenhuma categoria

Palavras-chave brasileiras:
- Pix, TED, DOC = transfer
- Ifood, Rappi, Uber Eats = food
- Uber, 99 = transport
- Netflix, Spotify, Prime = entertainment
- Mercado, supermercado = food
- Drogaria, farmácia = health

IMPORTANTE: Categorize com 95% de confiança ou mais. Se tiver dúvida, use 'other'.

Transação: {description}
Categorize em UMA palavra das opções acima.
```

---

## Métricas de Sucesso

### Antes vs Depois

| Métrica | Antes | Meta |
|---------|-------|------|
| Transações em "Outros" | 82% | < 15% |
| Tempo para entender gastos | ~5min | < 30s |
| Usuário define orçamento | 0% | > 80% |
| Ações preventivas | 0 | > 5/mês |

---

## Próximos Passos

### Fase 1: Correções Críticas ✅
- [x] Corrigir saldo acumulado
- [ ] Melhorar categorização do Gemini AI

### Fase 2: Novo Layout
- [ ] Criar BudgetView component
- [ ] Implementar Category Progress Bars
- [ ] Hero Section com saldo grande

### Fase 3: Inteligência
- [ ] Sistema de previsão de gastos
- [ ] Insights automáticos
- [ ] Alertas proativos

### Fase 4: Configuração
- [ ] Permitir definir orçamentos por categoria
- [ ] Re-categorização manual
- [ ] Metas personalizadas
