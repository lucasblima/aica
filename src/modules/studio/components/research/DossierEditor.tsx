import React, { useState, useCallback } from 'react';
import { FileText, Newspaper, ClipboardList, ExternalLink, MessageSquare, Loader2, Plus, X, Pencil, Check, Sparkles } from 'lucide-react';
import { usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';
import { useWorkspaceAI } from '../../hooks/useWorkspaceAI';

type DossierTab = 'bio' | 'ficha' | 'noticias' | 'perguntas';

export function DossierEditor() {
  const { state, actions } = usePodcastWorkspace();
  const { dossier, customSources } = state.research;
  const [activeTab, setActiveTab] = useState<DossierTab>('bio');

  // Interview questions state
  const ai = useWorkspaceAI();
  const [questions, setQuestions] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Initialize questions from dossier iceBreakers when tab is first selected
  const initQuestionsFromDossier = useCallback(() => {
    if (dossier?.iceBreakers && dossier.iceBreakers.length > 0 && questions.length === 0) {
      setQuestions([...dossier.iceBreakers]);
    }
  }, [dossier, questions.length]);

  const handleTabChange = useCallback((tabId: DossierTab) => {
    setActiveTab(tabId);
    if (tabId === 'perguntas') {
      initQuestionsFromDossier();
    }
  }, [initQuestionsFromDossier]);

  // Generate more interview questions via AI
  const handleGenerateQuestions = useCallback(async () => {
    if (!dossier) return;
    const generated = await ai.generateMoreIceBreakers(
      dossier.guestName,
      dossier.episodeTheme,
      questions,
      5
    );
    if (generated.length > 0) {
      const updated = [...questions, ...generated];
      setQuestions(updated);
      // Sync back to dossier
      actions.hydrate({
        research: {
          ...state.research,
          dossier: { ...dossier, iceBreakers: updated },
        },
      });
    }
  }, [dossier, questions, ai, actions, state.research]);

  // Remove a question
  const handleRemoveQuestion = useCallback((index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (dossier) {
      actions.hydrate({
        research: {
          ...state.research,
          dossier: { ...dossier, iceBreakers: updated },
        },
      });
    }
  }, [questions, dossier, actions, state.research]);

  // Start editing a question
  const handleStartEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setEditText(questions[index]);
  }, [questions]);

  // Save edited question
  const handleSaveEdit = useCallback(() => {
    if (editingIndex === null || !editText.trim()) return;
    const updated = [...questions];
    updated[editingIndex] = editText.trim();
    setQuestions(updated);
    setEditingIndex(null);
    setEditText('');
    if (dossier) {
      actions.hydrate({
        research: {
          ...state.research,
          dossier: { ...dossier, iceBreakers: updated },
        },
      });
    }
  }, [editingIndex, editText, questions, dossier, actions, state.research]);

  // Add a new manual question
  const handleAddQuestion = useCallback(() => {
    if (!newQuestion.trim()) return;
    const updated = [...questions, newQuestion.trim()];
    setQuestions(updated);
    setNewQuestion('');
    setIsAddingNew(false);
    if (dossier) {
      actions.hydrate({
        research: {
          ...state.research,
          dossier: { ...dossier, iceBreakers: updated },
        },
      });
    }
  }, [newQuestion, questions, dossier, actions, state.research]);

  const tabs: Array<{ id: DossierTab; label: string; icon: React.FC<any> }> = [
    { id: 'bio', label: 'Biografia', icon: FileText },
    { id: 'ficha', label: 'Ficha Tecnica', icon: ClipboardList },
    { id: 'noticias', label: 'Noticias', icon: Newspaper },
    { id: 'perguntas', label: 'Perguntas', icon: MessageSquare },
  ];

  if (!dossier) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <FileText className="w-12 h-12 text-ceramic-text-secondary/30 mx-auto mb-3" />
          <p className="text-ceramic-text-secondary">Gere o dossie para visualizar aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tabs */}
      <div className="flex border-b border-ceramic-border px-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'perguntas' && questions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                  {questions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'bio' && (
          <div className="prose prose-sm max-w-none">
            {dossier.biography ? (
              <div className="whitespace-pre-wrap text-sm text-ceramic-text-primary leading-relaxed">
                {dossier.biography}
              </div>
            ) : (
              <p className="text-ceramic-text-secondary italic">Biografia nao disponivel</p>
            )}
          </div>
        )}

        {activeTab === 'ficha' && (
          <div className="space-y-3">
            {dossier.technicalSheet ? (
              typeof dossier.technicalSheet === 'string' ? (
                <div className="whitespace-pre-wrap text-sm text-ceramic-text-primary">{dossier.technicalSheet}</div>
              ) : (
                Object.entries(dossier.technicalSheet).map(([key, value]) => (
                  <div key={key} className="flex gap-3 py-2 border-b border-ceramic-border/50 last:border-0">
                    <span className="text-xs font-semibold text-ceramic-text-secondary uppercase w-32 flex-shrink-0">{key}</span>
                    <span className="text-sm text-ceramic-text-primary">{String(value)}</span>
                  </div>
                ))
              )
            ) : (
              <p className="text-ceramic-text-secondary italic">Ficha tecnica nao disponivel</p>
            )}
          </div>
        )}

        {activeTab === 'noticias' && (
          <div className="space-y-3">
            {dossier.controversies && dossier.controversies.length > 0 ? (
              dossier.controversies.map((item: string, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-ceramic-cool/50 border border-ceramic-border/50">
                  <p className="text-sm text-ceramic-text-primary">{item}</p>
                </div>
              ))
            ) : (
              <p className="text-ceramic-text-secondary italic">Nenhuma noticia ou controversia encontrada</p>
            )}
          </div>
        )}

        {activeTab === 'perguntas' && (
          <div className="space-y-3">
            {/* Generate Questions Button */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-ceramic-text-secondary">
                {questions.length > 0
                  ? `${questions.length} pergunta${questions.length !== 1 ? 's' : ''} para a entrevista`
                  : 'Gere perguntas personalizadas para a entrevista'}
              </p>
              <button
                onClick={handleGenerateQuestions}
                disabled={ai.isGeneratingIceBreakers}
                aria-label="Gerar perguntas para entrevista"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {ai.isGeneratingIceBreakers ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                )}
                Gerar Perguntas
              </button>
            </div>

            {/* Loading state */}
            {ai.isGeneratingIceBreakers && questions.length === 0 && (
              <div className="flex items-center justify-center py-8" role="status" aria-label="Gerando perguntas">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" aria-hidden="true" />
                  <p className="text-sm text-ceramic-text-secondary">Gerando perguntas personalizadas...</p>
                </div>
              </div>
            )}

            {/* Questions List */}
            {questions.length > 0 && (
              <ol className="space-y-2" aria-label="Lista de perguntas para entrevista">
                {questions.map((question, index) => (
                  <li
                    key={index}
                    className="group flex items-start gap-3 p-3 rounded-lg bg-ceramic-cool/50 border border-ceramic-border/50 hover:border-ceramic-border transition-colors"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>

                    {editingIndex === index ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') { setEditingIndex(null); setEditText(''); }
                          }}
                          aria-label={`Editar pergunta ${index + 1}`}
                          className="flex-1 px-2 py-1 text-sm border border-ceramic-border rounded-lg bg-ceramic-base text-ceramic-text-primary focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          aria-label="Salvar edicao"
                          className="p-1 rounded text-ceramic-success hover:bg-ceramic-cool transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingIndex(null); setEditText(''); }}
                          aria-label="Cancelar edicao"
                          className="p-1 rounded text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-sm text-ceramic-text-primary">{question}</p>
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(index)}
                            aria-label={`Editar pergunta ${index + 1}`}
                            className="p-1 rounded text-ceramic-text-secondary hover:bg-ceramic-cool hover:text-ceramic-text-primary transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(index)}
                            aria-label={`Remover pergunta ${index + 1}`}
                            className="p-1 rounded text-ceramic-text-secondary hover:bg-ceramic-error/10 hover:text-ceramic-error transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {/* Empty state (no questions, not loading) */}
            {questions.length === 0 && !ai.isGeneratingIceBreakers && (
              <div className="flex flex-col items-center py-8 text-center">
                <MessageSquare className="w-10 h-10 text-ceramic-text-secondary/30 mb-3" aria-hidden="true" />
                <p className="text-sm text-ceramic-text-secondary mb-1">
                  Nenhuma pergunta gerada ainda
                </p>
                <p className="text-xs text-ceramic-text-secondary/70">
                  Clique em &quot;Gerar Perguntas&quot; para criar perguntas personalizadas baseadas no dossie
                </p>
              </div>
            )}

            {/* Add manual question */}
            {isAddingNew ? (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddQuestion();
                    if (e.key === 'Escape') { setIsAddingNew(false); setNewQuestion(''); }
                  }}
                  placeholder="Digite sua pergunta..."
                  aria-label="Nova pergunta para entrevista"
                  className="flex-1 px-3 py-2 text-sm border border-ceramic-border rounded-lg bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleAddQuestion}
                  disabled={!newQuestion.trim()}
                  aria-label="Adicionar pergunta"
                  className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setIsAddingNew(false); setNewQuestion(''); }}
                  aria-label="Cancelar nova pergunta"
                  className="px-3 py-2 rounded-lg bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary text-sm transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNew(true)}
                aria-label="Adicionar pergunta manualmente"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary text-sm font-medium transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Pergunta
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sources List */}
      {customSources.length > 0 && (
        <div className="border-t border-ceramic-border p-3">
          <h4 className="text-xs font-semibold text-ceramic-text-secondary mb-2">Fontes Personalizadas</h4>
          <div className="flex flex-wrap gap-2">
            {customSources.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ceramic-cool text-xs text-ceramic-text-secondary">
                {s.type === 'url' && <ExternalLink className="w-3 h-3" />}
                {s.label || s.content.substring(0, 40) || 'Fonte'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
