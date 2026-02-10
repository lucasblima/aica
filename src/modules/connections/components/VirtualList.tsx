/**
 * VirtualList Component
 *
 * Performance-optimized list using virtual scrolling
 * Renders only visible items to handle large datasets efficiently
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={items}
 *   renderItem={(item, index) => <ItemCard key={item.id} item={item} />}
 *   estimateSize={80}
 *   className="h-[600px]"
 * />
 * ```
 */

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize = 80,
  overscan = 5,
  className = 'h-[600px]',
  emptyMessage = 'Nenhum item encontrado',
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (items.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-ceramic-text-secondary">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={`${className} overflow-auto`}>
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          const key = getItemKey
            ? getItemKey(item, virtualItem.index)
            : virtualItem.index;

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * VirtualGrid Component
 *
 * Performance-optimized grid using virtual scrolling
 * Useful for image galleries, inventory grids, etc.
 */

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number;
  gap?: number;
  itemHeight?: number;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  columns = 3,
  gap = 16,
  itemHeight = 200,
  overscan = 2,
  className = 'h-[600px]',
  emptyMessage = 'Nenhum item encontrado',
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowCount = Math.ceil(items.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight + gap,
    overscan,
  });

  if (items.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-ceramic-text-secondary">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const totalSize = virtualizer.getTotalSize();
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={`${className} overflow-auto`}>
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {rowItems.map((item, colIndex) => (
                  <div key={startIndex + colIndex}>
                    {renderItem(item, startIndex + colIndex)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualList;
