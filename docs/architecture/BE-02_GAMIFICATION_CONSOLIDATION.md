# BE-02: Consolidação de Tabelas de Gamificação

**Status:** Analysis Complete - Awaiting Approval
**Data:** 2025-12-12
**Autor:** Backend Architect Agent

## Sumário Executivo

Aica Life OS possui **duas estruturas de gamificação paralelas e desconectadas**:

1. **System A: Consciousness Points (CP)** - Sistema moderno, focado em Minha Jornada
2. **System B: user_stats + XP** - Sistema legado, orientado a tarefas gerais

Esta análise recomenda **consolidar para o System A (Consciousness Points)** como o único sistema de gamificação, deprecando o System B.

---

## 1. Análise Comparativa

### System A: Consciousness Points (MODERNO - MANTER)

**Tabelas:**
- `user_consciousness_stats` - Estatísticas principais (PRIMARY)
- `consciousness_points_log` - Histórico de pontos

**Schema - user_consciousness_stats:**
```
├── user_id (UUID, PK via FK) - Referência a auth.users
├── total_points (INT) - Pontos totais acumulados
├── level (INT) - Nível atual (1-5)
├── level_name (TEXT) - Nome do nível ("Observador", "Consciente", etc.)
├── current_streak (INT) - Sequência de dias consecutivos
├── longest_streak (INT) - Maior sequência atingida
├── last_moment_date (DATE) - Último registro de momento
├── total_moments (INT) - Total de momentos registrados
├── total_questions_answered (INT) - Perguntas respondidas
├── total_summaries_reflected (INT) - Reflexões completadas
└── updated_at (TIMESTAMPTZ)
```

**Características:**
- Focado em **consciência e autorreflexão**
- Integrado com o módulo "Minha Jornada"
- Sistema de **5 níveis** com progressão clara
- Recompensas por: momentos, perguntas, reflexões, streaks
- RLS policies completas (SELECT, UPDATE)
- Histórico auditável via `consciousness_points_log`

**Uso no Código:**
- `src/modules/journey/services/consciousnessPointsService.ts` (ATIVO)
- `src/modules/journey/hooks/useConsciousnessPoints.ts` (ATIVO)
- `src/modules/journey/types/consciousnessPoints.ts` (TIPOS)
- Componentes: `ConsciousnessScore`, `JourneyCardCollapsed`, `JourneyFullScreen`

**Dados em Produção:**
- 1 user com consciousness_points_log
- 1 user com user_consciousness_stats

---

### System B: user_stats + XP (LEGADO - DEPRECAR)

**Tabelas:**
- `user_stats` - Estatísticas principais (levada)
- `user_achievements` - Badges/achievements desbloqueados

