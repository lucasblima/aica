/**
 * DraggableTemplate - Draggable workout template for MicrocycleEditor
 *
 * Uses @dnd-kit for drag-and-drop functionality
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { WorkoutTemplate } from '../types/flow';

interface DraggableTemplateProps {
  template: WorkoutTemplate;
  isDragging?: boolean;
}

export function DraggableTemplate({ template, isDragging = false }: DraggableTemplateProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id: template.id,
    data: {
      type: 'template',
      template,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isActiveDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 ceramic-card cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform ${
        isActiveDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-ceramic-text-secondary mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ceramic-text-primary line-clamp-1">
            {template.name}
          </p>
          <p className="text-xs text-ceramic-text-secondary">
            {template.duration}min • {template.intensity}
          </p>
          {template.category && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-ceramic-accent/10 text-ceramic-accent text-[10px] font-medium rounded">
              {template.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
