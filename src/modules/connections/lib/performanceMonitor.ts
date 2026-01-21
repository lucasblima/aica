/**
 * Performance Monitor
 *
 * Ferramentas de monitoramento de performance (DEV ONLY)
 * Ajuda a identificar bottlenecks e otimizar componentes
 *
 * @example
 * ```tsx
 * // Em um componente
 * const Component = () => {
 *   useRenderCount('MyComponent');
 *
 *   useEffect(() => {
 *     performanceMonitor.mark('data-fetch-start');
 *     fetchData().then(() => {
 *       performanceMonitor.mark('data-fetch-end');
 *       performanceMonitor.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
 *     });
 *   }, []);
 * };
 * ```
 */

import { useRef, useEffect } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('performanceMonitor');

const isDev = import.meta.env.DEV;

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private enabled: boolean = isDev;

  /**
   * Marca início de uma operação
   */
  mark(name: string): void {
    if (!this.enabled) return;

    this.marks.set(name, performance.now());

    if (isDev) {
      log.debug(`[Performance] Mark: ${name}`);
    }
  }

  /**
   * Mede tempo entre duas marcas
   */
  measure(name: string, startMark: string, endMark?: string): number {
    if (!this.enabled) return 0;

    const startTime = this.marks.get(startMark);
    if (!startTime) {
      log.warn(`[Performance] Start mark not found: ${startMark}`);
      return 0;
    }

    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    if (!endTime) {
      log.warn(`[Performance] End mark not found: ${endMark}`);
      return 0;
    }

    const duration = endTime - startTime;

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    if (isDev) {
      log.debug(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Limpa marca específica
   */
  clearMark(name: string): void {
    this.marks.delete(name);
  }

  /**
   * Limpa todas as marcas
   */
  clearMarks(): void {
    this.marks.clear();
  }

  /**
   * Retorna todas as métricas
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Retorna métricas de um período
   */
  getMetricsSince(timestamp: number): PerformanceMetric[] {
    return this.metrics.filter((m) => m.timestamp >= timestamp);
  }

  /**
   * Log de todas as métricas no console
   */
  logMetrics(): void {
    if (!this.enabled || this.metrics.length === 0) return;

    console.group('[Performance] Metrics Summary');

    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(grouped).forEach(([name, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      log.debug(`${name}:`, {
        count: durations.length,
        avg: `${avg.toFixed(2)}ms`,
        min: `${min.toFixed(2)}ms`,
        max: `${max.toFixed(2)}ms`,
      });
    });

    console.groupEnd();
  }

  /**
   * Limpa todas as métricas
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Mede tempo de execução de uma função
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    this.mark(startMark);
    try {
      const result = await fn();
      this.mark(endMark);
      this.measure(name, startMark, endMark);
      return result;
    } catch (error) {
      this.mark(endMark);
      this.measure(`${name}-error`, startMark, endMark);
      throw error;
    }
  }

  /**
   * Mede tempo de execução de uma função síncrona
   */
  measureSync<T>(name: string, fn: () => T): T {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    this.mark(startMark);
    try {
      const result = fn();
      this.mark(endMark);
      this.measure(name, startMark, endMark);
      return result;
    } catch (error) {
      this.mark(endMark);
      this.measure(`${name}-error`, startMark, endMark);
      throw error;
    }
  }

  /**
   * Ativa/desativa monitoramento
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && isDev;
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook para contar renders de um componente
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  renderCount.current++;

  if (isDev) {
    log.debug(`[${componentName}] Render #${renderCount.current}`);
  }

  return renderCount.current;
}

/**
 * Hook para medir tempo de montagem do componente
 */
export function useMountTime(componentName: string): void {
  useEffect(() => {
    const mountTime = performance.now();
    performanceMonitor.mark(`${componentName}-mount`);

    if (isDev) {
      log.debug(`[${componentName}] Mounted in ${mountTime.toFixed(2)}ms`);
    }

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTime;

      if (isDev) {
        log.debug(`[${componentName}] Unmounted after ${lifetime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}

/**
 * Hook para detectar re-renders desnecessários
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any>>();

  useEffect(() => {
    if (previousProps.current && isDev) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        log.debug(`[${name}] Props changed:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Hook para medir tempo de effect
 */
export function useEffectTime(name: string, effect: () => void | (() => void), deps: any[]): void {
  useEffect(() => {
    const startMark = `${name}-effect-start`;
    const endMark = `${name}-effect-end`;

    performanceMonitor.mark(startMark);
    const cleanup = effect();
    performanceMonitor.mark(endMark);
    performanceMonitor.measure(`${name}-effect`, startMark, endMark);

    return () => {
      if (cleanup) {
        const cleanupStartMark = `${name}-cleanup-start`;
        const cleanupEndMark = `${name}-cleanup-end`;

        performanceMonitor.mark(cleanupStartMark);
        cleanup();
        performanceMonitor.mark(cleanupEndMark);
        performanceMonitor.measure(`${name}-cleanup`, cleanupStartMark, cleanupEndMark);
      }
    };
  }, deps);
}

/**
 * Decorator para medir tempo de métodos de classe
 */
export function measureMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  if (!isDev) return descriptor;

  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const methodName = `${target.constructor.name}.${propertyKey}`;
    return performanceMonitor.measureAsync(methodName, () => originalMethod.apply(this, args));
  };

  return descriptor;
}

/**
 * Utilitário para reportar Core Web Vitals
 */
export function reportWebVitals(): void {
  if (!isDev) return;

  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        log.debug('[Web Vitals] LCP:', entry);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        log.debug('[Web Vitals] FID:', entry);
      }
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        log.debug('[Web Vitals] CLS:', entry);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }
}

export default performanceMonitor;
