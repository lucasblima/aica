/**
 * ResearchStage - Guest research and dossier generation
 * Track 2 Complete Implementation
 */

import React, { useState } from 'react';
import { usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';
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
} from 'lucide-react';
import type { CustomSource } from '../../types/workspace';

type ResearchTab = 'bio' | 'ficha' | 'noticias';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export default function ResearchStage() {
  const { state, actions } = usePodcastWorkspace();
  const { setup, research } = state;

  const [activeTab, setActiveTab] = useState<ResearchTab>('bio');
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isProcessingSources, setIsProcessingSources] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleAddCustomSource = async () => {
    if (!sourceText && !sourceUrl && !sourceFile) {
      alert('Por favor, adicione uma fonte');
      return;
    }

    setIsProcessingSources(true);
    try {
      const newSource: CustomSource = {
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
      console.error('Error adding custom source:', error);
    } finally {
      setIsProcessingSources(false);
    }
  };

  const handleRemoveSource = (sourceId: string) => {
    actions.removeCustomSource(sourceId);
  };

  const handleRegenerateDossier = () => {
    actions.regenerateDossier();
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: chatInput,
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        text: 'Resposta simulada. Integração com Gemini Live API em fase posterior.',
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center space-x-3 mb-2">
          <Sparkles className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-gray-900">Pesquisa do Convidado</h1>
        </div>
        <p className="text-gray-600">
          Gere o dossier completo sobre {setup.guestName || 'o convidado'}
        </p>
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Action Buttons */}
          <div className="p-6 border-b border-gray-200">
            <div className="space-y-3">
              {!research.dossier ? (
                <button
                  onClick={() => actions.generateDossier()}
                  disabled={research.isGenerating}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center space-x-2 font-medium"
                >
                  {research.isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Gerar Dossier</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRegenerateDossier}
                  disabled={research.isGenerating}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center space-x-2 font-medium"
                >
                  {research.isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Regenerando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>Regenerar</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setShowSourcesModal(true)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors inline-flex items-center justify-center space-x-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Adicionar Fontes</span>
              </button>
            </div>

            {research.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{research.error}</p>
              </div>
            )}

            {research.lastGenerated && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <span className="font-semibold">Gerado:</span> {new Date(research.lastGenerated).toLocaleString('pt-BR')}
              </div>
            )}
          </div>

          {/* Tabs */}
          {research.dossier && (
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('bio')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'bio'
                    ? 'border-orange-500 text-orange-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Bio
              </button>
              <button
                onClick={() => setActiveTab('ficha')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'ficha'
                    ? 'border-orange-500 text-orange-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Ficha
              </button>
              <button
                onClick={() => setActiveTab('noticias')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'noticias'
                    ? 'border-orange-500 text-orange-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Newspaper className="w-4 h-4 inline mr-2" />
                Notícias
              </button>
            </div>
          )}

          {/* Custom Sources List */}
          {research.customSources.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Fontes ({research.customSources.length})
              </h4>
              <div className="space-y-2">
                {research.customSources.map(source => (
                  <div key={source.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {source.type === 'url' && <LinkIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                        {source.type === 'file' && <Upload className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        {source.type === 'text' && <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                        <span className="font-medium text-gray-700 truncate">{source.label || source.content.substring(0, 30)}</span>
                      </div>
                      <span className="text-gray-500">{source.type === 'url' ? 'URL' : source.type === 'file' ? 'Arquivo' : 'Texto'}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveSource(source.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Dossier Content */}
          <div className="flex-1 overflow-y-auto">
            {!research.dossier ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dossier não gerado</h3>
                  <p className="text-gray-600 max-w-sm">
                    Clique em Gerar Dossier para começar
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                {activeTab === 'bio' && (
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Biografia</h2>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {research.dossier.biography}
                    </p>
                  </div>
                )}

                {activeTab === 'ficha' && (
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Ficha Técnica</h2>
                    {research.dossier.technicalSheet ? (
                      <div className="space-y-6">
                        {research.dossier.technicalSheet.fullName && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Nome Completo</h3>
                            <p className="text-gray-600">{research.dossier.technicalSheet.fullName}</p>
                          </div>
                        )}
                        {research.dossier.technicalSheet.education && research.dossier.technicalSheet.education.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Educação</h3>
                            <ul className="space-y-2">
                              {research.dossier.technicalSheet.education.map((edu, idx) => (
                                <li key={idx} className="text-gray-600">
                                  <span className="font-medium">{edu.degree}</span> - {edu.institution}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {research.dossier.technicalSheet.careerHighlights && research.dossier.technicalSheet.careerHighlights.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Carreira</h3>
                            <ul className="space-y-2">
                              {research.dossier.technicalSheet.careerHighlights.map((career, idx) => (
                                <li key={idx} className="text-gray-600">
                                  <span className="font-medium">{career.title}</span> na {career.organization}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {research.dossier.technicalSheet.keyFacts && research.dossier.technicalSheet.keyFacts.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Fatos</h3>
                            <ul className="space-y-2">
                              {research.dossier.technicalSheet.keyFacts.map((fact, idx) => (
                                <li key={idx} className="text-gray-600 flex items-start gap-2">
                                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{fact}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        <p>Ficha técnica não disponível</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'noticias' && (
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Notícias & Controvérsias</h2>
                    {research.dossier.controversies && research.dossier.controversies.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Controvérsias</h3>
                        <div className="space-y-3">
                          {research.dossier.controversies.map((controversy, idx) => (
                            <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-gray-700">{controversy}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {research.dossier.iceBreakers && research.dossier.iceBreakers.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quebra-Gelo</h3>
                        <div className="space-y-3">
                          {research.dossier.iceBreakers.map((breaker, idx) => (
                            <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-gray-700">{breaker}</p>
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

          {/* Chat Section */}
          <div className="border-t border-gray-200 bg-white">
            <div className="flex flex-col h-80">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-gray-500 text-sm">
                      Faça perguntas sobre o convidado
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Faça uma pergunta..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Sources Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Adicionar Fontes</h2>
              <button
                onClick={() => {
                  setShowSourcesModal(false);
                  setSourceText('');
                  setSourceUrl('');
                  setSourceFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Texto</label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Cole informações..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://exemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo</label>
                <input
                  type="file"
                  onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  accept=".pdf,.txt,.doc,.docx"
                />
              </div>
              <button
                onClick={handleAddCustomSource}
                disabled={isProcessingSources}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isProcessingSources ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adicionando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
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
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {research.dossier && (
        <div className="border-t border-gray-200 bg-white px-8 py-6 flex justify-end gap-4">
          <button
            onClick={() => actions.setStage('pauta')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2 shadow-sm"
          >
            <span>Próximo: Pauta</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
