# PHASE 3.3: Learning Feedback Loop para Recomendações

**Data:** Dezembro 2025
**Status:** Implementation Complete
**Versão:** 1.0

## Visão Geral

O **Learning Feedback Loop** é o terceiro componente da PHASE 3 do sistema de recomendações de módulos da Aica Life OS. Ele permite que o sistema aprenda com o feedback do usuário e ajuste dinamicamente as recomendações futuras.

### Objetivos

1. **Capturar feedback explícito** do usuário sobre recomendações
2. **Aprender preferências** através de aceitação/rejeição de módulos
3. **Ajustar pesos dinâmicos** do algoritmo de recomendação por usuário
4. **Integrar gamificação** para incentivar interação
5. **Fornecer insights** sobre preferências de aprendizado

### Componentes Principais

- **Database Schema**: Tabelas para feedback e pesos dinâmicos
- **Learning Service**: `feedbackLoopService.ts` - Lógica de aprendizado
- **UI Components**: Componentes React para coleta de feedback
- **API Layer**: Endpoints para comunicação com backend
- **Gamification**: Integração com sistema de pontos/conquistas

---

## 1. Database Schema

### Tabela: `user_module_feedback`

Armazena cada instância de feedback do usuário em uma recomendação.

```sql
CREATE TABLE user_module_feedback (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK → auth.users),
  module_id UUID NOT NULL (FK → module_definitions),
  recommendation_id UUID (FK → module_recommendations_log),
  feedback_type TEXT CHECK (IN ['accepted', 'rejected', 'skipped']),
  confidence_score_at_time DECIMAL(5,2),
  reason TEXT,
  interacted_at TIMESTAMPTZ NOT NULL,
  progress INTEGER (0-100),
  completed_at TIMESTAMPTZ,
  rating INTEGER (1-5),
  created_at, updated_at TIMESTAMPTZ
);
```

**Campos Principais:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `feedback_type` | ENUM | 'accepted' = usuário aceitou a recomendação<br>'rejected' = usuário rejeitou<br>'skipped' = deixou pra depois |
| `confidence_score_at_time` | DECIMAL | Score de confiança (0-100) que o algoritmo tinha quando recomendou |
| `reason` | TEXT | JSON com motivos da rejeição/feedback adicional |
| `progress` | INTEGER | Porcentagem de conclusão (0-100%) |
| `rating` | INTEGER | Avaliação em estrelas (1-5) após conclusão |

**Índices para Performance:**

- `user_id` (busca rápida de feedback de um usuário)
- `module_id` (análise de qual módulo é mais rejeitado)
- `feedback_type` (filtros por tipo)
- `interacted_at DESC` (histórico ordenado)
- `user_id, module_id` (busca específica)
- `completed_at` (apenas módulos completados)

**View: `user_module_feedback_summary`**

Agregação automática de estatísticas por usuário e módulo:

```
SELECT
  user_id, module_id,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE feedback_type = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE feedback_type = 'rejected') as rejected_count,
  ROUND(AVG(rating), 2) as average_rating,
  MAX(interacted_at) as last_interaction_at,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - interacted_at))) / 3600, 2) as avg_completion_time_hours,
  (SELECT progress FROM user_module_feedback ... ORDER BY interacted_at DESC LIMIT 1) as current_progress
```

### Tabela: `user_module_weights`

Armazena pesos dinâmicos personalizados para cada usuário-módulo.

```sql
CREATE TABLE user_module_weights (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (FK),
  module_id UUID NOT NULL (FK),
  base_weight DECIMAL(6,3) DEFAULT 1.0,
  acceptance_bonus DECIMAL(6,3),
  rejection_penalty DECIMAL(6,3),
  completion_bonus DECIMAL(6,3),
  rating_bonus DECIMAL(6,3),
  recency_decay DECIMAL(6,3),
  final_weight DECIMAL(6,3) (0.1 - 10.0),
  total_feedback_count INTEGER,
  last_feedback_date TIMESTAMPTZ,
  weight_recalculated_at TIMESTAMPTZ,
  created_at, updated_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);
```

