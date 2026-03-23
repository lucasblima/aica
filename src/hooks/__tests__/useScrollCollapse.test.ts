import { renderHook, act } from '@testing-library/react';
import { useScrollCollapse } from '../useScrollCollapse';

describe('useScrollCollapse', () => {
  let scrollY = 0;

  beforeEach(() => {
    scrollY = 0;
    Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
  });

  it('returns isCollapsed false at scroll 0', () => {
    const { result } = renderHook(() => useScrollCollapse());
    expect(result.current.isCollapsed).toBe(false);
  });

  it('returns isCollapsed true after scrolling past threshold', () => {
    const { result } = renderHook(() => useScrollCollapse({ threshold: 80 }));
    act(() => {
      scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isCollapsed).toBe(true);
  });

  it('returns isCollapsed false after scrolling back up', () => {
    const { result } = renderHook(() => useScrollCollapse({ threshold: 80, restoreThreshold: 20 }));
    act(() => {
      scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isCollapsed).toBe(true);
    act(() => {
      scrollY = 70;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(result.current.isCollapsed).toBe(false);
  });
});
