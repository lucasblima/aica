/**
 * CanvasEditorDrawer
 *
 * Top header bar of the Canvas editor: athlete info, calendar controls,
 * view toggle, week navigation, load calculator, and publish button.
 */

import React from 'react';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import type { Athlete } from '../../types/flux';
import { PublishWhatsAppButton } from './PublishWhatsAppButton';
import type { WorkoutBlockData } from './WorkoutBlock';

// ============================================
// Constants
// ============================================

const MODALITY_PT_LABELS: Record<string, string> = {
  swimming: 'Natacao',
  running: 'Corrida',
  cycling: 'Ciclismo',
  strength: 'Musculacao',
  walking: 'Caminhada',
};

// ============================================
// Sub-components
// ============================================

type ViewMode = 'weekly' | 'microcycle';
type SyncState = 'disconnected' | 'readonly' | 'ready' | 'syncing' | 'done';

interface CalendarToolbarProps {
  isConnected: boolean;
  athleteCalendarConnected: boolean;
  showCoach: boolean;
  showAthlete: boolean;
  toggleCoach: () => void;
  toggleAthlete: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  isConnected,
  athleteCalendarConnected,
  showCoach,
  showAthlete,
  toggleCoach,
  toggleAthlete,
  onRefresh,
  isLoading,
}) => {
  if (!isConnected && !athleteCalendarConnected) return null;

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <Calendar className="w-3.5 h-3.5 text-ceramic-text-secondary" />
      {isConnected && (
        <button
          onClick={toggleCoach}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${
            showCoach
              ? 'bg-[#7B8FA2]/15 text-[#5F7185]'
              : 'bg-ceramic-text-secondary/5 text-ceramic-text-tertiary'
          }`}
        >
          {showCoach ? <Eye size={10} /> : <EyeOff size={10} />}
          Coach
        </button>
      )}
      {athleteCalendarConnected && (
        <button
          onClick={toggleAthlete}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${
            showAthlete
              ? 'bg-[#C4883A]/15 text-[#A06B2E]'
              : 'bg-ceramic-text-secondary/5 text-ceramic-text-tertiary'
          }`}
        >
          {showAthlete ? <Eye size={10} /> : <EyeOff size={10} />}
          Atleta
        </button>
      )}
      <button
        onClick={onRefresh}
        className="p-1 rounded-lg hover:bg-ceramic-text-secondary/10 transition-colors"
        title="Sincronizar calendarios"
      >
        <RefreshCw
          className={`w-3 h-3 text-ceramic-text-secondary ${isLoading ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  );
};

interface CalendarSyncStatusProps {
  syncState: SyncState;
  isSyncing: boolean;
  syncStats: { synced: number; skipped: number; failed: number } | null;
  onUpgradeScope: () => void;
  onBulkSync: () => void;
}

const CalendarSyncStatus: React.FC<CalendarSyncStatusProps> = ({
  syncState,
  isSyncing,
  syncStats,
  onUpgradeScope,
  onBulkSync,
}) => {
  if (syncState === 'disconnected') return null;

  if (syncState === 'readonly') {
    return (
      <button
        onClick={onUpgradeScope}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider transition-all bg-amber-100 text-amber-700 hover:bg-amber-200"
        title="Autorize escrita no Google Calendar para sincronizar treinos"
      >
        <ShieldAlert size={12} />
        Autorizar escrita
      </button>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider bg-ceramic-info/10 text-ceramic-info">
        <Loader2 size={12} className="animate-spin" />
        Sincronizando...
      </div>
    );
  }

  if (syncStats) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider bg-ceramic-success/10 text-ceramic-success">
          <Check size={12} />
          {syncStats.synced} sync
          {syncStats.failed > 0 && ` · ${syncStats.failed} erro(s)`}
        </div>
        <button
          onClick={onBulkSync}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-ceramic-text-secondary/10"
          style={{
            boxShadow:
              'inset 1px 1px 3px rgba(163,158,145,0.15), inset -1px -1px 3px rgba(255,255,255,0.85)',
          }}
          title="Sincronizar todos os treinos com Google Calendar"
        >
          <Upload size={11} />
          Sync
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider text-ceramic-success"
        title="Google Calendar sincronizado com permissao de escrita"
      >
        <CalendarCheck size={12} />
        GCal
      </div>
      <button
        onClick={onBulkSync}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-ceramic-text-secondary/10"
        style={{
          boxShadow:
            'inset 1px 1px 3px rgba(163,158,145,0.15), inset -1px -1px 3px rgba(255,255,255,0.85)',
        }}
        title="Sincronizar todos os treinos com Google Calendar"
      >
        <Upload size={11} />
        Sync tudo
      </button>
    </div>
  );
};

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => (
  <div
    className="flex rounded-[12px] p-1"
    style={{
      boxShadow:
        'inset 2px 2px 5px rgba(163,158,145,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)',
    }}
  >
    <button
      onClick={() => onChange('weekly')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
        mode === 'weekly'
          ? 'bg-ceramic-base text-ceramic-text-primary'
          : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
      }`}
      style={
        mode === 'weekly'
          ? {
              boxShadow:
                '2px 2px 6px rgba(163,158,145,0.15), -2px -2px 6px rgba(255,255,255,0.9)',
            }
          : {}
      }
    >
      <List size={11} />
      Semana
    </button>
    <button
      onClick={() => onChange('microcycle')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider transition-all ${
        mode === 'microcycle'
          ? 'bg-ceramic-base text-ceramic-text-primary'
          : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary'
      }`}
      style={
        mode === 'microcycle'
          ? {
              boxShadow:
                '2px 2px 6px rgba(163,158,145,0.15), -2px -2px 6px rgba(255,255,255,0.9)',
            }
          : {}
      }
    >
      <LayoutGrid size={11} />
      Microciclo
    </button>
  </div>
);

// ============================================
// CanvasEditorDrawer (exported)
// ============================================

interface WeekWorkoutForPublish {
  id: string;
  name: string;
  duration: number;
  intensity: string;
  modality: string;
  type: string;
}

export interface CanvasEditorDrawerProps {
  athlete: Athlete | undefined;
  currentWeek: number;
  setCurrentWeek: React.Dispatch<React.SetStateAction<number>>;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeMicrocycleName: string | undefined;
  weekWorkoutsForPublish: WeekWorkoutForPublish[];
  microcycleId: string | undefined;
  // Calendar
  calendarConnected: boolean;
  athleteCalendarConnected: boolean;
  showCoach: boolean;
  showAthlete: boolean;
  toggleCoach: () => void;
  toggleAthlete: () => void;
  calendarLoading: boolean;
  refreshCalendar: () => void;
  // Sync
  calSyncState: SyncState;
  calSyncing: boolean;
  calSyncStats: { synced: number; skipped: number; failed: number } | null;
  requestScopeUpgrade: () => void;
  handleBulkSync: () => void;
  // Actions
  onBack: () => void;
  onOpenCalculator: () => void;
}

export const CanvasEditorDrawer: React.FC<CanvasEditorDrawerProps> = ({
  athlete,
  currentWeek,
  setCurrentWeek,
  viewMode,
  setViewMode,
  activeMicrocycleName,
  weekWorkoutsForPublish,
  microcycleId,
  calendarConnected,
  athleteCalendarConnected,
  showCoach,
  showAthlete,
  toggleCoach,
  toggleAthlete,
  calendarLoading,
  refreshCalendar,
  calSyncState,
  calSyncing,
  calSyncStats,
  requestScopeUpgrade,
  handleBulkSync,
  onBack,
  onOpenCalculator,
}) => {
  return (
    <div className="p-6 border-b border-ceramic-text-secondary/10 bg-ceramic-base flex-shrink-0">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
      >
        <div
          className="w-8 h-8 flex items-center justify-center rounded-[10px]"
          style={{
            boxShadow:
              'inset 2px 2px 4px rgba(163,158,145,0.2), inset -2px -2px 4px rgba(255,255,255,0.9)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
      </button>

      <div className="flex items-center justify-between">
        {/* Athlete Info */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center text-2xl"
            style={{
              background: '#F0EFE9',
              boxShadow:
                '3px 3px 8px rgba(163,158,145,0.15), -3px -3px 8px rgba(255,255,255,0.9)',
            }}
          >
            {athlete?.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)}
          </div>
          <div>
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-0.5">
              Canvas de Prescricao
            </p>
            <h1 className="text-2xl font-black text-ceramic-text-primary">
              {athlete?.name}
            </h1>
            <p className="text-sm text-ceramic-text-secondary mt-0.5">
              Semana {currentWeek} / Microciclo
              {activeMicrocycleName && ` · ${activeMicrocycleName}`}
              {' · '}
              {MODALITY_PT_LABELS[athlete?.modality || ''] || athlete?.modality}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <CalendarToolbar
            isConnected={calendarConnected}
            athleteCalendarConnected={athleteCalendarConnected}
            showCoach={showCoach}
            showAthlete={showAthlete}
            toggleCoach={toggleCoach}
            toggleAthlete={toggleAthlete}
            onRefresh={refreshCalendar}
            isLoading={calendarLoading}
          />

          <CalendarSyncStatus
            syncState={calSyncState}
            isSyncing={calSyncing}
            syncStats={calSyncStats}
            onUpgradeScope={requestScopeUpgrade}
            onBulkSync={handleBulkSync}
          />

          <ViewToggle mode={viewMode} onChange={setViewMode} />

          {viewMode === 'weekly' && (
            <div
              className="flex items-center gap-1 px-3 py-2 rounded-[14px]"
              style={{
                background: '#F0EFE9',
                boxShadow:
                  '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
              }}
            >
              <button
                onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}
                disabled={currentWeek === 1}
                className="p-1.5 disabled:opacity-30 hover:bg-ceramic-text-secondary/10 transition-colors rounded-lg"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                }}
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-ceramic-text-primary px-3 min-w-[100px] text-center">
                Semana {currentWeek} / 3
              </span>
              <button
                onClick={() => setCurrentWeek((w) => Math.min(3, w + 1))}
                disabled={currentWeek === 3}
                className="p-1.5 disabled:opacity-30 hover:bg-ceramic-text-secondary/10 transition-colors rounded-lg"
                style={{
                  boxShadow:
                    'inset 2px 2px 4px rgba(163,158,145,0.15), inset -2px -2px 4px rgba(255,255,255,0.85)',
                }}
                title="Proxima semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-2 px-4 py-2 rounded-[14px] transition-transform hover:scale-105"
            style={{
              background: '#F0EFE9',
              boxShadow:
                '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
            }}
          >
            <Calculator className="w-4 h-4 text-[#7B8FA2]" />
            <span className="text-sm font-bold text-ceramic-text-primary">
              Calcular Cargas
            </span>
          </button>

          {athlete && (
            <PublishWhatsAppButton
              athleteId={athlete.id}
              athleteName={athlete.name}
              athletePhone={athlete.phone}
              weekNumber={currentWeek}
              weekWorkouts={weekWorkoutsForPublish as WorkoutBlockData[]}
              microcycleId={microcycleId}
              onPublishSuccess={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
};
