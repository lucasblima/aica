# Lógica de Recomendação de Módulos - Matriz e Algoritmo

**Status**: Versão 1.0 - Sistema de recomendação baseado em contexto
**Data**: Dezembro 2025
**Objetivo**: Mapear trilhas contextuais + momentos → módulos personalizados

---

## 1. Visão Geral: Sistema de Recomendação

### 1.1 Fluxo de Recomendação

```
INPUTS:
├─ Onboarding Context Captures (trails + respostas)
├─ Moment Entries (tipo, emoção, áreas, sentiment)
├─ User Consciousness Stats (preferências implícitas)
└─ User Profile (idade, localização, idioma)

        ↓
    [ALGORITMO DE MATCHING]

OUTPUTS:
├─ Módulos recomendados (ordenados por prioridade)
├─ Razão da recomendação (por que esse módulo?)
├─ Timeline sugerida (ordem de consumo)
└─ Personalization hints (como personalizar)
```

### 1.2 Princípios de Design

1. **Contextual**: Recomendações baseadas no que o usuário DISSE ser importante
2. **Progressive**: Começa com 1-2 módulos, expande conforme engagement
3. **Explainable**: Sempre mostrar POR QUÊ foi recomendado
4. **Reversible**: Usuário pode rejeitar e "aprender" da rejeição
5. **Serendipitous**: Ocasionalmente sugerir algo inesperado (cross-domain)

---

## 2. Matriz de Mapeamento: Trails → Módulos

### 2.1 TRILHA: Saúde Mental e Bem-estar Emocional

```typescript
TRAIL_TO_MODULES_HEALTH_EMOTIONAL = {
  // Pergunta 1: Estado emocional
  emotion_joy: {
    modules: ['affirmations', 'gratitude_practice'],
    weight: 0.5  // Baixa prioridade se está bem
  },
  emotion_neutral: {
    modules: ['daily_reflections', 'mood_tracking'],
    weight: 0.7
  },
  emotion_anxious: {
    modules: ['breathing_exercises', 'anxiety_management', 'meditation'],
    weight: 0.95  // Alta prioridade
  },
  emotion_depressed: {
    modules: ['motivation_boost', 'support_network', 'professional_resources'],
    weight: 1.0   // Máxima prioridade
  },
  emotion_overwhelmed: {
    modules: ['stress_relief', 'rest_recovery', 'priority_management'],
    weight: 0.98
  },

  // Pergunta 2: Áreas a desenvolver (múltipla, donc combinações)
  self_awareness: {
    modules: ['journaling', 'personality_assessment', 'values_clarification'],
    weight: 0.8
  },
  emotional_regulation: {
    modules: ['emotion_picker', 'breathing_exercises', 'response_coaching'],
    weight: 0.85
  },
  resilience: {
    modules: ['growth_mindset', 'challenge_tracker', 'recovery_strategies'],
    weight: 0.8
  },
  relationships: {
    modules: ['empathy_insights', 'communication_skills', 'connection_building'],
    weight: 0.75
  },
  stress_management: {
    modules: ['meditation', 'stress_tracking', 'relaxation_library'],
    weight: 0.9
  },

  // Pergunta 3: Frequência de reflexão
  rarely_reflect: {
    modules: ['daily_questions', 'weekly_summaries', 'reflection_prompts'],
    weight: 0.8
  },
  never_reflected: {
    modules: ['guided_journaling', 'reflection_templates', 'daily_reflections'],
    weight: 0.9
  },

  // Pergunta 4: Objetivo principal
  understand_self: {
    modules: ['self_discovery', 'journaling', 'personality_assessment'],
    weight: 0.7
  },
  reduce_stress: {
    modules: ['meditation', 'breathing', 'stress_management'],
    weight: 0.95
  },
  improve_relationships: {
    modules: ['empathy', 'communication', 'connection'],
    weight: 0.8
  },
  build_confidence: {
    modules: ['affirmations', 'success_tracking', 'courage_builder'],
    weight: 0.75
  },
  process_past: {
    modules: ['deep_journaling', 'storytelling', 'narrative_therapy'],
    weight: 0.85
  }
};
```

### 2.2 TRILHA: Saúde Física e Bem-estar

