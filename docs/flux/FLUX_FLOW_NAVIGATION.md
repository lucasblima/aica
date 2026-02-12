# Flux Module - Flow System Navigation Guide

**Data:** 2026-02-12
**Status:** Implementação Completa ✅

---

## Visão Geral

O módulo **Flux** (Gestão de Treinos) contém 2 subsistemas:

1. **Flux Core** - Dashboard de atletas, alertas, feedback (legado)
2. **Flow System** - Sistema inteligente de prescrição de treinos (novo)

Este guia documenta todas as rotas e navegação do **Flow System** (5 telas).

---

## Arquitetura do Flow System

### 5 Telas Principais

| # | Tela | Rota | Ícone | Descrição |
|---|------|------|-------|-----------|
| 1 | **Biblioteca de Exercícios** | `/flux/templates` | 📚 | Catálogo de templates de treino |
| 2 | **Canvas (CRM)** | `/flux/crm` | 📋 | Command center + microciclo visual |
| 3 | **Calculadora de Intensidade** | `/flux/intensity/:athleteId?` | ⚡ | Calcular zonas FTP/CSS/Pace |
| 4 | **Motor de Nivelamento** | `/flux/leveling` | 📊 | Recomendações de progressão |
| 5 | **Editor de Microciclo** | `/flux/microcycle/:microcycleId` | 📅 | Editor drag-and-drop 3 semanas |

---

## Navegação Primária (FluxDashboard)

### Quick Access Buttons (2x2 Grid)

```typescript
// Linha 1
[📚 Biblioteca] [📋 Canvas]

// Linha 2
[⚡ Intensidade] [📊 Nivelamento]
```

**Localização:** `FluxDashboard.tsx` (linhas 207-244)

**Código:**
```tsx
<div className="grid grid-cols-2 gap-2 mb-4">
  <button onClick={() => navigate('/flux/templates')}>
    <span>📚</span>
    <p>Biblioteca</p>
  </button>

  <button onClick={() => navigate('/flux/crm')}>
    <span>📋</span>
    <p>Canvas</p>
  </button>

  <button onClick={() => navigate('/flux/intensity')}>
    <span>⚡</span>
    <p>Intensidade</p>
  </button>

  <button onClick={() => navigate('/flux/leveling')}>
    <span>📊</span>
    <p>Nivelamento</p>
  </button>
</div>
```

---

## Rotas Completas (AppRouter.tsx)

### Flux Core Routes (Legacy)
```tsx
// Dashboard principal
<Route path="/flux" element={<AuthGuard><FluxProvider><FluxDashboard /></FluxProvider></AuthGuard>} />

// Detalhe do atleta (12 semanas)
<Route path="/flux/athlete/:athleteId" element={<AuthGuard><FluxProvider><FluxAthleteDetailView /></FluxProvider></AuthGuard>} />

// Canvas visual (12 semanas)
<Route path="/flux/canvas/:athleteId/:blockId?" element={<AuthGuard><FluxProvider><FluxCanvasEditorView /></FluxProvider></AuthGuard>} />

// Central de alertas
<Route path="/flux/alerts" element={<AuthGuard><FluxProvider><FluxAlertsView /></FluxProvider></AuthGuard>} />
```

### Flow System Routes (Novo)
```tsx
// Biblioteca de Exercícios
<Route path="/flux/templates" element={<AuthGuard><FluxProvider><TemplateLibraryView /></FluxProvider></AuthGuard>} />
<Route path="/flux/templates/new" element={<AuthGuard><FluxProvider><TemplateLibraryView /></FluxProvider></AuthGuard>} />
<Route path="/flux/templates/:templateId/edit" element={<AuthGuard><FluxProvider><TemplateLibraryView /></FluxProvider></AuthGuard>} />

// Editor de Microciclo (3 semanas)
<Route path="/flux/microcycle/:microcycleId" element={<AuthGuard><FluxProvider><MicrocycleEditorView /></FluxProvider></AuthGuard>} />

// Motor de Nivelamento
<Route path="/flux/leveling" element={<AuthGuard><FluxProvider><LevelingEngineView /></FluxProvider></AuthGuard>} />

// Calculadora de Intensidade (athleteId opcional)
<Route path="/flux/intensity/:athleteId?" element={<AuthGuard><FluxProvider><IntensityCalculatorView /></FluxProvider></AuthGuard>} />

// CRM Command Center
<Route path="/flux/crm" element={<AuthGuard><FluxProvider><CRMCommandCenterView /></FluxProvider></AuthGuard>} />
```

