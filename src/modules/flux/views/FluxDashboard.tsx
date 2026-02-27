/**
 * FluxDashboard - Main coach dashboard view (navigation hub)
 *
 * Clean overview page with navigation cards to Atletas (CRM), Biblioteca,
 * Meus Treinos, and Assessoria Esportiva. Athlete management is accessed
 * through /flux/crm. Assessoria links to Connections Ventures.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { useAthleteActivity } from '../hooks/useAthleteActivity';
import { useWorkoutTemplates } from '../hooks/useWorkoutTemplates';
import { useAssessoriaEsportiva } from '../hooks/useAssessoriaEsportiva';
import { CreateAssessoriaModal } from '../components/CreateAssessoriaModal';
import { AdminDashboardSection } from '../components/coach/AdminDashboardSection';
import { ArrowLeft, Users, BookOpen, Dumbbell, Briefcase, CheckCircle, X } from 'lucide-react';
import { ErrorBoundary, ModuleErrorFallback } from '@/components/ui/ErrorBoundary';

export default function FluxDashboard() {
  const navigate = useNavigate();

  // Fetch athletes for stats
  const { athletes: allAthletes, isLoading, error } = useAthletes();

  // Realtime activity notifications
  const { notifications, dismissNotification } = useAthleteActivity();

  // Workout templates count
  const { templates } = useWorkoutTemplates();

  // Assessoria Esportiva
  const {
    assessoria,
    hasAssessoria,
    isLoading: assessoriaLoading,
    create: createAssessoria,
  } = useAssessoriaEsportiva();
  const [showCreateAssessoria, setShowCreateAssessoria] = useState(false);
  const [isCreatingAssessoria, setIsCreatingAssessoria] = useState(false);

  // Aggregate stats (for card badges only)
  const activeAthletes = allAthletes.filter((a) => a.status === 'active').length;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-ceramic-accent/20 border-t-ceramic-accent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-bold text-ceramic-text-primary">Carregando Flux...</p>
          <p className="text-sm text-ceramic-text-secondary">Conectando ao Supabase</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto ceramic-inset rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <p className="text-lg font-bold text-ceramic-error mb-2">Erro ao carregar dados</p>
            <p className="text-sm text-ceramic-text-secondary">{error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-ceramic-accent text-white rounded-lg font-medium hover:bg-ceramic-accent/90 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Flux Dashboard" />}>
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div data-tour="flux-header" className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 ceramic-card flex items-center justify-center">
            <span className="text-3xl">{hasAssessoria ? '🏢' : '🏋️'}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5">
              {hasAssessoria ? assessoria!.name : 'Gestao de Treinos'}
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Flux
            </h1>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Atletas Card */}
          <button
            onClick={() => navigate('/flux/crm')}
            className="bg-white rounded-xl p-6 shadow-sm border border-ceramic-border/30 hover:shadow-md transition-shadow cursor-pointer text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-ceramic-info/10 flex items-center justify-center group-hover:bg-ceramic-info/20 transition-colors">
                <Users className="w-6 h-6 text-ceramic-info" />
              </div>
              {activeAthletes > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ceramic-info/10 text-ceramic-info">
                  {activeAthletes}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">Atletas</h3>
            <p className="text-sm text-ceramic-text-secondary">
              Gerencie seus atletas, grupos e prescricoes
            </p>
          </button>

          {/* Biblioteca Card */}
          <button
            onClick={() => navigate('/flux/templates')}
            className="bg-white rounded-xl p-6 shadow-sm border border-ceramic-border/30 hover:shadow-md transition-shadow cursor-pointer text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              {templates.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
                  {templates.length}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">Biblioteca</h3>
            <p className="text-sm text-ceramic-text-secondary">
              Templates de treino e exercicios
            </p>
          </button>

          {/* Meus Treinos Card */}
          <button
            onClick={() => navigate('/meu-treino')}
            className="bg-white rounded-xl p-6 shadow-sm border border-ceramic-border/30 hover:shadow-md transition-shadow cursor-pointer text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-ceramic-success/10 flex items-center justify-center group-hover:bg-ceramic-success/20 transition-colors">
                <Dumbbell className="w-6 h-6 text-ceramic-success" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">Meus proprios treinos</h3>
            <p className="text-sm text-ceramic-text-secondary">
              Portal do atleta
            </p>
          </button>

          {/* Assessoria Esportiva Card — hidden after creation (managed via header + Connections) */}
          {!hasAssessoria && (
            <button
              onClick={() => setShowCreateAssessoria(true)}
              className="bg-white rounded-xl p-6 shadow-sm border border-ceramic-border/30 hover:shadow-md transition-shadow cursor-pointer text-left group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
                {!assessoriaLoading && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
                    Criar
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">
                Assessoria Esportiva
              </h3>
              <p className="text-sm text-ceramic-text-secondary">
                Configure sua assessoria esportiva
              </p>
            </button>
          )}
        </div>

        {/* #442: Stats and Novo Atleta button removed — accessed via Painel do Treinador */}
      </div>

      {/* Admin Dashboard Section */}
      <AdminDashboardSection athletes={allAthletes} />

      {/* Activity Toast Notifications */}
      {notifications.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50 space-y-2 max-w-sm">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="ceramic-card p-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-right"
            >
              <div className="ceramic-inset p-1.5 bg-ceramic-success/10">
                <CheckCircle className="w-4 h-4 text-ceramic-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ceramic-text-primary truncate">
                  {n.athleteName}
                </p>
                <p className="text-xs text-ceramic-text-secondary truncate">
                  completou {n.workoutName}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="p-1 hover:bg-ceramic-cool rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Assessoria Modal */}
      <CreateAssessoriaModal
        isOpen={showCreateAssessoria}
        onClose={() => setShowCreateAssessoria(false)}
        isSubmitting={isCreatingAssessoria}
        onSubmit={async (input) => {
          setIsCreatingAssessoria(true);
          try {
            const space = await createAssessoria(input);
            setShowCreateAssessoria(false);
            // Navigate to the new assessoria in Connections
            navigate(`/connections/${space.id}`);
          } finally {
            setIsCreatingAssessoria(false);
          }
        }}
      />

    </div>
    </ErrorBoundary>
  );
}