```typescript
TRAIL_TO_MODULES_HEALTH_PHYSICAL = {
  // Estado atual
  health_excellent: {
    modules: ['maintenance_strategies', 'advanced_training'],
    weight: 0.3
  },
  health_good: {
    modules: ['habit_optimization', 'goal_progression'],
    weight: 0.5
  },
  health_average: {
    modules: ['fitness_basics', 'nutrition_basics', 'activity_tracking'],
    weight: 0.8
  },
  health_poor: {
    modules: ['health_foundation', 'doctor_collaboration', 'habit_building'],
    weight: 1.0
  },

  // Áreas a trabalhar
  exercise: {
    modules: ['exercise_library', 'movement_tracking', 'fitness_goals'],
    weight: 0.85
  },
  nutrition: {
    modules: ['nutrition_tracker', 'meal_planning', 'food_education'],
    weight: 0.8
  },
  sleep: {
    modules: ['sleep_tracking', 'sleep_hygiene', 'rest_recommendations'],
    weight: 0.9
  },
  energy: {
    modules: ['energy_optimization', 'caffeine_management', 'recovery'],
    weight: 0.75
  },
  pain_management: {
    modules: ['pain_tracking', 'wellness_tips', 'provider_directory'],
    weight: 0.85
  },
  weight: {
    modules: ['weight_tracking', 'nutrition_balance', 'sustainable_weight'],
    weight: 0.8
  },

  // Nível de atividade
  sedentary: {
    modules: ['movement_breaks', 'walking_challenge', 'desk_exercises'],
    weight: 0.9
  },
  light: {
    modules: ['activity_progression', 'motivation_boost'],
    weight: 0.6
  },
  intense: {
    modules: ['advanced_training', 'recovery_optimization'],
    weight: 0.4
  }
};
```

### 2.3 TRILHA: Financeiro

```typescript
TRAIL_TO_MODULES_FINANCE = {
  // Situação financeira
  finance_secure: {
    modules: ['wealth_building', 'investment_strategies'],
    weight: 0.3
  },
  finance_stable: {
    modules: ['wealth_building', 'savings_acceleration'],
    weight: 0.6
  },
  finance_stressed: {
    modules: ['budget_optimization', 'expense_reduction'],
    weight: 0.9
  },
  finance_lost: {
    modules: ['financial_foundation', 'basic_budgeting', 'money_education'],
    weight: 1.0
  },
  finance_broke: {
    modules: ['emergency_fund', 'income_boost', 'survival_budgeting'],
    weight: 1.0
  },

  // Prioridades
  budget: {
    modules: ['budget_builder', 'expense_tracking', 'spending_analysis'],
    weight: 0.9
  },
  debt: {
    modules: ['debt_payoff_strategy', 'creditor_negotiation', 'credit_repair'],
    weight: 0.95
  },
  emergency: {
    modules: ['emergency_fund', 'savings_goals', 'financial_safety'],
    weight: 0.95
  },
  invest: {
    modules: ['investing_basics', 'portfolio_building', 'market_education'],
    weight: 0.7
  },
  income: {
    modules: ['side_hustle', 'career_growth', 'income_diversification'],
    weight: 0.8
  },
  wealth: {
    modules: ['long_term_wealth', 'passive_income', 'financial_planning'],
    weight: 0.6
  },

  // Rastreamento
  tracking_detailed: {
    modules: ['advanced_analytics', 'pattern_detection'],
    weight: 0.4
  },
  tracking_basic: {
    modules: ['tracking_tools', 'automation'],
    weight: 0.6
  },
  tracking_none: {
    modules: ['tracking_setup', 'app_recommendations', 'budget_template'],
    weight: 0.95
  }
};
```

### 2.4 TRILHA: Relacionamentos