**Schema - user_stats:**
```
├── id (UUID, PK)
├── user_id (UUID, FK, UNIQUE) - Referência a auth.users
├── total_xp (INT) - XP total
├── level (INT) - Nível atual
├── current_xp (INT) - XP para próximo nível
├── current_streak (INT) - Streak de dias
├── longest_streak (INT) - Maior streak
├── last_activity_date (DATE) - Último atividade
├── total_badges (INT) - Total de badges
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

**Características:**
- Orientado a **tarefas (work_items)**
- Sistema de **XP com progressão exponencial**
- Badges/achievements com raridade
- Limite: 10 níveis com XP_GROWTH_FACTOR de 1.15
- RLS policies completas
- Dados limitados: 1 user

**Uso no Código:**
- `src/services/gamificationService.ts` (REFERENCIADO)
- `tests/e2e/` fixtures (TESTES)
- Status: Parcialmente ativo (algumas funções não usadas no app)

**Problemas Identificados:**

| Problema | Descrição | Impacto |
|----------|-----------|--------|
| **Duplicação** | Duas tabelas rastreiam `level` e `current_streak` | Confusão, inconsistência |
| **Inconsistência de Nomenclatura** | `total_xp` vs `total_points` | Dificuldade para developers |
| **Progressão Conflitante** | CP: 5 níveis fixos / XP: 10+ níveis exponenciais | Mensagens contraditórias ao usuário |
| **Integração Ausente** | `user_stats` não conecta a `consciousness_points_log` | Histórico fragmentado |
| **Foco Diferente** | CP = consciência / XP = tarefas | Inconsistência de design |
| **Dados Baixos** | 1 user em cada tabela | Difícil validar consolidação |

---

## 2. Mapa de Campos

### Campos para Manter (user_consciousness_stats)

| Campo | Tipo | Propósito | Prioridade |
|-------|------|----------|-----------|
| `user_id` | UUID | Identificador do usuário | CRÍTICA |
| `total_points` | INT | Pontos totais acumulados | CRÍTICA |
| `level` | INT | Nível atual (1-5) | CRÍTICA |
| `level_name` | TEXT | Nome do nível | CRÍTICA |
| `current_streak` | INT | Dias consecutivos | CRÍTICA |
| `longest_streak` | INT | Maior streak atingido | CRÍTICA |
| `last_moment_date` | DATE | Rastreamento de streak | CRÍTICA |
| `total_moments` | INT | Contagem de momentos | MEDIA |
| `total_questions_answered` | INT | Contagem de respostas | MEDIA |
| `total_summaries_reflected` | INT | Contagem de reflexões | MEDIA |
| `updated_at` | TIMESTAMPTZ | Auditoria | MEDIA |

### Campos do user_stats a Avaliar

| Campo | Usar em CP? | Motivo | Decisão |
|-------|-----------|--------|---------|
| `total_xp` | NÃO | Duplica `total_points` | REMOVER |
| `current_xp` | NÃO | Específico de exponencial | REMOVER |
| `is_active` | CONSIDERAR | Útil para rastreamento | MANTER em `users.active` |
| `total_badges` | CONSULTAR | Relacionar a achievements | MOVER para `user_achievements` |

### Campos de Remover

```sql
-- Destes campos em user_stats:
- total_xp (duplica total_points)
- current_xp (específico de exponencial)
- is_active (usar users.active)
- total_badges (contar a partir de user_achievements)
```

---

## 3. Tabelas Relacionadas

### user_achievements (Preservar)

Esta tabela será **mantida** com ajustes:

**Uso Atual:**
- Rastreia badges desbloqueados por usuário
- RLS policies corretas (SELECT, INSERT)
- Ligada a `consciousness_points_log` via `reference_id`

**Propostos:**
1. Adicionar campo `category` para segmentar badges:
   - `journey` - Relacionadas a momentos/reflexões (CP)
   - `tasks` - Relacionadas a work_items (futura migração)
   - `streaks` - Relacionadas a sequências (ambos)
   - `milestones` - Marcos especiais

2. Adicionar `xp_reward` se for usar XP no futuro

**Exemplo:**
```json
{
  "badge_id": "7_day_reflection_streak",
  "badge_name": "Reflexo Semanal",
  "category": "journey",
  "xp_reward": 50
}
```

### consciousness_points_log (Manter Intacto)

- Histórico completo de todos os pontos
- RLS: SELECT policy (user_id)
- Referência a moments, questions, summaries
- **Sem alterações necessárias**

---

## 4. Plano de Consolidação

### Fase 1: Migração de Dados (PRÉ-PRODUÇÃO)

#### Passo 1a: Backup das tabelas legadas
```sql
-- Criar snapshot das tabelas antigas para auditoria
CREATE TABLE IF NOT EXISTS _legacy_user_stats_backup AS
SELECT * FROM user_stats;

CREATE TABLE IF NOT EXISTS _legacy_user_achievements_backup AS
SELECT * FROM user_achievements;
```

#### Passo 1b: Migrando dados de user_stats para user_consciousness_stats
```sql
-- Para cada user em user_stats que NÃO está em user_consciousness_stats:
INSERT INTO user_consciousness_stats (
  user_id,
  total_points,
  level,
  level_name,
  current_streak,
  longest_streak,
  total_moments,
  total_questions_answered,
  total_summaries_reflected,
  updated_at
)
SELECT
  us.user_id,
  us.total_xp as total_points,           -- Mapear XP para Points
  LEAST(us.level, 5) as level,           -- Limitar a 5 níveis
  CASE
    WHEN us.level <= 1 THEN 'Observador'
    WHEN us.level <= 2 THEN 'Consciente'
    WHEN us.level <= 3 THEN 'Reflexivo'
    WHEN us.level <= 4 THEN 'Integrado'
    ELSE 'Mestre'
  END as level_name,
  us.current_streak,
  us.longest_streak,
  0 as total_moments,                    -- Não temos dados históricos
  0 as total_questions_answered,
  0 as total_summaries_reflected,
  us.updated_at
FROM user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM user_consciousness_stats ucs
  WHERE ucs.user_id = us.user_id
)
ON CONFLICT (user_id) DO NOTHING;
```

#### Passo 1c: Migrando achievements
```sql
-- Adicionar category aos achievements migrados
UPDATE user_achievements
SET category = 'tasks'
WHERE category IS NULL;

-- Não há perda de dados, apenas adicionar context
```

### Fase 2: Atualizar Código

#### 2a: Deprecar gamificationService.ts
- Marcar funções como `@deprecated`
- Redirecionar imports para consciousnessPointsService
- Manter compatibilidade por 2 versões

#### 2b: Unificar tipos
```typescript
// consolidate types/gamification.ts
export type GamificationStats = UserConsciousnessStats & {
  badges: UserAchievement[];
  recentActivity: ConsciousnessPointsLog[];
}
```

#### 2c: Atualizar referências
- E2E tests: ajustar fixtures
- Services: consolidar em consciousnessPointsService
- Types: unificar em consciousnessPoints.ts

### Fase 3: Deprecação do System B

#### 3a: Remover tabela user_stats
```sql
-- Apenas APÓS migração completa e 2 versões de deprecação