**Propósito:**

- Mantém histórico completo de como o peso foi calculado
- `final_weight` é usado no algoritmo de recomendação
- Recalculado automaticamente após cada novo feedback

**Triggers:**

- `calculate_module_weight_after_feedback()` - Dispara após INSERT/UPDATE em `user_module_feedback`
- `update_updated_at()` - Mantém timestamp automático

### Tabela: `user_module_weight_audit`

Log de auditoria para rastrear mudanças de pesos.

```sql
CREATE TABLE user_module_weight_audit (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL,
  old_weight DECIMAL(6,3),
  new_weight DECIMAL(6,3),
  reason TEXT,
  changed_at TIMESTAMPTZ
);
```

---

## 2. Learning Algorithm

### Fórmula de Cálculo de Peso

```
final_weight =
  base_weight +
  (accepted_count × +5.0) +
  (rejected_count × -3.0) +
  (completed_count × +10.0) +
  (average_rating × +2.0) +
  (days_since_feedback × -0.1) +
  recency_boost
```

**Componentes:**

| Componente | Valor | Descrição |
|-----------|-------|-----------|
| `base_weight` | 1.0 | Peso inicial padrão |
| Aceitação | +5.0 | Cada aceitação aumenta peso |
| Rejeição | -3.0 | Cada rejeição diminui peso |
| Conclusão | +10.0 | Conclusão = forte positivo |
| Rating | +2.0 | Por ponto (1-5) de avaliação |
| Decay | -0.1 | Por dia desde o último feedback |
| Recency Boost | 2.0x | Se feedback < 7 dias |

### Limites de Peso

```
WEIGHT_LIMITS = {
  MIN: 0.1,    // Módulos muito rejeitados ainda aparecem
  MAX: 10.0    // Módulos muito aceitos não dominam completamente
}
```

### Decay de Recência

Feedback recente é mais importante:

```javascript
function calculateRecencyDecay(daysSince) {
  if (daysSince <= 7) {
    return 2.0;  // 2x boost para feedback nos últimos 7 dias
  }

  if (daysSince >= 30) {
    // Começar a decair após 30 dias
    const decayDays = daysSince - 30;
    return Math.max(0.5, 1.0 - decayDays * 0.01);
  }

  return 1.0;  // Peso normal
}
```

### Exemplo de Cálculo

**Usuário: Alice | Módulo: "Meditação para Ansiedade"**

Histórico de Feedback:
- 3 aceitações
- 2 rejeições
- 1 conclusão com rating 4.5
- Últimas aceitação: 5 dias atrás

```
final_weight = 1.0 +
               (3 × 5.0) +      // +15 por aceitações
               (2 × -3.0) +     // -6 por rejeições
               (1 × 10.0) +     // +10 por conclusão
               (4.5 × 2.0) +    // +9 por rating
               (5 × -0.1) +     // -0.5 por decay
               2.0              // 2.0 boost de recência

final_weight = 1.0 + 15 - 6 + 10 + 9 - 0.5 + 2.0 = 30.5
clamped to max 10.0

final_weight = 10.0  // Módulo muito recomendado para Alice!
```

---

## 3. Componentes React

### RecommendationCard.tsx

**Props:**
```typescript
interface RecommendationCardProps {
  recommendation: ModuleRecommendation;
  onFeedbackSubmitted?: () => void;
  isLoading?: boolean;
}
```

**Funcionalidades:**

1. **Exibição de Recomendação:**
   - Título e descrição do módulo
   - Score de confiança (0-100%)
   - Tempo estimado
   - Badge de prioridade (critical/high/medium/low)
   - Fatores gatilho explicados ao usuário

2. **Ações Disponíveis:**
   - **Aceitar (Green)**: Registra feedback de aceitação
   - **Não Agora (Gray)**: Registra como "skipped" (sem rejeição)
   - **Rejeitar (Red)**: Abre modal para coletar motivo

3. **Rating Opcional:**
   - Interface de 5 estrelas
   - Apenas visual (salvo após conclusão do módulo)

