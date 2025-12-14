# FloatingActionButton - Guia de Integração

## Integração com View Conexões

Este documento mostra como integrar o FloatingActionButton na view de Conexões.

## Passo 1: Importar Dependências

```tsx
import { FloatingActionButton } from '../components/FloatingActionButton';
import { useCardSelection } from '../hooks/useCardSelection';
```

## Passo 2: Configurar Hook de Seleção

```tsx
function ConexoesView() {
  // Hook de seleção com múltiplas seleções habilitadas
  const {
    toggle,
    getCardMotionProps,
    getCardStyle,
    hasSelection,
    selectedIds,
    clearSelection
  } = useCardSelection({
    multiple: true,
    onChange: (ids) => {
      console.log('Seleção alterada:', ids);
    }
  });

  // Seus dados de arquétipos
  const [archetypes, setArchetypes] = useState([]);

  // ... resto do código
}
```

## Passo 3: Aplicar Props aos Cards

```tsx
// Aplicar motion props e style aos cards de arquétipos
{archetypes.map((archetype) => (
  <motion.div
    key={archetype.id}
    {...getCardMotionProps(archetype.id)}
    style={getCardStyle(archetype.id)}
    onClick={() => toggle(archetype.id)}
    className="p-6 rounded-lg cursor-pointer"
  >
    {/* Conteúdo do card */}
  </motion.div>
))}
```

## Passo 4: Adicionar FAB

```tsx
// Handler para criar conexão
const handleCreateConnection = async () => {
  try {
    // Sua lógica de criação
    await createConnection(selectedIds);

    // Limpar seleção após sucesso
    clearSelection();

    // Mostrar feedback
    toast.success('Conexão criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar conexão:', error);
    toast.error('Erro ao criar conexão');
  }
};

// Renderizar FAB
return (
  <div>
    {/* Seu conteúdo */}

    <FloatingActionButton
      isActive={hasSelection}
      onClick={handleCreateConnection}
      label="Criar"
    />
  </div>
);
```

## Exemplo Completo - ConexoesView

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { useCardSelection } from '../hooks/useCardSelection';

interface Archetype {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export function ConexoesView() {
  const [archetypes, setArchetypes] = useState<Archetype[]>([
    { id: '1', name: 'O Sábio', description: 'Busca conhecimento' },
    { id: '2', name: 'O Herói', description: 'Enfrenta desafios' },
    { id: '3', name: 'O Criador', description: 'Expressa criatividade' },
  ]);

  const {
    toggle,
    getCardMotionProps,
    getCardStyle,
    hasSelection,
    selectedIds,
    clearSelection
  } = useCardSelection({
    multiple: true,
    onChange: (ids) => {
      console.log('Arquétipos selecionados:', ids);
    }
  });

  const handleCreateConnection = async () => {
    console.log('Criando conexão com:', selectedIds);

    // Aqui você implementaria a lógica de criação
    // Por exemplo: await api.createConnection({ archetypeIds: selectedIds });

    // Limpar seleção
    clearSelection();

    // Mostrar feedback
    alert(`Conexão criada com ${selectedIds.length} arquétipo(s)!`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Conexões</h1>
          <p className="text-gray-600">
            Selecione os arquétipos que ressoam com você
          </p>
        </header>

        {/* Grid de Arquétipos */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-24">
          {archetypes.map((archetype) => (
            <motion.div
              key={archetype.id}
              {...getCardMotionProps(archetype.id)}
              style={getCardStyle(archetype.id)}
              onClick={() => toggle(archetype.id)}
              className="p-6 rounded-lg"
            >
              <h3 className="font-semibold text-lg mb-2">
                {archetype.name}
              </h3>
              <p className="text-sm text-gray-600">
                {archetype.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Floating Action Button */}
        <FloatingActionButton
          isActive={hasSelection}
          onClick={handleCreateConnection}
          label="Criar"
        />
      </div>
    </div>
  );
}
```

## Comportamento Esperado

1. **Inicial**: FAB aparece cinza e opaco (inativo)
2. **Ao selecionar card**: Card eleva e muda para cor quente (âmbar)
3. **FAB acende**: Muda para âmbar com glow, escala aumenta
4. **Ao clicar FAB**: Executa ação, limpa seleção
5. **FAB apaga**: Volta ao estado inativo

## Customizações Comuns

### Limitar Número de Seleções

```tsx
const MAX_SELECTION = 3;

const handleToggle = (id: string) => {
  if (selectedIds.length >= MAX_SELECTION && !selectedIds.includes(id)) {
    toast.warning(`Máximo de ${MAX_SELECTION} arquétipos`);
    return;
  }
  toggle(id);
};
```

### Label Dinâmico

```tsx
<FloatingActionButton
  isActive={hasSelection}
  onClick={handleCreateConnection}
  label={`Criar (${selectedIds.length})`}
/>
```

### Confirmação Antes de Criar

```tsx
const handleCreateConnection = async () => {
  const confirmed = window.confirm(
    `Criar conexão com ${selectedIds.length} arquétipo(s)?`
  );

  if (!confirmed) return;

  // Processar criação...
};
```

## Troubleshooting

### FAB não acende
- Verifique se `hasSelection` está retornando `true`
- Confirme que `useCardSelection` está sendo usado corretamente

### Cards não selecionam
- Verifique se `onClick={() => toggle(id)}` está aplicado
- Confirme que IDs únicos estão sendo passados

### Animações lentas/travadas
- Verifique performance com React DevTools
- Considere usar `React.memo` nos cards se houver muitos

## Próximas Melhorias

1. Adicionar badge de contagem no FAB
2. Implementar confirmação via modal
3. Adicionar feedback visual ao criar conexão
4. Suportar múltiplas ações (criar, deletar, etc.)
