import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  RefreshCw,
  Check,
  Loader2,
  Download,
  ExternalLink,
  Sparkles,
  FileText,
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import type { FormField, GrantResponse } from '../types';
import { RESPONSE_STATUS_LABELS } from '../types';
import { ContextSourcesIndicator } from './ContextSourcesIndicator';
import { GRANTS_GRADIENTS, GRANTS_SHADOWS } from '../constants/gradients';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Proposalgeneratorview');

/**
 * ProposalGeneratorView Component
 * Full-screen view for generating and reviewing proposal fields
 * Features AI-powered generation, editing, versioning, and export
 */

interface ProposalGeneratorViewProps {
  projectId: string;
  opportunityTitle: string;
  formFields: FormField[];
  briefing: Record<string, string>; // Campos dinâmicos do briefing
  initialResponses?: Record<string, GrantResponse>;
  onGenerateField: (fieldId: string) => Promise<string>;
  onSaveResponse: (fieldId: string, content: string, status?: string) => Promise<void>;
  onProposalComplete?: () => Promise<void>; // Called when all fields are approved
  externalSystemUrl?: string;
  onBack?: () => void;
  onBackToEdital?: () => void; // Navigate directly to edital (for completed proposals)
  // Context sources for indicator
  editalPdfContent?: string | null;
  projectDocumentsContent?: string | null;
}

interface FieldState extends GrantResponse {
  isGenerating?: boolean;
  isEditing?: boolean;
  editContent?: string;
}