4. **Integração:**
   - Chama `feedbackLoopService.recordModuleFeedback()`
   - Atualiza pesos automaticamente
   - Dispara callback ao concluir

### FeedbackModal.tsx

**Abre quando usuário clica "Rejeitar"**

**Razões Pré-definidas:**

1. 😐 Não me interessa neste tópico
2. ✓ Já conheço este conteúdo
3. 😣 Muito difícil para meu nível
4. ⏰ Não tenho tempo agora
5. ❌ Não é uma boa recomendação pra mim
6. 🤔 Outro motivo

**Features:**

- Múltiplas seleções (usuário pode escolher várias razões)
- Textarea para feedback adicional (máx 500 caracteres)
- Validação simples (pelo menos 1 razão OU comentário)
- Mostra benefício de feedback ("ajuda melhorar recomendações")

### ModuleProgressTracker.tsx

**Exibido após usuário aceitar um módulo**

**Stats Exibidos:**

```
┌─────────────────────────────────────┐
│ Meditation for Anxiety              │
│ ├─ Overall Progress: 45%            │
│ │  [████░░░░░░░░░░░░░░░░░░░░░]     │
│ │                                   │
│ ├─ Lessons: 2/5 completed           │
│ ├─ Time: 12/30 min                  │
│ └─ Status: In Progress              │
│                                     │
│ [25%] [50%] [75%] [Complete]       │
│ [Slider para ajustar manualmente]   │
│                                     │
│ [Mark as Complete] (se progress >= 80%)
└─────────────────────────────────────┘
```

**Funcionalidades:**

1. **Atualização de Progresso:**
   - Botões rápidos (25%, 50%, 75%, 100%)
   - Slider contínuo
   - Salva automaticamente

2. **Conclusão de Módulo:**
   - Interface de 5 estrelas para rating
   - Botão "Mark as Complete" (ativado quando progress >= 80%)
   - Calcula tempo total gasto

3. **Gamificação:**
   - Exibe XP ganhos ao completar
   - Mostra achievement desbloqueado (se houver)
   - Nível novo (se houver level-up)

---

## 4. Serviço de Feedback Loop

### `feedbackLoopService.ts` (600+ linhas)

**Métodos Públicos:**

#### `recordModuleFeedback()`

```typescript
async recordModuleFeedback(
  userId: string,
  moduleId: string,
  feedbackType: 'accepted' | 'rejected' | 'skipped',
  options?: {
    recommendationId?: string;
    confidenceScore?: number;
    reason?: string;
  }
): Promise<ModuleFeedback>
```

**O que faz:**
1. Insere registro em `user_module_feedback`
2. Dispara trigger para recalcular pesos
3. Award gamification points (se aceitar)
4. Envia notificação ao usuário
5. Retorna registro criado

**Exemplo:**
```typescript
await feedbackLoopService.recordModuleFeedback(
  'user123',
  'meditation-anxiety',
  'rejected',
  {
    confidenceScore: 92,
    reason: JSON.stringify({
      reasons: ['already_know'],
      comment: 'I already completed this course'
    })
  }
);
```

#### `updateModuleWeight()`

```typescript
async updateModuleWeight(
  userId: string,
  moduleId: string,
  feedbackType: string
): Promise<WeightCalculationResult>
```

**O que faz:**
1. Busca histórico de feedback
2. Calcula novo peso usando fórmula
3. Aplica decay de recência
4. Clamp entre 0.1 e 10.0
5. Upsert em `user_module_weights`
6. Log em audit trail

#### `getUserPreferences()`

```typescript
async getUserPreferences(userId: string): Promise<UserModulePreferences>
```

**Retorna:**
```typescript
{
  userId: string;
  accepted_modules: [{moduleId, moduleName, acceptedAt, completionRate, rating}];
  rejected_modules: [{moduleId, moduleName, rejectedAt, reasons}];
  in_progress_modules: [{moduleId, moduleName, progress, startedAt}];
  completed_modules: [{moduleId, moduleName, completedAt, rating, timeSpent}];
  stats: {
    total_accepted: number;
    total_rejected: number;
    total_completed: number;
    acceptance_rate: 0-1;
    completion_rate: 0-1;
    avg_rating: 0-5;
    learning_pace: 'fast' | 'steady' | 'slow';
  };
}
```

