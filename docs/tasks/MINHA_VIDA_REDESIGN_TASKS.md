# Redesign "Minha Vida" - Lista de Tarefas

> Plano de implementacao para o redesign da secao "Minha Vida" baseado na critica de design.
> Gerado por: Master Architect Agent
> Data: 2025-12-13

---

## Resumo Executivo

Este documento detalha as tarefas necessarias para implementar o redesign da secao "Minha Vida" do Aica Life OS. O trabalho esta organizado em 6 fases, da fundacao ate o polimento final.

### Arquivos Principais Afetados
- `src/pages/Home.tsx` (468 linhas)
- `src/components/HeaderGlobal.tsx`
- `src/modules/journey/views/JourneyCardCollapsed.tsx`
- `src/modules/journey/components/gamification/ConsciousnessScore.tsx`
- `src/components/ConnectionArchetypes.tsx`
- `index.css` (Design System Ceramic)
- `tailwind.config.js`

---

## FASE 1: FOUNDATION - Design Tokens e Componentes Base

### 1.1 Expandir Design Tokens Ceramic
- [ ] **Adicionar novos tokens de sombra ao `index.css`**
  - **Descricao**: Criar variantes de profundidade para `ceramic-inset` (shallow, medium, deep)
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\index.css`
  - **Dependencias**: Nenhuma
  - **Detalhes Tecnicos**:
    ```css
    .ceramic-inset-shallow { /* sombra interna leve */ }
    .ceramic-inset-deep { /* sombra interna profunda para potencial */ }
    .ceramic-elevated { /* card selecionado/hover com mais destaque */ }
    .ceramic-pressed { /* estado pressionado */ }
    ```

### 1.2 Criar Tokens de Temperatura de Cor
- [ ] **Adicionar variantes de cor para estados selecionados**
  - **Descricao**: Definir cores "warm" e "cool" para transicoes de temperatura
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\tailwind.config.js`
  - **Dependencias**: Nenhuma
  - **Detalhes**:
    ```js
    'ceramic-warm': '#F5E6D3',  // Tom quente para selecao
    'ceramic-cool': '#E8EBE9',  // Tom frio para nao-selecionado
    ```

### 1.3 Definir Animacoes Base Framer Motion
- [ ] **Criar arquivo de constantes de animacao**
  - **Descricao**: Centralizar configs de spring physics, inercia e pulsacao
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\lib\animations\ceramic-motion.ts`
  - **Dependencias**: 1.1
  - **Exportar**:
    - `springElevation`: Config para elevacao de cards
    - `inertiaSlide`: Config para deslizamento de tabs
    - `pulseAmber`: Keyframes para notificacao pulsante

### 1.4 Criar Hook useCardSelection
- [ ] **Hook para gerenciar selecao de cards com feedback visual**
  - **Descricao**: Gerencia estado de selecao, elevacao e temperatura de cor
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\hooks\useCardSelection.ts`
  - **Dependencias**: 1.2, 1.3
  - **Interface**:
    ```ts
    interface UseCardSelectionReturn {
      selectedId: string | null;
      select: (id: string) => void;
      isSelected: (id: string) => boolean;
      getCardProps: (id: string) => MotionProps;
    }
    ```

---

## FASE 2: TAB SELECTOR - Novo Seletor Ceramic

### 2.1 Criar Componente CeramicTabSelector
- [ ] **Novo componente de tabs com materialidade ceramic**
  - **Descricao**: Substituir tabs atuais por componente com tray + card deslizante
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\CeramicTabSelector.tsx`
  - **Dependencias**: 1.1, 1.3
  - **Especificacoes**:
    - Container: `ceramic-tray` (baixo relevo)
    - Aba ativa: `ceramic-card` (alto relevo) que desliza
    - Animacao: spring physics com inercia
    - Props: `tabs: Tab[]`, `activeTab: string`, `onChange: (tab) => void`

### 2.2 Implementar Animacao de Deslizamento com Inercia
- [ ] **Adicionar fisica de inercia no movimento das tabs**
  - **Descricao**: O indicador ativo deve "escorregar" suavemente com overshoot
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\CeramicTabSelector.tsx`
  - **Dependencias**: 2.1
  - **Framer Motion Config**:
    ```ts
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 1.2
    }
    ```

