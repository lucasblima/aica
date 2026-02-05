# 🏊 SwimFlux — PRD Técnico

**AICA LIFE OS | Ecossistema Inteligente de Treino de Natação**

> Versão 1.0 | Fevereiro 2026
> Documento confidencial — AICA Life OS Platform

---

## 1. Resumo Executivo

O SwimFlux é um módulo da plataforma AICA Life OS que integra prescrição de treinos via Canvas, IA conversacional no WhatsApp e monitoramento em tempo real para treinadores e atletas de natação. Ele segue o padrão arquitetural dos módulos existentes (Studio, Grants, Connections) e reutiliza a infraestrutura já disponível: Supabase com RLS, Evolution API para WhatsApp, Google Gemini para IA, e o Ceramic Design System.

| Atributo | Valor |
|---|---|
| Tipo | Módulo interno AICA Life OS |
| Usuário primário | Treinador de natação (Staff) |
| Usuário secundário | Atleta (interface WhatsApp-first) |
| Capacidade | Até 15 atletas por treinador |
| Ciclo base | 12 semanas (trimestral) |
| Interface Staff | Dashboard web (React + Ceramic) |
| Interface Atleta | WhatsApp via Evolution API |
| IA | Google Gemini (onboarding + análise) |
| Fase atual | PRD — pré-desenvolvimento |

---

## 2. Problema

O ecossistema atual de treino de natação sofre com três lacunas fundamentais que impactam diretamente a retenção e evolução dos atletas:

### 2.1 Comunicação fragmentada

Técnicos não conseguem monitorar evolução e dificuldades em tempo real. Falta de mecanismos inteligentes de alerta e comunicação proativa. A informação fica dispersa entre grupos de WhatsApp, planilhas e conversas informais.

### 2.2 Baixa interação e acompanhamento

Plataformas tradicionais não têm gamificação nem fluxo interativo com IA. O atleta recebe um PDF estático de treino sem nenhum canal para reportar dores, cansaço ou falta de motivação de forma estruturada.

### 2.3 Feedback subutilizado

Feedbacks não são usados como elemento-chave de progressão. Não existe um sistema que transforme o relato do atleta em dado acionável para ajuste automático de carga e progressão de nível.

---

## 3. Visão e Objetivos

### 3.1 Visão

Criar um módulo dentro da AICA que funcione como um ecossistema inteligente conectando Staff e Atleta em um único fluxo operacional, com prescrição visual, acompanhamento via WhatsApp e progressão baseada em dados.

### 3.2 Objetivos de Negócio

- Escalar a capacidade de atendimento do Staff (até 15 atletas/treinador)
- Reduzir churn através de gamificação e IA conversacional
- Monetizar como premium add-on do plano AICA Pro

### 3.3 Objetivos do Usuário

- **Staff:** Automatizar monitoramento e prescrição visual de treinos
- **Atleta:** Receber treinos personalizados e suporte proativo via WhatsApp

### 3.4 Não-Objetivos (Fase 1)

- Integração com wearables (Garmin, Apple Watch)
- Hardware próprio de cronometragem
- App nativo mobile para atletas

---

## 4. Histórias de Usuário

| Persona | Job to Be Done | Prioridade |
|---|---|---|
| Treinador (Staff) | Prescrever treinos de forma visual no Canvas e ser alertado quando um atleta relata dor ou desânimo | P1 |
| Treinador (Staff) | Visualizar dashboard colorimétrico com adesão e intensidade de cada atleta | P2 |
| Atleta | Receber treinos claros no WhatsApp e ter canal simples para feedback que altere sua evolução | P1 |
| Atleta | Passar por onboarding com IA que defina meu nível automaticamente | P2 |
| Admin (Lucas) | Gerenciar limite de assinaturas por treinador e ativação de perfis | P3 |

---

## 5. Arquitetura do Módulo

### 5.1 Estrutura de Diretórios

Seguindo o padrão estabelecido pelos módulos Studio, Connections e Grants:

