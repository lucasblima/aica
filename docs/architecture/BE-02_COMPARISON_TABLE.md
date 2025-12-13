# BE-02: Gamification Systems - Detailed Comparison

## Schema Comparison

### user_consciousness_stats (MODERNO - MANTER)

| Campo | Tipo | Nulo | Default | Propósito | Status |
|-------|------|------|---------|-----------|--------|
| `user_id` | UUID | NÃO | - | PK (via FK) | MANTER |
| `total_points` | INT | SIM | 0 | Pontos acumulados | MANTER |
| `level` | INT | SIM | 1 | Nível (1-5) | MANTER |
| `level_name` | TEXT | SIM | 'Observador' | Nome do nível | MANTER |
| `current_streak` | INT | SIM | 0 | Dias consecutivos | MANTER |
| `longest_streak` | INT | SIM | 0 | Recorde de streak | MANTER |
| `last_moment_date` | DATE | SIM | NULL | Rastreamento | MANTER |
| `total_moments` | INT | SIM | 0 | Contagem | MANTER |
| `total_questions_answered` | INT | SIM | 0 | Contagem | MANTER |
| `total_summaries_reflected` | INT | SIM | 0 | Contagem | MANTER |
| `updated_at` | TIMESTAMPTZ | SIM | NOW() | Auditoria | MANTER |

**Tamanho Estimado:** ~110 bytes/row

---

### user_stats (LEGADO - DEPRECAR)

| Campo | Tipo | Nulo | Default | Propósito | Ação |
|-------|------|------|---------|-----------|------|
| `id` | UUID | NÃO | - | PK (não usado) | REMOVER |
| `user_id` | UUID | NÃO | - | FK | MIGRAR |
| `total_xp` | INT | SIM | 0 | XP total | → total_points |
| `level` | VARCHAR | SIM | 'Beginner' | Nível | → level (1-5) |
| `current_xp` | NUMERIC | SIM | 0 | XP do nível | REMOVER |
| `efficiency_score` | NUMERIC | SIM | 0.0 | Métrica | REMOVER |
| `current_streak` | INT | SIM | 0 | Streak | MIGRAR |
| `longest_streak` | INT | SIM | 0 | Recorde | MIGRAR |
| `achievements` | JSONB | SIM | '[]' | Badges | → user_achievements |
| `created_at` | TIMESTAMPTZ | SIM | NOW() | Timestamp | REMOVER |
| `updated_at` | TIMESTAMPTZ | SIM | NOW() | Timestamp | REMOVER |

**Tamanho Estimado:** ~250 bytes/row (com JSONB)

---

## Campos a Migrar

### Mapeamento Direto

```
user_stats                    →  user_consciousness_stats
───────────────────────────────────────────────────────
user_id                       →  user_id
total_xp                      →  total_points (rename)
level ('Beginner'→1, etc.)    →  level (normalize to 1-5)
current_streak                →  current_streak (copy)
longest_streak                →  longest_streak (copy)
last_activity_date            →  last_moment_date (convert DATE)
```

### Campos com Transformação

```
level transformation:
  'Beginner' (0-99 XP)      →  1, 'Observador'
  'Intermediate' (100+)     →  2, 'Consciente'
  'Advanced' (500+)         →  3, 'Reflexivo'
  'Master' (1500+)          →  4, 'Integrado'
  5+ (legacy levels)        →  5, 'Mestre' (capped)
```

### Campos a Descartar

```
current_xp        - Específico de sistema exponencial (não aplicável)
efficiency_score  - Métrica não usada (abandonar)
id (in user_stats)- Redundante (usar user_id)
achievements      - Migrar para tabela separada user_achievements
created_at        - Novo created_at será NOW() da migration
```

---

## Níveis: Comparação de Sistemas

### Sistema A: Consciousness Points (5 níveis fixos)

```
Level 1: Observador      [0 - 99 pontos]      ░░░░░░░░░░
Level 2: Consciente      [100 - 499 pontos]   ███░░░░░░░
Level 3: Reflexivo       [500 - 1499 pontos]  ██████░░░░
Level 4: Integrado       [1500 - 4999 pontos] █████████░
Level 5: Mestre          [5000+ pontos]       ██████████
```

**Progressão:** Linear com breakpoints fixos
**Tempo para Max:** ~1-2 anos (1 momento/dia = 5 pts = 1000 dias)

---

### Sistema B: XP (10+ níveis exponenciais)

