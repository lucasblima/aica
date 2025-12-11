# Trilhas Contextuais e Perguntas Padrão - Aica Onboarding

**Status**: Versão 1.0 - Refinada conforme feedback do usuário
**Data**: Dezembro 2025
**Objetivo**: Definir pergunta estruturadas para capturar contexto do usuário em 4-5 trilhas distintas

---

## 1. Visão Geral: O Conceito de Trilhas Contextuais

As **Trilhas Contextuais** são fluxos de perguntas de múltipla escolha que:

- Capturam o contexto específico sobre a vida do usuário
- Determinam qual módulo(s) será(ão) recomendado(s) primeiro
- Personalizem a experiência de onboarding baseado em prioridades
- Alimentam o sistema de recomendação de módulos

### Por que múltipla escolha?

1. **Aceleração**: Usuário não precisa digitar/refletir profundamente
2. **Consistência**: Respostas padronizadas facilitam análise e recomendações
3. **Ativação**: Mostrar valor rapidamente com categorias visuais
4. **Dados estruturados**: Alimentam matriz de recomendações sem ambiguidade

---

## 2. Schema TypeScript/Interfaces

```typescript
// Trilhas Contextuais - Tipos
export interface ContextualTrail {
  id: string;                    // 'health', 'finance', 'relationships', 'growth', 'wellness'
  name: string;                  // Nome amigável em português
  icon: string;                  // Lucide icon name
  color: string;                 // Cor primária (Tailwind)
  description: string;           // Descrição breve do que é
  questions: ContextualQuestion[];
  recommendedModules: string[]; // ['health', 'finance', etc]
  priority: number;              // 1 = highest priority
}

export interface ContextualQuestion {
  id: string;
  question: string;
  helpText?: string;            // Dica opcional
  type: 'single' | 'multiple';  // Múltipla escolha única ou múltipla
  answers: ContextualAnswer[];
  order: number;                // Ordem na trilha
  isRequired: boolean;
}

export interface ContextualAnswer {
  id: string;
  label: string;
  value: string;
  icon?: string;               // Emoji ou ícone visual
  description?: string;        // Descrição breve
  weight: number;              // 0-10 para cálculo de score
  triggerModules?: string[];   // Módulos desbloqueados por essa resposta
}

// Armazenamento de respostas do onboarding
export interface OnboardingContextCapture {
  userId: string;
  trailId: string;
  responses: {
    questionId: string;
    selectedAnswerIds: string[]; // Array para suportar múltipla escolha
    answeredAt: Date;
  }[];
  completedAt: Date;
  trailScore: number;           // Score agregado (0-100)
  recommendedModules: string[]; // Calculado no final da trilha
}

// Armazenamento persistente (tabela: onboarding_context_captures)
export interface StoredContextCapture {
  id: string;
  user_id: string;
  trail_id: string;
  responses: JSONB;             // Armazena OnboardingContextCapture.responses
  trail_score: number;
  recommended_modules: string[];
  created_at: timestamptz;
  updated_at: timestamptz;
}
```

---

## 3. Trilhas Contextuais Detalhadas

### TRILHA 1: Saúde Mental e Bem-estar Emocional

**ID**: `health-emotional`
**Ícone**: Brain / Heart
**Cor**: `#6B9EFF` (azul calmo)
**Prioridade**: 1 (Alta - base para todas as outras)

#### Pergunta 1: Como você está se sentindo emocionalmente?
```
Type: single
Required: true

Respostas:
- ID: joy
  Label: "Alegre e energizado"
  Icon: "😄"
  Weight: 2

- ID: neutral
  Label: "Normal, equilibrado"
  Icon: "😐"
  Weight: 5

- ID: anxious
  Label: "Ansioso ou preocupado"
  Icon: "😰"
  Weight: 8
  triggerModules: ["meditation", "stress_management"]

- ID: depressed
  Label: "Triste ou desmotivado"
  Icon: "😢"
  Weight: 9
  triggerModules: ["daily_reflections", "motivation_boost"]

- ID: overwhelmed
  Label: "Sobrecarregado/Exausto"
  Icon: "😫"
  Weight: 10
  triggerModules: ["rest_recovery", "priority_management"]
```