```typescript
TRAIL_TO_MODULES_RELATIONSHIPS = {
  // Estado atual
  relationships_thriving: {
    modules: ['deeper_connection', 'community_building'],
    weight: 0.3
  },
  relationships_good: {
    modules: ['relationship_growth', 'connection_deepening'],
    weight: 0.5
  },
  relationships_lonely: {
    modules: ['connection_building', 'social_anxiety_support', 'friendship_building'],
    weight: 0.95
  },
  relationships_conflicted: {
    modules: ['communication_skills', 'conflict_resolution', 'boundary_setting'],
    weight: 0.95
  },
  relationships_overwhelmed: {
    modules: ['boundary_setting', 'energy_management', 'saying_no'],
    weight: 0.85
  },

  // Áreas a melhorar
  family: {
    modules: ['family_dynamics', 'generational_healing', 'parent_adult_relationship'],
    weight: 0.8
  },
  romantic: {
    modules: ['relationship_insights', 'intimacy_building', 'couples_communication'],
    weight: 0.85
  },
  friendships: {
    modules: ['friendship_cultivation', 'social_skills', 'vulnerability_practice'],
    weight: 0.75
  },
  workplace: {
    modules: ['workplace_dynamics', 'networking', 'professional_communication'],
    weight: 0.7
  },
  self_relationship: {
    modules: ['self_love', 'self_worth', 'inner_child_healing'],
    weight: 0.9
  },
  community: {
    modules: ['community_finding', 'belonging', 'group_participation'],
    weight: 0.75
  },

  // Valores
  authenticity: {
    modules: ['authentic_expression', 'vulnerability'],
    weight: 0.7
  },
  support: {
    modules: ['emotional_support', 'ask_for_help'],
    weight: 0.7
  },
  growth: {
    modules: ['mutual_growth', 'accountability_partners'],
    weight: 0.6
  },
  fun: {
    modules: ['playfulness', 'shared_activities'],
    weight: 0.5
  },
  depth: {
    modules: ['deep_connection', 'emotional_intimacy'],
    weight: 0.8
  }
};
```

### 2.5 TRILHA: Crescimento Pessoal

```typescript
TRAIL_TO_MODULES_GROWTH = {
  // Clareza de propósito
  purpose_clear: {
    modules: ['purpose_alignment', 'goal_refinement'],
    weight: 0.4
  },
  purpose_somewhat: {
    modules: ['values_clarification', 'direction_setting'],
    weight: 0.7
  },
  purpose_uncertain: {
    modules: ['purpose_discovery', 'self_assessment', 'values_exploration'],
    weight: 0.9
  },
  purpose_lost: {
    modules: ['life_design', 'vision_setting', 'meaning_making', 'life_purpose'],
    weight: 1.0
  },
  purpose_wanting_change: {
    modules: ['career_transition', 'life_redesign', 'new_direction'],
    weight: 0.95
  },

  // Áreas de desenvolvimento
  skills: {
    modules: ['learning_paths', 'skill_building', 'course_recommendations'],
    weight: 0.7
  },
  career: {
    modules: ['career_planning', 'leadership_development', 'job_search'],
    weight: 0.8
  },
  creativity: {
    modules: ['creative_projects', 'artistic_exploration', 'expression'],
    weight: 0.6
  },
  spirituality: {
    modules: ['mindfulness', 'spiritual_exploration', 'meditation_practice'],
    weight: 0.7
  },
  habits: {
    modules: ['habit_building', 'behavior_change', 'routine_design'],
    weight: 0.85
  },
  confidence: {
    modules: ['confidence_building', 'fear_facing', 'courage_practice'],
    weight: 0.8
  },

  // Ritmo preferido
  pace_fast: {
    modules: ['intensive_programs', 'challenge_tracking', 'accountability'],
    weight: 0.8
  },
  pace_steady: {
    modules: ['progressive_learning', 'sustainable_growth'],
    weight: 0.7
  },
  pace_flexible: {
    modules: ['self_paced_learning', 'flexible_modules'],
    weight: 0.6
  },
  pace_passive: {
    modules: ['bite_sized_insights', 'occasional_learning'],
    weight: 0.4
  }
};
```

---

## 3. Algoritmo de Cálculo: Core Recommendation Logic

### 3.1 Pseudocódigo