```
Level 1: 0 - 1000 XP                         ░░░░░░░░░░
Level 2: 1000 - 2150 XP                      ███░░░░░░░
Level 3: 2150 - 3473 XP                      █████░░░░░
Level 4: 3473 - 4999 XP                      ███████░░░
Level 5: 4999 - 6751 XP                      █████████░
...
Level 10: 25000+ XP                          ██████████
```

**Progressão:** Exponencial (cada nível +15% XP)
**Tempo para Max:** ~5-10 anos de atividade contínua

---

## Recompensas: Comparação

### Consciousness Points - Recompensas por Ação

| Ação | Pontos | Frequência | Pontos/Dia |
|------|--------|-----------|-----------|
| Momento registrado | 5 | 1/dia | 5 |
| Pergunta respondida | 10 | 1/dia | 10 |
| Reflexão semanal | 20 | 1/semana | ~3 |
| Streak 7 dias | 50 | 1/semana | ~7 |
| **Total esperado/dia** | - | - | **~25** |

---

### XP System - Recompensas por Ação

| Ação | XP | Frequência | XP/Dia |
|------|-----|-----------|--------|
| Task concluída | 25-100 | 1-2/dia | 50-200 |
| Badge desbloqueada | 50-2000 | 1/mês | ~100 |
| Streak milestone | 250-1000 | 1/semana | ~100 |
| **Total esperado/dia** | - | - | **~250** |

**Conclusão:** XP é mais rápido (10x), mas pouco usado no app

---

## Tabelas Relacionadas

### user_achievements (Mantém como está)

```sql
┌─ user_achievements ─────────────────────┐
│ id (UUID, PK)                          │
│ user_id (UUID, FK → auth.users)        │
│ badge_id (TEXT, ex: '7_day_streak')    │
│ badge_name (TEXT)                      │
│ description (TEXT)                     │
│ icon (TEXT)                            │
│ rarity (common|rare|epic|legendary)    │
│ xp_reward (INT, ex: 50)                │
│ unlocked_at (TIMESTAMPTZ)              │
│ created_at (TIMESTAMPTZ)               │
│ category (TEXT) [NOVO - ADICIONAR]     │
└────────────────────────────────────────┘
```

**Novo Campo: category**
```
category IN ('journey', 'tasks', 'streaks', 'milestones', 'other')

Exemplos:
├── journey
│   ├── 7_day_reflection_streak (novo)
│   ├── first_moment_registered (novo)
│   └── weekly_summary_reflection (novo)
├── tasks
│   ├── first_task
│   ├── task_master (50 tasks)
│   └── perfect_day
├── streaks
│   ├── week_warrior (7-day streak)
│   ├── month_marathon (30-day)
│   └── saver_streak (3-month budget)
└── milestones
    ├── level_10 (reach level)
    └── first_upload (various)
```

---

## RLS Policies: Não Mudar

### Current (Correct)

```sql
-- user_consciousness_stats
CREATE POLICY "Users can view own stats" ON user_consciousness_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_consciousness_stats
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- consciousness_points_log
CREATE POLICY "Users can view own CP log" ON consciousness_points_log
  FOR SELECT USING (auth.uid() = user_id);

-- user_achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Assessment:** ✓ COMPLETO e CORRETO
- SELECT: ✓ permite leitura
- INSERT: ✓ permite criação (via service)
- UPDATE: ✓ permite atualização (sistema)
- DELETE: ✗ não permitido (bom, histórico)

---

## Service Layer Impact

### Before (2 services)

```
src/services/
├── gamificationService.ts
│   ├── addXP()
│   ├── getUserGameProfile()
│   ├── updateStreakStatus()
│   ├── awardAchievement()
│   ├── getLeaderboard()
│   └── ... (20+ funções)
│
src/modules/journey/services/
├── consciousnessPointsService.ts
│   ├── getUserConsciousnessStats()
│   ├── getCPLog()
│   ├── getUserProgress()
│   ├── getRecentAchievements()
│   └── getLeaderboard()
│
└── Resultado: Confusão, código duplicado
```

### After (1 service)

```
src/modules/journey/services/
├── consciousnessPointsService.ts [UNIFIED]
│   ├── getUserConsciousnessStats()
│   ├── getCPLog()
│   ├── getUserProgress()
│   ├── getRecentAchievements()
│   ├── getLeaderboard()
│   ├── awardAchievement()
│   ├── updateStreakStatus()
│   └── ... (extended with badges)
│
└── Resultado: Uma fonte única de verdade
```

**Funções a Adicionar:**
```typescript
// No consciousnessPointsService
export async function awardAchievement(
  userId: string,
  badgeId: string,
  category: 'journey' | 'streaks' | 'milestones'
): Promise<Achievement>;

