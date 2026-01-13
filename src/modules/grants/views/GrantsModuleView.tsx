/**
 * GrantsModuleView - Container principal do Módulo Captação
 * Gerencia o fluxo completo: Dashboard → Setup → Briefing → Geração
 */

import { useTourAutoStart } from '@/hooks/useTourAutoStart';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Archive, ArchiveRestore, Trash2, MoreVertical } from 'lucide-react';
import { EditalSetupWizard } from '../components/EditalSetupWizard';
import { EditalDetailView } from '../components/EditalDetailView';
import { ProjectBriefingView } from '../components/ProjectBriefingView';
import { ProposalGeneratorView } from '../components/ProposalGeneratorView';
import { EditalProjectWorkspace } from '../components/workspace/EditalProjectWorkspace';
import { ApprovedProjectModal } from '../components/ApprovedProjectModal';
import {
  createOpportunity,
  listOpportunities,
  getOpportunity,
  createProject,
  getProject,
  listProjects,
  saveBriefing,
  getBriefing,
  saveResponse,
  listResponses,
  updateProjectStatus,
  updateProjectName,
  archiveProject,
  unarchiveProject,
  deleteArchivedProject,
  archiveOpportunity,
  unarchiveOpportunity,
  deleteArchivedOpportunity,
  countActiveProjects,
  updateOpportunity,
  calculateCompletion,
  checkAllResponsesApproved
} from '../services/grantService';
import { generateFieldContent } from '../services/grantAIService';
import type {
  GrantProject,
  GrantOpportunity,
  GrantResponse,
  CreateOpportunityPayload,
  FormField
} from '../types';

type ModuleView = 'dashboard' | 'edital-detail' | 'setup' | 'briefing' | 'generation' | 'workspace';

// Tipo estendido de oportunidade com contagem de projetos
type OpportunityWithCount = GrantOpportunity & {
  projectCount?: number;
};

interface GrantsModuleViewProps {
  onBack: () => void;
}

