/**
 * ProspectPipeline Component
 * Issue #101 - Kanban de patrocinadores com drag-and-drop
 *
 * @module modules/grants/components/ProspectPipeline
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { Plus, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { ProspectCard } from './ProspectCard';
import type { PipelineColumn, KanbanSponsorCard } from '../types/prospect';
import type { SponsorStatus } from '../types/sponsorship';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Prospectpipeline');

interface ProspectPipelineProps {
  columns: PipelineColumn[];
  totalValue: number;
  totalCount: number;
  loading?: boolean;
  onMoveSponsor: (sponsorId: string, newStatus: SponsorStatus) => Promise<void>;
  onSponsorClick?: (sponsorId: string) => void;
  onAddSponsor?: () => void;
  onQuickAction?: (sponsorId: string, action: 'call' | 'email' | 'meeting') => void;
  onRefresh?: () => void;
}

// =============================================================================
// Sortable Card Wrapper
// =============================================================================

interface SortableCardProps {
  sponsor: KanbanSponsorCard;
  onClick?: () => void;
  onQuickAction?: (action: 'call' | 'email' | 'meeting') => void;
}

function SortableCard({ sponsor, onClick, onQuickAction }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sponsor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProspectCard
        sponsor={sponsor}
        isDragging={isDragging}
        onClick={onClick}
        onQuickAction={onQuickAction}
      />
    </div>
  );
}

// =============================================================================
// Droppable Column
// =============================================================================

interface DroppableColumnProps {
  column: PipelineColumn;
  onSponsorClick?: (sponsorId: string) => void;
  onQuickAction?: (sponsorId: string, action: 'call' | 'email' | 'meeting') => void;
}

function DroppableColumn({ column, onSponsorClick, onQuickAction }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col bg-gray-50 rounded-lg min-w-[280px] max-w-[320px]
        transition-colors duration-200
        ${isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''}
      `}
    >
      {/* Column Header */}
      <div
        className="p-3 rounded-t-lg"
        style={{ backgroundColor: `${column.color}15` }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-medium text-gray-900">{column.title}</h3>
          </div>
          <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {column.sponsors.length}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {formatCurrency(column.total_value)}
        </p>
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        <SortableContext
          items={column.sponsors.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.sponsors.map((sponsor) => (
            <SortableCard
              key={sponsor.id}
              sponsor={sponsor}
              onClick={() => onSponsorClick?.(sponsor.id)}
              onQuickAction={(action) => onQuickAction?.(sponsor.id, action)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {column.sponsors.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum prospect</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Pipeline Component
// =============================================================================

export function ProspectPipeline({
  columns,
  totalValue,
  totalCount,
  loading = false,
  onMoveSponsor,
  onSponsorClick,
  onAddSponsor,
  onQuickAction,
  onRefresh,
}: ProspectPipelineProps) {
  const [activeCard, setActiveCard] = useState<KanbanSponsorCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Find card by ID across all columns
  const findCard = useCallback((id: string): KanbanSponsorCard | undefined => {
    for (const column of columns) {
      const card = column.sponsors.find(s => s.id === id);
      if (card) return card;
    }
    return undefined;
  }, [columns]);

  // Find column containing a card
  const findColumnByCardId = useCallback((cardId: string): string | undefined => {
    for (const column of columns) {
      if (column.sponsors.some(s => s.id === cardId)) {
        return column.id;
      }
    }
    return undefined;
  }, [columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const card = findCard(event.active.id as string);
    setActiveCard(card || null);
  }, [findCard]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropped over a column
    const isColumn = columns.some(col => col.id === overId);
    const targetColumnId = isColumn ? overId : findColumnByCardId(overId);

    if (!targetColumnId) return;

    const sourceColumnId = findColumnByCardId(activeId);

    // Only move if column changed
    if (sourceColumnId !== targetColumnId) {
      try {
        await onMoveSponsor(activeId, targetColumnId as SponsorStatus);
      } catch (error) {
        log.error('Erro ao mover patrocinador:', error);
      }
    }
  }, [columns, findColumnByCardId, onMoveSponsor]);

  return (
    <div className="h-full flex flex-col">
      {/* Header com estatisticas */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              <strong>{totalCount}</strong> prospects
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600">
              Pipeline: <strong>{formatCurrency(totalValue)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onRefresh}
              disabled={loading}
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onAddSponsor && (
            <button
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onAddSponsor}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Novo Prospect</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 min-h-full">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                onSponsorClick={onSponsorClick}
                onQuickAction={onQuickAction}
              />
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard && (
              <ProspectCard
                sponsor={activeCard}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
    </div>
  );
}

export default ProspectPipeline;