```
FUNCTION generate_recommendations(user_context):

  // FASE 1: Coletar inputs
  trail_responses = get_onboarding_context_captures(user_id)
  moment_data = get_recent_moment_entries(user_id, limit=5)
  user_profile = get_user_profile(user_id)

  // FASE 2: Extrair sinais
  trail_signals = extract_trail_signals(trail_responses)  // Respostas explícitas
  moment_signals = extract_moment_signals(moment_data)    // Padrões implícitos
  implicit_signals = extract_implicit_signals(user_profile) // Perfil do usuário

  // FASE 3: Combinar sinais
  combined_signals = merge_signals(trail_signals, moment_signals, implicit_signals)

  // FASE 4: Scoring
  module_scores = {}
  FOR each module in ALL_MODULES:
    score = 0
    reason = ""

    // Verificar trail connections
    FOR each trail_signal in combined_signals.trails:
      IF module in TRAIL_TO_MODULES[trail_signal]:
        weight = TRAIL_TO_MODULES[trail_signal][module].weight
        signal_strength = trail_signal.importance  // 0-1
        score += (weight * signal_strength)
        reason += "Trail: " + trail_signal + "\n"

    // Verificar moment connections
    FOR each moment_signal in combined_signals.moments:
      IF module matches moment_signal.category:
        score += moment_signal.urgency * 0.7
        reason += "Recent moment pattern\n"

    // Boost complementary modules
    FOR each recommended_module in current_recommendations:
      IF module is_complementary_to recommended_module:
        score += 0.3
        reason += "Complements: " + recommended_module + "\n"

    // Penalize previously rejected
    IF user_previously_rejected[module]:
      score *= 0.5
      reason += "Note: User rejected before\n"

    module_scores[module] = {
      score: score,
      reason: reason
    }

  // FASE 5: Ranking e seleção
  ranked = sort(module_scores, by: score DESC)
  recommended = ranked[0:6]  // Top 6 módulos

  // FASE 6: Personalize order
  ordered = reorder_for_optimal_journey(recommended)

  RETURN {
    modules: ordered,
    rationale: build_explanation(ordered)
  }
```

### 3.2 Implementação TypeScript