#### Pergunta 2: Quais áreas emocionais você quer desenvolver? (Múltipla)
```
Type: multiple
Required: true

Respostas:
- ID: self_awareness
  Label: "Autoconhecimento"
  Description: "Entender melhor minhas emoções e motivações"
  Weight: 5
  triggerModules: ["journaling"]

- ID: emotional_regulation
  Label: "Controle emocional"
  Description: "Gerenciar melhor reações e impulsos"
  Weight: 5
  triggerModules: ["emotion_picker", "breathing_exercises"]

- ID: resilience
  Label: "Resiliência"
  Description: "Recuperar-se melhor de desafios"
  Weight: 6
  triggerModules: ["daily_reflections", "growth_mindset"]

- ID: relationships
  Label: "Relacionamentos"
  Description: "Melhorar conexões com outras pessoas"
  Weight: 5
  triggerModules: ["communication_insights"]

- ID: stress_management
  Label: "Gestão de estresse"
  Description: "Reduzir ansiedade e tensão"
  Weight: 7
  triggerModules: ["meditation", "stress_tracking"]
```

#### Pergunta 3: Com que frequência você reflete sobre suas emoções?
```
Type: single
Required: true

Respostas:
- ID: daily
  Label: "Diariamente"
  Icon: "📅"
  Weight: 3

- ID: weekly
  Label: "Semanalmente"
  Icon: "📆"
  Weight: 5

- ID: rarely
  Label: "Raramente"
  Icon: "⏳"
  Weight: 8
  triggerModules: ["daily_questions", "weekly_summaries"]

- ID: never
  Label: "Nunca, quero começar"
  Icon: "🌱"
  Weight: 9
  triggerModules: ["guided_journaling", "reflection_templates"]
```

#### Pergunta 4: Qual é seu objetivo principal com a saúde emocional?
```
Type: single
Required: true

Respostas:
- ID: understand_self
  Label: "Entender a mim mesmo"
  Weight: 5
  triggerModules: ["self_discovery"]

- ID: reduce_stress
  Label: "Reduzir estresse e ansiedade"
  Weight: 8
  triggerModules: ["meditation", "breathing"]

- ID: improve_relationships
  Label: "Melhorar relacionamentos"
  Weight: 6
  triggerModules: ["empathy_insights"]

- ID: build_confidence
  Label: "Aumentar confiança"
  Weight: 7
  triggerModules: ["affirmations", "growth_tracking"]

- ID: process_past
  Label: "Processar experiências passadas"
  Weight: 8
  triggerModules: ["deep_journaling", "storytelling"]
```

**Trail Score Calculation**: Média dos weights das respostas
**Recommended Modules**: Union de todos os `triggerModules` das respostas selecionadas

---

### TRILHA 2: Saúde Física e Bem-estar

**ID**: `health-physical`
**Ícone**: Activity / Zap
**Cor**: `#FF6B6B` (vermelho energético)
**Prioridade**: 2

#### Pergunta 1: Como você avalia sua saúde física atualmente?
```
Type: single
Required: true

Respostas:
- ID: excellent
  Label: "Excelente - muito saudável"
  Icon: "💪"
  Weight: 2

- ID: good
  Label: "Boa - faço exercício regularmente"
  Icon: "🏃"
  Weight: 3

- ID: average
  Label: "Média - poderia melhorar"
  Icon: "🚶"
  Weight: 6
  triggerModules: ["fitness_tracking", "activity_suggestions"]

- ID: poor
  Label: "Preciso urgentemente melhorar"
  Icon: "😓"
  Weight: 9
  triggerModules: ["health_challenges", "habit_building", "nutrition_basics"]
```

#### Pergunta 2: Quais aspectos da saúde física você quer trabalhar? (Múltipla)
```
Type: multiple
Required: true

Respostas:
- ID: exercise
  Label: "Mais exercício/Movimento"
  Weight: 6
  triggerModules: ["fitness_tracking", "exercise_library"]

- ID: nutrition
  Label: "Melhor nutrição"
  Weight: 6
  triggerModules: ["nutrition_tracker", "meal_planning"]

- ID: sleep
  Label: "Melhor qualidade de sono"
  Icon: "😴"
  Weight: 7
  triggerModules: ["sleep_tracking", "sleep_hygiene"]

- ID: energy
  Label: "Mais energia no dia"
  Weight: 6
  triggerModules: ["energy_optimization"]

- ID: pain_management
  Label: "Gerenciar dor/desconforto"
  Weight: 7
  triggerModules: ["pain_tracking", "wellness_tips"]

- ID: weight
  Label: "Gestão de peso"
  Weight: 7
  triggerModules: ["weight_tracking", "nutrition_balance"]
```