/* data-tour markers: grants-header, opportunities-list, opportunity-filter, edital-parser, opportunity-detail, saved-opportunities, application-tracking, ai-briefing */
export const GrantsModuleView: React.FC<GrantsModuleViewProps> = ({ onBack }) => {
  // View state
  const [currentView, setCurrentView] = useState<ModuleView>('dashboard');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isApprovedProjectModalOpen, setIsApprovedProjectModalOpen] = useState(false);

  // Data state
  const [opportunities, setOpportunities] = useState<OpportunityWithCount[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithCount | null>(null);
  const [projects, setProjects] = useState<GrantProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<GrantProject | null>(null);
  const [currentOpportunity, setCurrentOpportunity] = useState<GrantOpportunity | null>(null);
  const [currentBriefing, setCurrentBriefing] = useState<Record<string, string>>({});
  const [currentResponses, setCurrentResponses] = useState<Record<string, GrantResponse>>({});

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Transfer progress state for briefing → generation
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState<{
    current: number;
    total: number;
    currentField: string;
  }>({ current: 0, total: 0, currentField: '' });

  /**
   * Load projects on mount
   */
  useEffect(() => {
    loadOpportunitiesData();
  }, []);

  /**
   * Load all opportunities (editais) with project counts
   */
  const loadOpportunitiesData = async () => {
    try {
      setIsLoading(true);
      const data = await listOpportunities({});

      // Carregar contagem de projetos para cada oportunidade
      const dataWithCounts: OpportunityWithCount[] = await Promise.all(
        data.map(async (opp) => {
          try {
            const count = await countActiveProjects(opp.id);
            return { ...opp, projectCount: count };
          } catch (error) {
            console.error(`Error counting projects for ${opp.id}:`, error);
            return { ...opp, projectCount: 0 };
          }
        })
      );

      setOpportunities(dataWithCounts);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load projects for a specific opportunity
   */
  const loadProjectsForOpportunity = async (opportunityId: string) => {
    try {
      setIsLoading(true);
      const data = await listProjects({ opportunity_id: opportunityId });
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load full project data (opportunity, briefing, responses)
   */
  const loadProjectDetails = async (projectId: string) => {
    try {
      setIsLoading(true);
      const project = await getProject(projectId);
      setSelectedProject(project);
      setCurrentOpportunity(project.opportunity || null);

      // Load briefing
      const briefing = await getBriefing(projectId);
      setCurrentBriefing(briefing?.briefing_data || {});

      // Load responses
      const responses = await listResponses(projectId);
      const responsesMap: Record<string, GrantResponse> = {};
      responses.forEach(r => {
        responsesMap[r.field_id] = r;
      });
      setCurrentResponses(responsesMap);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading project details:', error);
      setIsLoading(false);
    }
  };

  /**
   * Handle opportunity creation
   */
  const handleCreateOpportunity = async (payload: CreateOpportunityPayload) => {
    try {
      const opportunity = await createOpportunity(payload);

      // Automatically create a project for this opportunity
      const project = await createProject({
        opportunity_id: opportunity.id,
        project_name: `Projeto ${payload.title}`
      });

      // Load the new project
      await loadProjectDetails(project.id);

      // Navigate to workspace
      setCurrentView('workspace');
      setIsSetupModalOpen(false);

      // Refresh opportunities list
      await loadOpportunitiesData();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  };

  /**
   * Handle briefing save
   */
  const handleSaveBriefing = async (briefing: Record<string, string>) => {
    if (!selectedProject) return;

    try {
      await saveBriefing(selectedProject.id, { briefing_data: briefing });
      setCurrentBriefing(briefing);
    } catch (error) {
      console.error('Error saving briefing:', error);
      throw error;
    }
  };

  /**
   * Handle continue from briefing to generation
   * Automatically transfers filled briefing fields to grant_responses
   */
  const handleContinueToGeneration = async () => {
    if (!selectedProject || !currentOpportunity) return;

    try {
      // 1. Identify fields to transfer from briefing
      const fieldsToTransfer = currentOpportunity.form_fields.filter(field => {
        const content = currentBriefing[field.id];
        return content && content.trim().length > 0;
      });

      console.log(`[Grants] Transferring ${fieldsToTransfer.length} fields from briefing to responses`);

      // Start loading state
      setIsTransferring(true);
      setTransferProgress({ current: 0, total: fieldsToTransfer.length, currentField: '' });

      // 2. For each filled field in briefing, create a grant_response
      for (let i = 0; i < fieldsToTransfer.length; i++) {
        const field = fieldsToTransfer[i];
        const content = currentBriefing[field.id];

        // Update progress
        setTransferProgress({
          current: i + 1,
          total: fieldsToTransfer.length,
          currentField: field.label
        });

        // Check if a response already exists for this field
        const existingResponse = currentResponses[field.id];

        // Only create if doesn't exist or existing is empty
        if (!existingResponse || !existingResponse.content || existingResponse.content.trim().length === 0) {
          await saveResponse(
            selectedProject.id,
            field.id,
            content,
            'generated' // Status 'generated' indicates it came from briefing
          );
        }

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 3. Reload responses to get the newly created ones
      const responses = await listResponses(selectedProject.id);
      const responsesMap: Record<string, GrantResponse> = {};
      responses.forEach(r => {
        responsesMap[r.field_id] = r;
      });
      setCurrentResponses(responsesMap);

      // 4. Update project status and navigate to generation view
      await updateProjectStatus(selectedProject.id, 'generating');
      setIsTransferring(false);
      setCurrentView('generation');
    } catch (error) {
      console.error('Error transferring briefing to generation:', error);
      setIsTransferring(false);
      alert('Erro ao transferir campos do briefing. Tente novamente.');
    }
  };


  /**
   * Handle field generation
   */
  const handleGenerateField = async (fieldId: string): Promise<string> => {
    if (!selectedProject || !currentOpportunity) {
      throw new Error('No project or opportunity selected');
    }

    const fieldConfig = currentOpportunity.form_fields.find(f => f.id === fieldId);
    if (!fieldConfig) {
      throw new Error('Field configuration not found');
    }

    // Build previous responses map
    const previousResponses: Record<string, string> = {};
    Object.entries(currentResponses).forEach(([fId, response]) => {
      if (fId !== fieldId && response.status === 'approved') {
        previousResponses[fId] = response.content;
      }
    });

    try {
      const content = await generateFieldContent({
        field_id: fieldId,
        edital_text: currentOpportunity.edital_text_content || '',
        evaluation_criteria: currentOpportunity.evaluation_criteria || [],
        field_config: fieldConfig,
        briefing: currentBriefing,
        previous_responses: previousResponses,
        source_document_content: selectedProject.source_document_content || null,
        edital_text_content: currentOpportunity.edital_text_content || null
      });

      return content;
    } catch (error) {
      console.error('Error generating field:', error);
      throw error;
    }
  };

  /**
   * Handle response save
   */
  const handleSaveResponse = async (
    fieldId: string,
    content: string,
    status?: string
  ) => {
    if (!selectedProject) return;

    try {
      const response = await saveResponse(
        selectedProject.id,
        fieldId,
        content,
        status
      );

      setCurrentResponses(prev => ({
        ...prev,
        [fieldId]: response
      }));
    } catch (error) {
      console.error('Error saving response:', error);
      throw error;
    }
  };

  /**
   * Handle project selection from dashboard
   */
  const handleSelectProject = async (project: GrantProject) => {
    await loadProjectDetails(project.id);

    // Navigate to appropriate view based on project status
    switch (project.status) {
      case 'draft':
      case 'briefing':
        setCurrentView('briefing');
        break;
      case 'generating':
      case 'review':
        setCurrentView('generation');
        break;
      default:
        setCurrentView('briefing');
    }
  };

  /**
   * Handle archive project
   */
  const handleArchiveProject = async (projectId: string) => {
    if (!confirm('Tem certeza que deseja arquivar este projeto?')) return;

    try {
      await archiveProject(projectId);
      if (selectedOpportunity) {
        await loadProjectsForOpportunity(selectedOpportunity.id); // Refresh list
      }
    } catch (error) {
      console.error('Error archiving project:', error);
      alert('Erro ao arquivar projeto');
    }
  };

  /**
   * Handle unarchive project
   */
  const handleUnarchiveProject = async (projectId: string) => {
    try {
      await unarchiveProject(projectId);
      if (selectedOpportunity) {
        await loadProjectsForOpportunity(selectedOpportunity.id); // Refresh list
      }
    } catch (error) {
      console.error('Error unarchiving project:', error);
      alert('Erro ao restaurar projeto');
    }
  };

  /**
   * Handle delete archived project
   */
  const handleDeleteProject = async (projectId: string, pdfPath?: string) => {
    if (!confirm(
      'ATENÇÃO: Esta ação é PERMANENTE e NÃO pode ser desfeita.\n\n' +
      'O projeto será deletado permanentemente.\n\n' +
      'Tem certeza que deseja continuar?'
    )) return;

    try {
      await deleteArchivedProject(projectId, pdfPath);
      if (selectedOpportunity) {
        await loadProjectsForOpportunity(selectedOpportunity.id); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert(error instanceof Error ? error.message : 'Erro ao deletar projeto');
    }
  };

  /**
   * Handle form fields update
   */
  const handleUpdateFormFields = async (opportunityId: string, formFields: FormField[]) => {
    try {
      await updateOpportunity(opportunityId, { form_fields: formFields });

      // Update selected opportunity immediately with the new form fields
      // This avoids race condition with loadOpportunitiesData()
      if (selectedOpportunity?.id === opportunityId) {
        setSelectedOpportunity({
          ...selectedOpportunity,
          form_fields: formFields
        });
      }

      // Refresh the opportunities list in background
      loadOpportunitiesData();
    } catch (error) {
      console.error('Error updating form fields:', error);
      throw error;
    }
  };

  /**
   * Handle back navigation
   */
  /**
   * Handle navigation back through hierarchy
   * Dashboard ← Edital Detail ← Briefing ← Generation
   */
  const handleBack = () => {
    if (currentView === 'generation') {
      setCurrentView('briefing');
    } else if (currentView === 'workspace') {
      // From workspace, go back to edital detail
      setCurrentView('edital-detail');
      setSelectedProject(null);
    } else if (currentView === 'briefing') {
      setCurrentView('edital-detail');
      setSelectedProject(null);
    } else if (currentView === 'edital-detail') {
      setCurrentView('dashboard');
      setSelectedOpportunity(null);
      setProjects([]);
    } else {
      onBack();
    }
  };

  /**
   * Handle back to edital from completed proposal
   * Goes directly to edital-detail view (skips briefing)
   */
  const handleBackToEdital = () => {
    setCurrentView('edital-detail');
    setSelectedProject(null);
  };

  /**
   * Handle proposal completion - update project status to 'submitted'
   * Called automatically when all fields are approved
   */
  const handleProposalComplete = async () => {
    if (!selectedProject) return;

    try {
      // Verify that all responses are really approved
      const { allApproved, totalFields, approvedFields } = await checkAllResponsesApproved(selectedProject.id);

      if (!allApproved) {
        console.warn('[GrantsModule] Attempted to complete project without all approvals', {
          totalFields,
          approvedFields
        });
        return;
      }

      // Update status to SUBMITTED (not review)
      await updateProjectStatus(selectedProject.id, 'submitted');

      // Recalculate completion percentage (should be 100%)
      const completionPercentage = await calculateCompletion(selectedProject.id);

      // Update local state
      setSelectedProject({
        ...selectedProject,
        status: 'submitted',
        completion_percentage: completionPercentage,
        submitted_at: new Date().toISOString()
      });

      // Reload projects to update the card
      if (selectedOpportunity) {
        const projectsData = await listProjects({ opportunity_id: selectedOpportunity.id });
        setProjects(projectsData);
      }

      console.log('[GrantsModule] Project submitted:', {
        status: 'submitted',
        completion: completionPercentage,
        totalFields,
        approvedFields
      });
    } catch (error) {
      console.error('Error updating project status to submitted:', error);
    }
  };

  /**
   * Handle selecting an edital from dashboard
   */
  const handleSelectOpportunity = async (opportunity: GrantOpportunity) => {
    setSelectedOpportunity(opportunity);
    setCurrentOpportunity(opportunity);
    await loadProjectsForOpportunity(opportunity.id);
    setCurrentView('edital-detail');
  };

  /**
   * Handle creating a new project for the selected edital
   */
  const handleCreateProjectForEdital = async () => {
    if (!selectedOpportunity) return;

    const projectName = prompt('Nome do projeto:');
    if (!projectName) return;

    try {
      const newProject = await createProject({
        opportunity_id: selectedOpportunity.id,
        project_name: projectName
      });

      await loadProjectsForOpportunity(selectedOpportunity.id);
      handleSelectProjectFromEdital(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Erro ao criar projeto. Tente novamente.');
    }
  };

  /**
   * Handle selecting a project from edital detail view
   */
  const handleSelectProjectFromEdital = async (project: GrantProject) => {
    setSelectedProject(project);
    await loadProjectDetails(project.id);
    setCurrentView('workspace'); // Navigate to unified workspace
  };

  /**
   * Handle archive opportunity (edital)
   */
  const handleArchiveOpportunity = async (opportunityId: string) => {
    if (!confirm('Tem certeza que deseja arquivar este edital?')) return;

    try {
      await archiveOpportunity(opportunityId);
      await loadOpportunitiesData(); // Refresh list
    } catch (error) {
      console.error('Error archiving opportunity:', error);
      alert('Erro ao arquivar edital');
    }
  };

  /**
   * Handle unarchive opportunity (edital)
   */
  const handleUnarchiveOpportunity = async (opportunityId: string) => {
    try {
      await unarchiveOpportunity(opportunityId);
      await loadOpportunitiesData(); // Refresh list
    } catch (error) {
      console.error('Error unarchiving opportunity:', error);
      alert('Erro ao restaurar edital');
    }
  };

  /**
   * Handle delete archived opportunity (edital)
   */
  const handleDeleteOpportunity = async (opportunityId: string) => {
    if (!confirm(
      'ATENÇÃO: Esta ação é PERMANENTE e NÃO pode ser desfeita.\n\n' +
      'O edital, seu PDF e TODOS OS PROJETOS relacionados serão deletados permanentemente.\n\n' +
      'Tem certeza que deseja continuar?'
    )) return;

    try {
      await deleteArchivedOpportunity(opportunityId);
      await loadOpportunitiesData(); // Refresh list
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      alert(error instanceof Error ? error.message : 'Erro ao deletar edital');
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ceramic-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ceramic-text-secondary">Carregando...</p>
        </div>
      </div>
    );
  }

  // Render current view
  return (
    <>
      {/* Edital Detail View */}
      {currentView === 'edital-detail' && selectedOpportunity && (
        <EditalDetailView
          opportunity={selectedOpportunity}
          projects={projects}
          onBack={handleBack}
          onCreateProject={handleCreateProjectForEdital}
          onSelectProject={handleSelectProjectFromEdital}
          onArchiveProject={handleArchiveProject}
          onUnarchiveProject={handleUnarchiveProject}
          onDeleteProject={handleDeleteProject}
          onUpdateFormFields={handleUpdateFormFields}
          onUpdateOpportunity={setSelectedOpportunity}
        />
      )}

      {/* Briefing View */}
      {currentView === 'briefing' && selectedProject && currentOpportunity && (
        <ProjectBriefingView
          projectId={selectedProject.id}
          projectName={selectedProject.project_name}
          opportunityTitle={currentOpportunity.title}
          formFields={currentOpportunity.form_fields}
          editalTextContent={currentOpportunity.edital_text_content}
          initialBriefing={currentBriefing}
          onSave={handleSaveBriefing}
          onContinue={handleContinueToGeneration}
          onBack={handleBack}
          sourceDocumentPath={selectedProject.source_document_path}
          sourceDocumentType={selectedProject.source_document_type}
          sourceDocumentContent={selectedProject.source_document_content}
          isTransferring={isTransferring}
          transferProgress={transferProgress}
        />
      )}

      {/* Generation View */}
      {currentView === 'generation' && selectedProject && currentOpportunity && (
        <ProposalGeneratorView
          projectId={selectedProject.id}
          opportunityTitle={currentOpportunity.title}
          formFields={currentOpportunity.form_fields}
          briefing={currentBriefing}
          initialResponses={currentResponses}
          onGenerateField={handleGenerateField}
          onSaveResponse={handleSaveResponse}
          onProposalComplete={handleProposalComplete}
          externalSystemUrl={currentOpportunity.external_system_url}
          onBack={handleBack}
          onBackToEdital={handleBackToEdital}
          editalPdfContent={currentOpportunity.edital_text_content}
          projectDocumentsContent={selectedProject.source_document_content}
        />
      )}

      {/* Unified Workspace View (New Non-Linear Navigation) */}
      {currentView === 'workspace' && selectedProject && currentOpportunity && (
        <EditalProjectWorkspace
          project={selectedProject}
          opportunity={currentOpportunity}
          onBack={handleBack}
          onGenerateField={handleGenerateField}
          onSaveResponse={handleSaveResponse}
          onProposalComplete={handleProposalComplete}
        />
      )}

      {/* Dashboard View - List of Editais */}
      {currentView === 'dashboard' && (
        <div className="min-h-screen bg-ceramic-base p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="ceramic-concave p-3 rounded-full hover:scale-105 transition-transform"
                >
                  <ArrowLeft className="w-5 h-5 text-ceramic-text-primary" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-ceramic-text-primary">
                    Módulo Captação
                  </h1>
                  <p className="text-sm text-ceramic-text-secondary">
                    Assistente de escrita para editais de fomento
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent hover:scale-105 transition-transform"
              >
                + Novo Edital
              </button>
              <button
                onClick={() => setIsApprovedProjectModalOpen(true)}
                className="ceramic-card px-6 py-3 rounded-full font-bold text-green-600 hover:scale-105 transition-transform"
              >
                + Projeto Aprovado
              </button>
            </div>

            {/* Active Opportunities List */}
            {opportunities.filter(o => !o.archived_at).length > 0 ? (
              <div className="grid gap-4 mb-8">
                {opportunities
                  .filter(o => !o.archived_at)
                  .map((opportunity) => {
                    const deadline = new Date(opportunity.submission_deadline);
                    const today = new Date();
                    const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = daysRemaining < 0;

                    return (
                      <div
                        key={opportunity.id}
                        className="ceramic-card p-6"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleSelectOpportunity(opportunity)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-ceramic-text-primary">
                                {opportunity.title}
                              </h3>
                              {isExpired && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                                  Expirado
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-ceramic-text-secondary mb-1">
                              {opportunity.funding_agency}
                              {opportunity.program_name && ` • ${opportunity.program_name}`}
                            </p>
                            {opportunity.edital_number && (
                              <p className="text-xs text-ceramic-text-tertiary">
                                Edital {opportunity.edital_number}
                              </p>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveOpportunity(opportunity.id);
                              }}
                              className="ceramic-concave p-2 hover:scale-110 transition-transform"
                              title="Arquivar"
                            >
                              <Archive className="w-4 h-4 text-ceramic-text-secondary" />
                            </button>
                          </div>
                        </div>

                        {/* Deadline, funding and projects info */}
                        <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-ceramic-text-secondary">Prazo:</span>
                            <span className={`font-bold ${isExpired ? 'text-red-600' : daysRemaining <= 7 ? 'text-orange-600' : 'text-ceramic-text-primary'}`}>
                              {deadline.toLocaleDateString('pt-BR')}
                              {!isExpired && ` (${daysRemaining}d)`}
                            </span>
                          </div>
                          {opportunity.max_funding && (
                            <div className="flex items-center gap-2">
                              <span className="text-ceramic-text-secondary">Até:</span>
                              <span className="font-bold text-green-600">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 0
                                }).format(opportunity.max_funding)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-ceramic-text-secondary">Projetos:</span>
                            <span className="font-bold text-blue-600">
                              {opportunity.projectCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="ceramic-card p-12 text-center mb-8">
                <p className="text-ceramic-text-secondary mb-6">
                  Nenhum edital cadastrado ainda
                </p>
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent"
                >
                  Cadastrar Primeiro Edital
                </button>
              </div>
            )}

            {/* Archived Opportunities Section */}
            {opportunities.filter(o => !!o.archived_at).length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold text-ceramic-text-primary mb-4">
                  Editais Arquivados
                </h2>
                <div className="grid gap-4">
                  {opportunities
                    .filter(o => !!o.archived_at)
                    .map((opportunity) => (
                      <div
                        key={opportunity.id}
                        className="ceramic-card p-6 opacity-60"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-ceramic-text-primary">
                                {opportunity.title}
                              </h3>
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                                Arquivado
                              </span>
                            </div>
                            <p className="text-sm text-ceramic-text-secondary mb-1">
                              {opportunity.funding_agency}
                              {opportunity.program_name && ` • ${opportunity.program_name}`}
                            </p>
                          </div>

                          {/* Action buttons for archived */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnarchiveOpportunity(opportunity.id);
                              }}
                              className="ceramic-concave px-4 py-2 text-sm font-bold text-blue-600 hover:scale-105 transition-transform flex items-center gap-2"
                              title="Restaurar"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                              Restaurar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOpportunity(opportunity.id);
                              }}
                              className="ceramic-concave p-2 hover:scale-110 transition-transform"
                              title="Deletar Permanentemente"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-ceramic-text-secondary">Projetos:</span>
                          <span className="font-bold text-ceramic-text-tertiary">
                            {opportunity.projectCount || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Setup Wizard */}
      <EditalSetupWizard
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSave={handleCreateOpportunity}
      />

      {/* Approved Project Modal */}
      <ApprovedProjectModal
        isOpen={isApprovedProjectModalOpen}
        onClose={() => setIsApprovedProjectModalOpen(false)}
        onSuccess={() => {
          setIsApprovedProjectModalOpen(false);
          loadOpportunitiesData();
        }}
      />
    </>
  );
};
