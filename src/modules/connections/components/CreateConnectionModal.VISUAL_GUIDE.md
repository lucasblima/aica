# CreateConnectionModal - Visual Guide

Visual walkthrough of the 4-step wizard for creating Connection Spaces.

---

## Step 1: Choose Archetype

```
┌─────────────────────────────────────────────────────────┐
│  🏠  Novo Espaço de Conexão                        ✕   │
├─────────────────────────────────────────────────────────┤
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%          │
│  Arquétipo   Informações   Configuração   Membros      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Escolha o Arquétipo                                    │
│  Cada arquétipo representa um tipo diferente de         │
│  espaço de conexão                                      │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  ╔════╗               │  │  ╔════╗               │    │
│  │  ║ 🏠 ║  Habitat      │  │  ║ 💼 ║  Ventures     │    │
│  │  ╚════╝               │  │  ╚════╝               │    │
│  │  O Âncora Físico      │  │  O Motor de Criação   │    │
│  │  Logística da         │  │  Cockpit da ambição   │    │
│  │  serenidade...        │  │  profissional...      │    │
│  └──────────────────────┘  └──────────────────────┘    │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  ╔════╗               │  │  ╔════╗               │    │
│  │  ║ 🎓 ║  Academia     │  │  ║ 👥 ║  Tribo        │    │
│  │  ╚════╝               │  │  ╚════╝               │    │
│  │  O Cultivo da Mente   │  │  O Tecido Social      │    │
│  │  Templo do            │  │  Antítese da rede     │    │
│  │  crescimento...       │  │  social moderna...    │    │
│  └──────────────────────┘  └──────────────────────┘    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                     ┌─────────────────┐ │
│                                     │  Próximo    ➤  │ │
│                                     └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**After Selection (Habitat):**
```
┌──────────────────────────────────┐
│  ╔════╗  Habitat           ✓    │  ← Selected with checkmark
│  ║ 🏠 ║                          │     Ring highlight
│  ╚════╝                          │
│  O Âncora Físico                 │
│  Logística da serenidade...      │
└──────────────────────────────────┘
```

---

## Step 2: Basic Info

```
┌─────────────────────────────────────────────────────────┐
│  🏠  Novo Espaço de Conexão                        ✕   │
│      Habitat                                            │
├─────────────────────────────────────────────────────────┤
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 50%           │
│  Arquétipo   Informações   Configuração   Membros      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Informações Básicas                                    │
│  Defina o nome e a aparência do seu espaço              │
│                                                         │
│  NOME DO ESPAÇO *                                       │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Ex: Apartamento Centro                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  DESCRIÇÃO (OPCIONAL)                                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Descreva brevemente este espaço...                │ │
│  │                                                    │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  COR DO TEMA                                            │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│  │   ●    │  │   ●    │  │   ●    │  │   ●    │      │
│  │ Terra  │  │ Sage   │  │ Clay   │  │ Stone  │      │
│  │ Cotta  │  │ Moss   │  │ Brown  │  │ Gray   │      │
│  └────────┘  └────────┘  └────────┘  └────────┘      │
│                                                         │
│  IMAGEM DE CAPA (OPCIONAL)                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │                    ⬆                               │ │
│  │          Upload de Imagem                          │ │
│  │    Funcionalidade em desenvolvimento               │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐                       ┌─────────────────┐│
│  │ ← Voltar │                       │  Próximo    ➤  ││
│  └──────────┘                       └─────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Step 3: Archetype-Specific Settings

### Habitat Settings