#### `handleModuleCompletion()`

```typescript
async handleModuleCompletion(
  userId: string,
  moduleId: string,
  options?: {
    rating?: number;
    timeSpent?: number;
    feedback?: string;
  }
): Promise<ModuleCompletionResult>
```

**O que faz:**
1. Marca como 100% progresso e completado
2. Calcula XP: 50 base + (rating × 10)
3. Awards via gamificationService
4. Verifica achievements
5. Atualiza peso (bonus de conclusão)
6. Envia notificação celebrando

**Retorna:**
```typescript
{
  moduleId: string;
  success: boolean;
  xpAwarded: number;
  achievement_unlocked?: string; // 'EARLY_ADOPTER', 'LEARNER', etc
  newLevel?: number;
  levelUpBonus?: number;
}
```

#### `recalculateUserWeights()`

```typescript
async recalculateUserWeights(userId: string): Promise<Map<string, number>>
```

**Uso:** Batch recalculation após mudanças em massa
**O que faz:**
1. Busca todos os módulos com feedback
2. Recalcula peso para cada um
3. Retorna Map de módulo → novo peso

#### `getModuleCompletionStatus()`

```typescript
async getModuleCompletionStatus(
  userId: string,
  moduleId: string
): Promise<{status, progress, rating?, completedAt?}>
```

**Usa para:** UI saber o estado de um módulo

#### `decayOldRecommendations()`

```typescript
async decayOldRecommendations(userId: string, decayDays: number = 30)
```

**Chamado:** Diariamente via cron job
**O que faz:** Reduz peso de recomendações antigas

---

## 5. API Endpoints

### POST `/api/recommendations/:moduleId/feedback`

**Submeter feedback sobre uma recomendação**

Request:
```json
{
  "userId": "user-uuid",
  "moduleId": "module-uuid",
  "feedbackType": "accepted|rejected|skipped",
  "recommendationId": "rec-uuid (opcional)",
  "confidenceScore": 92.5,
  "reason": "JSON string com motivos"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "feedback-id",
    "user_id": "...",
    "feedback_type": "rejected",
    "reason": "...",
    "interacted_at": "2025-12-11T10:30:00Z"
  }
}
```

### POST `/api/modules/:moduleId/complete`

**Marcar módulo como concluído**

Request:
```json
{
  "userId": "user-uuid",
  "moduleId": "module-uuid",
  "rating": 4,
  "timeSpent": 45,
  "feedback": "Great module!"
}
```

Response:
```json
{
  "moduleId": "...",
  "success": true,
  "xpAwarded": 90,
  "achievement_unlocked": "LEARNER",
  "newLevel": 5,
  "levelUpBonus": 100
}
```

### GET `/api/user/module-preferences`

**Obter preferências e histórico do usuário**

Response:
```json
{
  "userId": "...",
  "accepted_modules": [...],
  "rejected_modules": [...],
  "in_progress_modules": [...],
  "completed_modules": [...],
  "stats": {
    "total_accepted": 8,
    "total_rejected": 3,
    "total_completed": 6,
    "acceptance_rate": 0.73,
    "completion_rate": 0.75,
    "avg_rating": 4.2,
    "learning_pace": "steady"
  }
}
```

### GET `/api/user/recommendations/updated`

**Obter recomendações com pesos aprendidos aplicados**

Response:
```json
{
  "recommendations": [
    {
      "moduleId": "...",
      "moduleName": "...",
      "score": 95,
      "confidence": 0.95,
      "userWeight": 8.5,
      "reason": "Based on your learning pace...",
      ...
    }
  ]
}
```

### GET `/api/user/module-weights`

**Visualizar pesos dinâmicos pessoalizados**

Response:
```json
[
  {
    "module_id": "meditation-anxiety",
    "final_weight": 10.0,
    "total_feedback_count": 6,
    "last_feedback_date": "2025-12-10T15:22:00Z"
  },
  {
    "module_id": "breathing-exercises",
    "final_weight": 3.2,
    "total_feedback_count": 2,
    "last_feedback_date": "2025-12-05T09:10:00Z"
  }
]
```