```
src/modules/swimflux/
├── index.ts                       # Barrel exports + lazy loading
├── types.ts                       # Interfaces TypeScript
├── context/
│   └── SwimFluxContext.tsx         # Estado global (como StudioContext)
├── services/
│   ├── athleteService.ts          # CRUD atletas
│   ├── workoutService.ts          # Prescrição e Canvas
│   ├── feedbackService.ts         # Coleta e análise
│   ├── alertService.ts            # Alertas por palavras-chave
│   └── progressionService.ts      # Lógica de níveis e subleveís
├── hooks/
│   ├── useAthletes.ts             # React Query + CRUD
│   ├── useWorkoutCanvas.ts        # Estado do Canvas
│   ├── useFeedbackLoop.ts         # Ciclo feedback → progressão
│   ├── useAlerts.ts               # Alertas real-time
│   └── useSwimFluxNav.ts          # Navegação contextual
├── components/
│   ├── WorkoutCanvas.tsx          # Canvas drag-and-drop (core)
│   ├── AthleteCard.tsx            # Card com status colorimétrico
│   ├── AlertBadge.tsx             # Badge alerta crítico
│   ├── ProgressionBar.tsx         # Barra por ciclo 12 semanas
│   ├── FeedbackTimeline.tsx       # Timeline de feedbacks
│   └── LevelBadge.tsx             # Inic./Interm./Avançado
├── views/
│   ├── SwimFluxDashboard.tsx      # Dashboard principal Staff
│   ├── AthleteDetail.tsx          # Histórico 12 semanas
│   ├── CanvasEditor.tsx           # Editor de blocos
│   └── AlertsView.tsx             # Central de alertas
└── docs/
    └── SWIMFLUX_MODULE.md         # Documentação
```

### 5.2 Integração com Infraestrutura AICA

O SwimFlux reutiliza componentes e serviços já existentes na plataforma:

| Componente AICA | Uso no SwimFlux | Status |
|---|---|---|
| AppRouter.tsx | Rotas lazy-loaded `/swimflux/*` | 🆕 Novo |
| BottomNav | Item de navegação com ícone 🏊 | 🆕 Novo |
| Evolution API (WhatsApp) | Interface do atleta + coleta de feedback | ✅ Existente |
| Supabase + RLS | Banco de dados com isolamento por user_id | ✅ Existente |
| Gemini API | Onboarding IA + análise de feedback | ✅ Existente |
| Ceramic Design System | UI do dashboard do Staff | ✅ Existente |
| notification-sender | Envio de treinos e alertas via WhatsApp | 🔧 Estender |
| webhook-evolution | Recepção de feedbacks do atleta | 🔧 Estender |
| EmptyState | Estados vazios nas views | ✅ Existente |
| LoadingScreen | Loading states durante fetch | ✅ Existente |

---

## 6. Schema do Banco de Dados

**Migration file:** `supabase/migrations/20260205_swimflux_module.sql`

Todas as tabelas seguem o padrão AICA: RLS habilitado, user_id como FK, timestamps automáticos.

### 6.1 `swimflux_athletes`

Perfil do atleta vinculado ao treinador (Staff).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| user_id | UUID FK (users) | Treinador dono do registro |
| name | TEXT NOT NULL | Nome completo do atleta |
| email | TEXT | Email do atleta |
| phone | TEXT NOT NULL | WhatsApp (formato +55...) |
| level | ENUM | `iniciante_1`, `iniciante_2`, `iniciante_3`, `intermediario_1`, `intermediario_2`, `intermediario_3`, `avancado` |
| status | ENUM | `active`, `paused`, `trial`, `churned` |
| trial_expires_at | TIMESTAMPTZ | Expiração do trial |
| onboarding_data | JSONB | Respostas do onboarding IA |
| anamnesis | JSONB | Dores, lesões, sono, fadiga, alimentação |
| created_at | TIMESTAMPTZ | Auto-generated |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### 6.2 `swimflux_workout_blocks`

Blocos de treino de 12 semanas prescritos pelo Staff via Canvas.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| user_id | UUID FK | Treinador |
| athlete_id | UUID FK | Atleta alvo |
| title | TEXT | Nome do bloco (ex: Bloco 1 - Base Aeróbica) |
| start_date | DATE | Início do ciclo |
| end_date | DATE | Fim do ciclo (start + 12 semanas) |
| status | ENUM | `draft`, `active`, `completed`, `cancelled` |
| canvas_data | JSONB | Estrutura visual do Canvas (exercícios, séries, blocos) |
| progression_notes | TEXT | Notas de progressão do técnico |
| created_at | TIMESTAMPTZ | Auto-generated |

