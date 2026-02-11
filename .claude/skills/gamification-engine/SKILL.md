---
name: gamification-engine
description: Motor de Gamificacao - especialista no sistema de gamificacao (XP, CP, badges, streaks, levels, grace periods, recovery). Use quando trabalhar com experience points, consciousness points, achievements, badge catalog, streak trends, grace periods, recovery mode, ou leaderboard.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Gamification Engine - Motor de Gamificacao

Especialista no sistema de gamificacao cross-cutting do AICA Life OS. Gerencia dual currency (XP + CP), 27 badges com catalogo RECIPE, streaks compassivos com grace periods, niveis, e notificacoes.

---

## Arquitetura (Cross-Cutting)

> **Sistema distribuido**: A gamificacao nao e um modulo isolado, mas permeia todo o app.

```
src/services/
|-- gamificationService.ts         # XP, levels, badges, streak trends
|-- badgeEvaluationService.ts      # Avaliacao de condicoes de badges
|-- streakRecoveryService.ts       # Grace periods + recovery mode

src/types/
|-- badges.ts                      # BADGE_CATALOG (27 badges)
|-- recipe.ts                      # RECIPE framework + Octalysis drives
|-- streakTrend.ts                 # Trend display, compassionate messages

src/components/features/
|-- GamificationWidget.tsx         # Widget principal (XP, level, streak)
|-- GamificationWidget.css         # Estilos

src/components/gamification/
|-- XPGainPopup.tsx               # Popup de ganho de XP
|-- BadgeUnlockModal.tsx          # Modal de badge desbloqueado
|-- index.ts

src/modules/journey/components/gamification/
|-- ConsciousnessScore.tsx        # Display de CP (5 tiers)

src/contexts/
|-- XPNotificationContext.tsx     # Context para notificacoes de XP

src/modules/connections/hooks/
|-- useWhatsAppGamification.ts    # Gamificacao especifica WhatsApp
```

---

## Dual Currency: XP + CP

### XP (Experience Points)
- **Moeda global**: ganha-se em QUALQUER modulo
- **Progressao**: niveis com crescimento exponencial (1000 base × 1.15^level)
- **Servico**: `gamificationService.ts`
- **Leaderboard**: ranking entre usuarios

### CP (Consciousness Points)
- **Moeda do Journey**: so ganha-se em atividades de autoconhecimento
- **5 Tiers fixos**: Observador → Mestre
- **Servico**: `consciousnessPointsService.ts`
- **RPC**: `award_consciousness_points(user_id, amount, reason)`

### Comparacao

| Aspecto | XP | CP |
|---------|----|----|
| Escopo | Global (todos modulos) | Journey only |
| Niveis | Infinitos (exponencial) | 5 tiers fixos |
| Streak | Compassionate trend | Dias consecutivos |
| Servico | gamificationService | consciousnessPointsService |
| Tabela | user_game_profiles | user_consciousness_stats |

---

## CP Tiers (5 Niveis)

| Nivel | Nome | Faixa | Cor |
|-------|------|-------|-----|
| 1 | Observador | 0-99 | slate-400 |
| 2 | Consciente | 100-499 | blue-500 |
| 3 | Reflexivo | 500-1,499 | purple-500 |
| 4 | Integrado | 1,500-4,999 | amber-500 |
| 5 | Mestre | 5,000+ | yellow-500 |

### CP Rewards

| Acao | CP |
|------|----|
| `moment_registered` | 5 |
| `question_answered` | 10 |
| `weekly_reflection` | 20 |
| `streak_7_days` | 50 |

---

## XP Leveling

```typescript
// Base: 1000 XP, crescimento: 15% por nivel
const XP_PER_LEVEL = 1000;
const XP_GROWTH_FACTOR = 1.15;

// Nivel N requer: 1000 × 1.15^(N-1) XP
function xpRequiredForLevel(level: number): number {
  return Math.floor(XP_PER_LEVEL * Math.pow(XP_GROWTH_FACTOR, level - 1));
}
```

---

## Badge Catalog (27 Badges)

### Categorias

| Categoria | Descricao | Icone | Cor |
|-----------|-----------|-------|-----|
| `reflection` | Autoconhecimento | mirror | #8B5CF6 |
| `flow` | Foco e produtividade | wave | #3B82F6 |
| `comeback` | Resiliencia | fire | #F59E0B |
| `connection` | Relacionamentos | heart | #10B981 |
| `mastery` | Expertise | star | #EC4899 |

### Raridades

| Raridade | Nome PT | Multiplicador |
|----------|---------|---------------|
| `common` | Comum | 1x |
| `rare` | Raro | 2x |
| `epic` | Epico | 3x |
| `legendary` | Lendario | 5x |

### Badges por Categoria

**Reflection (5)**:
- Primeiro Espelho (common), Semana Consciente (rare), Explorador Interior (rare), Pensador Profundo (epic), Mestre de Si (legendary)

**Flow (5 white + 2 black)**:
- Primeira Vitoria (common), Guerreiro de Tarefas (rare), Mestre do Foco (rare), Domador de Urgencias (epic), Lenda da Produtividade (legendary)
- Black Hat: Sobrevivente (rare), Heroi de Ultima Hora (rare, secret)

**Comeback (5)**:
- Graca Aceita (common), Fenix Renascida (rare), Espirito Resiliente (epic), Mestre do Equilibrio (epic), Inabalavel (legendary)

