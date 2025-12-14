import { useState, useCallback } from 'react';

interface UseTemperatureOptions {
  /** Estado inicial (padrão: false = cool) */
  initialWarm?: boolean;
  /** Callback quando temperatura muda */
  onChange?: (isWarm: boolean) => void;
}

interface UseTemperatureReturn {
  /** Se está no estado quente */
  isWarm: boolean;
  /** Se está no estado frio */
  isCool: boolean;
  /** Define para estado quente */
  setWarm: () => void;
  /** Define para estado frio */
  setCool: () => void;
  /** Toggle entre quente e frio */
  toggle: () => void;
  /** Classes de background baseadas em temperatura */
  bgClass: string;
  /** Classes de hover baseadas em temperatura */
  hoverClass: string;
  /** Classes combinadas (bg + hover) */
  temperatureClasses: string;
}

/**
 * Hook para gerenciar transição de temperatura de cor (frio -> quente)
 *
 * Fornece utilitários para gerenciar estados visuais baseados em temperatura,
 * facilitando a implementação da linguagem visual ceramic.
 *
 * @example
 * ```tsx
 * function MyCard() {
 *   const { isWarm, toggle, temperatureClasses } = useTemperature();
 *
 *   return (
 *     <button
 *       onClick={toggle}
 *       className={`p-4 rounded-xl transition-colors ${temperatureClasses}`}
 *     >
 *       {isWarm ? 'Selecionado' : 'Selecionar'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTemperature(options: UseTemperatureOptions = {}): UseTemperatureReturn {
  const { initialWarm = false, onChange } = options;
  const [isWarm, setIsWarm] = useState(initialWarm);

  const setWarm = useCallback(() => {
    setIsWarm(true);
    onChange?.(true);
  }, [onChange]);

  const setCool = useCallback(() => {
    setIsWarm(false);
    onChange?.(false);
  }, [onChange]);

  const toggle = useCallback(() => {
    setIsWarm((prev) => {
      const next = !prev;
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const isCool = !isWarm;

  // Classes de background
  const bgClass = isWarm ? 'bg-ceramic-warm' : 'bg-ceramic-cool';

  // Classes de hover
  const hoverClass = isWarm ? 'hover:bg-ceramic-warm-hover' : 'hover:bg-ceramic-cool-hover';

  // Classes combinadas
  const temperatureClasses = `${bgClass} ${hoverClass}`;

  return {
    isWarm,
    isCool,
    setWarm,
    setCool,
    toggle,
    bgClass,
    hoverClass,
    temperatureClasses,
  };
}

export default useTemperature;
