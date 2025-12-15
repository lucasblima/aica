/**
 * StructureStage - Stage 2: Form Fields Extraction and Editing
 * Define the questionnaire fields for the edital
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Sparkles,
  FileText,
  Trash2,
  GripVertical,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import type { FormField } from '../../types';

// Unique ID generator
const generateId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const StructureStage: React.FC = () => {
  const { state, dispatch, actions } = useWorkspace();
  const { formFields, pdfUpload } = state;
  const [sourceText, setSourceText] = useState(formFields.sourceText);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isParsingAI, setIsParsingAI] = useState(false);

  const hasFields = formFields.fields.length > 0;
  const hasPdfContent = pdfUpload.textContent && pdfUpload.textContent.length > 0;

  /**
   * Parse fields from pasted text using AI
   */
  const handleParseWithAI = async () => {
    if (!sourceText.trim()) {
      alert('Cole o texto com as perguntas do formulario primeiro.');
      return;
    }

    setIsParsingAI(true);
    dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'parsing' } });

    try {
      // Import the AI parsing service
      const { parseFormFieldsFromText } = await import('../../services/briefingAIService');

      const parsedFields = await parseFormFieldsFromText(sourceText);

      // Convert to FormField format
      const fields: FormField[] = parsedFields.map((field, index) => ({
        id: generateId(),
        label: field.label,
        max_chars: field.maxChars || 3000,
        required: field.required ?? true,
        ai_prompt_hint: field.hint,
        placeholder: field.placeholder,
      }));

      dispatch({ type: 'SET_FORM_FIELDS', payload: fields });
      dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'done', sourceText } });
    } catch (error) {
      console.error('[StructureStage] Parse error:', error);
      dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'error' } });
      alert('Erro ao extrair perguntas. Tente novamente ou adicione manualmente.');
    } finally {
      setIsParsingAI(false);
    }
  };

  /**
   * Extract fields from PDF content
   */
  const handleExtractFromPdf = async () => {
    if (!hasPdfContent) {
      alert('Faca upload do PDF primeiro na aba Contexto.');
      return;
    }

    setIsParsingAI(true);
    dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'parsing' } });

    try {
      const { parseFormFieldsFromText } = await import('../../services/briefingAIService');

      const parsedFields = await parseFormFieldsFromText(pdfUpload.textContent!);

      const fields: FormField[] = parsedFields.map((field) => ({
        id: generateId(),
        label: field.label,
        max_chars: field.maxChars || 3000,
        required: field.required ?? true,
        ai_prompt_hint: field.hint,
        placeholder: field.placeholder,
      }));

      dispatch({ type: 'SET_FORM_FIELDS', payload: fields });
      dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'done' } });
    } catch (error) {
      console.error('[StructureStage] Extract from PDF error:', error);
      dispatch({ type: 'UPDATE_FORM_FIELDS', payload: { parsingStatus: 'error' } });
      alert('Erro ao extrair perguntas do PDF. Tente colar o texto manualmente.');
    } finally {
      setIsParsingAI(false);
    }
  };

  /**
   * Add a new field manually
   */
  const handleAddField = () => {
    const newField: FormField = {
      id: generateId(),
      label: 'Nova Pergunta',
      max_chars: 3000,
      required: true,
    };
    actions.addFormField(newField);
    setEditingFieldId(newField.id);
    setEditingValue(newField.label);
  };

  /**
   * Start editing a field
   */
  const handleStartEdit = (field: FormField) => {
    setEditingFieldId(field.id);
    setEditingValue(field.label);
  };

  /**
   * Save field edit
   */
  const handleSaveEdit = () => {
    if (editingFieldId && editingValue.trim()) {
      actions.updateFormField(editingFieldId, { label: editingValue.trim() });
    }
    setEditingFieldId(null);
    setEditingValue('');
  };

  /**
   * Cancel field edit
   */
  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditingValue('');
  };

  /**
   * Delete a field
   */
  const handleDeleteField = (fieldId: string) => {
    const confirmed = confirm('Remover esta pergunta?');
    if (confirmed) {
      actions.removeFormField(fieldId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Text Input Section */}
      <div className="ceramic-card p-6">
        <h3 className="text-lg font-bold text-[#5C554B] mb-2">
          Extrair Perguntas do Formulario
        </h3>
        <p className="text-sm text-[#948D82] mb-4">
          Cole o texto com as perguntas do formulario ou extraia automaticamente do PDF.
        </p>

        <div className="ceramic-tray p-4 mb-4">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={`Cole aqui o texto do formulario, por exemplo:\n\n1. Apresentacao da Empresa (max 3000 caracteres)\n2. Descricao do Projeto (max 5000 caracteres)\n3. Inovacao Tecnica (max 2000 caracteres)...`}
            rows={6}
            className="w-full bg-transparent text-[#5C554B] placeholder:text-[#948D82] focus:outline-none resize-none text-sm"
            disabled={isParsingAI}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleParseWithAI}
            disabled={isParsingAI || !sourceText.trim()}
            className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isParsingAI ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extraindo...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Extrair com IA
              </>
            )}
          </button>

          {hasPdfContent && (
            <button
              onClick={handleExtractFromPdf}
              disabled={isParsingAI}
              className="ceramic-concave px-6 py-3 font-bold text-[#5C554B] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Extrair do PDF
            </button>
          )}
        </div>
      </div>

      {/* Fields Editor */}
      {hasFields && (
        <div className="ceramic-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#5C554B]">
              Campos do Formulario ({formFields.fields.length})
            </h3>
            <button
              onClick={handleAddField}
              className="text-xs font-bold text-[#D97706] bg-[#D97706]/10 px-3 py-1.5 rounded-full hover:bg-[#D97706]/20 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {formFields.fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="ceramic-tray p-4 flex items-center gap-3"
                >
                  {/* Drag Handle (visual only for now) */}
                  <div className="text-[#948D82] cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Field Number */}
                  <div className="w-8 h-8 bg-[#5C554B] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Field Content */}
                  <div className="flex-1 min-w-0">
                    {editingFieldId === field.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1 bg-white border border-[#5C554B]/20 rounded-lg px-3 py-2 text-sm text-[#5C554B] focus:outline-none focus:ring-2 focus:ring-[#D97706]/50"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-2 text-[#948D82] hover:bg-[#948D82]/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-[#5C554B] truncate">
                          {field.label}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </p>
                        <p className="text-xs text-[#948D82]">
                          Max: {field.max_chars} caracteres
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {editingFieldId !== field.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(field)}
                        className="p-2 text-[#948D82] hover:text-[#5C554B] hover:bg-[#948D82]/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 text-[#948D82] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasFields && !isParsingAI && (
        <div className="ceramic-card p-8 text-center">
          <div className="w-16 h-16 bg-[#F0EFE9] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-[#948D82]" />
          </div>
          <h3 className="text-lg font-bold text-[#5C554B] mb-2">
            Nenhuma pergunta definida
          </h3>
          <p className="text-sm text-[#948D82] mb-6 max-w-md mx-auto">
            {hasPdfContent
              ? 'Extraia as perguntas do PDF ou adicione manualmente.'
              : 'Cole o texto do formulario acima e clique em "Extrair com IA", ou adicione manualmente.'}
          </p>
          <button
            onClick={handleAddField}
            className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] transition-all flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Adicionar Manualmente
          </button>
        </div>
      )}

      {/* Dependency Hint */}
      {!hasPdfContent && (
        <StageDependencyHint
          message="Para extrair perguntas automaticamente, faca upload do PDF do edital primeiro."
          suggestedStage="setup"
          onNavigate={actions.setStage}
          variant="info"
        />
      )}
    </div>
  );
};

export default StructureStage;
