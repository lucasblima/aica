# Skills Issue Mapping

Documento de mapeamento entre issues abertas e skills disponíveis no Claude Code para o projeto AICA.

**Última Atualização:** 2 de Janeiro de 2026
**Total de Issues Mapeadas:** 7
**Skills Existentes:** 5
**Novas Skills Sugeridas:** 5

---

## Visão Geral

### Matriz de Cobertura

```
                    Skills Existentes                    │ Novas Skills Sugeridas
                    ─────────────────────────────────────│────────────────────────────────────────
Issue               oauth  aica   cloud  docs   issue   │ auth   ai     comp   api    prod
                    gcp    dev    run    std    mgmt    │ supa   integ  patt   integ  plan
────────────────────────────────────────────────────────│────────────────────────────────────────
#28 PKCE OAuth      ██░░   ░░░░   ░░░░   ░░░░   ░░░░   │ ████   ░░░░   ░░░░   ░░░░   ░░░░
#24 Roadmap         ░░░░   ░░░░   ░░░░   ██░░   ██░░   │ ░░░░   ░░░░   ░░░░   ░░░░   ████
#23 Landing         ░░░░   ████   ░░░░   ░░░░   ░░░░   │ ░░░░   ░░░░   ████   ░░░░   ░░░░
#21 IA Studio       ░░░░   ██░░   ░░░░   ░░░░   ░░░░   │ ░░░░   ████   ░░░░   ██░░   ░░░░
#20 VacationTime    ░░░░   ████   ░░░░   ██░░   ░░░░   │ ░░░░   ░░░░   ████   ░░░░   ░░░░
#15 GuestWizard     ░░░░   ████   ░░░░   ████   ████   │ ░░░░   ░░░░   ████   ░░░░   ░░░░
#8  ElevenLabs      ░░░░   ██░░   ░░░░   ░░░░   ░░░░   │ ░░░░   ████   ░░░░   ████   ░░░░
────────────────────────────────────────────────────────│────────────────────────────────────────
Legenda: ████ Alta relevância  ██░░ Média relevância  ░░░░ Baixa/Nenhuma
```

---

## Análise Detalhada por Issue

---

## Issue #28: Erro 401 PKCE OAuth

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | 🔴 Bug Crítico |
| **Área** | Autenticação |
| **Prioridade** | CRÍTICA - Bloqueante |
| **Complexidade** | Alta |

### Descrição do Problema

Erro 401 (Unauthorized) durante fluxo OAuth com PKCE (Proof Key for Code Exchange) no Supabase SSR. Provavelmente relacionado a:
- Configuração incorreta de code_verifier/code_challenge
- Cookies não sendo persistidos corretamente
- Redirect URI mismatch
- Problemas de CORS ou domínio

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `google-cloud-oauth.md` | 🟡 Média | Troubleshooting OAuth, Redirect URIs |
| `aica-development.md` | 🔴 Baixa | Estrutura de services |
| `cloud-run-deployment.md` | 🔴 Baixa | Variáveis de ambiente |

### Gap Identificado

**Nenhuma skill cobre especificamente:**
- Fluxo PKCE do Supabase
- Configuração de cookies SSR
- Debug de OAuth code exchange
- Supabase Auth helpers (@supabase/ssr)

### Nova Skill Sugerida

```
📁 supabase-auth.md

Conteúdo necessário:
- Fluxo PKCE explicado
- Configuração @supabase/ssr
- Cookies e session management
- Debug de erros 401/403
- Redirect URIs por ambiente
- Code verifier troubleshooting
```

### Ações Recomendadas

```markdown
1. [ ] Criar skill supabase-auth.md
2. [ ] Verificar código em src/services/supabaseClient.ts
3. [ ] Verificar configuração de cookies
4. [ ] Validar redirect URIs no Supabase Dashboard
5. [ ] Testar fluxo em ambiente limpo (incognito)
```

---

## Issue #24: Roadmap Monetização

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | 📋 Planejamento |
| **Área** | Produto/Negócio |
| **Prioridade** | Média |
| **Complexidade** | Média (documentação) |

### Descrição do Problema

Necessidade de criar roadmap estruturado para estratégia de monetização do produto, incluindo:
- Modelos de precificação
- Features por tier
- Timeline de implementação
- Métricas de sucesso

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `documentation-standards.md` | 🟢 Alta | Estrutura de épicos, Timeline |
| `issue-management.md` | 🟢 Alta | Milestones, Roadmap |
| `aica-development.md` | 🔴 Baixa | - |

### Gap Identificado

**Nenhuma skill cobre especificamente:**
- Templates de roadmap de produto
- Estrutura de decisões de negócio
- Documentação de estratégia
- Análise de mercado/competidores
- Modelos de monetização SaaS

