/**
 * GrantsModuleView - Container principal do Módulo Captação
 * Gerencia o fluxo completo: Dashboard → Setup → Briefing → Geração
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EditalSetupWizard } from '../components/EditalSetupWizard';
import { ProjectBriefingView } from '../components/ProjectBriefingView';
import { ProposalGeneratorView } from '../components/ProposalGeneratorView';
import {
  createOpportunity,
  createProject,
  getProject,
  listProjects,
  saveBriefing,
  getBriefing,
  saveResponse,
  listResponses,
  updateProjectStatus
} from '../services/grantService';
import { generateFieldContent } from '../services/grantAIService';
import type {
  GrantProject,
  GrantOpportunity,
  BriefingData,
  GrantResponse,
  CreateOpportunityPayload
} from '../types';

type ModuleView = 'dashboard' | 'setup' | 'briefing' | 'generation';

interface GrantsModuleViewProps {
  onBack: () => void;
}

export const GrantsModuleView: React.FC<GrantsModuleViewProps> = ({ onBack }) => {
  // View state
  const [currentView, setCurrentView] = useState<ModuleView>('dashboard');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Data state
  const [projects, setProjects] = useState<GrantProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<GrantProject | null>(null);
  const [currentOpportunity, setCurrentOpportunity] = useState<GrantOpportunity | null>(null);
  const [currentBriefing, setCurrentBriefing] = useState<BriefingData>({});
  const [currentResponses, setCurrentResponses] = useState<Record<string, GrantResponse>>({});

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load projects on mount
   */
  useEffect(() => {
    loadProjects();
  }, []);

  /**
   * Load all projects for the current user
   */
  const loadProjects = async () => {
    try {
      const data = await listProjects({});
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
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

      // Navigate to briefing
      setCurrentView('briefing');
      setIsSetupModalOpen(false);

      // Refresh projects list
      await loadProjects();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      throw error;
    }
  };

  /**
   * Handle briefing save
   */
  const handleSaveBriefing = async (briefing: BriefingData) => {
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
   */
  const handleContinueToGeneration = async () => {
    if (!selectedProject) return;

    try {
      await updateProjectStatus(selectedProject.id, 'generating');
      setCurrentView('generation');
    } catch (error) {
      console.error('Error updating project status:', error);
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
        editalText: currentOpportunity.edital_text_content || '',
        evaluationCriteria: currentOpportunity.evaluation_criteria || [],
        fieldConfig,
        briefing: currentBriefing,
        previousResponses
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
   * Handle back navigation
   */
  const handleBack = () => {
    if (currentView === 'generation') {
      setCurrentView('briefing');
    } else if (currentView === 'briefing') {
      setCurrentView('dashboard');
      setSelectedProject(null);
    } else {
      onBack();
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
      {/* Briefing View */}
      {currentView === 'briefing' && selectedProject && currentOpportunity && (
        <ProjectBriefingView
          projectId={selectedProject.id}
          opportunityTitle={currentOpportunity.title}
          initialBriefing={currentBriefing}
          onSave={handleSaveBriefing}
          onContinue={handleContinueToGeneration}
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
          externalSystemUrl={currentOpportunity.external_system_url}
        />
      )}

      {/* Dashboard View (placeholder - will be enhanced) */}
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
            </div>

            {/* Projects List */}
            {projects.length > 0 ? (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className="ceramic-card p-6 text-left hover:scale-[1.02] transition-transform"
                  >
                    <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                      {project.project_name}
                    </h3>
                    {project.opportunity && (
                      <p className="text-sm text-ceramic-text-secondary mb-4">
                        {project.opportunity.title}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-ceramic-tray rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                          style={{ width: `${project.completion_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-ceramic-text-secondary">
                        {Math.round(project.completion_percentage)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="ceramic-card p-12 text-center">
                <p className="text-ceramic-text-secondary mb-6">
                  Nenhum projeto criado ainda
                </p>
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="ceramic-card px-6 py-3 rounded-full font-bold text-ceramic-accent"
                >
                  Criar Primeiro Projeto
                </button>
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
    </>
  );
};