#### Pergunta 3: Qual seu nível de atividade típico?
```
Type: single
Required: true

Respostas:
- ID: sedentary
  Label: "Principalmente sentado/imóvel"
  Weight: 8
  triggerModules: ["movement_breaks", "walking_challenge"]

- ID: light
  Label: "Movimentação leve (caminhadas)"
  Weight: 5

- ID: moderate
  Label: "Exercício moderado (3-4x semana)"
  Weight: 3

- ID: intense
  Label: "Treino intenso (5+ vezes/semana)"
  Weight: 2
  triggerModules: ["advanced_training", "recovery_optimization"]
```

**Trail Score Calculation**: Média ponderada das respostas
**Recommended Modules**: Módulos específicos por área de foco

---

### TRILHA 3: Financeiro e Prosperidade

**ID**: `finance`
**Ícone**: Wallet / TrendingUp
**Cor**: `#51CF66` (verde próspero)
**Prioridade**: 3

#### Pergunta 1: Como você se sente sobre sua situação financeira?
```
Type: single
Required: true

Respostas:
- ID: secure
  Label: "Seguro e confortável"
  Icon: "🏦"
  Weight: 2

- ID: stable
  Label: "Estável, mas poderia melhorar"
  Icon: "⚖️"
  Weight: 4
  triggerModules: ["wealth_building", "investment_basics"]

- ID: stressed
  Label: "Preocupado com dívidas"
  Icon: "😰"
  Weight: 8
  triggerModules: ["debt_management", "budget_planning"]

- ID: lost
  Label: "Sem controle sobre minhas finanças"
  Icon: "🗺️"
  Weight: 9
  triggerModules: ["financial_foundation", "money_basics"]

- ID: broke
  Label: "Dificuldade financeira severa"
  Icon: "⚠️"
  Weight: 10
  triggerModules: ["emergency_fund", "income_boost"]
```

#### Pergunta 2: Quais são suas prioridades financeiras? (Múltipla)
```
Type: multiple
Required: true

Respostas:
- ID: budget
  Label: "Criar/melhorar orçamento"
  Weight: 7
  triggerModules: ["budget_builder", "expense_tracking"]

- ID: debt
  Label: "Pagar dívidas"
  Weight: 8
  triggerModules: ["debt_payoff_strategy", "negotiation_tips"]

- ID: emergency
  Label: "Fundo de emergência"
  Weight: 8
  triggerModules: ["savings_goals", "emergency_planning"]

- ID: invest
  Label: "Aprender a investir"
  Weight: 6
  triggerModules: ["investment_education", "portfolio_basics"]

- ID: income
  Label: "Aumentar minha renda"
  Weight: 7
  triggerModules: ["side_hustle_ideas", "career_growth"]

- ID: wealth
  Label: "Criar riqueza de longo prazo"
  Weight: 6
  triggerModules: ["wealth_strategies", "passive_income"]
```

#### Pergunta 3: Você tem um sistema para rastrear gastos?
```
Type: single
Required: true

Respostas:
- ID: yes_detailed
  Label: "Sim, rastreio detalhadamente"
  Weight: 2

- ID: yes_basic
  Label: "Sim, mas básico"
  Weight: 4
  triggerModules: ["expense_tracking_tools"]

- ID: no_want
  Label: "Não, mas quero começar"
  Weight: 7
  triggerModules: ["tracking_setup", "app_recommendations"]

- ID: no_dont_care
  Label: "Não e não vejo necessidade"
  Weight: 8
  triggerModules: ["financial_awareness", "money_tracking"]
```

**Trail Score Calculation**: Agregado das prioridades e nível de awareness
**Recommended Modules**: Todos os módulos de `triggerModules` das respostas selecionadas

---

### TRILHA 4: Relacionamentos e Conexão Social

**ID**: `relationships`
**Ícone**: Users / Heart
**Cor**: `#FF922B` (laranja caloroso)
**Prioridade**: 4

