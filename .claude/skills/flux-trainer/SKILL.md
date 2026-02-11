---
name: flux-trainer
description: Treinador Flux - especialista no modulo Flux (gestao de treinos para coaches, atletas, blocos de 12 semanas, canvas editor, alertas, WhatsApp). Use quando trabalhar com athletes, workout blocks, training plans, alerts, feedback, canvas editor, ou modalities.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Flux Trainer - Treinador de Atletas

Especialista no modulo de gestao de treinos do AICA Life OS. Gerencia atletas, blocos de treino de 12 semanas, canvas visual, alertas criticos, feedback via WhatsApp, e 4 modalidades esportivas.

---

## Arquitetura do Modulo

```
src/modules/flux/
|-- components/
|   |-- AthleteCard.tsx           # Card de atleta com metricas
|   |-- FluxCard.tsx              # Card resumo do modulo
|   |-- AlertBadge.tsx            # Badge de alerta por severidade
|   |-- LevelBadge.tsx            # Badge de nivel do atleta
|   |-- ProgressionBar.tsx        # Barra de progresso 12 semanas
|   |-- WhatsAppMessageModal.tsx  # Modal de mensagem AI para atleta
|-- context/
|   |-- FluxContext.tsx           # Estado global (FSM: 4 modos)
|-- types/
|   |-- flux.ts                  # Todos os tipos (Athlete, WorkoutBlock, etc.)
|   |-- index.ts                 # Barrel export
|-- views/
|   |-- FluxDashboard.tsx        # Dashboard principal (lista atletas)
|   |-- AthleteDetailView.tsx    # Timeline 12 semanas do atleta
|   |-- CanvasEditorView.tsx     # Editor visual de treinos
|   |-- AlertsView.tsx           # Central de alertas
|-- mockData.ts                  # 312 atletas mock
|-- index.ts

src/modules/treinamento/          # Legacy (modulo original em PT-BR)
|-- components/, views/, context/, types/, mockData.ts
```

---

## FSM: 4 Modos de Navegacao

```typescript
type FluxMode =
  | 'viewing_dashboard'        // Lista de atletas
  | 'viewing_athlete_detail'   // Timeline 12 semanas
  | 'editing_canvas'           // Canvas visual de treino
  | 'managing_alerts';         // Central de alertas
```

**Transicoes**:
- Dashboard → Athlete Detail (click no atleta)
- Athlete Detail → Canvas Editor (click no bloco)
- Qualquer → Alerts (badge no header)

---

## Modelo de Dados

### Athlete
```typescript
interface Athlete {
  id: string;
  user_id: string;              // Coach owner
  name: string;
  phone: string;                // WhatsApp: +5511987654321
  level: AthleteLevel;          // 7 niveis
  status: AthleteStatus;        // active|paused|trial|churned
  modality: TrainingModality;   // swimming|running|cycling|strength
  trial_expires_at?: string;
  anamnesis?: AnamnesisData;    // Saude + historico
}
```

### WorkoutBlock (12 semanas)
```typescript
interface WorkoutBlock {
  id: string;
  athlete_id: string;
  title: string;               // "Bloco 1 - Base Aerobica"
  start_date: string;
  end_date: string;            // start + 12 weeks
  status: BlockStatus;         // draft|active|completed|cancelled
  canvas_data: CanvasData;     // Estrutura visual
}

interface CanvasData {
  weeks: WeekData[];           // 12 semanas
  metadata?: {
    focus?: string;
    intensity_profile?: 'progressive' | 'steady' | 'undulating';
  };
}
```

### Alert System
```typescript
interface Alert {
  id: string;
  athlete_id: string;
  feedback_id: string;
  alert_type: AlertType;       // health|motivation|absence|documents|custom
  severity: AlertSeverity;     // low|medium|high|critical
  keywords_detected: string[];
  message_preview: string;
  acknowledged_at?: string;
  resolved_at?: string;
}
```

