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
  FileText
} from 'lucide-react';
import type { FormField, BriefingData, GrantResponse } from '../types';
import { RESPONSE_STATUS_LABELS } from '../types';

/**
 * ProposalGeneratorView Component
 * Full-screen view for generating and reviewing proposal fields
 * Features AI-powered generation, editing, versioning, and export
 */

interface ProposalGeneratorViewProps {
  projectId: string;
  opportunityTitle: string;
  formFields: FormField[];
  briefing: BriefingData;
  initialResponses?: Record<string, GrantResponse>;
  onGenerateField: (fieldId: string) => Promise<string>;
  onSaveResponse: (fieldId: string, content: string, status?: string) => Promise<void>;
  externalSystemUrl?: string;
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
  externalSystemUrl
}) => {
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

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
      console.error('Error generating field:', error);
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
      console.error('Failed to copy:', error);
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
      console.error('Error saving edit:', error);
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
      console.error('Error approving field:', error);
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

  const progress = calculateProgress();
  const allApproved = progress.approved === progress.total;

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ceramic-base border-b border-ceramic-text-secondary/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-ceramic-text-secondary mb-1">
                Gerando Proposta para
              </p>
              <h1 className="text-2xl font-bold text-ceramic-text-primary">
                {opportunityTitle}
              </h1>
            </div>
            <button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll || allApproved}
              className="ceramic-concave px-6 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              {isGeneratingAll ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Gerar Todos os Campos
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ceramic-text-secondary">
                Campos Aprovados
              </span>
              <span className="font-bold text-ceramic-text-primary">
                {progress.approved} / {progress.total}
              </span>
            </div>
            <div className="ceramic-trough p-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
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
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary flex-shrink-0" />
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

              {/* Field Content */}
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
          className="sticky bottom-0 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200 shadow-lg"
        >
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-green-900 mb-1">
                  Proposta Completa!
                </h3>
                <p className="text-sm text-green-700">
                  Todos os campos foram aprovados. Pronto para exportar ou submeter.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    // Export functionality would go here
                    console.log('Exporting proposal...');
                  }}
                  className="ceramic-concave px-6 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Exportar
                </button>
                {externalSystemUrl && (
                  <a
                    href={externalSystemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ceramic-concave px-6 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Abrir Sistema Externo
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProposalGeneratorView;
