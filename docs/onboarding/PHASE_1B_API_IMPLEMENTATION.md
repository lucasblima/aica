# PHASE 1B: API Endpoints para Trilhas Contextuais e Captura de Contexto

**Status**: Implementação Completa - Versão 1.0
**Data**: 2025-12-11
**Objetivo**: Documentar todos os endpoints, tipos, serviços e fluxo de integração para captura de trilhas contextuais

---

## 1. Visão Geral da Arquitetura

### Componentes Implementados

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (React)                   │
│         src/modules/onboarding/views/*               │
└────────────────┬─────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌───────────────┐      ┌──────────────────────┐
│ onboardingAPI │      │ onboardingService    │
│  (Endpoints)  │      │  (Business Logic)    │
└───────┬───────┘      └──────────┬───────────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │  supabase/supabaseClient│
        │  (Database & Auth)      │
        └─────────────────────────┘
```

### Fluxo de Dados

```
User Response (UI)
      ↓
captureContextualTrail() [onboardingAPI]
      ↓
captureTrailResponses() [onboardingService]
      ↓
Validation & Calculation (Score, Modules)
      ↓
INSERT into onboarding_context_captures (Supabase)
      ↓
Award Consciousness Points
      ↓
Response to Client: { trailScore, recommendedModules, nextStep }
```

---

## 2. Tipos TypeScript

### Arquivo: `src/types/onboardingTypes.ts`

#### Interfaces de Trilhas e Perguntas

```typescript
// Resposta individual a uma pergunta
interface ContextualAnswer {
  id: string;
  label: string;
  value: string;
  icon?: string;
  description?: string;
  weight: number; // 0-10 para cálculo de score
  triggerModules?: string[];
}

// Pergunta em uma trilha
interface ContextualQuestion {
  id: string;
  question: string;
  helpText?: string;
  type: 'single' | 'multiple';
  answers: ContextualAnswer[];
  order: number;
  isRequired: boolean;
}

// Trilha completa (ex: health-emotional)
interface ContextualTrail {
  id: 'health-emotional' | 'health-physical' | 'finance' | 'relationships' | 'growth';
  name: string;
  icon: string;
  color: string;
  description: string;
  questions: ContextualQuestion[];
  recommendedModules: string[];
  priority: number;
}
```

#### Interfaces de Captura e Status

```typescript
// Resposta a uma pergunta (input do usuário)
interface ContextualQuestionResponse {
  questionId: string;
  selectedAnswerIds: string[]; // Array para suportar múltipla escolha
  answeredAt?: Date;
}

// Captura armazenada no banco
interface StoredContextCapture {
  id: string;
  user_id: string;
  trail_id: string;
  responses: Record<string, {
    selectedAnswerIds: string[];
    answeredAt: string;
  }>;
  trail_score: number | null;
  recommended_modules: string[];
  created_at: string;
  updated_at: string;
}

// Status do onboarding do usuário
interface OnboardingStatus {
  userId: string;
  trailsCompleted: number;
  totalTrails: number;
  completedTrailIds: string[];
  allRecommendedModules: string[];
  averageTrailScore: number;
  isOnboardingComplete: boolean;
  lastCompletedTrailAt?: Date;
}
```

#### Interfaces de Requisição/Resposta

```typescript
// Request para capturar trilha
interface CaptureTrailRequest {
  userId: string;
  trailId: string;
  responses: Array<{
    questionId: string;
    selectedAnswerIds: string[];
  }>;
}

// Response após capturar trilha
interface CaptureTrailResponse {
  success: boolean;
  trailId: string;
  trailScore: number;
  recommendedModules: string[];
  pointsAwarded?: number;
  nextStep: 'complete_more_trails' | 'view_recommendations' | 'step_2_moment_capture';
  message: string;
}

// Response ao finalizar onboarding
interface FinalizeOnboardingResponse {
  success: boolean;
  nextStep: 'step_2_moment_capture' | 'step_3_recommendations';
  allRecommendedModules: string[];
  averageScore: number;
  pointsAwarded?: number;
  message: string;
}
```

---

## 3. Dados Estáticos

### Arquivo: `src/data/contextualTrails.ts`

#### Estrutura

```typescript
// Objeto contendo todas as 5 trilhas
export const CONTEXTUAL_TRAILS: Record<string, ContextualTrail> = {
  'health-emotional': { ... },
  'health-physical': { ... },
  'finance': { ... },
  'relationships': { ... },
  'growth': { ... }
};

// Array de todas as trilhas
export const ALL_TRAILS: ContextualTrail[] = [
  emotionalHealthTrail,
  physicalHealthTrail,
  financeTrail,
  relationshipsTrail,
  growthTrail,
];

// Mapeamento de trilha → módulos recomendados
export const TRAIL_TO_MODULES_MAP: Record<string, string[]> = {
  'health-emotional': ['journaling', 'daily_reflections', ...],
  'health-physical': ['fitness_tracking', 'activity_suggestions', ...],
  ...
};
```

#### Cada Trilha Contém

- **ID, Nome, Ícone, Cor**: Identificação visual
- **Descrição**: O que a trilha faz
- **Prioridade**: 1-5 (1 = mais importante)
- **Questões**: 3-4 perguntas por trilha
- **Respostas**: 4-6 opções por pergunta com:
  - ID, Label, Icon (emoji)
  - Weight (0-10): usada para cálculo de score
  - TriggerModules: módulos desbloqueados por essa resposta

#### Exemplo: Trilha health-emotional

```typescript
{
  id: 'health-emotional',
  name: 'Saúde Mental e Bem-estar Emocional',
  icon: 'Brain',
  color: '#6B9EFF',
  priority: 1,
  questions: [
    {
      id: 'q1_emotion',
      question: 'Como você está se sentindo emocionalmente?',
      type: 'single',
      isRequired: true,
      order: 1,
      answers: [
        {
          id: 'joy',
          label: 'Alegre e energizado',
          icon: '😄',
          weight: 2,
          triggerModules: []
        },
        {
          id: 'anxious',
          label: 'Ansioso ou preocupado',
          icon: '😰',
          weight: 8,
          triggerModules: ['meditation', 'stress_management']
        },
        // ... mais respostas
      ]
    },
    // ... mais perguntas
  ]
}
```

---

## 4. Backend Service

### Arquivo: `src/services/onboardingService.ts`

#### Funções Principais

##### 1. `getCourseTrails(): Promise<ContextualTrail[]>`
Retorna todas as 5 trilhas disponíveis.

**Uso**:
```typescript
const trails = await getCourseTrails();
// Retorna: Array de 5 trilhas com todas as perguntas e respostas
```

---

##### 2. `getTrailById_API(trailId: string): Promise<ContextualTrail>`
Retorna uma trilha específica pelo ID.

**Uso**:
```typescript
const trail = await getTrailById_API('health-emotional');
// Retorna: Trilha completa com 4 perguntas
```

---

##### 3. `captureTrailResponses(userId, trailId, responses): Promise<Result>`

**Responsabilidades**:
1. Valida se a trilha existe
2. Valida se todas as perguntas obrigatórias foram respondidas
3. Recupera os objetos `ContextualAnswer` das respostas
4. **Calcula o trail score**: média dos weights das respostas
5. **Extrai módulos recomendados**: union de todos os `triggerModules`
6. Armazena no banco de dados (`onboarding_context_captures`)
7. Award pontos de consciência

**Request**:
```typescript
{
  userId: "uuid...",
  trailId: "health-emotional",
  responses: [
    {
      questionId: "q1_emotion",
      selectedAnswerIds: ["anxious"] // single choice
    },
    {
      questionId: "q2_areas",
      selectedAnswerIds: ["self_awareness", "emotional_regulation"] // multiple choice
    },
    // ... mais respostas
  ]
}
```

**Response**:
```typescript
{
  success: true,
  trailScore: 6.5, // média dos weights 0-10
  recommendedModules: [
    'meditation',
    'stress_management',
    'breathing_exercises',
    'journaling',
    'daily_reflections'
  ],
  pointsAwarded: 18 // baseado no score
}
```

**Cálculo do Trail Score**:
```
trail_score = average(weights of all selected answers)
Example: [anxious: 8, self_awareness: 5, emotional_regulation: 5, rarely: 8, reduce_stress: 8]
Average: (8+5+5+8+8) / 5 = 6.8
```

---

##### 4. `getUserOnboardingStatus(userId): Promise<OnboardingStatus>`

Retorna o status completo do onboarding do usuário.

**Response**:
```typescript
{
  userId: "uuid...",
  trailsCompleted: 2, // de 5
  totalTrails: 5,
  completedTrailIds: ['health-emotional', 'finance'],
  allRecommendedModules: [
    'journaling',
    'meditation',
    'budget_builder',
    'expense_tracking',
    // ... union de todos
  ],
  averageTrailScore: 6.75, // média de todos os scores
  isOnboardingComplete: false, // false pois < 3 trails
  lastCompletedTrailAt: Date
}
```

---

##### 5. `calculateRecommendedModules(userId): Promise<ModuleRecommendation[]>`

Retorna módulos recomendados com scores de confiança.

**Response**:
```typescript
[
  {
    moduleId: 'meditation',
    moduleName: 'Meditation',
    confidence: 1.0, // recomendado por 3+ trilhas
    reasonFromTrails: ['health-emotional', 'relationships', 'growth'],
    priority: 'high'
  },
  {
    moduleId: 'journaling',
    moduleName: 'Journaling',
    confidence: 0.67, // recomendado por 2 de 3 trilhas
    reasonFromTrails: ['health-emotional', 'growth'],
    priority: 'medium'
  },
  // ... mais módulos
]
```

---

##### 6. `isOnboardingComplete(userId): Promise<boolean>`

Verifica se o usuário completou o onboarding (3+ trilhas).

---

##### 7. `resetUserOnboarding(userId): Promise<boolean>`

Remove todas as capturas de trilha do usuário (para testes ou restart).

---

#### Funções Internas (Helper)

**`validateAndEnrichResponses(trail, responses)`**
- Valida se todas as perguntas obrigatórias foram respondidas
- Enriquece com objetos `ContextualAnswer` contendo weights
- Retorna erros de validação se necessário

**`calculateTrailScore(trail, selectedAnswers)`**
- Calcula a média dos weights
- Coleta todos os `triggerModules` de cada resposta
- Retorna `TrailScoreCalculation` com score e módulos

**`awardTrailCompletionPoints(trailScore)`**
- Formula: `10 + floor((score / 10) * 15)` = 10-25 pontos
- Ex: score 8 = 10 + floor(0.8 * 15) = 10 + 12 = 22 pontos

---

## 5. API Endpoints

### Arquivo: `src/api/onboardingAPI.ts`

#### Endpoints Implementados

---

##### GET `/api/onboarding/trails`

**Função**: `listAllTrails()`

**Response**:
```typescript
{
  success: boolean;
  trails: ContextualTrail[];
}
```

**Exemplo**:
```bash
GET /api/onboarding/trails
```

**Response 200**:
```json
{
  "success": true,
  "trails": [
    {
      "id": "health-emotional",
      "name": "Saúde Mental e Bem-estar Emocional",
      "icon": "Brain",
      "color": "#6B9EFF",
      "priority": 1,
      "questions": [ ... ]
    },
    // ... 4 mais
  ]
}
```

---

##### GET `/api/onboarding/trails/:trailId`

**Função**: `getTrailDetails(trailId: string)`

**Response**:
```typescript
{
  success: boolean;
  trail?: ContextualTrail;
  error?: string;
}
```

**Exemplo**:
```bash
GET /api/onboarding/trails/health-emotional
```

**Response 200**:
```json
{
  "success": true,
  "trail": {
    "id": "health-emotional",
    "name": "Saúde Mental e Bem-estar Emocional",
    "questions": [
      {
        "id": "q1_emotion",
        "question": "Como você está se sentindo emocionalmente?",
        "type": "single",
        "answers": [ ... ]
      },
      // ... 3 mais
    ]
  }
}
```

---

##### POST `/api/onboarding/capture-context`

**Função**: `captureContextualTrail(request: CaptureTrailRequest)`

**Request Body**:
```json
{
  "userId": "uuid-xxx",
  "trailId": "health-emotional",
  "responses": [
    {
      "questionId": "q1_emotion",
      "selectedAnswerIds": ["anxious"]
    },
    {
      "questionId": "q2_areas",
      "selectedAnswerIds": ["self_awareness", "emotional_regulation", "stress_management"]
    },
    {
      "questionId": "q3_reflection_frequency",
      "selectedAnswerIds": ["rarely"]
    },
    {
      "questionId": "q4_goal",
      "selectedAnswerIds": ["reduce_stress"]
    }
  ]
}
```

**Response 200**:
```json
{
  "success": true,
  "trailId": "health-emotional",
  "trailScore": 6.5,
  "recommendedModules": [
    "meditation",
    "stress_management",
    "breathing_exercises",
    "journaling",
    "daily_reflections",
    "emotion_picker"
  ],
  "pointsAwarded": 19,
  "nextStep": "complete_more_trails",
  "message": "Trail \"health-emotional\" completed successfully"
}
```

**Lógica de `nextStep`**:
- `trailsCompleted < 3` → `complete_more_trails`
- `trailsCompleted >= 3 && < 5` → `view_recommendations`
- `trailsCompleted >= 3` → `step_2_moment_capture`

---

##### GET `/api/onboarding/status?userId=:userId`

**Função**: `getOnboardingStatusEndpoint(userId: string)`

**Response**:
```json
{
  "success": true,
  "status": {
    "userId": "uuid-xxx",
    "trailsCompleted": 2,
    "totalTrails": 5,
    "completedTrailIds": ["health-emotional", "finance"],
    "allRecommendedModules": [
      "meditation",
      "breathing_exercises",
      "journaling",
      "budget_builder",
      "expense_tracking"
    ],
    "averageTrailScore": 6.75,
    "isOnboardingComplete": false,
    "lastCompletedTrailAt": "2025-12-11T10:30:00Z"
  },
  "progressPercentage": 40,
  "isComplete": false
}
```

---

##### POST `/api/onboarding/finalize`

**Função**: `finalizeOnboarding(userId: string)`

**Purpose**: Finaliza o onboarding após completar 3+ trilhas

**Request Body**:
```json
{
  "userId": "uuid-xxx"
}
```

**Response 200**:
```json
{
  "success": true,
  "nextStep": "step_2_moment_capture",
  "allRecommendedModules": [
    "meditation",
    "breathing_exercises",
    "journaling",
    "budget_builder",
    "expense_tracking",
    "debt_management",
    "communication_skills",
    "conflict_resolution"
  ],
  "averageScore": 6.75,
  "pointsAwarded": 50,
  "message": "Onboarding completed! You have 8 personalized module recommendations."
}
```

**Response 400** (< 3 trilhas):
```json
{
  "success": false,
  "nextStep": "view_recommendations",
  "allRecommendedModules": [...],
  "averageScore": 6.5,
  "message": "Please complete at least 3 trails. You have completed 2"
}
```

---

##### GET `/api/onboarding/recommendations/:userId`

**Função**: `getUserRecommendations(userId: string)`

**Response**:
```json
{
  "success": true,
  "modules": [
    {
      "moduleId": "meditation",
      "moduleName": "Meditation",
      "confidence": 1.0,
      "priority": "high",
      "reasonFromTrails": ["health-emotional", "relationships", "growth"]
    },
    {
      "moduleId": "journaling",
      "moduleName": "Journaling",
      "confidence": 0.67,
      "priority": "medium",
      "reasonFromTrails": ["health-emotional", "growth"]
    },
    // ... mais módulos ordenados por prioridade
  ]
}
```

---

## 6. Integração com Banco de Dados

### Tabela: `onboarding_context_captures`

**SQL Migration**: `20251211_onboarding_context_captures.sql`

#### Schema

```sql
CREATE TABLE onboarding_context_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trail_id VARCHAR(50) NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  trail_score FLOAT,
  recommended_modules TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT onboarding_context_captures_user_trail_unique
    UNIQUE (user_id, trail_id)
);
```

#### Índices

- `idx_onboarding_context_captures_user_id` - Para queries por usuário
- `idx_onboarding_context_captures_trail_id` - Para queries por trilha
- `idx_onboarding_context_captures_created_at` - Para queries ordenadas por data
- `idx_onboarding_context_captures_responses` (GIN) - Para buscas em JSONB
- `idx_onboarding_context_captures_recommended_modules` (GIN) - Para buscas em array

#### RLS Policies

```sql
-- Users can view their own captures
CREATE POLICY "Users can view own context captures"
  ON onboarding_context_captures FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own captures
CREATE POLICY "Users can insert own context captures"
  ON onboarding_context_captures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own captures
CREATE POLICY "Users can update own context captures"
  ON onboarding_context_captures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own captures
CREATE POLICY "Users can delete own context captures"
  ON onboarding_context_captures FOR DELETE
  USING (auth.uid() = user_id);
```

#### Exemplo de Dados

```json
{
  "id": "uuid-xxx",
  "user_id": "auth-user-id",
  "trail_id": "health-emotional",
  "responses": {
    "q1_emotion": {
      "selectedAnswerIds": ["anxious"],
      "answeredAt": "2025-12-11T10:30:00Z"
    },
    "q2_areas": {
      "selectedAnswerIds": ["self_awareness", "emotional_regulation"],
      "answeredAt": "2025-12-11T10:32:00Z"
    },
    "q3_reflection_frequency": {
      "selectedAnswerIds": ["rarely"],
      "answeredAt": "2025-12-11T10:33:00Z"
    },
    "q4_goal": {
      "selectedAnswerIds": ["reduce_stress"],
      "answeredAt": "2025-12-11T10:34:00Z"
    }
  },
  "trail_score": 6.5,
  "recommended_modules": [
    "meditation",
    "stress_management",
    "breathing_exercises",
    "daily_reflections",
    "journaling",
    "emotion_picker"
  ],
  "created_at": "2025-12-11T10:34:00Z",
  "updated_at": "2025-12-11T10:34:00Z"
}
```

---

## 7. Fluxo de Uso Completo

### User Journey

```
1. Usuário clica em "Começar Onboarding"
   ↓
2. Frontend: GET /api/onboarding/trails
   ← Response: Array de 5 trilhas
   ↓
3. UI mostra grid de 5 trilhas com ícones/cores/descrições
   "Qual área é mais importante para você agora?"
   ↓
4. Usuário seleciona 1 ou mais trilhas
   ↓
5. Frontend: GET /api/onboarding/trails/:trailId
   ← Response: Trilha completa com 3-4 perguntas
   ↓
6. UI exibe perguntas uma a uma ou todas
   "Pergunta 1 de 4..."
   ↓
7. Usuário responde todas as perguntas obrigatórias
   ↓
8. Frontend: POST /api/onboarding/capture-context
   Body: { userId, trailId, responses }
   ← Response: { trailScore, recommendedModules, nextStep }
   ↓
9. Backend:
   - Valida respostas
   - Calcula score (média dos weights)
   - Extrai módulos (union de triggerModules)
   - INSERT into onboarding_context_captures
   - Award consciousness points
   ↓
10. UI mostra resultado:
    "Trilha Completa!"
    "Score: 6.5/10"
    "Módulos Recomendados: meditation, stress_management, ..."
    ↓
11. Usuário pode:
    - "Continuar com próxima trilha"  → volta ao step 4
    - "Ver recomendações"             → vai ao step 12
    - "Pular"                          → vai ao step 12
    ↓
12. Frontend: GET /api/onboarding/status?userId=:userId
    ← Response: { trailsCompleted, progressPercentage, allRecommendedModules }
    ↓
13. (Se trailsCompleted >= 3):
    Frontend: POST /api/onboarding/finalize
    ← Response: { nextStep: 'step_2_moment_capture', ... }
    ↓
14. UI transiciona para "Step 2: Compartilhar um Momento"
```

---

## 8. Exemplos de Código

### Frontend Usage

#### Listar Trilhas
```typescript
import { listAllTrails } from '@/api/onboardingAPI';

async function loadTrails() {
  const result = await listAllTrails();
  if (result.success) {
    console.log(result.trails); // Array de 5 trilhas
  }
}
```

#### Capturar Respostas
```typescript
import { captureContextualTrail } from '@/api/onboardingAPI';

async function submitTrail() {
  const result = await captureContextualTrail({
    userId: currentUser.id,
    trailId: 'health-emotional',
    responses: [
      {
        questionId: 'q1_emotion',
        selectedAnswerIds: ['anxious']
      },
      {
        questionId: 'q2_areas',
        selectedAnswerIds: ['self_awareness', 'stress_management']
      },
      // ... mais respostas
    ]
  });

  if (result.success) {
    console.log(`Score: ${result.trailScore}`);
    console.log(`Recommended: ${result.recommendedModules}`);
    console.log(`Points: ${result.pointsAwarded}`);

    // Navegar para próxima step baseado em nextStep
    navigateToStep(result.nextStep);
  }
}
```

#### Obter Status
```typescript
import { getOnboardingStatusEndpoint } from '@/api/onboardingAPI';

async function checkProgress() {
  const result = await getOnboardingStatusEndpoint(currentUser.id);
  if (result.success) {
    console.log(`${result.progressPercentage}% complete`);
    console.log(`Trails: ${result.status?.trailsCompleted}/5`);
  }
}
```

#### Finalizar Onboarding
```typescript
import { finalizeOnboarding } from '@/api/onboardingAPI';

async function completeOnboarding() {
  const result = await finalizeOnboarding(currentUser.id);
  if (result.success) {
    console.log(`You have ${result.allRecommendedModules.length} recommendations`);
    navigateTo('/step-2-moment-capture');
  } else {
    console.error(result.message);
  }
}
```

---

## 9. Deployment & Próximos Passos

### Deployment Atual (Frontend-only)

Os endpoints estão implementados como serviços do frontend. Para produção:

1. **Option A: Supabase Edge Functions**
   - Mover `onboardingService.ts` para Edge Function
   - Expor via HTTP endpoints
   - Manter RLS no banco

2. **Option B: Backend Server**
   - Criar API routes em Node.js/Express/FastAPI
   - Consumir `onboardingService.ts` como biblioteca compartilhada
   - Autenticar via JWT

3. **Option C: Hybrid (Recomendado)**
   - Edge Functions para cálculos simples e queries
   - Backend para lógica complexa (scoring, AI)

### Próximos Passos Imediatos

- [ ] Criar UI components para seleção de trilhas
- [ ] Criar UI components para exibição de perguntas
- [ ] Criar UI components para exibição de resultados
- [ ] Integrar com fluxo de onboarding completo
- [ ] Implementar animations e transitions
- [ ] Adicionar i18n (português/inglês)
- [ ] Testes unitários para cálculos
- [ ] Testes E2E para fluxo completo
- [ ] Deploy da migration ao Supabase produção
- [ ] Mover endpoints para Edge Functions (opcional)

---

## 10. Troubleshooting

### Problema: Trail não encontrada
**Causa**: `trailId` inválida
**Solução**: Verificar se `trailId` está em CONTEXTUAL_TRAILS

### Problema: Score muito alto/baixo
**Causa**: Pesos das respostas incorretos
**Solução**: Revisar `weight` em `contextualTrails.ts`

### Problema: Módulos não aparecem
**Causa**: `triggerModules` vazio ou `recommended_modules` não preenchido
**Solução**: Verificar se `captureTrailResponses` está salvando corretamente

### Problema: RLS erro 403
**Causa**: `user_id` não corresponde a `auth.uid()`
**Solução**: Garantir que `userId` passado é `currentUser.id`

---

## 11. Referência de Recursos

### Arquivos Criados

1. **Database**
   - `supabase/migrations/20251211_onboarding_context_captures.sql`

2. **Types**
   - `src/types/onboardingTypes.ts`

3. **Data**
   - `src/data/contextualTrails.ts`

4. **Services**
   - `src/services/onboardingService.ts`

5. **API**
   - `src/api/onboardingAPI.ts`

6. **Documentation**
   - `docs/onboarding/PHASE_1B_API_IMPLEMENTATION.md` (este arquivo)

### Documentos de Referência

- `docs/onboarding/TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md`
- `docs/onboarding/PERSISTENCIA_DADOS_JOURNEY.md`
- `docs/architecture/backend_architecture.md`

---

**Documentação criada**: 2025-12-11
**Última atualização**: 2025-12-11
**Próximo passo**: PHASE 1C - UI Components para Onboarding