#### Pergunta 1: Como está sua vida social/relacionamentos?
```
Type: single
Required: true

Respostas:
- ID: thriving
  Label: "Tenho relacionamentos profundos e significativos"
  Icon: "🌟"
  Weight: 2

- ID: good
  Label: "Tenho bons amigos/família"
  Icon: "👥"
  Weight: 3

- ID: lonely
  Label: "Me sinto isolado ou desconectado"
  Icon: "😔"
  Weight: 8
  triggerModules: ["connection_building", "social_anxiety_support"]

- ID: conflicted
  Label: "Tenho conflitos relacionais"
  Icon: "⚡"
  Weight: 7
  triggerModules: ["communication_skills", "conflict_resolution"]

- ID: overwhelmed
  Label: "Tenho muitas demandas sociais"
  Icon: "😵"
  Weight: 6
  triggerModules: ["boundary_setting", "energy_management"]
```

#### Pergunta 2: Onde você quer melhorar seus relacionamentos? (Múltipla)
```
Type: multiple
Required: true

Respostas:
- ID: family
  Label: "Familia"
  Weight: 6
  triggerModules: ["family_dynamics", "generational_healing"]

- ID: romantic
  Label: "Relacionamento amoroso"
  Weight: 7
  triggerModules: ["relationship_insights", "intimacy_building"]

- ID: friendships
  Label: "Amizades"
  Weight: 6
  triggerModules: ["friendship_cultivation", "social_skills"]

- ID: workplace
  Label: "Relacionamentos profissionais"
  Weight: 6
  triggerModules: ["workplace_dynamics", "networking_tips"]

- ID: self_relationship
  Label: "Relacionamento comigo mesmo (autoestima)"
  Weight: 7
  triggerModules: ["self_love", "worth_building"]

- ID: community
  Label: "Comunidade/Grupos"
  Weight: 5
  triggerModules: ["community_finding", "belonging"]
```

#### Pergunta 3: O que é mais importante em seus relacionamentos?
```
Type: single
Required: true

Respostas:
- ID: authenticity
  Label: "Autenticidade e honestidade"
  Weight: 5

- ID: support
  Label: "Apoio e compreensão"
  Weight: 6

- ID: growth
  Label: "Crescimento mútuo"
  Weight: 5

- ID: fun
  Label: "Diversão e leveza"
  Weight: 4

- ID: depth
  Label: "Intimidade emocional profunda"
  Weight: 6
```

**Trail Score Calculation**: Média ponderada com ênfase em áreas de desafio
**Recommended Modules**: Módulos de relacionamentos selecionados

---

### TRILHA 5: Crescimento Pessoal e Propósito

**ID**: `growth`
**Ícone**: Zap / Target
**Cor**: `#845EF7` (roxo inspirador)
**Prioridade**: 5

#### Pergunta 1: Como você se sente sobre seu propósito/direção de vida?
```
Type: single
Required: true

Respostas:
- ID: clear
  Label: "Tenho clareza sobre meu propósito"
  Icon: "🎯"
  Weight: 2

- ID: somewhat
  Label: "Tenho uma ideia geral"
  Icon: "🧭"
  Weight: 4

- ID: uncertain
  Label: "Não tenho certeza"
  Icon: "❓"
  Weight: 6
  triggerModules: ["purpose_discovery", "values_clarification"]

- ID: lost
  Label: "Sinto-me perdido ou sem direção"
  Icon: "🌫️"
  Weight: 8
  triggerModules: ["life_design", "vision_setting", "meaning_making"]

- ID: wanting_change
  Label: "Quero mudar minha vida/carreira"
  Icon: "🚀"
  Weight: 7
  triggerModules: ["career_transition", "life_redesign"]
```

#### Pergunta 2: Quais áreas você quer desenvolver? (Múltipla)
```
Type: multiple
Required: true

Respostas:
- ID: skills
  Label: "Novas habilidades e aprendizado"
  Weight: 6
  triggerModules: ["learning_paths", "skill_building"]

- ID: career
  Label: "Progresso profissional"
  Weight: 7
  triggerModules: ["career_planning", "leadership_development"]

- ID: creativity
  Label: "Criatividade e expressão"
  Weight: 5
  triggerModules: ["creative_projects", "artistic_exploration"]

- ID: spirituality
  Label: "Espiritualidade/Conexão"
  Weight: 6
  triggerModules: ["mindfulness", "spiritual_exploration"]

- ID: habits
  Label: "Construir hábitos melhores"
  Weight: 7
  triggerModules: ["habit_building", "behavior_change"]

- ID: confidence
  Label: "Confiança e autossuperação"
  Weight: 6
  triggerModules: ["confidence_building", "fear_facing"]
```

