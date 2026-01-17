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
import { processEditalPDF } from '../services/pdfService';
import { analyzeEditalStructure, parseFormFieldsFromText } from '../services/grantAIService';
import type { CreateOpportunityPayload } from '../types';

interface EditalSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateOpportunityPayload) => Promise<void>;
}

type WizardStep = 'upload' | 'review' | 'form_fields';

export const EditalSetupWizard: React.FC<EditalSetupWizardProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<{
    path: string;
    text: string;
    url: string;
  } | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields state
  const [formFieldsText, setFormFieldsText] = useState('');
  const [parsedFields, setParsedFields] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  /**
   * Handle PDF upload and analysis
   */
  const handleFileSelected = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);

      // 1. Upload e extrair texto
      console.log('[Wizard] Processando PDF...');
      const processed = await processEditalPDF(file);
      setPdfData(processed);

      // 2. Analisar com IA
      console.log('[Wizard] Analisando edital...');
      const analyzed = await analyzeEditalStructure(processed.text);
      setExtractedData(analyzed);

      // 3. Avançar para revisão
      setCurrentStep('review');
      setIsProcessing(false);
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
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
      console.error('Erro ao parsear campos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao parsear campos');
      setIsParsing(false);
    }
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!extractedData || !pdfData) return;

    try {
      setIsSaving(true);

      // Use parsed fields if available, otherwise use extracted fields
      const formFields = parsedFields.length > 0 ? parsedFields : extractedData.form_fields;

      const payload: CreateOpportunityPayload = {
        ...extractedData,
        form_fields: formFields,
        edital_pdf_path: pdfData.path,
        edital_text_content: pdfData.text,
        status: 'open'
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar edital:', err);
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
    setPdfData(null);
    setExtractedData(null);
    setFormFieldsText('');
    setParsedFields([]);
    setError(null);
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
              currentStep === 'upload' ? 'text-ceramic-accent' : 'text-green-600'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'upload' ? 'bg-ceramic-accent-dark text-white' : 'bg-green-600 text-white'
              }`}>
                {currentStep !== 'upload' ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-bold">Upload</span>
            </div>

            {/* Connector 1 */}
            <div className={`flex-1 h-0.5 ${
              currentStep === 'review' || currentStep === 'form_fields' ? 'bg-green-600' : 'bg-ceramic-text-secondary/20'
            }`} />

            {/* Step 2: Review */}
            <div className={`flex items-center gap-2 ${
              currentStep === 'review' ? 'text-ceramic-accent' :
              currentStep === 'form_fields' ? 'text-green-600' : 'text-ceramic-text-secondary'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-ceramic-accent-dark text-white' :
                currentStep === 'form_fields' ? 'bg-green-600 text-white' : 'bg-ceramic-text-secondary/20'
              }`}>
                {currentStep === 'form_fields' ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-bold">Revisar</span>
            </div>

            {/* Connector 2 */}
            <div className={`flex-1 h-0.5 ${
              currentStep === 'form_fields' ? 'bg-green-600' : 'bg-ceramic-text-secondary/20'
            }`} />

            {/* Step 3: Form Fields */}
            <div className={`flex items-center gap-2 ${
              currentStep === 'form_fields' ? 'text-ceramic-accent' : 'text-ceramic-text-secondary'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'form_fields' ? 'bg-ceramic-accent-dark text-white' : 'bg-ceramic-text-secondary/20'
              }`}>
                3
              </div>
              <span className="text-sm font-bold">Campos</span>
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
                <PDFUploadZone
                  onFileSelected={handleFileSelected}
                  isProcessing={isProcessing}
                  error={error}
                  success={false}
                />

                {error && (
                  <div className="mt-4 ceramic-card p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="text-xs text-red-500 hover:text-red-700 mt-2"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 'review' && extractedData && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Success message */}
                <div className="ceramic-card p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm text-green-600 font-bold">
                    ✓ Edital analisado com sucesso!
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {extractedData.form_fields?.length || 0} campos identificados,
                    {' '}{extractedData.evaluation_criteria?.length || 0} critérios de avaliação extraídos.
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
                      <p className="text-sm text-ceramic-text-primary mt-1">{extractedData.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">AGÊNCIA</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">{extractedData.funding_agency}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">NÚMERO</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">{extractedData.edital_number}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">FINANCIAMENTO</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">
                          R$ {extractedData.min_funding?.toLocaleString('pt-BR')} - R$ {extractedData.max_funding?.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary">DEADLINE</label>
                        <p className="text-sm text-ceramic-text-primary mt-1">
                          {new Date(extractedData.submission_deadline).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary">TEMAS</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {extractedData.eligible_themes?.map((theme: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-ceramic-accent/10 text-ceramic-accent rounded-full text-xs font-bold">
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary">
                        CRITÉRIOS DE AVALIAÇÃO ({extractedData.evaluation_criteria?.length || 0})
                      </label>
                      <div className="space-y-2 mt-2">
                        {extractedData.evaluation_criteria?.slice(0, 3).map((criterion: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-ceramic-text-primary">{criterion.name}</span>
                            <span className="text-ceramic-text-secondary">Peso: {criterion.weight}%</span>
                          </div>
                        ))}
                        {(extractedData.evaluation_criteria?.length || 0) > 3 && (
                          <p className="text-xs text-ceramic-text-secondary italic">
                            + {extractedData.evaluation_criteria.length - 3} critérios adicionais
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-ceramic-text-secondary text-center">
                  💡 Você poderá editar todos os campos após salvar o edital
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
                <div className="ceramic-card p-6 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Edit3 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-blue-900 mb-2">
                        Como funciona?
                      </h3>
                      <p className="text-xs text-blue-700 mb-2">
                        Cole abaixo o texto com as perguntas do formulário do edital. A IA identificará automaticamente:
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                        <li>Quantas perguntas existem</li>
                        <li>O nome/label de cada pergunta</li>
                        <li>O limite de caracteres de cada resposta</li>
                      </ul>
                      <p className="text-xs text-blue-600 mt-3 font-medium">
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
                  <div className="ceramic-card p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Preview of parsed fields */}
                {parsedFields.length > 0 && (
                  <div className="ceramic-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-ceramic-text-primary">
                        Campos Extraídos ({parsedFields.length})
                      </h3>
                      <div className="ceramic-concave px-3 py-1 text-xs font-bold text-green-600">
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
                                <div className="text-xs text-red-600 mt-1">* obrigatório</div>
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
            <button
              onClick={handleContinue}
              className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent hover:scale-105 transition-transform flex items-center gap-2"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 'form_fields' && (
            <button
              onClick={handleSave}
              disabled={isSaving || parsedFields.length === 0}
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