### Nova Skill Sugerida

```
📁 product-planning.md

Conteúdo necessário:
- Templates de roadmap
- Estrutura de PRD (Product Requirements Doc)
- Modelos de monetização SaaS
- Análise de competidores
- OKRs e métricas de produto
- User research templates
- Feature prioritization frameworks
```

### Ações Recomendadas

```markdown
1. [ ] Criar skill product-planning.md
2. [ ] Criar documento docs/MONETIZATION_ROADMAP.md
3. [ ] Definir tiers de produto (Free, Pro, Enterprise)
4. [ ] Mapear features por tier
5. [ ] Criar timeline de implementação
```

---

## Issue #23: Redesenhar Landing

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | 🎨 Refactor UI |
| **Área** | Frontend/Design |
| **Prioridade** | Média |
| **Complexidade** | Média |

### Descrição do Problema

Redesenho da landing page para melhorar conversão e alinhar com identidade visual atualizada. Pode incluir:
- Novo hero section
- Melhor apresentação de features
- Otimização para mobile
- Melhoria de performance (LCP, CLS)

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `aica-development.md` | 🟢 Alta | Design System, Componentes |
| `documentation-standards.md` | 🟡 Média | Documentação de componentes |

### Gap Identificado

**Nenhuma skill cobre especificamente:**
- Padrões de componentes React avançados
- Design patterns (Compound Components, Render Props)
- Performance de componentes (memoization, virtualization)
- Acessibilidade (WCAG)
- Animações (Framer Motion patterns)
- Responsive design patterns

### Nova Skill Sugerida

```
📁 component-patterns.md

Conteúdo necessário:
- Compound Components pattern
- Render Props pattern
- Custom Hooks patterns
- Performance optimization
- Accessibility guidelines
- Animation patterns (Framer Motion)
- Responsive design patterns
- Testing patterns para componentes
```

### Ações Recomendadas

```markdown
1. [ ] Criar skill component-patterns.md
2. [ ] Auditar landing atual (Lighthouse)
3. [ ] Criar wireframes/mockups
4. [ ] Implementar em branch separada
5. [ ] A/B testing se possível
```

### Arquivos Relacionados

```
src/modules/onboarding/components/landing-v3/
├── LandingPageV3.tsx
├── HeroMonolith.tsx
├── BentoGridDense.tsx
├── FeatureStrip.tsx
└── CTASection.tsx
```

---

## Issue #21: Sugestões IA Aica Studio

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | ✨ Feature AI |
| **Área** | AI/ML, Studio Module |
| **Prioridade** | Alta |
| **Complexidade** | Alta |

### Descrição do Problema

Implementar sistema de sugestões inteligentes no módulo Studio usando IA para:
- Sugerir tópicos de podcast
- Recomendar estrutura de episódios
- Gerar roteiros base
- Sugerir convidados relevantes

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `aica-development.md` | 🟢 Alta | Integração Gemini, Estrutura módulos |
| `documentation-standards.md` | 🟡 Média | Documentação de features |

### Gap Identificado

**Nenhuma skill cobre especificamente:**
- Padrões de integração com LLMs
- Prompt engineering
- Streaming responses
- Rate limiting e caching
- Error handling para APIs de IA
- Estrutura de agentes/workflows IA

### Nova Skill Sugerida

```
📁 ai-integration.md

Conteúdo necessário:
- Integração Google Gemini (patterns)
- Prompt engineering guidelines
- Streaming responses handling
- Rate limiting strategies
- Caching de respostas
- Error handling e fallbacks
- Token management
- Custo tracking
- Testing de features IA
```

### Ações Recomendadas

```markdown
1. [ ] Criar skill ai-integration.md
2. [ ] Definir prompts para cada tipo de sugestão
3. [ ] Implementar serviço de sugestões
4. [ ] Adicionar caching para reduzir custos
5. [ ] Criar UI para exibir sugestões
6. [ ] Tracking de uso de tokens
```

### Arquivos Relacionados

```
src/modules/studio/
├── services/
│   └── studioAIService.ts (criar)
├── hooks/
│   └── useAISuggestions.ts (criar)
└── components/
    └── AISuggestionsPanel.tsx (criar)

src/lib/gemini/
├── client.ts
├── prompts/
│   └── studio-prompts.ts (criar)
```

---

## Issue #20: VacationTimeline

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | 🧩 Novo Componente |
| **Área** | Frontend/Components |
| **Prioridade** | Média |
| **Complexidade** | Média |

### Descrição do Problema

