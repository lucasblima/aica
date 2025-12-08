import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Upload, Calendar, DollarSign, FileText } from 'lucide-react';
import type {
  CreateOpportunityPayload,
  GrantOpportunity,
  EvaluationCriterion,
  FormField
} from '../types';
import { FUNDING_AGENCIES, ELIGIBLE_THEMES } from '../types';

/**
 * EditalSetupModal Component
 * Modal for creating or editing grant opportunities (editais)
 * Features dynamic form fields, evaluation criteria, and PDF upload
 */

interface EditalSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateOpportunityPayload) => Promise<void>;
  initialData?: GrantOpportunity;
}

export const EditalSetupModal: React.FC<EditalSetupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  // Basic Information
  const [title, setTitle] = useState('');
  const [fundingAgency, setFundingAgency] = useState('');
  const [programName, setProgramName] = useState('');
  const [editalNumber, setEditalNumber] = useState('');

  // Funding
  const [minFunding, setMinFunding] = useState<string>('');
  const [maxFunding, setMaxFunding] = useState<string>('');
  const [counterpartPercentage, setCounterpartPercentage] = useState<string>('');

  // Dates
  const [submissionStart, setSubmissionStart] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [resultDate, setResultDate] = useState('');

  // Themes
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  // External System
  const [externalSystemUrl, setExternalSystemUrl] = useState('');

  // Form Fields
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Evaluation Criteria
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriterion[]>([]);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'fields' | 'criteria'>('basic');

  /**
   * Load initial data if editing
   */
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setFundingAgency(initialData.funding_agency);
      setProgramName(initialData.program_name || '');
      setEditalNumber(initialData.edital_number || '');
      setMinFunding(initialData.min_funding?.toString() || '');
      setMaxFunding(initialData.max_funding?.toString() || '');
      setCounterpartPercentage(initialData.counterpart_percentage?.toString() || '');
      setSubmissionStart(initialData.submission_start || '');
      setSubmissionDeadline(initialData.submission_deadline);
      setResultDate(initialData.result_date || '');
      setSelectedThemes(initialData.eligible_themes);
      setExternalSystemUrl(initialData.external_system_url || '');
      setFormFields(initialData.form_fields);
      setEvaluationCriteria(initialData.evaluation_criteria);
    }
  }, [initialData]);

  /**
   * Reset form when modal closes
   */
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setFundingAgency('');
    setProgramName('');
    setEditalNumber('');
    setMinFunding('');
    setMaxFunding('');
    setCounterpartPercentage('');
    setSubmissionStart('');
    setSubmissionDeadline('');
    setResultDate('');
    setSelectedThemes([]);
    setExternalSystemUrl('');
    setFormFields([]);
    setEvaluationCriteria([]);
    setActiveTab('basic');
  };

  /**
   * Toggle theme selection
   */
  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev =>
      prev.includes(theme)
        ? prev.filter(t => t !== theme)
        : [...prev, theme]
    );
  };

  /**
   * Add new form field
   */
  const addFormField = () => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      label: '',
      max_chars: 1000,
      required: true,
      ai_prompt_hint: '',
      placeholder: ''
    };
    setFormFields(prev => [...prev, newField]);
  };

  /**
   * Update form field
   */
  const updateFormField = (id: string, updates: Partial<FormField>) => {
    setFormFields(prev =>
      prev.map(field => field.id === id ? { ...field, ...updates } : field)
    );
  };

  /**
   * Remove form field
   */
  const removeFormField = (id: string) => {
    setFormFields(prev => prev.filter(field => field.id !== id));
  };

  /**
   * Add new evaluation criterion
   */
  const addEvaluationCriterion = () => {
    const newCriterion: EvaluationCriterion = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      weight: 1,
      min_score: 0,
      max_score: 10
    };
    setEvaluationCriteria(prev => [...prev, newCriterion]);
  };

  /**
   * Update evaluation criterion
   */
  const updateEvaluationCriterion = (id: string, updates: Partial<EvaluationCriterion>) => {
    setEvaluationCriteria(prev =>
      prev.map(criterion => criterion.id === id ? { ...criterion, ...updates } : criterion)
    );
  };

  /**
   * Remove evaluation criterion
   */
  const removeEvaluationCriterion = (id: string) => {
    setEvaluationCriteria(prev => prev.filter(criterion => criterion.id !== id));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !fundingAgency || !submissionDeadline) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateOpportunityPayload = {
        title: title.trim(),
        funding_agency: fundingAgency,
        program_name: programName.trim() || undefined,
        edital_number: editalNumber.trim() || undefined,
        min_funding: minFunding ? parseFloat(minFunding) : undefined,
        max_funding: maxFunding ? parseFloat(maxFunding) : undefined,
        counterpart_percentage: counterpartPercentage ? parseFloat(counterpartPercentage) : undefined,
        submission_start: submissionStart || undefined,
        submission_deadline: submissionDeadline,
        result_date: resultDate || undefined,
        eligible_themes: selectedThemes,
        form_fields: formFields.filter(f => f.label.trim()),
        evaluation_criteria: evaluationCriteria.filter(c => c.name.trim()),
        external_system_url: externalSystemUrl.trim() || undefined
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      alert('Erro ao salvar edital');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[4px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-base w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl relative border border-ceramic-text-secondary/10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-10 h-10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-ceramic-text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-ceramic-text-primary">
              {initialData ? 'Editar Edital' : 'Novo Edital'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ceramic-text-tertiary hover:text-ceramic-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 px-6 pt-4">
          {(['basic', 'fields', 'criteria'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab
                  ? 'ceramic-concave text-ceramic-text-primary'
                  : 'text-ceramic-text-secondary hover:bg-black/5'
              }`}
            >
              {tab === 'basic' && 'Informações'}
              {tab === 'fields' && 'Formulário'}
              {tab === 'criteria' && 'Avaliação'}
            </button>
          ))}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Título do Edital *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: FAPERJ - Apoio a Startups de Tecnologia 2025"
                    className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                    required
                  />
                </div>

                {/* Agency and Program */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                      Agência de Fomento *
                    </label>
                    <select
                      value={fundingAgency}
                      onChange={e => setFundingAgency(e.target.value)}
                      className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                      required
                    >
                      <option value="">Selecione...</option>
                      {FUNDING_AGENCIES.map(agency => (
                        <option key={agency} value={agency}>{agency}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                      Programa
                    </label>
                    <input
                      type="text"
                      value={programName}
                      onChange={e => setProgramName(e.target.value)}
                      placeholder="Ex: Startup Rio"
                      className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                    />
                  </div>
                </div>

                {/* Edital Number */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Número do Edital
                  </label>
                  <input
                    type="text"
                    value={editalNumber}
                    onChange={e => setEditalNumber(e.target.value)}
                    placeholder="Ex: 001/2025"
                    className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                  />
                </div>

                {/* Funding Values */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-ceramic-text-secondary" />
                    <p className="text-sm font-bold text-ceramic-text-secondary">Valores de Financiamento</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-ceramic-text-secondary">Mínimo (R$)</label>
                      <input
                        type="number"
                        value={minFunding}
                        onChange={e => setMinFunding(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-ceramic-text-secondary">Máximo (R$)</label>
                      <input
                        type="number"
                        value={maxFunding}
                        onChange={e => setMaxFunding(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-ceramic-text-secondary">Contrapartida (%)</label>
                      <input
                        type="number"
                        value={counterpartPercentage}
                        onChange={e => setCounterpartPercentage(e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ceramic-text-secondary" />
                    <p className="text-sm font-bold text-ceramic-text-secondary">Prazos</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-ceramic-text-secondary">Início das Inscrições</label>
                      <input
                        type="date"
                        value={submissionStart}
                        onChange={e => setSubmissionStart(e.target.value)}
                        className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-ceramic-text-secondary">Prazo Final *</label>
                      <input
                        type="date"
                        value={submissionDeadline}
                        onChange={e => setSubmissionDeadline(e.target.value)}
                        className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-ceramic-text-secondary">Data do Resultado</label>
                      <input
                        type="date"
                        value={resultDate}
                        onChange={e => setResultDate(e.target.value)}
                        className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Eligible Themes */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Temas Elegíveis
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ELIGIBLE_THEMES.map(theme => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => toggleTheme(theme)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedThemes.includes(theme)
                            ? 'ceramic-concave text-ceramic-text-primary'
                            : 'ceramic-inset text-ceramic-text-secondary hover:scale-105'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                {/* External System URL */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    URL do Sistema Externo
                  </label>
                  <input
                    type="url"
                    value={externalSystemUrl}
                    onChange={e => setExternalSystemUrl(e.target.value)}
                    placeholder="https://exemplo.com/submissao"
                    className="w-full p-4 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                  />
                </div>

                {/* PDF Upload Placeholder */}
                <div className="ceramic-tray p-8 text-center">
                  <Upload className="w-12 h-12 text-ceramic-text-tertiary mx-auto mb-3" />
                  <p className="text-sm font-medium text-ceramic-text-secondary mb-2">
                    Upload do PDF do Edital
                  </p>
                  <p className="text-xs text-ceramic-text-tertiary">
                    Funcionalidade em desenvolvimento
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'fields' && (
              <motion.div
                key="fields"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ceramic-text-secondary">
                    Campos do Formulário
                  </p>
                  <button
                    type="button"
                    onClick={addFormField}
                    className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Campo
                  </button>
                </div>

                {formFields.length === 0 ? (
                  <div className="ceramic-tray p-8 text-center">
                    <p className="text-sm text-ceramic-text-tertiary">
                      Nenhum campo adicionado ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formFields.map((field, index) => (
                      <div key={field.id} className="ceramic-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-ceramic-text-secondary">
                            Campo {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFormField(field.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateFormField(field.id, { label: e.target.value })}
                          placeholder="Título do campo"
                          className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            value={field.max_chars}
                            onChange={e => updateFormField(field.id, { max_chars: parseInt(e.target.value) || 0 })}
                            placeholder="Máx. caracteres"
                            className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                          />
                          <label className="flex items-center gap-2 p-3 rounded-xl bg-ceramic-surface shadow-inner cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={e => updateFormField(field.id, { required: e.target.checked })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-ceramic-text-primary">Obrigatório</span>
                          </label>
                        </div>

                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={e => updateFormField(field.id, { placeholder: e.target.value })}
                          placeholder="Texto de ajuda"
                          className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'criteria' && (
              <motion.div
                key="criteria"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ceramic-text-secondary">
                    Critérios de Avaliação
                  </p>
                  <button
                    type="button"
                    onClick={addEvaluationCriterion}
                    className="ceramic-concave px-4 py-2 rounded-xl font-medium text-sm hover:scale-95 transition-transform flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Critério
                  </button>
                </div>

                {evaluationCriteria.length === 0 ? (
                  <div className="ceramic-tray p-8 text-center">
                    <p className="text-sm text-ceramic-text-tertiary">
                      Nenhum critério adicionado ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluationCriteria.map((criterion, index) => (
                      <div key={criterion.id} className="ceramic-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-ceramic-text-secondary">
                            Critério {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEvaluationCriterion(criterion.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={criterion.name}
                          onChange={e => updateEvaluationCriterion(criterion.id, { name: e.target.value })}
                          placeholder="Nome do critério"
                          className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                        />

                        <textarea
                          value={criterion.description}
                          onChange={e => updateEvaluationCriterion(criterion.id, { description: e.target.value })}
                          placeholder="Descrição do critério"
                          rows={2}
                          className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20 resize-none"
                        />

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-ceramic-text-secondary">Peso</label>
                            <input
                              type="number"
                              value={criterion.weight}
                              onChange={e => updateEvaluationCriterion(criterion.id, { weight: parseFloat(e.target.value) || 0 })}
                              placeholder="1"
                              step="0.1"
                              className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-ceramic-text-secondary">Nota Mín.</label>
                            <input
                              type="number"
                              value={criterion.min_score}
                              onChange={e => updateEvaluationCriterion(criterion.id, { min_score: parseFloat(e.target.value) || 0 })}
                              placeholder="0"
                              className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-ceramic-text-secondary">Nota Máx.</label>
                            <input
                              type="number"
                              value={criterion.max_score}
                              onChange={e => updateEvaluationCriterion(criterion.id, { max_score: parseFloat(e.target.value) || 0 })}
                              placeholder="10"
                              className="w-full p-3 rounded-xl bg-ceramic-surface shadow-inner text-ceramic-text-primary placeholder:text-ceramic-text-tertiary focus:outline-none focus:ring-2 focus:ring-ceramic-text-primary/20"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Footer */}
        <div className="flex gap-4 p-6 border-t border-ceramic-text-secondary/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-xl font-bold text-ceramic-text-secondary hover:bg-black/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !fundingAgency || !submissionDeadline}
            className="flex-1 py-3 px-6 rounded-xl bg-ceramic-text-primary text-ceramic-base font-bold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
          >
            {isSubmitting ? 'Salvando...' : initialData ? 'Atualizar Edital' : 'Criar Edital'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditalSetupModal;
