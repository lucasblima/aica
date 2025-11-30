import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle2, Circle, CalendarDays } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { PomodoroTimer } from './PomodoroTimer';

interface TimeBlock {
    id: string;
    title: string;
    startTime: string; // HH:MM format
    duration: number; // minutes
    priority: string;
    association?: { name: string };
    completed: boolean;
}

interface DailyTimelineProps {
    userId: string;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ userId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [anyTimeTasks, setAnyTimeTasks] = useState<TimeBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePomodoroTask, setActivePomodoroTask] = useState<TimeBlock | null>(null);

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
                taskCount: 0 // Will be populated by data
            });
        }
        return days;
    };

    const weekDays = getWeekDays();

    useEffect(() => {
        loadDayTasks();
    }, [selectedDate, userId]);

    const loadDayTasks = async () => {
        try {
            setIsLoading(true);
            const dateStr = selectedDate.toISOString().split('T')[0];

            // Fetch work items for the selected date
            const { data: tasks, error } = await supabase
                .from('work_items')
                .select(`
                    *,
                    association:associations(name)
                `)
                .eq('due_date', dateStr)
                .eq('archived', false)
                .order('due_date', { ascending: true });

            if (error) throw error;

            // Separate tasks with time vs anytime
            const scheduled: TimeBlock[] = [];
            const anytime: TimeBlock[] = [];

            tasks?.forEach((task: any) => {
                const block: TimeBlock = {
                    id: task.id,
                    title: task.title,
                    startTime: task.scheduled_time || '',
                    duration: task.estimated_duration || task.estimate_hours * 60 || 30,
                    priority: task.priority || 'medium',
                    association: task.association,
                    completed: !!task.completed_at
                };

                if (task.scheduled_time) {
                    scheduled.push(block);
                } else {
                    anytime.push(block);
                }
            });

            setTimeBlocks(scheduled);
            setAnyTimeTasks(anytime);
        } catch (error) {
            console.error('[DailyTimeline] Error loading tasks:', error);
            setTimeBlocks([]);
            setAnyTimeTasks([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlayTask = (task: TimeBlock) => {
        setActivePomodoroTask(task);
    };

    const handleCompletePomodoro = async () => {
        if (activePomodoroTask) {
            // Mark task as completed
            await supabase
                .from('work_items')
                .update({ completed_at: new Date().toISOString() })
                .eq('id', activePomodoroTask.id);

            setActivePomodoroTask(null);
            loadDayTasks(); // Refresh
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500 border-red-600';
            case 'high': return 'bg-amber-500 border-amber-600';
            case 'medium': return 'bg-blue-500 border-blue-600';
            case 'low': return 'bg-slate-400 border-slate-500';
            default: return 'bg-ceramic-text-secondary border-ceramic-text-primary';
        }
    };

    if (activePomodoroTask) {
        return (
            <div className="fixed inset-0 z-50 bg-ceramic-base/95 backdrop-blur-sm flex items-center justify-center p-4">
                <PomodoroTimer
                    initialMinutes={activePomodoroTask.duration}
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
                            {day.taskCount > 0 && (
                                <div className="w-1.5 h-1.5 bg-ceramic-accent rounded-full mt-1"></div>
                            )}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Timeline View */}
                    <div className="lg:col-span-2 ceramic-card p-6">
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
                                {/* Hour Lines */}
                                {timelineHours.map((hour, idx) => (
                                    <div
                                        key={hour}
                                        className="absolute left-0 right-0 border-t border-ceramic-text-secondary/10"
                                        style={{ top: `${idx * 80}px` }}
                                    />
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
                                            className="absolute left-0 right-0 border-t-2 border-ceramic-accent z-10"
                                            style={{ top: `${currentTop}px` }}
                                        >
                                            <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-ceramic-accent rounded-full animate-pulse"></div>
                                        </div>
                                    );
                                })()}

                                {/* Task Blocks */}
                                {timeBlocks.map((block) => {
                                    const position = getTaskPosition(block.startTime, block.duration);
                                    return (
                                        <div
                                            key={block.id}
                                            className={`absolute left-0 right-0 rounded-lg p-3 transition-all hover:scale-[1.02] cursor-pointer group ${block.completed ? 'opacity-50' : ''
                                                } ${getPriorityColor(block.priority)}`}
                                            style={position}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-white truncate">{block.title}</h4>
                                                    {block.association && (
                                                        <p className="text-xs text-white/80 truncate">{block.association.name}</p>
                                                    )}
                                                    <p className="text-xs text-white/60 font-mono mt-1">
                                                        {block.startTime} • {block.duration}min
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePlayTask(block);
                                                    }}
                                                    className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Play className="w-4 h-4 text-white ml-0.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Anytime Tasks */}
                    <div className="ceramic-card p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Circle className="w-5 h-5 text-ceramic-text-secondary" />
                            <h3 className="text-lg font-black text-ceramic-text-primary text-etched">
                                A Fazer
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {anyTimeTasks.length === 0 ? (
                                <p className="text-ceramic-text-secondary text-sm text-center py-8">
                                    Nenhuma tarefa sem horário definido.
                                </p>
                            ) : (
                                anyTimeTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`ceramic-card p-4 hover:scale-[1.02] transition-all cursor-pointer group ${task.completed ? 'opacity-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-1 h-full rounded-full ${getPriorityColor(task.priority)} flex-shrink-0`}></div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-ceramic-text-primary truncate">{task.title}</h4>
                                                {task.association && (
                                                    <p className="text-xs text-ceramic-text-secondary truncate">{task.association.name}</p>
                                                )}
                                                <p className="text-xs text-ceramic-text-secondary mt-1">
                                                    {task.duration}min
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePlayTask(task);
                                                }}
                                                className="flex-shrink-0 w-10 h-10 rounded-full ceramic-inset flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Play className="w-4 h-4 text-ceramic-text-primary ml-0.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