**Connection (5)**:
- Primeiro Cuidado (common), Coracao Cuidador (rare), Curador de Relacoes (epic), Mestre das Conexoes (epic), Coracao de Ouro (legendary)

**Mastery (5)**:
- Nivel 1 (common), Nivel 5 (rare), Nivel 10 (epic), Colecionador (epic), Campeao de Consciencia (legendary)

### Hat Types

| Hat | Comportamento | Badges |
|-----|--------------|--------|
| `white_hat` | Habilitado por padrao | 25 badges |
| `black_hat` | Desabilitado por padrao (opt-in) | 2 badges |

White Hat = motivacao positiva (accomplishment, empowerment, meaning)
Black Hat = urgencia (avoidance, scarcity) — usar com cautela

---

## Unlock Conditions

```typescript
type BadgeUnlockCondition =
  | { type: 'streak_days'; days: number }
  | { type: 'streak_recovery'; count: number }
  | { type: 'grace_period_used'; count: number }
  | { type: 'tasks_completed'; count: number }
  | { type: 'tasks_priority'; priority: number; count: number }
  | { type: 'cp_earned'; amount: number }
  | { type: 'cp_category'; category: string; amount: number }
  | { type: 'journal_entries'; count: number }
  | { type: 'mood_checks'; count: number }
  | { type: 'contacts_cared'; count: number }
  | { type: 'health_score_improved'; count: number }
  | { type: 'focus_sessions'; count: number; min_minutes?: number }
  | { type: 'trend_maintained'; percentage: number; days: number }
  | { type: 'level_reached'; level: number }
  | { type: 'badges_earned'; count: number }
  | { type: 'compound'; conditions: BadgeUnlockCondition[]; operator: 'AND' | 'OR' }
```

---

## Gamification 2.0: Streaks Compassivos

### Filosofia
- **Tendencia > Perfeicao**: "47/50 dias" em vez de "streak: 47"
- **Grace periods**: 4 por mes para imprevistos da vida
- **Recovery**: Recuperar streak via esforco (3 tasks), nao punicao
- **Mensagens compassivas**: Celebrar retornos, nao punir ausencias

### StreakTrendInfo
```typescript
interface StreakTrendInfo extends StreakInfo {
  trendDisplay: string;          // "47/50 dias"
  trendPercentage: number;       // 0-100
  trendQuality: 'excellent' | 'good' | 'moderate' | 'needs_attention';
  trendColor: string;

  // Grace period
  isInGracePeriod: boolean;
  gracePeriodRemaining: number;  // Restante no mes

  // Recovery
  canRecover: boolean;
  isRecovering: boolean;
  recoveryProgress: number;      // 0-3 tasks
  recoveryTasksNeeded: number;

  message: CompassionateMessage | null;
}
```

### Grace Period Flow
```
Streak quebrado → Verificar grace periods restantes (4/mes)
    |-- Se disponivel: useGracePeriod() → streak mantido
    |-- Se esgotado: streak reseta → oferecer recovery
```

### Recovery Flow
```
Streak resetado → startStreakRecovery()
    → Complete 3 tasks para restaurar
    → recoveryProgress: 0 → 1 → 2 → 3
    → Streak restaurado + badge "Fenix Renascida"
```

---

## RECIPE Framework

O sistema de badges segue o framework RECIPE (baseado em Octalysis):

| Pilar | Drive | Exemplo |
|-------|-------|---------|
| **R**eflection | Epic Meaning | Mestre de Si |
| **E**ngagement | Social Influence | Coracao de Ouro |
| **C**hoice | Empowerment | Fenix Renascida |
| **I**nformation | Accomplishment | Lenda da Produtividade |
| **P**lay | Unpredictability | Mestre do Foco |
| **E**volution | Ownership | Colecionador |

---

## Componentes UI

| Componente | Funcao |
|------------|--------|
| `GamificationWidget` | Widget principal: level, XP bar, streak trend, badges recentes |
| `ConsciousnessScore` | CP display: total, nivel, progresso, streak |
| `XPGainPopup` | Popup temporario quando ganha XP |
| `BadgeUnlockModal` | Modal celebratorio ao desbloquear badge |
| `XPNotificationContext` | Provider para notificacoes de XP globais |

---

## Tabelas do Banco

| Tabela | Proposito |
|--------|-----------|
| `user_game_profiles` | Perfil XP (level, total_xp, streak) |
| `user_badges` | Badges conquistados |
| `user_consciousness_stats` | Estado CP (total_points, level, streak) |
| `consciousness_points_log` | Log de transacoes CP |

---

## Padroes Criticos

### SEMPRE:
- CP awards via RPC `award_consciousness_points` (SECURITY DEFINER)
- XP awards via `gamificationService.awardXP()`
- Badge evaluation via `badgeEvaluationService`
- Grace periods: max 4 por mes, verificar antes de usar
- Recovery: exatamente 3 tasks para restaurar
- White Hat badges habilitados por padrao, Black Hat opt-in
- Notificacoes via `XPNotificationContext`

### NUNCA:
- Dar CP fora do modulo Journey (XP sim, CP nao)
- Permitir Black Hat badges sem opt-in do usuario
- Resetar streak sem verificar grace periods primeiro
- Chamar `supabase.auth.refreshSession()` incondicionalmente nos hooks de gamificacao
- Punir usuario por quebra de streak (usar mensagens compassivas)
- Dar XP negativo (sistema so soma, nunca subtrai)