Criar componente VacationTimeline para visualização de período de férias/viagens com:
- Timeline visual de dias
- Marcação de eventos por dia
- Integração com calendar
- Estados (planejado, atual, passado)

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `aica-development.md` | 🟢 Alta | Estrutura componentes, Hooks |
| `documentation-standards.md` | 🟢 Alta | README de componente |

### Gap Identificado

**Parcialmente coberto, mas falta:**
- Padrões específicos de componentes de timeline
- Integração com date-fns
- Padrões de drag-and-drop (dnd-kit)
- Virtualization para listas longas

### Nova Skill Sugerida

Coberto parcialmente por `component-patterns.md` (sugerida acima)

Adicionar seção específica:
```
## Timeline Components

- Estrutura de timeline
- Date handling (date-fns)
- Drag and drop (dnd-kit)
- Virtualization (tanstack-virtual)
- Accessibility para calendários
```

### Ações Recomendadas

```markdown
1. [ ] Definir API do componente
2. [ ] Criar estrutura de dados para eventos
3. [ ] Implementar componente base
4. [ ] Adicionar interatividade (drag-drop)
5. [ ] Integrar com Google Calendar (opcional)
6. [ ] Criar testes e documentação
```

### Template de Componente

```typescript
// src/components/VacationTimeline/VacationTimeline.tsx

interface VacationTimelineProps {
  startDate: Date;
  endDate: Date;
  events?: VacationEvent[];
  onEventClick?: (event: VacationEvent) => void;
  onDayClick?: (date: Date) => void;
  viewMode?: 'compact' | 'expanded';
}

interface VacationEvent {
  id: string;
  title: string;
  date: Date;
  type: 'flight' | 'hotel' | 'activity' | 'restaurant';
  status: 'planned' | 'confirmed' | 'completed';
}
```

---

## Issue #15: GuestIdentificationWizard

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | 🎯 Epic |
| **Área** | Podcast Module |
| **Prioridade** | Alta |
| **Complexidade** | Alta |

### Descrição do Problema

Criar wizard completo para identificação e gerenciamento de convidados de podcast:
- Busca de perfis (LinkedIn, Twitter)
- Importação de dados
- Qualificação de convidados
- Agendamento de contato
- Tracking de status

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `aica-development.md` | 🟢 Alta | Estrutura módulos, Services |
| `documentation-standards.md` | 🟢 Alta | Estrutura épicos |
| `issue-management.md` | 🟢 Alta | Breakdown em issues menores |

### Gap Identificado

**Nenhuma skill cobre especificamente:**
- Padrões de wizard/multi-step forms
- Integração com APIs sociais
- Scraping ético de dados públicos
- Padrões de state machine para wizards

### Nova Skill Sugerida

Adicionar a `component-patterns.md`:
```
## Wizard/Multi-Step Patterns

- State machine para wizards (XState)
- Form persistence entre steps
- Validation por step
- Progress tracking
- Error recovery
```

E criar `api-integrations.md` para:
```
## Social APIs Integration

- LinkedIn API
- Twitter/X API
- Rate limiting
- Data normalization
- Caching strategies
```

### Ações Recomendadas

```markdown
1. [ ] Quebrar epic em issues menores
2. [ ] Definir steps do wizard
3. [ ] Criar state machine
4. [ ] Implementar cada step
5. [ ] Integrar APIs externas
6. [ ] Criar testes E2E
```

### Estrutura Sugerida do Wizard

```
GuestIdentificationWizard/
├── steps/
│   ├── Step1_Search.tsx
│   ├── Step2_Select.tsx
│   ├── Step3_Qualify.tsx
│   ├── Step4_Contact.tsx
│   └── Step5_Confirm.tsx
├── hooks/
│   └── useWizardState.ts
├── services/
│   └── guestSearchService.ts
└── GuestIdentificationWizard.tsx
```

---

## Issue #8: Integração ElevenLabs

### Informações

| Campo | Valor |
|-------|-------|
| **Tipo** | 🔌 Feature API |
| **Área** | Integrações/AI |
| **Prioridade** | Média |
| **Complexidade** | Alta |

### Descrição do Problema

Integrar ElevenLabs para síntese de voz no módulo Studio:
- Text-to-Speech para preview de roteiros
- Clonagem de voz (se permitido)
- Geração de áudio para episódios
- Seleção de vozes

### Skills Aplicáveis

| Skill | Relevância | Seções Úteis |
|-------|------------|--------------|
| `aica-development.md` | 🟡 Média | Estrutura services |
| `cloud-run-deployment.md` | 🟡 Média | Secrets para API key |

### Gap Identificado

**Nenhuma skill cobre especificamente:**
- Integração com APIs de áudio/voz
- Handling de arquivos de áudio
- Streaming de áudio
- Playback e controles de áudio
- Rate limiting para APIs pagas

### Novas Skills Sugeridas

