/**
 * SwipeableTaskCard Component
 *
 * Mobile-first task card with swipe-to-complete gesture.
 * Replaces the embedded TaskCard in PriorityMatrix.
 *
 * Features:
 * - Swipe right past 100px threshold -> green background -> complete
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
import { GripVertical, Calendar, Clock, Check, Repeat, ListChecks, CalendarDays } from 'lucide-react';
import { getTagColor } from '@/lib/utils/tagColors';
import type { Task, Quadrant } from '@/types';
import { QUADRANT_COLORS } from '@/constants/quadrantColors';
import { springPress } from '@/lib/animations/ceramic-motion';

const SWIPE_THRESHOLD = 100;

/** Deterministic color palette for associations — pastel tones that feel ceramic */
const ASSOCIATION_COLORS = [
  { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
];

function getAssociationColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return ASSOCIATION_COLORS[Math.abs(hash) % ASSOCIATION_COLORS.length];
}

/** Association badge — colored dot + name */
const AssociationChip: React.FC<{ name: string }> = ({ name }) => {
  const color = getAssociationColor(name);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${color.bg} ${color.text} text-[10px] font-bold leading-tight`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
      {name}
    </span>
  );
};

/** Task type micro-icon */
const TaskTypeIcon: React.FC<{ type?: string }> = ({ type }) => {
  switch (type) {
    case 'list':
      return <ListChecks className="w-3 h-3 text-ceramic-text-secondary/50" />;
    case 'event':
      return <CalendarDays className="w-3 h-3 text-ceramic-text-secondary/50" />;
    default:
      return null; // Default 'task' type — no extra icon needed (checkbox is enough)
  }
};

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

  const safeDateStr = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR');
  };

  const parsedDue = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = parsedDue && !isNaN(parsedDue.getTime()) && parsedDue < new Date();
  const formattedDueDate = safeDateStr(task.due_date);
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
              className={`ceramic-card ${compact ? 'p-2' : 'p-3'} bg-[#F7F6F4] border-l-4 ${borderClass} shadow-[0_1px_4px_rgba(0,0,0,0.06)] cursor-pointer active:scale-[0.98] transition-transform`}
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
                  className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 border-ceramic-text-secondary/50 hover:border-ceramic-success hover:scale-110 flex items-center justify-center transition-all"
                  title="Concluir tarefa"
                />

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
                  {/* Title row with task type icon */}
                  <div className="flex items-center gap-1.5">
                    <TaskTypeIcon type={task.task_type} />
                    <h4 className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-ceramic-text-primary truncate`}>
                      {task.title}
                    </h4>
                  </div>

                  {/* Identity row: association chip + tags */}
                  {(task.associations || (task.tags && task.tags.length > 0)) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {task.associations && <AssociationChip name={task.associations.name} />}
                      {task.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                      {(task.tags?.length || 0) > 3 && (
                        <span className="text-[10px] text-ceramic-text-secondary font-medium">
                          +{(task.tags?.length || 0) - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Checklist progress */}
                  {task.checklist && task.checklist.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-ceramic-border/40 overflow-hidden max-w-[80px]">
                        <div
                          className="h-full rounded-full bg-ceramic-accent/70 transition-all duration-300"
                          style={{ width: `${Math.round((task.checklist.filter(i => i.done).length / task.checklist.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-ceramic-text-secondary/60">
                        {task.checklist.filter(i => i.done).length}/{task.checklist.length}
                      </span>
                    </div>
                  )}

                  {/* Metadata row: date, duration, recurrence */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {formattedDueDate && (
                      <span
                        className={`text-xs flex items-center gap-1 ${
                          isOverdue ? 'text-ceramic-error font-semibold' : 'text-ceramic-text-secondary'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {formattedDueDate}
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
        /* Completing animation: green gradient + spring bounce then collapse */
        <motion.div
          key={`completing-${task.id}`}
          initial={{ opacity: 1, height: 'auto' }}
          animate={{
            opacity: [1, 1, 0],
            height: [undefined, undefined, 0],
            marginBottom: [8, 8, 0],
          }}
          transition={{ duration: 2, times: [0, 0.6, 1] }}
          className="overflow-hidden"
        >
          <div ref={setNodeRef} style={sortableStyle}>
            <div className="ceramic-card p-3 mb-0 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500 shadow-[0_0_12px_rgba(34,197,94,0.2)]">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <Check className="w-3.5 h-3.5 text-white" />
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
