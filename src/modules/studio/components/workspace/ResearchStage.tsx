/**
 * ResearchStage - Guest research and dossier generation
 *
 * Migrated from _deprecated/modules/podcast/components/stages/ResearchStage.tsx
 * Wave 5 - Stream 2: Research & Pauta Components Migration
 *
 * Features:
 * - AI-powered dossier generation
 * - Custom research sources (text, URL, file)
 * - Multi-tab dossier view (Biography, Technical Sheet, News)
 * - Real-time AI chat for interview preparation (Gemini Live)
 *
 * UX Improvements:
 * - Ceramic Design System classes
 * - WCAG 2.1 AA accessibility compliance
 * - Proper loading states and error handling
 * - Enhanced visual hierarchy
 * - Streaming chat responses with typing indicator
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { useWorkspaceAI } from '@/modules/studio/hooks/useWorkspaceAI';
import { useGeminiLive, type GeminiLiveContext } from '@/modules/studio/services/geminiLiveService';
import { useGeminiLiveAudio } from '@/modules/studio/hooks/useGeminiLiveAudio';
import {
  Sparkles,
  FileText,
  Newspaper,
  AlertCircle,
  Plus,
  X,
  Link as LinkIcon,
  Upload,
  Loader2,
  Send,
  RefreshCw,
  Check,
  Wifi,
  WifiOff,
  StopCircle,
  PanelLeftOpen,
  PanelLeftClose,
  Search,
  ExternalLink,
  Mic,
  MicOff,
  Radio,
  MessageSquare,
  Phone,
  PhoneOff,
} from 'lucide-react';
import type { WorkspaceCustomSource } from '@/modules/studio/types';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ResearchStage');

/** Safely coerce a value to string — handles objects/arrays from Gemini API */
const ensureString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

type ResearchTab = 'bio' | 'ficha' | 'noticias';
type ChatMode = 'text' | 'audio';