export async function updateStreakFromMoment(
  userId: string,
  momentDate: Date
): Promise<StreakResult>;

export async function checkAndAwardStreakBadges(
  userId: string
): Promise<Achievement[]>;
```

---

## Performance Comparison

### Database Queries

#### Before (2 systems)
```
User loads dashboard:
├── SELECT from user_stats (11 cols)
├── SELECT from user_consciousness_stats (11 cols)
├── SELECT from user_achievements (9 cols, optional)
└── SELECT from consciousness_points_log (7 cols)
= 4 tables, potential inconsistency
```

#### After (consolidated)
```
User loads dashboard:
├── SELECT from user_consciousness_stats (11 cols)
├── SELECT from user_achievements (9 cols, optional)
└── SELECT from consciousness_points_log (7 cols)
= 3 tables, single source of truth
```

**Improvement:** 25% fewer queries

### Storage Efficiency

```
Before:
  user_stats (1 row):            ~250 bytes
  user_consciousness_stats (1):  ~110 bytes
  ─────────────────────────────────────────
  Total:                         ~360 bytes (duplication)

After:
  user_consciousness_stats (1):  ~110 bytes
  ─────────────────────────────────────────
  Total:                         ~110 bytes
  Savings:                       ~250 bytes (70% reduction)

Scale to 10k users:
  Before: ~3.6 MB
  After:  ~1.1 MB
  Savings: ~2.5 MB (70%)
```

---

## Code Changes Matrix

### Files to Update

| File | Current | Action | Impact |
|------|---------|--------|--------|
| `src/services/gamificationService.ts` | 750 LOC | DEPRECATE | HIGH |
| `src/modules/journey/services/consciousnessPointsService.ts` | 200 LOC | EXTEND | MEDIUM |
| `src/modules/journey/types/consciousnessPoints.ts` | 140 LOC | EXTEND | LOW |
| `tests/e2e/persistence-fixtures.ts` | 100 LOC | UPDATE | LOW |
| `tests/e2e/db-helpers.ts` | 150 LOC | SIMPLIFY | MEDIUM |
| `docs/architecture/backend_architecture.md` | N/A | UPDATE | LOW |

**Total LOC Changes:** ~500 LOC (consolidation)

---

## Migration Effort Estimation

| Fase | Atividade | Tempo | Esforço |
|------|-----------|-------|--------|
| **1a** | Backup | 5 min | Trivial |
| **1b** | Data Migration SQL | 10 min | Low |
| **1c** | Validation | 10 min | Low |
| **2a** | Update Services | 2h | Medium |
| **2b** | Update Tests | 1h | Low |
| **2c** | Deprecation Warnings | 30 min | Low |
| **2d** | Testing & QA | 4h | Medium |
| **3a** | Code Cleanup | 1h | Low |
| **3b** | Documentation | 1h | Low |

**Total:** ~2.5 days (1 developer)

---

## Risk Matrix

| Risco | Severidade | Probabilidade | Mitigação |
|-------|-----------|---------------|-----------|
| Data loss | CRÍTICA | MUITO BAIXA | Backup, validation |
| User impact | ALTA | BAIXA | 2 test users only |
| Query breakage | MÉDIA | BAIXA | Comprehensive tests |
| Performance | BAIXA | MUITO BAIXA | Schema simpler |
| Code bugs | MÉDIA | MÉDIA | Code review + tests |

**Overall Risk Level:** LOW ✓

---

## Approval Gates

### Gate 1: Data Migration (Phase 1)
**Requires:** Backend Lead approval + DBA review

### Gate 2: Code Consolidation (Phase 2)
**Requires:** Tech Lead + QA sign-off

### Gate 3: Table Cleanup (Phase 3)
**Requires:** DevOps + 6-month monitoring period

---

## Rollback Procedure

If migration fails:

```sql
-- Step 1: Restore from backup
INSERT INTO user_stats
SELECT * FROM _audit_legacy_user_stats_20250612;

-- Step 2: Verify counts
SELECT COUNT(*) FROM user_stats;           -- Should match backup

-- Step 3: Revert DB changes
DELETE FROM user_consciousness_stats
WHERE user_id NOT IN (
  SELECT user_id FROM _audit_legacy_user_stats_20250612
);

-- Step 4: Notify team
-- Migration rolled back, investigating cause
```

**Rollback Time:** <5 minutes

---

**Document:** BE-02 Comparison Table
**Version:** 1.0
**Status:** Ready for Review
