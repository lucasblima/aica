# Plano de Refatoracao: Podcast Module -> Studio Module

## Resumo Executivo

Este documento detalha o plano de refatoracao do modulo `src/modules/podcast/` para o novo modulo `src/modules/studio/`. O objetivo principal e resolver os **Race Conditions** severos que causam loops de redirecionamento e transformar o modulo em um **hub generico de criacao** (Studio).

**Status Atual:** O codigo em `PodcastCopilotView.tsx` (809 linhas) sofre de:
- Race conditions onde estado "pisca" para `null` durante carregamentos
- `useEffect` frageis com guards complexos (150+ linhas de logica defensiva)
- Flags de transicao (`isTransitioningRef`) que mascaram o problema real
- Timeouts de fallback (5 segundos) para lidar com estados inconsistentes

**Solucao Proposta:** Maquina de Estado Finita (FSM) explicita com:
- Estado unico de modo (`StudioMode`)
- Transicoes controladas e previsíveis
- Eliminacao de `useEffect` para logica de navegacao
- Separacao clara entre views: Library, Wizard, Workspace

---

## Arquitetura Proposta

### 1. Nova Estrutura de Pastas

```
src/modules/studio/
├── views/
│   ├── StudioMainView.tsx        # Componente principal com FSM
│   ├── StudioLibrary.tsx         # Lista de projetos (migrado de PodcastLibrary)
│   ├── StudioWizard.tsx          # Criacao de novos projetos
│   └── StudioWorkspace.tsx       # Wrapper para workspaces especificos
├── components/
│   ├── StudioHeader.tsx          # Header generico do studio
│   ├── StudioSidebar.tsx         # Sidebar de navegacao
│   ├── ProjectCard.tsx           # Card de projeto na library
│   └── LoadingScreen.tsx         # Tela de loading unificada
├── context/
│   └── StudioContext.tsx         # Contexto global do studio
├── hooks/
│   ├── useStudioMode.tsx         # Hook para gerenciar modo do studio
│   └── useProjectLoader.tsx      # Hook para carregar projetos
├── types/
│   └── studio.ts                 # Tipos do studio
├── workspaces/
│   └── podcast/                  # Workspace especifico de podcast
│       ├── PodcastWorkspaceAdapter.tsx
│       └── (reusa componentes de src/modules/podcast/)
└── index.ts                      # Exports publicos
```

### 2. Maquina de Estado Finita (FSM)

```typescript
// src/modules/studio/types/studio.ts

export type StudioMode = 'LOADING' | 'LIBRARY' | 'WIZARD' | 'WORKSPACE';

export interface StudioState {
  mode: StudioMode;
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

export type StudioAction =
  | { type: 'START_LOADING' }
  | { type: 'FINISH_LOADING'; payload: { hasProject: boolean; project?: Project } }
  | { type: 'GO_TO_LIBRARY' }
  | { type: 'GO_TO_WIZARD' }
  | { type: 'GO_TO_WORKSPACE'; payload: Project }
  | { type: 'SET_ERROR'; payload: string };
```

### 3. StudioMainView (Componente Principal)

```typescript
// src/modules/studio/views/StudioMainView.tsx

type StudioMode = 'LOADING' | 'LIBRARY' | 'WIZARD' | 'WORKSPACE';

interface StudioState {
  mode: StudioMode;
  currentShowId: string | null;
  currentProject: Project | null;
  error: string | null;
}

export default function StudioMainView() {
  const [state, setState] = useState<StudioState>({
    mode: 'LOADING',
    currentShowId: null,
    currentProject: null,
    error: null
  });

  const { currentProject, isLoading } = useStudioData(state.currentShowId);

  // EFEITO UNICO: Resolucao inicial de estado
  useEffect(() => {
    if (!isLoading && state.mode === 'LOADING') {
      setState(prev => ({
        ...prev,
        mode: currentProject ? 'WORKSPACE' : 'LIBRARY',
        currentProject
      }));
    }
  }, [isLoading, currentProject, state.mode]);

  // HANDLERS DE TRANSICAO (explicitos, sem race conditions)
  const handleSelectProject = useCallback((project: Project) => {
    setState(prev => ({
      ...prev,
      mode: 'WORKSPACE',
      currentProject: project
    }));
  }, []);

  const handleCreateNew = useCallback(() => {
    setState(prev => ({ ...prev, mode: 'WIZARD' }));
  }, []);

  const handleBackToLibrary = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: 'LIBRARY',
      currentProject: null
    }));
  }, []);

  const handleWizardComplete = useCallback((project: Project) => {
    setState(prev => ({
      ...prev,
      mode: 'WORKSPACE',
      currentProject: project
    }));
  }, []);

  // RENDERIZACAO BASEADA EM MODO (sem redirects no return!)
  if (isLoading || state.mode === 'LOADING') {
    return <LoadingScreen />;
  }

  switch (state.mode) {
    case 'WIZARD':
      return (
        <StudioWizard
          showId={state.currentShowId}
          onCancel={handleBackToLibrary}
          onComplete={handleWizardComplete}
        />
      );

    case 'WORKSPACE':
      return (
        <StudioWorkspace
          project={state.currentProject!}
          onBack={handleBackToLibrary}
        />
      );

    case 'LIBRARY':
    default:
      return (
        <StudioLibrary
          onSelectProject={handleSelectProject}
          onCreateNew={handleCreateNew}
        />
      );
  }
}
```

