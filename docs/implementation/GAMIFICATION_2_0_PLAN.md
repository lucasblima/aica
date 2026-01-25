# Gamification 2.0 - Plano de Implementacao em 4 Fases

**Issue:** #XXX - Gamification 2.0 - Meaningful Gamification
**Branch:** `feature/gamification-2-0`
**Data:** 2026-01-22

## Visao Geral da Arquitetura

Este plano organiza a implementacao do Gamification 2.0 em fases incrementais, minimizando breaking changes e permitindo validacao progressiva. Cada fase eh autocontida e pode ser deployada independentemente.

**Principios Orientadores:**
- Black Hat mecanicas (streaks rigidos, scarcity, avoidance) desabilitadas por padrao
- Foco em White Hat (autonomy, mastery, meaning, social influence)
- Compaixao > Punicao
- Intensidade controlada via `gamification_intensity` (minimal/moderate/full)

---

## Diagrama de Dependencias

```
Fase 1: Streak Recovery
    |
    v
Fase 2: Consciousness Points <---- (integra Health Score)
    |
    v
Fase 3: RECIPE + Badges <---- (usa CP para rewards)
    |
    v
Fase 4: Unified Efficiency <---- (usa relationship_health de Fase 2)
```

**Nota:** Fases 1 e 2 podem ser desenvolvidas em paralelo. Fases 3 e 4 dependem de Fase 2.

---

## Fase 1: Streak Recovery + Trends

**Objetivo:** Substituir o sistema de streak punitivo por um modelo compassivo baseado em tendencias.

**Duracao Estimada:** 3-4 dias

**Racional:** Esta fase tem o menor impacto em outras partes do sistema e estabelece a base para o modelo compassivo.

### Arquivos a Criar

| Arquivo | Descricao | Status |
|---------|-----------|--------|
| `src/types/streakTrend.ts` | Tipos para tendencias e grace periods | ⏳ |
| `src/services/streakRecoveryService.ts` | Logica de recovery e trends | ⏳ |
| `src/hooks/useStreakTrend.ts` | Hook React para consumir tendencias | ⏳ |

### Arquivos a Modificar

| Arquivo | Modificacoes | Status |
|---------|-------------|--------|
| `src/services/gamificationService.ts` | Integrar com streakRecoveryService | ⏳ |
| `src/components/features/GamificationWidget.tsx` | Exibir tendencia ao inves de streak rigido | ⏳ |

### Migration

```sql
-- 20260123_streak_trends.sql
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS streak_trend JSONB DEFAULT '{
  "activeDays": [],
  "currentTrend": 0,
  "trendWindow": 50,
  "gracePeriodUsed": false,
  "lastGracePeriodDate": null,
  "recoveryProgress": 0
}';

ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS grace_periods_used_this_month INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS last_grace_period_at TIMESTAMPTZ;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS active_days_last_30 INTEGER DEFAULT 0;
```

### Criterios de Conclusao

- [ ] Streak de 47/50 dias exibido corretamente na UI
- [ ] Grace period automatico ativado apos 1 dia de pausa
- [ ] Recovery por esforço funcionando (3 tarefas extras = recupera tendencia)
- [ ] Mensagens compassivas exibidas ao inves de "Voce perdeu seu streak!"
- [ ] Testes unitarios para streakRecoveryService (>80% coverage)
- [ ] Nenhuma regressao no gamification existente

### Detalhamento Tecnico

**src/types/streakTrend.ts:**
```typescript
export interface StreakTrend {
  activeDays: string[]; // ISO dates dos ultimos 50 dias ativos
  currentTrend: number; // Ex: 47 de 50
  trendWindow: number; // Default 50
  gracePeriodUsed: boolean;
  lastGracePeriodDate: string | null;
  recoveryProgress: number; // 0-3 tarefas para recovery
}

export interface CompassionateMessage {
  type: 'grace_period' | 'recovery_available' | 'trend_celebration';
  message: string;
  actionSuggestion?: string;
}
```

---

## Fase 2: Consciousness Points (CP)

**Objetivo:** Introduzir CP como metrica separada de XP, focada em crescimento pessoal e conexoes humanas.

**Duracao Estimada:** 4-5 dias

**Racional:** CP eh o core do sistema compassivo e integra com Health Score (relacionamentos).

### Arquivos a Criar

