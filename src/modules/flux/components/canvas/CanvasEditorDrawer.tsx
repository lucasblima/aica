/**
 * CanvasEditorDrawer
 *
 * Top header bar of the Canvas editor: athlete info, Google Calendar status,
 * view toggle, week navigation (all weeks visible), and WhatsApp send button.
 */

import React from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle,
  LayoutGrid,
  List,
  Loader2,
  Send,
  ShieldAlert,
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
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider bg-ceramic-success/10 text-ceramic-success">
        <Check size={12} />
        Google Calendar · {syncStats.synced} sync
        {syncStats.failed > 0 && ` · ${syncStats.failed} erro(s)`}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] text-[10px] font-bold uppercase tracking-wider text-ceramic-success"
      title="Google Calendar sincronizado com permissao de escrita"
    >
      <CalendarCheck size={12} />
      Google Calendar
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
      Resumo do Mes
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
  microcycleStatus?: string;
  onReleaseMicrocycle?: () => void;
  isReleasing?: boolean;
  // Calendar (kept for data layer, toggles removed from UI)
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
  microcycleStatus,
  onReleaseMicrocycle,
  isReleasing,
  calSyncState,
  calSyncing,
  calSyncStats,
  requestScopeUpgrade,
  handleBulkSync,
  onBack,
}) => {
  return (
    <div className="border-b border-ceramic-text-secondary/10 bg-ceramic-base flex-shrink-0">
      {/* Top row: back + athlete info + actions */}
      <div className="p-6 pb-3">
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
                Semana {currentWeek} / Ciclo
                {activeMicrocycleName && ` · ${activeMicrocycleName}`}
                {' · '}
                {MODALITY_PT_LABELS[athlete?.modality || ''] || athlete?.modality}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <CalendarSyncStatus
              syncState={calSyncState}
              isSyncing={calSyncing}
              syncStats={calSyncStats}
              onUpgradeScope={requestScopeUpgrade}
              onBulkSync={handleBulkSync}
            />

            <ViewToggle mode={viewMode} onChange={setViewMode} />

            {/* Liberar Treino / Status Badge */}
            {microcycleStatus === 'draft' && onReleaseMicrocycle && (
              <button
                onClick={onReleaseMicrocycle}
                disabled={isReleasing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition-all"
              >
                {isReleasing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isReleasing ? 'Liberando...' : 'Liberar Treino'}
              </button>
            )}
            {microcycleStatus === 'active' && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/15 text-green-600 rounded-full text-xs font-bold uppercase tracking-wider">
                <CheckCircle className="w-3.5 h-3.5" />
                Liberado
              </span>
            )}

            {/* WhatsApp Enviar Treino button */}
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

      {/* Bottom row: Week tabs (all weeks visible) */}
      {viewMode === 'weekly' && (
        <div className="px-6 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ceramic-text-secondary font-bold uppercase tracking-wider mr-1">
              Semana
            </span>
            {[1, 2, 3, 4].map((week) => (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`px-4 py-2 rounded-[12px] text-sm font-bold transition-all ${
                  currentWeek === week
                    ? 'bg-ceramic-base text-ceramic-text-primary'
                    : 'text-ceramic-text-tertiary hover:text-ceramic-text-secondary hover:bg-ceramic-text-secondary/5'
                }`}
                style={
                  currentWeek === week
                    ? {
                        boxShadow:
                          '3px 3px 8px rgba(163,158,145,0.12), -3px -3px 8px rgba(255,255,255,0.9)',
                      }
                    : {}
                }
              >
                Semana {week}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