```typescript
// recommendationEngine.ts

export interface ModuleRecommendation {
  moduleId: string;
  moduleName: string;
  description: string;
  score: number;         // 0-100
  reason: string;        // Explicação amigável
  suggestedStartDate: Date;
  estimatedTimeToComplete: number; // minutes
  priority: 'critical' | 'high' | 'medium' | 'low';
  complementaryModules: string[];
}

export interface RecommendationResult {
  recommendations: ModuleRecommendation[];
  personalizationSummary: string;
  nextReviewDate: Date;
}

export class RecommendationEngine {
  private allModules = MODULE_CATALOG;
  private trailMappings = TRAIL_TO_MODULES_MAP;

  async generateRecommendations(userId: string): Promise<RecommendationResult> {
    // Coletar dados
    const trailContext = await this.getTrailContext(userId);
    const momentPatterns = await this.analyzeMomentPatterns(userId);
    const userProfile = await this.getUserProfile(userId);

    // Extrair sinais
    const signals = this.extractSignals(trailContext, momentPatterns, userProfile);

    // Score módulos
    const moduleScores = this.scoreAllModules(signals);

    // Ranking
    const topModules = this.rankAndSelect(moduleScores);

    // Ordené para jornada ótima
    const ordered = this.optimizeJourneyOrder(topModules);

    // Gerar explicação
    const personalizationSummary = this.buildSummary(signals, ordered);

    return {
      recommendations: ordered,
      personalizationSummary,
      nextReviewDate: this.calculateNextReviewDate()
    };
  }

  private scoreAllModules(signals: ExtractedSignals): Map<string, ModuleScore> {
    const scores = new Map<string, ModuleScore>();

    // Inicializar todos os módulos com score 0
    this.allModules.forEach(module => {
      scores.set(module.id, {
        score: 0,
        reasons: [],
        trailMatches: [],
        momentMatches: [],
        complementaryBoosts: 0
      });
    });

    // Aplicar trail signals
    signals.trails.forEach(trailSignal => {
      const trailModules = this.trailMappings[trailSignal.trailId];

      trailModules.forEach(mapping => {
        const current = scores.get(mapping.moduleId)!;
        const weight = mapping.weight;
        const contribution = weight * trailSignal.strength * 100;

        current.score += contribution;
        current.reasons.push(
          `Você selecionou "${trailSignal.trailName}" como prioridade`
        );
        current.trailMatches.push(trailSignal.trailId);
      });
    });

    // Aplicar moment signals
    signals.moments.forEach(momentSignal => {
      const relevantModules = this.findModulesByCategory(momentSignal.category);

      relevantModules.forEach(module => {
        const current = scores.get(module.id)!;
        const contribution = momentSignal.urgency * 0.7 * 100;

        current.score += contribution;
        current.reasons.push(
          `Padrão detectado nos seus momentos recentes: "${momentSignal.pattern}"`
        );
        current.momentMatches.push(momentSignal.momentId);
      });
    });

    // Boost módulos complementares
    this.applyComplementaryBoosts(scores);

    // Aplicar penalidades
    signals.previouslyRejected.forEach(rejectedModuleId => {
      const current = scores.get(rejectedModuleId);
      if (current) {
        current.score *= 0.4;
        current.reasons.push('Você rejeitou este módulo anteriormente');
      }
    });

    return scores;
  }

  private rankAndSelect(scores: Map<string, ModuleScore>): ModuleRecommendation[] {
    const ranked = Array.from(scores.entries())
      .filter(([_, score]) => score.score > 0)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 6);

    return ranked.map(([moduleId, score]) => {
      const module = this.allModules.find(m => m.id === moduleId)!;
      const priority = this.calculatePriority(score.score);

      return {
        moduleId,
        moduleName: module.name,
        description: module.description,
        score: Math.min(100, score.score),
        reason: score.reasons[0] || 'Recomendado para você',
        suggestedStartDate: new Date(),
        estimatedTimeToComplete: module.estimatedMinutes,
        priority,
        complementaryModules: this.findComplementary(moduleId)
      };
    });
  }

  private calculatePriority(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private optimizeJourneyOrder(modules: ModuleRecommendation[]): ModuleRecommendation[] {
    // Reordenar para fluxo lógico
    // Ex: "Meditation Basics" antes de "Advanced Meditation"

    const dependencyMap = {
      'meditation_basics': ['meditation_for_anxiety', 'mindfulness'],
      'budget_basics': ['expense_tracking', 'savings_goals'],
      // ...
    };

    // Topological sort (simplified)
    const ordered: ModuleRecommendation[] = [];
    const visited = new Set<string>();

    const visit = (moduleId: string) => {
      if (visited.has(moduleId)) return;
      visited.add(moduleId);

      const dependencies = dependencyMap[moduleId] || [];
      dependencies.forEach(depId => {
        const depModule = modules.find(m => m.moduleId === depId);
        if (depModule) visit(depModule.moduleId);
      });

      const module = modules.find(m => m.moduleId === moduleId);
      if (module) ordered.push(module);
    };

    modules.forEach(m => visit(m.moduleId));

    return ordered;
  }

  private buildSummary(signals: ExtractedSignals, recommendations: ModuleRecommendation[]): string {
    const trails = signals.trails.map(t => t.trailName).join(', ');
    const topModule = recommendations[0]?.moduleName;

    return `Com base em sua trilha de ${trails} e seus momentos recentes, recomendamos começar com "${topModule}". Essa é a área onde você pode obter o maior impacto rápido.`;
  }

  private calculateNextReviewDate(): Date {
    const next = new Date();
    next.setDate(next.getDate() + 7); // Review weekly
    return next;
  }
}
```

---

## 4. Exemplos de Recomendações: Use Cases

### 4.1 Caso 1: Usuário Ansioso + Sem Controle Financeiro

**Inputs**:
```
Trails: health-emotional (anxious), finance (lost control)
Moments: "Acordei preocupado com dinheiro", sentiment: -0.8
```

**Scoring**:
```
meditation_basics: 95 (70 from anxiety + 25 from stress signal)
breathing_exercises: 90
budget_builder: 88 (85 from finance trail + 3 complementary)
expense_tracking: 85
debt_management: 80
sleep_hygiene: 60
```

**Output**:
```json
{
  "recommendations": [
    {
      "moduleId": "meditation_basics",
      "moduleName": "Meditação para Iniciantes",
      "score": 95,
      "reason": "Você selecionou 'ansioso' e seus momentos mostram preocupação financeira. Meditação reduz ansiedade e melhora clareza.",
      "priority": "critical"
    },
    {
      "moduleId": "breathing_exercises",
      "moduleName": "Exercícios de Respiração",
      "score": 90,
      "reason": "Técnicas rápidas para calmar a mente quando surge a ansiedade"
    },
    {
      "moduleId": "budget_builder",
      "moduleName": "Construtor de Orçamento",
      "score": 88,
      "reason": "Você quer melhorar controle financeiro. Este módulo lhe dá uma estratégia clara."
    }
  ],
  "personalizationSummary": "Sua ansiedade está conectada ao medo financeiro. Recomendamos primeiro acalmar sua mente com meditação, depois estruturar seu orçamento para ganhar confiança."
}
```

