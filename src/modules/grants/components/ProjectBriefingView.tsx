import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Building2,
  FileText,
  Lightbulb,
  TrendingUp,
  Users,
  Target,
  Leaf,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Save,
  Sparkles,
  Loader2,
  Upload,
  X,
  FileCheck,
  AlertCircle,
  FolderOpen,
  Clock
} from 'lucide-react';
import type { BriefingData, FormField, ProjectDocument } from '../types';
import { generateAutoBriefing } from '../services/briefingAIService';
import { validateDocumentType } from '../services/documentService';
import {
  listProjectDocuments,
  uploadProjectDocument,
  deleteProjectDocument,
  getCombinedDocumentsContent
} from '../services/projectDocumentService';
import { ContextChip } from './ContextChip';

/**
 * ProjectBriefingView Component
 * Full-screen view for collecting project context with collapsible sections
 * Features auto-save, character count, and progress tracking
 */

interface ProjectBriefingViewProps {
  projectId: string;
  projectName: string;
  opportunityTitle: string;
  formFields: FormField[]; // Campos dinâmicos do edital
  editalTextContent?: string | null;
  initialBriefing?: Record<string, string>; // Agora é dinâmico
  onSave: (briefing: Record<string, string>) => Promise<void>;
  onContinue: () => void;
  onBack: () => void;
  // Deprecated - mantidos para compatibilidade
  sourceDocumentPath?: string | null;
  sourceDocumentType?: string | null;
  sourceDocumentContent?: string | null;
  // Loading overlay props
  isTransferring?: boolean;
  transferProgress?: {
    current: number;
    total: number;
    currentField: string;
  };
}

interface BriefingSection {
  id: keyof BriefingData;
  title: string;
  icon: React.ReactNode;
  help: string;
  placeholder: string;
  minChars?: number;
  maxChars?: number;
}

const BRIEFING_SECTIONS: BriefingSection[] = [
  {
    id: 'company_context',
    title: 'Contexto da Empresa',
    icon: <Building2 className="w-5 h-5" />,
    help: 'Descreva sua empresa, área de atuação, histórico e principais conquistas',
    placeholder: 'Descreva a empresa',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'project_description',
    title: 'Descrição do Projeto',
    icon: <FileText className="w-5 h-5" />,
    help: 'Explique o projeto que você deseja submeter ao edital',
    placeholder: 'Descreva o projeto',
    minChars: 150,
    maxChars: 3000
  },
  {
    id: 'technical_innovation',
    title: 'Inovação Técnica',
    icon: <Lightbulb className="w-5 h-5" />,
    help: 'Destaque os aspectos inovadores e tecnológicos do projeto',
    placeholder: 'Descreva a inovação técnica',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'market_differential',
    title: 'Diferencial de Mercado',
    icon: <TrendingUp className="w-5 h-5" />,
    help: 'Explique como seu projeto se diferencia da concorrência',
    placeholder: 'Descreva o diferencial de mercado',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'team_expertise',
    title: 'Expertise da Equipe',
    icon: <Users className="w-5 h-5" />,
    help: 'Descreva a formação e experiência da equipe envolvida',
    placeholder: 'Descreva a expertise da equipe',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'expected_results',
    title: 'Resultados Esperados',
    icon: <Target className="w-5 h-5" />,
    help: 'Liste os resultados e impactos esperados do projeto',
    placeholder: 'Descreva os resultados esperados',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'sustainability',
    title: 'Sustentabilidade',
    icon: <Leaf className="w-5 h-5" />,
    help: 'Explique como o projeto será sustentável após o financiamento',
    placeholder: 'Descreva a sustentabilidade do projeto',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'additional_notes',
    title: 'Notas Adicionais',
    icon: <MessageSquare className="w-5 h-5" />,
    help: 'Informações complementares que podem ajudar na geração da proposta',
    placeholder: 'Adicione informações extras relevantes',
    maxChars: 2000
  }
];

