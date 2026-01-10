# Landing Page "Ordem ao Caos" - Especificação Técnica
**Projeto:** Aica Life OS
**Data:** 2026-01-09
**Versão:** 1.0 - MVP Imersivo

---

## 1. VISÃO GERAL

### 1.1 Objetivo Principal
Criar uma landing page onde o usuário **sente as funcionalidades funcionando** mesmo antes de criar conta. A experiência deve demonstrar o valor core da Aica: transformar **CAOS em ORDEM**.

### 1.2 Proposta de Valor
- ❌ **Antiga:** "Conheça a si mesmo" - abstrato, difícil de tangibilizar
- ✅ **Nova:** "Ordem ao Caos" - concreto, visual, imediatamente compreensível

### 1.3 Diferencial Competitivo
Enquanto outras landing pages **descrevem** funcionalidades, a Aica **demonstra** o valor através de uma experiência interativa que simula o processamento real de dados do usuário.

---

## 2. ANÁLISE DO ESTADO ATUAL

### 2.1 Landing Page Existente
**Arquitetura Atual:**
```
src/modules/onboarding/components/landing/
├── LandingPage.tsx          # Estrutura principal
├── HeroSection.tsx          # "Conheça a si mesmo" (SUBSTITUIR)
├── SocialProof.tsx          # Logos parceiros (MANTER)
├── Features.tsx             # Grid 8 features (REDUZIR → 4 módulos core)
├── HowItWorks.tsx           # 3 passos (TRANSFORMAR)
├── CTASection.tsx           # Waitlist (MANTER)
└── MinimalFooter.tsx        # Footer (MANTER)
```

**Limitações Identificadas:**
1. **Estático:** Nenhuma interatividade além de abrir auth sheet
2. **Abstrato:** "Autoconhecimento" não é tangível visualmente
3. **Passivo:** Usuário apenas lê, não experiencia
4. **Desconexo:** Features são listadas, mas não demonstradas

### 2.2 Infraestrutura Disponível
**WhatsApp + Embeddings (JÁ IMPLEMENTADO):**
```sql
-- Tabela message_embeddings (migration 20251211)
CREATE TABLE message_embeddings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  message_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,  -- text-embedding-004 (Google)
  sentiment JSONB,  -- {score, label, triggers, summary}
  message_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para vector similarity search
CREATE INDEX idx_message_embeddings_embedding
  ON message_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Edge Functions Disponíveis:**
- ✅ `webhook-evolution` - Recebe mensagens WhatsApp via Evolution API
- ✅ `gemini-chat` - Processamento Gemini com embeddings
- ✅ `media-processor` - Transcrição de áudios

**Serviços Frontend:**
- ✅ `whatsappService.ts` - Client para Evolution API
- ✅ `whatsappAnalyticsService.ts` - Análise de conversas
- ✅ `geminiMemoryService.ts` - Geração de embeddings

---

## 3. CONCEITO VISUAL: LAYOUT LADO-A-LADO

### 3.1 Estrutura de Tela
```
┌────────────────────────────────────────────────────┐
│                   AICA Life OS                     │
│            "Ordem ao Caos" (Headline)              │
└────────────────────────────────────────────────────┘
┌─────────────────────┬──────────────────────────────┐
│                     │                              │
│   LADO ESQUERDO     │     LADO DIREITO             │
│   ───────────────   │   ──────────────             │
│   🌪️ CAOS          │   ✨ ORDEM                   │
│                     │                              │
│ • WhatsApp msgs     │ • Atlas (Tarefas)            │
│   flutuando         │ • Journey (Momentos)         │
│ • Desordenadas      │ • Studio (Podcasts)          │
│ • Sobrecarga        │ • Connections (Rede)         │
│ • Informação        │                              │
│   dispersa          │ [Animation: Caos → Módulos]  │
│                     │                              │
│ [Área Interativa]   │ [Cards Organizados]          │
│ Simular msgs        │ Processamento em tempo real  │
└─────────────────────┴──────────────────────────────┘
```

### 3.2 Fluxo de Animação (60fps)
```
Frame 1-30:   Mensagens caóticas aparecem à esquerda (opacity 0→1)
Frame 31-60:  Partículas flutuantes se movem randomicamente
Frame 61-120: Sistema "captura" mensagens (transition left→right)
Frame 121-180: Embeddings sendo gerados (loading dots)
Frame 181-240: Módulos da direita se populam com dados estruturados
Frame 241-300: Cards organizados aparecem (stagger animation)
```

---

## 4. ARQUITETURA TÉCNICA DA DEMO INTERATIVA

### 4.1 Modo Demo (Sem Login)
**Desafio:** Como demonstrar funcionalidade WhatsApp sem acesso real?

**Solução:** Mock interativo com dados sintéticos
```typescript
interface DemoMessage {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'contact';
  chaos_level: number; // 0-100 (quanto mais caótico, mais flutuante)
}