**Localização:** `AppRouter.tsx` (linhas 661-673)

---

## Navegação Secundária (Context-Aware)

### A partir do CRM Command Center
```
/flux/crm
  ├─> Selecionar atleta → /flux/microcycle/:microcycleId
  ├─> Bulk action "Criar Microciclo" → /flux/microcycle/new
  ├─> Clique em atleta → /flux/athlete/:athleteId
  └─> "Criar Exercício" → /flux/templates/new
```

### A partir da Biblioteca
```
/flux/templates
  ├─> "Criar Exercício" → Modal (route: /flux/templates/new)
  ├─> Editar template → Modal (route: /flux/templates/:id/edit)
  └─> Drag template to microcycle → Adiciona ao microciclo ativo
```

### A partir do Microciclo Editor
```
/flux/microcycle/:id
  ├─> Biblioteca sidebar → Buscar templates
  ├─> Drag-and-drop → Popula grid 3x7 (semanas x dias)
  ├─> "Enviar WhatsApp" → Trigger automation
  └─> "Calculadora Intensidade" → /flux/intensity/:athleteId
```

### A partir do Athlete Detail (Legacy)
```
/flux/athlete/:id
  ├─> "Ver Microciclo Atual" → /flux/microcycle/:microcycleId
  ├─> "Canvas 12 Semanas" → /flux/canvas/:athleteId/:blockId
  └─> "Atualizar Limiares" → /flux/intensity/:athleteId
```

---

## Fluxos de Uso (User Journeys)

### 1. Criar Template e Prescrever Treino
```
1. FluxDashboard → Click "📚 Biblioteca"
2. TemplateLibraryView → Click "Criar Exercício"
3. TemplateFormModal → Preencher (nome, modalidade, intensidade, estrutura)
4. Salvar → Template aparece na biblioteca
5. FluxDashboard → Click "📋 Canvas"
6. CRMCommandCenterView → Selecionar atleta
7. MicrocycleEditorView → Drag template para grid 3x7
8. Ajustar intensidade → Enviar via WhatsApp
```

### 2. Avaliar e Nivelar Atleta
```
1. FluxDashboard → Click "📊 Nivelamento"
2. LevelingEngineView → Ver recomendações AI
3. Review métricas (consistência, volume, tendência)
4. Aceitar/Rejeitar recomendação de subir nível
5. Sistema atualiza athlete_profiles.level
```

### 3. Calcular Zonas de Intensidade
```
1. FluxDashboard → Click "⚡ Intensidade"
2. IntensityCalculatorView → Selecionar modalidade
3. Input limiar (FTP watts / Pace /km / CSS /100m)
4. Sistema calcula 5 zonas com exemplos de treino
5. "Aplicar ao Atleta" → Salva limiares em athlete_profiles
```

### 4. Gestão Completa via CRM
```
1. FluxDashboard → Click "📋 Canvas"
2. CRMCommandCenterView → Visão geral de todos atletas
3. Filtros: modalidade, nível, status, consistência
4. Bulk actions: Criar microciclo, Enviar mensagem, Ajustar nível
5. Click em atleta → Drill-down para /flux/microcycle/:id
6. Editor completo 3 semanas com automações
```

---

## Tipos de Dados (7 Tabelas)

| Tabela | Tipo Principal | Descrição |
|--------|----------------|-----------|
| `workout_templates` | `WorkoutTemplate` | Catálogo de exercícios |
| `microcycles` | `Microcycle` | Blocos de 3 semanas |
| `workout_slots` | `WorkoutSlot` | Treinos individuais (grid 3x7) |
| `athlete_profiles` | `FlowAthleteProfile` | Perfil + limiares |
| `coach_messages` | `CoachMessage` | Templates de mensagem |
| `scheduled_workouts` | `ScheduledWorkout` | Fila de envio WhatsApp |
| `workout_automations` | `WorkoutAutomation` | Triggers + Actions |