#### Pergunta 3: Qual é seu tempo ideal para aprender/crescer?
```
Type: single
Required: true

Respostas:
- ID: fast
  Label: "Quero progresso rápido e notável"
  Weight: 5
  triggerModules: ["intensive_programs", "challenge_tracking"]

- ID: steady
  Label: "Crescimento consistente e sustentável"
  Weight: 4

- ID: flexible
  Label: "Depende da minha disponibilidade"
  Weight: 5

- ID: passive
  Label: "Prefiro insights ocasionais"
  Weight: 3
```

**Trail Score Calculation**: Média de urgência e clareza
**Recommended Modules**: Módulos de crescimento personalizados

---

## 4. Matriz de Mapeamento: Trilha → Módulos

```typescript
export const TRAIL_TO_MODULES_MAP: Record<string, string[]> = {
  'health-emotional': [
    'journaling',
    'daily_reflections',
    'emotion_picker',
    'weekly_summaries',
    'meditation_basics',
    'breathing_exercises',
    'mood_tracking'
  ],
  'health-physical': [
    'fitness_tracking',
    'activity_suggestions',
    'nutrition_tracker',
    'sleep_tracking',
    'wellness_challenges',
    'habit_building'
  ],
  'finance': [
    'budget_builder',
    'expense_tracking',
    'debt_management',
    'savings_goals',
    'investment_education',
    'income_boost',
    'wealth_strategies'
  ],
  'relationships': [
    'communication_skills',
    'conflict_resolution',
    'relationship_insights',
    'empathy_development',
    'boundary_setting',
    'social_skills',
    'self_love'
  ],
  'growth': [
    'purpose_discovery',
    'values_clarification',
    'life_design',
    'career_planning',
    'habit_building',
    'learning_paths',
    'vision_setting'
  ]
};
```

---

## 5. Fluxo de Captura e Processamento

### 5.1 Fluxo de UX (User Journey)

```
1. Usuário preenche Onboarding WizardStep 1 (Splash Screen)
   ↓
2. Vê Grid de 5 Trilhas com ícones/cores
   "Qual área é mais importante para você agora?"
   ↓
3. Seleciona UMA ou MÚLTIPLAS trilhas (design TBD)
   ↓
4. Para cada trilha selecionada, responde 3-4 perguntas
   - Múltipla escolha single/multiple
   - Progresso visual (Step X de Y)
   ↓
5. Ao terminar uma trilha:
   - Mostra score (0-100)
   - Mostra módulos recomendados
   - Opção: "Continuar com próxima trilha" ou "Pular"
   ↓
6. Ao terminar TODAS as trilhas:
   - Agregação de módulos (union)
   - Cálculo de prioridade geral
   - Redirecionamento para Step 2: "Compartilhar um momento"
```

### 5.2 Fluxo de Dados (Backend)

```
POST /api/onboarding/capture-context
{
  userId: string
  trailId: string
  responses: {
    questionId: string
    selectedAnswerIds: string[]
  }[]
}

→ Validação de respostas
→ Cálculo de trail_score (média dos weights)
→ Extração de triggerModules
→ INSERT into onboarding_context_captures
→ Retorna: { trailScore, recommendedModules }

Após completar TODAS as trilhas:
POST /api/onboarding/finalize-context
{
  userId: string
  trailIds: string[]
}

→ Query all context captures para o user
→ Agregar módulos (union de todos)
→ Calcular score geral (média ponderada)
→ UPDATE user.onboarding_context_completed = true
→ STORE recomendações em user_profile.recommended_modules
→ Retorna: { nextStep: "step_2_moment_capture" }
```

---

## 6. Exemplos de Respostas Pré-definidas (para UI/UX)

### Exemplo 1: Usuário Preocupado com Financeiro

**Trail**: Finance
**Selecionados**:
- Q1: "Sem controle sobre minhas finanças" (lost, weight: 9)
- Q2: "Pagar dívidas" + "Fundo de emergência" (weight: 8, 8)
- Q3: "Não, mas quero começar" (weight: 7)

**Trail Score**: (9 + 8 + 8 + 7) / 4 = 8.0 / 10
**Recommended Modules**:
```
[
  "financial_foundation",
  "money_basics",
  "emergency_fund",
  "income_boost",
  "budget_builder",
  "expense_tracking",
  "debt_payoff_strategy",
  "negotiation_tips",
  "savings_goals",
  "emergency_planning"
]
```

