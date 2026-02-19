/**
 * CanvasGridContainer
 *
 * Center panel of the Canvas editor: displays either WeeklyGrid or MicrocycleGrid
 * with animated transitions between views.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WeeklyGrid } from './WeeklyGrid';
import { MicrocycleGrid } from './MicrocycleGrid';
import type { WeekWorkout } from './WeeklyGrid';
import type { BusySlot } from '../../hooks/useCanvasCalendar';

interface Microcycle {
  id: string;
  name?: string;
  start_date: string;
  week_1_focus?: string;
}

interface CanvasGridContainerProps {
  viewMode: 'weekly' | 'microcycle';
  currentWeek: number;
  weekStartDate: Date;
  gridWorkouts: WeekWorkout[];
  workoutsByWeek: Record<number, WeekWorkout[]>;
  busySlots: BusySlot[];
  activeMicrocycle: Microcycle | null;
  isLoading: boolean;
  onWorkoutClick: (workoutId: string) => void;
  onWorkoutDelete: (workoutId: string) => void;
  onEmptySlotClick: (dayOfWeek: number, startTime: string) => void;
  onDropWorkout: (dayOfWeek: number, startTime: string, templateData: string) => void;
  onReorderWorkout: (workoutId: string, fromDay: number, toDay: number, toTime: string) => void;
  onMicrocycleDropWorkout: (weekNumber: number, dayOfWeek: number, templateData: string) => void;
  onWeekClick: (weekNumber: number) => void;
}

export const CanvasGridContainer: React.FC<CanvasGridContainerProps> = ({
  viewMode,
  currentWeek,
  weekStartDate,
  gridWorkouts,
  workoutsByWeek,
  busySlots,
  activeMicrocycle,
  isLoading,
  onWorkoutClick,
  onWorkoutDelete,
  onEmptySlotClick,
  onDropWorkout,
  onReorderWorkout,
  onMicrocycleDropWorkout,
  onWeekClick,
}) => {
  return (
    <div className="flex-1 overflow-auto">
      <AnimatePresence mode="wait">
        {viewMode === 'weekly' ? (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <WeeklyGrid
              weekNumber={currentWeek}
              workouts={gridWorkouts}
              calendarEvents={busySlots}
              onWorkoutClick={onWorkoutClick}
              onWorkoutDelete={onWorkoutDelete}
              onEmptySlotClick={onEmptySlotClick}
              onDropWorkout={onDropWorkout}
              onReorderWorkout={onReorderWorkout}
              startDate={weekStartDate}
              isLoading={isLoading}
            />
          </motion.div>
        ) : (
          <motion.div
            key="microcycle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {activeMicrocycle ? (
              <MicrocycleGrid
                microcycle={{
                  id: activeMicrocycle.id,
                  title: activeMicrocycle.name || 'Microciclo',
                  start_date: activeMicrocycle.start_date,
                  focus: activeMicrocycle.week_1_focus || '',
                }}
                workoutsByWeek={workoutsByWeek}
                calendarEvents={busySlots}
                currentWeek={currentWeek}
                onWorkoutClick={onWorkoutClick}
                onDropWorkout={onMicrocycleDropWorkout}
                onWeekClick={onWeekClick}
                isLoading={isLoading}
              />
            ) : (
              <MicrocycleGrid
                microcycle={{
                  id: '',
                  title: 'Carregando Microciclo...',
                  start_date: new Date().toISOString(),
                  focus: '',
                }}
                workoutsByWeek={{ 1: [], 2: [], 3: [] }}
                currentWeek={currentWeek}
                onWeekClick={onWeekClick}
                isLoading={true}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