### POST `/api/modules/:moduleId/progress`

**Atualizar progresso em tempo real**

Request:
```json
{
  "userId": "user-uuid",
  "moduleId": "module-uuid",
  "progress": 45
}
```

---

## 6. Gamification Integration

### Pontos Ganhos

```typescript
const GAMIFICATION_REWARDS = {
  ACCEPT_RECOMMENDATION: 5,      // CP por aceitar
  COMPLETE_MODULE: 50,           // CP base por completar
  COMPLETE_WITH_RATING: 10,      // CP adicional por rating point
  STREAK_5_MODULES: 100,         // CP por 5 módulos seguidos
  STREAK_10_MODULES: 300,        // CP por 10 módulos lifetime
};
```

### Achievements

| Achievement | Trigger | Reward |
|-------------|---------|--------|
| Early Adopter | Completar 1º módulo | 50 CP |
| Learner | Completar 5 módulos | 200 CP |
| Mastery | Completar 10 módulos | 500 CP |
| Consistent | 7 dias consecutivos com conclusão | 150 CP |

### Integração com gamificationService

```typescript
// No handleModuleCompletion()
const { newLevel, levelUpBonus } = await gamificationService.addXp(
  userId,
  xpAwarded  // 50 + (rating * 10)
);

// Resultado no usuário:
// - XP aumenta
// - Level sobe se atingir threshold
// - Achievement desbloqueado (se aplicável)
```

---

## 7. Analytics & Insights

### Dashboard Metrics

**Per-User:**
- % de recomendações aceitas (target: > 40%)
- Tempo médio de conclusão por módulo
- Taxa de dropout (aceitou mas não completou)
- Rating médio dos módulos completados

**Per-Module:**
- Acceptance rate (quantas vezes foi aceito / recomendado)
- Completion rate (quantas vezes foi completado / aceito)
- Average rating
- Correlation com trail específico

**System-Wide:**
- Média de acceptance rate (todos os módulos)
- Distribuição de completion time
- Módulos mais rejeitados (possível problema no conteúdo)
- Learning pace clustering (segmentar usuários)

### Query Exemplos

```sql
-- Módulos mais rejeitados
SELECT
  m.name,
  COUNT(*) as rejection_count,
  ROUND(COUNT(*) FILTER (WHERE feedback_type='rejected')::NUMERIC /
        COUNT(*)::NUMERIC * 100, 2) as rejection_rate
FROM user_module_feedback umf
JOIN module_definitions m ON m.id = umf.module_id
WHERE umf.feedback_type IN ('rejected', 'skipped')
GROUP BY m.id, m.name
ORDER BY rejection_rate DESC
LIMIT 10;

-- Usuários por learning pace
SELECT
  COUNT(DISTINCT user_id) as user_count,
  CASE
    WHEN completion_rate >= 0.7 THEN 'Fast'
    WHEN completion_rate >= 0.4 THEN 'Steady'
    ELSE 'Slow'
  END as pace
FROM (
  SELECT
    user_id,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE feedback_type='accepted'), 0)::NUMERIC as completion_rate
  FROM user_module_feedback
  GROUP BY user_id
)
GROUP BY pace;
```

---

## 8. Fluxos de Usuário

### Fluxo 1: Aceitar Recomendação

```
1. Usuário vê RecommendationCard
2. Clica "Accept"
   └─> recordModuleFeedback(userId, moduleId, 'accepted')
   └─> updateModuleWeight() [weight sobe]
   └─> Award 5 CP points
   └─> Navega para ModuleProgressTracker

3. Usuário interage com módulo
   └─> Atualiza progress (0-100%)
   └─> Salvo em tempo real

4. Usuário clica "Mark as Complete" (progress >= 80%)
   └─> handleModuleCompletion(userId, moduleId, rating)
   └─> Award 50 + (rating * 10) XP
   └─> updateModuleWeight() [weight sobe muito]
   └─> Verifica achievements
   └─> Mostra notificação com pontos ganhos
```

