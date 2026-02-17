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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePodcastWorkspace } from '@/modules/studio/context/PodcastWorkspaceContext';
import { useWorkspaceAI } from '@/modules/studio/hooks/useWorkspaceAI';
import { useGeminiLive, type GeminiLiveContext } from '@/modules/studio/services/geminiLiveService';
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
} from 'lucide-react';
import type { WorkspaceCustomSource } from '@/modules/studio/types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ResearchStage');

type ResearchTab = 'bio' | 'ficha' | 'noticias';

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

  // Build context for Gemini Live chat
  const geminiContext = useMemo<GeminiLiveContext>(() => {
    const dossierSummary = research.dossier
      ? `${research.dossier.biography?.substring(0, 500) || ''}${
          research.dossier.controversies?.length
            ? ` Controversias: ${research.dossier.controversies.slice(0, 2).join(', ')}`
            : ''
        }`
      : '';

    return {
      guest_name: setup.guestName || 'Convidado',
      guest_bio: setup.guestBio || research.dossier?.biography?.substring(0, 300),
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
        label: sourceFile?.name || sourceUrl || sourceText.substring(0, 50),
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
    await actions.generateDossier();
  };

  const handleRegenerateDossier = async () => {
    await actions.regenerateDossier();
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
            <h1 className="text-xl md:text-3xl font-bold text-ceramic-primary">Pesquisa do Convidado</h1>
          </div>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden p-2.5 rounded-lg bg-ceramic-surface-secondary text-ceramic-primary hover:bg-ceramic-cool transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
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

              <button
                onClick={() => setShowSourcesModal(true)}
                className="w-full px-4 py-3 bg-ceramic-surface-secondary text-ceramic-primary rounded-lg hover:bg-ceramic-cool transition-colors inline-flex items-center justify-center space-x-2 font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
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
                    : 'border-transparent text-ceramic-secondary hover:text-ceramic-primary'
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
                    : 'border-transparent text-ceramic-secondary hover:text-ceramic-primary'
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
                    : 'border-transparent text-ceramic-secondary hover:text-ceramic-primary'
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
              <h4 className="text-sm font-semibold text-ceramic-primary mb-3">
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
                        <span className="font-medium text-ceramic-primary truncate">{source.label || source.content.substring(0, 30)}</span>
                      </div>
                      <span className="text-ceramic-tertiary">{source.type === 'url' ? 'URL' : source.type === 'file' ? 'Arquivo' : 'Texto'}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSource(source.id)}
                      className="p-1 hover:bg-ceramic-error-bg rounded transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-ceramic-error"
                      aria-label={`Remover fonte: ${source.label || source.content.substring(0, 30)}`}
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
                    <h3 className="text-lg font-semibold text-ceramic-primary mb-2">Dossier nao gerado</h3>
                    <p className="text-ceramic-secondary max-w-sm">
                      Clique em Gerar Dossier para comecar
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 md:p-8">
                {/* Biography Tab */}
                {activeTab === 'bio' && (
                  <div className="max-w-3xl" role="tabpanel" id="bio-panel" aria-labelledby="bio-tab">
                    <h2 className="text-2xl font-bold text-ceramic-primary mb-4">Biografia</h2>
                    <p className="text-ceramic-primary whitespace-pre-wrap leading-relaxed">
                      {research.dossier.biography}
                    </p>
                  </div>
                )}

                {/* Technical Sheet Tab */}
                {activeTab === 'ficha' && (
                  <div className="max-w-3xl" role="tabpanel" id="ficha-panel" aria-labelledby="ficha-tab">
                    <h2 className="text-2xl font-bold text-ceramic-primary mb-6">Ficha Técnica</h2>
                    {research.dossier.technicalSheet ? (
                      <div className="space-y-6">
                        {research.dossier.technicalSheet.fullName && (
                          <div>
                            <h3 className="text-sm font-semibold text-ceramic-primary mb-2">Nome Completo</h3>
                            <p className="text-ceramic-secondary">{research.dossier.technicalSheet.fullName}</p>
                          </div>
                        )}
                        {research.dossier.technicalSheet.education && research.dossier.technicalSheet.education.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-ceramic-primary mb-3">Educação</h3>
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
                            <h3 className="text-sm font-semibold text-ceramic-primary mb-3">Carreira</h3>
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
                            <h3 className="text-sm font-semibold text-ceramic-primary mb-3">Fatos</h3>
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
                    <h2 className="text-2xl font-bold text-ceramic-primary mb-6">Notícias & Controvérsias</h2>
                    {research.dossier.controversies && research.dossier.controversies.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-ceramic-primary mb-4">Controvérsias</h3>
                        <div className="space-y-3">
                          {research.dossier.controversies.map((controversy, idx) => (
                            <div key={idx} className="p-4 bg-ceramic-error-bg border border-ceramic-error/30 rounded-lg">
                              <p className="text-ceramic-primary">{controversy}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {research.dossier.iceBreakers && research.dossier.iceBreakers.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-ceramic-primary mb-4">Quebra-Gelo</h3>
                        <div className="space-y-3">
                          {research.dossier.iceBreakers.map((breaker, idx) => (
                            <div key={idx} className="p-4 bg-ceramic-info-bg border border-ceramic-info/30 rounded-lg">
                              <p className="text-ceramic-primary">{breaker}</p>
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

          {/* Chat Section - Gemini Live Integration */}
          <div className="border-t border-ceramic-border bg-ceramic-surface">
            {/* Chat Header with Connection Status */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-ceramic-border bg-ceramic-base">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" aria-hidden="true" />
                <span className="text-sm font-medium text-ceramic-primary">Chat com IA</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Connection indicator */}
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
                {/* Clear chat button */}
                {chatMessages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="text-xs text-ceramic-tertiary hover:text-ceramic-secondary px-2 py-1 rounded hover:bg-ceramic-surface-secondary transition-colors"
                    aria-label="Limpar chat"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

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

                {/* Chat messages */}
                {chatMessages.map((msg, idx) => (
                  <div
                    key={msg.timestamp.getTime()}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-orange-500 text-white'
                          : 'bg-ceramic-surface-secondary text-ceramic-primary'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {/* Streaming response */}
                {currentResponse && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] px-4 py-2 rounded-lg bg-ceramic-surface-secondary text-ceramic-primary">
                      <p className="text-sm whitespace-pre-wrap">{currentResponse}</p>
                      <span className="inline-block w-1.5 h-4 bg-orange-500 animate-pulse ml-0.5" aria-hidden="true" />
                    </div>
                  </div>
                )}

                {/* Loading indicator (when streaming hasn't started yet) */}
                {isChatLoading && !currentResponse && (
                  <div className="flex justify-start">
                    <div className="bg-ceramic-surface-secondary text-ceramic-primary px-4 py-2 rounded-lg flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span className="text-sm text-ceramic-secondary">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
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
                      className="min-w-[44px] min-h-[44px] px-3 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-ceramic-cool disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                      aria-label="Enviar pergunta"
                    >
                      <Send className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </form>
              </div>
            </div>
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
              <h2 id="sources-modal-title" className="text-lg font-bold text-ceramic-primary">Adicionar Fontes</h2>
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
                <label htmlFor="source-text" className="block text-sm font-medium text-ceramic-primary mb-2">Texto</label>
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
                <label htmlFor="source-url" className="block text-sm font-medium text-ceramic-primary mb-2">URL</label>
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
                <label htmlFor="source-file" className="block text-sm font-medium text-ceramic-primary mb-2">Arquivo</label>
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
                className="w-full px-4 py-2 border border-ceramic-border text-ceramic-primary rounded-lg hover:bg-ceramic-base transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
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
