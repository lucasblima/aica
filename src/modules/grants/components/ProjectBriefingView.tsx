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
  AlertCircle
} from 'lucide-react';
import type { BriefingData, FormField } from '../types';
import { generateAutoBriefing } from '../services/briefingAIService';
import { processSourceDocument, validateDocumentType } from '../services/documentService';
import { saveSourceDocument, removeSourceDocument } from '../services/grantService';

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
  sourceDocumentPath?: string | null;
  sourceDocumentType?: string | null;
  sourceDocumentContent?: string | null;
}

interface SourceDocumentState {
  path: string | null;
  type: string | null;
  fileName: string | null;
  content: string | null;
  isUploading: boolean;
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
    placeholder: 'Ex: Somos uma startup de biotecnologia fundada em 2020...',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'project_description',
    title: 'Descrição do Projeto',
    icon: <FileText className="w-5 h-5" />,
    help: 'Explique o projeto que você deseja submeter ao edital',
    placeholder: 'Ex: Desenvolvimento de uma plataforma de diagnóstico...',
    minChars: 150,
    maxChars: 3000
  },
  {
    id: 'technical_innovation',
    title: 'Inovação Técnica',
    icon: <Lightbulb className="w-5 h-5" />,
    help: 'Destaque os aspectos inovadores e tecnológicos do projeto',
    placeholder: 'Ex: Utilizamos machine learning para...',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'market_differential',
    title: 'Diferencial de Mercado',
    icon: <TrendingUp className="w-5 h-5" />,
    help: 'Explique como seu projeto se diferencia da concorrência',
    placeholder: 'Ex: Nossa solução é a única no mercado brasileiro que...',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'team_expertise',
    title: 'Expertise da Equipe',
    icon: <Users className="w-5 h-5" />,
    help: 'Descreva a formação e experiência da equipe envolvida',
    placeholder: 'Ex: Nossa equipe conta com PhDs em biologia molecular...',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'expected_results',
    title: 'Resultados Esperados',
    icon: <Target className="w-5 h-5" />,
    help: 'Liste os resultados e impactos esperados do projeto',
    placeholder: 'Ex: Esperamos desenvolver um protótipo funcional em 12 meses...',
    minChars: 100,
    maxChars: 2000
  },
  {
    id: 'sustainability',
    title: 'Sustentabilidade',
    icon: <Leaf className="w-5 h-5" />,
    help: 'Explique como o projeto será sustentável após o financiamento',
    placeholder: 'Ex: Planejamos gerar receita através de licenciamento...',
    minChars: 100,
    maxChars: 1500
  },
  {
    id: 'additional_notes',
    title: 'Notas Adicionais',
    icon: <MessageSquare className="w-5 h-5" />,
    help: 'Informações complementares que podem ajudar na geração da proposta',
    placeholder: 'Ex: Já possuímos parcerias com universidades...',
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
  sourceDocumentContent: initialSourceDocumentContent
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

  // Source document state
  const [sourceDocument, setSourceDocument] = useState<SourceDocumentState>({
    path: sourceDocumentPath || null,
    type: sourceDocumentType || null,
    fileName: sourceDocumentPath ? sourceDocumentPath.split('/').pop() || null : null,
    content: initialSourceDocumentContent || null,
    isUploading: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Verificar se tem documento fonte ou contexto minimo
    const hasSourceDocument = sourceDocument.content && sourceDocument.content.trim().length > 100;
    const hasMinimalContext = briefingData.company_context || briefingData.project_description;

    if (!hasSourceDocument && !hasMinimalContext) {
      alert(
        'Documento fonte necessario!\n\n' +
        'Para usar o preenchimento automatico com IA, voce precisa:\n\n' +
        '1. Fazer upload de um documento (.pdf, .md, .txt, .docx) com informacoes do seu projeto\n' +
        'OU\n' +
        '2. Preencher manualmente pelo menos o "Contexto da Empresa" ou "Descricao do Projeto"\n\n' +
        'Isso garante que a IA extraia dados REAIS em vez de inventar informacoes.'
      );
      return;
    }

    try {
      setIsGeneratingBriefing(true);

      if (hasSourceDocument) {
        setGenerationProgress('Analisando documento fonte...');
      } else {
        setGenerationProgress('Analisando contexto fornecido...');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationProgress('Extraindo informacoes relevantes...');

      // Montar contexto completo com documento fonte
      const context = {
        editalTitle: opportunityTitle,
        editalText: editalTextContent || undefined,
        // Contexto existente (se usuario ja preencheu algo)
        companyName: briefingData[formFields[0]?.id] || undefined,
        projectIdea: briefingData[formFields[1]?.id] || undefined,
        // DOCUMENTO FONTE - principal fonte de dados
        sourceDocumentContent: sourceDocument.content,
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
   * Handle source document upload
   */
  const handleSourceDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type
      const validation = validateDocumentType(file);
      if (!validation.valid) {
        alert(validation.error || 'Tipo de arquivo inválido');
        return;
      }

      setSourceDocument(prev => ({ ...prev, isUploading: true }));

      // Process document (upload + extract)
      const processedDoc = await processSourceDocument(file, projectId);

      // Save to database
      await saveSourceDocument(projectId, {
        path: processedDoc.path,
        type: processedDoc.type,
        content: processedDoc.content
      });

      // Update local state - INCLUINDO O CONTEUDO EXTRAIDO
      setSourceDocument({
        path: processedDoc.path,
        type: processedDoc.type,
        fileName: file.name,
        content: processedDoc.content, // Conteudo extraido para uso na geracao de briefing
        isUploading: false
      });

      console.log('[ProjectBriefing] Source document uploaded:', {
        path: processedDoc.path,
        type: processedDoc.type,
        contentLength: processedDoc.content?.length || 0
      });
    } catch (error) {
      console.error('[ProjectBriefing] Upload error:', error);
      alert('Erro ao fazer upload do documento. Tente novamente.');
      setSourceDocument(prev => ({ ...prev, isUploading: false }));
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Handle source document removal
   */
  const handleRemoveSourceDocument = async () => {
    if (!sourceDocument.path) return;

    const confirmed = confirm('Remover documento fonte? Isso não afetará o briefing já preenchido.');
    if (!confirmed) return;

    try {
      await removeSourceDocument(projectId);
      setSourceDocument({
        path: null,
        type: null,
        fileName: null,
        content: null,
        isUploading: false
      });
      console.log('[ProjectBriefing] Source document removed');
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
      {/* Header */}
      <div className="flex-shrink-0 z-10 bg-ceramic-base border-b border-ceramic-text-secondary/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-text-primary hover:scale-95 active:scale-90 transition-transform mb-4"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-ceramic-text-secondary mb-1">
                {opportunityTitle}
              </p>
              <h1 className="text-2xl font-bold text-ceramic-text-primary">
                {projectName}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {/* AI Generation Progress Indicator */}
              {isGeneratingBriefing && (
                <div className="ceramic-card px-4 py-2 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-ceramic-accent" />
                  <span className="text-sm text-ceramic-text-secondary">
                    {generationProgress}
                  </span>
                </div>
              )}

              <button
                onClick={handleGenerateBriefing}
                disabled={isGeneratingBriefing}
                className="ceramic-concave px-4 py-2 font-bold text-ceramic-accent hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
              >
                {isGeneratingBriefing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Preencher com IA
                  </>
                )}
              </button>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  {isSaving ? (
                    <span className="text-sm text-orange-600">Salvando...</span>
                  ) : lastSaved ? (
                    <span className="text-sm text-ceramic-text-tertiary">
                      Salvo {lastSaved.toLocaleTimeString('pt-BR')}
                    </span>
                  ) : null}
                  <Save className="w-4 h-4 text-ceramic-text-tertiary" />
                </div>
              </div>
            </div>
          </div>

          {/* Source Document Upload */}
          <div className="mb-4">
            {sourceDocument.path ? (
              <div className="ceramic-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-green-600">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ceramic-text-primary">
                      Documento Fonte Carregado
                    </p>
                    <p className="text-xs text-ceramic-text-secondary">
                      {sourceDocument.fileName} ({sourceDocument.type?.toUpperCase()})
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveSourceDocument}
                  className="ceramic-concave w-8 h-8 flex items-center justify-center text-red-600 hover:scale-95 transition-transform"
                  title="Remover documento"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="ceramic-card p-4">
                <div className="flex items-start gap-3">
                  <div className="ceramic-concave w-10 h-10 flex-shrink-0 flex items-center justify-center text-ceramic-accent">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-bold text-ceramic-text-primary">
                        Documento Fonte (Opcional)
                      </p>
                      <AlertCircle className="w-4 h-4 text-ceramic-text-tertiary" title="Forneça um documento com informações do projeto para respostas mais precisas" />
                    </div>
                    <p className="text-xs text-ceramic-text-secondary mb-3">
                      Upload de .md, .pdf, .docx ou .txt com informações do projeto para gerar respostas mais precisas
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md,.pdf,.docx,.doc,.txt"
                        onChange={handleSourceDocumentUpload}
                        disabled={sourceDocument.isUploading}
                        className="hidden"
                        id="source-document-upload"
                      />
                      <label htmlFor="source-document-upload">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sourceDocument.isUploading}
                          className="ceramic-concave px-4 py-2 text-sm font-bold text-ceramic-text-primary hover:scale-95 active:scale-90 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
                        >
                          {sourceDocument.isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Escolher Arquivo
                            </>
                          )}
                        </button>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ceramic-text-secondary">Progresso</span>
              <span className="font-bold text-ceramic-text-primary">{completion}%</span>
            </div>
            <div className="ceramic-trough p-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 pb-32 space-y-4">
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
                  <div className={`ceramic-concave w-12 h-12 flex items-center justify-center ${
                    meetsRequirement && !exceedsMax ? 'text-green-600' : 'text-ceramic-text-secondary'
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
                      className={`text-sm font-medium ${
                        exceedsMax ? 'text-red-600' : 'text-ceramic-text-secondary'
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
                  ? 'Contexto completo! Pronto para gerar a proposta.'
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
    </div>
  );
};

export default ProjectBriefingView;