```
📁 ai-integration.md
Adicionar seção:
- ElevenLabs API integration
- Audio streaming
- Voice selection
- Cost optimization

📁 api-integrations.md
Conteúdo:
- External API patterns
- Authentication strategies
- Rate limiting
- Error handling
- Webhook handling
- File uploads/downloads
```

### Ações Recomendadas

```markdown
1. [ ] Criar skill ai-integration.md
2. [ ] Criar skill api-integrations.md
3. [ ] Criar conta ElevenLabs
4. [ ] Adicionar API key ao Secret Manager
5. [ ] Implementar serviço de TTS
6. [ ] Criar componente de player
7. [ ] Implementar seleção de vozes
```

### Estrutura de Integração

```typescript
// src/services/elevenLabsService.ts

interface ElevenLabsConfig {
  apiKey: string;
  defaultVoiceId: string;
  modelId: string;
}

interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function textToSpeech(options: TextToSpeechOptions): Promise<Blob>;
export async function getVoices(): Promise<Voice[]>;
export async function streamAudio(options: TextToSpeechOptions): AsyncGenerator<ArrayBuffer>;
```

---

## Resumo de Novas Skills Necessárias

### Skills a Criar

| Skill | Prioridade | Issues Relacionadas | Esforço |
|-------|------------|---------------------|---------|
| `supabase-auth.md` | 🔴 CRÍTICA | #28 | 3-4h |
| `ai-integration.md` | 🔴 Alta | #21, #8 | 4-5h |
| `component-patterns.md` | 🟡 Média | #23, #20, #15 | 4-5h |
| `api-integrations.md` | 🟡 Média | #8, #15 | 3-4h |
| `product-planning.md` | 🟢 Baixa | #24 | 2-3h |

### Ordem de Criação Recomendada

```
1. supabase-auth.md      → Desbloqueia #28 (bug crítico)
2. ai-integration.md     → Desbloqueia #21, #8
3. component-patterns.md → Desbloqueia #23, #20, #15
4. api-integrations.md   → Complementa #8, #15
5. product-planning.md   → Suporte para #24
```

---

## Cobertura Atual vs Desejada

### Antes (5 skills)

```
Área                    │ Cobertura
────────────────────────│──────────
OAuth/Google Cloud      │ ████████░░ 80%
Desenvolvimento AICA    │ ████████░░ 80%
Deploy Cloud Run        │ ████████░░ 80%
Documentação            │ ████████░░ 80%
Issue Management        │ ████████░░ 80%
────────────────────────│──────────
Autenticação Supabase   │ ░░░░░░░░░░  0%
Integração IA           │ ██░░░░░░░░ 20%
Padrões Componentes     │ ████░░░░░░ 40%
APIs Externas           │ ██░░░░░░░░ 20%
Planejamento Produto    │ ██░░░░░░░░ 20%
```

### Depois (10 skills)

```
Área                    │ Cobertura
────────────────────────│──────────
OAuth/Google Cloud      │ ████████░░ 80%
Desenvolvimento AICA    │ ████████░░ 80%
Deploy Cloud Run        │ ████████░░ 80%
Documentação            │ ████████░░ 80%
Issue Management        │ ████████░░ 80%
────────────────────────│──────────
Autenticação Supabase   │ ██████████ 100%
Integração IA           │ ████████░░ 80%
Padrões Componentes     │ ████████░░ 80%
APIs Externas           │ ████████░░ 80%
Planejamento Produto    │ ████████░░ 80%
```

---

## Ações Imediatas

### Prioridade 1 (Esta Semana)

```markdown
- [ ] Criar `supabase-auth.md` para desbloquear #28
- [ ] Resolver bug #28 usando nova skill
```

### Prioridade 2 (Próxima Semana)

```markdown
- [ ] Criar `ai-integration.md`
- [ ] Criar `component-patterns.md`
- [ ] Iniciar #21 e #23
```

### Prioridade 3 (2 Semanas)

```markdown
- [ ] Criar `api-integrations.md`
- [ ] Criar `product-planning.md`
- [ ] Iniciar #8, #15, #24
```

---

## Referências

### Skills Existentes
- `.claude/skills/google-cloud-oauth.md`
- `.claude/skills/aica-development.md`
- `.claude/skills/cloud-run-deployment.md`
- `.claude/skills/documentation-standards.md`
- `.claude/skills/issue-management.md`

### Documentação Relacionada
- `docs/EPICS_GOOGLE_CLOUD_APPROVAL.md`
- `OAUTH_MATURITY_REPORT.md`
- `docs/features/GOOGLE_CALENDAR_INTEGRATION.md`

---

*Documento gerado em 02/01/2026*
*Próxima revisão: Após criação das novas skills*