### 2.3 Integrar CeramicTabSelector no HeaderGlobal
- [ ] **Substituir tabs existentes pelo novo componente**
  - **Descricao**: Remover implementacao inline e usar CeramicTabSelector
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\HeaderGlobal.tsx`
  - **Dependencias**: 2.1, 2.2
  - **Linhas afetadas**: 48-69

---

## FASE 3: CARD FUSION - Unificar Jornada + Consciencia

### 3.1 Criar Componente JourneyMasterCard
- [ ] **Novo card unificado substituindo JourneyCardCollapsed + ConsciousnessScore**
  - **Descricao**: Card mestre mostrando Nivel, proximo marco, status e notificacoes
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\journey\views\JourneyMasterCard.tsx`
  - **Dependencias**: 1.1, 1.3
  - **Layout**:
    ```
    +-----------------------------------------------+
    |  [Badge Nivel]   Nivel 7 - Desperto           |
    |                  2,450 / 3,000 CP             |
    |  [===========================------] 82%      |
    |                                               |
    |  Proximo: "Guardiao da Consciencia"  [!]      |
    +-----------------------------------------------+
    ```
  - **Indicador de notificacao**: Ponto ambar pulsante (nao banner)

### 3.2 Criar Indicador de Notificacao Pulsante
- [ ] **Substituir barra amarela por indicador sutil**
  - **Descricao**: Ponto ambar com pulsacao suave para alertas pendentes
  - **Arquivo**: Integrado em `JourneyMasterCard.tsx`
  - **Dependencias**: 3.1, 1.3
  - **CSS Animation**:
    ```css
    .notification-pulse {
      animation: pulse-amber 2s ease-in-out infinite;
    }
    @keyframes pulse-amber {
      0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); }
    }
    ```

### 3.3 Remover Componentes Redundantes do Home
- [ ] **Limpar imports e remover cards duplicados**
  - **Descricao**: Remover JourneyCardCollapsed e ConsciousnessScore separados
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\pages\Home.tsx`
  - **Dependencias**: 3.1
  - **Linhas afetadas**: 6, 8, 182-202
  - **Substituir por**: Unico `<JourneyMasterCard />`

### 3.4 Manter JourneyCardCollapsed para Retrocompatibilidade
- [ ] **Marcar componente antigo como deprecated**
  - **Descricao**: Adicionar JSDoc @deprecated mas manter funcionando
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\journey\views\JourneyCardCollapsed.tsx`
  - **Dependencias**: 3.1

---

## FASE 4: GRID NORMALIZATION - Padronizar Cards de Modulos

### 4.1 Criar Componente ModuleCardNormalized
- [ ] **Refatorar ModuleCard com altura/peso visual consistente**
  - **Descricao**: Todos os cards de modulo devem ter mesma altura minima e padding
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\ModuleCardNormalized.tsx`
  - **Dependencias**: 1.1
  - **Props**:
    ```ts
    interface ModuleCardNormalizedProps {
      moduleId: string;
      title: string;
      icon: LucideIcon;
      accentColor: string;
      variant: 'compact' | 'expanded';
      children?: React.ReactNode;
    }
    ```

### 4.2 Simplificar FinanceCard para Navegacao
- [ ] **Reduzir complexidade do FinanceCard na Home**
  - **Descricao**: Mostrar apenas saldo principal + tendencia, detalhes no modulo
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\modules\finance\components\FinanceCard.tsx`
  - **Dependencias**: 4.1
  - **Mudancas**:
    - Remover graficos detalhados
    - Manter: Saldo total, indicador de variacao, CTA "Ver detalhes"