---

## Plano de Tarefas Detalhado

### Fase 1: Infraestrutura (Dias 1-2)

#### Task 1.1: Criar Estrutura de Pastas
**Agente:** General Purpose (Frontend Core)
**Prioridade:** Alta
**Estimativa:** 1h

```bash
# Criar estrutura basica
mkdir -p src/modules/studio/{views,components,context,hooks,types,workspaces/podcast}
```

**Arquivos a criar:**
- `src/modules/studio/index.ts`
- `src/modules/studio/types/studio.ts`

**Criterios de Aceite:**
- [ ] Estrutura de pastas criada
- [ ] Arquivo `index.ts` exporta tipos basicos
- [ ] Nenhum erro de TypeScript

---

#### Task 1.2: Definir Tipos do Studio
**Agente:** General Purpose (Backend Architect)
**Prioridade:** Alta
**Estimativa:** 2h
**Dependencias:** Task 1.1

**Arquivo:** `src/modules/studio/types/studio.ts`

```typescript
// Reusar tipos existentes de podcast
import type { PodcastShow } from '../../podcast/types';

export type StudioMode = 'LOADING' | 'LIBRARY' | 'WIZARD' | 'WORKSPACE';

export type ProjectType = 'podcast' | 'video' | 'article'; // Extensivel

export interface StudioProject {
  id: string;
  type: ProjectType;
  title: string;
  description?: string;
  showId?: string; // Para podcasts
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface StudioState {
  mode: StudioMode;
  currentShowId: string | null;
  currentProject: StudioProject | null;
  isLoading: boolean;
  error: string | null;
}

export interface StudioContextValue {
  state: StudioState;
  actions: StudioActions;
}

export interface StudioActions {
  goToLibrary: () => void;
  goToWizard: () => void;
  goToWorkspace: (project: StudioProject) => void;
  selectShow: (showId: string) => void;
  setError: (error: string | null) => void;
}
```

**Criterios de Aceite:**
- [ ] Tipos cobrem todos os cenarios de uso
- [ ] Compatibilidade com tipos existentes de podcast
- [ ] Extensibilidade para futuros tipos de projeto

---

#### Task 1.3: Implementar StudioContext
**Agente:** General Purpose (Frontend Core)
**Prioridade:** Alta
**Estimativa:** 3h
**Dependencias:** Task 1.2

**Arquivo:** `src/modules/studio/context/StudioContext.tsx`

**Responsabilidades:**
- Gerenciar estado global do Studio
- Prover actions para transicao de modo
- Manter consistencia de estado

**Padrao:** Seguir o padrao de `PodcastWorkspaceContext.tsx` (useReducer + Context)

---

### Fase 2: Componentes Core (Dias 3-5)

#### Task 2.1: Implementar StudioMainView
**Agente:** General Purpose (Frontend Core)
**Prioridade:** Critica
**Estimativa:** 4h
**Dependencias:** Task 1.3

**Arquivo:** `src/modules/studio/views/StudioMainView.tsx`

**Implementacao Core:**
- FSM com switch statement (nao if-else encadeado)
- Efeito unico de inicializacao
- Handlers de transicao explicitos
- NENHUM useEffect para logica de navegacao

**Codigo Critico (FSM):**
```typescript
// NUNCA faca isso:
useEffect(() => {
  if (someCondition) setView('library');
}, [someCondition]);

// SEMPRE faca isso:
const handleConditionMet = () => {
  setState(prev => ({ ...prev, mode: 'LIBRARY' }));
};
```

---

#### Task 2.2: Migrar PodcastLibrary para StudioLibrary
**Agente:** Podcast Copilot Agent
**Prioridade:** Alta
**Estimativa:** 3h
**Dependencias:** Task 2.1