```
┌─────────────────────────────────────────────────────────┐
│  🏠  Novo Espaço de Conexão                        ✕   │
│      Habitat                                            │
├─────────────────────────────────────────────────────────┤
│  ████████████████████░░░░░░░░░░░░░░░░░░ 75%           │
│  Arquétipo   Informações   Configuração   Membros      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Configurações Específicas                              │
│  Personalize as configurações para Habitat              │
│                                                         │
│  TIPO DE PROPRIEDADE                                    │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Selecione...                               ▼      │ │
│  └───────────────────────────────────────────────────┘ │
│    • Apartamento                                        │
│    • Casa                                               │
│    • Condomínio                                         │
│    • Quarto                                             │
│                                                         │
│  ENDEREÇO                                               │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Rua, número, bairro, cidade                       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  MOEDA PADRÃO                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ BRL - Real Brasileiro                      ▼      │ │
│  └───────────────────────────────────────────────────┘ │
│    • BRL - Real Brasileiro                              │
│    • USD - Dólar Americano                              │
│    • EUR - Euro                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐                       ┌─────────────────┐│
│  │ ← Voltar │                       │  Próximo    ➤  ││
│  └──────────┘                       └─────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Ventures Settings

```
│  Configurações Específicas                              │
│  Personalize as configurações para Ventures             │
│                                                         │
│  TIPO DE NEGÓCIO                                        │
│  ┌─────────────────────────────────────────────┐       │
│  │ Selecione...                         ▼      │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  DATA DE FUNDAÇÃO                                       │
│  ┌─────────────────────────────────────────────┐       │
│  │ [📅 Date Picker]                            │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  ALERTA DE RUNWAY (MESES)                               │
│  ┌─────────────────────────────────────────────┐       │
│  │ 6                                           │       │
│  └─────────────────────────────────────────────┘       │
```

### Academia Settings

```
│  Configurações Específicas                              │
│  Personalize as configurações para Academia             │
│                                                         │
│  ÁREAS DE FOCO                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ Ex: Inteligência Artificial, ML    [Enter] │       │
│  └─────────────────────────────────────────────┘       │
│  ┌─────────────────┐  ┌──────────────────┐            │
│  │ AI & Machine    │  │ Data Science     │            │
│  │ Learning        │  │                  │            │
│  └─────────────────┘  └──────────────────┘            │
│                                                         │
│  HORAS DE ESTUDO/SEMANA                                 │
│  ┌─────────────────────────────────────────────┐       │
│  │ 10                                          │       │
│  └─────────────────────────────────────────────┘       │
```

### Tribo Settings

```
│  Configurações Específicas                              │
│  Personalize as configurações para Tribo                │
│                                                         │
│  TIPO DE GRUPO                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ Selecione...                         ▼      │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  FREQUÊNCIA DE ENCONTROS                                │
│  ┌─────────────────────────────────────────────┐       │
│  │ Selecione...                         ▼      │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  LOCAL PADRÃO DE ENCONTRO                               │
│  ┌─────────────────────────────────────────────┐       │
│  │ Ex: Parque da Cidade                        │       │
│  └─────────────────────────────────────────────┘       │
```

---

## Step 4: Invite Members

```
┌─────────────────────────────────────────────────────────┐
│  🏠  Novo Espaço de Conexão                        ✕   │
│      Habitat                                            │
├─────────────────────────────────────────────────────────┤
│  ████████████████████████████████████████ 100%         │
│  Arquétipo   Informações   Configuração   Membros      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Convidar Membros                                       │
│  Adicione pessoas ao seu espaço (você pode pular esta   │
│  etapa)                                                 │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  EMAIL                        PAPEL                │ │
│  │  ┌──────────────────────┐  ┌──────────────────┐   │ │
│  │  │ nome@exemplo.com     │  │ Membro      ▼   │   │ │
│  │  └──────────────────────┘  └──────────────────┘   │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │        👤  Adicionar Convite                 │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  3 Convites                                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ╔════╗  ana@example.com                       ✕  │ │
│  │  ║ ✉  ║  Member                                   │ │
│  │  ╚════╝                                            │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ╔════╗  carlos@example.com                    ✕  │ │
│  │  ║ ✉  ║  Admin                                    │ │
│  │  ╚════╝                                            │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ╔════╗  maria@example.com                     ✕  │ │
│  │  ║ ✉  ║  Member                                   │ │
│  │  ╚════╝                                            │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐                       ┌─────────────────┐│
│  │ ← Voltar │                       │ ✓ Criar Espaço ││
│  └──────────┘                       └─────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Empty State (No Invites)