**Localização:** `src/modules/flux/types/flow.ts` (600 linhas)

---

## Mock Data (Desenvolvimento)

### Dados Disponíveis
```typescript
// 15 templates across 4 modalities
MOCK_WORKOUT_TEMPLATES (swimming, running, cycling, strength)

// 2 microciclos de exemplo
MOCK_MICROCYCLES (base aeróbica, intensidade progressiva)

// 4 slots para microciclo-1
MOCK_WORKOUT_SLOTS (semana 1 e 2)

// 3 perfis de atletas
MOCK_FLOW_ATHLETE_PROFILES (João natação, Maria corrida, Pedro ciclismo)

// 3 automações configuradas
MOCK_WORKOUT_AUTOMATIONS (enviar microciclo, alerta consistência, trial expirando)
```

**Localização:** `src/modules/flux/mockData_flow.ts` (701 linhas)

**Exportado em:** `src/modules/flux/index.ts` (linhas 53-62)

---

## Services (API Layer)

| Service | Métodos | Tabela |
|---------|---------|--------|
| `WorkoutTemplateService` | create, update, delete, getAll, getByModality | `workout_templates` |
| `MicrocycleService` | create, update, getById, getSlots, sendToWhatsApp | `microcycles` |
| `AthleteProfileService` | create, update, getAll, updateThresholds, bulkImport | `athlete_profiles` |
| `AutomationService` | create, update, trigger, getActive, getLogs | `workout_automations` |
| `IntensityCalculatorService` | calculateFTP, calculatePaceZones, calculateCSS | N/A (client-side) |
| `LevelingEngineService` | recommendLevel, getRecommendations, applyLevel | N/A (client-side) |

**Localização:** `src/modules/flux/services/` (6 arquivos)

---

## Componentes Reutilizáveis

### Form Components (Biblioteca)
```typescript
// Modal principal
<TemplateFormModal mode="create" | "edit" initialData={...} />

// 4 accordion sections
<BasicInfoSection /> // Nome, categoria, modalidade, duração, intensidade
<IntensitySection /> // FTP%, Pace zones, CSS%, RPE
<ExerciseStructureSection /> // Sets/reps, intervalos, distância/tempo
<OrganizationSection /> // Tags, níveis, público, favorito

// Sub-editors
<SetsRepsEditor /> // Força (3x12, 90s rest)
<IntervalsEditor /> // Cardio (20x50m @ 95% CSS, 10s rest)
<DistanceTimeEditor /> // Contínuo (3000m em 60min)
```

**Hook:** `useTemplateForm()` - Gerencia estado, validação, submit

**Localização:** `src/modules/flux/components/forms/` (10 arquivos)

---

## Estados da Aplicação (FSM)

### FluxContext (Global)
```typescript
type FluxMode =
  | 'viewing_dashboard'        // Dashboard principal
  | 'viewing_athlete_detail'   // Timeline 12 semanas
  | 'editing_canvas'           // Canvas visual
  | 'managing_alerts';         // Central de alertas

interface FluxState {
  mode: FluxMode;
  selectedAthleteId: string | null;
  selectedBlockId: string | null;
  alertFilters: { ... };
  canvasEditMode: boolean;
}
```

**Localização:** `src/modules/flux/context/FluxContext.tsx`

---

## Proteção de Rotas

### AuthGuard + FluxProvider
Todas as rotas Flow estão protegidas com:
1. **AuthGuard** - Verifica autenticação Supabase
2. **FluxProvider** - Fornece estado global do módulo

```tsx
<Route
  path="/flux/templates"
  element={
    <AuthGuard>
      <FluxProvider>
        <TemplateLibraryView />
      </FluxProvider>
    </AuthGuard>
  }
/>
```

---

## Integração com WhatsApp

### Pipeline de Envio
```
1. MicrocycleEditorView → "Enviar Microciclo"
2. Sistema cria ScheduledWorkout (status='pending')
3. WorkoutAutomation trigger='microcycle_starts' detecta
4. Edge Function: send-microcycle-whatsapp
5. Evolution API envia mensagem formatada
6. Webhook atualiza status='sent'
7. Athlete recebe link para ver plano (3 semanas)
```

