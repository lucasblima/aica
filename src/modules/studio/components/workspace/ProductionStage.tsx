/**
 * ProductionStage - Recording Interface
 *
 * Complete recording interface with timer, controls, topics checklist, and teleprompter.
 * Provides accessible recording controls with proper ARIA labels, keyboard shortcuts,
 * and screen reader support.
 *
 * Migration Note: Migrated from _deprecated/modules/podcast/components/stages/ProductionStage.tsx
 * Wave 5 - Stream 3: Production & Supporting Components Migration
 *
 * Accessibility Features:
 * - ARIA labels for all icon-only buttons
 * - aria-live regions for recording timer and status
 * - aria-pressed states for toggle buttons
 * - Keyboard shortcuts documented via aria-keyshortcuts
 * - Focus management for interactive elements
 * - Screen reader announcements for state changes
 *
 * Design System: Ceramic Design System
 * - Surface: bg-ceramic-surface, bg-white
 * - Text: text-ceramic-primary, text-ceramic-secondary
 * - Borders: border-ceramic-border
 * - Interactive: bg-ceramic-danger (recording), bg-ceramic-warning (paused)
 * - Spacing: Ceramic spacing scale
 *
 * @see PodcastWorkspaceContext for state management
 * @see ProductionState for recording state types
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { TeleprompterWindow } from '../TeleprompterWindow';
import {
  Mic,
  Play,
  Pause,
  Square,
  Monitor,
  ChevronDown,
  Radio,
  AlertCircle,
  CheckCircle2,
  Clock,
  Snowflake,
  Gift,
} from 'lucide-react';

// Category configuration for visual styling
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; emoji: string; bgColor: string }> = {
  'geral': { icon: Mic, emoji: '🎤', bgColor: 'bg-ceramic-info-bg' },
  'quebra-gelo': { icon: Snowflake, emoji: '❄️', bgColor: 'bg-cyan-50' },
  'patrocinador': { icon: Gift, emoji: '🎁', bgColor: 'bg-amber-50' },
  'polêmicas': { icon: AlertCircle, emoji: '⚠️', bgColor: 'bg-ceramic-error-bg' },
};

export default function ProductionStage() {
  const { state, actions } = usePodcastWorkspace();
  const { production, pauta, setup } = state;

  // Local state for teleprompter and timer
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const topicsListRef = useRef<HTMLDivElement>(null);

  // Timer effect - updates duration every second when recording and not paused
  useEffect(() => {
    if (production.isRecording && !production.isPaused && production.startedAt) {
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor(
          (Date.now() - production.startedAt!.getTime()) / 1000
        );
        actions.updateDuration(elapsedSeconds);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [production.isRecording, production.isPaused, production.startedAt, actions]);

  // Auto-scroll to current topic
  useEffect(() => {
    if (topicsListRef.current && production.currentTopicId) {
      const currentElement = topicsListRef.current.querySelector(
        `[data-topic-id="${production.currentTopicId}"]`
      );
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [production.currentTopicId]);

  // Format duration as HH:MM:SS
  const formatDuration = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle recording start
  const handleStartRecording = () => {
    actions.startRecording();
  };

  // Handle pause/resume
  const handleTogglePause = () => {
    if (production.isPaused) {
      actions.resumeRecording();
    } else {
      actions.pauseRecording();
    }
  };

  // Handle stop recording
  const handleStopRecording = () => {
    actions.stopRecording();
  };

  // Handle topic completion
  const handleTopicComplete = (topicId: string) => {
    actions.updateTopic(topicId, { completed: true });

    // Move to next uncompleted topic
    const currentIndex = pauta.topics.findIndex((t) => t.id === topicId);
    if (currentIndex !== -1 && currentIndex < pauta.topics.length - 1) {
      const nextUncompleted = pauta.topics.findIndex(
        (t, idx) => idx > currentIndex && !t.completed
      );
      if (nextUncompleted !== -1) {
        actions.setCurrentTopic(pauta.topics[nextUncompleted].id);
      }
    }
  };

  // Handle topic selection
  const handleSelectTopic = (topicId: string) => {
    actions.setCurrentTopic(topicId);
    const index = pauta.topics.findIndex((t) => t.id === topicId);
    if (index !== -1) {
      setCurrentTopicIndex(index);
    }
  };

  // Handle next topic button
  const handleNextTopic = () => {
    if (currentTopicIndex < pauta.topics.length - 1) {
      setCurrentTopicIndex(currentTopicIndex + 1);
      actions.setCurrentTopic(pauta.topics[currentTopicIndex + 1].id);
    }
  };

  // Handle teleprompter close
  const handleCloseTeleprompter = () => {
    setShowTeleprompter(false);
  };

  // Handle teleprompter topic change
  const handleTeleprompterIndexChange = (index: number) => {
    setCurrentTopicIndex(index);
    actions.setCurrentTopic(pauta.topics[index].id);
  };

  // Get current topic
  const currentTopic = pauta.topics[currentTopicIndex];
  const completedCount = pauta.topics.filter((t) => t.completed).length;

  // Show teleprompter if toggled
  if (showTeleprompter && pauta.topics.length > 0) {
    return (
      <TeleprompterWindow
        topics={pauta.topics}
        currentIndex={currentTopicIndex}
        onIndexChange={handleTeleprompterIndexChange}
        onClose={handleCloseTeleprompter}
      />
    );
  }

  return (
    <div className="flex h-full bg-ceramic-surface">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-ceramic-base border-b border-ceramic-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Mic className="w-6 h-6 text-orange-600" />
                </div>
                <h1 className="text-3xl font-bold text-ceramic-primary">Gravação do Episódio</h1>
              </div>
              <p className="text-ceramic-secondary">
                {setup.guestName && `Convidado: ${setup.guestName}`}
              </p>
            </div>

            {/* Recording status indicator with aria-live */}
            {production.isRecording && (
              <div
                className="flex items-center space-x-2"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="w-3 h-3 rounded-full bg-ceramic-danger animate-pulse" />
                <span className="text-sm font-semibold text-ceramic-danger">
                  {production.isPaused ? 'PAUSADO' : 'GRAVANDO'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-8">
          {/* Central Control Area */}
          <div className="bg-ceramic-base rounded-lg shadow-sm p-12 mb-8 flex-none">
            {/* Timer Display with aria-live for screen readers */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-4 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200 mb-6">
                <Clock className="w-8 h-8 text-orange-600" aria-hidden="true" />
                <div
                  className="font-mono text-5xl font-bold text-ceramic-primary tracking-tight"
                  role="timer"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Tempo de gravação: ${formatDuration(production.duration)}`}
                >
                  {formatDuration(production.duration)}
                </div>
              </div>

              {/* Recording Controls with Accessibility */}
              <div className="flex items-center justify-center space-x-6" role="group" aria-label="Controles de gravação">
                {!production.isRecording ? (
                  <button
                    onClick={handleStartRecording}
                    className="flex items-center space-x-2 px-8 py-4 bg-ceramic-danger text-white rounded-full hover:bg-ceramic-danger/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-semibold focus:outline-none focus:ring-2 focus:ring-ceramic-danger focus:ring-offset-2"
                    aria-label="Iniciar gravação"
                    aria-keyshortcuts="Control+R"
                  >
                    <Mic className="w-6 h-6" aria-hidden="true" />
                    <span>Iniciar Gravação</span>
                  </button>
                ) : (
                  <>
                    {/* Pause/Resume Button with aria-pressed */}
                    <button
                      onClick={handleTogglePause}
                      className={`flex items-center space-x-2 px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        production.isPaused
                          ? 'bg-ceramic-success text-white hover:bg-ceramic-success-hover focus:ring-ceramic-success'
                          : 'bg-ceramic-warning text-white hover:bg-ceramic-warning-hover focus:ring-ceramic-warning'
                      }`}
                      aria-label={production.isPaused ? 'Retomar gravação' : 'Pausar gravação'}
                      aria-pressed={production.isPaused}
                      aria-keyshortcuts="Control+P"
                    >
                      {production.isPaused ? (
                        <>
                          <Play className="w-6 h-6" aria-hidden="true" />
                          <span>Retomar</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-6 h-6" aria-hidden="true" />
                          <span>Pausar</span>
                        </>
                      )}
                    </button>

                    {/* Stop Button */}
                    <button
                      onClick={handleStopRecording}
                      className="flex items-center space-x-2 px-8 py-4 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                      aria-label="Finalizar gravação"
                      aria-keyshortcuts="Control+S"
                    >
                      <Square className="w-6 h-6" aria-hidden="true" />
                      <span>Finalizar</span>
                    </button>
                  </>
                )}
              </div>

              {/* Teleprompter Toggle */}
              <button
                onClick={() => setShowTeleprompter(true)}
                disabled={pauta.topics.length === 0}
                className="mt-6 flex items-center justify-center space-x-2 px-6 py-3 bg-ceramic-base text-ceramic-secondary rounded-lg hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-border focus:ring-offset-2"
                aria-label="Abrir teleprompter"
                aria-disabled={pauta.topics.length === 0}
              >
                <Monitor className="w-5 h-5" aria-hidden="true" />
                <span>Abrir Teleprompter</span>
              </button>
            </div>

            {/* Progress Bar */}
            {pauta.topics.length > 0 && (
              <div className="mt-6 pt-6 border-t border-ceramic-border">
                <div className="flex items-center space-x-3 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-ceramic-success" aria-hidden="true" />
                  <span className="text-sm font-semibold text-ceramic-secondary">
                    Progresso: {completedCount} de {pauta.topics.length} tópicos abordados
                  </span>
                </div>
                <div
                  className="w-full bg-ceramic-cool rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={completedCount}
                  aria-valuemin={0}
                  aria-valuemax={pauta.topics.length}
                  aria-label={`Progresso de tópicos: ${completedCount} de ${pauta.topics.length} concluídos`}
                >
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pauta.topics.length > 0 ? (completedCount / pauta.topics.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Topics Checklist */}
          {pauta.topics.length > 0 ? (
            <div className="bg-ceramic-base rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
              {/* Topics Header */}
              <div className="px-6 py-4 border-b border-ceramic-border bg-ceramic-surface">
                <h2 className="font-bold text-lg text-ceramic-primary flex items-center space-x-2">
                  <ChevronDown className="w-5 h-5 text-orange-500" aria-hidden="true" />
                  <span>Tópicos da Pauta</span>
                </h2>
              </div>

              {/* Topics List */}
              <div
                ref={topicsListRef}
                className="flex-1 overflow-y-auto"
                role="list"
                aria-label="Lista de tópicos do episódio"
              >
                {pauta.topics.map((topic, index) => {
                  const isCurrentTopic = production.currentTopicId === topic.id;
                  const isFutureTopic = index > currentTopicIndex && !topic.completed;
                  const categoryConfig =
                    CATEGORY_CONFIG[topic.categoryId || 'geral'] || CATEGORY_CONFIG['geral'];

                  return (
                    <div
                      key={topic.id}
                      data-topic-id={topic.id}
                      onClick={() => handleSelectTopic(topic.id)}
                      className={`px-6 py-4 border-b border-ceramic-border cursor-pointer transition-all ${
                        isCurrentTopic
                          ? 'bg-orange-50 border-l-4 border-l-orange-500'
                          : 'hover:bg-ceramic-base'
                      } ${topic.completed ? 'bg-ceramic-base' : ''}`}
                      role="listitem"
                      aria-current={isCurrentTopic ? 'true' : undefined}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Checkbox with aria-label */}
                        <input
                          type="checkbox"
                          checked={topic.completed}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (!e.target.checked) {
                              // Uncheck
                              actions.updateTopic(topic.id, { completed: false });
                            } else {
                              // Complete topic
                              handleTopicComplete(topic.id);
                            }
                          }}
                          className="w-5 h-5 mt-0.5 text-orange-500 rounded cursor-pointer focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                          disabled={production.isRecording && !isCurrentTopic && !topic.completed}
                          aria-label={`Marcar tópico "${topic.text}" como ${topic.completed ? 'não concluído' : 'concluído'}`}
                        />

                        {/* Topic Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-1">
                            <span
                              className={`text-lg font-bold ${
                                topic.completed
                                  ? 'line-through text-ceramic-text-secondary'
                                  : 'text-ceramic-primary'
                              }`}
                            >
                              {topic.text}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${categoryConfig.bgColor}`} aria-hidden="true">
                              {categoryConfig.emoji}
                            </span>
                          </div>

                          {/* Sponsor Script Preview */}
                          {topic.sponsorScript && isCurrentTopic && (
                            <p className="text-xs text-amber-700 italic mt-2">
                              Script: {topic.sponsorScript.substring(0, 50)}...
                            </p>
                          )}

                          {/* Topic Metadata */}
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-xs text-ceramic-secondary">
                              Tópico {index + 1}
                            </span>
                            {topic.completed && (
                              <span className="flex items-center space-x-1 text-xs text-ceramic-success font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Concluído</span>
                              </span>
                            )}
                            {isCurrentTopic && !topic.completed && (
                              <span className="flex items-center space-x-1 text-xs text-orange-600 font-semibold">
                                <Radio className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
                                <span>Em discussão</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Current Topic Indicator */}
                        {isCurrentTopic && (
                          <div className="flex-shrink-0">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTopicComplete(topic.id);
                                }}
                                disabled={topic.completed}
                                className="px-3 py-1.5 bg-ceramic-success-bg text-ceramic-success rounded-lg text-xs font-bold hover:bg-ceramic-success/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-success focus:ring-offset-2"
                                aria-label={`Concluir tópico "${topic.text}"`}
                              >
                                {topic.completed ? 'Pronto' : 'Concluir'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Topics Footer with Navigation */}
              <div className="px-6 py-4 border-t border-ceramic-border bg-ceramic-surface flex items-center justify-between">
                <span className="text-sm text-ceramic-secondary">
                  Tópico {currentTopicIndex + 1} de {pauta.topics.length}
                </span>
                <button
                  onClick={handleNextTopic}
                  disabled={currentTopicIndex >= pauta.topics.length - 1}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-ceramic-cool disabled:cursor-not-allowed transition-colors text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label="Ir para próximo tópico"
                >
                  Próximo Tópico
                </button>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-ceramic-base rounded-lg shadow-sm p-12 flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-ceramic-cool mx-auto mb-4" aria-hidden="true" />
                <p className="text-ceramic-secondary text-lg">
                  Nenhum tópico criado. Complete a pauta antes de gravar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
