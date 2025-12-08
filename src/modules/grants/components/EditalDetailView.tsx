/**
 * EditalDetailView - Lista todos os projetos de um edital específico
 * Similar ao PodcastDetail que lista episódios
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  DollarSign,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit,
  Save,
  X,
  Loader2
} from 'lucide-react';
import type { GrantOpportunity, GrantProject, FormField } from '../types';

interface EditalDetailViewProps {
  opportunity: GrantOpportunity;
  projects: GrantProject[];
  onBack: () => void;
  onCreateProject: () => void;
  onSelectProject: (project: GrantProject) => void;
  onArchiveProject: (projectId: string) => void;
  onUnarchiveProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateFormFields: (opportunityId: string, formFields: FormField[]) => Promise<void>;
}

export const EditalDetailView: React.FC<EditalDetailViewProps> = ({
  opportunity,
  projects,
  onBack,
  onCreateProject,
  onSelectProject,
  onArchiveProject,
  onUnarchiveProject,
  onDeleteProject,
  onUpdateFormFields
}) => {
  const [activeProjects, setActiveProjects] = useState<GrantProject[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<GrantProject[]>([]);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editedFields, setEditedFields] = useState<FormField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const active = projects.filter(p => !p.archived_at);
    const archived = projects.filter(p => p.archived_at);
    setActiveProjects(active);
    setArchivedProjects(archived);
  }, [projects]);

  const getStatusColor = (status: GrantProject['status']) => {
    const colors = {
      draft: 'text-gray-500',
      briefing: 'text-blue-500',
      generating: 'text-purple-500',
      review: 'text-orange-500',
      submitted: 'text-green-500',
      approved: 'text-green-700',
      rejected: 'text-red-500'
    };
    return colors[status] || 'text-gray-500';
  };

  const getStatusIcon = (status: GrantProject['status']) => {
    const icons = {
      draft: <FileText className="w-5 h-5" />,
      briefing: <Edit className="w-5 h-5" />,
      generating: <Clock className="w-5 h-5 animate-spin" />,
      review: <AlertCircle className="w-5 h-5" />,
      submitted: <CheckCircle2 className="w-5 h-5" />,
      approved: <CheckCircle2 className="w-5 h-5" />,
      rejected: <AlertCircle className="w-5 h-5" />
    };
    return icons[status] || <FileText className="w-5 h-5" />;
  };

  const getStatusLabel = (status: GrantProject['status']) => {
    const labels = {
      draft: 'Rascunho',
      briefing: 'Coletando Contexto',
      generating: 'Gerando Proposta',
      review: 'Em Revisão',
      submitted: 'Submetida',
      approved: 'Aprovada',
      rejected: 'Rejeitada'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleOpenEditFields = () => {
    setEditedFields(JSON.parse(JSON.stringify(opportunity.form_fields))); // Deep copy
    setIsEditingFields(true);
  };

  const handleCancelEditFields = () => {
    setIsEditingFields(false);
    setEditedFields([]);
  };

  const handleSaveFormFields = async () => {
    try {
      setIsSaving(true);
      await onUpdateFormFields(opportunity.id, editedFields);
      setIsEditingFields(false);
    } catch (error) {
      console.error('Error updating form fields:', error);
      alert('Erro ao salvar campos do formulário');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateField = (index: number, field: Partial<FormField>) => {
    const updated = [...editedFields];
    updated[index] = { ...updated[index], ...field };
    setEditedFields(updated);
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: 'Novo Campo',
      max_chars: 3000,
      required: false,
      ai_prompt_hint: '',
      placeholder: ''
    };
    setEditedFields([...editedFields, newField]);
  };

  const handleRemoveField = (index: number) => {
    setEditedFields(editedFields.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ceramic-base border-b border-ceramic-text-secondary/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-text-primary hover:scale-95 active:scale-90 transition-transform mb-4"
            title="Voltar para Editais"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Edital Info */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-ceramic-text-primary mb-2">
                {opportunity.title}
              </h1>
              <p className="text-ceramic-text-secondary mb-4">
                {opportunity.funding_agency} • {opportunity.program_name}
              </p>

              {/* Edital Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="ceramic-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-green-600">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ceramic-text-secondary">Financiamento</p>
                      <p className="text-sm font-bold text-ceramic-text-primary">
                        {formatCurrency(opportunity.min_funding)} - {formatCurrency(opportunity.max_funding)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ceramic-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-red-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ceramic-text-secondary">Prazo</p>
                      <p className="text-sm font-bold text-ceramic-text-primary">
                        {formatDate(opportunity.submission_deadline)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ceramic-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-blue-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ceramic-text-secondary">Projetos Ativos</p>
                      <p className="text-sm font-bold text-ceramic-text-primary">
                        {activeProjects.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ceramic-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-purple-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-ceramic-text-secondary">Campos</p>
                      <p className="text-sm font-bold text-ceramic-text-primary">
                        {opportunity.form_fields.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenEditFields}
                className="ceramic-concave px-4 py-3 font-bold text-ceramic-text-primary hover:scale-95 active:scale-90 transition-transform flex items-center gap-2"
                title="Editar campos do formulário"
              >
                <Edit className="w-5 h-5" />
                Editar Campos
              </button>
              <button
                onClick={onCreateProject}
                className="ceramic-concave px-6 py-3 font-bold text-ceramic-accent hover:scale-95 active:scale-90 transition-transform flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Novo Projeto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">
              Projetos Ativos ({activeProjects.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="ceramic-card p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectProject(project)}
                    >
                      <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
                        {project.project_name}
                      </h3>
                      <div className={`flex items-center gap-2 ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        <span className="text-sm font-medium">
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>

                    {/* Archive Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveProject(project.id);
                      }}
                      className="ceramic-concave w-8 h-8 flex items-center justify-center text-ceramic-text-secondary hover:scale-95 transition-transform"
                      title="Arquivar projeto"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-ceramic-text-secondary">Progresso</span>
                      <span className="font-bold text-ceramic-text-primary">
                        {project.completion_percentage}%
                      </span>
                    </div>
                    <div className="ceramic-trough p-1">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                        style={{ width: `${project.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
                    <span>Criado em {formatDate(project.created_at)}</span>
                    {project.submitted_at && (
                      <span>Submetido {formatDate(project.submitted_at)}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeProjects.length === 0 && archivedProjects.length === 0 && (
          <div className="ceramic-card p-12 text-center">
            <FileText className="w-16 h-16 text-ceramic-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
              Nenhum projeto criado
            </h3>
            <p className="text-ceramic-text-secondary mb-6">
              Crie seu primeiro projeto para se inscrever neste edital
            </p>
            <button
              onClick={onCreateProject}
              className="ceramic-concave px-6 py-3 font-bold text-ceramic-accent hover:scale-95 active:scale-90 transition-transform inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Projeto
            </button>
          </div>
        )}

        {/* Archived Projects */}
        {archivedProjects.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">
              Projetos Arquivados ({archivedProjects.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="ceramic-card p-6 opacity-60"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
                        {project.project_name}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Archive className="w-4 h-4" />
                        <span className="text-sm">Arquivado</span>
                      </div>
                    </div>

                    {/* Action buttons for archived projects */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnarchiveProject(project.id);
                        }}
                        className="ceramic-concave px-3 py-1.5 flex items-center gap-1.5 text-blue-600 hover:scale-95 transition-transform text-sm font-bold"
                        title="Restaurar projeto"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                        Restaurar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                        className="ceramic-concave w-8 h-8 flex items-center justify-center text-red-600 hover:scale-95 transition-transform"
                        title="Deletar permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-ceramic-text-secondary">
                    Arquivado em {project.archived_at && formatDate(project.archived_at)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Fields Editor Modal */}
      <AnimatePresence>
        {isEditingFields && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
            onClick={handleCancelEditFields}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="ceramic-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
                <h2 className="text-2xl font-bold text-ceramic-text-primary">
                  Editar Campos do Formulário
                </h2>
                <button
                  onClick={handleCancelEditFields}
                  className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-text-secondary hover:scale-95 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {editedFields.map((field, index) => (
                  <div key={field.id} className="ceramic-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-ceramic-text-secondary">
                        Campo {index + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveField(index)}
                        className="ceramic-concave px-3 py-1 text-red-600 hover:scale-95 transition-transform text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Label */}
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary block mb-1">
                          Nome do Campo *
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                          className="w-full ceramic-tray px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none"
                          placeholder="Ex: Descrição do Projeto"
                        />
                      </div>

                      {/* Max Chars */}
                      <div>
                        <label className="text-xs font-bold text-ceramic-text-secondary block mb-1">
                          Máximo de Caracteres
                        </label>
                        <input
                          type="number"
                          value={field.max_chars}
                          onChange={(e) => handleUpdateField(index, { max_chars: parseInt(e.target.value) || 0 })}
                          className="w-full ceramic-tray px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none"
                          placeholder="3000"
                        />
                      </div>
                    </div>

                    {/* AI Prompt Hint */}
                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary block mb-1">
                        Dica para IA (opcional)
                      </label>
                      <input
                        type="text"
                        value={field.ai_prompt_hint || ''}
                        onChange={(e) => handleUpdateField(index, { ai_prompt_hint: e.target.value })}
                        className="w-full ceramic-tray px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none"
                        placeholder="Ex: Descreva objetivos, metodologia e resultados esperados"
                      />
                    </div>

                    {/* Placeholder */}
                    <div>
                      <label className="text-xs font-bold text-ceramic-text-secondary block mb-1">
                        Placeholder (opcional)
                      </label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                        className="w-full ceramic-tray px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none"
                        placeholder="Ex: Desenvolveremos uma plataforma de..."
                      />
                    </div>

                    {/* Required */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-ceramic-text-primary">Campo obrigatório</span>
                    </label>
                  </div>
                ))}

                {/* Add Field Button */}
                <button
                  onClick={handleAddField}
                  className="w-full ceramic-concave px-4 py-3 font-bold text-ceramic-accent hover:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Campo
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-ceramic-text-secondary/10">
                <button
                  onClick={handleCancelEditFields}
                  className="ceramic-concave px-6 py-3 font-bold text-ceramic-text-secondary hover:scale-95 transition-transform"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFormFields}
                  className="ceramic-concave px-6 py-3 font-bold text-ceramic-accent hover:scale-95 transition-transform flex items-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditalDetailView;