### 4.2 Caso 2: Usuário Solitário + Quer Crescimento

**Inputs**:
```
Trails: relationships (lonely), growth (wants change + spirituality)
Moments: "Sinto-me isolado", emotion: sad, life_areas: [relationships, personal]
```

**Scoring**:
```
connection_building: 92
social_skills: 88
community_finding: 85
mindfulness: 78
self_love: 75
vulnerability_practice: 72
```

**Output**:
```json
{
  "recommendations": [
    {
      "moduleId": "connection_building",
      "moduleName": "Construindo Conexões Autênticas",
      "score": 92,
      "reason": "Você expressou sentir-se isolado. Este módulo ensina como iniciar relacionamentos significativos.",
      "priority": "critical"
    },
    {
      "moduleId": "self_love",
      "moduleName": "Auto-Amor e Aceitação",
      "score": 75,
      "reason": "Conexões autênticas começam consigo mesmo. Trabalhar auto-compaixão primeiro."
    },
    {
      "moduleId": "community_finding",
      "moduleName": "Encontrando Comunidade",
      "score": 85,
      "reason": "Depois de conexões 1-1, expandir para comunidades que compartilham seus valores."
    }
  ]
}
```

### 4.3 Caso 3: Usuário Bem-Balanceado + Quer Otimizar

**Inputs**:
```
Trails: Nenhum selecionado (skipped) OU selecionou growth
Moments: "Tudo bem, mas quero crescer"
```

**Scoring**:
```
// Sem inputs explícitos, usar:
- Daily habits strength: 60
- Purpose discovery: 70
- Leadership development: 55
- Creative expression: 65
```

**Output**:
```json
{
  "recommendations": [
    {
      "moduleId": "purpose_discovery",
      "moduleName": "Descobrindo Seu Propósito",
      "score": 70,
      "reason": "Você quer crescimento pessoal. Clarificar seu propósito é o primeiro passo.",
      "priority": "high"
    },
    {
      "moduleId": "habit_building",
      "moduleName": "Construindo Hábitos Poderosos",
      "score": 60,
      "reason": "Transformação vem de pequenas ações consistentes. Este módulo cria sistemas sustentáveis."
    }
  ]
}
```

---

## 5. Fluxo de Persistência

```typescript
// POST /api/onboarding/finalize-and-recommend

async function finalizeOnboardingAndRecommend(userId: string) {
  // 1. Obter todos os contextos de trilhas completadas
  const contexts = await db.onboarding_context_captures
    .select('*')
    .eq('user_id', userId);

  // 2. Gerar recomendações
  const engine = new RecommendationEngine();
  const recommendations = await engine.generateRecommendations(userId);

  // 3. Persistir recomendações
  await db.user_module_recommendations
    .upsert({
      user_id: userId,
      recommended_modules: recommendations.modules.map(m => m.moduleId),
      recommendations_data: JSON.stringify(recommendations),
      generated_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

  // 4. Atualizar user profile
  await db.users
    .update({ id: userId }, {
      onboarding_completed: true,
      onboarding_completed_at: new Date(),
      first_recommended_module: recommendations.modules[0].moduleId
    });

  // 5. Trigger: Send welcome email with recommendations
  await sendWelcomeEmail(userId, recommendations);

  // 6. Retornar recomendações para UI
  return {
    success: true,
    recommendations: recommendations.modules,
    summary: recommendations.personalizationSummary
  };
}
```

---

## 6. Tabela de Armazenamento: user_module_recommendations

```sql
CREATE TABLE user_module_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Módulos recomendados (ordenados)
  recommended_modules TEXT[] NOT NULL,

  -- Dados completos das recomendações (JSON)
  recommendations_data JSONB NOT NULL,
  -- {
  --   "recommendations": [
  --     {
  --       "moduleId": "...",
  --       "score": 95,
  --       "reason": "...",
  --       "priority": "critical"
  --     }
  --   ],
  --   "personalizationSummary": "..."
  -- }

  -- Rastreamento de feedback
  user_feedback JSONB,
  -- {
  --   "accepted": ["module_1", "module_2"],
  --   "rejected": ["module_3"],
  --   "feedback_at": "2025-12-11T10:00:00Z"
  -- }

  -- Validade
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_recommendations_user_id ON user_module_recommendations(user_id);
CREATE INDEX idx_recommendations_expires_at ON user_module_recommendations(expires_at);
```