| Arquivo | Descricao | Status |
|---------|-----------|--------|
| `src/types/consciousnessPoints.ts` | Tipos para CP, levels, titulos | ⏳ |
| `src/services/consciousnessPointsService.ts` | Logica de acumulo e levels | ⏳ |
| `src/hooks/useConsciousnessPoints.ts` | Hook React para CP | ⏳ |
| `src/components/features/ConsciousnessPointsDisplay.tsx` | UI para exibir CP e nivel | ⏳ |

### Arquivos a Modificar

| Arquivo | Modificacoes | Status |
|---------|-------------|--------|
| `src/services/contactHealthService.ts` | Integrar award de +8 CP por contato em risco atendido | ⏳ |
| `src/modules/journey/services/journeyService.ts` | Award CP em acoes de reflexao | ⏳ |
| `src/components/features/GamificationWidget.tsx` | Exibir CP junto com XP | ⏳ |

### Migration

```sql
-- 20260124_consciousness_points.sql

-- Tabela de historico de CP
CREATE TABLE public.consciousness_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'relationship_care', 'reflection', 'gratitude', 'milestone'
  source_id UUID, -- ID do contato, momento, etc
  description TEXT,
  core_drive TEXT, -- 'meaning', 'empowerment', 'social_influence', etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_cp_history_user_id ON public.consciousness_points_history(user_id);
CREATE INDEX idx_cp_history_created_at ON public.consciousness_points_history(created_at DESC);

-- RLS
ALTER TABLE public.consciousness_points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CP history" ON public.consciousness_points_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert CP" ON public.consciousness_points_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Adicionar CP total ao user_stats
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS total_cp INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS cp_level INTEGER DEFAULT 1;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS cp_title TEXT DEFAULT 'Desperto';
```

### Criterios de Conclusao

- [ ] Tabela `consciousness_points_history` criada e com RLS
- [ ] CP separado de XP na UI
- [ ] +8 CP ao cuidar de contato em risco (Health Score integration)
- [ ] +5 CP por momento de reflexao registrado
- [ ] +3 CP por gratidao expressa
- [ ] CP levels funcionando (1-10 com titulos)
- [ ] Testes E2E para fluxo de award de CP

### CP Levels e Titulos

| Level | Min CP | Titulo | Descricao |
|-------|--------|--------|-----------|
| 1 | 0 | Desperto | Iniciando a jornada |
| 2 | 100 | Buscador | Buscando conexoes |
| 3 | 300 | Crescente | Crescimento visivel |
| 4 | 600 | Nutridor | Nutrindo relacoes |
| 5 | 1000 | Florescente | Florescendo |
| 6 | 1500 | Iluminador | Iluminando caminhos |
| 7 | 2200 | Transcendente | Transcendendo limites |
| 8 | 3000 | Harmonizador | Em harmonia |
| 9 | 4000 | Iluminado | Iluminacao proxima |
| 10 | 5500 | Consciente | Consciencia plena |

### CP Sources (Health Score Integration)

| Source | CP | Descricao |
|--------|------|-----------|
| `relationship_care` | +8 | Cuidar de contato em risco |
| `reflection` | +5 | Momento de reflexao |
| `gratitude` | +3 | Expressar gratidao |
| `milestone_personal` | +15 | Marco pessoal alcancado |
| `weekly_review` | +10 | Revisao semanal completa |

---

## Fase 3: RECIPE Framework + Novos Badges

**Objetivo:** Implementar badges baseados no RECIPE framework com foco em White Hat drives.

**Duracao Estimada:** 5-6 dias

**Racional:** Badges sao o elemento mais visivel da gamificacao e devem refletir valores compassivos.

### Arquivos a Criar

| Arquivo | Descricao | Status |
|---------|-----------|--------|
| `src/types/recipe.ts` | RECIPE framework types | ⏳ |
| `src/types/badges.ts` | Novos tipos de badges | ⏳ |
| `src/services/badgeEvaluationService.ts` | Logica de avaliacao de badges | ⏳ |
| `src/data/badges/reflectionBadges.ts` | Badges de reflexao | ⏳ |
| `src/data/badges/flowBadges.ts` | Badges de flow/balance | ⏳ |
| `src/data/badges/comebackBadges.ts` | Badges de comeback (compassivos) | ⏳ |
| `src/data/badges/connectionBadges.ts` | Badges de conexao humana | ⏳ |
| `src/components/features/BadgeShowcase.tsx` | UI para exibir badges | ⏳ |

### Migration