```
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │                     👤                             │ │
│  │                                                    │ │
│  │         Nenhum convite adicionado ainda            │ │
│  │         Você pode adicionar membros depois         │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
```

---

## Mobile View

```
┌─────────────────────┐
│  🏠  Novo Espaço ✕ │
│      Habitat        │
├─────────────────────┤
│ ████░░░░░░░░ 25%   │
│ Arquétipo          │
├─────────────────────┤
│                     │
│  Escolha Arquétipo  │
│                     │
│  ┌───────────────┐  │
│  │  ╔═══╗        │  │
│  │  ║🏠 ║ Habitat│  │
│  │  ╚═══╝        │  │
│  │  O Âncora...  │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │  ╔═══╗        │  │
│  │  ║💼 ║ Venture│  │
│  │  ╚═══╝        │  │
│  │  O Motor...   │  │
│  └───────────────┘  │
│                     │
│     [scroll]        │
│                     │
├─────────────────────┤
│    ┌──────────────┐ │
│    │  Próximo  ➤ │ │
│    └──────────────┘ │
└─────────────────────┘
```

---

## Animations

### Step Transitions
```
Step 1 ──────→  Step 2
         Slide right
         Fade out/in

Step 2 ←────── Step 3
         Slide left
         Fade in/out
```

### Progress Bar
```
[████░░░░░░░░░░░░] 25%  →  [████████░░░░░░░░] 50%
     Smooth width animation (300ms)
```

### Archetype Selection
```
Before:                After:
┌─────────────┐       ┌─────────────┐
│  🏠 Habitat │  →    │  🏠 Habitat │
│             │       │          ✓  │ ← Checkmark scales in
└─────────────┘       └─────────────┘
                       Ring highlight appears
```

### Loading State
```
┌─────────────────┐
│  ⟳ Criando...  │  ← Spinner animates
└─────────────────┘
```

---

## Color Theme Selection

```
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│   ●    │  │   ●    │  │   ●    │  │   ●    │
│ #9B4D3A│  │ #6B7B5C│  │ #8B7355│  │ #8B8579│
│ Terra  │  │ Sage   │  │ Clay   │  │ Stone  │
│ Cotta  │  │ Moss   │  │ Brown  │  │ Gray   │
└────────┘  └────────┘  └────────┘  └────────┘
                ↑
            Selected (ring highlight)
```

---

## Interactive Elements

### Buttons
```
Default:      Hover:        Active:       Disabled:
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Próximo │  │ Próximo │  │ Próximo │  │ Próximo │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
             Scale 1.05    Scale 0.95   Opacity 50%
```

### Input Focus
```
Normal:                      Focused:
┌────────────────────────┐  ┌────────────────────────┐
│ Nome do espaço         │  │ Nome do espaço▊        │
└────────────────────────┘  └────────────────────────┘
                            Ring: ceramic-accent
```

---

## Success Flow

```
User Flow:
1. Click "Create Space" button
   ↓
2. Modal opens → Step 1
   ↓
3. Select archetype → Next
   ↓
4. Fill basic info → Next
   ↓
5. Configure settings (optional) → Next
   ↓
6. Add invites (optional) → Create
   ↓
7. Loading state shows
   ↓
8. Success → Modal closes
   ↓
9. Redirect to new space
```

---

## Keyboard Navigation

```
Tab Order:
1. Close button (✕)
2. Archetype cards / Form inputs (step dependent)
3. Back button (if not step 1)
4. Next/Create button

Enter Key:
- Submit current step
- Add invite (in invite input)
- Add focus tag (in academia settings)

Escape Key:
- Close modal
```

---

## Responsive Breakpoints

```
Mobile (<768px):
- Single column layout
- Full-width inputs
- Stacked navigation
- Touch-optimized buttons (44px min)

Tablet (768px-1024px):
- 2-column archetype grid
- Wider inputs
- Side-by-side buttons

Desktop (>1024px):
- 2-column archetype grid
- Optimal input widths
- Spacious layout
```

---

**This visual guide demonstrates the complete user journey through the CreateConnectionModal component.**