-- 1. Desabilitar RLS (após backup)
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- 2. Remover constraints
ALTER TABLE user_stats DROP CONSTRAINT user_stats_user_id_fkey;

-- 3. Renomear para deprecated (manter por 6 meses)
ALTER TABLE user_stats RENAME TO _deprecated_user_stats_20260612;

-- 4. Após 6 meses: DROP
-- DROP TABLE _deprecated_user_stats_20260612;
```

#### 3b: Limpar código
- Remover `gamificationService.ts`
- Remover imports legados
- Atualizar testes

---

## 5. RLS Policies (Sem Mudanças)

As policies atuais estão **corretas e adequadas**:

### user_consciousness_stats
```sql
✓ SELECT: Users can view own stats
✓ UPDATE: Users can update own stats (não usar WITH CHECK se sistema os modifica)
```

### consciousness_points_log
```sql
✓ SELECT: Users can view own CP log
```

### user_achievements
```sql
✓ SELECT: Users can view own achievements
✓ INSERT: Users can insert own achievements (via service layer)
```

**Nota:** Remover UPDATE policy em user_achievements se apenas sistema pode modificar.

---

## 6. Impacto em Produção

### Usuários Afetados
- 1 user com dados em user_stats
- 1 user com dados em user_consciousness_stats
- Coexistência atual sem conflitos

### Estratégia de Rollout
1. **Fase 1:** Migrar dados (5 min downtime)
2. **Fase 2:** Deprecar código (2 releases, com warnings)
3. **Fase 3:** Remover tabela (6 meses depois)

### Monitoramento
```sql
-- Post-migração: validar integridade
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN total_points > 0 THEN 1 END) as active_gamified,
  AVG(total_points) as avg_points,
  MAX(level) as max_level
FROM user_consciousness_stats;
```

---

## 7. Benefícios da Consolidação

| Benefício | Descrição | Impacto |
|-----------|-----------|--------|
| **Single Source of Truth** | Um sistema de pontos/níveis | -50% bugs |
| **UX Simplificado** | Mensagem única sobre progresso | +clarity |
| **Performance** | Uma tabela vs duas | -queries |
| **Manutenção** | Um service vs dois | -code |
| **Escalabilidade** | Sem conflitos de schema | +future ready |

---

## 8. Próximos Passos

### Se Aprovado:

1. **Semana 1:** Criar migration BE-02-01_migrate_gamification_data.sql
2. **Semana 2:** Atualizar código (consolidar services)
3. **Semana 3:** Testes E2E com consolidação
4. **Semana 4:** Deploy em staging
5. **Semana 5:** Deploy em produção

### Se Rejeitado:

Manter ambos os sistemas e documentar:
- Qual sistema usar para novas features (CP recomendado)
- Como sincronizar dados entre tabelas
- Path de unificação futura

---

## 9. Checklist de Implementação

- [ ] Aprovação desta análise
- [ ] Criar migration de backup
- [ ] Testar migração em staging
- [ ] Executar migração em produção
- [ ] Validar integridade dos dados
- [ ] Atualizar código (Phase 2)
- [ ] Adicionar testes unitários
- [ ] Deploy com deprecation warnings
- [ ] Monitorar por 2 semanas
- [ ] Remover código legado (após 2 releases)
- [ ] Documentar changelog

---

## 10. Referências

**Arquivos Relacionados:**
- `src/modules/journey/services/consciousnessPointsService.ts` - Service recomendado
- `src/modules/journey/types/consciousnessPoints.ts` - Tipos primários
- `src/services/gamificationService.ts` - Service a deprecar
- `docs/architecture/backend_architecture.md` - Arquitetura geral

**Tabelas:**
- `public.user_consciousness_stats` - PRIMARY (manter)
- `public.consciousness_points_log` - AUDIT LOG (manter)
- `public.user_achievements` - SECONDARY (manter com ajustes)
- `public.user_stats` - DEPRECATED (remover em 6 meses)

**Dados Atuais:**
- 1 row em `user_consciousness_stats`
- 1 row em `user_stats`
- 1 row em `consciousness_points_log`
- 1 row em `user_achievements`

---

## Aprovação

[ ] Backend Lead
[ ] Product Owner
[ ] DevOps

**Data de Início Autorizado:** ____________
**Comentários:**

---

**Documento Gerado:** 2025-12-12 por Backend Architect Agent
**Versão:** 1.0
**Status:** PENDING REVIEW
