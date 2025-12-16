# Plano de Implementacao: Journey Ceramic Redesign

> **Data**: 2025-12-16
> **Arquiteto**: Master Architect Agent
> **Duracao Estimada**: 5-7 dias
> **Objetivo**: Alinhar a view "Minha Jornada" ao sistema de design Digital Ceramic

---

## Sumario Executivo

Este documento detalha a transformacao visual da view "Minha Jornada" para alinhar ao sistema de design Digital Ceramic existente. O objetivo principal e eliminar a ruptura visual causada pelos gradientes roxos/azuis e integrar componentes existentes de forma elegante.

**Problemas Identificados:**
1. Gradiente roxo/azul no cabecalho (deve ser Creme #F0EFE9)
2. Navegacao perdida ao entrar na view fullscreen
3. Microfone (feature principal) subvalorizado visualmente
4. Botao "Deletar Conta" exposto demais (ja esta corretamente no ProfileModal)
5. LifeWeeksGrid existente nao integrado na timeline

---

## Analise do Estado Atual

### Arquivos Afetados e Problemas

| Arquivo | Problema | Acao |
|---------|----------|------|
| `src/modules/journey/views/JourneyFullScreen.tsx` | Gradiente roxo linha 156, azul nos botoes | Aplicar classes ceramic |
| `src/modules/journey/views/JourneyCardCollapsed.tsx` | Gradiente azul/roxo, estilo flat | Aplicar ceramic-card |
| `src/modules/journey/components/timeline/MomentCard.tsx` | Cards brancos flat com shadow | Converter para ceramic-tile |
| `src/modules/journey/components/insights/DailyQuestionCard.tsx` | Verificar estilos | Aplicar ceramic-inset no botao |
| `src/modules/journey/components/capture/AudioRecorder.tsx` | Botao vermelho generico | Criar MicrophoneFAB ceramic |
| `src/components/LifeWeeksGrid.tsx` | Componente isolado | Integrar como "textura" na timeline |

### Classes Ceramic Disponiveis (em `index.css`)

```css
/* Backgrounds e Cards */
.ceramic-card          /* Cards elevados com sombras Taupe */
.ceramic-tile          /* Cards menores com bordas mais angulares */
.ceramic-passport      /* Hero card com borda amber */

/* Insets e Trays */
.ceramic-inset         /* Pill shape - para botoes, inputs */
.ceramic-tray          /* Retangular - para grids e listas */
.ceramic-concave       /* Circular profundo - para o FAB do microfone */

/* Progresso e Grooves */
.ceramic-progress-groove  /* Barra de progresso inset */
.ceramic-progress-fill    /* Fill com gradiente amber */
.ceramic-life-track       /* Track para LifeWeeks */

/* Estados */
.ceramic-elevated      /* Hover/selected state */
.ceramic-pressed       /* Active state */

/* Tipografia */
.text-etched           /* Texto com sombra branca (gravado) */
.ceramic-stat-counter  /* Numeros grandes */
.ceramic-stat-label    /* Labels pequenas uppercase */
```

### Cores do Sistema

```css
--ceramic-bg: #F0EFE9          /* Creme - Background principal */
--ceramic-text-primary: #5C554B /* Chumbo - Texto principal */
--ceramic-text-secondary: #948D82 /* Taupe - Texto secundario */
--ceramic-accent: #D97706       /* Amber - Acentos e CTAs */
--ceramic-accent-dark: #B45309  /* Amber escuro - Botoes primarios */
```

---

## Arquitetura da Solucao

### Componentes a Criar

```
src/modules/journey/components/
  ceramic/
    JourneyCeramicHeader.tsx     # Header com titulo etched
    MicrophoneFAB.tsx            # FAB circular ceramic-concave
    LifeWeeksStrip.tsx           # Strip horizontal com semanas
    CeramicMomentCard.tsx        # MomentCard redesenhado
    CeramicTimelineTabs.tsx      # Tabs ceramic-inset
```

### Componentes a Modificar

```
src/modules/journey/views/
  JourneyFullScreen.tsx          # Remover gradientes, aplicar ceramic
  JourneyCardCollapsed.tsx       # Aplicar ceramic-card

src/modules/journey/components/
  timeline/MomentCard.tsx        # Opcional: ou usar novo CeramicMomentCard
  insights/DailyQuestionCard.tsx # Botao ceramic-inset
```

---

## Fase 1: Cirurgia Estetica - Fim do Roxo (Dia 1)

### 1.1 JourneyFullScreen.tsx - Remover Gradientes

**Delegacao**: General-purpose Agent (Frontend)

**Alteracoes:**

```typescript
// ANTES (linha 154-156)
<div className="min-h-screen bg-gray-50">
  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">

// DEPOIS
<div className="min-h-screen bg-[#F0EFE9]">
  <div className="bg-[#F0EFE9] p-6">
```

**Header Redesenhado:**
```tsx
{/* Header Ceramic */}
<div className="bg-[#F0EFE9] border-b border-[#948D82]/10 p-6">
  <div className="max-w-7xl mx-auto">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
          <SparklesIcon className="h-5 w-5 text-[#D97706]" />
        </div>
        <h1 className="text-2xl font-bold text-etched text-[#5C554B]">
          Minha Jornada
        </h1>
      </div>
      {/* Settings gear icon */}
      <button className="ceramic-inset px-3 py-2 hover:bg-white/50 transition-colors">
        <Cog6ToothIcon className="h-5 w-5 text-[#948D82]" />
      </button>
    </div>
  </div>
</div>
```

### 1.2 JourneyCardCollapsed.tsx - Aplicar Ceramic

**Delegacao**: General-purpose Agent (Frontend)

**Alteracoes:**

```typescript
// ANTES (linha 35)
<div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all group">

// DEPOIS
<div
  onClick={onClick}
  className="ceramic-card p-6 cursor-pointer hover:ceramic-elevated transition-all group"
>
```

**Icone e Titulo:**
```tsx
// ANTES
<SparklesIcon className="h-6 w-6 text-blue-500" />

// DEPOIS
<div className="ceramic-concave w-8 h-8 flex items-center justify-center">
  <SparklesIcon className="h-4 w-4 text-[#D97706]" />
</div>
<h3 className="text-xl font-bold text-etched text-[#5C554B]">Minha Jornada</h3>
```

### 1.3 Tabs da Timeline

**Delegacao**: General-purpose Agent (Frontend)

```tsx
// ANTES (linhas 229-265)
<div className="flex gap-2 border-b border-gray-200">
  <button className={`... text-blue-600 border-b-2 border-blue-600 ...`}>

// DEPOIS
<div className="flex gap-2 ceramic-tray p-2">
  <button
    onClick={() => setActiveTab('timeline')}
    className={`
      flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all
      ${activeTab === 'timeline'
        ? 'ceramic-card text-[#5C554B]'
        : 'text-[#948D82] hover:bg-white/50'}
    `}
  >
```

---

## Fase 2: Microfone como Protagonista (Dia 2)

### 2.1 Criar MicrophoneFAB.tsx

**Delegacao**: General-purpose Agent (Frontend)

**Arquivo**: `src/modules/journey/components/ceramic/MicrophoneFAB.tsx`

```tsx
/**
 * MicrophoneFAB Component
 * Floating Action Button for voice capture - The primary interaction point
 *
 * Design: ceramic-concave when inactive, amber glow when active
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid'

interface MicrophoneFABProps {
  isRecording: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}

export function MicrophoneFAB({
  isRecording,
  onToggle,
  disabled = false,
  className = '',
}: MicrophoneFABProps) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      className={`
        fixed bottom-6 right-6 z-50
        w-16 h-16 rounded-full
        flex items-center justify-center
        transition-all duration-300
        ${isRecording
          ? 'bg-[#D97706] shadow-[0_0_20px_rgba(217,119,6,0.5)]'
          : 'ceramic-concave hover:shadow-[0_0_12px_rgba(217,119,6,0.2)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={!disabled && !isRecording ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      animate={isRecording ? {
        boxShadow: [
          '0 0 20px rgba(217,119,6,0.5)',
          '0 0 30px rgba(217,119,6,0.7)',
          '0 0 20px rgba(217,119,6,0.5)',
        ]
      } : {}}
      transition={isRecording ? {
        boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
      } : {}}
      aria-label={isRecording ? 'Parar gravacao' : 'Iniciar gravacao de voz'}
    >
      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div
            key="stop"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <StopIcon className="h-8 w-8 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="mic"
            initial={{ scale: 0, rotate: 90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -90 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <MicrophoneIcon className="h-8 w-8 text-[#5C554B]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export default MicrophoneFAB
```

### 2.2 Integrar MicrophoneFAB no JourneyFullScreen

**Delegacao**: General-purpose Agent (Frontend)

```tsx
// Adicionar no final do componente, antes do ultimo </div>
<MicrophoneFAB
  isRecording={isRecording}
  onToggle={() => {
    if (isRecording) {
      // Stop and save
    } else {
      setShowCapture(true)
      // Start recording
    }
  }}
/>
```

---

## Fase 3: LifeWeeksGrid Integration (Dia 3)

### 3.1 Criar LifeWeeksStrip.tsx

**Delegacao**: General-purpose Agent (Frontend)

**Arquivo**: `src/modules/journey/components/ceramic/LifeWeeksStrip.tsx`

```tsx
/**
 * LifeWeeksStrip Component
 * Horizontal strip showing life weeks as perforations in a ceramic tray
 *
 * - Current week: Amber filled
 * - Past weeks: Darker dots (Lead color)
 * - Future weeks: Empty perforations
 */

import React, { useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LifeWeeksStripProps {
  birthDate: string | null
  totalWeeks?: number
  visibleRange?: number // How many weeks to show around current
  className?: string
}

const LIFE_EXPECTANCY_YEARS = 73.1
const DEFAULT_VISIBLE_RANGE = 52 // Show 1 year around current week

export function LifeWeeksStrip({
  birthDate,
  totalWeeks = Math.ceil(LIFE_EXPECTANCY_YEARS * 52.1429),
  visibleRange = DEFAULT_VISIBLE_RANGE,
  className = '',
}: LifeWeeksStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentWeek = useMemo(() => {
    if (!birthDate) return 0

    const parts = birthDate.split('-')
    if (parts.length !== 3) return 0

    const birth = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    )
    const today = new Date()
    const diffTime = today.getTime() - birth.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
  }, [birthDate])

  // Auto-scroll to current week on mount
  useEffect(() => {
    if (scrollRef.current && currentWeek > 0) {
      const dotWidth = 12 // w-2 + gap
      const scrollPosition = (currentWeek - visibleRange / 2) * dotWidth
      scrollRef.current.scrollLeft = Math.max(0, scrollPosition)
    }
  }, [currentWeek, visibleRange])

  if (!birthDate) return null

  // Calculate visible weeks (centered around current)
  const startWeek = Math.max(0, currentWeek - visibleRange / 2)
  const endWeek = Math.min(totalWeeks, currentWeek + visibleRange / 2)
  const weeks = Array.from(
    { length: endWeek - startWeek },
    (_, i) => startWeek + i
  )

  return (
    <div className={`ceramic-tray p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#948D82] uppercase tracking-wider">
          Semana {currentWeek.toLocaleString()} de {totalWeeks.toLocaleString()}
        </span>
        <span className="text-xs text-[#948D82]">
          {Math.round((currentWeek / totalWeeks) * 100)}% vivido
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto pb-2 no-scrollbar"
      >
        {weeks.map((week) => {
          const isPast = week < currentWeek
          const isCurrent = week === currentWeek
          const isFuture = week > currentWeek

          return (
            <motion.div
              key={week}
              className={`
                flex-shrink-0 w-2 h-2 rounded-full transition-all
                ${isCurrent
                  ? 'bg-[#D97706] ring-2 ring-[#D97706]/30 scale-150'
                  : isPast
                    ? 'ceramic-inset-shallow'
                    : 'bg-[#F0EFE9] ring-1 ring-[#948D82]/20'}
              `}
              whileHover={{ scale: 1.5 }}
              title={`Semana ${week}`}
              initial={isCurrent ? { scale: 1 } : {}}
              animate={isCurrent ? { scale: [1.5, 1.8, 1.5] } : {}}
              transition={isCurrent ? {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              } : {}}
            />
          )
        })}
      </div>
    </div>
  )
}

export default LifeWeeksStrip
```

### 3.2 Integrar no JourneyFullScreen

**Delegacao**: General-purpose Agent (Frontend)

Adicionar o strip logo apos o header:

```tsx
{/* Life Weeks Strip */}
{user?.user_metadata?.birth_date && (
  <div className="max-w-7xl mx-auto px-6 -mt-2 mb-4">
    <LifeWeeksStrip
      birthDate={user.user_metadata.birth_date}
    />
  </div>
)}
```

---

## Fase 4: Timeline Redesign (Dia 4)

### 4.1 CeramicMomentCard.tsx

**Delegacao**: General-purpose Agent (Frontend)

**Arquivo**: `src/modules/journey/components/ceramic/CeramicMomentCard.tsx`

```tsx
/**
 * CeramicMomentCard Component
 * Moment display following Digital Ceramic design system
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moment } from '../../types/moment'
import { getSentimentColor } from '../../types/sentiment'
import {
  ClockIcon,
  SpeakerWaveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CeramicMomentCardProps {
  moment: Moment
  onDelete?: (momentId: string) => void
}

export function CeramicMomentCard({ moment, onDelete }: CeramicMomentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sentimentColor = moment.sentiment_data
    ? getSentimentColor(moment.sentiment_data.sentiment)
    : '#948D82'

  const createdAt = new Date(moment.created_at)
  const relativeTime = formatDistanceToNow(createdAt, {
    addSuffix: true,
    locale: ptBR,
  })
  const absoluteTime = format(createdAt, "EEEE, d 'de' MMMM", {
    locale: ptBR,
  })
  const timeOnly = format(createdAt, "HH:mm", { locale: ptBR })

  return (
    <motion.div
      className="ceramic-tile p-4 transition-all"
      style={{ borderLeft: `4px solid ${sentimentColor}` }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      layout
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          {/* Emotion + Time */}
          <div className="flex items-center gap-2 mb-1">
            {moment.emotion && (
              <span className="text-2xl">{moment.emotion}</span>
            )}
            <div className="flex items-center gap-1 text-sm text-[#948D82]">
              <ClockIcon className="h-4 w-4" />
              <span className="capitalize">{relativeTime}</span>
            </div>
          </div>

          {/* Date - Large Bold */}
          <p className="text-lg font-bold text-etched text-[#5C554B] capitalize">
            {absoluteTime}
          </p>
          <p className="text-xs text-[#948D82]">{timeOnly}</p>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ceramic-inset p-2 hover:bg-white/50 transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-[#948D82]" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-[#948D82]" />
          )}
        </button>
      </div>

      {/* Content preview */}
      <div className="mb-3">
        {moment.type === 'audio' && moment.audio_url && !isExpanded && (
          <div className="flex items-center gap-2 text-[#948D82]">
            <SpeakerWaveIcon className="h-5 w-5" />
            <span className="text-sm">Audio gravado</span>
          </div>
        )}

        {moment.content && (
          <p className="text-[#5C554B] leading-relaxed">
            {isExpanded
              ? moment.content
              : moment.content.length > 150
              ? moment.content.substring(0, 150) + '...'
              : moment.content}
          </p>
        )}
      </div>

      {/* Tags */}
      {moment.tags && moment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {moment.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-1 ceramic-inset text-[#948D82] text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[#948D82]/10 pt-4 space-y-3"
          >
            {/* Audio player */}
            {moment.audio_url && (
              <div>
                <p className="text-sm font-medium text-[#5C554B] mb-2">Audio:</p>
                <audio controls className="w-full">
                  <source src={moment.audio_url} type="audio/webm" />
                  Seu navegador nao suporta reproducao de audio.
                </audio>
              </div>
            )}

            {/* Sentiment analysis */}
            {moment.sentiment_data && (
              <div className="ceramic-tray p-3">
                <p className="text-sm font-bold text-[#5C554B] mb-2">
                  Analise de Sentimento
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[#948D82]">Sentimento:</span>
                    <span
                      className="ml-2 px-2 py-0.5 rounded text-white text-xs"
                      style={{ backgroundColor: sentimentColor }}
                    >
                      {moment.sentiment_data.sentiment}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#948D82]">Energia:</span>
                    <span className="ml-2 font-medium text-[#5C554B]">
                      {moment.sentiment_data.energyLevel}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Delete action */}
            {onDelete && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja deletar este momento?')) {
                      onDelete(moment.id)
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Deletar momento
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default CeramicMomentCard
```

### 4.2 Daily Question Card - Botao Ceramic

**Delegacao**: General-purpose Agent (Frontend)

No arquivo `DailyQuestionCard.tsx`, alterar o botao "Responder":

```tsx
// ANTES
<button className="px-6 py-3 bg-blue-500 text-white rounded-lg ...">

// DEPOIS
<button className="ceramic-btn-primary">
  Responder
</button>
```

---

## Fase 5: Settings Modal Integration (Dia 5)

### 5.1 Verificar ProfileModal Atual

O ProfileModal ja esta bem implementado em `src/components/ProfileModal/ProfileModal.tsx`:
- Usa classes `ceramic-card`, `ceramic-stats-tray`, `ceramic-avatar-recessed`
- DangerZone ja esta contido dentro dele com confirmacao dupla
- Nao e necessario mover o DangerZone

### 5.2 Adicionar Gear Icon no Header

**Delegacao**: General-purpose Agent (Frontend)

No JourneyFullScreen, adicionar botao de settings:

```tsx
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

// No header
<button
  onClick={onOpenSettings}
  className="ceramic-inset p-2 hover:bg-white/50 transition-colors"
  aria-label="Configuracoes"
>
  <Cog6ToothIcon className="h-5 w-5 text-[#948D82]" />
</button>
```

---

## Matriz de Delegacao

| Tarefa | Agente | Prioridade | Dependencias |
|--------|--------|------------|--------------|
| JourneyFullScreen - Remover gradientes | general-purpose (Frontend) | Alta | Nenhuma |
| JourneyCardCollapsed - Aplicar ceramic | general-purpose (Frontend) | Alta | Nenhuma |
| MicrophoneFAB.tsx - Criar componente | general-purpose (Frontend) | Alta | Nenhuma |
| LifeWeeksStrip.tsx - Criar componente | general-purpose (Frontend) | Media | Nenhuma |
| CeramicMomentCard.tsx - Criar componente | general-purpose (Frontend) | Media | Nenhuma |
| Tabs ceramic - Redesenhar | general-purpose (Frontend) | Media | Fase 1 |
| DailyQuestionCard - Botao ceramic | general-purpose (Frontend) | Baixa | Fase 1 |
| Testes E2E responsivos | testing-qa | Media | Todas as fases |

---

## Ordem de Execucao

```
Fase 1: Cirurgia Estetica (Dia 1)
  |
  +-- 1.1 JourneyFullScreen.tsx - Remover gradientes
  |
  +-- 1.2 JourneyCardCollapsed.tsx - Aplicar ceramic-card
  |
  +-- 1.3 Tabs da Timeline - ceramic-tray
  |
  v
Fase 2: Microfone FAB (Dia 2)
  |
  +-- 2.1 Criar MicrophoneFAB.tsx
  |
  +-- 2.2 Integrar no JourneyFullScreen
  |
  v
Fase 3: LifeWeeks Integration (Dia 3)
  |
  +-- 3.1 Criar LifeWeeksStrip.tsx
  |
  +-- 3.2 Integrar no JourneyFullScreen
  |
  v
Fase 4: Timeline Redesign (Dia 4)
  |
  +-- 4.1 Criar CeramicMomentCard.tsx
  |
  +-- 4.2 DailyQuestionCard - Botao ceramic
  |
  v
Fase 5: Polish e Testes (Dia 5-7)
  |
  +-- 5.1 Settings gear icon
  |
  +-- 5.2 Testes E2E responsivos
  |
  +-- 5.3 Revisao final de consistencia
```

---

## Checklist de Verificacao Visual

### Header
- [ ] Background e Creme (#F0EFE9)
- [ ] Titulo em texto etched, cor Chumbo (#5C554B)
- [ ] Icone em ceramic-concave com Amber
- [ ] Sem gradientes roxos/azuis

### Microfone FAB
- [ ] Posicao: bottom-6 right-6
- [ ] Tamanho: w-16 h-16
- [ ] Inativo: ceramic-concave
- [ ] Ativo: brilho Amber pulsante

### LifeWeeks Strip
- [ ] ceramic-tray container
- [ ] Semana atual: Amber preenchido, pulsante
- [ ] Passadas: ceramic-inset-shallow
- [ ] Futuras: ring apenas

### Moment Cards
- [ ] ceramic-tile base
- [ ] Border-left colorida por sentimento
- [ ] Tags em ceramic-inset
- [ ] Botao expandir em ceramic-inset

### Tabs
- [ ] Container: ceramic-tray
- [ ] Ativa: ceramic-card
- [ ] Inativas: texto secundario apenas

---

## Arquivos Criados/Modificados (Resumo Final)

### Novos Arquivos
- `src/modules/journey/components/ceramic/MicrophoneFAB.tsx`
- `src/modules/journey/components/ceramic/LifeWeeksStrip.tsx`
- `src/modules/journey/components/ceramic/CeramicMomentCard.tsx`

### Arquivos Modificados
- `src/modules/journey/views/JourneyFullScreen.tsx`
- `src/modules/journey/views/JourneyCardCollapsed.tsx`
- `src/modules/journey/components/insights/DailyQuestionCard.tsx`

### Arquivos Nao Modificados (Ja Corretos)
- `src/components/ProfileModal/ProfileModal.tsx` - Ja usa ceramic
- `src/components/ProfileModal/DangerZone.tsx` - Ja esta dentro do modal
- `src/components/LifeWeeksGrid.tsx` - Mantem como esta (opcional usar em fullscreen)

---

## Notas Importantes

1. **Nao alterar ProfileModal**: O DangerZone ja esta corretamente encapsulado dentro do ProfileModal. Nao precisa ser movido.

2. **LifeWeeksGrid vs LifeWeeksStrip**: O LifeWeeksGrid existente e um componente completo com modal de planejamento. O LifeWeeksStrip proposto e uma versao simplificada para exibir na timeline como "textura". Ambos podem coexistir.

3. **MomentCard vs CeramicMomentCard**: O MomentCard existente pode ser gradualmente migrado ou substituido pelo CeramicMomentCard. A escolha depende se queremos manter retrocompatibilidade.

4. **Testes**: O projeto ja tem testes E2E para Dashboard Ceramic (`00e4e47`). Usar como referencia para testes da Journey.

---

**Criado**: 2025-12-16
**Autor**: Master Architect Agent
**Versao**: 1.0