### 6.3 `swimflux_weekly_plans`

Planilha semanal derivada do bloco, enviada ao atleta via WhatsApp.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| block_id | UUID FK | Bloco de 12 semanas |
| athlete_id | UUID FK | Atleta |
| week_number | INT | Semana dentro do ciclo (1-12) |
| plan_data | JSONB | Treinos dia-a-dia (exercícios, volume, intensidade) |
| sent_at | TIMESTAMPTZ | Quando foi enviado via WhatsApp |
| sent_via | TEXT | `whatsapp` \| `email` \| `manual` |
| status | ENUM | `pending`, `sent`, `acknowledged` |

### 6.4 `swimflux_feedbacks`

Feedbacks do atleta coletados via WhatsApp. Gatilho de progressão.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| athlete_id | UUID FK | Atleta que enviou |
| weekly_plan_id | UUID FK | Plano semanal referente |
| completed_workout | BOOLEAN | Fez o treino? |
| volume_pct | INT (0-100) | % do volume cumprido |
| intensity_pct | INT (0-100) | % da intensidade cumprida |
| raw_message | TEXT | Mensagem original do WhatsApp |
| parsed_data | JSONB | Dados extraídos pela IA |
| sentiment_score | FLOAT | Score de sentimento (-1 a 1) |
| has_critical_keywords | BOOLEAN | Contém dor/febre/etc |
| critical_keywords | TEXT[] | Lista de palavras detectadas |
| ia_analysis | JSONB | Análise da IA (recomendações) |
| created_at | TIMESTAMPTZ | Timestamp do recebimento |

### 6.5 `swimflux_alerts`

Alertas gerados por palavras-chave críticas nos feedbacks.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| user_id | UUID FK | Treinador notificado |
| athlete_id | UUID FK | Atleta que gerou |
| feedback_id | UUID FK | Feedback origem |
| alert_type | ENUM | `health`, `motivation`, `absence`, `custom` |
| severity | ENUM | `low`, `medium`, `high`, `critical` |
| keywords_detected | TEXT[] | Palavras que dispararam |
| message_preview | TEXT | Preview da mensagem |
| acknowledged_at | TIMESTAMPTZ | Quando o Staff viu |
| resolved_at | TIMESTAMPTZ | Quando foi resolvido |
| resolution_notes | TEXT | Ação tomada pelo Staff |
| created_at | TIMESTAMPTZ | Auto-generated |

### 6.6 `swimflux_exercise_library`

Banco de exercícios do técnico, usado no Canvas para montar treinos.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| user_id | UUID FK | Treinador (cada um tem seu banco) |
| name | TEXT | Nome do exercício |
| category | ENUM | `warmup`, `main`, `technique`, `cooldown`, `dryland` |
| description | TEXT | Descrição e instruções |
| default_sets | INT | Séries padrão |
| default_reps | TEXT | Repetições padrão (ex: 4x100m) |
| default_rest | TEXT | Descanso padrão |
| level_range | TEXT[] | Níveis compatíveis |
| tags | TEXT[] | Tags livres |

---

## 7. Sistema de Palavras-Chave Críticas

O core do sistema de alertas é a detecção de palavras-chave nos feedbacks recebidos via WhatsApp. O processamento ocorre em duas camadas:

### 7.1 Camada 1: Regex Server-Side (Edge Function)

Processamento imediato no `webhook-evolution` quando a mensagem chega. Busca por padrões conhecidos com regex case-insensitive.

| Categoria | Palavras-Chave | Severidade |
|---|---|---|
| Saúde | dor, dor intensa, lesão, febre, machucado, inflamação | 🔴 critical |
| Motivação | desanimar, desistir, não quero mais, cansado demais, não aguento | 🟠 high |
| Ausência | não fiz, não consegui, faltei, não treinei, pulei | 🟡 medium |
| Fadiga | exausto, cansaço, sono ruim, insonia, estresse | 🟡 medium |
| Positivo | ótimo, melhorei, record, consegui, evolui | 🟢 low (info) |

