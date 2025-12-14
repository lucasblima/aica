# Redesign do Modulo "Meu Dia" (AgendaView)

## Contexto

Este plano de implementacao segue a critica de design baseada no **Ceramic Design System** para transformar o modulo "Meu Dia" em uma experiencia mais minimalista, material e fluida.

**Arquivos Principais:**
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\views\AgendaView.tsx` - View principal
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\CalendarSyncIndicator.tsx` - Widget de sincronizacao
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\NextTwoDaysView.tsx` - View dos proximos dias
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\NextEventHero.tsx` - Hero do proximo evento
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\src\components\AgendaTimeline.tsx` - Timeline de eventos
- `C:\Users\lucas\repos\Aica_frontend\Aica_frontend\index.css` - Estilos do Ceramic Design System

---

## 1. A REDUCAO (Simplificacao)

**Objetivo:** Eliminar ruido visual e elementos redundantes.

**Delegar para:** `general-purpose` (Frontend Core)

### 1.1 Assassinato do Widget de Calendar

**Arquivo:** `CalendarSyncIndicator.tsx`

- [ ] **1.1.1** Criar novo componente `CalendarStatusDot.tsx`
  - Ponto de 8px no header
  - Invisivel se conexao OK
  - Ambar pulsante se sincronizando
  - Vermelho se desconectado/erro
  - Tooltip on hover com opcoes (conectar/reconectar)

```tsx
// CalendarStatusDot.tsx - Estrutura proposta
interface CalendarStatusDotProps {
  isConnected: boolean;
  isSyncing: boolean;
  hasError: boolean;
  onConnect: () => void;
}

// Estados visuais:
// - OK: opacity-0 (invisivel)
// - Syncing: bg-amber-500 animate-pulse
// - Error: bg-red-500
```

- [ ] **1.1.2** Editar `AgendaView.tsx` (linha 618-625)
  - Remover `<CalendarSyncIndicator />` do header
  - Substituir por `<CalendarStatusDot />`
  - Mover logica completa de conexao para Settings

**Codigo atual a remover:**
```tsx
// AgendaView.tsx linhas 617-626
<div className="flex items-center gap-2">
    <CalendarSyncIndicator
        isConnected={isCalendarConnected}
        isSyncing={isLoadingCalendar}
        lastSyncTime={lastSyncTime ? `ha ${Math.round((Date.now() - new Date(lastSyncTime).getTime()) / 60000)}min` : undefined}
        onConnect={handleConnectCalendar}
        onSync={syncCalendar}
        onDisconnect={handleDisconnectCalendar}
    />
</div>
```

### 1.2 Remover Pilulas de Categoria

**Arquivo:** `NextTwoDaysView.tsx`

- [ ] **1.2.1** Remover span de categoria (linhas 157-160)

**Codigo a remover:**
```tsx
<span className={`px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(event.category)}`}>
    {event.category}
</span>
```

- [ ] **1.2.2** Remover funcao `getCategoryColor()` (linhas 111-126)

- [ ] **1.2.3** Avaliar se `detectEventCategory()` ainda e necessario
  - Se usado apenas para pilulas, remover
  - Se usado para logica interna, manter

### 1.3 Estado Vazio Refinado

**Arquivos:** `NextTwoDaysView.tsx`, `NextEventHero.tsx`

- [ ] **1.3.1** NextTwoDaysView - Estado vazio (linhas 237-242)

**De:**
```tsx
<div className="ceramic-tray p-4 rounded-2xl text-center">
    <p className="text-xs text-ceramic-text-tertiary italic">
        Nenhum evento agendado
    </p>
</div>
```

**Para:**
```tsx
<p className="text-sm text-ceramic-text-secondary/60 text-etched py-4 ml-2">
    Livre
</p>
```

- [ ] **1.3.2** NextEventHero - Estado vazio (linhas 61-77)

**De:**
```tsx
<motion.div className="ceramic-tray p-8 rounded-[32px] text-center">
    <div className="ceramic-concave w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <Calendar className="w-8 h-8 text-ceramic-text-secondary/50" />
    </div>
    <p className="text-lg font-bold text-ceramic-text-primary mb-1">
        Agenda livre
    </p>
    <p className="text-sm text-ceramic-text-secondary">
        Nenhum compromisso nas proximas horas
    </p>
</motion.div>
```

**Para:**
```tsx
<div className="py-8">
    <p className="text-lg text-ceramic-text-secondary/50 text-etched">
        Livre
    </p>
</div>
```

---

## 2. A MATERIALIDADE (Estetica)

**Objetivo:** Criar sensacao de peso e solidez - azulejos pesados, nao cards fofos.

**Delegar para:** `general-purpose` (Frontend Core) + Design Review

### 2.1 Tensao nos Cards - Classe ceramic-tile

**Arquivo:** `index.css`

- [ ] **2.1.1** Criar nova classe CSS `ceramic-tile`

```css
/* Adicionar ao index.css */
.ceramic-tile {
  background-color: #F0EFE9;
  border-radius: 12px; /* Mais angular que 24px do ceramic-card */
  box-shadow:
    4px 4px 8px rgba(163, 158, 145, 0.25),  /* Sombra mais forte */
    -4px -4px 8px rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(163, 158, 145, 0.08); /* Borda sutil para definicao */
}

