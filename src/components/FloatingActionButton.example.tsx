import { motion } from 'framer-motion';
import { useCardSelection } from '../hooks/useCardSelection';
import { FloatingActionButton } from './FloatingActionButton';

/**
 * Exemplo de uso do FloatingActionButton integrado com useCardSelection
 *
 * Este exemplo mostra como o FAB "acende" quando cards são selecionados
 */
export function FloatingActionButtonExample() {
  const {
    toggle,
    getCardMotionProps,
    getCardStyle,
    hasSelection,
    clearSelection,
    selectedIds
  } = useCardSelection({ multiple: true });

  const mockArchetypes = [
    { id: '1', name: 'O Sábio', description: 'Busca conhecimento e sabedoria' },
    { id: '2', name: 'O Herói', description: 'Enfrenta desafios com coragem' },
    { id: '3', name: 'O Criador', description: 'Expressa criatividade e inovação' },
  ];

  const handleCreate = () => {
    console.log('Criando conexão com arquétipos:', selectedIds);
    alert(`Criando conexão com ${selectedIds.length} arquétipo(s) selecionado(s)`);
    clearSelection();
  };

  return (
    <div className="min-h-screen bg-ceramic-cool p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Conexões - Selecione Arquétipos</h1>
        <p className="text-ceramic-text-secondary mb-8">
          Selecione um ou mais arquétipos para criar uma conexão.
          O botão "Criar" acenderá quando houver seleção.
        </p>

        {/* Lista de cards selecionáveis */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-20">
          {mockArchetypes.map((archetype) => (
            <motion.div
              key={archetype.id}
              {...getCardMotionProps(archetype.id)}
              style={getCardStyle(archetype.id)}
              onClick={() => toggle(archetype.id)}
              className="p-6 rounded-lg"
            >
              <h3 className="font-semibold text-lg mb-2">{archetype.name}</h3>
              <p className="text-sm text-ceramic-text-secondary">{archetype.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Floating Action Button */}
        <FloatingActionButton
          isActive={hasSelection}
          onClick={handleCreate}
          label="Criar"
        />

        {/* Status da seleção (apenas para demonstração) */}
        <div className="fixed bottom-6 left-6 bg-ceramic-base p-4 rounded-lg shadow-lg">
          <p className="text-sm font-semibold">
            Status: {hasSelection ? `${selectedIds.length} selecionado(s)` : 'Nenhuma seleção'}
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            {hasSelection ? 'FAB está ativo (glow âmbar)' : 'FAB está inativo (cinza)'}
          </p>
        </div>
      </div>
    </div>
  );
}