---

## 7. Learning from Feedback: Iteração Contínua

```typescript
// POST /api/recommendations/feedback

async function recordRecommendationFeedback(
  userId: string,
  moduleId: string,
  action: 'accepted' | 'rejected' | 'completed',
  feedback?: string
) {
  // 1. Registrar feedback
  await db.user_module_recommendations
    .update({ user_id: userId }, {
      user_feedback: {
        ...previousFeedback,
        [moduleId]: {
          action,
          feedback,
          timestamp: new Date()
        }
      },
      updated_at: new Date()
    });

  // 2. Ajustar scoring futuro
  if (action === 'rejected') {
    // Reduzir peso deste módulo e similares
    // Aumentar peso de módulos alternativos
  }

  if (action === 'completed') {
    // Reabrir recomendações
    // Sugerir módulos complementares
    // Celebrate with rewards
  }

  // 3. Retrigger recomendações se expiradas
  const recs = await db.user_module_recommendations
    .select('*')
    .eq('user_id', userId)
    .single();

  if (recs.expires_at < new Date()) {
    // Gerar novas recomendações
    const newRecs = await generateRecommendations(userId);
  }
}
```

---

## 8. Dashboard de Módulos Recomendados

```typescript
// GET /api/recommendations/for-user/:userId

async function getRecommendedModules(userId: string) {
  const recs = await db.user_module_recommendations
    .select('*')
    .eq('user_id', userId)
    .single();

  const modules = recs.recommended_modules.map(moduleId => {
    const module = MODULE_CATALOG.find(m => m.id === moduleId);
    const rec = recs.recommendations_data.recommendations.find(
      r => r.moduleId === moduleId
    );

    return {
      ...module,
      score: rec.score,
      reason: rec.reason,
      priority: rec.priority,
      startUrl: `/learn/${moduleId}`,
      estimatedTime: module.estimatedMinutes
    };
  });

  return {
    modules,
    summary: recs.recommendations_data.personalizationSummary,
    expiresAt: recs.expires_at
  };
}
```

---

## 9. Casos Especiais e Edge Cases

### 9.1 Usuário não completou nenhuma trilha

```
→ Usar momento_entries se disponível
→ Ou: Mostrar "Top 3 módulos" genéricos + sugerir trilhas
→ Ou: Esperar por momento capture para refinar
```

### 9.2 Usuário rejeitou todas as recomendações

```
→ Oferecer "Explorar módulos" (browse mode)
→ Permitir buscar por categoria
→ Ajustar algoritmo: aumentar diversidade de recomendações
→ Avisar: "Parece que nenhuma recomendação combinou com você.
         Vamos tentar uma abordagem diferente"
```

### 9.3 Usuário tem muitos momentos contraditórios

```
→ Exemplo: "Sou motivado!" + "Sou desmotivado"
→ Usar: weighted average (recentes > antigos)
→ Ou: Priorizar por timestamp (últimos 7 dias)
→ Avisar: "Detectamos emoções variadas. Vamos focar em estabilidade."
```

### 9.4 Novo módulo é lançado

```
→ Revisar recomendações de usuários existentes
→ Se módulo é altamente relevante para trilhas existentes
→ Incluir como "novo e relevante para você"
→ Ou: Esperar por próxima refresh (7 dias)
```

---

## 10. Analytics & Monitoring

```typescript
// Track recommendation effectiveness
export interface RecommendationMetrics {
  userId: string;
  recommendationId: string;
  moduleId: string;

  // Engagement
  clicked: boolean;
  clicked_at?: Date;
  started: boolean;
  started_at?: Date;
  completed: boolean;
  completed_at?: Date;

  // Satisfaction
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;

  // Relevance
  wasRelevant?: boolean;
  wouldRecommendToOthers?: boolean;
}

// Query: Quais módulos têm maior taxa de conclusão?
// Query: Qual trilha resulta em melhor engagement?
// Query: Qual explicação/reason é mais convincente?
```

---

**Documentação criada**: 11/12/2025
**Próximo passo**: Criar /todos directory e executive summary