.ceramic-tile:hover {
  box-shadow:
    5px 5px 10px rgba(163, 158, 145, 0.28),
    -5px -5px 10px rgba(255, 255, 255, 0.98);
}
```

### 2.2 Estrutura de Bandeja (Tray Principle)

**Arquivo:** `NextTwoDaysView.tsx`

- [ ] **2.2.1** Cada secao de dia como bandeja (renderDaySection, linhas 213-245)

**De:**
```tsx
<div className="mb-8">
    <div className="flex items-center gap-3 mb-4">
        <h3 className={`text-2xl font-black ${...}`}>
            {dayLabel}
        </h3>
        ...
    </div>
    ...
</div>
```

**Para:**
```tsx
<div className="ceramic-tray p-6 mb-6">
    {/* Titulo "gravado" na borda superior da bandeja */}
    <h3 className={`text-xs font-bold uppercase tracking-widest text-etched mb-4 -mt-1 ${
        isToday ? 'text-ceramic-accent' : 'text-ceramic-text-secondary'
    }`}>
        {dayLabel}
    </h3>

    {dayEvents.length > 0 ? (
        <div className="space-y-3">
            {dayEvents.map(renderEventCard)}
        </div>
    ) : (
        <p className="text-sm text-ceramic-text-secondary/50 text-etched py-2">
            Livre
        </p>
    )}
</div>
```

### 2.3 Cards de Evento Refinados

**Arquivo:** `NextTwoDaysView.tsx` (renderEventCard, linhas 128-210)

- [ ] **2.3.1** Aplicar ceramic-tile em vez de ceramic-card
- [ ] **2.3.2** Reestruturar hierarquia: Horario (bold, esquerda) | Titulo (direita)

**De:**
```tsx
<motion.div className={`ceramic-card p-6 rounded-3xl relative overflow-hidden ${...}`}>
    ...
    <h4 className="text-xl font-black text-ceramic-text-primary mb-2">
        {event.title}
    </h4>
    <div className="flex items-center gap-3 mb-3">
        <span className="...">{event.category}</span>
        <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatTime(event.startTime)}</span>
        </div>
    </div>
    ...
</motion.div>
```

**Para:**
```tsx
<motion.div className={`ceramic-tile p-4 ${event.skipped ? 'opacity-50' : ''}`}>
    <div className="flex items-baseline gap-4">
        {/* Horario - Destaque principal */}
        <span className="text-lg font-black text-ceramic-text-primary text-etched flex-shrink-0">
            {formatTime(event.startTime)}
        </span>

        {/* Titulo */}
        <h4 className={`text-base font-medium text-ceramic-text-primary flex-1 ${
            event.skipped ? 'line-through' : ''
        }`}>
            {event.title}
        </h4>
    </div>

    {/* Metadados secundarios */}
    {event.location && (
        <div className="flex items-center gap-1.5 mt-2 ml-[calc(theme(spacing.4)+theme(fontSize.lg))]">
            <MapPin className="w-3 h-3 text-ceramic-text-secondary/60" />
            <span className="text-xs text-ceramic-text-secondary truncate">
                {event.location}
            </span>
        </div>
    )}
</motion.div>
```

### 2.4 Navegacao Ancorada

**Arquivo:** Verificar se existe BottomNav no projeto

- [ ] **2.4.1** Localizar componente de navegacao inferior
- [ ] **2.4.2** Aplicar estilo "esculpido na base":

```css
.ceramic-bottom-nav {
  background-color: #F0EFE9;
  box-shadow:
    inset 0 4px 8px rgba(163, 158, 145, 0.25),
    0 -2px 4px rgba(255, 255, 255, 0.8);
  border-top: 1px solid rgba(163, 158, 145, 0.1);
}
```

---

## 3. A COREOGRAFIA (Movimento)

**Objetivo:** Sensacao de tempo fluindo, interacoes convidativas.

**Delegar para:** `general-purpose` (Frontend Core)

### 3.1 Fluidez Temporal

**Arquivo:** `NextTwoDaysView.tsx`

- [ ] **3.1.1** Adicionar stagger animation mais pronunciado entre secoes

```tsx
// Adicionar ao componente NextTwoDaysView
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  })
};

// Uso nas secoes
<motion.div
  custom={0}
  variants={sectionVariants}
  initial="hidden"
  animate="visible"
>
  {renderDaySection('Hoje', todayEvents, true)}
