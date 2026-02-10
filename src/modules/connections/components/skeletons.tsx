/**
 * Skeleton Loading Components
 *
 * Skeleton screens para melhor perceived performance
 * Usado enquanto dados estão carregando
 */

import React from 'react';

/**
 * SpaceCardSkeleton
 * Skeleton para cards de espaços
 */
export function SpaceCardSkeleton() {
  return (
    <div className="bg-ceramic-base border-2 border-ceramic-border rounded-lg p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-ceramic-cool rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-ceramic-cool rounded w-3/4 mb-2" />
          <div className="h-3 bg-ceramic-cool rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-ceramic-border">
        <div className="h-3 bg-ceramic-cool rounded w-full mb-2" />
        <div className="h-3 bg-ceramic-cool rounded w-2/3" />
      </div>
    </div>
  );
}

/**
 * SpaceMemberListSkeleton
 * Skeleton para lista de membros
 */
export function SpaceMemberListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-ceramic-base border border-ceramic-border rounded-lg animate-pulse"
        >
          <div className="w-10 h-10 bg-ceramic-cool rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-ceramic-cool rounded w-1/2 mb-2" />
            <div className="h-3 bg-ceramic-cool rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DashboardSkeleton
 * Skeleton para dashboards de arquétipos
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-ceramic-cool rounded w-48 mb-2" />
          <div className="h-4 bg-ceramic-cool rounded w-32" />
        </div>
        <div className="h-10 bg-ceramic-cool rounded w-32" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-ceramic-base border-2 border-ceramic-border rounded-lg p-6">
            <div className="h-4 bg-ceramic-cool rounded w-1/2 mb-3" />
            <div className="h-8 bg-ceramic-cool rounded w-1/3" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-ceramic-base border-2 border-ceramic-border rounded-lg p-6">
        <div className="h-6 bg-ceramic-cool rounded w-1/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-ceramic-cool rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ListItemSkeleton
 * Skeleton genérico para itens de lista
 */
export function ListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-2 border-ceramic-border rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="h-4 bg-ceramic-cool rounded w-3/4 mb-2" />
              <div className="h-3 bg-ceramic-cool rounded w-1/2" />
            </div>
            <div className="ml-4">
              <div className="h-6 bg-ceramic-cool rounded w-20" />
            </div>
          </div>
          <div className="flex gap-4 mt-3">
            <div className="h-3 bg-ceramic-cool rounded w-24" />
            <div className="h-3 bg-ceramic-cool rounded w-24" />
            <div className="h-3 bg-ceramic-cool rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * GridItemSkeleton
 * Skeleton para itens em grid (inventário, galeria, etc.)
 */
export function GridItemSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-ceramic-base border-2 border-ceramic-border rounded-lg overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-ceramic-cool" />
          <div className="p-4">
            <div className="h-4 bg-ceramic-cool rounded w-3/4 mb-2" />
            <div className="h-3 bg-ceramic-cool rounded w-1/2 mb-3" />
            <div className="flex gap-2">
              <div className="h-6 bg-ceramic-cool rounded w-16" />
              <div className="h-6 bg-ceramic-cool rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * TableSkeleton
 * Skeleton para tabelas
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden border border-ceramic-border rounded-lg">
      <table className="min-w-full divide-y divide-ceramic-border">
        <thead className="bg-ceramic-base">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-ceramic-cool rounded w-full animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-ceramic-base divide-y divide-stone-100">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-ceramic-cool rounded w-full animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * DetailViewSkeleton
 * Skeleton para views de detalhe
 */
export function DetailViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-8 bg-ceramic-cool rounded w-2/3 mb-2" />
          <div className="h-4 bg-ceramic-cool rounded w-1/2 mb-4" />
          <div className="flex gap-2">
            <div className="h-6 bg-ceramic-cool rounded w-20" />
            <div className="h-6 bg-ceramic-cool rounded w-20" />
            <div className="h-6 bg-ceramic-cool rounded w-20" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-ceramic-cool rounded w-24" />
          <div className="h-10 bg-ceramic-cool rounded w-24" />
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Content */}
          <div className="bg-ceramic-base border border-ceramic-border rounded-lg p-6">
            <div className="h-6 bg-ceramic-cool rounded w-1/4 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-ceramic-cool rounded w-full" />
              <div className="h-4 bg-ceramic-cool rounded w-full" />
              <div className="h-4 bg-ceramic-cool rounded w-3/4" />
            </div>
          </div>

          {/* Secondary Section */}
          <div className="bg-ceramic-base border border-ceramic-border rounded-lg p-6">
            <div className="h-6 bg-ceramic-cool rounded w-1/3 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-ceramic-cool rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-ceramic-base border border-ceramic-border rounded-lg p-6">
            <div className="h-6 bg-ceramic-cool rounded w-2/3 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-ceramic-cool rounded" />
                  <div className="h-3 bg-ceramic-cool rounded flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FormSkeleton
 * Skeleton para formulários
 */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-ceramic-cool rounded w-1/4 mb-2" />
          <div className="h-10 bg-ceramic-cool rounded w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <div className="h-10 bg-ceramic-cool rounded w-24" />
        <div className="h-10 bg-ceramic-cool rounded w-24" />
      </div>
    </div>
  );
}
