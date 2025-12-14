import { useState, useCallback, useMemo } from 'react';
import { MotionProps } from 'framer-motion';
import {
  cardInsetVariants,
  springElevation,
  temperatureColors
} from '../lib/animations/ceramic-motion';

interface UseCardSelectionOptions {
  /** Permite múltiplas seleções */
  multiple?: boolean;
  /** Callback quando seleção muda */
  onChange?: (selectedIds: string[]) => void;
  /** IDs inicialmente selecionados */
  initialSelection?: string[];
}

interface UseCardSelectionReturn {
  /** ID(s) selecionado(s) */
  selectedIds: string[];
  /** Seleciona um card */
  select: (id: string) => void;
  /** Deseleciona um card */
  deselect: (id: string) => void;
  /** Toggle seleção */
  toggle: (id: string) => void;
  /** Verifica se card está selecionado */
  isSelected: (id: string) => boolean;
  /** Limpa todas as seleções */
  clearSelection: () => void;
  /** Props de motion para aplicar ao card */
  getCardMotionProps: (id: string) => MotionProps;
  /** Estilo de background baseado em temperatura */
  getCardStyle: (id: string) => React.CSSProperties;
  /** Quantidade de cards selecionados */
  selectionCount: number;
  /** Se há alguma seleção */
  hasSelection: boolean;
}

/**
 * Hook para gerenciar seleção de cards com feedback visual ceramic
 *
 * @example
 * ```tsx
 * const { isSelected, toggle, getCardMotionProps, getCardStyle } = useCardSelection();
 *
 * return (
 *   <motion.div
 *     {...getCardMotionProps('card-1')}
 *     style={getCardStyle('card-1')}
 *     onClick={() => toggle('card-1')}
 *   >
 *     Card Content
 *   </motion.div>
 * );
 * ```
 */
export function useCardSelection(options: UseCardSelectionOptions = {}): UseCardSelectionReturn {
  const { multiple = false, onChange, initialSelection = [] } = options;

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection);

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => {
      let next: string[];
      if (multiple) {
        next = prev.includes(id) ? prev : [...prev, id];
      } else {
        next = [id];
      }
      onChange?.(next);
      return next;
    });
  }, [multiple, onChange]);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = prev.filter((selectedId) => selectedId !== id);
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter((selectedId) => selectedId !== id);
      } else {
        next = multiple ? [...prev, id] : [id];
      }
      onChange?.(next);
      return next;
    });
  }, [multiple, onChange]);

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    onChange?.([]);
  }, [onChange]);

  const getCardMotionProps = useCallback((id: string): MotionProps => {
    const selected = selectedIds.includes(id);
    return {
      variants: cardInsetVariants,
      initial: 'rest',
      animate: selected ? 'selected' : 'rest',
      whileHover: selected ? 'selected' : 'hover',
      whileTap: 'pressed',
      transition: springElevation,
      layout: true,
    };
  }, [selectedIds]);

  const getCardStyle = useCallback((id: string): React.CSSProperties => {
    const selected = selectedIds.includes(id);
    return {
      backgroundColor: selected ? temperatureColors.warm : temperatureColors.cool,
      transition: 'background-color 0.3s ease-in-out',
      cursor: 'pointer',
    };
  }, [selectedIds]);

  const selectionCount = selectedIds.length;
  const hasSelection = selectionCount > 0;

  return useMemo(() => ({
    selectedIds,
    select,
    deselect,
    toggle,
    isSelected,
    clearSelection,
    getCardMotionProps,
    getCardStyle,
    selectionCount,
    hasSelection,
  }), [
    selectedIds,
    select,
    deselect,
    toggle,
    isSelected,
    clearSelection,
    getCardMotionProps,
    getCardStyle,
    selectionCount,
    hasSelection,
  ]);
}

export default useCardSelection;