**Arquivo Origem:** `src/modules/podcast/views/PodcastLibrary.tsx`
**Arquivo Destino:** `src/modules/studio/views/StudioLibrary.tsx`

**Mudancas Necessarias:**
1. Generalizar para multiplos tipos de projeto
2. Usar `StudioProject` ao inves de `PodcastShow`
3. Props de callback ao inves de navegacao interna
4. Manter compatibilidade visual

**Manter:**
- UI/UX existente
- Funcionalidade de criar novo show
- Listagem de episodios por show

---

#### Task 2.3: Criar StudioWizard
**Agente:** Podcast Copilot Agent
**Prioridade:** Alta
**Estimativa:** 4h
**Dependencias:** Task 2.1

**Arquivo:** `src/modules/studio/views/StudioWizard.tsx`

**Funcionalidade:**
- Wizard multi-step para criar novo projeto
- Step 1: Selecionar tipo de projeto (podcast, video, etc.)
- Step 2: Informacoes basicas
- Step 3: Configuracoes especificas do tipo
- Callback `onComplete` retorna projeto criado

**Integracao:**
- Reusar logica de `GuestIdentificationWizard.tsx` para podcasts
- Criar episodio no banco e retornar ID

---

#### Task 2.4: Implementar StudioWorkspace
**Agente:** General Purpose (Frontend Core)
**Prioridade:** Critica
**Estimativa:** 3h
**Dependencias:** Task 2.1

**Arquivo:** `src/modules/studio/views/StudioWorkspace.tsx`

**Responsabilidade:**
- Wrapper que roteia para workspace especifico baseado em `project.type`
- Para `type: 'podcast'` -> renderiza `PodcastWorkspace`
- Para `type: 'video'` -> renderiza `VideoWorkspace` (futuro)

```typescript
export default function StudioWorkspace({ project, onBack }: Props) {
  switch (project.type) {
    case 'podcast':
      return (
        <PodcastWorkspace
          episodeId={project.id}
          showId={project.showId!}
          showTitle={project.title}
          onBack={onBack}
        />
      );
    // Futuros tipos...
    default:
      return <UnsupportedProjectType />;
  }
}
```

**Critico:** NAO duplicar codigo do `PodcastWorkspace`. Apenas importar e usar.

---

### Fase 3: Integracao e Migracao (Dias 6-7)

#### Task 3.1: Atualizar Rotas
**Agente:** General Purpose (Frontend Core)
**Prioridade:** Alta
**Estimativa:** 2h
**Dependencias:** Tasks 2.1-2.4

**Arquivos a Modificar:**
- `src/App.tsx`
- `src/data/pillarData.tsx`
- Qualquer arquivo que importe `PodcastCopilotView`

**Estrategia:**
1. Criar rota `/studio` que renderiza `StudioMainView`
2. Manter `/podcast` como alias temporario
3. Deprecar `/podcast` apos validacao

---

#### Task 3.2: Preservar Componentes do Workspace
**Agente:** Podcast Copilot Agent
**Prioridade:** Critica
**Estimativa:** 1h
**Dependencias:** Task 3.1

**Verificar que os seguintes componentes continuam funcionando:**

1. **Setup Stage** (`SetupStage.tsx`)
   - Selecao de tipo de convidado
   - Busca de perfil com IA
   - Configuracao de tema

2. **Research Stage** (`ResearchStage.tsx`)
   - Geracao de dossier
   - Custom sources
   - Chat de pesquisa

3. **Pauta Stage** (`PautaStage.tsx`)
   - Drag-and-drop de topicos
   - Categorias
   - Geracao com IA
   - Version history

4. **Production Stage** (`ProductionStage.tsx`)
   - Timer HH:MM:SS
   - Controles de gravacao
   - Teleprompter
   - Checklist de topicos

**Teste Manual:**
- [ ] Criar novo episodio
- [ ] Navegar por todos os stages
- [ ] Voltar para library
- [ ] Reabrir episodio existente

---

#### Task 3.3: Remover Codigo Legado
**Agente:** General Purpose
**Prioridade:** Media
**Estimativa:** 2h
**Dependencias:** Tasks 3.1, 3.2

**Arquivos a Deprecar (NAO remover ainda):**
- `src/views/PodcastCopilotView.tsx`
- `src/modules/podcast/views/PreparationMode.tsx` (legado)
- `src/modules/podcast/views/StudioMode.tsx` (legado)

