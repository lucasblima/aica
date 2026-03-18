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
  Loader2,
  ArrowRight
} from 'lucide-react';
import type { GrantOpportunity, GrantProject, FormField } from '../types';
import { FormFieldsEditorDrawer } from './FormFieldsEditorDrawer';
import { InteractiveSummaryCard } from './InteractiveSummaryCard';
import { PdfPreviewDrawer } from './PdfPreviewDrawer';
import { uploadEditalPDF, deleteEditalPDF, updateProjectName } from '../services/grantService';

import { createNamespacedLogger } from '@/lib/logger';
import { GenerateAudioButton } from '@/components/features/notebooklm';

const log = createNamespacedLogger('Editaldetailview');

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
  onUpdateOpportunity: (updatedOpportunity: GrantOpportunity) => void;
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
  onUpdateFormFields,
  onUpdateOpportunity
}) => {
  const [activeProjects, setActiveProjects] = useState<GrantProject[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<GrantProject[]>([]);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState<string>('');

  useEffect(() => {
    const active = projects.filter(p => !p.archived_at);
    const archived = projects.filter(p => p.archived_at);
    setActiveProjects(active);
    setArchivedProjects(archived);
  }, [projects]);

  /**
   * Handle edital PDF upload
   */
  const handleUploadEditalPDF = async (file: File) => {
    try {
      const updatedOpportunity = await uploadEditalPDF(opportunity.id, file);
      onUpdateOpportunity(updatedOpportunity);
    } catch (error) {
      log.error('Error uploading edital PDF:', error);
      throw error;
    }
  };

  /**
   * Handle edital PDF deletion
   */
  const handleDeleteEditalPDF = async () => {
    try {
      const updatedOpportunity = await deleteEditalPDF(opportunity.id);
      onUpdateOpportunity(updatedOpportunity);
    } catch (error) {
      log.error('Error deleting edital PDF:', error);
      throw error;
    }
  };

  const getStatusColor = (status: GrantProject['status']) => {
    const colors = {
      draft: 'text-ceramic-text-secondary',
      briefing: 'text-ceramic-info',
      generating: 'text-ceramic-accent',
      review: 'text-ceramic-warning',
      submitted: 'text-ceramic-success',
      approved: 'text-ceramic-success',
      rejected: 'text-ceramic-error'
    };
    return colors[status] || 'text-ceramic-text-secondary';
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

  /**
   * Get next action hint based on project status
   * Provides clear guidance on what the user should do next
   */
  const getNextActionHint = (project: GrantProject): { text: string; icon: React.ReactNode } => {
    switch (project.status) {
      case 'draft':
        return {
          text: 'Clique para começar o briefing',
          icon: <ArrowRight className="w-4 h-4" />
        };
      case 'briefing':
        return {
          text: 'Complete o briefing do projeto',
          icon: <Edit className="w-4 h-4" />
        };
      case 'generating':
        if (project.completion_percentage === 0) {
          return {
            text: 'Inicie a geração dos campos',
            icon: <ArrowRight className="w-4 h-4" />
          };
        } else if (project.completion_percentage < 100) {
          return {
            text: `Aprove os campos restantes (${project.completion_percentage}% completo)`,
            icon: <CheckCircle2 className="w-4 h-4" />
          };
        } else {
          return {
            text: 'Finalize a submissão',
            icon: <CheckCircle2 className="w-4 h-4" />
          };
        }
      case 'review':
        return {
          text: 'Revise e aprove os campos',
          icon: <AlertCircle className="w-4 h-4" />
        };
      case 'submitted':
        return {
          text: 'Proposta submetida! Exporte ou veja detalhes',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case 'approved':
        return {
          text: 'Projeto aprovado',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case 'rejected':
        return {
          text: 'Projeto rejeitado',
          icon: <X className="w-4 h-4" />
        };
      default:
        return {
          text: 'Clique para continuar',
          icon: <ArrowRight className="w-4 h-4" />
        };
    }
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

  /**
   * Handle form fields update from modal
   */
  const handleSaveFormFields = async (updatedFields: FormField[]) => {
    await onUpdateFormFields(opportunity.id, updatedFields);
  };

  /**
   * Start editing project name
   */
  const startEditingProjectName = (project: GrantProject) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.project_name);
  };

  /**
   * Save edited project name
   */
  const saveProjectName = async (projectId: string) => {
    if (!editingProjectName.trim()) {
      alert('O nome do projeto não pode estar vazio');
      return;
    }

    try {
      await updateProjectName(projectId, editingProjectName);

      // Update local state
      setActiveProjects(prev =>
        prev.map(p => p.id === projectId ? { ...p, project_name: editingProjectName.trim() } : p)
      );

      setEditingProjectId(null);
      setEditingProjectName('');
    } catch (error) {
      log.error('Error updating project name:', error);
      alert('Erro ao atualizar nome do projeto. Tente novamente.');
    }
  };

  /**
   * Cancel editing project name
   */
  const cancelEditingProjectName = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
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

              {/* Edital Stats - 5 cards in single row */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
                {/* PDF Status Card - Interactive */}
                <InteractiveSummaryCard
                  icon={FileText}
                  label="PDF do Edital"
                  value={opportunity.edital_pdf_path ? 'Enviado' : 'Pendente'}
                  subtext={opportunity.edital_text_content
                    ? `${Math.round(opportunity.edital_text_content.length / 1000)}k chars extraidos`
                    : undefined}
                  variant={opportunity.edital_pdf_path ? 'success' : 'warning'}
                  onClick={() => setIsPdfModalOpen(true)}
                />

                <div className="ceramic-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-success">
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
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-error">
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
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-info">
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
                    <div className="ceramic-concave w-10 h-10 flex items-center justify-center text-ceramic-accent">
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
                onClick={() => setIsEditingFields(true)}
                className="ceramic-concave px-4 py-3 font-bold text-ceramic-text-primary hover:scale-95 active:scale-90 transition-transform flex items-center gap-2"
                title="Editar campos do formulário"
              >
                <Edit className="w-5 h-5" />
                Editar Campos
              </button>
              <button
                onClick={onCreateProject}
                className="ceramic-concave px-6 py-3 font-bold text-ceramic-accent hover:scale-95 active:scale-90 transition-transform flex items-center gap-2"
                data-testid="create-project-btn"
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
        {/* Generate Audio Study Guide */}
        <GenerateAudioButton
          params={{
            module: 'grants',
            content: `Edital: ${opportunity?.title || ''}.
Agência: ${opportunity?.funding_agency || ''}.
Programa: ${opportunity?.program_name || ''}.
Financiamento: R$ ${opportunity?.min_funding || 0} - R$ ${opportunity?.max_funding || 0}.
Prazo: ${opportunity?.submission_deadline ? new Date(opportunity.submission_deadline).toLocaleDateString('pt-BR') : 'Não definido'}.
Campos: ${(opportunity?.form_fields || []).length} campos de aplicação.`,
            title: `Study Guide - ${opportunity?.title || 'Edital'}`,
            format: 'deep-dive',
            length: 'default',
            language: 'pt-BR',
            instructions: 'Análise detalhada do edital. Cubra: critérios de avaliação, temas prioritários, dicas de preparação, erros comuns a evitar, checklist de documentos necessários.',
          }}
          label="Gerar Study Guide"
          className="mt-6 mb-8"
        />

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
                  data-testid="project-card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {/* Editable Project Name */}
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editingProjectName}
                            onChange={(e) => setEditingProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveProjectName(project.id);
                              if (e.key === 'Escape') cancelEditingProjectName();
                            }}
                            className="flex-1 px-3 py-1.5 text-lg font-bold text-ceramic-text-primary bg-ceramic-base border-2 border-ceramic-accent rounded-lg focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveProjectName(project.id)}
                            className="ceramic-concave w-8 h-8 flex items-center justify-center text-ceramic-success hover:scale-95 transition-transform"
                            title="Salvar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditingProjectName}
                            className="ceramic-concave w-8 h-8 flex items-center justify-center text-ceramic-error hover:scale-95 transition-transform"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1 group">
                          <h3
                            className="text-lg font-bold text-ceramic-text-primary cursor-pointer flex-1"
                            onClick={() => onSelectProject(project)}
                          >
                            {project.project_name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingProjectName(project);
                            }}
                            className="ceramic-concave w-7 h-7 flex items-center justify-center text-ceramic-text-tertiary opacity-0 group-hover:opacity-100 hover:scale-95 transition-all"
                            title="Editar nome"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div
                        className={`flex items-center gap-2 ${getStatusColor(project.status)} cursor-pointer`}
                        onClick={() => onSelectProject(project)}
                      >
                        {getStatusIcon(project.status)}
                        <span className="text-sm font-medium">
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                    </div>

                    {/* Archive Button */}
                    {editingProjectId !== project.id && (
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
                    )}
                  </div>

                  {/* Next Action Hint - Shows what user should do next */}
                  {(() => {
                    const nextAction = getNextActionHint(project);
                    return (
                      <div
                        onClick={() => onSelectProject(project)}
                        className="mb-4 ceramic-tray p-3 rounded-lg cursor-pointer hover:scale-[1.01] transition-transform"
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-ceramic-info">
                            {nextAction.icon}
                          </div>
                          <p className="text-xs font-medium text-ceramic-text-secondary">
                            <span className="font-bold text-ceramic-info">Próximo passo:</span>{' '}
                            {nextAction.text}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

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
                        className="h-1 rounded-full bg-gradient-to-r from-ceramic-info to-ceramic-accent"
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
                      <div className="flex items-center gap-2 text-ceramic-text-secondary">
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
                        className="ceramic-concave px-3 py-1.5 flex items-center gap-1.5 text-ceramic-info hover:scale-95 transition-transform text-sm font-bold"
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
                        className="ceramic-concave w-8 h-8 flex items-center justify-center text-ceramic-error hover:scale-95 transition-transform"
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

      {/* Form Fields Editor Drawer */}
      <FormFieldsEditorDrawer
        isOpen={isEditingFields}
        opportunityTitle={opportunity.title}
        initialFields={opportunity.form_fields}
        onSave={handleSaveFormFields}
        onClose={() => setIsEditingFields(false)}
      />

      {/* PDF Preview Drawer */}
      <PdfPreviewDrawer
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        opportunity={opportunity}
        onUpload={handleUploadEditalPDF}
        onDelete={handleDeleteEditalPDF}
      />
    </div>
  );
};

export default EditalDetailView;