const DEMO_CONVERSATIONS: DemoMessage[] = [
  { text: "Reunião amanhã 14h com João", chaos_level: 80 },
  { text: "Comprar presente aniversário mãe", chaos_level: 90 },
  { text: "Ideia podcast: IA e ética", chaos_level: 85 },
  { text: "Ligar dentista remarcar", chaos_level: 95 },
  // ... 20-30 mensagens variadas
];
```

### 4.2 Pipeline de Processamento (Simulado)
```typescript
// Componente: InteractiveDemoSection.tsx
const processDemoChaos = async (messages: DemoMessage[]) => {
  // ETAPA 1: Extrair intenções (Mock Gemini)
  const intentions = await mockExtractIntentions(messages);

  // ETAPA 2: Gerar embeddings (Mock Google Embeddings)
  const embeddings = await mockGenerateEmbeddings(messages);

  // ETAPA 3: Classificar em módulos
  const classified = classifyToModules(intentions);
  // {
  //   atlas: [task1, task2],
  //   journey: [moment1],
  //   studio: [idea1],
  //   connections: [contact1, contact2]
  // }

  // ETAPA 4: Animar transição caos → ordem
  animateChaosToOrder(classified);
};
```

### 4.3 Componentes Necessários

#### 4.3.1 ChaosVisualization.tsx
```typescript
interface ChaosVisualizationProps {
  messages: DemoMessage[];
  isProcessing: boolean;
}

// Features:
// - Mensagens flutuando com velocidades diferentes
// - Parallax effect no scroll
// - Collision detection entre cards (bouncing)
// - Gradient overlay para profundidade
```

#### 4.3.2 OrderVisualization.tsx
```typescript
interface OrderVisualizationProps {
  processedData: ProcessedModuleData;
  animationStage: 'idle' | 'receiving' | 'organizing' | 'complete';
}

// Features:
// - 4 módulos em grid 2x2
// - Cada módulo recebe dados com stagger (100ms delay)
// - Loading shimmer durante processamento
// - Ceramic design system aplicado
```

#### 4.3.3 ProcessingPipeline.tsx
```typescript
// Visualização do pipeline de processamento
// - Barra de progresso com etapas
// - Ícones animados para cada etapa
// - Contadores de mensagens processadas
// - Tempo estimado (fake, mas realista: ~3-5s)
```

---

## 5. FEATURE TÉCNICA: INTEGRAÇÃO WHATSAPP → EMBEDDINGS

### 5.1 Arquitetura Real (Produção)
```
┌─────────────┐
│ WhatsApp    │
│ (Evolution) │
└──────┬──────┘
       │ Webhook
       ▼
┌─────────────────┐
│ Edge Function   │
│ webhook-evolution│
└──────┬──────────┘
       │ Extract text
       ▼
┌─────────────────┐
│ Gemini API      │
│ text-embedding  │
│ -004 (768dim)   │
└──────┬──────────┘
       │ Store
       ▼
