import type { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom';
  maxWidth?: number;
}

/**
 * CSS-only educational tooltip for the Pricing Simulator.
 * Lightweight, no state, no portals — just a hover overlay.
 */
export function Tooltip({ text, children, position = 'top', maxWidth = 280 }: TooltipProps) {
  const posClass = position === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        className={`absolute ${posClass} z-[9999] px-3 py-2 text-xs leading-relaxed text-white bg-ceramic-text-primary rounded-lg shadow-lg pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 whitespace-normal text-left`}
        style={{ maxWidth, width: 'max-content' }}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Small (?) icon that shows a tooltip on hover.
 * Use next to labels and headers for educational context.
 */
export function InfoTip({ text, position }: { text: string; position?: TooltipProps['position'] }) {
  return (
    <Tooltip text={text} position={position}>
      <span className="inline-flex items-center justify-center w-4 h-4 ml-1 text-[10px] font-bold text-ceramic-text-secondary bg-ceramic-cool rounded-full cursor-help hover:bg-amber-100 hover:text-amber-700 transition-colors shrink-0">
        ?
      </span>
    </Tooltip>
  );
}