### Fluxo 2: Rejeitar Recomendação

```
1. Usuário vê RecommendationCard
2. Clica "Reject"
   └─> FeedbackModal abre

3. Seleciona razões + comentário opcional
4. Clica "Submit Feedback"
   └─> recordModuleFeedback(userId, moduleId, 'rejected', {reasons})
   └─> updateModuleWeight() [weight diminui]
   └─> Nenhum CP award
   └─> FeedbackModal fecha
   └─> RecommendationCard desaparece

5. Próxima vez que recomendações forem geradas
   └─> Module weight é mais baixo para este usuário
   └─> Module menos provável de ser recomendado
```

### Fluxo 3: Não Agora (Skip)

```
1. Usuário vê RecommendationCard
2. Clica "Not Now"
   └─> recordModuleFeedback(userId, moduleId, 'skipped')
   └─> updateModuleWeight() [peso não muda muito]
   └─> Nenhum CP award
   └─> Card desaparece temporariamente

3. Próxima sessão/dia
   └─> Module pode ser recomendado novamente
   └─> Peso neutro a ligeiramente positivo (não foi rejeitado)
```

---

## 9. Performance Considerations

### Otimizações

1. **Database Indexes:**
   - `user_id` (lookup rápido)
   - `module_id` (análise por módulo)
   - `(user_id, module_id)` (busca específica)
   - `weight_recalculated_at DESC` (batch updates)

2. **Caching:**
   - Preferências do usuário: cache 1 hora
   - Pesos dinâmicos: cache 30 minutos
   - Recomendações: cache 24 horas

3. **Batch Operations:**
   - Recalcular pesos > 10k usuários: ~5 segundos
   - Decay diário: executado durante off-peak
   - Use `UNLOGGED` tables para audit se performance crítica

4. **Query Optimization:**
```sql
-- ✅ BOM: Use índice
SELECT * FROM user_module_feedback
WHERE user_id = $1 AND module_id = $2;

-- ❌ RUIM: Full table scan
SELECT * FROM user_module_feedback
WHERE YEAR(interacted_at) = 2025;
```

### Monitoramento

```javascript
// Log performance de operações críticas
const start = Date.now();
await feedbackLoopService.recalculateUserWeights(userId);
const duration = Date.now() - start;
console.log(`Weight recalculation took ${duration}ms`);

// Alerta se > 5s para 10k usuários
```

---

## 10. Testes

### Unit Tests

```typescript
describe('FeedbackLoopService', () => {
  describe('recordModuleFeedback', () => {
    test('deve criar feedback record', async () => {
      const feedback = await service.recordModuleFeedback(
        'user1', 'module1', 'accepted'
      );
      expect(feedback.id).toBeDefined();
      expect(feedback.feedback_type).toBe('accepted');
    });

    test('deve award points ao aceitar', async () => {
      // Mock gamificationService
      await service.recordModuleFeedback('user1', 'module1', 'accepted');
      expect(mockGamificationService.addXp).toHaveBeenCalledWith('user1', 5);
    });
  });

  describe('updateModuleWeight', () => {
    test('peso sobe com aceitações', async () => {
      // Insert 3 aceitações
      await recordMultipleFeedback(['accepted', 'accepted', 'accepted']);

      const result = await service.updateModuleWeight('user1', 'module1', 'accepted');
      expect(result.new_weight).toBeGreaterThan(result.old_weight);
    });

    test('peso diminui com rejeições', async () => {
      await recordMultipleFeedback(['accepted', 'rejected', 'rejected']);
      const result = await service.updateModuleWeight('user1', 'module1', 'rejected');
      expect(result.new_weight).toBeLessThan(result.old_weight);
    });

    test('peso é clamped entre 0.1 e 10.0', async () => {
      // Simulate extreme feedback
      const result = await service.updateModuleWeight('user1', 'module1', 'accepted');
      expect(result.new_weight).toBeGreaterThanOrEqual(0.1);
      expect(result.new_weight).toBeLessThanOrEqual(10.0);
    });
  });

  describe('getUserPreferences', () => {
    test('deve categorizar feedback corretamente', async () => {
      // Setup mixed feedback
      const prefs = await service.getUserPreferences('user1');

      expect(prefs.accepted_modules.length).toBe(2);
      expect(prefs.rejected_modules.length).toBe(1);
      expect(prefs.completed_modules.length).toBe(1);
    });
  });

  describe('handleModuleCompletion', () => {
    test('deve award XP base + rating bonus', async () => {
      const result = await service.handleModuleCompletion('user1', 'module1', {
        rating: 5
      });

      expect(result.xpAwarded).toBe(50 + 5*10); // 100
    });

    test('deve unlock achievement em primeira conclusão', async () => {
      const result = await service.handleModuleCompletion('user1', 'module1', {});
      expect(result.achievement_unlocked).toBe('EARLY_ADOPTER');
    });
  });
});
```

