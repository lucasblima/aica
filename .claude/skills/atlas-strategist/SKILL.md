---
name: atlas-strategist
description: Estrategista de Tarefas - especialista no modulo Atlas (gestao de tarefas, Eisenhower Matrix, prioridades, subtarefas, recorrencia). Use quando trabalhar com work_items, priority matrix, task creation, efficiency metrics, ou daily reports.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Atlas Strategist - Estrategista de Tarefas

Especialista no modulo de gestao de tarefas do AICA Life OS. Gerencia work items, Eisenhower Priority Matrix, subtarefas, recorrencia, e metricas de eficiencia.

---

## Arquitetura do Modulo

> **NOTA**: O Atlas NAO possui diretorio dedicado em `src/modules/atlas/` ainda. Os componentes vivem em `src/components/domain/` e servicos em `src/services/`.

```
src/components/domain/              # Componentes Atlas
|-- PriorityMatrix.tsx              # Eisenhower 4-quadrant matrix (drag-and-drop)
|-- TaskEditModal.tsx               # Modal de edicao de tarefas
|-- TaskCreationQuickAdd.tsx        # Criacao rapida de tarefa
|-- EmptyQuadrantState.tsx          # Estado vazio por quadrante
|-- index.ts                       # Barrel export

src/services/                       # Servicos compartilhados
|-- supabaseService.ts             # CRUD work_items + queries
|-- efficiencyService.ts           # Metricas de eficiencia
|-- dailyReportService.ts          # Relatorios diarios
|-- aicaAutoService.ts             # Automacoes AI
|-- gamificationService.ts         # XP por tarefas completadas

src/components/features/           # Widgets relacionados
|-- EfficiencyControlPanel.tsx     # Painel de controle de eficiencia
```

---

## Eisenhower Priority Matrix

### 4 Quadrantes

| Quadrante | Nome | Cor | Acao |
|-----------|------|-----|------|
| Q1 | Urgente + Importante | Red | Fazer agora |
| Q2 | Nao Urgente + Importante | Blue | Agendar |
| Q3 | Urgente + Nao Importante | Yellow | Delegar |
| Q4 | Nao Urgente + Nao Importante | Gray | Eliminar |

### PriorityMatrix Component

- **Drag-and-drop** entre quadrantes (atualiza `priority` no DB)
- **Filtros**: por status, categoria, data
- **Acao rapida**: checkbox para completar tarefa inline
- Queries diretas ao `work_items` via Supabase client

---

## Tabela Principal: `work_items`

```typescript
interface WorkItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: number;            // 1=Q1, 2=Q2, 3=Q3, 4=Q4
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  category?: string;
  tags?: string[];
  is_recurring: boolean;
  recurrence_pattern?: string; // cron-like
  parent_id?: string;         // Subtask support
  project_id?: string;        // Agrupamento por projeto
  estimated_minutes?: number;
  actual_minutes?: number;
  created_at: string;
  updated_at: string;
}
```

### Tabelas Relacionadas

| Tabela | Proposito |
|--------|-----------|
| `work_items` | Tarefas principais |
| `task_categories` | Categorias customizaveis |
| `task_projects` | Agrupamento de tarefas |
| `daily_reports` | Relatorios de produtividade |

---

## Integracoes AI

| Feature | Servico | Descricao |
|---------|---------|-----------|
| Sugestao de prioridade | `aicaAutoService` | Sugere quadrante baseado no titulo/descricao |
| Relatorio diario | `dailyReportService` | Resumo AI de produtividade |
| Metricas de eficiencia | `efficiencyService` | Calcula taxa de conclusao, tempo medio |
| XP por tarefa | `gamificationService` | Awards XP ao completar tarefas |

---

## Metricas de Eficiencia

```typescript
// efficiencyService.ts
interface EfficiencyMetrics {
  completionRate: number;       // % tarefas completadas
  avgCompletionTime: number;    // Tempo medio em horas
  q1CompletionRate: number;     // Taxa especifica Q1
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  streakDays: number;           // Dias consecutivos com tarefas
}
```

---

## Gamificacao (Badges de Tarefas)

| Badge | Condicao | XP |
|-------|----------|----|
| Primeira Vitoria | 1 tarefa completada | 25 |
| Guerreiro de Tarefas | 50 tarefas completadas | 200 |
| Domador de Urgencias | 20 tarefas Q1 completadas | 300 |
| Lenda da Produtividade | 500 tarefas completadas | 500 |
| Mestre do Foco | 10 sessoes de foco 25+ min | 250 |

---

## Padroes Criticos

### SEMPRE:
- Queries ao `work_items` filtram por `user_id` (RLS)
- Drag-and-drop atualiza `priority` via `supabaseService`
- Completar tarefa: SET `status = 'completed'`, `completed_at = now()`
- XP award via `gamificationService` ao completar
- Subtarefas usam `parent_id` para hierarquia

### NUNCA:
- Deletar tarefas permanentemente (usar `status = 'cancelled'`)
- Ignorar RLS em queries
- Criar tarefa sem `priority` (default: 4 = Q4)

---

## Roadmap: Modulo Dedicado

Quando o Atlas ganhar `src/modules/atlas/`:
- Migrar componentes de `src/components/domain/` para `src/modules/atlas/components/`
- Criar hooks dedicados (`useWorkItems`, `useProjects`, `useSubtasks`)
- Criar servicos dedicados (`taskService`, `projectService`)
- Manter barrel exports para backward compatibility