### 4.3 Aplicar Grid Bento Normalizado
- [ ] **Ajustar grid da Home para peso visual equilibrado**
  - **Descricao**: Revisar col-span e row-span para harmonia visual
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\pages\Home.tsx`
  - **Dependencias**: 4.1, 4.2
  - **Linhas afetadas**: 217-394
  - **Nova estrutura**:
    ```
    [JourneyMaster - full width]
    [EfficiencyChart - full width]
    [Finance 2x2] [Grants 2x2]
    [Health] [Education] [Legal] [Associations]
    ```

### 4.4 Extrair ModuleCard do Home.tsx
- [ ] **Mover definicao do ModuleCard para arquivo proprio**
  - **Descricao**: Componente ModuleCard (linhas 42-90) deve ser exportado
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\ModuleCard.tsx`
  - **Arquivo Origem**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\pages\Home.tsx`
  - **Dependencias**: Nenhuma

---

## FASE 5: EMPTY STATES - Redesign da Visao Conexoes

### 5.1 Redesenhar ArchetypeCard com Inset Profundo
- [ ] **Cards vazios com sombra inset mais profunda**
  - **Descricao**: Usar `ceramic-inset-deep` para transmitir potencial
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\ConnectionArchetypes.tsx`
  - **Dependencias**: 1.1, 1.4
  - **Mudancas visuais**:
    - Fundo: `ceramic-inset-deep` em vez de `ceramic-card`
    - Icones: "gravados" na superficie (opacity baixa + blur sutil)

### 5.2 Implementar Selecao por Elevacao
- [ ] **Substituir radio button por elevacao do card**
  - **Descricao**: Card selecionado eleva-se de inset para card
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\ConnectionArchetypes.tsx`
  - **Dependencias**: 5.1, 1.3, 1.4
  - **Comportamento**:
    - Estado inicial: `ceramic-inset-deep` (afundado)
    - Ao selecionar: transicao para `ceramic-elevated` com spring
    - Mudanca de temperatura: frio -> quente

### 5.3 Atualizar Microcopy
- [ ] **Reduzir verbosidade dos textos**
  - **Descricao**: Trocar textos pretensiosos por frases curtas e diretas
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\ConnectionArchetypes.tsx`
  - **Dependencias**: Nenhuma
  - **Mudancas**:
    - Header: "Suas Esferas de Influencia" -> "Onde suas redes ganham forma"
    - Descricoes: Reduzir para max 5 palavras cada

### 5.4 Criar Botao Flutuante "Criar"
- [ ] **FAB que se acende quando arquetipo selecionado**
  - **Descricao**: Botao flutuante inicialmente apagado, acende com selecao
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\ConnectionArchetypes.tsx`
  - **Dependencias**: 5.2
  - **Estados**:
    - Nenhum selecionado: opacidade 30%, disabled
    - Com selecao: opacidade 100%, ceramic-accent, pulsacao sutil

### 5.5 Adicionar Icones Gravados
- [ ] **Icones dos arquetipos com efeito de gravacao**
  - **Descricao**: Icones parecem "entalhados" na superficie ceramic
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\index.css`
  - **Dependencias**: 1.1
  - **Novo CSS**:
    ```css
    .icon-engraved {
      opacity: 0.15;
      filter: blur(0.5px);
      text-shadow:
        1px 1px 0 rgba(255,255,255,0.8),
        -1px -1px 0 rgba(0,0,0,0.1);
    }
    ```

---

## FASE 6: POLISH - Animacoes e Micro-interacoes

### 6.1 Adicionar Transicao de Temperatura de Cor
- [ ] **Implementar mudanca de cor ao selecionar cards**
  - **Descricao**: Cards mudam de tom frio para quente ao serem selecionados
  - **Arquivos**: `ConnectionArchetypes.tsx`, `ceramic-motion.ts`
  - **Dependencias**: 5.2, 1.2
  - **Framer Motion**:
    ```ts
    animate={{
      backgroundColor: isSelected
        ? "var(--ceramic-warm)"
        : "var(--ceramic-cool)"
    }}
    ```

