/**
 * WorkspaceHeader - Compact header with project info and save status
 */

import React from 'react';
import { ArrowLeft, Save, Loader2, FileText, FolderOpen } from 'lucide-react';

interface WorkspaceHeaderProps {
  projectName: string;
  opportunityTitle: string;
  onBack: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  pdfCharCount?: number;
  documentCount?: number;
  onShowPdf?: () => void;
  onShowDocuments?: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  projectName,
  opportunityTitle,
  onBack,
  isSaving = false,
  lastSaved,
  pdfCharCount,
  documentCount = 0,
  onShowPdf,
  onShowDocuments,
}) => {
  return (
    <div className="flex-shrink-0 sticky top-0 z-20 bg-ceramic-base border-b border-[#5C554B]/10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {/* Row 1: Navigation & Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-2">
          {/* Left: Back + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="ceramic-concave w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-[#5C554B] hover:scale-95 active:scale-90 transition-transform flex-shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[9px] sm:text-[10px] font-bold text-[#948D82] uppercase tracking-widest truncate">
              {opportunityTitle}
            </span>
          </div>

          {/* Right: Save Status + Context Chips */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Context Chips */}
            {pdfCharCount && pdfCharCount > 0 && onShowPdf && (
              <button
                onClick={onShowPdf}
                className="ceramic-concave px-2 sm:px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-ceramic-accent hover:scale-95 transition-transform"
                title="Ver conteudo do edital"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edital</span>
                <span className="text-[10px] text-[#948D82]">
                  {Math.round(pdfCharCount / 1000)}k
                </span>
              </button>
            )}

            {onShowDocuments && (
              <button
                onClick={onShowDocuments}
                className="ceramic-concave px-2 sm:px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-ceramic-info hover:scale-95 transition-transform"
                title="Gerenciar documentos"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Docs</span>
                <span className="text-[10px] bg-ceramic-info-bg text-ceramic-info px-1.5 rounded-full">
                  {documentCount}
                </span>
              </button>
            )}

            {/* Save Status */}
            <div className="flex items-center gap-1 text-[10px] text-[#948D82]">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden sm:inline">Salvando...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {lastSaved.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Row 2: Project Title */}
        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-[#5C554B] leading-tight truncate">
          {projectName}
        </h1>
      </div>
    </div>
  );
};

export default WorkspaceHeader;
