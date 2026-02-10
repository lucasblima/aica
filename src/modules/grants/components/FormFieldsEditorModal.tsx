import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2, AlertCircle, GripVertical, Wand2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { FormField } from '../types';
import { parseFormFieldsFromText } from '../services/grantAIService';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Formfieldseditormodal');

interface FormFieldsEditorModalProps {
  isOpen: boolean;
  opportunityTitle: string;
  initialFields: FormField[];
  onSave: (updatedFields: FormField[]) => Promise<void>;
  onClose: () => void;
}

interface FieldEditState extends FormField {
  hasError?: boolean;
  errorMessage?: string;
}

export const FormFieldsEditorModal: React.FC<FormFieldsEditorModalProps> = ({
  isOpen,
  opportunityTitle,
  initialFields,
  onSave,
  onClose
}) => {
  const [fields, setFields] = useState<FieldEditState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // AI Import states
  const [showAIImport, setShowAIImport] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Initialize fields from props
   */
  useEffect(() => {
    if (isOpen) {
      setFields(initialFields.map(f => ({ ...f, hasError: false })));
      setHasChanges(false);
    }
  }, [isOpen, initialFields]);

  /**
   * Validate a single field
   */
  const validateField = (field: FieldEditState): { valid: boolean; error?: string } => {
    if (!field.label || field.label.trim().length === 0) {
      return { valid: false, error: 'Label é obrigatório' };
    }

    if (!field.max_chars || field.max_chars <= 0) {
      return { valid: false, error: 'Limite deve ser maior que 0' };
    }

    if (field.max_chars > 50000) {
      return { valid: false, error: 'Limite muito alto (máx: 50.000)' };
    }

    return { valid: true };
  };

  /**
   * Update a field property
   */
  const updateField = (index: number, property: keyof FormField, value: any) => {
    setFields(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [property]: value,
        hasError: false,
        errorMessage: undefined
      };
      return updated;
    });
    setHasChanges(true);
  };

  /**
   * Add new field
   */
  const addField = () => {
    const newField: FieldEditState = {
      id: `field_${Date.now()}`,
      label: 'Novo Campo',
      max_chars: 2000,
      required: true,
      ai_prompt_hint: '',
      placeholder: ''
    };
    setFields(prev => [...prev, newField]);
    setHasChanges(true);
  };

  /**
   * Remove field
   */
  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  /**
   * Move field up/down
   */
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    setFields(prev => {
      const updated = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
      return updated;
    });
    setHasChanges(true);
  };

  /**
   * Process pasted text with AI to extract fields
   */
  const handleProcessAI = async () => {
    if (!pastedText || pastedText.trim().length === 0) {
      alert('Cole o texto do formulário do edital primeiro.');
      return;
    }

    try {
      setIsProcessing(true);
      const extractedFields = await parseFormFieldsFromText(pastedText);

      // Add extracted fields to current fields
      setFields(prev => [...prev, ...extractedFields.map(f => ({ ...f, hasError: false }))]);
      setHasChanges(true);

      // Clear text and collapse section
      setPastedText('');
      setShowAIImport(false);

      alert(`${extractedFields.length} campos extraídos com sucesso!`);
    } catch (error) {
      log.error('Error processing with AI:', error);
      alert('Erro ao processar texto com IA. Tente novamente ou cole em formato diferente.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Validate all fields and save
   */
  const handleSave = async () => {
    // Validate all fields
    const validatedFields = fields.map(field => {
      const validation = validateField(field);
      return {
        ...field,
        hasError: !validation.valid,
        errorMessage: validation.error
      };
    });

    const hasErrors = validatedFields.some(f => f.hasError);

    if (hasErrors) {
      setFields(validatedFields);
      return;
    }

    try {
      setIsSaving(true);

      // Remove validation properties before saving
      const cleanFields: FormField[] = validatedFields.map(({ hasError, errorMessage, ...field }) => field);

      await onSave(cleanFields);
      onClose();
    } catch (error) {
      log.error('Error saving fields:', error);
      alert('Erro ao salvar campos. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle close with confirmation if there are changes
   */
  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm('Você tem alterações não salvas. Deseja descartar?');
      if (!confirmed) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-ceramic-base rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ceramic-border">
            <div>
              <h2 className="text-xl font-bold text-ceramic-text-primary">
                Editar Campos do Formulário
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                {opportunityTitle}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="ceramic-concave p-2 rounded-xl hover:scale-95 transition-transform"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* AI Import Section */}
          <div className="border-b border-ceramic-border">
            <button
              onClick={() => setShowAIImport(!showAIImport)}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-ceramic-tray/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-ceramic-accent" />
                <div className="text-left">
                  <h3 className="font-bold text-ceramic-text-primary">
                    Importar Campos com IA
                  </h3>
                  <p className="text-xs text-ceramic-text-tertiary">
                    Cole o texto do formulário do edital e deixe a IA extrair os campos
                  </p>
                </div>
              </div>
              {showAIImport ? (
                <ChevronUp className="w-5 h-5 text-ceramic-text-tertiary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-ceramic-text-tertiary" />
              )}
            </button>

            <AnimatePresence>
              {showAIImport && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 py-4 space-y-3 bg-ceramic-tray/20">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      rows={10}
                      placeholder={`Cole o texto do formulário aqui. Exemplo:

Título do projeto - (Máximo de 150 caracteres):
Equipe envolvida - (Máximo de 1000 caracteres):
Histórico da empresa - (Máximo de 2000 caracteres):
...`}
                      className="w-full ceramic-tray px-4 py-3 rounded-xl bg-transparent text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-accent resize-none font-mono text-sm"
                    />

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-ceramic-text-tertiary">
                        {pastedText.trim().length > 0
                          ? `${pastedText.trim().length} caracteres colados`
                          : 'Aguardando texto...'}
                      </p>
                      <button
                        onClick={handleProcessAI}
                        disabled={isProcessing || pastedText.trim().length === 0}
                        className="ceramic-concave px-6 py-2 rounded-xl font-bold text-sm hover:scale-95 transition-transform flex items-center gap-2 bg-ceramic-accent/10 text-ceramic-accent disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-ceramic-accent border-t-transparent rounded-full animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            Processar com IA
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-12 text-ceramic-text-tertiary">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum campo configurado.</p>
                <p className="text-sm mt-1">Clique em "Adicionar Campo" para começar.</p>
              </div>
            ) : (
              fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  layout
                  className={`ceramic-card p-4 space-y-3 ${field.hasError ? 'border-2 border-ceramic-error' : ''}`}
                >
                  {/* Field Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="ceramic-concave p-1 rounded disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <GripVertical className="w-4 h-4 rotate-180" />
                      </button>
                      <button
                        onClick={() => moveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        className="ceramic-concave p-1 rounded disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-ceramic-text-tertiary">
                        Campo {index + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => removeField(index)}
                      className="ceramic-concave p-2 rounded-xl hover:scale-95 transition-transform text-ceramic-error"
                      title="Remover campo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {field.hasError && field.errorMessage && (
                    <div className="flex items-center gap-2 text-ceramic-error text-sm bg-ceramic-error/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      {field.errorMessage}
                    </div>
                  )}

                  {/* Label */}
                  <div>
                    <label className="block text-sm font-medium text-ceramic-text-secondary mb-2">
                      Pergunta (Label) *
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={e => updateField(index, 'label', e.target.value)}
                      className="w-full ceramic-tray px-4 py-2 rounded-xl bg-transparent text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-warning"
                      placeholder="Ex: Descreva o objetivo do projeto"
                    />
                  </div>

                  {/* Max Chars */}
                  <div>
                    <label className="block text-sm font-medium text-ceramic-text-secondary mb-2">
                      Limite de Caracteres *
                    </label>
                    <input
                      type="number"
                      value={field.max_chars}
                      onChange={e => updateField(index, 'max_chars', parseInt(e.target.value) || 0)}
                      min="1"
                      max="50000"
                      className="w-full ceramic-tray px-4 py-2 rounded-xl bg-transparent text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-warning"
                    />
                  </div>

                  {/* AI Prompt Hint */}
                  <div>
                    <label className="block text-sm font-medium text-ceramic-text-secondary mb-2">
                      Dica de IA (opcional)
                    </label>
                    <textarea
                      value={field.ai_prompt_hint || ''}
                      onChange={e => updateField(index, 'ai_prompt_hint', e.target.value)}
                      rows={2}
                      className="w-full ceramic-tray px-4 py-2 rounded-xl bg-transparent text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-warning resize-none"
                      placeholder="Dica para guiar a geração automática deste campo"
                    />
                  </div>

                  {/* Placeholder */}
                  <div>
                    <label className="block text-sm font-medium text-ceramic-text-secondary mb-2">
                      Texto de ajuda (opcional)
                    </label>
                    <input
                      type="text"
                      value={field.placeholder || ''}
                      onChange={e => updateField(index, 'placeholder', e.target.value)}
                      className="w-full ceramic-tray px-4 py-2 rounded-xl bg-transparent text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-warning"
                      placeholder="Texto de ajuda exibido ao usuário"
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-ceramic-border px-6 py-4 bg-ceramic-tray/30">
            <div className="flex items-center justify-between">
              <button
                onClick={addField}
                className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar Campo
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="ceramic-concave px-6 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="ceramic-concave px-6 py-2 rounded-xl font-bold text-sm hover:scale-95 transition-transform flex items-center gap-2 bg-ceramic-info-bg text-ceramic-info disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-ceramic-warning border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FormFieldsEditorModal;