/** Audio level waveform visualization bars */
function AudioWaveform({ level, isActive }: { level: number; isActive: boolean }) {
  const barCount = 5;
  return (
    <div className="flex items-center justify-center gap-1 h-8" aria-hidden="true">
      {Array.from({ length: barCount }, (_, i) => {
        // Center bars are taller, scale by audio level
        const centerDistance = Math.abs(i - Math.floor(barCount / 2));
        const baseHeight = isActive ? 0.3 : 0.15;
        const scale = Math.min(1.0, baseHeight + (level / 100) * (1 - centerDistance * 0.15));
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ${
              isActive ? 'bg-orange-500' : 'bg-ceramic-border'
            }`}
            style={{ height: `${Math.max(4, scale * 32)}px` }}
          />
        );
      })}
    </div>
  );
}

export default function ResearchStage() {
  const { state, actions } = usePodcastWorkspace();
  const { setup, research } = state;
  const ai = useWorkspaceAI();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<ResearchTab>('bio');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isProcessingSources, setIsProcessingSources] = useState(false);
  const [chatInput, setChatInput] = useState('');

  // Chat mode: text (existing SSE) or audio (Gemini Live)
  const [chatMode, setChatMode] = useState<ChatMode>('text');

  // Voice input for text chat
  const voiceChat = useSpeechRecognition({
    onResult: (text) => setChatInput((prev) => (prev + ' ' + text).trim()),
  });

  // Build context for Gemini Live chat
  const geminiContext = useMemo<GeminiLiveContext>(() => {
    const biographyText = ensureString(research.dossier?.biography);
    const dossierSummary = research.dossier
      ? `${biographyText.substring(0, 500)}${
          research.dossier.controversies?.length
            ? ` Controversias: ${research.dossier.controversies.slice(0, 2).join(', ')}`
            : ''
        }`
      : '';

    return {
      guest_name: setup.guestName || 'Convidado',
      guest_bio: setup.guestBio || biographyText.substring(0, 300) || undefined,
      episode_theme: setup.theme || research.dossier?.episodeTheme,
      dossier_summary: dossierSummary,
    };
  }, [setup.guestName, setup.guestBio, setup.theme, research.dossier]);

  // Initialize Gemini Live chat
  const {
    messages: chatMessages,
    isStreaming: isChatLoading,
    connectionState,
    currentResponse,
    sendMessage,
    cancelRequest,
    clearMessages,
    setContext,
  } = useGeminiLive({
    context: geminiContext,
  });

  // Build system instruction for live audio from context
  const liveAudioSystemInstruction = useMemo(() => {
    const parts = [
      'Você é um assistente de preparação de entrevistas para podcasts.',
      'Responda em português brasileiro.',
      `Convidado: ${geminiContext.guest_name}`,
    ];
    if (geminiContext.guest_bio) parts.push(`Bio: ${geminiContext.guest_bio}`);
    if (geminiContext.episode_theme) parts.push(`Tema: ${geminiContext.episode_theme}`);
    if (geminiContext.dossier_summary) parts.push(`Dossier: ${geminiContext.dossier_summary.substring(0, 800)}`);
    parts.push('Seja conciso, direto e util. Sugira perguntas, alerte sobre topicos sensiveis, e ajude com preparacao em tempo real.');
    return parts.join('\n');
  }, [geminiContext]);

  // Gemini Live Audio hook (real-time voice conversation)
  const liveAudio = useGeminiLiveAudio({
    systemInstruction: liveAudioSystemInstruction,
    voiceName: 'Kore',
    enableTranscription: true,
  });

  // Handle audio mode toggle — disconnect audio when switching to text
  const handleChatModeChange = useCallback((mode: ChatMode) => {
    if (mode === 'text' && liveAudio.status !== 'idle' && liveAudio.status !== 'disconnected') {
      liveAudio.disconnect();
    }
    setChatMode(mode);
  }, [liveAudio]);

  // Update context when it changes
  useEffect(() => {
    setContext(geminiContext);
  }, [geminiContext, setContext]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, currentResponse]);

  const handleAddCustomSource = async () => {
    if (!sourceText && !sourceUrl && !sourceFile) {
      alert('Por favor, adicione uma fonte');
      return;
    }

    setIsProcessingSources(true);
    try {
      const newSource: WorkspaceCustomSource = {
        id: `source_${Date.now()}`,
        type: sourceFile ? 'file' : sourceUrl ? 'url' : 'text',
        content: sourceFile ? sourceFile.name : sourceUrl || sourceText,
        label: sourceFile?.name || sourceUrl || ensureString(sourceText).substring(0, 50),
        createdAt: new Date(),
      };

      actions.addCustomSource(newSource);
      setSourceText('');
      setSourceUrl('');
      setSourceFile(null);
    } catch (error) {
      log.error('Error adding custom source:', error);
    } finally {
      setIsProcessingSources(false);
    }
  };

  const handleRemoveSource = (sourceId: string) => {
    actions.removeCustomSource(sourceId);
  };

  const handleGenerateDossier = async () => {
    // If deep research already exists from wizard, use it to generate the dossier
    if (research.deepResearch && !research.dossier) {
      await actions.deepResearch('standard');
      return;
    }
    await actions.generateDossier();
  };

  const handleRegenerateDossier = async () => {
    await actions.regenerateDossier();
  };

  const handleDeepResearch = async () => {
    await actions.deepResearch('deep');
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const message = chatInput.trim();
    setChatInput('');

    try {
      await sendMessage(message);
    } catch (error) {
      log.error('Error sending chat message:', error);
    }
  };

  const handleCancelChat = () => {
    cancelRequest();
  };

  return (
    <div className="h-full flex flex-col bg-ceramic-base">
      {/* Header */}
      <div className="bg-ceramic-surface border-b border-ceramic-border px-4 py-4 md:px-8 md:py-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-orange-500" aria-hidden="true" />
            <h1 className="text-xl md:text-3xl font-bold text-ceramic-text-primary">Pesquisa do Convidado</h1>
          </div>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden p-2.5 rounded-lg bg-ceramic-surface-secondary text-ceramic-text-primary hover:bg-ceramic-cool transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label={showSidebar ? 'Fechar painel lateral' : 'Abrir painel lateral'}
            aria-expanded={showSidebar}
          >
            {showSidebar ? (
              <PanelLeftClose className="w-5 h-5" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="text-ceramic-secondary text-sm md:text-base">
          Gere o dossier completo sobre {setup.guestName || 'o convidado'}
        </p>
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column - Actions & Sources (collapsible on mobile) */}
        <div className={`${showSidebar ? 'block' : 'hidden'} md:block w-full md:w-80 bg-ceramic-surface border-b md:border-b-0 md:border-r border-ceramic-border flex flex-col overflow-y-auto max-h-[50vh] md:max-h-none`}>
          {/* Action Buttons */}
          <div className="p-6 border-b border-ceramic-border">
            <div className="space-y-3">
              {!research.dossier ? (
                <button
                  onClick={handleGenerateDossier}
                  disabled={research.isGenerating}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-ceramic-cool disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center space-x-2 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label={research.isGenerating ? 'Gerando dossier' : 'Gerar dossier do convidado'}
                  aria-busy={research.isGenerating}
                >
                  {research.isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                      <span>Gerar Dossier</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRegenerateDossier}
                  disabled={research.isGenerating}
                  className="w-full px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-ceramic-cool disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center space-x-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                  aria-label={research.isGenerating ? 'Regenerando dossier' : 'Regenerar dossier do convidado'}
                  aria-busy={research.isGenerating}
                >
                  {research.isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Regenerando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" aria-hidden="true" />
                      <span>Regenerar</span>
                    </>
                  )}
                </button>
              )}

              {research.dossier && (
                <button
                  onClick={handleDeepResearch}
                  disabled={research.isGenerating}
                  className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-ceramic-cool disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center space-x-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  aria-label={research.isGenerating ? 'Pesquisando...' : 'Aprofundar pesquisa com Google Search'}
                  aria-busy={research.isGenerating}
                >
                  {research.isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      <span>Pesquisando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" aria-hidden="true" />
                      <span>Aprofundar Pesquisa</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowSourcesModal(true)}
                className="w-full px-4 py-3 bg-ceramic-surface-secondary text-ceramic-text-primary rounded-lg hover:bg-ceramic-cool transition-colors inline-flex items-center justify-center space-x-2 font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                aria-label="Adicionar fontes personalizadas de pesquisa"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                <span>Adicionar Fontes</span>
              </button>
            </div>

            {/* Error Alert */}
            {research.error && (
              <div
                className="mt-4 p-3 bg-ceramic-error-bg border border-ceramic-error/30 rounded-lg flex items-start space-x-3"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-ceramic-error">{research.error}</p>
              </div>
            )}

            {/* Generation Timestamp */}
            {research.lastGenerated && (
              <div className="mt-4 p-3 bg-ceramic-surface-secondary rounded-lg text-xs text-ceramic-secondary">
                <span className="font-semibold">Gerado:</span> {new Date(research.lastGenerated).toLocaleString('pt-BR')}
              </div>
            )}
          </div>

          {/* Tabs */}
          {research.dossier && (
            <div className="flex border-b border-ceramic-border bg-ceramic-base" role="tablist" aria-label="Seções do dossier">
              <button
                onClick={() => setActiveTab('bio')}
                role="tab"
                aria-selected={activeTab === 'bio'}
                aria-controls="bio-panel"
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'bio'
                    ? 'border-orange-500 text-orange-600 bg-ceramic-surface'
                    : 'border-transparent text-ceramic-secondary hover:text-ceramic-text-primary'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Bio
              </button>
              <button
                onClick={() => setActiveTab('ficha')}
                role="tab"
                aria-selected={activeTab === 'ficha'}
                aria-controls="ficha-panel"
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'ficha'
                    ? 'border-orange-500 text-orange-600 bg-ceramic-surface'
                    : 'border-transparent text-ceramic-secondary hover:text-ceramic-text-primary'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Ficha
              </button>
              <button
                onClick={() => setActiveTab('noticias')}
                role="tab"
                aria-selected={activeTab === 'noticias'}
                aria-controls="noticias-panel"
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'noticias'
                    ? 'border-orange-500 text-orange-600 bg-ceramic-surface'
                    : 'border-transparent text-ceramic-secondary hover:text-ceramic-text-primary'
                }`}
              >
                <Newspaper className="w-4 h-4 inline mr-2" aria-hidden="true" />
                Notícias
              </button>
            </div>
          )}

          {/* Custom Sources List */}
          {research.customSources.length > 0 && (
            <div className="p-4 border-b border-ceramic-border">
              <h4 className="text-sm font-semibold text-ceramic-text-primary mb-3">
                Fontes ({research.customSources.length})
              </h4>
              <div className="space-y-2" role="list" aria-label="Fontes personalizadas">
                {research.customSources.map(source => (
                  <div key={source.id} className="flex items-start justify-between gap-2 p-2 bg-ceramic-base rounded border border-ceramic-border text-xs" role="listitem">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {source.type === 'url' && <LinkIcon className="w-3 h-3 text-ceramic-info flex-shrink-0" aria-hidden="true" />}
                        {source.type === 'file' && <Upload className="w-3 h-3 text-ceramic-success flex-shrink-0" aria-hidden="true" />}
                        {source.type === 'text' && <FileText className="w-3 h-3 text-ceramic-text-secondary flex-shrink-0" aria-hidden="true" />}
                        <span className="font-medium text-ceramic-text-primary truncate">{source.label || ensureString(source.content).substring(0, 30)}</span>
                      </div>
                      <span className="text-ceramic-tertiary">{source.type === 'url' ? 'URL' : source.type === 'file' ? 'Arquivo' : 'Texto'}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSource(source.id)}
                      className="p-1 hover:bg-ceramic-error-bg rounded transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-ceramic-error"
                      aria-label={`Remover fonte: ${source.label || ensureString(source.content).substring(0, 30)}`}
                    >
                      <X className="w-4 h-4 text-ceramic-error" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Dossier Content & Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Dossier Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Deep Research Banner */}
          {research.deepResearch && research.dossier && (
            <div className="mx-4 md:mx-8 mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="flex items-start gap-3">
                <Search className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-indigo-800">
                    Pesquisa realizada durante criacao do episodio
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    Profundidade: {research.deepResearch.researchDepth === 'deep' ? 'Profunda' : research.deepResearch.researchDepth === 'standard' ? 'Padrao' : 'Rapida'}
                    {research.deepResearch.researchTimestamp && (
                      <> &middot; {new Date(research.deepResearch.researchTimestamp).toLocaleString('pt-BR')}</>
                    )}
                  </p>
                  {research.deepResearch.sources && research.deepResearch.sources.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-indigo-700 mb-2">
                        Fontes ({research.deepResearch.sources.length})
                      </p>
                      <div className="space-y-1">
                        {research.deepResearch.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{source.title || source.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!research.dossier ? (
              research.isGenerating ? (
                /* Dossier generating skeleton */
                <div className="p-4 md:p-8 max-w-3xl" role="status" aria-label="Gerando dossier">
                  <div className="flex items-center space-x-2 mb-6">
                    <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" aria-hidden="true" />
                    <p className="text-sm font-medium text-ceramic-secondary">Gerando dossier...</p>
                  </div>
                  {/* Title skeleton */}
                  <div className="h-7 bg-ceramic-cool animate-pulse rounded-lg w-48 mb-6" />
                  {/* Paragraph skeletons */}
                  <div className="space-y-3 mb-8">
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-full" />
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-full" />
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-11/12" />
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-4/5" />
                  </div>
                  {/* Second section skeleton */}
                  <div className="h-5 bg-ceramic-cool animate-pulse rounded-lg w-36 mb-4" />
                  <div className="space-y-3 mb-8">
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-full" />
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-5/6" />
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-3/4" />
                  </div>
                  {/* Third section skeleton */}
                  <div className="h-5 bg-ceramic-cool animate-pulse rounded-lg w-28 mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-full" />
                    <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-2/3" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 text-ceramic-text-tertiary mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">
                      {research.deepResearch ? 'Pesquisa pronta para gerar dossier' : 'Dossier nao gerado'}
                    </h3>
                    <p className="text-ceramic-secondary max-w-sm">
                      {research.deepResearch
                        ? 'Pesquisa realizada no wizard. Clique em Gerar Dossier para transformar em dossier completo.'
                        : 'Clique em Gerar Dossier para comecar'
                      }
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 md:p-8">
                {/* Biography Tab */}
                {activeTab === 'bio' && (
                  <div className="max-w-3xl" role="tabpanel" id="bio-panel" aria-labelledby="bio-tab">
                    <h2 className="text-2xl font-bold text-ceramic-text-primary mb-4">Biografia</h2>
                    <p className="text-ceramic-text-primary whitespace-pre-wrap leading-relaxed">
                      {research.dossier.biography}
                    </p>
                  </div>
                )}

                {/* Technical Sheet Tab */}
                {activeTab === 'ficha' && (
                  <div className="max-w-3xl" role="tabpanel" id="ficha-panel" aria-labelledby="ficha-tab">
                    <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">Ficha Técnica</h2>
                    {research.dossier.technicalSheet ? (
                      <div className="space-y-6">
                        {research.dossier.technicalSheet.fullName && (
                          <div>
                            <h3 className="text-sm font-semibold text-ceramic-text-primary mb-2">Nome Completo</h3>
                            <p className="text-ceramic-secondary">{research.dossier.technicalSheet.fullName}</p>
                          </div>
                        )}
                        {research.dossier.technicalSheet.education && research.dossier.technicalSheet.education.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">Educação</h3>
                            <ul className="space-y-2">
                              {research.dossier.technicalSheet.education.map((edu, idx) => (
                                <li key={idx} className="text-ceramic-secondary">
                                  <span className="font-medium">{edu.degree}</span> - {edu.institution}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {research.dossier.technicalSheet.careerHighlights && research.dossier.technicalSheet.careerHighlights.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">Carreira</h3>
                            <ul className="space-y-2">
                              {research.dossier.technicalSheet.careerHighlights.map((career, idx) => (
                                <li key={idx} className="text-ceramic-secondary">
                                  <span className="font-medium">{career.title}</span> na {career.organization}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {research.dossier.technicalSheet.keyFacts && research.dossier.technicalSheet.keyFacts.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">Fatos</h3>
                            <ul className="space-y-2">
                              {research.dossier.technicalSheet.keyFacts.map((fact, idx) => (
                                <li key={idx} className="text-ceramic-secondary flex items-start gap-2">
                                  <Check className="w-4 h-4 text-ceramic-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                                  <span>{fact}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-ceramic-tertiary text-center py-8">
                        <p>Ficha técnica não disponível</p>
                      </div>
                    )}
                  </div>
                )}

                {/* News & Controversies Tab */}
                {activeTab === 'noticias' && (
                  <div className="max-w-3xl" role="tabpanel" id="noticias-panel" aria-labelledby="noticias-tab">
                    <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">Notícias & Controvérsias</h2>
                    {research.dossier.controversies && research.dossier.controversies.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Controvérsias</h3>
                        <div className="space-y-3">
                          {research.dossier.controversies.map((controversy, idx) => (
                            <div key={idx} className="p-4 bg-ceramic-error-bg border border-ceramic-error/30 rounded-lg">
                              <p className="text-ceramic-text-primary">{controversy}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {research.dossier.iceBreakers && research.dossier.iceBreakers.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-ceramic-text-primary mb-4">Quebra-Gelo</h3>
                        <div className="space-y-3">
                          {research.dossier.iceBreakers.map((breaker, idx) => (
                            <div key={idx} className="p-4 bg-ceramic-info-bg border border-ceramic-info/30 rounded-lg">
                              <p className="text-ceramic-text-primary">{breaker}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Section - Dual Mode: Text Chat + Live Audio */}
          <div className="border-t border-ceramic-border bg-ceramic-surface">
            {/* Chat Header with Mode Toggle + Status */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-ceramic-border bg-ceramic-base">
              <div className="flex items-center gap-2">
                {/* Mode toggle */}
                <div className="flex bg-ceramic-surface-secondary rounded-lg p-0.5" role="tablist" aria-label="Modo de conversa">
                  <button
                    role="tab"
                    aria-selected={chatMode === 'text'}
                    onClick={() => handleChatModeChange('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      chatMode === 'text'
                        ? 'bg-ceramic-surface text-orange-600 shadow-sm'
                        : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Chat</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={chatMode === 'audio'}
                    onClick={() => handleChatModeChange('audio')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      chatMode === 'audio'
                        ? 'bg-ceramic-surface text-orange-600 shadow-sm'
                        : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Ao Vivo</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Connection indicator — varies by mode */}
                {chatMode === 'text' ? (
                  <div className="flex items-center gap-1">
                    {connectionState === 'connected' && (
                      <>
                        <Wifi className="w-3 h-3 text-ceramic-success" aria-hidden="true" />
                        <span className="text-xs text-ceramic-success">Conectado</span>
                      </>
                    )}
                    {connectionState === 'connecting' && (
                      <>
                        <Loader2 className="w-3 h-3 text-orange-500 animate-spin" aria-hidden="true" />
                        <span className="text-xs text-orange-600">Conectando...</span>
                      </>
                    )}
                    {connectionState === 'error' && (
                      <>
                        <WifiOff className="w-3 h-3 text-ceramic-error" aria-hidden="true" />
                        <span className="text-xs text-ceramic-error">Erro</span>
                      </>
                    )}
                    {connectionState === 'disconnected' && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-ceramic-text-tertiary" aria-hidden="true" />
                        <span className="text-xs text-ceramic-tertiary">Pronto</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {liveAudio.status === 'streaming' && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-ceramic-success animate-pulse" aria-hidden="true" />
                        <span className="text-xs text-ceramic-success">Ao Vivo</span>
                      </>
                    )}
                    {liveAudio.status === 'connected' && (
                      <>
                        <Wifi className="w-3 h-3 text-ceramic-success" aria-hidden="true" />
                        <span className="text-xs text-ceramic-success">Conectado</span>
                      </>
                    )}
                    {liveAudio.status === 'connecting' && (
                      <>
                        <Loader2 className="w-3 h-3 text-orange-500 animate-spin" aria-hidden="true" />
                        <span className="text-xs text-orange-600">Conectando...</span>
                      </>
                    )}
                    {liveAudio.status === 'error' && (
                      <>
                        <WifiOff className="w-3 h-3 text-ceramic-error" aria-hidden="true" />
                        <span className="text-xs text-ceramic-error">Erro</span>
                      </>
                    )}
                    {(liveAudio.status === 'idle' || liveAudio.status === 'disconnected') && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-ceramic-text-tertiary" aria-hidden="true" />
                        <span className="text-xs text-ceramic-tertiary">Desconectado</span>
                      </>
                    )}
                  </div>
                )}
                {/* Clear messages */}
                {chatMode === 'text' && chatMessages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="text-xs text-ceramic-tertiary hover:text-ceramic-secondary px-2 py-1 rounded hover:bg-ceramic-surface-secondary transition-colors"
                    aria-label="Limpar chat"
                  >
                    Limpar
                  </button>
                )}
                {chatMode === 'audio' && liveAudio.messages.length > 0 && (
                  <button
                    onClick={liveAudio.clearMessages}
                    className="text-xs text-ceramic-tertiary hover:text-ceramic-secondary px-2 py-1 rounded hover:bg-ceramic-surface-secondary transition-colors"
                    aria-label="Limpar transcricao"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* TEXT CHAT MODE */}
            {chatMode === 'text' && (
              <div className="flex flex-col h-80">
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  role="log"
                  aria-live="polite"
                  aria-label="Chat de perguntas sobre o convidado"
                >
                  {chatMessages.length === 0 && !currentResponse && (
                    <div className="flex items-center justify-center h-full text-center">
                      <div className="space-y-2">
                        <Sparkles className="w-8 h-8 text-ceramic-text-tertiary mx-auto" aria-hidden="true" />
                        <p className="text-ceramic-tertiary text-sm">
                          Faca perguntas sobre {setup.guestName || 'o convidado'}
                        </p>
                        <p className="text-ceramic-tertiary text-xs">
                          Ex: "Quais perguntas devo evitar?" ou "Sugira um quebra-gelo"
                        </p>
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg) => (
                    <div
                      key={msg.timestamp.getTime()}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-orange-500 text-white'
                            : 'bg-ceramic-surface-secondary text-ceramic-text-primary'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {currentResponse && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] px-4 py-2 rounded-lg bg-ceramic-surface-secondary text-ceramic-text-primary">
                        <p className="text-sm whitespace-pre-wrap">{currentResponse}</p>
                        <span className="inline-block w-1.5 h-4 bg-orange-500 animate-pulse ml-0.5" aria-hidden="true" />
                      </div>
                    </div>
                  )}

                  {isChatLoading && !currentResponse && (
                    <div className="flex justify-start">
                      <div className="bg-ceramic-surface-secondary text-ceramic-text-primary px-4 py-2 rounded-lg flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span className="text-sm text-ceramic-secondary">Pensando...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text chat input */}
                <div className="border-t border-ceramic-border p-4">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="flex gap-2">
                    <label htmlFor="chat-input" className="sr-only">Pergunta sobre o convidado</label>
                    <input
                      id="chat-input"
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isChatLoading ? 'Aguarde a resposta...' : 'Faca uma pergunta...'}
                      className="flex-1 px-3 py-2.5 min-h-[44px] border border-ceramic-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      disabled={isChatLoading}
                      aria-required="true"
                    />
                    {voiceChat.isSupported && !isChatLoading && (
                      <button
                        type="button"
                        onClick={voiceChat.toggle}
                        className={`min-w-[44px] min-h-[44px] px-3 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          voiceChat.isListening
                            ? 'bg-ceramic-error text-white animate-pulse focus:ring-ceramic-error'
                            : 'bg-ceramic-cool text-ceramic-text-secondary hover:text-ceramic-accent focus:ring-orange-500'
                        }`}
                        aria-label={voiceChat.isListening ? 'Parar ditado por voz' : 'Ditar pergunta por voz'}
                      >
                        {voiceChat.isListening ? (
                          <MicOff className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          <Mic className="w-5 h-5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                    {isChatLoading ? (
                      <button
                        type="button"
                        onClick={handleCancelChat}
                        className="min-w-[44px] min-h-[44px] px-3 py-2.5 bg-ceramic-error text-white rounded-lg hover:bg-ceramic-error-hover transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-error focus:ring-offset-2"
                        aria-label="Cancelar resposta"
                      >
                        <StopCircle className="w-5 h-5" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="min-w-[44px] min-h-[44px] px-3 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-ceramic-cool disabled:text-ceramic-text-secondary disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        aria-label="Enviar pergunta"
                      >
                        <Send className="w-5 h-5" aria-hidden="true" />
                      </button>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* LIVE AUDIO MODE */}
            {chatMode === 'audio' && (
              <div className="flex flex-col h-80">
                {/* Audio control area */}
                <div className="flex flex-col items-center justify-center py-6 px-4 border-b border-ceramic-border">
                  {/* Waveform + status */}
                  <div className="flex flex-col items-center gap-3">
                    <AudioWaveform
                      level={liveAudio.audioLevel}
                      isActive={liveAudio.status === 'streaming' || liveAudio.status === 'connected'}
                    />
                    <p className="text-xs text-ceramic-secondary">
                      {liveAudio.status === 'idle' || liveAudio.status === 'disconnected'
                        ? 'Converse por voz com a IA sobre o convidado'
                        : liveAudio.status === 'connecting'
                        ? 'Conectando ao Gemini Live...'
                        : liveAudio.status === 'streaming'
                        ? 'Conversa ao vivo — fale naturalmente'
                        : liveAudio.status === 'connected'
                        ? 'Conectado — aguardando audio'
                        : 'Erro na conexao'}
                    </p>
                  </div>

                  {/* Connect / Disconnect button */}
                  <div className="mt-4">
                    {liveAudio.status === 'idle' || liveAudio.status === 'disconnected' || liveAudio.status === 'error' ? (
                      <button
                        onClick={() => liveAudio.connect()}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        aria-label="Iniciar conversa ao vivo"
                      >
                        <Phone className="w-5 h-5" aria-hidden="true" />
                        <span>Iniciar Conversa</span>
                      </button>
                    ) : liveAudio.status === 'connecting' ? (
                      <button
                        disabled
                        className="flex items-center gap-2 px-6 py-3 bg-ceramic-cool text-ceramic-text-secondary rounded-full cursor-not-allowed font-medium"
                        aria-label="Conectando"
                        aria-busy="true"
                      >
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        <span>Conectando...</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => liveAudio.disconnect()}
                        className="flex items-center gap-2 px-6 py-3 bg-ceramic-error text-white rounded-full hover:bg-red-600 transition-colors font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-ceramic-error focus:ring-offset-2"
                        aria-label="Encerrar conversa ao vivo"
                      >
                        <PhoneOff className="w-5 h-5" aria-hidden="true" />
                        <span>Encerrar</span>
                      </button>
                    )}
                  </div>

                  {/* Error display */}
                  {liveAudio.error && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-ceramic-error">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      <span>{liveAudio.error}</span>
                    </div>
                  )}
                </div>

                {/* Live transcript */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  role="log"
                  aria-live="polite"
                  aria-label="Transcricao da conversa ao vivo"
                >
                  {liveAudio.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div className="space-y-2">
                        <Radio className="w-8 h-8 text-ceramic-text-tertiary mx-auto" aria-hidden="true" />
                        <p className="text-ceramic-tertiary text-sm">
                          {liveAudio.status === 'idle' || liveAudio.status === 'disconnected'
                            ? 'Clique em Iniciar Conversa para comecar'
                            : 'A transcricao aparecera aqui...'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    liveAudio.messages.map((msg, idx) => (
                      <div
                        key={`${msg.role}-${msg.timestamp.getTime()}-${idx}`}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-orange-500 text-white'
                              : 'bg-ceramic-surface-secondary text-ceramic-text-primary'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-orange-200' : 'text-ceramic-tertiary'}`}>
                            {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Text input for audio mode (send text within live session) */}
                {(liveAudio.status === 'connected' || liveAudio.status === 'streaming') && (
                  <div className="border-t border-ceramic-border p-3">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (chatInput.trim()) {
                          liveAudio.sendText(chatInput.trim());
                          setChatInput('');
                        }
                      }}
                      className="flex gap-2"
                    >
                      <label htmlFor="audio-text-input" className="sr-only">Enviar texto na conversa ao vivo</label>
                      <input
                        id="audio-text-input"
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Digite para enviar texto..."
                        className="flex-1 px-3 py-2 min-h-[40px] border border-ceramic-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="min-w-[40px] min-h-[40px] px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-ceramic-cool disabled:text-ceramic-text-secondary disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        aria-label="Enviar texto"
                      >
                        <Send className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Sources Modal */}
      {showSourcesModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-labelledby="sources-modal-title"
          aria-modal="true"
        >
          <div className="bg-ceramic-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-ceramic-surface border-b border-ceramic-border p-6 flex items-center justify-between">
              <h2 id="sources-modal-title" className="text-lg font-bold text-ceramic-text-primary">Adicionar Fontes</h2>
              <button
                onClick={() => {
                  setShowSourcesModal(false);
                  setSourceText('');
                  setSourceUrl('');
                  setSourceFile(null);
                }}
                className="text-ceramic-tertiary hover:text-ceramic-secondary focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                aria-label="Fechar modal"
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="source-text" className="block text-sm font-medium text-ceramic-text-primary mb-2">Texto</label>
                <textarea
                  id="source-text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Cole informações..."
                  rows={4}
                  className="w-full px-3 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                />
              </div>
              <div>
                <label htmlFor="source-url" className="block text-sm font-medium text-ceramic-text-primary mb-2">URL</label>
                <input
                  id="source-url"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                  className="w-full px-3 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label htmlFor="source-file" className="block text-sm font-medium text-ceramic-text-primary mb-2">Arquivo</label>
                <input
                  id="source-file"
                  type="file"
                  onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  accept=".pdf,.txt,.doc,.docx"
                />
              </div>
              <button
                onClick={handleAddCustomSource}
                disabled={isProcessingSources}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-ceramic-cool disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                aria-label={isProcessingSources ? 'Adicionando fonte' : 'Adicionar fonte'}
                aria-busy={isProcessingSources}
              >
                {isProcessingSources ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Adicionando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Adicionar</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowSourcesModal(false);
                  setSourceText('');
                  setSourceUrl('');
                  setSourceFile(null);
                }}
                className="w-full px-4 py-2 border border-ceramic-border text-ceramic-text-primary rounded-lg hover:bg-ceramic-base transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {research.dossier && (
        <div className="border-t border-ceramic-border bg-ceramic-surface px-4 py-4 md:px-8 md:py-6 flex justify-end gap-4">
          <button
            onClick={() => actions.setStage('pauta')}
            className="w-full md:w-auto px-6 py-3 min-h-[44px] bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            aria-label="Ir para próxima etapa: Pauta"
          >
            <span>Próximo: Pauta</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