```sql
-- 20260125_recipe_badges.sql

-- Adicionar metadata RECIPE aos badges existentes
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS core_drive TEXT;
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS recipe_category TEXT;
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS is_black_hat BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS cp_reward INTEGER DEFAULT 0;

-- Tabela de definicoes de badges (catalog)
CREATE TABLE public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  core_drive TEXT NOT NULL,
  recipe_category TEXT NOT NULL,
  is_black_hat BOOLEAN DEFAULT FALSE,
  enabled_by_default BOOLEAN DEFAULT TRUE,
  criteria JSONB NOT NULL,
  cp_reward INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badge definitions" ON public.badge_definitions
  FOR SELECT USING (TRUE);
```

### Criterios de Conclusao

- [ ] Tabela `badge_definitions` populada com 15+ badges iniciais
- [ ] Badges Black Hat marcados e desabilitados por padrao
- [ ] Badge showcase funcional na UI
- [ ] Badges de comeback (compassivos) funcionando
- [ ] Notificacao ao desbloquear badge
- [ ] CP e XP awards corretos ao desbloquear
- [ ] Filtro por `gamification_intensity` funcionando

### Novos Badges (RECIPE-based)

#### Reflection Badges
| Badge | Descricao | CP | XP | Core Drive |
|-------|-----------|-----|-----|------------|
| Primeiro Reflexo | Registrou seu primeiro momento de reflexao | 5 | 50 | meaning |
| Semana de Gratidao | Expressou gratidao por 7 dias seguidos | 15 | 100 | meaning |
| Contemplador | Visualizou Vida em Semanas 10 vezes | 20 | 80 | meaning |

#### Connection Badges
| Badge | Descricao | CP | XP | Core Drive |
|-------|-----------|-----|-----|------------|
| Heroi dos Relacionamentos | Cuidou de 10 contatos em risco | 30 | 150 | social_influence |
| Rede Saudavel | 80%+ contatos com health score healthy | 40 | 200 | accomplishment |

#### Flow/Balance Badges
| Badge | Descricao | CP | XP | Core Drive |
|-------|-----------|-----|-----|------------|
| Mestre do Flow | Completou 5 sessoes de foco profundo | 20 | 120 | accomplishment |
| Buscador de Equilibrio | Manteve work-life balance por 30 dias | 40 | 200 | empowerment |

#### Comeback Badges (Compassivos)
| Badge | Descricao | CP | XP | Core Drive |
|-------|-----------|-----|-----|------------|
| Fenix Renascida | Retornou apos 14+ dias de pausa | 25 | 100 | empowerment |
| Espirito Resiliente | Recuperou o streak 3 vezes | 35 | 150 | empowerment |

---

## Fase 4: Unified Efficiency Score

**Objetivo:** Refatorar o Efficiency Score para incluir relationship health e work-life balance.

**Duracao Estimada:** 4-5 dias

**Racional:** O score unificado eh a metrica central que reflete o equilibrio entre produtividade e bem-estar.

### Arquivos a Criar

| Arquivo | Descricao | Status |
|---------|-----------|--------|
| `src/types/unifiedEfficiency.ts` | Tipos para score unificado | ⏳ |
| `src/services/unifiedEfficiencyService.ts` | Nova formula com 5 componentes | ⏳ |
| `src/hooks/useUnifiedEfficiency.ts` | Hook para consumir score | ⏳ |
| `src/components/features/EfficiencyBreakdown.tsx` | UI detalhada do score | ⏳ |

### Arquivos a Modificar

| Arquivo | Modificacoes | Status |
|---------|-------------|--------|
| `src/services/efficiencyService.ts` | Deprecar gradualmente, redirecionar | ⏳ |
| `src/components/features/EfficiencyIndicator.tsx` | Usar novo service | ⏳ |

### Migration

```sql
-- 20260126_unified_efficiency.sql

-- Tabela de historico de efficiency score
CREATE TABLE public.efficiency_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Componentes (soma = 100%)
  task_completion_score INTEGER NOT NULL, -- 25%
  priority_alignment_score INTEGER NOT NULL, -- 20%
  relationship_health_score INTEGER NOT NULL, -- 20%
  consistency_score INTEGER NOT NULL, -- 20%
  work_life_balance_score INTEGER NOT NULL, -- 15%

  -- Score final
  unified_score INTEGER NOT NULL,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Indices
CREATE INDEX idx_efficiency_history_user_date ON public.efficiency_score_history(user_id, date DESC);

-- RLS
ALTER TABLE public.efficiency_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own efficiency history" ON public.efficiency_score_history
  FOR SELECT USING (auth.uid() = user_id);
```