**Módulos Ordenados por Prioridade**:
1. financial_foundation (básico)
2. budget_builder (urgente)
3. expense_tracking (urgente)
4. debt_payoff_strategy (urgente)
5. emergency_fund (segurança)
6. ... (outros em ordem decrescente)

### Exemplo 2: Usuário Focado em Saúde Mental + Relacionamentos

**Trails**: health-emotional + relationships

**Health-Emotional**:
- Q1: "Ansioso ou preocupado" (anxious, weight: 8)
- Q2: "Autoconhecimento" + "Controle emocional" + "Stress management"
- Q3: "Nunca, quero começar" (weight: 9)
- Q4: "Reduzir estresse e ansiedade" (weight: 8)

**Trail Score**: 8.25 / 10

**Relationships**:
- Q1: "Me sinto isolado" (lonely, weight: 8)
- Q2: "Amizades" + "Comunidade"
- Q3: "Autenticidade e honestidade" (weight: 5)

**Trail Score**: 7.0 / 10

**Merged Recommended Modules**:
```
[
  "meditation",
  "stress_management",
  "breathing_exercises",
  "daily_questions",
  "weekly_summaries",
  "journaling",
  "connection_building",
  "social_anxiety_support",
  "friendship_cultivation",
  "social_skills",
  "community_finding",
  "belonging"
]
```

---

## 7. Armazenamento em Banco de Dados

### Nova Tabela: `onboarding_context_captures`

```sql
CREATE TABLE onboarding_context_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trilha completada
  trail_id VARCHAR(50) NOT NULL, -- 'health-emotional', 'finance', etc

  -- Respostas (JSON estruturado)
  responses JSONB NOT NULL,
  -- {
  --   "question_1": { answerId: "string", answerLabel: "string" },
  --   "question_2": { answerIds: ["string"], labels: ["string"] },
  --   ...
  -- }

  -- Score e recomendações
  trail_score FLOAT CHECK (trail_score >= 0 AND trail_score <= 10),
  recommended_modules TEXT[], -- Módulos sugeridos

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- RLS
  UNIQUE (user_id, trail_id) -- Uma captura por trilha por user
);

CREATE INDEX idx_context_user_id ON onboarding_context_captures(user_id);
CREATE INDEX idx_context_trail_id ON onboarding_context_captures(trail_id);
CREATE INDEX idx_context_created_at ON onboarding_context_captures(created_at DESC);

-- RLS Policies
ALTER TABLE onboarding_context_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context"
  ON onboarding_context_captures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context"
  ON onboarding_context_captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Estender Tabela: `users`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS (
  onboarding_completed_trails TEXT[] DEFAULT '{}', -- ['health-emotional', 'finance']
  onboarding_all_recommended_modules TEXT[] DEFAULT '{}', -- Union de todos
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_skipped BOOLEAN DEFAULT false
);
```

---

## 8. Configuração de Trails em JSON (para importação)

```json
{
  "trails": [
    {
      "id": "health-emotional",
      "name": "Saúde Mental e Bem-estar Emocional",
      "icon": "Brain",
      "color": "#6B9EFF",
      "priority": 1,
      "questions": [
        {
          "id": "q1_emotion",
          "question": "Como você está se sentindo emocionalmente?",
          "type": "single",
          "required": true,
          "order": 1,
          "answers": [
            {
              "id": "joy",
              "label": "Alegre e energizado",
              "icon": "😄",
              "weight": 2,
              "triggerModules": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 9. Casos de Uso e Exemplos

### Caso 1: Usuário Novo - Foco em Múltiplas Trilhas

**Entrada**: Seleciona health-emotional + finance + relationships
**Processamento**:
1. Completa 3 × 4 = 12 perguntas (adaptativo)
2. Cada trilha gera score individual
3. Recomendações agregadas com pesos
4. UX mostra: "Seus módulos personalizados"
5. Prioridade calculada automaticamente

**Saída**: Usuário vê primeiros 3-5 módulos recomendados na jornada

---

## 10. Próximas Fases de Refinamento

1. **Visual Design das Trilhas**: Cards com icons, cores, descrições
2. **Validação UX**: Testar se 3-4 perguntas é suficiente
3. **A/B Testing**: Diferentes ordens de perguntas
4. **Adaptabilidade**: Perguntas adicionais baseadas em respostas
5. **Integração com Weekly Summaries**: Reutilizar contexto nas reflections

---

**Documentação criada**: 11/12/2025
**Próximo passo**: PERSISTENCIA_DADOS_JOURNEY.md
