import React, { useState, useEffect } from 'react';
import { Clock, Play, CalendarDays } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../supabaseClient';
import { PomodoroTimer } from './PomodoroTimer';
import { Task } from '../../types';

interface DailyTimelineProps {
    userId: string;
    tasks: Task[];
    isLoading: boolean;
    onRefresh: () => void;
}

const TimelineSlot: React.FC<{ time: string; children?: React.ReactNode }> = ({ time, children }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `timeline-slot-${time}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`absolute left-0 right-0 border-t border-ceramic-text-secondary/10 transition-colors ${isOver ? 'bg-amber-50/50' : ''
                }`}
            style={{ top: children ? undefined : 0, height: '80px' }} // 80px per hour
        >
            {children}
        </div>
    );
};

const DraggableTimelineTask: React.FC<{ task: Task; style: React.CSSProperties; onClick: () => void }> = ({ task, style, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const dragStyle = {
        ...style,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            {...listeners}
            {...attributes}
            className={`absolute left-0 right-0 p-3 cursor-grab active:cursor-grabbing group transition-all
                bg-[#F7F6F4] shadow-md rounded-xl border-l-4 border-amber-400 hover:scale-[1.02]
                ${task.completed_at ? 'opacity-50 grayscale' : ''}
            `}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-ceramic-text-primary truncate">{task.title}</h4>
                    {task.association && (
                        <p className="text-xs text-ceramic-text-secondary truncate">{task.association.name}</p>
                    )}
                    <p className="text-xs text-ceramic-text-secondary font-mono mt-1">
                        {task.scheduled_time} • {task.estimated_duration || 30}min
                    </p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-ceramic-text-primary/5 hover:bg-ceramic-text-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Play className="w-4 h-4 text-ceramic-text-primary ml-0.5" />
                </button>
            </div>
        </div>
    );
};

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ userId, tasks, isLoading, onRefresh }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activePomodoroTask, setActivePomodoroTask] = useState<Task | null>(null);

    // Generate week days centered on selected date
    const getWeekDays = () => {
        const days = [];
        const today = new Date();
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - 3); // 3 days before, current, 3 days after

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const isToday = day.toDateString() === today.toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();

            days.push({
                date: day,
                dayName: day.toLocaleDateString('pt-BR', { weekday: 'short' }),
                dayNumber: day.getDate(),
                isToday,
                isSelected,
                taskCount: 0 // Could be populated if we had data for other days
            });
        }
        return days;
    };

    const weekDays = getWeekDays();

    const handleCompletePomodoro = async () => {
        if (activePomodoroTask) {
            // Mark task as completed
            await supabase
                .from('work_items')
                .update({ completed_at: new Date().toISOString() })
                .eq('id', activePomodoroTask.id);

            setActivePomodoroTask(null);
            onRefresh();
        }
    };

    // Generate timeline hours (8am - 8pm)
    const timelineHours = Array.from({ length: 13 }, (_, i) => i + 8);

    const getTaskPosition = (startTime: string, duration: number) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = (hours - 8) * 60 + minutes;
        const top = (totalMinutes / 60) * 80; // 80px per hour
        const height = (duration / 60) * 80;
        return { top: `${top}px`, height: `${height}px` };
    };

    if (activePomodoroTask) {
        return (
            <div className="fixed inset-0 z-50 bg-ceramic-base/95 backdrop-blur-sm flex items-center justify-center p-4">
                <PomodoroTimer
                    initialMinutes={activePomodoroTask.estimated_duration || 30}
                    taskTitle={activePomodoroTask.title}
                    onComplete={handleCompletePomodoro}
                    onClose={() => setActivePomodoroTask(null)}
                    autoStart={true}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Week Strip */}
            <div className="ceramic-card p-4">
                <div className="flex items-center gap-2 mb-4">
                    <CalendarDays className="w-5 h-5 text-ceramic-text-secondary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary text-etched">
                        Minha Semana
                    </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                    {weekDays.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedDate(day.date)}
                            className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center transition-all ${day.isSelected
                                ? 'ceramic-inset text-ceramic-text-primary scale-105'
                                : 'ceramic-card text-ceramic-text-secondary hover:scale-102'
                                }`}
                        >
                            <span className="text-xs font-bold uppercase">{day.dayName}</span>
                            <span className="text-2xl font-black text-etched">{day.dayNumber}</span>
                            {day.isToday && !day.isSelected && (
                                <div className="w-1.5 h-1.5 bg-ceramic-accent rounded-full mt-1 animate-pulse"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="ceramic-card p-8 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-ceramic-text-secondary/20 border-t-ceramic-text-primary rounded-full animate-spin"></div>
                    <p className="text-ceramic-text-secondary mt-4">Carregando agenda...</p>
                </div>
            ) : (
                <div className="ceramic-card p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-5 h-5 text-ceramic-text-secondary" />
                        <h3 className="text-lg font-black text-ceramic-text-primary text-etched">
                            Linha do Tempo
                        </h3>
                    </div>

                    <div className="relative">
                        {/* Time Labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col">
                            {timelineHours.map((hour) => (
                                <div key={hour} className="h-20 flex items-start text-xs text-ceramic-text-secondary font-mono">
                                    {hour.toString().padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>

                        {/* Timeline Grid */}
                        <div className="ml-20 relative" style={{ height: `${timelineHours.length * 80}px` }}>
                            {/* Hour Lines / Droppable Zones */}
                            {timelineHours.map((hour, idx) => (
                                <div
                                    key={hour}
                                    className="absolute left-0 right-0"
                                    style={{ top: `${idx * 80}px`, height: '80px' }}
                                >
                                    <TimelineSlot time={`${hour.toString().padStart(2, '0')}:00`} />
                                </div>
                            ))}

                            {/* Current Time Indicator */}
                            {(() => {
                                const now = new Date();
                                const isToday = now.toDateString() === selectedDate.toDateString();
                                if (!isToday) return null;

                                const currentHour = now.getHours();
                                const currentMinute = now.getMinutes();
                                if (currentHour < 8 || currentHour > 20) return null;

                                const currentTop = ((currentHour - 8) * 60 + currentMinute) / 60 * 80;
                                return (
                                    <div
                                        className="absolute left-0 right-0 border-t-2 border-ceramic-accent z-10 pointer-events-none"
                                        style={{ top: `${currentTop}px` }}
                                    >
                                        <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-ceramic-accent rounded-full animate-pulse"></div>
                                    </div>
                                );
                            })()}

                            {/* Task Blocks */}
                            {tasks.map((task) => {
                                if (!task.scheduled_time) return null;
                                const position = getTaskPosition(task.scheduled_time, task.estimated_duration || 30);
                                return (
                                    <DraggableTimelineTask
                                        key={task.id}
                                        task={task}
                                        style={position}
                                        onClick={() => setActivePomodoroTask(task)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