### Integration Tests

```typescript
describe('Feedback Loop E2E', () => {
  test('fluxo completo: aceitar → progresso → completar → weight atualiza', async () => {
    const userId = 'test-user';
    const moduleId = 'test-module';

    // 1. Accept
    await feedbackAPI.submitModuleFeedback(moduleId, 'accepted');

    // 2. Progress
    await feedbackAPI.updateModuleProgress(moduleId, 50);

    // 3. Complete
    const result = await feedbackAPI.completeModule(moduleId, { rating: 4 });
    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBeGreaterThan(0);

    // 4. Verify weight increased
    const weights = await feedbackAPI.getUserModuleWeights();
    const moduleWeight = weights.get(moduleId);
    expect(moduleWeight).toBeGreaterThan(1.0);
  });

  test('rejeitar múltiplas vezes reduz recomendação', async () => {
    const moduleId = 'unpopular-module';

    // Rejeitar 5 vezes
    for (let i = 0; i < 5; i++) {
      await feedbackAPI.submitModuleFeedback(moduleId, 'rejected', {
        reason: JSON.stringify({ reasons: ['already_know'] })
      });
    }

    // Weight deve estar bem baixo
    const weights = await feedbackAPI.getUserModuleWeights();
    expect(weights.get(moduleId)).toBeLessThan(1.0);
  });
});
```

---

## 11. Deployment Checklist

- [ ] Migrations executadas em staging
- [ ] Tabelas criadas e índices aplicados
- [ ] Triggers funcionando (test INSERT em user_module_feedback)
- [ ] RLS policies habilitadas e testadas
- [ ] feedbackLoopService integrada em todos os endpoints
- [ ] RecommendationCard e Modal renderizando
- [ ] ModuleProgressTracker salvando progresso
- [ ] Gamification awards funcionando
- [ ] Notificações sendo enviadas
- [ ] Analytics queries performando < 1s
- [ ] Batch operations (10k usuários) completando em < 5s
- [ ] Logging e error handling adequados
- [ ] Documentação atualizada

---

## 12. Future Enhancements

### PHASE 4:

1. **Advanced Analytics:**
   - Clustering de usuários por preferências
   - Análise de correlação trail ↔ aceitação
   - Predição de dropout

2. **ML Integration:**
   - Modelo de regressão para feedback → peso
   - Recomendações baseadas em embedding
   - A/B testing de algoritmos

3. **User Insights:**
   - Dashboard de progresso pessoal
   - Sugestões de "próximo módulo lógico"
   - Comparação com colegas (anônimo)

4. **Content Improvements:**
   - Sinalizações para módulos muito rejeitados
   - Feedback loop com criadores de conteúdo
   - Versões alternativas de módulos populares

---

## Referências

- **PHASE 3.1**: Recommendation Engine (`recommendationEngine.ts`)
- **PHASE 3.2**: Moment Entries Integration
- **Gamification**: `gamificationService.ts`
- **Database**: Migrations em `/src/db/migrations/`
- **Components**: `/src/modules/onboarding/components/`

---

**Versão:** 1.0
**Última Atualização:** Dezembro 2025
**Autor:** Claude Code - Gamification Engine Agent