### 7.2 Camada 2: Análise IA (Gemini)

Para mensagens ambíguas ou longas, a IA analisa o contexto completo, extrai sentimento, identifica intenção e gera recomendações para o Staff. O resultado é armazenado no campo `ia_analysis` do feedback.

---

## 8. Fluxos WhatsApp (Evolution API)

### 8.1 Fluxo de Onboarding do Atleta

Quando o Staff cadastra um novo atleta, o sistema inicia automaticamente um fluxo conversacional via WhatsApp:

1. Staff cadastra atleta (nome, email, telefone) no dashboard
2. Edge Function dispara mensagem de boas-vindas via Evolution API
3. IA (Gemini) conduz triagem interativa: experiência, frequência, objetivos, lesões
4. IA classifica nível: Iniciante I/II/III, Intermediário I/II/III, Avançado
5. Sistema cria registro com `onboarding_data` e notifica Staff
6. Staff revisa e ajusta nível se necessário, depois prescreve primeiro bloco

### 8.2 Fluxo Semanal de Treino

1. Staff monta/atualiza planilha semanal no Canvas
2. Sistema converte Canvas para formato WhatsApp (texto formatado)
3. `notification-sender` envia planilha no horário configurado
4. Atleta recebe e confirma visualização

### 8.3 Fluxo de Feedback Pós-Treino

1. Sistema envia lembrete de feedback (configurável: diário ou semanal)
2. Atleta responde via texto, áudio ou foto
3. `webhook-evolution` recebe e processa (transcrição se áudio, OCR se foto)
4. Camada 1 (regex) verifica palavras-chave críticas
5. Se crítico: gera alerta push imediato ao Staff
6. Camada 2 (Gemini) analisa sentimento e gera recomendações
7. Se feedback completo: IA analisa e libera próxima semana
8. Se feedback ausente após deadline: conta pausada

---

## 9. Roteamento e Navegação

Integração com `AppRouter.tsx` seguindo o padrão de lazy loading:

| Rota | Componente | Descrição |
|---|---|---|
| `/swimflux` | SwimFluxDashboard | Dashboard principal com lista de atletas e alertas |
| `/swimflux/athlete/:id` | AthleteDetail | Detalhe do atleta com histórico 12 semanas |
| `/swimflux/canvas/:blockId` | CanvasEditor | Editor de treino drag-and-drop |
| `/swimflux/alerts` | AlertsView | Central de alertas (filtros por severidade) |

O padrão de **contextual descent** se aplica: `/swimflux` mostra BottomNav, views internas mostram back button sem nav global (mesmo padrão de Connections).

---

## 10. Sistema de Níveis e Progressão

O atleta progride através de níveis baseado na qualidade e consistência dos feedbacks:

| Nível | Código | Critério de Progressão |
|---|---|---|
| Iniciante I | `iniciante_1` | Completar onboarding + 2 semanas de feedback |
| Iniciante II | `iniciante_2` | 4 semanas consecutivas, adesão > 70% |
| Iniciante III | `iniciante_3` | 8 semanas consecutivas, adesão > 75% |
| Intermediário I | `intermediario_1` | Completar ciclo 12 semanas, adesão > 80% |
| Intermediário II | `intermediario_2` | 2 ciclos completos, adesão > 85% |
| Intermediário III | `intermediario_3` | 3 ciclos, métricas de performance crescentes |
| Avançado | `avancado` | Avaliação do Staff + métricas consistentes |

O feedback funciona como **gatilho de progressão**: sem feedback, o ciclo é pausado e o atleta não avança. Isso incentiva engajamento contínuo.

---

## 11. Sistema de Trial Inteligente

O trial do SwimFlux não é baseado em tempo fixo, mas na **qualidade do engajamento**:

- **Período inicial:** 2 semanas gratuitas
- **Extensão automática:** se o atleta envia feedbacks de qualidade (analisados pela IA), o trial pode ser estendido por mais 2 semanas
- **Conversão:** IA envia mensagem personalizada incentivando assinatura com base no progresso do atleta
- **Pausa:** se não há feedback por 5+ dias no trial, conta é pausada com mensagem automática

---

## 12. Métricas de Sucesso

| Métrica | Meta Fase 1 | Como Medir |
|---|---|---|
| Taxa de Adesão | > 60% feedback semanal | feedbacks entregues / semanas ativas |
| Tempo de Resposta a Alertas | < 4 horas | `alert.created_at` → `alert.acknowledged_at` |
| Retenção por Ciclo | > 70% renovam | atletas que iniciam novo bloco / total |
| NPS do Atleta | > 40 | Pesquisa trimestral via WhatsApp |
| Conversão Trial | > 30% | atletas que assinam / total em trial |

---

## 13. Roadmap de Implementação

### Fase 1 — MVP (4-6 semanas)

**Foco:** Canvas básico + WhatsApp send/receive + Alertas de palavras-chave

1. Migration SQL com todas as tabelas
2. Services + Hooks básicos (CRUD atletas, workout blocks)
3. SwimFluxDashboard com lista de atletas e status
4. CanvasEditor simplificado (lista de exercícios por semana, sem drag-and-drop)
5. Integração webhook-evolution para feedback
6. Sistema de alertas por regex
7. Envio de planilha via WhatsApp (texto formatado)

### Fase 2 — Engajamento (4 semanas)

**Foco:** Gamificação, dashboard colorimétrico, onboarding IA

- Canvas drag-and-drop com `@dnd-kit`
- Dashboard colorimétrico (heatmap de adesão)
- Onboarding IA via WhatsApp (Gemini)
- Barra de progressão do atleta
- Sistema de níveis com progressão automática

### Fase 3 — Escala (4 semanas)

**Foco:** Trial inteligente, admin, analytics

- Sistema de Trial com análise de qualidade de feedback
- Painel Admin (gestão de assinaturas por treinador)
- Analytics: retenção, adesão, conversão
- Análise IA avançada com Gemini (recomendações de ajuste de carga)
- Filtros avançados: individual, grupo, categoria

---

## 14. Segurança e Compliância

- **RLS** em todas as tabelas: treinador só acessa seus atletas
- **Dados de saúde** (anamnesis) criptografados em repouso via Supabase Vault
- **LGPD:** consent management para coleta de dados via WhatsApp (reutiliza sistema existente)
- **API keys** exclusivamente em Edge Functions (backend-only)
- **Rate limiting** no notification-sender (1 msg/s conforme política WhatsApp)
- **Audit log** para ações críticas (mudança de nível, pausa de conta)

---

## 15. Narrativa: Um Dia Típico

O treinador Carlos abre seu dashboard SwimFlux na AICA e vê um alerta vermelho: o atleta João relatou *"dor intensa no ombro"* via WhatsApp. Carlos clica no alerta, revisa o histórico de 12 semanas no Canvas e ajusta a carga instantaneamente para a próxima semana.

Enquanto isso, João recebe uma mensagem automática da IA confortando-o e informando que o treino de amanhã já foi adaptado para recuperação, mantendo-o engajado sem risco de lesão. A barra de progressão de João continua avançando porque ele enviou o feedback — mesmo que não tenha completado o treino.

No final do dia, Carlos checa o dashboard colorimétrico: 12 dos 15 atletas estão verdes (adesão > 80%), 2 estão amarelos (precisa atenção) e 1 está vermelho (João). Ele agenda uma ligação com João para o dia seguinte diretamente do card do atleta.

---

## Apêndice A: Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Canvas library | `@dnd-kit` (Fase 2) | Melhor suporte React 18, tree-shakeable, acessível |
| Níveis do atleta | ENUM no banco | Performance de query + validação server-side |
| Canvas data | JSONB no Supabase | Flexibilidade para estrutura variável de exercícios |
| Alertas | Regex + Gemini (2 camadas) | Resposta rápida + análise profunda |
| Interface do atleta | WhatsApp-only | 93% dos brasileiros usam diário, zero fricção |
| State management | React Query + Context | Consistente com outros módulos AICA |
