/**
 * DroppableCell - Droppable grid cell for workout slots
 *
 * Uses @dnd-kit for drop zone functionality
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import type { WorkoutSlot } from '../types/flow';
import { SlotCard } from './SlotCard';

interface DroppableCellProps {
  week: number;
  day: number;
  dayLabel: string;
  slots: WorkoutSlot[];
  onRemoveSlot: (slotId: string) => void;
  onToggleComplete?: (slotId: string, isCompleted: boolean) => void;
}

export function DroppableCell({
  week,
  day,
  dayLabel,
  slots,
  onRemoveSlot,
  onToggleComplete,
}: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-${week}-day-${day}`,
    data: {
      week,
      day,
      type: 'cell',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-24 p-2 ceramic-inset rounded-lg transition-all ${
        isOver
          ? 'ring-2 ring-ceramic-accent bg-ceramic-accent/10 scale-[1.02]'
          : ''
      }`}
    >
      {/* Day Label */}
      <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
        {dayLabel}
      </p>

      {/* Slots */}
      <div className="space-y-1">
        {slots.map((slot) => (
          <div key={slot.id} className="relative group">
            <SlotCard
              slot={slot}
              onToggleComplete={onToggleComplete}
            />

            {/* Remove Button */}
            <button
              onClick={() => onRemoveSlot(slot.id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-ceramic-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-ceramic-error/90 z-10"
              title="Remover treino"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {slots.length === 0 && (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <Plus className={`w-4 h-4 transition-all ${
            isOver
              ? 'text-ceramic-accent opacity-100 scale-125'
              : 'text-ceramic-text-secondary opacity-50'
          }`} />
        </div>
      )}
    </div>
  );
}
