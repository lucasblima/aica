import React, { useState } from 'react';
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Sparkles, Calendar, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Task, Quadrant } from '../../types';

interface QuadrantConfig {
    id: Quadrant;
    title: string;
    subtitle: string;
    color: string;
    bgClass: string;
}

const QUADRANTS: QuadrantConfig[] = [
    {
        id: 'urgent-important',
        title: 'Urgente & Importante',
        subtitle: 'Faça Agora',
        color: '#D97706',
        bgClass: 'bg-gradient-to-br from-red-50 to-amber-50'
    },
    {
        id: 'important',
        title: 'Importante, Não Urgente',
        subtitle: 'Agende',
        color: '#3B82F6',
        bgClass: 'bg-gradient-to-br from-blue-50 to-indigo-50'
    },
    {
        id: 'urgent',
        title: 'Urgente, Não Importante',
        subtitle: 'Delegue',
        color: '#FBBF24',
        bgClass: 'bg-gradient-to-br from-yellow-50 to-amber-50'
    },
    {
        id: 'low',
        title: 'Nem Urgente, Nem Importante',
        subtitle: 'Elimine',
        color: '#9CA3AF',
        bgClass: 'bg-gradient-to-br from-slate-50 to-gray-50'
    }
];

// Sortable Task Card Component
const TaskCard: React.FC<{ task: Task; isDragging?: boolean }> = ({ task, isDragging }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="ceramic-card p-3 mb-2 cursor-move group hover:scale-[1.02] transition-all bg-[#F7F6F4] border-l-4 border-amber-400 shadow-sm"
            {...attributes}
            {...listeners}
        >
            <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-ceramic-text-secondary mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-ceramic-text-primary truncate">
                        {task.title}
                    </h4>
                    {task.association && (
                        <p className="text-xs text-ceramic-text-secondary truncate">
                            {task.association.name}
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-ceramic-text-secondary'}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString('pt-BR')}
                            </span>
                        )}
                        {task.estimated_duration && (
                            <span className="text-xs text-ceramic-text-secondary flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.estimated_duration}min
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Priority Matrix Component
interface PriorityMatrixProps {
    userId: string;
    tasks: Record<Quadrant, Task[]>;
    isLoading: boolean;
    onRefresh: () => void;
}

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({ userId, tasks, isLoading, onRefresh }) => {
    const [isAicaWorking, setIsAicaWorking] = useState(false);

    const handleAicaAuto = async () => {
        setIsAicaWorking(true);
        try {
            // Simple rule-based logic (can be replaced with AI later)
            const allTasks = Object.values(tasks).flat();
            const now = new Date();
            const updates: { id: string; quadrant: Quadrant }[] = [];

            allTasks.forEach(task => {
                let quadrant: Quadrant = 'low';

                if (task.due_date) {
                    const dueDate = new Date(task.due_date);
                    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    const isUrgent = daysUntilDue <= 2;
                    const isImportant = task.estimated_duration && task.estimated_duration > 30;

                    if (isUrgent && isImportant) {
                        quadrant = 'urgent-important';
                    } else if (isImportant) {
                        quadrant = 'important';
                    } else if (isUrgent) {
                        quadrant = 'urgent';
                    }
                } else {
                    // No due date = probably low priority
                    quadrant = 'low';
                }

                updates.push({ id: task.id, quadrant });
            });

            // Batch update
            for (const update of updates) {
                await supabase
                    .from('work_items')
                    .update({ priority_quadrant: update.quadrant })
                    .eq('id', update.id);
            }

            onRefresh();
        } catch (error) {
            console.error('[PriorityMatrix] AICA Auto error:', error);
        } finally {
            setIsAicaWorking(false);
        }
    };

    return (
        <div className="ceramic-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-black text-ceramic-text-primary text-etched">
                        Matriz de Prioridades
                    </h2>
                    <p className="text-xs text-ceramic-text-secondary mt-1">
                        Eisenhower Matrix - Organize por Urgência & Importância
                    </p>
                </div>
                <button
                    onClick={handleAicaAuto}
                    disabled={isAicaWorking || isLoading}
                    className="ceramic-card px-4 py-2 flex items-center gap-2 text-ceramic-text-primary font-bold hover:scale-105 transition-all disabled:opacity-50"
                >
                    <Sparkles className={`w-4 h-4 ${isAicaWorking ? 'animate-spin' : ''}`} />
                    AICA Auto
                </button>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUADRANTS.map(quadrant => (
                    <SortableContext
                        key={quadrant.id}
                        id={quadrant.id}
                        items={tasks[quadrant.id].map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div
                            className="ceramic-tray p-4 min-h-[200px] rounded-2xl transition-colors hover:bg-opacity-80"
                            style={{ borderTop: `4px solid ${quadrant.color}` }}
                        >
                            {/* Quadrant Header */}
                            <div className="mb-4">
                                <h3 className="text-sm font-black text-ceramic-text-primary uppercase tracking-wide">
                                    {quadrant.title}
                                </h3>
                                <p className="text-xs text-ceramic-text-secondary">
                                    {quadrant.subtitle} • {tasks[quadrant.id].length} tarefas
                                </p>
                            </div>

                            {/* Task List */}
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[1, 2].map(i => (
                                        <div key={i} className="ceramic-card p-3 animate-pulse">
                                            <div className="h-4 bg-ceramic-text-secondary/10 rounded w-3/4 mb-2"></div>
                                            <div className="h-3 bg-ceramic-text-secondary/10 rounded w-1/2"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : tasks[quadrant.id].length === 0 ? (
                                <div className="text-center py-8 text-ceramic-text-secondary text-sm">
                                    Arraste tarefas para cá
                                </div>
                            ) : (
                                tasks[quadrant.id].map(task => (
                                    <TaskCard key={task.id} task={task} />
                                ))
                            )}
                        </div>
                    </SortableContext>
                ))}
            </div>
        </div>
    );
};
