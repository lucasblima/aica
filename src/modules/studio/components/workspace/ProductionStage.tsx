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
 * - Text: text-ceramic-text-primary, text-ceramic-secondary
 * - Borders: border-ceramic-border
 * - Interactive: bg-ceramic-danger (recording), bg-ceramic-warning (paused)
 * - Spacing: Ceramic spacing scale
 *
 * @see PodcastWorkspaceContext for state management
 * @see ProductionState for recording state types
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { useGeminiLiveAudio } from '@/modules/studio/hooks/useGeminiLiveAudio';
import { TeleprompterWindow } from '../TeleprompterWindow';
import {
  Mic,
  MicOff,
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
  Bot,
  X,
  MessageSquare,
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
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [showPracticePanel, setShowPracticePanel] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const topicsListRef = useRef<HTMLDivElement>(null);
  const practiceMessagesEndRef = useRef<HTMLDivElement>(null);

  // Build system instruction for AI practice from guest context
  const practiceSystemInstruction = useMemo(() => {
    const guestName = setup.guestName || 'convidado';
    const dossier = state.research?.dossier;
    const topicTexts = pauta.topics.map(t => t.text).join(', ');

    let instruction = `Voce e ${guestName}, um convidado sendo entrevistado em um podcast.`;

    if (dossier?.biography) {
      instruction += `\n\nSua biografia: ${dossier.biography.substring(0, 500)}`;
    }
    if (dossier?.technicalSheet) {
      instruction += `\n\nFicha tecnica: ${JSON.stringify(dossier.technicalSheet).substring(0, 300)}`;
    }
    if (topicTexts) {
      instruction += `\n\nTopicos da entrevista: ${topicTexts}`;
    }

    instruction += `\n\nResponda as perguntas de forma natural, como se estivesse em uma entrevista real. `;
    instruction += `Fale em portugues brasileiro. Seja articulado mas conversacional. `;
    instruction += `Se o entrevistador fizer perguntas fora do seu dominio, redirecione educadamente para seus temas de expertise.`;

    return instruction;
  }, [setup.guestName, state.research?.dossier, pauta.topics]);

  // Gemini Live Audio hook for practice
  const {
    connect: connectPractice,
    disconnect: disconnectPractice,
    status: practiceStatus,
    isStreaming: isPracticeStreaming,
    audioLevel: practiceAudioLevel,
    error: practiceError,
    messages: practiceMessages,
    clearMessages: clearPracticeMessages,
  } = useGeminiLiveAudio({
    systemInstruction: practiceSystemInstruction,
    voiceName: 'Kore',
    enableTranscription: true,
  });

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
    try {
      setRecordingError(null);
      actions.startRecording();
    } catch (error) {
      setRecordingError('Nao foi possivel iniciar a gravacao. Verifique as permissoes do microfone e tente novamente.');
    }
  };

  // Handle pause/resume
  const handleTogglePause = () => {
    try {
      setRecordingError(null);
      if (production.isPaused) {
        actions.resumeRecording();
      } else {
        actions.pauseRecording();
      }
    } catch (error) {
      setRecordingError('Erro ao alterar o estado da gravacao. Tente novamente.');
    }
  };

  // Handle stop recording
  const handleStopRecording = () => {
    try {
      setRecordingError(null);
      actions.stopRecording();
    } catch (error) {
      setRecordingError('Erro ao finalizar a gravacao. Seus dados foram preservados.');
    }
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

  // Handle practice session start
  const handleStartPractice = useCallback(async () => {
    try {
      await connectPractice();
    } catch {
      // Error handled by hook
    }
  }, [connectPractice]);

  // Handle practice session stop
  const handleStopPractice = useCallback(() => {
    disconnectPractice();
  }, [disconnectPractice]);

  // Auto-scroll practice messages
  useEffect(() => {
    if (practiceMessagesEndRef.current) {
      practiceMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [practiceMessages]);

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
                <h1 className="text-3xl font-bold text-ceramic-text-primary">Gravação do Episódio</h1>
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
          {/* Recording Error Banner */}
          <AnimatePresence>
            {recordingError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-ceramic-error font-medium">{recordingError}</p>
                  <button
                    onClick={() => setRecordingError(null)}
                    className="mt-2 text-sm text-ceramic-error hover:underline"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Central Control Area */}
          <div className="bg-ceramic-base rounded-lg shadow-sm p-12 mb-8 flex-none">
            {/* Timer Display with aria-live for screen readers */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-4 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200 mb-6">
                <Clock className="w-8 h-8 text-orange-600" aria-hidden="true" />
                <div
                  className="font-mono text-5xl font-bold text-ceramic-text-primary tracking-tight"
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

              {/* Teleprompter & Practice Toggles */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowTeleprompter(true)}
                  disabled={pauta.topics.length === 0}
                  className="flex items-center space-x-2 px-6 py-3 bg-ceramic-base text-ceramic-secondary rounded-lg hover:bg-ceramic-cool disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-border focus:ring-offset-2"
                  aria-label="Abrir teleprompter"
                  aria-disabled={pauta.topics.length === 0}
                >
                  <Monitor className="w-5 h-5" aria-hidden="true" />
                  <span>Abrir Teleprompter</span>
                </button>
                <button
                  onClick={() => setShowPracticePanel(!showPracticePanel)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    showPracticePanel
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 focus:ring-purple-500'
                      : 'bg-ceramic-base text-ceramic-secondary hover:bg-ceramic-cool focus:ring-ceramic-border'
                  }`}
                  aria-label="Praticar entrevista com IA"
                  aria-pressed={showPracticePanel}
                >
                  <Bot className="w-5 h-5" aria-hidden="true" />
                  <span>Praticar com IA</span>
                </button>
              </div>
            </div>

            {/* AI Interview Practice Panel */}
            <AnimatePresence>
              {showPracticePanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 bg-ceramic-base rounded-lg shadow-sm border border-purple-200">
                    {/* Practice Panel Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-ceramic-border bg-purple-50 rounded-t-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Bot className="w-5 h-5 text-purple-600" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-bold text-ceramic-text-primary">
                            Praticar Entrevista
                          </h3>
                          <p className="text-xs text-ceramic-secondary">
                            A IA simula o convidado {setup.guestName ? `(${setup.guestName})` : ''} para voce praticar
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Microphone Status Indicator */}
                        <div
                          className="flex items-center space-x-2"
                          role="status"
                          aria-live="polite"
                          aria-label={`Status do microfone: ${
                            practiceStatus === 'streaming' ? 'gravando' :
                            practiceStatus === 'connecting' ? 'conectando' :
                            practiceStatus === 'connected' ? 'conectado' :
                            practiceStatus === 'error' ? 'erro' : 'inativo'
                          }`}
                        >
                          {isPracticeStreaming ? (
                            <Mic className="w-4 h-4 text-purple-600" aria-hidden="true" />
                          ) : (
                            <MicOff className="w-4 h-4 text-ceramic-secondary" aria-hidden="true" />
                          )}
                          <span className={`text-xs font-medium ${
                            isPracticeStreaming ? 'text-purple-600' :
                            practiceStatus === 'connecting' ? 'text-amber-600' :
                            practiceStatus === 'error' ? 'text-ceramic-error' :
                            'text-ceramic-secondary'
                          }`}>
                            {practiceStatus === 'streaming' ? 'Gravando' :
                             practiceStatus === 'connecting' ? 'Conectando...' :
                             practiceStatus === 'connected' ? 'Conectado' :
                             practiceStatus === 'error' ? 'Erro' :
                             practiceStatus === 'disconnected' ? 'Desconectado' :
                             'Inativo'}
                          </span>
                        </div>

                        {/* Audio Level Indicator */}
                        {isPracticeStreaming && (
                          <div
                            className="flex items-end space-x-0.5 h-5"
                            role="img"
                            aria-label={`Nivel de audio: ${practiceAudioLevel}%`}
                          >
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className={`w-1 rounded-full transition-all duration-100 ${
                                  practiceAudioLevel > i * 20 ? 'bg-purple-500' : 'bg-ceramic-border'
                                }`}
                                style={{
                                  height: `${4 + i * 3}px`,
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => setShowPracticePanel(false)}
                          className="p-1.5 rounded-lg text-ceramic-secondary hover:bg-ceramic-cool transition-colors"
                          aria-label="Fechar painel de pratica"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Practice Controls */}
                    <div className="px-6 py-4">
                      {/* Error Display */}
                      {practiceError && (
                        <div className="mb-4 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="text-sm text-ceramic-error">{practiceError}</p>
                        </div>
                      )}

                      {/* Start/Stop Controls */}
                      <div className="flex items-center justify-center gap-4 mb-4">
                        {practiceStatus === 'idle' || practiceStatus === 'disconnected' || practiceStatus === 'error' ? (
                          <button
                            onClick={handleStartPractice}
                            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            aria-label="Iniciar pratica de entrevista"
                          >
                            <Play className="w-5 h-5" aria-hidden="true" />
                            <span>Iniciar Pratica</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleStopPractice}
                            disabled={practiceStatus === 'connecting'}
                            className="flex items-center space-x-2 px-6 py-3 bg-ceramic-error text-white rounded-full hover:bg-ceramic-error/90 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ceramic-error focus:ring-offset-2"
                            aria-label="Parar pratica de entrevista"
                          >
                            <Square className="w-5 h-5" aria-hidden="true" />
                            <span>Parar</span>
                          </button>
                        )}
                        {practiceMessages.length > 0 && (
                          <button
                            onClick={clearPracticeMessages}
                            className="flex items-center space-x-2 px-4 py-2 text-sm text-ceramic-secondary hover:text-ceramic-text-primary border border-ceramic-border rounded-lg hover:bg-ceramic-cool transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-border focus:ring-offset-2"
                            aria-label="Limpar historico da conversa"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                            <span>Limpar</span>
                          </button>
                        )}
                      </div>

                      {/* AI Response / Transcript Display */}
                      {practiceMessages.length > 0 && (
                        <div
                          className="max-h-60 overflow-y-auto rounded-lg border border-ceramic-border bg-ceramic-surface p-4 space-y-3"
                          role="log"
                          aria-label="Historico da conversa de pratica"
                          aria-live="polite"
                        >
                          {practiceMessages.map((msg, index) => (
                            <div
                              key={index}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                                  msg.role === 'user'
                                    ? 'bg-orange-100 text-ceramic-text-primary'
                                    : 'bg-purple-100 text-ceramic-text-primary'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {msg.role === 'user' ? (
                                    <Mic className="w-3 h-3 text-orange-600" aria-hidden="true" />
                                  ) : (
                                    <MessageSquare className="w-3 h-3 text-purple-600" aria-hidden="true" />
                                  )}
                                  <span className={`text-xs font-semibold ${
                                    msg.role === 'user' ? 'text-orange-600' : 'text-purple-600'
                                  }`}>
                                    {msg.role === 'user' ? 'Voce' : setup.guestName || 'IA'}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                              </div>
                            </div>
                          ))}
                          <div ref={practiceMessagesEndRef} />
                        </div>
                      )}

                      {/* Empty State */}
                      {practiceMessages.length === 0 && (practiceStatus === 'idle' || practiceStatus === 'disconnected') && (
                        <div className="text-center py-4">
                          <MessageSquare className="w-8 h-8 text-ceramic-border mx-auto mb-2" aria-hidden="true" />
                          <p className="text-sm text-ceramic-secondary">
                            Clique em "Iniciar Pratica" para simular uma entrevista com a IA.
                          </p>
                          <p className="text-xs text-ceramic-secondary mt-1">
                            A IA assumira o papel do convidado e respondera suas perguntas em tempo real.
                          </p>
                        </div>
                      )}

                      {/* Connecting State */}
                      {practiceStatus === 'connecting' && (
                        <div className="text-center py-4">
                          <div className="inline-flex items-center space-x-2 text-amber-600">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-sm font-medium">Conectando ao Gemini Live...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                <h2 className="font-bold text-lg text-ceramic-text-primary flex items-center space-x-2">
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
                                  : 'text-ceramic-text-primary'
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