export const ProposalGeneratorView: React.FC<ProposalGeneratorViewProps> = ({
  projectId,
  opportunityTitle,
  formFields,
  briefing,
  initialResponses = {},
  onGenerateField,
  onSaveResponse,
  onProposalComplete,
  externalSystemUrl,
  onBack,
  onBackToEdital,
  editalPdfContent,
  projectDocumentsContent
}) => {
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Initialize field states from initial responses
   */
  useEffect(() => {
    const initialStates: Record<string, FieldState> = {};
    formFields.forEach(field => {
      if (initialResponses[field.id]) {
        initialStates[field.id] = {
          ...initialResponses[field.id],
          isGenerating: false,
          isEditing: false
        };
      }
    });
    setFieldStates(initialStates);
  }, [formFields, initialResponses]);

  /**
   * Detect when all fields are approved and show confirmation modal
   */
  useEffect(() => {
    const progress = calculateProgress();
    const allApproved = progress.approved === progress.total && progress.total > 0;

    if (allApproved && !hasCalledComplete && !showSubmitConfirmation) {
      // Show confirmation modal instead of auto-submitting
      setShowSubmitConfirmation(true);
    }
  }, [fieldStates, formFields, hasCalledComplete, showSubmitConfirmation]);

  /**
   * Auto-collapse fields when they are approved
   */
  useEffect(() => {
    Object.entries(fieldStates).forEach(([fieldId, state]) => {
      if (state.status === 'approved' && expandedFields.has(fieldId)) {
        // Wait 800ms then auto-collapse
        setTimeout(() => {
          setExpandedFields(prev => {
            const next = new Set(prev);
            next.delete(fieldId);
            return next;
          });
        }, 800);
      }
    });
  }, [fieldStates, expandedFields]);

  /**
   * Handle submission confirmation
   */
  const handleConfirmSubmit = async () => {
    if (!onProposalComplete) return;

    setSubmissionPhase('submitting');

    try {
      await onProposalComplete();
      setHasCalledComplete(true);
      setSubmissionPhase('success');

      // Auto-close modal after showing success for 3 seconds
      setTimeout(() => {
        setShowSubmitConfirmation(false);
        setSubmissionPhase('idle');
      }, 3000);
    } catch (error) {
      log.error('Error submitting proposal:', error);
      setSubmissionPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao submeter proposta');
    }
  };

  /**
   * Handle cancel submission
   */
  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false);
    setSubmissionPhase('idle');
    setErrorMessage('');
  };

  /**
   * Calculate approval progress
   */
  const calculateProgress = () => {
    const total = formFields.length;
    const approved = formFields.filter(
      field => fieldStates[field.id]?.status === 'approved'
    ).length;
    return { approved, total, percentage: Math.round((approved / total) * 100) };
  };

  /**
   * Toggle field expansion
   */
  const toggleField = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  /**
   * Generate content for a single field
   */
  const handleGenerateField = async (fieldId: string) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        isGenerating: true
      } as FieldState
    }));

    try {
      const content = await onGenerateField(fieldId);

      setFieldStates(prev => ({
        ...prev,
        [fieldId]: {
          id: fieldId,
          project_id: projectId,
          field_id: fieldId,
          content,
          char_count: content.length,
          status: 'generated',
          versions: [{ content, created_at: new Date().toISOString() }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isGenerating: false
        }
      }));

      // Auto-expand after generation
      setExpandedFields(prev => new Set(prev).add(fieldId));
    } catch (error) {
      log.error('Error generating field:', error);
      setFieldStates(prev => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          isGenerating: false
        } as FieldState
      }));
    }
  };

  /**
   * Generate all fields sequentially
   */
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);

    for (const field of formFields) {
      if (!fieldStates[field.id] || fieldStates[field.id].status === 'generating') {
        await handleGenerateField(field.id);
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsGeneratingAll(false);
  };

  /**
   * Copy content to clipboard
   */
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add toast notification here
    } catch (error) {
      log.error('Failed to copy:', error);
    }
  };

  /**
   * Start editing a field
   */
  const startEditing = (fieldId: string) => {
    const currentContent = fieldStates[fieldId]?.content || '';
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        isEditing: true,
        editContent: currentContent,
        status: 'editing'
      } as FieldState
    }));
  };

  /**
   * Save edited content
   */
  const saveEdit = async (fieldId: string) => {
    const editContent = fieldStates[fieldId]?.editContent || '';

    try {
      await onSaveResponse(fieldId, editContent, 'generated');

      setFieldStates(prev => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          content: editContent,
          char_count: editContent.length,
          isEditing: false,
          editContent: undefined,
          status: 'generated',
          updated_at: new Date().toISOString()
        } as FieldState
      }));
    } catch (error) {
      log.error('Error saving edit:', error);
    }
  };

  /**
   * Cancel editing
   */
  const cancelEdit = (fieldId: string) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        isEditing: false,
        editContent: undefined,
        status: prev[fieldId]?.status === 'editing' ? 'generated' : prev[fieldId]?.status
      } as FieldState
    }));
  };

  /**
   * Approve a field
   */
  const approveField = async (fieldId: string) => {
    const content = fieldStates[fieldId]?.content || '';

    try {
      await onSaveResponse(fieldId, content, 'approved');

      setFieldStates(prev => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          status: 'approved',
          updated_at: new Date().toISOString()
        } as FieldState
      }));
    } catch (error) {
      log.error('Error approving field:', error);
    }
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status?: GrantResponse['status']): string => {
    switch (status) {
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'generated':
        return 'bg-purple-100 text-purple-800';
      case 'editing':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get character count color
   */
  const getCharCountColor = (count: number, maxChars: number): string => {
    const percentage = (count / maxChars) * 100;
    if (percentage > 100) return 'text-red-600';
    if (percentage > 90) return 'text-orange-600';
    return 'text-ceramic-text-secondary';
  };

  /**
   * Check if a field can be collapsed based on its status
   * Only approved fields can be collapsed to save space
   */
  const canCollapseField = (fieldId: string): boolean => {
    const state = fieldStates[fieldId];
    if (!state?.content) return false; // No content = can't collapse
    return state.status === 'approved';
  };

  /**
   * Export proposal to markdown file
   */
  const handleExport = () => {
    try {
      // Build markdown content
      let markdown = `# Proposta: ${opportunityTitle}\n\n`;
      markdown += `**Gerado em:** ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n\n`;
      markdown += `---\n\n`;

      formFields.forEach((field, index) => {
        const state = fieldStates[field.id];
        if (state?.content) {
          markdown += `## ${index + 1}. ${field.label}\n\n`;
          if (field.placeholder) {
            markdown += `*${field.placeholder}*\n\n`;
          }
          markdown += `${state.content}\n\n`;
          markdown += `**Caracteres:** ${state.char_count} / ${field.max_chars}\n\n`;
          markdown += `---\n\n`;
        }
      });

      // Create blob and download
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `proposta_${opportunityTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      log.debug('Proposal exported successfully');
    } catch (error) {
      log.error('Error exporting proposal:', error);
      alert('Erro ao exportar proposta. Tente novamente.');
    }
  };

  const progress = calculateProgress();
  const allApproved = progress.approved === progress.total;

  return (
    <div className="h-screen overflow-y-auto bg-ceramic-base">
      {/* Compact Header - Optimized for space */}
      <div className="sticky top-0 z-10 bg-ceramic-base/95 backdrop-blur-sm border-b border-ceramic-text-secondary/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Single row with all info */}
          <div className="flex items-center justify-between gap-4 mb-3">
            {/* Left: Back button + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {onBack && (
                <button
                  onClick={onBack}
                  className="ceramic-concave w-9 h-9 flex items-center justify-center hover:scale-95 transition-transform flex-shrink-0"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4 text-ceramic-text-primary" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-ceramic-text-primary truncate">
                  {opportunityTitle}
                </h1>
                <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary">
                  <span className="font-medium">
                    {progress.approved} / {progress.total} aprovados ({progress.percentage}%)
                  </span>
                  {/* Compact Context Indicators */}
                  <div className="flex items-center gap-2">
                    {editalPdfContent && editalPdfContent.length > 0 && (
                      <span className="flex items-center gap-1 text-purple-600">
                        <FileText className="w-3 h-3" />
                        PDF
                      </span>
                    )}
                    {projectDocumentsContent && projectDocumentsContent.length > 0 && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <FileText className="w-3 h-3" />
                        Docs
                      </span>
                    )}
                    {Object.keys(briefing).length > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Lightbulb className="w-3 h-3" />
                        Briefing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Generate button */}
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || allApproved}
              className="ceramic-concave px-5 py-2 font-bold text-sm text-ceramic-text-primary hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2 flex-shrink-0"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Todos
                </>
              )}
            </button>
          </div>

          {/* Compact Progress Bar */}
          <div className="ceramic-trough p-1">
            <motion.div
              className={`h-1.5 rounded-full ${GRANTS_GRADIENTS.progress.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        {formFields.map((field, index) => {
          const state = fieldStates[field.id];
          const isExpanded = expandedFields.has(field.id);
          const isGenerating = state?.isGenerating || false;
          const isEditing = state?.isEditing || false;
          const content = isEditing ? (state?.editContent || '') : (state?.content || '');
          const charCount = content.length;
          const hasContent = !!state?.content;

          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="ceramic-card overflow-hidden"
            >
              {/* Field Header */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <button
                    onClick={() => toggleField(field.id)}
                    className="flex-1 text-left flex items-start gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-ceramic-text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
                        {field.label}
                        {field.required && (
                          <span className="ml-2 text-sm font-normal text-red-600">*</span>
                        )}
                      </h3>
                      {field.placeholder && (
                        <p className="text-sm text-ceramic-text-tertiary">
                          {field.placeholder}
                        </p>
                      )}
                    </div>
                    {/* Chevron - show when has content */}
                    {hasContent && (
                      isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary flex-shrink-0" />
                      )
                    )}
                  </button>
                </div>

                {/* Field Info Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {state?.status && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                          state.status
                        )}`}
                      >
                        {RESPONSE_STATUS_LABELS[state.status]}
                      </span>
                    )}
                    {hasContent && (
                      <span
                        className={`text-sm font-medium ${getCharCountColor(
                          charCount,
                          field.max_chars
                        )}`}
                      >
                        {charCount} / {field.max_chars}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Approve button - always visible when content exists and not approved */}
                    {hasContent && state?.status !== 'approved' && !isEditing && !isGenerating && (
                      <button
                        onClick={() => approveField(field.id)}
                        className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2 bg-green-50 text-green-700"
                        title="Aprovar"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar
                      </button>
                    )}

                    {!hasContent && !isGenerating && (
                      <button
                        onClick={() => handleGenerateField(field.id)}
                        className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Gerar
                      </button>
                    )}

                    {isGenerating && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Gerando...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skeleton Loading (when generating) */}
                {isGenerating && (
                  <div className="px-6 pb-6">
                    <div className="ceramic-tray p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map((line) => (
                        <motion.div
                          key={line}
                          className="h-3 bg-gradient-to-r from-ceramic-text-tertiary/20 to-ceramic-text-tertiary/5 rounded"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: line * 0.1 }}
                          style={{ width: `${Math.random() * 40 + 60}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>IA está gerando conteúdo para "{field.label}"...</span>
                    </div>
                  </div>
                )}

                {/* Content Preview (when collapsed and has content) */}
                {!isExpanded && hasContent && (
                  <div className="px-6 pb-4">
                    <div className="ceramic-tray p-3 rounded-lg">
                      <p className="text-sm text-ceramic-text-secondary line-clamp-2">
                        {content}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Field Content (expanded) */}
              <AnimatePresence>
                {isExpanded && hasContent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-4">
                      {/* Content Display/Edit */}
                      <div className="ceramic-tray p-4">
                        {isEditing ? (
                          <textarea
                            value={content}
                            onChange={e =>
                              setFieldStates(prev => ({
                                ...prev,
                                [field.id]: {
                                  ...prev[field.id],
                                  editContent: e.target.value
                                } as FieldState
                              }))
                            }
                            rows={12}
                            maxLength={field.max_chars}
                            className="w-full bg-transparent text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none resize-none"
                          />
                        ) : (
                          <p className="text-ceramic-text-primary whitespace-pre-wrap">
                            {content}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        {!isEditing ? (
                          <>
                            <button
                              onClick={() => handleCopy(content)}
                              className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
                              title="Copiar"
                            >
                              <Copy className="w-4 h-4" />
                              Copiar
                            </button>
                            <button
                              onClick={() => startEditing(field.id)}
                              className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleGenerateField(field.id)}
                              className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
                              title="Regenerar"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Regenerar
                            </button>
                            {state?.status !== 'approved' && (
                              <button
                                onClick={() => approveField(field.id)}
                                className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2 bg-green-50 text-green-700"
                                title="Aprovar"
                              >
                                <Check className="w-4 h-4" />
                                Aprovar
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => saveEdit(field.id)}
                              className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2 bg-green-50 text-green-700"
                            >
                              <Check className="w-4 h-4" />
                              Salvar
                            </button>
                            <button
                              onClick={() => cancelEdit(field.id)}
                              className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Export Section */}
      {allApproved && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`sticky bottom-0 ${GRANTS_GRADIENTS.background.footer} border-t border-green-200 shadow-lg`}
        >
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {onBackToEdital && (
                  <button
                    onClick={onBackToEdital}
                    className="ceramic-concave px-4 py-2 font-medium text-sm text-ceramic-text-primary hover:scale-95 active:scale-90 transition-all flex items-center gap-2"
                    title="Voltar ao Edital"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Edital
                  </button>
                )}
                <div>
                  <h3 className="text-lg font-bold text-green-900 mb-1">
                    Proposta Completa!
                  </h3>
                  <p className="text-sm text-green-700">
                    Todos os campos foram aprovados. Pronto para exportar ou submeter.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  className="ceramic-concave px-6 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Exportar
                </button>
                <a
                  href="https://sisfaperj.faperj.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ceramic-concave px-6 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 transition-all flex items-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir Sistema Externo
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Submission Modal with Inline States */}
      <AnimatePresence>
        {showSubmitConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={submissionPhase === 'idle' ? handleCancelSubmit : undefined}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="ceramic-card max-w-md w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* IDLE STATE - Confirmation */}
              {submissionPhase === 'idle' && (
                <>
                  {/* Modal Header */}
                  <div className={`${GRANTS_GRADIENTS.background.header} p-6`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="ceramic-convex w-12 h-12 flex items-center justify-center bg-white/20">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          Proposta Completa!
                        </h2>
                        <p className="text-sm text-white/90">
                          Todos os {formFields.length} campos foram aprovados
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-4">
                    <div className="ceramic-tray p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-ceramic-text-secondary">
                          <p className="font-medium mb-2">Você está prestes a submeter a proposta:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Todos os campos serão marcados como finalizados</li>
                            <li>O status mudará para "Submetido"</li>
                            <li>Você ainda poderá exportar e acessar o sistema externo</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-xs text-blue-800">
                        <strong>Dica:</strong> Você pode clicar em "Continuar Revisando" para fazer ajustes finais antes de submeter.
                      </p>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-ceramic-text-secondary/10 bg-ceramic-base">
                    <button
                      onClick={handleCancelSubmit}
                      className="ceramic-concave px-4 py-2 font-medium text-sm text-ceramic-text-primary hover:scale-95 active:scale-90 transition-all"
                    >
                      Continuar Revisando
                    </button>
                    <button
                      onClick={handleConfirmSubmit}
                      className={`ceramic-convex px-7 py-3 rounded-xl font-bold text-sm ${GRANTS_GRADIENTS.button.primary} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2`}
                      style={{
                        boxShadow: GRANTS_SHADOWS.button
                      }}
                    >
                      <Send className="w-5 h-5" />
                      Submeter Proposta
                    </button>
                  </div>
                </>
              )}

              {/* SUBMITTING STATE - Loading with circular progress */}
              {submissionPhase === 'submitting' && (
                <div className="p-12 flex flex-col items-center justify-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
                    <svg className="absolute inset-0 w-20 h-20 -m-4" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-green-200"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="text-green-600"
                        strokeDasharray="226"
                        initial={{ strokeDashoffset: 226 }}
                        animate={{ strokeDashoffset: 0 }}
                        transition={{ duration: 2, ease: 'easeInOut' }}
                      />
                    </svg>
                  </div>
                  <motion.h3
                    className="mt-6 text-lg font-bold text-ceramic-text-primary"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Submetendo proposta...
                  </motion.h3>
                  <p className="text-sm text-ceramic-text-secondary mt-2">
                    Atualizando status e salvando dados
                  </p>
                </div>
              )}

              {/* SUCCESS STATE - Confetti and next steps */}
              {submissionPhase === 'success' && (
                <>
                  {/* Confetti Animation */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'][i % 6],
                        left: '50%',
                        top: '50%'
                      }}
                      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                      animate={{
                        opacity: [1, 1, 0],
                        x: (Math.random() - 0.5) * 400,
                        y: (Math.random() - 0.5) * 400,
                        scale: [1, 1.5, 0],
                        rotate: Math.random() * 720
                      }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                  ))}

                  <div className="p-8 flex flex-col items-center">
                    {/* Success Icon */}
                    <motion.div
                      className={`ceramic-convex w-24 h-24 rounded-full ${GRANTS_GRADIENTS.background.badge} flex items-center justify-center mb-6`}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>

                    {/* Success Message */}
                    <motion.h2
                      className="text-2xl font-bold text-ceramic-text-primary mb-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Proposta Submetida! 🎉
                    </motion.h2>
                    <motion.p
                      className="text-sm text-ceramic-text-secondary mb-6 text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      Sua proposta para <strong>{opportunityTitle}</strong> foi marcada como submetida.
                    </motion.p>

                    {/* Next Steps Cards */}
                    <div className="w-full space-y-3">
                      <motion.button
                        onClick={handleExport}
                        className="ceramic-card w-full p-4 hover:scale-[1.02] transition-transform text-left"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                              <Download className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-ceramic-text-primary text-sm">
                                Exportar Proposta
                              </p>
                              <p className="text-xs text-ceramic-text-tertiary">
                                Baixar em formato Markdown
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-ceramic-text-tertiary" />
                        </div>
                      </motion.button>

                      <motion.a
                        href="https://sisfaperj.faperj.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ceramic-card w-full p-4 hover:scale-[1.02] transition-transform text-left block"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-bold text-ceramic-text-primary text-sm">
                                Abrir Sistema Externo
                              </p>
                              <p className="text-xs text-ceramic-text-tertiary">
                                SisFAPERJ - Submeter oficialmente
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-ceramic-text-tertiary" />
                        </div>
                      </motion.a>

                      {onBackToEdital && (
                        <motion.button
                          onClick={() => {
                            onBackToEdital();
                            setShowSubmitConfirmation(false);
                          }}
                          className="ceramic-card w-full p-4 hover:scale-[1.02] transition-transform text-left"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="font-bold text-ceramic-text-primary text-sm">
                                  Ver Detalhes do Edital
                                </p>
                                <p className="text-xs text-ceramic-text-tertiary">
                                  Revisar requisitos e prazos
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-ceramic-text-tertiary" />
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ERROR STATE */}
              {submissionPhase === 'error' && (
                <div className="p-8">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className="ceramic-concave w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-red-900 mb-2">
                      Erro ao Submeter
                    </h3>
                    <p className="text-sm text-ceramic-text-secondary text-center mb-6">
                      {errorMessage || 'Ocorreu um erro ao processar sua solicitação'}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancelSubmit}
                        className="ceramic-concave px-4 py-2 font-medium text-sm text-ceramic-text-primary hover:scale-95 transition-all"
                      >
                        Fechar
                      </button>
                      <button
                        onClick={() => {
                          setSubmissionPhase('idle');
                          setErrorMessage('');
                        }}
                        className={`ceramic-convex px-6 py-2 font-bold text-sm ${GRANTS_GRADIENTS.button.primary} text-white hover:scale-95 transition-all`}
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProposalGeneratorView;