┌─────────────────┐
│ Supabase        │
│ message_        │
│ embeddings      │
│ (pgvector)      │
└─────────────────┘
```

### 5.2 Demo na Landing Page (Mock)
**Opção A: Simulação Completa (Recomendado para MVP)**
- Dados sintéticos pré-processados
- Animações que simulam latência real (2-3s)
- Nenhuma chamada a APIs reais
- 100% client-side

**Opção B: Backend Parcial (Fase 2)**
- Edge Function específica para demo (`demo-process-messages`)
- Recebe texto digitado pelo usuário
- Retorna embeddings reais + classificação
- Rate-limited (5 chamadas/IP/dia)

**Recomendação:** Opção A para MVP, Opção B para validação futura

### 5.3 Demonstração Visual dos Embeddings
```typescript
// Componente: EmbeddingVisualizer.tsx
interface EmbeddingProps {
  vector: number[]; // 768 dimensions
  label: string;
  module: 'atlas' | 'journey' | 'studio' | 'connections';
}

// Visualização:
// 1. Reduzir 768D → 2D (UMAP/t-SNE simulado)
// 2. Plot em canvas com cores por módulo
// 3. Mostrar clusters se formando
// 4. Tooltip com mensagem original
```

---

## 6. ESPECIFICAÇÃO DOS MÓDULOS (4 CORE)

### 6.1 Atlas - Gestão de Tarefas
**Input (Caos):**
- "Reunião amanhã 14h"
- "Comprar presente mãe"
- "Ligar dentista"

**Output (Ordem):**
```typescript
{
  module: 'atlas',
  tasks: [
    {
      title: "Reunião com João",
      scheduled_time: "2026-01-10T14:00:00",
      priority: "urgent_important", // Eisenhower
      source: "whatsapp_message",
      auto_created: true
    },
    {
      title: "Comprar presente para mãe",
      deadline: "2026-01-15",
      priority: "not_urgent_important",
      tags: ["pessoal", "família"]
    }
  ]
}
```

**Visualização:**
- Card com matriz Eisenhower (2x2 grid)
- Tasks aparecem nos quadrantes corretos
- Contagem de tarefas criadas (animate counter)

### 6.2 Journey - Registro de Momentos
**Input (Caos):**
- "Tive uma ideia incrível hoje"
- "Frustrado com reunião"
- "Primeira vez meditando"

**Output (Ordem):**
```typescript
{
  module: 'journey',
  moments: [
    {
      content: "Ideia incrível durante caminhada",
      sentiment: "positive",
      tags: ["insights", "criatividade"],
      consciousness_points: 50
    },
    {
      content: "Frustração na reunião de projeto",
      sentiment: "negative",
      emotional_triggers: ["trabalho", "conflito"],
      consciousness_points: 30
    }
  ]
}
```

**Visualização:**
- Timeline vertical com ícones de sentimento
- XP badges animados (+50 XP)
- Sentiment color coding (verde/amarelo/vermelho)

### 6.3 Studio - Produção de Podcasts
**Input (Caos):**
- "Ideia podcast: IA e ética"
- "Convidar Maria pra entrevista"
- "Tópico: futuro do trabalho"

**Output (Ordem):**
```typescript
{
  module: 'studio',
  episodes: [
    {
      title: "IA e Ética no Século XXI",
      status: "idea",
      potential_guests: ["Maria Silva"],
      topics: ["inteligência artificial", "ética", "tecnologia"],
      research_keywords: ["AI ethics", "machine learning morality"]
    }
  ]
}
```

**Visualização:**
- Card de episódio com preview
- Lista de convidados sugeridos
- Tags de tópicos organizados

### 6.4 Connections - Mapeamento de Relacionamentos
**Input (Caos):**
- Mensagens com 15 contatos diferentes
- Alguns não respondidos há semanas
- Outros com alta frequência

**Output (Ordem):**
```typescript
{
  module: 'connections',
  network: [
    {
      name: "João Silva",
      last_interaction: "2026-01-09",
      interaction_frequency: "daily",
      relationship_health: "strong",
      suggested_action: null
    },
    {
      name: "Pedro Costa",
      last_interaction: "2025-12-15",
      interaction_frequency: "monthly",
      relationship_health: "declining",
      suggested_action: "follow_up_message"
    }
  ]
}
```

**Visualização:**
- Network graph simplificado
- Cores indicando "health score"
- Alerts para conexões negligenadas

---

## 7. DESIGN SYSTEM: CERAMIC APLICADO

### 7.1 Paleta "Caos vs Ordem"
```css
/* CAOS (Esquerda) */
--chaos-bg: linear-gradient(135deg, #F0EFE9 0%, #E5E3DA 100%);
--chaos-card: rgba(255, 255, 255, 0.6); /* Translúcido */
--chaos-shadow: 0 8px 32px rgba(163, 158, 145, 0.3); /* Flutuante */
--chaos-text: #8B8378; /* Desbotado */

/* ORDEM (Direita) */
--order-bg: #F0EFE9; /* Ceramic base */
--order-card: ceramic-card; /* Sólido, neumorphic */
--order-shadow: ceramic-shadow; /* Definido */
--order-text: #5C554B; /* Crisp */

/* TRANSIÇÃO */
--process-gradient: linear-gradient(
  90deg,
  rgba(163, 158, 145, 0.2) 0%,
  rgba(163, 158, 145, 0.8) 50%,
  rgba(163, 158, 145, 0.2) 100%
);
```

### 7.2 Animações Signature
```typescript
// Framer Motion variants
const chaosVariants = {
  initial: {
    x: -100,
    y: Math.random() * 200 - 100,
    rotate: Math.random() * 20 - 10,
    opacity: 0
  },
  animate: {
    x: 0,
    y: [0, -10, 0], // Float effect
    rotate: [0, 5, -5, 0],
    opacity: [0.6, 0.8, 0.6],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const orderVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: (custom) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: custom * 0.1, // Stagger
      duration: 0.5,
      ease: [0.6, 0.05, 0.01, 0.9] // Custom easing
    }
  })
};
```

---

## 8. ROADMAP DE IMPLEMENTAÇÃO

### 8.1 Fase 0: Planejamento (1 dia)
- [x] Especificação técnica completa
- [ ] Review com stakeholders
- [ ] Definir métricas de sucesso (CTR, bounce rate, time on page)

### 8.2 Fase 1: MVP Estático (3 dias)
**Objetivo:** Layout lado-a-lado funcional sem animações

**Tasks:**
1. Criar `LandingPageV5.tsx` (novo componente)
2. Componente `ChaosPanel.tsx` (esquerda)
   - Grid de mensagens mock
   - CSS para layout flutuante
3. Componente `OrderPanel.tsx` (direita)
   - Grid 2x2 dos 4 módulos
   - Cards vazios com ceramic design
4. Atualizar roteamento em `AppRouter.tsx`

**Critério de Sucesso:**
- Layout responsivo (mobile: stack vertical)
- Ceramic design aplicado
- Sem erros de console

### 8.3 Fase 2: Animações Básicas (2 dias)
**Objetivo:** Transição caos → ordem funcional

**Tasks:**
1. Instalar/configurar dependências de animação
   - Framer Motion (já instalado)
   - React Spring (opcional)
2. Implementar animação de entrada no caos
   - Mensagens aparecem com stagger
   - Float effect
3. Implementar transição caos → ordem
   - Mensagens "voam" para direita
   - Desaparecem do caos
   - Aparecem organizadas na ordem

**Critério de Sucesso:**
- 60fps mantido
- Sem jank visual
- Timing natural (não muito rápido/lento)

### 8.4 Fase 3: Processamento Mock (3 dias)
**Objetivo:** Simulação realista de IA processando

**Tasks:**
1. Criar serviço `demoProcessingService.ts`
   - Função `classifyMessages()`
   - Delays realistas (2-3s)
   - Mock embeddings
2. Implementar `ProcessingPipeline.tsx`
   - Barra de progresso
   - Estados: "Analisando...", "Gerando embeddings...", "Organizando..."
3. Popular módulos com dados processados
   - Atlas: 3-5 tarefas
   - Journey: 2-3 momentos
   - Studio: 1-2 ideias
   - Connections: 5-8 contatos

**Critério de Sucesso:**
- Pipeline visualmente claro
- Dados fazem sentido (coerência)
- Usuário entende o que está acontecendo

### 8.5 Fase 4: Interatividade (2 dias)
**Objetivo:** Usuário pode interagir com a demo

**Tasks:**
1. Botão "Processar Meu Caos"
   - Trigger animação completa
   - Reset state ao final
2. Hover states nos cards
   - Zoom leve nos módulos
   - Tooltip com detalhes
3. Click nos módulos
   - Expandir card
   - Mostrar mais informações
   - CTA "Experimentar de Verdade"

**Critério de Sucesso:**
- Interações responsivas (<100ms)
- Feedbacks visuais claros
- CTA bem posicionado

### 8.6 Fase 5: Polish & Otimização (2 dias)
**Objetivo:** Performance e acessibilidade

**Tasks:**
1. Otimizar animações
   - Lazy load componentes pesados
   - Debounce em interações
   - Reduce motion para preferências de acessibilidade
2. Testes de acessibilidade
   - Screen reader friendly
   - Keyboard navigation
   - WCAG AA compliance
3. Testes de performance
   - Lighthouse score >90
   - Mobile performance
   - Slow 3G testing

**Critério de Sucesso:**
- Lighthouse: 90+ em todas métricas
- Sem violações de acessibilidade
- Smooth em dispositivos mid-range

### 8.7 Fase 6: A/B Testing Setup (1 dia)
**Objetivo:** Preparar para validação

**Tasks:**
1. Integrar analytics
   - Google Analytics 4
   - Hotjar (heatmaps)
2. Definir eventos de tracking
   - `demo_started`
   - `demo_completed`
   - `cta_clicked`
   - `module_expanded`
3. Setup A/B test framework
   - 50% tráfego landing antiga
   - 50% tráfego landing nova
   - Duração: 2 semanas

**Critério de Sucesso:**
- Eventos disparando corretamente
- Funnel visualizado no GA4
- A/B split funcionando

---

## 9. MÉTRICAS DE SUCESSO

### 9.1 Quantitativas
| Métrica | Baseline (Antiga) | Target (Nova) | Como Medir |
|---------|-------------------|---------------|------------|
| **Bounce Rate** | ~70% | <50% | GA4 |
| **Time on Page** | ~30s | >90s | GA4 |
| **CTA Click Rate** | ~2% | >8% | GA4 Events |
| **Demo Completion** | N/A | >60% | Custom Event |
| **Scroll Depth** | ~40% | >80% | GA4 |

### 9.2 Qualitativas
- **User Testing (5 usuários):**
  - "O que você entendeu que a Aica faz?"
  - "Você se imagina usando isso?"
  - "O que mais te impressionou?"

- **Heatmaps (Hotjar):**
  - Onde usuários clicam mais?
  - Onde param de scrollar?
  - Quais módulos geram mais interesse?

---

## 10. RISCOS E MITIGAÇÕES

### 10.1 Risco: Complexidade Técnica
**Descrição:** Animações pesadas causam lag
**Probabilidade:** Média
**Impacto:** Alto (má experiência)
**Mitigação:**
- Progressive enhancement (versão estática como fallback)
- Feature detection para dispositivos low-end
- Testes em devices reais desde Fase 2

### 10.2 Risco: Usuários Não Entendem Demo
**Descrição:** Demo é confusa ou não transmite valor
**Probabilidade:** Média
**Impacto:** Alto (não converte)
**Mitigação:**
- User testing em Fase 4
- Tooltips explicativos
- Onboarding de 3 passos antes da demo

### 10.3 Risco: Expectativa vs Realidade
**Descrição:** Demo promete mais do que produto entrega
**Probabilidade:** Baixa
**Impacto:** Médio (churn pós-signup)
**Mitigação:**
- Demo usa funcionalidades REAIS da plataforma
- Messaging claro: "Veja como funciona"
- Onboarding pós-signup alinha expectativas

---

## 11. PRÓXIMOS PASSOS

### 11.1 Imediato (Hoje)
1. ✅ Review desta spec com stakeholder
2. [ ] Aprovação para começar Fase 1
3. [ ] Setup branch `feature/landing-ordem-ao-caos`

### 11.2 Curto Prazo (Esta Semana)
1. [ ] Implementar Fase 1 (MVP Estático)
2. [ ] Criar mockups hi-fi no Figma (opcional)
3. [ ] Setup ambiente de testes

### 11.3 Médio Prazo (Próximas 2 Semanas)
1. [ ] Completar Fases 2-5
2. [ ] User testing com 5 usuários
3. [ ] Ajustes baseados em feedback

### 11.4 Longo Prazo (Mês)
1. [ ] Deploy em staging
2. [ ] A/B testing por 2 semanas
3. [ ] Decisão: substituir landing antiga ou manter ambas

---

## 12. REFERÊNCIAS TÉCNICAS

### 12.1 Arquivos Relevantes
```
src/modules/onboarding/components/landing/
├── LandingPageV5.tsx              # NOVO - Landing "Ordem ao Caos"
├── components/
│   ├── ChaosPanel.tsx             # NOVO - Visualização caos
│   ├── OrderPanel.tsx             # NOVO - Visualização ordem
│   ├── ProcessingPipeline.tsx     # NOVO - Pipeline animado
│   └── ModuleCards/
│       ├── AtlasCard.tsx          # NOVO - Card Atlas
│       ├── JourneyCard.tsx        # NOVO - Card Journey
│       ├── StudioCard.tsx         # NOVO - Card Studio
│       └── ConnectionsCard.tsx    # NOVO - Card Connections
└── services/
    └── demoProcessingService.ts   # NOVO - Mock processing