---

## Validações Críticas

### Template Form
- ✅ Nome: 3-100 caracteres
- ✅ Categoria: obrigatória
- ✅ Modalidade: obrigatória
- ✅ Duração: 1-600 minutos
- ✅ Intensidade: low | medium | high
- ✅ Pelo menos 1 métrica de intensidade (FTP% OU Pace OU CSS% OU RPE)
- ✅ Estrutura de exercício apropriada à categoria

### Microcycle
- ✅ 3 semanas (week_1_focus, week_2_focus, week_3_focus)
- ✅ Datas válidas (end_date = start_date + 21 dias)
- ✅ Atleta possui limiares definidos (FTP/Pace/CSS)
- ✅ Pelo menos 1 slot por semana

### Intensity Calculator
- ✅ FTP: 100-500 watts
- ✅ Pace threshold: formato 'MM:SS/km' (ex: '4:30/km')
- ✅ CSS: formato 'MM:SS/100m' (ex: '1:35/100m')
- ✅ RPE: 1-10 (escala Borg)

---

## Debugging & Troubleshooting

### Routes não carregam
```bash
# Verificar lazy loading no AppRouter
const TemplateLibraryView = lazy(() => import('../modules/flux/views/TemplateLibraryView'))

# Verificar barrel export no index.ts
export { default as TemplateLibraryView } from './views/TemplateLibraryView';
```

### Imports quebrados
```bash
# SEMPRE usar barrel export
import { WorkoutTemplate, FlowAthleteProfile } from '@/modules/flux/types'

# NÃO usar paths diretos
import { WorkoutTemplate } from '@/modules/flux/types/flow'  # ❌ Evitar
```

### TypeScript errors
```bash
# Verificar tipo correto
FlowAthleteProfile (não AthleteProfile - resolvido em flow.ts linha 271)

# Rebuild
rm -rf node_modules/.vite && npm install && npx tsc --noEmit
```

---

## Performance

### Lazy Loading
Todas as 5 views Flow são lazy-loaded via `React.lazy()`:
- TemplateLibraryView
- MicrocycleEditorView
- LevelingEngineView
- IntensityCalculatorView
- CRMCommandCenterView

**Bundle size por view:** ~15-25KB (gzipped)

### Mock Data Strategy
Em desenvolvimento:
- Mock data carregado estaticamente (não fetch)
- 15 templates, 2 microciclos, 4 slots, 3 perfis = ~30KB

Em produção:
- Substituir por Supabase queries
- RLS: `user_id = auth.uid()`

---

## Roadmap (Pendente)

### Backend (Supabase)
- [ ] Migration: criar 7 tabelas Flow
- [ ] RPCs: get_athlete_recommendations, calculate_microcycle_load
- [ ] Edge Functions: send-microcycle-whatsapp, auto-level-athlete

### Frontend
- [ ] Conectar services ao Supabase (substituir mock)
- [ ] Implementar drag-and-drop no MicrocycleEditor
- [ ] Adicionar filtros avançados no CRM
- [ ] WhatsApp preview no ScheduledWorkout
- [ ] Export microciclo para PDF

### UX
- [ ] Onboarding tour (React Joyride)
- [ ] Shortcuts de teclado (Ctrl+N = novo template)
- [ ] Dark mode support
- [ ] Mobile responsiveness (editor 3x7 grid)

---

## Links Úteis

### Documentação
- **PRD Flow Module:** `.claude/design/FLOW_MODULE_PRD.md`
- **Design Tokens:** `.claude/design/DESIGN_TOKENS.md`
- **Flux Trainer Skill:** `.claude/skills/flux-trainer/SKILL.md`

### Código
- **Tipos:** `src/modules/flux/types/flow.ts`
- **Mock Data:** `src/modules/flux/mockData_flow.ts`
- **Routes:** `src/router/AppRouter.tsx` (linhas 661-673)
- **Dashboard:** `src/modules/flux/views/FluxDashboard.tsx`

---

**Última atualização:** 2026-02-12
**Autor:** Claude Sonnet 4.5 + Lucas Boscacci Lima
**Status:** ✅ Navegação Completa Implementada
