# JourneyMasterCard Component

## Overview

O `JourneyMasterCard` é um componente unificado que combina informações de Pontos de Consciência (CP) e progresso de Jornada em um único card "relógio suíço" de progresso do usuário.

Este componente substituiu a necessidade de ter dois componentes separados (`JourneyCardCollapsed` e `ConsciousnessScore`) que mostravam informações redundantes.

## Features

- **Nível Atual com Badge Visual**: Mostra o nível numerado com cor contextual
- **Nome do Nível**: Exibe nomes descritivos (Observador, Consciente, Reflexivo, etc.)
- **Barra de Progresso Animada**: Mostra visualmente o progresso até o próximo nível
- **Pontos de Consciência (CP)**: Exibe CP atual vs necessário para próximo nível
- **Próximo Marco**: Mostra qual será o próximo nível/milestone
- **Indicador de Notificação**: Pulsação âmbar quando há notificações pendentes
- **Estatísticas de Atividade**: Mostra número de momentos, perguntas respondidas e sequência
- **Animações Ceramic Design**: Usa animations do sistema de design ceramico
- **Estado de Carregamento**: Tratamento elegante de estados de loading
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

## Layout

```
+-----------------------------------------------+
|  [Badge Nível]   Nível 7 - Desperto           |
|                  2,450 / 3,000 CP             |
|  [===========================------] 82%      |
|                                               |
|  Próximo: "Guardião da Consciência"  [●]      |
|                                               |
|  🔥 7  │  42 Momentos  │  28 Perguntas        |
+-----------------------------------------------+
```

## Props

```typescript
interface JourneyMasterCardProps {
  // UUID do usuário (opcional - usa contexto de autenticação por padrão)
  userId?: string

  // Mostra indicador de notificação pulsante
  showNotification?: boolean

  // Callback quando o indicador de notificação é clicado
  onNotificationClick?: () => void

  // Classes CSS adicionais para customização
  className?: string
}
```

## Usage

### Basic Usage

```typescript
import { JourneyMasterCard } from '@/modules/journey'

export function Dashboard() {
  return (
    <JourneyMasterCard />
  )
}
```

### With Notification Handler

```typescript
import { JourneyMasterCard } from '@/modules/journey'
import { useState } from 'react'

export function Dashboard() {
  const [showNotif, setShowNotif] = useState(false)

  return (
    <JourneyMasterCard
      showNotification={showNotif}
      onNotificationClick={() => {
        console.log('Handle notification')
        setShowNotif(false)
      }}
    />
  )
}
```

### With Custom Styling

```typescript
import { JourneyMasterCard } from '@/modules/journey'

export function Dashboard() {
  return (
    <JourneyMasterCard
      className="shadow-2xl border-2 border-blue-200"
    />
  )
}
```

### In a Grid Layout

```typescript
import { JourneyMasterCard } from '@/modules/journey'

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <JourneyMasterCard />
      <JourneyMasterCard showNotification={true} />
    </div>
  )
}
```

## Data Source

O componente obtém dados do hook `useConsciousnessPoints()`:

- **stats**: UserConsciousnessStats
  - `level`: Nível atual (1-5)
  - `level_name`: Nome do nível (Observador, Consciente, etc.)
  - `total_points`: Total de CP acumulados
  - `current_streak`: Sequência de dias atual
  - `longest_streak`: Maior sequência alcançada
  - `total_moments`: Total de momentos registrados
  - `total_questions_answered`: Perguntas respondidas
  - `total_summaries_reflected`: Reflexões criadas

- **progress**: Progresso para próximo nível
  - `progress_percentage`: Porcentagem de progresso (0-100)
  - `points_to_next`: CP necessários para próximo nível
  - `next_level`: Qual será o próximo nível

## Design System

O componente utiliza o Design System Ceramic:

- **CSS Classes**:
  - `.ceramic-card`: Container principal com elevação
  - `.ceramic-text-primary`: Texto principal
  - `.ceramic-text-secondary`: Texto secundário
  - `.ceramic-inset`: Container afundado para próximo marco
  - `.ceramic-accent`: Destaque em cores
  - `.notification-pulse`: Animação de pulsação âmbar

- **Animations**:
  - `cardElevationVariants`: Elevação no hover
  - `springElevation`: Spring suave para transições
  - `pulseVariants`: Pulsação para notificação

## Color Mapping

Os níveis têm cores específicas (definidas em `LEVEL_COLORS`):

- Level 1 (Observador): Slate (#94a3b8)
- Level 2 (Consciente): Blue (#3b82f6)
- Level 3 (Reflexivo): Purple (#a855f7)
- Level 4 (Integrado): Amber (#f59e0b)
- Level 5 (Mestre): Yellow (#eab308)

## States

### Loading State
Mostra spinner enquanto os dados estão sendo carregados.

### Empty State
Quando não há momentos registrados, mostra mensagem de incentivo.

### Normal State
Mostra todas as informações de progresso e estatísticas.

## Dependencies

- `react`: UI library
- `framer-motion`: Animações
- `@heroicons/react`: Icons (FireIcon, SparklesIcon)
- `useConsciousnessPoints`: Hook customizado para dados
- `ceramic-motion.ts`: Variantes de animação do design system

## Performance

- Usa `useMemo` para evitar cálculos desnecessários de progresso
- Animações são otimizadas com Framer Motion
- Carregamento de dados é feito pelo hook (com caching recomendado)
- Renderização condicional para estados vazios

## Accessibility

- Indicador de notificação tem `aria-label` descritivo
- Botão de notificação é acessível via teclado
- Cores contrastadas seguem padrões WCAG
- Textos descritivos para todas as métricas

## Testing

Veja exemplos de uso em `JourneyMasterCard.examples.tsx`:

```typescript
import {
  BasicUsageExample,
  NotificationExample,
  CustomStyleExample,
  DashboardLayoutExample,
  RouterIntegrationExample,
} from './JourneyMasterCard.examples'
```

## Migration from Old Components

Se você estava usando `JourneyCardCollapsed` ou `ConsciousnessScore`:

### Before
```typescript
import { JourneyCardCollapsed } from '@/modules/journey'
import { ConsciousnessScore } from '@/modules/journey'

export function Dashboard() {
  return (
    <>
      <JourneyCardCollapsed />
      <ConsciousnessScore stats={stats} />
    </>
  )
}
```

### After
```typescript
import { JourneyMasterCard } from '@/modules/journey'

export function Dashboard() {
  return (
    <JourneyMasterCard />
  )
}
```

## Known Limitations

- Requer usuario autenticado (uso de `useAuth()`)
- Dados são buscados automaticamente (não há controle manual de refetch no componente)
- Notificação é um indicador visual apenas (lógica de negócio deve ser implementada no pai)

## Future Enhancements

- [ ] Animação de confete ao subir de nível
- [ ] Detalhamento de próximas milestones (top 3)
- [ ] Histórico de progresso em timeline
- [ ] Comparação com períodos anteriores
- [ ] Customização de temas de cor
- [ ] Modo dark/light adaptativo

## Troubleshooting

### Componente não carrega dados
- Verifique se o usuário está autenticado
- Verifique se `useConsciousnessPoints()` está funcionando
- Verifique o console para erros de API

### Animações não aparecem
- Verifique se Framer Motion está instalado
- Verifique se variantes estão sendo importadas corretamente
- Verifique se classes CSS de animação estão no `index.css`

### Cores não correspondem ao nível
- Verifique `LEVEL_COLORS` em `consciousnessPoints.ts`
- Verifique se o nível está sendo calculado corretamente
- Verifique os valores de `stats.level`

## Files

- `JourneyMasterCard.tsx`: Componente principal
- `JourneyMasterCard.examples.tsx`: Exemplos de uso
- `JourneyMasterCard.README.md`: Esta documentação
