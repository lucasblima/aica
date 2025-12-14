# JourneyMasterCard Integration Guide

## Overview

O `JourneyMasterCard` foi criado como um componente unificado que substitui a necessidade de usar `JourneyCardCollapsed` e `ConsciousnessScore` separadamente.

## Quick Start

### 1. Import

```typescript
import { JourneyMasterCard } from '@/modules/journey'
```

### 2. Basic Usage

```typescript
function Dashboard() {
  return <JourneyMasterCard />
}
```

### 3. With Notification Handler

```typescript
function Dashboard() {
  const [hasNotification, setHasNotification] = useState(false)

  return (
    <JourneyMasterCard
      showNotification={hasNotification}
      onNotificationClick={() => {
        // Handle notification
        setHasNotification(false)
      }}
    />
  )
}
```

## Migration Path

### If you were using JourneyCardCollapsed:

**Before:**
```typescript
import { JourneyCardCollapsed } from '@/modules/journey'

function Dashboard() {
  const stats = useConsciousnessPoints()
  const moments = useMoments()

  return <JourneyCardCollapsed onClick={() => navigate('/jornada')} />
}
```

**After:**
```typescript
import { JourneyMasterCard } from '@/modules/journey'

function Dashboard() {
  return (
    <div onClick={() => navigate('/jornada')}>
      <JourneyMasterCard />
    </div>
  )
}
```

### If you were using ConsciousnessScore:

**Before:**
```typescript
import { ConsciousnessScore } from '@/modules/journey'
import { useConsciousnessPoints } from '@/modules/journey'

function Dashboard() {
  const { stats } = useConsciousnessPoints()

  return (
    <>
      <ConsciousnessScore stats={stats} showDetails={true} />
      <OtherComponent />
    </>
  )
}
```

**After:**
```typescript
import { JourneyMasterCard } from '@/modules/journey'

function Dashboard() {
  return (
    <>
      <JourneyMasterCard />
      <OtherComponent />
    </>
  )
}
```

## Deprecation Notice

Os componentes anteriores podem ser mantidos em código legado, mas novas implementações devem usar `JourneyMasterCard`.

### Componentes a Deprecar:
- `JourneyCardCollapsed` - Substituído por `JourneyMasterCard`
- `ConsciousnessScore` - Substituído por `JourneyMasterCard`

## Component Features Comparison

| Feature | JourneyCardCollapsed | ConsciousnessScore | JourneyMasterCard |
|---------|--------------------|--------------------|------------------|
| Badge Nível | ✓ | ✓ | ✓ |
| Nome Nível | ✓ | ✓ | ✓ |
| Descrição Nível | ✗ | ✗ | ✓ |
| Barra Progresso | ✗ | ✓ | ✓ |
| CP Atual/Próximo | ✗ | ✓ | ✓ |
| Próximo Marco | ✗ | ✗ | ✓ |
| Notificações | ✓ | ✗ | ✓ |
| Estatísticas | ✓ | ✓ | ✓ |
| Animações | Parcial | Parcial | ✓ (Ceramic Design) |

## Where to Use

### Homepage/Dashboard
```typescript
<JourneyMasterCard />
```

### Modal/Dialog
```typescript
<JourneyMasterCard className="shadow-2xl" />
```

### Grid Layout
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <JourneyMasterCard showNotification={hasNotification} />
  <JourneyMasterCard />
</div>
```

### Navigation Click
```typescript
<div onClick={() => navigate('/jornada')}>
  <JourneyMasterCard />
</div>
```

## Configuration

### Show/Hide Notification Indicator

```typescript
// Show pulsing amber indicator
<JourneyMasterCard showNotification={true} />

// Hide indicator
<JourneyMasterCard showNotification={false} />
```

### Handle Notification Click

```typescript
<JourneyMasterCard
  showNotification={true}
  onNotificationClick={() => {
    console.log('User clicked notification')
    // Handle navigation, modal, etc.
  }}
/>
```

### Custom Styling

```typescript
// Add custom classes
<JourneyMasterCard className="border-2 border-blue-200 shadow-lg" />

// With Tailwind utilities
<JourneyMasterCard className="max-w-sm mx-auto" />
```

## Data Refresh

O componente usa `useConsciousnessPoints()` internamente, que:
- Busca dados automaticamente quando o usuário muda
- Faz refetch ao montar/desmontar
- Trata erros e estados de loading internamente

Para forçar refetch em um componente pai:

```typescript
import { useConsciousnessPoints } from '@/modules/journey'

function Dashboard() {
  const { refresh } = useConsciousnessPoints()

  const handleRefresh = async () => {
    await refresh()
  }

  return (
    <>
      <JourneyMasterCard />
      <button onClick={handleRefresh}>Atualizar</button>
    </>
  )
}
```

## Styling Examples

### Minimal Style
```typescript
<JourneyMasterCard />
```

### With Border
```typescript
<JourneyMasterCard className="border-2 border-ceramic-text-primary" />
```

### With Custom Shadow
```typescript
<JourneyMasterCard className="shadow-2xl" />
```

### Responsive Width
```typescript
<div className="max-w-md">
  <JourneyMasterCard />
</div>
```

### In a Container
```typescript
<div className="p-6 bg-white rounded-2xl">
  <JourneyMasterCard />
</div>
```

## Files Reference

- **Component**: `src/modules/journey/views/JourneyMasterCard.tsx` (260 lines)
- **Examples**: `src/modules/journey/views/JourneyMasterCard.examples.tsx`
- **Documentation**: `src/modules/journey/views/JourneyMasterCard.README.md`
- **Export**: `src/modules/journey/views/index.ts`

## Troubleshooting

### Component shows "Carregando dados..."
- Verifique se usuário está autenticado
- Verifique se API de CP está respondendo
- Verifique console para erros de rede

### Notificação não aparece
- Verifique se `showNotification={true}` está passado
- Verifique se `.notification-pulse` class existe em `index.css`
- Verifique animações CSS no DevTools

### Cores não correspondem ao nível
- Verifique array `LEVEL_COLORS` em `consciousnessPoints.ts`
- Verifique se `stats.level` tem valor correto (1-5)
- Limpe cache do browser

### Classes CSS não funcionam
- Verifique se `tailwind.config.js` tem cores ceramic
- Verifique se `index.css` tem classes ceramic
- Rebuild do projeto (se necessário)

## Performance Considerations

- Component usa `useMemo` para evitar recálculos
- Animações são GPU-aceleradas (Framer Motion)
- Loading state é mostrado enquanto dados chegam
- Tratamento gracioso de erro para falhas de API

## Accessibility

- Indicador de notificação tem `aria-label`
- Texto descritivo para todas as métricas
- Cores contrastadas (WCAG compliant)
- Navegação via teclado suportada

## Next Steps

1. Remover uso de `JourneyCardCollapsed` em componentes antigos
2. Remover uso de `ConsciousnessScore` em componentes antigos
3. Atualizar testes para usar `JourneyMasterCard`
4. Considerar deprecação formal dos componentes antigos
5. Monitorar performance em produção