**Adicionar comentarios de deprecacao:**
```typescript
/**
 * @deprecated Use StudioMainView from src/modules/studio/
 * Este arquivo sera removido na versao 2.0
 */
```

---

### Fase 4: Testes e QA (Dias 8-9)

#### Task 4.1: Criar Testes E2E
**Agente:** Testing & QA Agent
**Prioridade:** Alta
**Estimativa:** 4h
**Dependencias:** Fase 3 completa

**Arquivo:** `tests/e2e/studio.spec.ts`

**Cenarios de Teste:**

```typescript
test.describe('Studio Module', () => {
  test('should load library when no active project', async ({ page }) => {
    // ...
  });

  test('should navigate to wizard when clicking create new', async ({ page }) => {
    // ...
  });

  test('should navigate to workspace when selecting project', async ({ page }) => {
    // ...
  });

  test('should return to library when clicking back', async ({ page }) => {
    // ...
  });

  // TESTE CRITICO: Race condition
  test('should NOT flash library when workspace is loading', async ({ page }) => {
    // Simular slow network
    // Verificar que library NUNCA aparece durante transicao
  });
});
```

---

#### Task 4.2: Teste de Regressao do Workspace
**Agente:** Testing & QA Agent
**Prioridade:** Critica
**Estimativa:** 3h
**Dependencias:** Task 4.1

**Cenarios:**
1. Setup Stage funciona corretamente
2. Research Stage gera dossier
3. Pauta Stage permite drag-and-drop
4. Production Stage inicia/pausa/finaliza gravacao
5. Auto-save persiste dados
6. Navegacao entre stages funciona

---

## Matriz de Delegacao

| Task | Agente Responsavel | Dependencias |
|------|-------------------|--------------|
| 1.1 Estrutura de Pastas | Frontend Core | - |
| 1.2 Tipos do Studio | Backend Architect | 1.1 |
| 1.3 StudioContext | Frontend Core | 1.2 |
| 2.1 StudioMainView | Frontend Core | 1.3 |
| 2.2 StudioLibrary | Podcast Copilot | 2.1 |
| 2.3 StudioWizard | Podcast Copilot | 2.1 |
| 2.4 StudioWorkspace | Frontend Core | 2.1 |
| 3.1 Atualizar Rotas | Frontend Core | 2.1-2.4 |
| 3.2 Preservar Componentes | Podcast Copilot | 3.1 |
| 3.3 Deprecar Legado | General Purpose | 3.1, 3.2 |
| 4.1 Testes E2E | Testing & QA | Fase 3 |
| 4.2 Teste Regressao | Testing & QA | 4.1 |

---

## Riscos e Mitigacoes

### Risco 1: Race Conditions Persistentes
**Probabilidade:** Media
**Impacto:** Alto
**Mitigacao:**
- Usar FSM explicita (NUNCA useEffect para navegacao)
- Testar com throttling de rede (Slow 3G)
- Adicionar logs detalhados em desenvolvimento

### Risco 2: Quebra de Funcionalidade Existente
**Probabilidade:** Media
**Impacto:** Critico
**Mitigacao:**
- NAO modificar `PodcastWorkspace` e seus stages
- Manter `PodcastCopilotView` como fallback
- Testes de regressao antes do merge

### Risco 3: Aumento de Complexidade
**Probabilidade:** Baixa
**Impacto:** Medio
**Mitigacao:**
- Documentacao clara de cada componente
- Seguir padroes existentes
- Code review obrigatorio

---

## Checklist de Conclusao

- [ ] Estrutura de pastas criada
- [ ] Tipos definidos e exportados
- [ ] StudioContext implementado
- [ ] StudioMainView com FSM funcionando
- [ ] StudioLibrary migrado
- [ ] StudioWizard criado
- [ ] StudioWorkspace integrando PodcastWorkspace
- [ ] Rotas atualizadas
- [ ] Testes E2E passando
- [ ] Nenhum race condition detectado
- [ ] Documentacao atualizada
- [ ] Code review aprovado
- [ ] Deploy em staging validado

---

## Proximos Passos (Apos Refatoracao)

1. **Adicionar Novos Tipos de Projeto**
   - `VideoWorkspace` para producao de video
   - `ArticleWorkspace` para blog posts

2. **Melhorar Persistencia**
   - Salvar estado do studio no localStorage
   - Retomar projeto automaticamente

3. **Gamificacao**
   - XP por completar stages
   - Achievements por projetos finalizados

---

**Autor:** Master Architect Agent
**Data:** 2025-12-18
**Versao:** 1.0
