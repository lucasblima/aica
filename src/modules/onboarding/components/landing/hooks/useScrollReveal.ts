import { useRef } from 'react';
import { useInView } from 'framer-motion';

type MarginValue = `${number}${'px' | '%'}`;
type MarginType =
  | MarginValue
  | `${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue}`
  | `${MarginValue} ${MarginValue} ${MarginValue} ${MarginValue}`;

/**
 * useScrollReveal — viewport-triggered animation hook.
 *
 * Returns a ref to attach to the element and an `isInView` boolean
 * that flips to true when the element enters the viewport.
 *
 * @param options.once  - Only trigger once (default: true)
 * @param options.margin - IntersectionObserver rootMargin (default: '-100px')
 */
export function useScrollReveal(options?: { once?: boolean; margin?: MarginType }) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: options?.margin ?? '-100px',
  });
  return { ref, isInView };
}
