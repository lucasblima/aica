/**
 * ContextSourcesIndicator - Visual indicator showing which context sources are being used by the AI
 *
 * Shows chips for:
 * - Edital PDF (shared context for all projects)
 * - Project Documents (specific to this project)
 * - Briefing (manual user input)
 */

import React from 'react';
import { FileText, FolderOpen, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';

interface ContextSourcesIndicatorProps {
  hasEditalPDF: boolean;
  hasProjectDocuments: boolean;
  hasBriefing: boolean;
  editalCharCount?: number;
  projectDocsCharCount?: number;
  className?: string;
}

export function ContextSourcesIndicator({
  hasEditalPDF,
  hasProjectDocuments,
  hasBriefing,
  editalCharCount,
  projectDocsCharCount,
  className = ''
}: ContextSourcesIndicatorProps) {
  const sources = [
    {
      id: 'edital',
      label: 'Edital PDF',
      icon: FileText,
      active: hasEditalPDF,
      charCount: editalCharCount,
      color: 'purple',
      priority: 1
    },
    {
      id: 'project-docs',
      label: 'Documentos do Projeto',
      icon: FolderOpen,
      active: hasProjectDocuments,
      charCount: projectDocsCharCount,
      color: 'blue',
      priority: 2
    },
    {
      id: 'briefing',
      label: 'Briefing',
      icon: Edit3,
      active: hasBriefing,
      color: 'green',
      priority: 3
    }
  ];

  const activeSources = sources.filter(s => s.active);

  if (activeSources.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="w-4 h-4 text-ceramic-text-tertiary" />
        <p className="text-xs text-ceramic-text-tertiary">
          Nenhum contexto disponível para a IA
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <p className="text-xs font-medium text-ceramic-text-secondary">
          Fontes de Contexto para IA:
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeSources.map((source) => {
          const Icon = source.icon;
          const colorClasses = {
            purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
          };

          return (
            <div
              key={source.id}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClasses[source.color as keyof typeof colorClasses]} text-xs font-medium`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{source.label}</span>
              {source.charCount && source.charCount > 0 && (
                <span className="opacity-60">
                  ({Math.round(source.charCount / 1000)}k chars)
                </span>
              )}
              <span className="opacity-40 text-[10px]">
                P{source.priority}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-ceramic-text-tertiary italic">
        P1 = Prioridade Máxima, P2 = Alta, P3 = Média
      </p>
    </div>
  );
}
