/**
 * DraftingStage - Stage 3: AI-Powered Field Filling ("Smart Copy")
 * The core feature combining briefing context with AI generation
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import type { FormField, GrantResponse } from '../../types';

export const DraftingStage: React.FC = () => {
  const { state, dispatch, actions, stageCompletions } = useWorkspace();
  const { formFields, drafting, briefingContext } = state;

  const hasFields = formFields.fields.length > 0;
  const totalFields = formFields.fields.length;
  const approvedCount = Object.values(drafting.responses).filter(
    (r) => r.status === 'approved'
  ).length;
  const generatedCount = Object.values(drafting.responses).filter(
    (r) => r.content && r.content.trim().length > 0
  ).length;

  const progressPercent = totalFields > 0 ? Math.round((approvedCount / totalFields) * 100) : 0;
  const isComplete = approvedCount === totalFields && totalFields > 0;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="ceramic-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-[#948D82]">Progresso</span>
              <span className="text-lg font-bold text-[#5C554B]">
                {approvedCount} / {totalFields}
              </span>
              {isComplete && (
                <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-bold rounded-full">
                  Completo!
                </span>
              )}
            </div>
            <div className="ceramic-trough p-1.5 w-full sm:w-64">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-[#D97706] to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <button
            onClick={actions.generateAllFields}
            disabled={drafting.isGenerating || !hasFields}
            className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {drafting.isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Todos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fields List */}
      {hasFields ? (
        <div className="space-y-4">
          {formFields.fields.map((field, index) => (
            <DraftingFieldCard
              key={field.id}
              field={field}
              index={index}
              response={drafting.responses[field.id]}
              isActive={drafting.activeFieldId === field.id}
              isGenerating={
                drafting.isGenerating &&
                drafting.generationQueue.includes(field.id)
              }
              briefingValue={briefingContext[field.id]}
              onGenerate={() => actions.generateField(field.id)}
              onApprove={() => actions.approveField(field.id)}
              onEdit={(content) => actions.editResponse(field.id, content)}
              onCopy={() => actions.copyToClipboard(field.id)}
              onUpdateBriefing={(value) => actions.updateBriefingField(field.id, value)}
            />
          ))}
        </div>
      ) : (
        <StageDependencyHint
          message="Defina as perguntas do formulario primeiro na aba Perguntas."
          suggestedStage="structure"
          onNavigate={actions.setStage}
          variant="warning"
        />
      )}

      {/* Completion Message */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ceramic-card p-6 bg-green-50 border border-green-200"
        >
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-green-700 mb-1">
                Proposta Completa!
              </h3>
              <p className="text-sm text-green-600">
                Todos os campos foram preenchidos e aprovados. Copie as respostas para
                o sistema externo do edital.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Individual field card component
 */
interface DraftingFieldCardProps {
  field: FormField;
  index: number;
  response?: GrantResponse;
  isActive: boolean;
  isGenerating: boolean;
  briefingValue?: string;
  onGenerate: () => void;
  onApprove: () => void;
  onEdit: (content: string) => void;
  onCopy: () => void;
  onUpdateBriefing: (value: string) => void;
}

const DraftingFieldCard: React.FC<DraftingFieldCardProps> = ({
  field,
  index,
  response,
  isActive,
  isGenerating,
  briefingValue,
  onGenerate,
  onApprove,
  onEdit,
  onCopy,
  onUpdateBriefing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const content = response?.content || '';
  const charCount = content.length;
  const isApproved = response?.status === 'approved';
  const hasContent = content.trim().length > 0;
  const exceedsMax = field.max_chars && charCount > field.max_chars;

  const handleStartEdit = () => {
    setEditContent(content);
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleSaveEdit = () => {
    onEdit(editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent('');
    setIsEditing(false);
  };

  const handleCopy = async () => {
    await onCopy();
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getStatusColor = () => {
    if (isApproved) return 'border-green-400 bg-green-50';
    if (hasContent) return 'border-amber-400 bg-amber-50';
    return 'border-transparent';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`ceramic-card overflow-hidden border-l-4 ${getStatusColor()}`}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Number Badge */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              isApproved
                ? 'bg-green-500 text-white'
                : hasContent
                ? 'bg-amber-500 text-white'
                : 'bg-[#5C554B] text-white'
            }`}
          >
            {isApproved ? <Check className="w-4 h-4" /> : index + 1}
          </div>

          {/* Field Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-[#5C554B] truncate">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </h4>
            <div className="flex items-center gap-2 text-xs text-[#948D82]">
              <span>
                {charCount}
                {field.max_chars && ` / ${field.max_chars}`} chars
              </span>
              {isApproved && (
                <span className="text-green-600 font-bold">Aprovado</span>
              )}
              {hasContent && !isApproved && (
                <span className="text-amber-600 font-bold">Gerado</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <Loader2 className="w-5 h-5 text-[#D97706] animate-spin" />
          ) : hasContent && !isApproved ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
              className="ceramic-concave px-3 py-1.5 text-xs font-bold text-green-600 hover:scale-95 transition-transform flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Aprovar</span>
            </button>
          ) : !hasContent ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              className="ceramic-concave px-3 py-1.5 text-xs font-bold text-[#D97706] hover:scale-95 transition-transform flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Gerar</span>
            </button>
          ) : null}

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#948D82]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#948D82]" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-[#5C554B]/10 pt-4">
              {/* AI Prompt Hint */}
              {field.ai_prompt_hint && (
                <p className="text-xs text-[#948D82] mb-3 italic">
                  Dica: {field.ai_prompt_hint}
                </p>
              )}

              {/* Content Area */}
              {isEditing ? (
                <div className="space-y-3">
                  <div className="ceramic-tray p-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      className="w-full bg-transparent text-[#5C554B] text-sm focus:outline-none resize-none"
                      maxLength={field.max_chars}
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        exceedsMax ? 'text-red-600' : 'text-[#948D82]'
                      }`}
                    >
                      {editContent.length}
                      {field.max_chars && ` / ${field.max_chars}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-xs font-bold text-[#948D82] hover:text-[#5C554B] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="ceramic-concave px-4 py-2 text-xs font-bold text-[#D97706] hover:scale-95 transition-transform"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              ) : hasContent ? (
                <div className="space-y-3">
                  <div className="ceramic-tray p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-[#5C554B] whitespace-pre-wrap">
                      {content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        exceedsMax ? 'text-red-600' : 'text-[#948D82]'
                      }`}
                    >
                      {charCount}
                      {field.max_chars && ` / ${field.max_chars}`} caracteres
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStartEdit}
                        className="ceramic-concave px-3 py-1.5 text-xs font-bold text-[#5C554B] hover:scale-95 transition-transform flex items-center gap-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={handleCopy}
                        className={`ceramic-concave px-3 py-1.5 text-xs font-bold hover:scale-95 transition-transform flex items-center gap-1 ${
                          copySuccess ? 'text-green-600' : 'text-[#5C554B]'
                        }`}
                      >
                        {copySuccess ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </button>
                      {!isApproved && (
                        <button
                          onClick={onGenerate}
                          className="ceramic-concave px-3 py-1.5 text-xs font-bold text-[#948D82] hover:scale-95 transition-transform flex items-center gap-1"
                          title="Regenerar"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ceramic-tray p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-[#948D82] mx-auto mb-2" />
                  <p className="text-sm text-[#948D82] mb-4">
                    Campo ainda nao preenchido
                  </p>
                  <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="ceramic-concave px-6 py-2 text-sm font-bold text-[#D97706] hover:scale-95 disabled:opacity-50 transition-transform flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    Gerar com IA
                  </button>
                </div>
              )}

              {/* Character Warning */}
              {exceedsMax && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">
                    Texto excede o limite maximo de {field.max_chars} caracteres
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DraftingStage;
