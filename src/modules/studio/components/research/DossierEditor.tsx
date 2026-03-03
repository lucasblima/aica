import React, { useState } from 'react';
import { FileText, Newspaper, ClipboardList, ExternalLink } from 'lucide-react';
import { usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';

type DossierTab = 'bio' | 'ficha' | 'noticias';

export function DossierEditor() {
  const { state } = usePodcastWorkspace();
  const { dossier, customSources } = state.research;
  const [activeTab, setActiveTab] = useState<DossierTab>('bio');

  const tabs: Array<{ id: DossierTab; label: string; icon: React.FC<any> }> = [
    { id: 'bio', label: 'Biografia', icon: FileText },
    { id: 'ficha', label: 'Ficha Tecnica', icon: ClipboardList },
    { id: 'noticias', label: 'Noticias', icon: Newspaper },
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
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