</motion.div>
```

- [ ] **3.1.2** Opacidade decrescente: Hoje 100%, Amanha 90%, Depois 80%

```tsx
// Adicionar opacity baseada no dia
const dayOpacity = isToday ? 'opacity-100' : isTomorrow ? 'opacity-95' : 'opacity-90';
```

### 3.2 Botao de Microfone Concavo

**Arquivo:** Verificar se existe MicButton ou similar

- [ ] **3.2.1** Localizar botao de microfone (se existir)
- [ ] **3.2.2** Aplicar ceramic-concave com hover scale

```tsx
<button className="ceramic-concave w-14 h-14 flex items-center justify-center
    hover:scale-105 active:scale-95 transition-transform">
    <Mic className="w-6 h-6 text-ceramic-text-secondary" />
</button>
```

---

## 4. A VOZ (Microcopy)

**Objetivo:** Linguagem humana, nao tecnesca.

**Delegar para:** `general-purpose` (Frontend Core)

### 4.1 Substituicoes de Texto

| Local | De | Para |
|-------|-----|------|
| NextTwoDaysView (vazio) | "Nenhum evento agendado" | "Livre" |
| NextEventHero (vazio) | "Agenda livre / Nenhum compromisso..." | "Livre" |
| CalendarSyncIndicator | "Ultima sincronizacao: ha Xmin" | *Remover* |
| CalendarSyncIndicator | "Conectar Agenda" | "Sincronizar" |
| CalendarSyncIndicator | "Sincronizando..." | *Apenas animacao* |

- [ ] **4.1.1** Editar NextTwoDaysView.tsx (linha 239-240)
- [ ] **4.1.2** Editar NextEventHero.tsx (linhas 70-75)
- [ ] **4.1.3** Editar CalendarSyncIndicator.tsx (linhas 83-87) - Remover lastSyncTime display

---

## 5. INTEGRACAO E TESTES

**Delegar para:** `testing-qa`

### 5.1 Verificacao Visual

- [ ] **5.1.1** Testar estado: Nenhum evento (deve mostrar "Livre" etched)
- [ ] **5.1.2** Testar estado: Com eventos hoje/amanha
- [ ] **5.1.3** Testar estado: Calendario sincronizando (ponto ambar)
- [ ] **5.1.4** Testar estado: Calendario desconectado (ponto vermelho)
- [ ] **5.1.5** Testar estado: Evento skipped

### 5.2 Consistencia do Design System

- [ ] **5.2.1** Verificar que ceramic-tile nao conflita com ceramic-card
- [ ] **5.2.2** Verificar que bandejas (tray) funcionam em mobile
- [ ] **5.2.3** Verificar contraste de texto etched em diferentes telas

### 5.3 Responsividade

- [ ] **5.3.1** Testar em viewport 375px (mobile)
- [ ] **5.3.2** Testar em viewport 768px (tablet)
- [ ] **5.3.3** Testar em viewport 1280px (desktop)

---

## Dependencias e Ordem de Execucao

```
1. CSS (ceramic-tile, ceramic-bottom-nav)
   |
   v
2. CalendarStatusDot (novo componente)
   |
   v
3. Reducao em NextTwoDaysView (pilulas, estado vazio)
   |
   v
4. Materialidade em NextTwoDaysView (bandeja, cards refinados)
   |
   v
5. Reducao em NextEventHero (estado vazio)
   |
   v
6. Atualizacao AgendaView (substituir CalendarSyncIndicator)
   |
   v
7. Coreografia (animacoes stagger)
   |
   v
8. Testes visuais e responsividade
```

---

## Arquivos a Criar

1. `src/components/CalendarStatusDot.tsx` - Novo componente minimalista

## Arquivos a Modificar

1. `index.css` - Adicionar ceramic-tile, ceramic-bottom-nav
2. `src/views/AgendaView.tsx` - Substituir CalendarSyncIndicator
3. `src/components/NextTwoDaysView.tsx` - Maior refatoracao
4. `src/components/NextEventHero.tsx` - Estado vazio simplificado
5. `src/components/CalendarSyncIndicator.tsx` - Remover lastSyncTime (ou deprecar)

## Arquivos que Podem ser Removidos (apos migracao)

1. `src/components/CalendarSyncIndicator.tsx` - Se totalmente substituido

---

## Notas para Implementacao

### Sobre o Ceramic Design System

O projeto ja possui classes CSS bem definidas em `index.css`:
- `ceramic-card` - Elevacao padrao (24px radius)
- `ceramic-inset` - Baixo relevo pill
- `ceramic-tray` - Baixo relevo retangular (32px radius)
- `ceramic-concave` - Botoes circulares concavos
- `ceramic-groove` - Canal fresado
- `text-etched` - Texto com sombra branca (gravado)

### Cores do Tailwind Config

```js
'ceramic-base': '#F0EFE9',
'ceramic-text-primary': '#5C554B',
'ceramic-text-secondary': '#948D82',
'ceramic-accent': '#D97706', // Glazed Amber
```

### Padroes de Animacao (Framer Motion)

O projeto usa Framer Motion extensivamente. Manter consistencia com:
- `initial={{ opacity: 0, y: 10 }}`
- `animate={{ opacity: 1, y: 0 }}`
- Transicoes suaves com `type: "spring"`