### 6.2 Refinar Spring Physics dos Cards
- [ ] **Ajustar parametros de spring para sensacao tactica**
  - **Descricao**: Cards devem ter peso perceptivel, nao parecer flutuantes
  - **Arquivo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\lib\animations\ceramic-motion.ts`
  - **Dependencias**: 1.3
  - **Valores recomendados**:
    ```ts
    cardElevation: {
      stiffness: 400,
      damping: 25,
      mass: 0.8
    }
    ```

### 6.3 Implementar Hover States Consistentes
- [ ] **Padronizar feedback de hover em todos os cards**
  - **Descricao**: Todos os cards interativos devem ter mesmo comportamento
  - **Arquivos**: Todos os componentes de card
  - **Dependencias**: 6.2
  - **Comportamento**: scale(1.02) + sombra levemente aumentada

### 6.4 Adicionar Feedback Haptico (Web API)
- [ ] **Vibration API para interacoes importantes**
  - **Descricao**: Vibrar levemente ao selecionar cards (mobile)
  - **Arquivo Novo**: `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\lib\haptics.ts`
  - **Dependencias**: Nenhuma
  - **Implementacao**:
    ```ts
    export const hapticFeedback = {
      light: () => navigator.vibrate?.(10),
      medium: () => navigator.vibrate?.(20),
      heavy: () => navigator.vibrate?.([20, 10, 20])
    }
    ```

### 6.5 Testes Visuais e Ajustes Finais
- [ ] **Revisar todas as implementacoes em diferentes viewports**
  - **Descricao**: Garantir consistencia em mobile, tablet e desktop
  - **Arquivos**: Todos os componentes modificados
  - **Dependencias**: Todas as fases anteriores
  - **Checklist**:
    - [ ] iPhone SE (375px)
    - [ ] iPhone 14 Pro (393px)
    - [ ] iPad (768px)
    - [ ] Desktop (1280px+)

---

## Delegacao por Agente

| Fase | Tarefas | Agente Recomendado |
|------|---------|-------------------|
| 1 | 1.1, 1.2, 1.3, 1.4 | **general-purpose** (Frontend Core) |
| 2 | 2.1, 2.2, 2.3 | **general-purpose** (Frontend Core) |
| 3 | 3.1, 3.2, 3.3, 3.4 | **gamification-agent** + **general-purpose** |
| 4 | 4.1, 4.2, 4.3, 4.4 | **general-purpose** (Frontend Core) |
| 5 | 5.1, 5.2, 5.3, 5.4, 5.5 | **general-purpose** (Frontend Core) |
| 6 | 6.1, 6.2, 6.3, 6.4, 6.5 | **general-purpose** + **testing-qa** |

---

## Ordem de Execucao Sugerida

```
Fase 1 (Foundation)
    |
    v
Fase 2 (Tab Selector) ----+
    |                     |
    v                     |
Fase 3 (Card Fusion) <----+  (podem ser paralelas)
    |
    v
Fase 4 (Grid Normalization)
    |
    v
Fase 5 (Empty States)
    |
    v
Fase 6 (Polish)
```

---

## Metricas de Sucesso

1. **Reducao de Redundancia**: De 2 cards (Jornada + Consciencia) para 1
2. **Consistencia Visual**: Todos os cards com mesmo peso visual base
3. **Feedback Tatico**: Interacoes com sensacao de materialidade
4. **Performance**: Animacoes a 60fps constantes
5. **Acessibilidade**: Contraste e areas de toque adequados

---

## Notas Tecnicas

### Arquivos que NAO devem ser alterados:
- `src/services/*` - Camada de servicos intacta
- `src/modules/journey/hooks/*` - Hooks de dados permanecem
- `supabase/*` - Migrations nao afetadas

### Imports Novos Necessarios:
```ts
// Home.tsx
import { JourneyMasterCard } from '../modules/journey/views/JourneyMasterCard';
import { CeramicTabSelector } from '../components/CeramicTabSelector';
import { ModuleCardNormalized } from '../components/ModuleCardNormalized';
```

### CSS Variables Recomendadas:
```css
:root {
  --ceramic-shadow-taupe: rgba(163, 158, 145, 0.35);
  --ceramic-shadow-white: rgba(255, 255, 255, 1.0);
  --ceramic-warm: #F5E6D3;
  --ceramic-cool: #E8EBE9;
  --ceramic-accent-pulse: rgba(217, 119, 6, 0.4);
}
```

---

*Documento gerado pelo Master Architect Agent - Aica Life OS*
