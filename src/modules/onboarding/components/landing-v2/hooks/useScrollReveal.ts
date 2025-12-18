import { useEffect, useRef, useState, RefObject } from 'react';

interface UseScrollRevealOptions {
  /** Percentage of element visibility needed to trigger (0-1) */
  threshold?: number;
  /** Margin around the root element */
  rootMargin?: string;
  /** Only trigger once (true) or toggle on scroll (false) */
  triggerOnce?: boolean;
}

interface UseScrollRevealReturn<T extends HTMLElement> {
  ref: RefObject<T>;
  isVisible: boolean;
}

/**
 * useScrollReveal Hook
 *
 * Uses Intersection Observer API to detect when an element enters the viewport.
 * Ideal for scroll-triggered animations in the Digital Ceramic landing page.
 *
 * @example
 * ```tsx
 * function ScrollSection() {
 *   const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
 *
 *   return (
 *     <motion.div
 *       ref={ref}
 *       initial={{ opacity: 0, y: 30 }}
 *       animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
 *     >
 *       Content appears on scroll
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
}: UseScrollRevealOptions = {}): UseScrollRevealReturn<T> {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: just show the element
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

export default useScrollReveal;