### Feedback (via WhatsApp)
```typescript
interface Feedback {
  id: string;
  athlete_id: string;
  weekly_plan_id: string;
  completed_workout: boolean;
  volume_pct: number;          // 0-100
  intensity_pct: number;       // 0-100
  raw_message: string;         // WhatsApp original
  sentiment_score?: number;    // -1 to 1
  has_critical_keywords: boolean;
  ia_analysis?: IAAnalysis;    // Gemini analysis
}
```

---

## 4 Modalidades

| Modalidade | Label | Icone | Cor |
|------------|-------|-------|-----|
| `swimming` | Natacao | swimming | cyan |
| `running` | Corrida | running | green |
| `cycling` | Ciclismo | cycling | amber |
| `strength` | Forca | strength | purple |

---

## 7 Niveis de Atleta

| Nivel | Label PT-BR |
|-------|-------------|
| `iniciante_1` | Iniciante I |
| `iniciante_2` | Iniciante II |
| `iniciante_3` | Iniciante III |
| `intermediario_1` | Intermediario I |
| `intermediario_2` | Intermediario II |
| `intermediario_3` | Intermediario III |
| `avancado` | Avancado |

---

## Canvas Editor

- Editor visual drag-and-drop para montar treinos
- 12 semanas × 7 dias grid
- Exercicios por categoria: `warmup | main | technique | cooldown | dryland`
- Cada exercicio: sets, reps (ex: "4x100m"), rest, notes
- Salva como JSON em `workout_blocks.canvas_data`

---

## WhatsApp Integration

### Envio de Plano Semanal
```
Coach seleciona semana → WhatsAppMessageModal
    → AI gera mensagem personalizada
    → Envia via Evolution API
    → Marca plan_status = 'sent'
```

### Recebimento de Feedback
```
Atleta responde via WhatsApp
    → webhook-evolution → extract-intent
    → Analise de keywords criticas
    → Se critico: gera Alert
    → Salva Feedback com IA analysis
```

### Keywords Criticas
- **Health**: dor, lesao, machucado, hospital, medico
- **Motivation**: desistir, cansado, desmotivado, parar
- **Absence**: faltei, nao fui, pulei, sem tempo

---

## AI Analysis (Feedback)

```typescript
interface IAAnalysis {
  summary: string;
  recommendations: string[];
  suggested_adjustments?: {
    volume?: number;           // % adjustment
    intensity?: number;
    rest_days?: number;
  };
  confidence_score?: number;
}
```

---

## Severity Colors (Ceramic)

| Severidade | Classe |
|------------|--------|
| `critical` | `bg-red-500` |
| `high` | `bg-orange-500` |
| `medium` | `bg-amber-500` |
| `low` | `bg-blue-500` |

---

## Status Config

| Status | Label | Cor |
|--------|-------|-----|
| `active` | Ativo | green |
| `paused` | Pausado | yellow |
| `trial` | Trial | blue |
| `churned` | Inativo | gray |

---

## Tabelas do Banco

| Tabela | Proposito |
|--------|-----------|
| `athletes` | Perfis de atletas gerenciados pelo coach |
| `workout_blocks` | Blocos de 12 semanas com canvas_data |
| `weekly_plans` | Planos semanais enviados ao atleta |
| `feedbacks` | Feedback do atleta (WhatsApp + analise AI) |
| `alerts` | Alertas criticos gerados por keywords |
| `exercise_library` | Biblioteca de exercicios do coach |

---

## Padroes Criticos

### SEMPRE:
- `user_id` no Athlete = Coach (nao o atleta)
- Blocos de treino sao SEMPRE 12 semanas
- Canvas data como JSON em `canvas_data` column
- Alert severity determina urgencia de triage
- WhatsApp messages via Evolution API (nunca direto)
- AI analysis de feedback via `gemini-chat` Edge Function

### NUNCA:
- Expor dados de saude (anamnese) para outros usuarios
- Enviar WhatsApp sem confirmacao do coach
- Ignorar alertas criticos (health/critical)
- Deletar blocos com dados de feedback (cancelar, nao deletar)
- Usar mock data em producao (312 atletas sao apenas para demo)
