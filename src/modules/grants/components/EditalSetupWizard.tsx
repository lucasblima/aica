/**
 * EditalSetupWizard - Wizard PDF-first para criar editais
 *
 * Fluxo:
 * 1. Upload PDF → Análise automática
 * 2. Revisão/Ajustes → Usuário confirma dados extraídos
 * 3. Campos do Formulário → Colar texto e IA extrai campos
 * 4. Salvar → Edital criado
 */

import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Sparkles, Loader2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFUploadZone } from './PDFUploadZone';
import { processEdital, reprocessEdital, type ProcessEditalResponse, type AnalyzedEditalData } from '@/services/edgeFunctionService';
import { parseFormFieldsFromText } from '../services/grantAIService';
import type { CreateOpportunityPayload } from '../types';
import type { FileSearchDocument } from '../services/fileSearchDocumentService';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Editalsetupwizard');

interface EditalSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateOpportunityPayload) => Promise<void>;
  /** When provided, wizard skips upload and re-processes this existing document */
  existingDocument?: FileSearchDocument | null;
}

type WizardStep = 'upload' | 'review' | 'form_fields';

export const EditalSetupWizard: React.FC<EditalSetupWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDocument
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedEdital, setProcessedEdital] = useState<ProcessEditalResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields state
  const [formFieldsText, setFormFieldsText] = useState('');
  const [parsedFields, setParsedFields] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  /**
   * Auto-process existing document when wizard opens with existingDocument
   */
  React.useEffect(() => {
    if (isOpen && existingDocument && !processedEdital && !isProcessing) {
      handleReprocessExisting(existingDocument);
    }
  }, [isOpen, existingDocument]);

  /**
   * Re-process an existing document from Google Files (skip upload)
   */
  const handleReprocessExisting = async (doc: FileSearchDocument) => {
    try {
      setIsProcessing(true);
      setError(null);
      setCurrentStep('upload'); // Show processing state on upload step

      log.info('Re-processing existing document', {
        documentId: doc.id,
        geminiFileName: doc.gemini_file_name,
        originalFilename: doc.original_filename,
      });

      const result = await reprocessEdital(
        doc.gemini_file_name,
        doc.id,
        doc.original_filename
      );

      log.info('Existing document re-processed', {
        title: result.analyzed_data.title,
        processingTimeMs: result.processing_time_ms,
      });

      setProcessedEdital(result);
      setCurrentStep('review');
      setIsProcessing(false);
    } catch (err) {
      log.error('Error re-processing existing document:', err);
      setError(err instanceof Error ? err.message : 'Erro ao reprocessar documento');
      setIsProcessing(false);
    }
  };

  /**
   * Handle PDF upload and analysis
   * Uses Google File Search as single source - all processing happens server-side
   */
  const handleFileSelected = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Process PDF server-side via Edge Function
      // This uploads to Google Files API, waits for indexing, and extracts structured data
      log.debug('Processing PDF via Edge Function (Google File Search)...');
      const result = await processEdital(file);

      log.info('Edital processed successfully', {
        documentId: result.file_search_document_id,
        geminiFileName: result.gemini_file_name,
        title: result.analyzed_data.title,
        processingTimeMs: result.processing_time_ms,
      });

      setProcessedEdital(result);

      // Advance to review step
      setCurrentStep('review');
      setIsProcessing(false);
    } catch (err) {
      log.error('Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar PDF');
      setIsProcessing(false);
    }
  };

  /**
   * Handle form fields parsing
   */
  const handleParseFields = async () => {
    if (!formFieldsText.trim()) {
      setError('Por favor, cole o texto com os campos do formulário');
      return;
    }

    try {
      setIsParsing(true);
      setError(null);

      const fields = await parseFormFieldsFromText(formFieldsText);
      setParsedFields(fields);
      setIsParsing(false);
    } catch (err) {
      log.error('Erro ao parsear campos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao parsear campos');
      setIsParsing(false);
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!processedEdital) return;

    try {
      setIsSaving(true);

      const { analyzed_data, gemini_file_name, file_search_document_id } = processedEdital;

      // Use parsed fields if available, otherwise use extracted fields
      const formFields = parsedFields.length > 0 ? parsedFields : analyzed_data.form_fields;

      const payload: CreateOpportunityPayload = {
        title: analyzed_data.title,
        funding_agency: analyzed_data.funding_agency,
        program_name: analyzed_data.program_name,
        edital_number: analyzed_data.edital_number,
        min_funding: analyzed_data.min_funding,
        max_funding: analyzed_data.max_funding,
        counterpart_percentage: analyzed_data.counterpart_percentage,
        submission_start: analyzed_data.submission_start,
        submission_deadline: analyzed_data.submission_deadline,
        result_date: analyzed_data.result_date,
        eligible_themes: analyzed_data.eligible_themes,
        eligibility_requirements: analyzed_data.eligibility_requirements as any,
        evaluation_criteria: analyzed_data.evaluation_criteria as any,
        external_system_url: analyzed_data.external_system_url,
        form_fields: formFields,
        edital_pdf_path: gemini_file_name,
        edital_text_content: analyzed_data.raw_text_preview || '',
        file_search_document_id: file_search_document_id,
        status: 'open',
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      log.error('Error saving edital:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      setIsSaving(false);
    }
  };

  /**
   * Handle navigation
   */
  const handleBack = () => {
    if (currentStep === 'form_fields') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      handleReset();
    }
  };

  const handleContinue = () => {
    if (currentStep === 'review') {
      setCurrentStep('form_fields');
    }
  };

  /**
   * Reset wizard
   */
  const handleReset = () => {
    setCurrentStep('upload');
    setProcessedEdital(null);
    setFormFieldsText('');
    setParsedFields([]);
    setError(null);
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl my-6 bg-ceramic-base rounded-3xl shadow-2xl flex flex-col max-h-[calc(100vh-3rem)]"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ceramic-base border-b border-ceramic-text-secondary/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ceramic-text-primary">
                Novo Edital
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                {currentStep === 'upload' && 'Faça upload do PDF para análise automática'}
                {currentStep === 'review' && 'Revise e ajuste as informações extraídas'}
                {currentStep === 'form_fields' && 'Cole as perguntas do formulário para extração automática'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ceramic-concave w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform"
              data-testid="close-wizard-btn"
              aria-label="Fechar wizard"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-6">
            {/* Step 1: Upload */}
            <div className={`flex items-center gap-2 ${
              currentStep === 'upload' ? 'text-ceramic-accent' : 'text-ceramic-success'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'upload' ? 'bg-ceramic-accent-dark text-white' : 'bg-ceramic-success text-white'
              }`}>
                {currentStep !== 'upload' ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-bold">Upload</span>
            </div>

            {/* Connector 1 */}
            <div className={`flex-1 h-0.5 ${
              currentStep === 'review' || currentStep === 'form_fields' ? 'bg-ceramic-success' : 'bg-ceramic-border'
            }`} />

            {/* Step 2: Review */}
            <div className={`flex items-center gap-2 ${
              currentStep === 'review' ? 'text-ceramic-accent' :
              currentStep === 'form_fields' ? 'text-ceramic-success' : 'text-ceramic-text-secondary'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-ceramic-accent-dark text-white' :
                currentStep === 'form_fields' ? 'bg-ceramic-success text-white' : 'bg-ceramic-border'
              }`}>
                {currentStep === 'form_fields' ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-bold">Revisar</span>
            </div>

            {/* Connector 2 */}
            <div className={`flex-1 h-0.5 ${
              currentStep === 'form_fields' ? 'bg-ceramic-success' : 'bg-ceramic-border'
            }`} />

            {/* Step 3: Form Fields */}
            <div className={`flex items-center gap-2 ${
              currentStep === 'form_fields' ? 'text-ceramic-accent' : 'text-ceramic-text-secondary'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'form_fields' ? 'bg-ceramic-accent-dark text-white' : 'bg-ceramic-border'
              }`}>
                3
              </div>
              <span className="text-sm font-bold">Campos <span className="text-ceramic-text-tertiary font-normal">(opcional)</span></span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {existingDocument && isProcessing ? (
                  /* Re-processing existing document */
                  <div className="ceramic-card p-8 rounded-xl text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-ceramic-accent mb-4" />
                    <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                      Analisando documento existente...
                    </h3>
                    <p className="text-sm text-ceramic-text-secondary">
                      {existingDocument.original_filename}
                    </p>
                    <p className="text-xs text-ceramic-text-tertiary mt-2">
                      Extraindo informações estruturadas com IA
                    </p>
                  </div>
                ) : (
                  <PDFUploadZone
                    onFileSelected={handleFileSelected}
                    isProcessing={isProcessing}
                    error={error}
                    success={false}
                  />
                )}

                {error && (
                  <div className="mt-4 ceramic-card p-4 rounded-xl bg-ceramic-error-bg border border-ceramic-border">
                    <p className="text-sm text-ceramic-error">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="text-xs text-ceramic-error hover:text-ceramic-error/80 mt-2"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 'review' && processedEdital && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Success message */}
                <div className="ceramic-card p-4 rounded-xl bg-ceramic-success-bg border border-ceramic-border">
                  <p className="text-sm text-ceramic-success font-bold">
                    ✓ Edital analisado com sucesso!
                  </p>
                  <p className="text-xs text-ceramic-success mt-1">
                    {processedEdital.analyzed_data.form_fields?.length || 0} campos identificados,
                    {' '}{processedEdital.analyzed_data.evaluation_criteria?.length || 0} critérios de avaliação extraídos.
                    {' '}Processado em {(processedEdital.processing_time_ms / 1000).toFixed(1)}s
                  </p>
                </div>

                {/* Extracted data preview */}
                <div className="ceramic-card p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-ceramic-text-primary mb-4">
                    Informações Extraídas
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary">TÍTULO</label>
                      <p className="text-sm text-ceramic-text-primary mt-1">{processedEdital.analyzed_data.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">AGÊNCIA</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">{processedEdital.analyzed_data.funding_agency}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">NÚMERO</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">{processedEdital.analyzed_data.edital_number}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">FINANCIAMENTO</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">
                          R$ {processedEdital.analyzed_data.min_funding?.toLocaleString('pt-BR')} - R$ {processedEdital.analyzed_data.max_funding?.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">DEADLINE</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">
                          {new Date(processedEdital.analyzed_data.submission_deadline).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary">TEMAS</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {processedEdital.analyzed_data.eligible_themes?.map((theme: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-ceramic-accent/10 text-ceramic-accent rounded-full text-xs font-bold">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary">
                        CRITÉRIOS DE AVALIAÇÃO ({processedEdital.analyzed_data.evaluation_criteria?.length || 0})
                      </label>
                      <div className="space-y-2 mt-2">
                        {processedEdital.analyzed_data.evaluation_criteria?.slice(0, 3).map((criterion, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-ceramic-text-primary">{criterion.name}</span>
                            <span className="text-ceramic-text-secondary">Peso: {criterion.weight}%</span>
                          </div>
                        ))}
                        {(processedEdital.analyzed_data.evaluation_criteria?.length || 0) > 3 && (
                          <p className="text-xs text-ceramic-text-secondary italic">
                            + {processedEdital.analyzed_data.evaluation_criteria.length - 3} critérios adicionais
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-ceramic-text-secondary text-center">
                  Salve agora com os {processedEdital.analyzed_data.form_fields?.length || 0} campos extraídos pela IA, ou personalize os campos antes de salvar.
                </p>
              </motion.div>
            )}

            {currentStep === 'form_fields' && (
              <motion.div
                key="form_fields"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Instruction card */}
                <div className="ceramic-card p-6 rounded-xl bg-ceramic-info-bg border border-ceramic-border">
                  <div className="flex items-start gap-3">
                    <Edit3 className="w-5 h-5 text-ceramic-info mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-ceramic-info mb-2">
                        Como funciona?
                      </h3>
                      <p className="text-xs text-ceramic-info mb-2">
                        Cole abaixo o texto com as perguntas do formulário do edital. A IA identificará automaticamente:
                      </p>
                      <ul className="text-xs text-ceramic-info space-y-1 list-disc list-inside">
                        <li>Quantas perguntas existem</li>
                        <li>O nome/label de cada pergunta</li>
                        <li>O limite de caracteres de cada resposta</li>
                      </ul>
                      <p className="text-xs text-ceramic-info mt-3 font-medium">
                        Exemplo: "1. Apresentação da Empresa (máx 3000 caracteres)"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Textarea for pasting */}
                <div className="ceramic-card p-6 rounded-xl">
                  <label className="text-xs font-bold text-ceramic-text-secondary mb-2 block">
                    COLE AS PERGUNTAS DO FORMULÁRIO
                  </label>
                  <div className="ceramic-tray p-4">
                    <textarea
                      value={formFieldsText}
                      onChange={(e) => setFormFieldsText(e.target.value)}
                      placeholder="Cole aqui o texto com as perguntas do formulário...&#10;&#10;Exemplo:&#10;1. Apresentação da Empresa (máx 3000 caracteres)&#10;2. Descrição do Projeto (máx 5000 caracteres)&#10;3. Equipe Técnica (máx 2000 caracteres)"
                      rows={10}
                      className="w-full bg-transparent text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none resize-none"
                    />
                  </div>

                  {/* Parse button */}
                  <button
                    onClick={handleParseFields}
                    disabled={isParsing || !formFieldsText.trim()}
                    className="mt-4 ceramic-concave px-6 py-3 font-bold text-ceramic-accent hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2 mx-auto"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Extrair Campos com IA
                      </>
                    )}
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <div className="ceramic-card p-4 rounded-xl bg-ceramic-error-bg border border-ceramic-border">
                    <p className="text-sm text-ceramic-error">{error}</p>
                  </div>
                )}

                {/* Preview of parsed fields */}
                {parsedFields.length > 0 && (
                  <div className="ceramic-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-ceramic-text-primary">
                        Campos Extraídos ({parsedFields.length})
                      </h3>
                      <div className="ceramic-concave px-3 py-1 text-xs font-bold text-ceramic-success">
                        ✓ Pronto
                      </div>
                    </div>

                    <div className="space-y-3">
                      {parsedFields.map((field, index) => (
                        <div key={index} className="ceramic-tray p-4 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-ceramic-text-primary">
                                {index + 1}. {field.label}
                              </p>
                              <p className="text-xs text-ceramic-text-secondary mt-1">
                                {field.ai_prompt_hint}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <span className="text-xs font-bold text-ceramic-accent">
                                {field.max_chars} chars
                              </span>
                              {field.required && (
                                <div className="text-xs text-ceramic-error mt-1">* obrigatório</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-ceramic-text-secondary text-center mt-4">
                      💡 Campos extraídos automaticamente. Clique em "Salvar" para finalizar.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-ceramic-base border-t border-ceramic-text-secondary/10 p-6 flex items-center justify-between">
          <button
            onClick={currentStep === 'upload' ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentStep === 'upload' ? 'Cancelar' : 'Voltar'}
          </button>

          {currentStep === 'review' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                Personalizar Campos
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
              >
                {isSaving ? 'Salvando...' : 'Salvar Edital'}
                {!isSaving && <Check className="w-4 h-4" />}
              </button>
            </div>
          )}

          {currentStep === 'form_fields' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
              {isSaving ? 'Salvando...' : 'Salvar Edital'}
              {!isSaving && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
