# FloatingActionButton

## Visão Geral
Componente de Floating Action Button (FAB) que "acende" com glow âmbar quando há seleção ativa, utilizando spring physics para transições suaves.

## Características
- **Estado Inativo**: Opacidade baixa, cor cinza neutra, sem glow
- **Estado Ativo**: Opacidade total, glow âmbar pulsante, cor vibrante
- **Transições**: Spring physics para movimento natural e tátil
- **Posição**: Fixed bottom-right (bottom-6 right-6)
- **Acessibilidade**: Desabilitado quando inativo

## Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `isActive` | `boolean` | - | Se o botão está ativo (com glow) |
| `onClick` | `() => void` | - | Callback quando clicado |
| `label` | `string` | `'Criar'` | Texto do botão |

## Uso Básico

```tsx
import { FloatingActionButton } from './components/FloatingActionButton';
import { useCardSelection } from './hooks/useCardSelection';

function MyView() {
  const { hasSelection } = useCardSelection({ multiple: true });

  const handleCreate = () => {
    console.log('Criar ação');
  };

  return (
    <div>
      {/* Seu conteúdo */}
      <FloatingActionButton
        isActive={hasSelection}
        onClick={handleCreate}
      />
    </div>
  );
}
```

## Integração com useCardSelection

O FAB foi projetado para trabalhar com o hook `useCardSelection`:

```tsx
const {
  hasSelection,     // boolean - se há seleção ativa
  selectedIds,      // string[] - IDs selecionados
  clearSelection    // função para limpar seleção
} = useCardSelection({ multiple: true });

return (
  <FloatingActionButton
    isActive={hasSelection}
    onClick={() => {
      // Processar seleção
      console.log(selectedIds);
      clearSelection();
    }}
    label="Criar Conexão"
  />
);
```

## Estados Visuais

### Estado Inativo (isActive=false)
- Background: `bg-gray-200`
- Texto: `text-gray-400`
- Opacidade: `opacity-50`
- Escala: `scale: 0.9`
- Shadow: Sutil `0 4px 12px rgba(0,0,0,0.1)`
- Cursor: Disabled

### Estado Ativo (isActive=true)
- Background: `bg-amber-500`
- Texto: `text-white`
- Opacidade: `opacity-100`
- Escala: `scale: 1`
- Shadow: Glow âmbar `0 10px 40px rgba(217, 119, 6, 0.4)`
- Hover: `scale: 1.05`
- Tap: `scale: 0.95`

## Animações

Utiliza `springElevation` do sistema ceramic-motion:
```ts
{
  type: 'spring',
  stiffness: 400,
  damping: 25,
  mass: 0.8,
}
```

Transições suaves com física de mola para:
- Mudança de escala
- Mudança de box-shadow
- Hover/Tap interactions

## Customização

### Label Customizado
```tsx
<FloatingActionButton
  isActive={hasSelection}
  onClick={handleCreate}
  label="Confirmar"
/>
```

### Posição Customizada
Para alterar a posição, você pode sobrescrever as classes CSS:

```tsx
<FloatingActionButton
  isActive={hasSelection}
  onClick={handleCreate}
  className="bottom-20 left-1/2 -translate-x-1/2" // bottom-center
/>
```

## Acessibilidade

- Botão é desabilitado quando `isActive=false`
- Sem interações de hover/tap quando inativo
- Transições visuais claras indicam mudança de estado

## Exemplo Completo

Ver arquivo `FloatingActionButton.example.tsx` para exemplo interativo completo.

## Design System

Este componente segue o design system Ceramic da aplicação:
- Spring physics para transições naturais
- Cores âmbar para ações primárias
- Elevação e sombras para hierarquia visual

## Próximos Passos

1. **Variantes de Cor**: Adicionar suporte para cores customizadas (verde, azul, etc.)
2. **Ícones Customizados**: Permitir passar ícone customizado via prop
3. **Posição Configurável**: Prop para controlar posição (bottom-right, bottom-center, etc.)
4. **Badge de Contagem**: Mostrar número de itens selecionados
5. **Confirmação**: Modal de confirmação antes da ação