export const ProjectBriefingView: React.FC<ProjectBriefingViewProps> = ({
  projectId,
  projectName,
  opportunityTitle,
  formFields,
  editalTextContent,
  initialBriefing,
  onSave,
  onContinue,
  onBack,
  sourceDocumentPath,
  sourceDocumentType,
  sourceDocumentContent: initialSourceDocumentContent,
  isTransferring,
  transferProgress
}) => {
  // Inicializar briefing data com campos dinâmicos do edital
  const [briefingData, setBriefingData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    formFields.forEach(field => {
      initial[field.id] = initialBriefing?.[field.id] || '';
    });
    return initial;
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(formFields.length > 0 ? [formFields[0].id] : [])
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [showEditalModal, setShowEditalModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false); // Modal for managing documents

  // Documents state - múltiplos documentos de contexto
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Load project documents on mount
   */
  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const docs = await listProjectDocuments(projectId);
      setDocuments(docs);
      console.log('[ProjectBriefing] Loaded documents:', docs.length);
    } catch (error) {
      console.error('[ProjectBriefing] Error loading documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  /**
   * Auto-save with debouncing
   */
  useEffect(() => {
    if (!savePending) return;

    const timeoutId = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave(briefingData);
        setLastSaved(new Date());
        setSavePending(false);
      } catch (error) {
        console.error('Error auto-saving briefing:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [briefingData, savePending, onSave]);

  /**
   * Update briefing field
   */
  const updateField = useCallback((fieldId: string, value: string) => {
    setBriefingData(prev => ({ ...prev, [fieldId]: value }));
    setSavePending(true);
  }, []);

  /**
   * Handle auto-generation of briefing with AI
   *
   * IMPORTANTE: Esta funcao agora usa o documento fonte para EXTRAIR informacoes,
   * em vez de gerar dados ficticios.
   */
  const handleGenerateBriefing = async () => {
    // Verificar se tem documentos ou contexto mínimo
    const hasDocuments = documents.length > 0;
    const hasMinimalContext = Object.values(briefingData).some(value => value && value.trim().length > 50);

    if (!hasDocuments && !hasMinimalContext) {
      alert(
        'Documento fonte necessário!\n\n' +
        'Para usar o preenchimento automático com IA, você precisa:\n\n' +
        '1. Fazer upload de documentos (.pdf, .md, .txt, .docx) com informações do seu projeto\n' +
        'OU\n' +
        '2. Preencher manualmente pelo menos um campo com informações básicas do projeto\n\n' +
        'Isso garante que a IA extraia dados REAIS em vez de inventar informações.'
      );
      return;
    }

    try {
      setIsGeneratingBriefing(true);

      if (hasDocuments) {
        setGenerationProgress(`Analisando ${documents.length} documento(s)...`);
      } else {
        setGenerationProgress('Analisando contexto fornecido...');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationProgress('Extraindo informações relevantes...');

      // Obter conteúdo combinado de todos os documentos
      const combinedContent = hasDocuments
        ? await getCombinedDocumentsContent(projectId)
        : null;

      // Montar contexto completo com documentos
      const context = {
        editalTitle: opportunityTitle,
        editalText: editalTextContent || undefined,
        // Contexto existente (se usuário já preencheu algo)
        companyName: briefingData[formFields[0]?.id] || undefined,
        projectIdea: briefingData[formFields[1]?.id] || undefined,
        // DOCUMENTOS FONTE - principal fonte de dados
        sourceDocumentContent: combinedContent,
        // CAMPOS DINÂMICOS do edital
        formFields: formFields
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationProgress('Gerando briefing com IA...');

      // Generate briefing with AI - agora extrai do documento
      const generatedBriefing = await generateAutoBriefing(context);

      setGenerationProgress('Preenchendo campos...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update briefing data
      setBriefingData(generatedBriefing);
      setSavePending(true);

      // Expand all sections to show generated content
      setExpandedSections(new Set(formFields.map(f => f.id)));

      setGenerationProgress('Briefing extraido com sucesso!');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error generating briefing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setGenerationProgress(`Erro: ${errorMessage}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Erro ao gerar briefing: ${errorMessage}`);
    } finally {
      setIsGeneratingBriefing(false);
      setGenerationProgress('');
    }
  };

  /**
   * Handle document upload
   */
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      const validation = validateDocumentType(file);
      if (!validation.valid) {
        alert(validation.error || 'Tipo de arquivo inválido');
        return;
      }

      setIsUploadingDocument(true);

      // Upload document (process + save to DB)
      const newDoc = await uploadProjectDocument(projectId, file);

      // Add to local state
      setDocuments(prev => [...prev, newDoc]);

      console.log('[ProjectBriefing] Document uploaded:', {
        id: newDoc.id,
        file_name: newDoc.file_name,
        type: newDoc.document_type,
        contentLength: newDoc.document_content?.length || 0
      });
    } catch (error) {
      console.error('[ProjectBriefing] Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao fazer upload do documento: ${errorMessage}`);
    } finally {
      setIsUploadingDocument(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle document removal
   */
  const handleRemoveDocument = async (documentId: string, fileName: string) => {
    const confirmed = confirm(`Remover "${fileName}"? Isso não afetará o briefing já preenchido.`);
    if (!confirmed) return;

    try {
      await deleteProjectDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      console.log('[ProjectBriefing] Document removed:', documentId);
    } catch (error) {
      console.error('[ProjectBriefing] Remove error:', error);
      alert('Erro ao remover documento. Tente novamente.');
    }
  };

  /**
   * Toggle section expansion
   */
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  /**
   * Calculate completion percentage
   */
  const calculateCompletion = (): number => {
    const requiredFields = formFields.filter(f => f.required);
    if (requiredFields.length === 0) return 100;

    const completedFields = requiredFields.filter(field => {
      const content = briefingData[field.id];
      if (typeof content !== 'string') return false;
      return content.trim().length > 0;
    });
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  /**
   * Check if can continue (sempre permitido agora)
   */
  const canContinue = (): boolean => {
    return true; // Sempre pode avançar, briefing é opcional
  };

  /**
   * Get character count color
   */
  const getCharCountColor = (
    length: number,
    minChars?: number,
    maxChars?: number
  ): string => {
    if (minChars && length < minChars) return 'text-orange-600';
    if (maxChars && length > maxChars) return 'text-red-600';
    return 'text-green-600';
  };

  const completion = calculateCompletion();

  return (
    <div className="h-screen bg-ceramic-base flex flex-col overflow-hidden">
      {/* Loading Overlay for Field Transfer */}
      <AnimatePresence>
        {isTransferring && transferProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="ceramic-card p-8 max-w-md w-full mx-4"
            >
              <div className="flex items-center gap-4 mb-6">
                <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-ceramic-text-primary">Preparando Geração</h3>
                  <p className="text-sm text-ceramic-text-secondary">Transferindo campos preenchidos...</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ceramic-text-secondary truncate max-w-[60%]">
                    {transferProgress.currentField}
                  </span>
                  <span className="font-bold text-ceramic-text-primary">
                    {transferProgress.current} / {transferProgress.total}
                  </span>
                </div>
                <div className="ceramic-trough p-2">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(transferProgress.current / transferProgress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ceramic-text-tertiary">
                <Clock className="w-3 h-3" />
                <span>
                  Tempo estimado: {Math.ceil((transferProgress.total - transferProgress.current) * 0.2)}s
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Compressed with Context Ribbon */}
      <div className="flex-shrink-0 sticky top-0 z-20 bg-ceramic-base border-b border-ceramic-text-secondary/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Row 1: Navigation & Breadcrumb + Actions */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
            {/* Left: Back + Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="ceramic-concave w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-ceramic-text-primary hover:scale-95 active:scale-90 transition-transform flex-shrink-0"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#948D82] uppercase tracking-widest truncate">
                {opportunityTitle}
              </span>
            </div>

            {/* Right: AI Generation + Save Status */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* AI Progress (when generating) */}
              {isGeneratingBriefing && (
                <div className="hidden sm:flex items-center gap-2 ceramic-card px-3 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-ceramic-accent" />
                  <span className="text-[10px] text-ceramic-text-secondary truncate max-w-[120px]">
                    {generationProgress}
                  </span>
                </div>
              )}

              {/* Primary Action - Compact */}
              <button
                onClick={handleGenerateBriefing}
                disabled={isGeneratingBriefing}
                className="ceramic-concave px-4 py-2 font-bold text-sm text-ceramic-text-primary hover:scale-[0.98] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isGeneratingBriefing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D97706]" />
                    <span className="hidden sm:inline">Preencher com IA</span>
                  </>
                )}
              </button>

              {/* Save Status - Minimal */}
              {(isSaving || lastSaved) && (
                <div className="hidden md:flex items-center gap-1 text-[10px] text-ceramic-text-tertiary">
                  <Save className="w-3 h-3" />
                  {isSaving ? 'Salvando...' : lastSaved?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Title & Context Ribbon */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            {/* Left: Project Title */}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-[#5C554B] leading-tight truncate flex-1 min-w-0">
              {projectName}
            </h1>

            {/* Right: THE CONTEXT RIBBON - Always horizontal, compact on mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {editalTextContent && editalTextContent.length > 0 && (
                <ContextChip
                  type="edital"
                  label="Edital"
                  status="Fonte de Verdade"
                  charCount={editalTextContent.length}
                  onClick={() => setShowEditalModal(true)}
                />
              )}
              <ContextChip
                type="docs"
                label="Docs"
                count={documents.length}
                isLoading={isLoadingDocuments}
                onClick={() => setShowDocumentsModal(true)}
              />
            </div>
          </div>

          {/* Row 3: Progress Bar - Thin */}
          <div className="ceramic-trough p-1.5">
            <motion.div
              className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 pb-32 space-y-4 min-h-[75vh]">
          {formFields.map((field, index) => {
            const isExpanded = expandedSections.has(field.id);
            const content = briefingData[field.id] || '';
            const charCount = content.length;
            const meetsRequirement = !field.required || content.trim().length > 0;
            const exceedsMax = field.max_chars && charCount > field.max_chars;

            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="ceramic-card overflow-hidden"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(field.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-black/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`ceramic-concave w-12 h-12 flex items-center justify-center ${meetsRequirement && !exceedsMax ? 'text-green-600' : 'text-ceramic-text-secondary'
                      }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-ceramic-text-primary">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <p className="text-sm text-ceramic-text-secondary">
                        {field.ai_prompt_hint || 'Preencha este campo com as informações solicitadas'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {charCount > 0 && (
                      <span
                        className={`text-sm font-medium ${exceedsMax ? 'text-red-600' : 'text-ceramic-text-secondary'
                          }`}
                      >
                        {charCount}
                        {field.max_chars && ` / ${field.max_chars}`}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary" />
                    )}
                  </div>
                </button>

                {/* Section Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        <div className="ceramic-tray p-4">
                          <textarea
                            value={content}
                            onChange={e => updateField(field.id, e.target.value)}
                            placeholder={field.placeholder || `Digite aqui o conteúdo para ${field.label}`}
                            rows={8}
                            className="w-full bg-transparent text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none resize-none"
                            maxLength={field.max_chars}
                          />
                        </div>

                        {/* Character Count Info */}
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <span
                            className={
                              meetsRequirement
                                ? 'text-green-600'
                                : 'text-ceramic-text-tertiary'
                            }
                          >
                            {meetsRequirement
                              ? 'Campo preenchido ✓'
                              : field.required ? 'Campo obrigatório' : 'Campo opcional'}
                          </span>
                          {field.max_chars && charCount > field.max_chars * 0.9 && (
                            <span className={exceedsMax ? 'text-red-600' : 'text-orange-600'}>
                              {exceedsMax
                                ? `Excedeu em ${charCount - field.max_chars} caracteres!`
                                : `${field.max_chars - charCount} caracteres restantes`
                              }
                            </span>
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
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-ceramic-base border-t border-ceramic-text-secondary/10 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ceramic-text-secondary">
                {canContinue()
                  ? 'Campos preenchidos serão automaticamente transferidos para geração.'
                  : `Complete pelo menos 80% para continuar (${completion}% completo)`}
              </p>
            </div>
            <button
              onClick={onContinue}
              disabled={!canContinue()}
              className="ceramic-concave px-8 py-3 font-bold text-ceramic-text-primary hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
            >
              Continuar para Geração
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edital Content Modal */}
      <AnimatePresence>
        {showEditalModal && editalTextContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditalModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="ceramic-card max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
                <div className="flex items-center gap-3">
                  <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ceramic-text-primary">
                      Conteúdo Completo do Edital
                    </h2>
                    <p className="text-xs text-ceramic-text-tertiary">
                      {Math.round(editalTextContent.length / 1000)}k caracteres extraídos do PDF
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditalModal(false)}
                  className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-text-primary hover:scale-95 active:scale-90 transition-transform"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="ceramic-tray p-6 rounded-lg">
                  <pre className="text-xs text-ceramic-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                    {editalTextContent}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-ceramic-text-secondary/10">
                <button
                  onClick={() => setShowEditalModal(false)}
                  className="ceramic-concave px-6 py-2 font-bold text-ceramic-text-primary hover:scale-95 active:scale-90 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Documents Management Modal */}
      <AnimatePresence>
        {showDocumentsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDocumentsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="ceramic-card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
                <div className="flex items-center gap-3">
                  <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ceramic-text-primary">
                      Gerenciar Documentos
                    </h2>
                    <p className="text-xs text-ceramic-text-tertiary">
                      {documents.length} {documents.length === 1 ? 'documento' : 'documentos'} no projeto
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.pdf,.docx,.doc,.txt"
                    onChange={handleDocumentUpload}
                    disabled={isUploadingDocument}
                    className="hidden"
                    id="document-upload-modal"
                  />
                  <label htmlFor="document-upload-modal">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingDocument}
                      className="ceramic-convex px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isUploadingDocument ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Adicionar
                        </>
                      )}
                    </button>
                  </label>
                  <button
                    onClick={() => setShowDocumentsModal(false)}
                    className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-text-primary hover:scale-95 transition-transform"
                    title="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="ceramic-concave w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-8 h-8 text-ceramic-text-tertiary" />
                    </div>
                    <p className="text-sm text-ceramic-text-secondary mb-2">
                      Nenhum documento adicionado
                    </p>
                    <p className="text-xs text-ceramic-text-tertiary">
                      Adicione arquivos .md, .pdf, .txt ou .docx com informações do projeto
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="ceramic-tray p-4 flex items-center justify-between hover:scale-[1.01] transition-transform"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="ceramic-concave w-10 h-10 flex-shrink-0 flex items-center justify-center text-green-600">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-ceramic-text-primary truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-ceramic-text-tertiary">
                              {doc.document_type.toUpperCase()} • {doc.document_content ? `${(doc.document_content.length / 1000).toFixed(1)}k chars` : 'Sem conteúdo'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDocument(doc.id, doc.file_name)}
                          className="ceramic-concave w-9 h-9 flex-shrink-0 flex items-center justify-center text-red-600 hover:scale-95 transition-transform ml-3"
                          title="Remover documento"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-ceramic-text-secondary/10">
                <p className="text-xs text-ceramic-text-tertiary">
                  Formatos aceitos: .md, .pdf, .docx, .doc, .txt
                </p>
                <button
                  onClick={() => setShowDocumentsModal(false)}
                  className="ceramic-concave px-6 py-2 font-bold text-ceramic-text-primary hover:scale-95 transition-all"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectBriefingView;