### Criterios de Conclusao

- [ ] Nova formula implementada com 5 componentes
- [ ] Pesos configurados corretamente
- [ ] UI de breakdown funcional
- [ ] Historico de scores armazenado
- [ ] Migracao suave do service antigo
- [ ] Grafico de evolucao do score
- [ ] Testes unitarios para calculo de cada componente

### Nova Formula

| Componente | Peso | Descricao |
|------------|------|-----------|
| Task Completion | 25% | Tarefas concluidas / planejadas |
| Priority Alignment | 20% | Tarefas importantes primeiro |
| Relationship Health | 20% | Health Score medio dos contatos |
| Consistency | 20% | Regularidade ao longo do tempo |
| Work-Life Balance | 15% | Equilibrio trabalho/pessoal |

```typescript
export function calculateUnifiedScore(components): number {
  return Math.round(
    components.taskCompletion * 0.25 +
    components.priorityAlignment * 0.20 +
    components.relationshipHealth * 0.20 +
    components.consistency * 0.20 +
    components.workLifeBalance * 0.15
  );
}
```

---

## Configuracao de Intensidade

O sistema respeita `gamification_intensity` do usuario:

| Nivel | Comportamento |
|-------|---------------|
| `minimal` | Apenas CP e efficiency score. Sem badges, sem notificacoes |
| `moderate` | CP, badges White Hat, notificacoes discretas |
| `full` | Todos os recursos, incluindo Black Hat se habilitado manualmente |

---

## Checklist Geral de Implementacao

### Pre-Requisitos
- [ ] Backup do banco de dados
- [ ] Branch `feature/gamification-2-0` criada a partir de `main`
- [ ] Revisar codigo existente de gamification

### Fase 1 (Streak Recovery) - 3-4 dias
- [ ] Criar `src/types/streakTrend.ts`
- [ ] Criar `src/services/streakRecoveryService.ts`
- [ ] Criar `src/hooks/useStreakTrend.ts`
- [ ] Modificar `gamificationService.ts`
- [ ] Modificar `GamificationWidget.tsx`
- [ ] Criar migration `20260123_streak_trends.sql`
- [ ] Testes unitarios
- [ ] Deploy staging + validacao

### Fase 2 (Consciousness Points) - 4-5 dias
- [ ] Criar `src/types/consciousnessPoints.ts`
- [ ] Criar `src/services/consciousnessPointsService.ts`
- [ ] Criar `src/hooks/useConsciousnessPoints.ts`
- [ ] Criar `ConsciousnessPointsDisplay.tsx`
- [ ] Modificar `contactHealthService.ts` (+8 CP)
- [ ] Criar migration `20260124_consciousness_points.sql`
- [ ] Testes E2E
- [ ] Deploy staging + validacao

### Fase 3 (RECIPE + Badges) - 5-6 dias
- [ ] Criar `src/types/recipe.ts`
- [ ] Criar `src/services/badgeEvaluationService.ts`
- [ ] Criar arquivos de badges por categoria
- [ ] Criar `BadgeShowcase.tsx`
- [ ] Criar migration `20260125_recipe_badges.sql`
- [ ] Popular badge_definitions
- [ ] Testes
- [ ] Deploy staging + validacao

### Fase 4 (Unified Efficiency) - 4-5 dias
- [ ] Criar `src/types/unifiedEfficiency.ts`
- [ ] Criar `src/services/unifiedEfficiencyService.ts`
- [ ] Criar `src/hooks/useUnifiedEfficiency.ts`
- [ ] Criar `EfficiencyBreakdown.tsx`
- [ ] Deprecar efficiencyService antigo
- [ ] Criar migration `20260126_unified_efficiency.sql`
- [ ] Testes
- [ ] Deploy staging + validacao

### Pos-Implementacao
- [ ] Atualizar documentacao
- [ ] Atualizar CLAUDE.md
- [ ] Merge para main
- [ ] Deploy producao
- [ ] Monitorar metricas

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Regressao no gamification existente | Media | Alto | Testes E2E antes de cada merge |
| Performance com historico grande | Baixa | Medio | Indices no banco, paginacao |
| Confusao CP vs XP para usuarios | Media | Baixo | Tooltips claros |
| Migration falha em producao | Baixa | Alto | Testar em staging primeiro |

---

**Ultima atualizacao:** 2026-01-22
**Responsavel:** Lucas + Claude