supabase/migrations/
└── 20251211_message_embeddings.sql # EXISTENTE - Schema embeddings

src/services/
├── whatsappService.ts             # EXISTENTE - Cliente WhatsApp
└── geminiMemoryService.ts         # EXISTENTE - Embeddings service
```

### 12.2 Dependências
```json
{
  "dependencies": {
    "framer-motion": "^11.x", // Já instalado
    "react-spring": "^9.x",   // Opcional, para animações físicas
    "d3-scale": "^4.x",       // Para embedding visualization
    "tsparticles": "^3.x"     // Opcional, para efeitos de partículas
  }
}
```

### 12.3 Migrations Relevantes
- `20251211_message_embeddings.sql` - Tabela de embeddings
- `20251230_whatsapp_messages.sql` - Tabela de mensagens WhatsApp
- `20251231_whatsapp_sentiment_aggregates.sql` - Análise de sentimento

---

## 13. CONCLUSÃO

Esta especificação define uma landing page **radicalmente diferente** que:

1. **Demonstra, não descreve** - Usuário vê a IA funcionando
2. **Tangibiliza valor** - "Ordem ao Caos" é visual e imediato
3. **Usa tech real** - Embeddings e processamento são conceitos reais da plataforma
4. **É imersiva** - 90s de interação vs 30s de leitura passiva

A implementação em fases permite validação incremental, reduzindo risco e permitindo ajustes baseados em feedback real.

**Estimativa Total:** 12-14 dias de desenvolvimento
**ROI Esperado:** 3-4x melhoria em conversão (CTA clicks)

---

**Aprovado por:** [Stakeholder]
**Data de Início:** [TBD]
**Data Prevista de Conclusão:** [TBD]
