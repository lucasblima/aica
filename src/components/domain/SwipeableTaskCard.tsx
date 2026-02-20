/**
 * SwipeableTaskCard Component
 *
 * Mobile-first task card with swipe-to-complete gesture.
 * Replaces the embedded TaskCard in PriorityMatrix.
 *
 * Features:
 * - Swipe right past 80px threshold -> green background -> complete
 * - Checkbox always visible (not hidden behind hover)
 * - Card body tappable -> opens TaskBottomSheet
 * - Drag handle (GripVertical) separate touch zone for dnd-kit
 * - Completion animation with green pulse -> height collapse
 * - Quadrant color border when showQuadrantBorder is true
 * - RecurrenceChip when task.recurrence_rule is present
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Clock, Check, Repeat } from 'lucide-react';
import type { Task, Quadrant } from '@/types';
import { QUADRANT_COLORS } from '@/constants/quadrantColors';
import { springPress } from '@/lib/animations/ceramic-motion';

const SWIPE_THRESHOLD = 80;

interface SwipeableTaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  showQuadrantBorder?: boolean;
  compact?: boolean;
}

/** Small chip showing recurrence rule */
const RecurrenceChip: React.FC<{ rule: string }> = ({ rule }) => {
  const label = rule.includes('DAILY')
    ? 'Diário'
    : rule.includes('WEEKLY')
      ? 'Semanal'
      : rule.includes('MONTHLY')
        ? 'Mensal'
        : 'Recorrente';

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold">
      <Repeat className="w-2.5 h-2.5" />
      {label}
    </span>
  );
};

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task,
  onOpen,
  onComplete,
  showQuadrantBorder = false,
  compact = false,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

  // dnd-kit sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Swipe-to-complete
  const x = useMotionValue(0);
  const swipeBg = useTransform(x, [0, SWIPE_THRESHOLD], ['rgba(34,197,94,0)', 'rgba(34,197,94,0.15)']);
  const checkScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1]);
  const checkOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0, 0.3, 1]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > SWIPE_THRESHOLD) {
        setIsCompleting(true);
        onComplete(task);
      }
    },
    [task, onComplete]
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsCompleting(true);
      onComplete(task);
    },
    [task, onComplete]
  );

  const handleCardClick = useCallback(() => {
    if (!isCompleting) {
      onOpen(task);
    }
  }, [task, onOpen, isCompleting]);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const quadrant = task.priority_quadrant as Quadrant | undefined;
  const borderClass = showQuadrantBorder && quadrant
    ? QUADRANT_COLORS[quadrant]?.border ?? 'border-l-amber-400'
    : 'border-l-amber-400';

  return (
    <AnimatePresence>
      {!isCompleting ? (
        <div ref={setNodeRef} style={sortableStyle}>
          {/* Swipe background layer */}
          <motion.div
            className="relative mb-2 rounded-xl overflow-hidden"
            style={{ backgroundColor: swipeBg }}
          >
            {/* Green check icon revealed on swipe */}
            <motion.div
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
              style={{ scale: checkScale, opacity: checkOpacity }}
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>

            {/* The card itself */}
            <motion.div
              className={`ceramic-card ${compact ? 'p-2' : 'p-3'} bg-[#F7F6F4] border-l-4 ${borderClass} shadow-sm cursor-pointer active:scale-[0.98] transition-transform`}
              drag="x"
              dragConstraints={{ left: 0, right: 200 }}
              dragElastic={0.1}
              dragSnapToOrigin
              onDragEnd={handleDragEnd}
              style={{ x }}
              onClick={handleCardClick}
            >
              <div className="flex items-start gap-2">
                {/* Checkbox - always visible */}
                <button
                  onClick={handleCheckboxClick}
                  className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 border-ceramic-text-secondary/30 hover:border-green-500 hover:scale-110 flex items-center justify-center transition-all"
                  title="Concluir tarefa"
                >
                  <Check className="w-3 h-3 text-ceramic-text-secondary/30" />
                </button>

                {/* Drag handle - separate touch zone */}
                <div
                  className="cursor-grab active:cursor-grabbing touch-none"
                  {...attributes}
                  {...listeners}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4 text-ceramic-text-secondary/40 mt-0.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-ceramic-text-primary truncate`}>
                    {task.title}
                  </h4>
                  {!compact && task.associations && (
                    <p className="text-xs text-ceramic-text-secondary truncate">
                      {task.associations.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.due_date && (
                      <span
                        className={`text-xs flex items-center gap-1 ${
                          isOverdue ? 'text-ceramic-error' : 'text-ceramic-text-secondary'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {!compact && task.estimated_duration && (
                      <span className="text-xs text-ceramic-text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimated_duration}min
                      </span>
                    )}
                    {task.recurrence_rule && <RecurrenceChip rule={task.recurrence_rule} />}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      ) : (
        /* Completing animation: green pulse then collapse */
        <motion.div
          key={`completing-${task.id}`}
          initial={{ opacity: 1, height: 'auto' }}
          animate={{
            opacity: [1, 1, 0],
            height: [undefined, undefined, 0],
            marginBottom: [8, 8, 0],
          }}
          transition={{ duration: 1.5, times: [0, 0.6, 1] }}
          className="overflow-hidden"
        >
          <div ref={setNodeRef} style={sortableStyle}>
            <div className="ceramic-card p-3 mb-0 bg-green-50 border-l-4 border-l-green-500 shadow-sm">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
                <span className="text-sm font-bold text-green-700 line-through">
                  {task.title}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
