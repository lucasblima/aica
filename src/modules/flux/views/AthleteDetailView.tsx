/**
 * AthleteDetailView - Single athlete 12-week timeline
 *
 * Displays athlete profile, progression bar, workout history, feedbacks, and alerts.
 * Contextual descent view with back button (no global nav).
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFlux } from '../context/FluxContext';
import {
  getMockAthleteWithMetricsById,
  getMockAlertsForAthlete,
  getMockFeedbacksForAthlete,
  getMockActiveBlockForAthlete,
} from '../mockData';
import { LevelBadge } from '../components/LevelBadge';
import { ProgressionBar } from '../components/ProgressionBar';
import { AlertBadge } from '../components/AlertBadge';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Activity,
  Edit,
} from 'lucide-react';

export default function AthleteDetailView() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();
  const { actions } = useFlux();

  // Fetch athlete data (mock)
  const athlete = athleteId ? getMockAthleteWithMetricsById(athleteId) : null;
  const alerts = athleteId ? getMockAlertsForAthlete(athleteId) : [];
  const feedbacks = athleteId ? getMockFeedbacksForAthlete(athleteId) : [];
  const activeBlock = athleteId ? getMockActiveBlockForAthlete(athleteId) : null;

  // Handle back
  const handleBack = () => {
    actions.viewDashboard();
    navigate('/flux');
  };

  // Handle edit canvas
  const handleEditCanvas = () => {
    if (activeBlock && athleteId) {
      actions.editCanvas(activeBlock.id, athleteId);
      navigate(`/flux/canvas/${activeBlock.id}`);
    }
  };

  // Not found
  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-4">
          Atleta nao encontrado
        </p>
        <button
          onClick={handleBack}
          className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        {/* Athlete Profile Card */}
        <div className="ceramic-card p-6 space-y-4">
          {/* Avatar + Name + Level */}
          <div className="flex items-start gap-4">
            <div className="ceramic-inset w-20 h-20 flex-shrink-0 flex items-center justify-center">
              <User className="w-10 h-10 text-ceramic-text-secondary" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-ceramic-text-primary mb-2">
                {athlete.name}
              </h1>
              <LevelBadge level={athlete.level} size="md" />
            </div>

            {/* Edit Button */}
            <button
              onClick={() => alert('Editar atleta (em desenvolvimento)')}
              className="ceramic-card p-3 hover:scale-105 transition-transform"
            >
              <Edit className="w-5 h-5 text-ceramic-text-primary" />
            </button>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-ceramic-text-secondary/10">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-ceramic-text-secondary" />
              <p className="text-xs text-ceramic-text-secondary truncate">
                {athlete.email || 'Sem email'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-ceramic-text-secondary" />
              <p className="text-xs text-ceramic-text-secondary truncate">
                {athlete.phone}
              </p>
            </div>
          </div>

          {/* Status + Trial */}
          <div className="flex items-center gap-3 pt-3 border-t border-ceramic-text-secondary/10">
            <div className="flex-1">
              <p className="text-xs text-ceramic-text-secondary mb-1">Status</p>
              <p className="text-sm font-bold text-ceramic-text-primary">
                {athlete.status === 'active' && 'Ativo'}
                {athlete.status === 'trial' && 'Trial'}
                {athlete.status === 'paused' && 'Pausado'}
                {athlete.status === 'churned' && 'Inativo'}
              </p>
            </div>
            {athlete.status === 'trial' && athlete.trial_expires_at && (
              <div className="flex-1">
                <p className="text-xs text-ceramic-text-secondary mb-1">Trial expira</p>
                <p className="text-sm font-bold text-amber-600">
                  {new Date(athlete.trial_expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progression Bar */}
      {activeBlock && (
        <div className="px-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-ceramic-text-primary">Progresso Atual</h2>
            <button
              onClick={handleEditCanvas}
              className="flex items-center gap-2 px-4 py-2 ceramic-card hover:scale-105 transition-transform"
            >
              <Edit className="w-4 h-4 text-ceramic-text-primary" />
              <span className="text-sm font-bold text-ceramic-text-primary">
                Editar Treino
              </span>
            </button>
          </div>
          <ProgressionBar
            currentWeek={athlete.current_week || 1}
            totalWeeks={12}
            adherenceRate={athlete.adherence_rate || 0}
            completedWorkouts={8}
            totalWorkouts={12}
          />
        </div>
      )}

      {/* Active Block Info */}
      {activeBlock && (
        <div className="px-6 mb-6">
          <div className="ceramic-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="ceramic-inset p-2">
                <Calendar className="w-5 h-5 text-ceramic-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
                  Bloco Atual
                </p>
                <p className="text-base font-bold text-ceramic-text-primary">
                  {activeBlock.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary pt-2 border-t border-ceramic-text-secondary/10">
              <div>
                <span className="font-medium">Inicio:</span>{' '}
                {new Date(activeBlock.start_date).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <span className="font-medium">Fim:</span>{' '}
                {new Date(activeBlock.end_date).toLocaleDateString('pt-BR')}
              </div>
            </div>
            {activeBlock.progression_notes && (
              <p className="text-sm text-ceramic-text-secondary font-light pt-2 border-t border-ceramic-text-secondary/10">
                {activeBlock.progression_notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-ceramic-text-primary mb-3">
            Alertas ({alerts.length})
          </h2>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
          {alerts.length > 3 && (
            <button
              onClick={() => navigate('/flux/alerts')}
              className="w-full mt-3 px-4 py-2 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              Ver todos os alertas
            </button>
          )}
        </div>
      )}

      {/* Feedbacks Timeline */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-ceramic-text-primary" />
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            Feedbacks Recentes ({feedbacks.length})
          </h2>
        </div>

        {feedbacks.length > 0 ? (
          <div className="space-y-3">
            {feedbacks.slice(0, 5).map((feedback) => (
              <div key={feedback.id} className="ceramic-card p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-ceramic-text-secondary" />
                    <p className="text-xs text-ceramic-text-secondary">
                      {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {feedback.completed_workout ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                      Completo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                      Parcial
                    </span>
                  )}
                </div>

                {/* Message */}
                <p className="text-sm text-ceramic-text-primary font-light">
                  {feedback.raw_message}
                </p>

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs pt-2 border-t border-ceramic-text-secondary/10">
                  <div>
                    <span className="text-ceramic-text-secondary">Volume:</span>{' '}
                    <span className="font-bold text-ceramic-text-primary">
                      {feedback.volume_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-ceramic-text-secondary">Intensidade:</span>{' '}
                    <span className="font-bold text-ceramic-text-primary">
                      {feedback.intensity_pct}%
                    </span>
                  </div>
                  {feedback.sentiment_score !== undefined && (
                    <div>
                      <span className="text-ceramic-text-secondary">Sentimento:</span>{' '}
                      <span
                        className={`font-bold ${
                          feedback.sentiment_score > 0
                            ? 'text-green-600'
                            : feedback.sentiment_score < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {feedback.sentiment_score > 0 ? '+' : ''}{feedback.sentiment_score.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ceramic-inset p-8 text-center">
            <p className="text-sm text-ceramic-text-secondary font-light">
              Nenhum feedback registrado ainda
            </p>
          </div>
        )}
      </div>

      {/* Anamnesis Section */}
      {athlete.anamnesis && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-ceramic-text-primary mb-3">Anamnese</h2>
          <div className="ceramic-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Sono</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {athlete.anamnesis.sleep_quality || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Estresse</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {athlete.anamnesis.stress_level || 'N/A'}
                </p>
              </div>
            </div>
            {athlete.anamnesis.injuries && athlete.anamnesis.injuries.length > 0 && (
              <div className="pt-3 border-t border-ceramic-text-secondary/10">
                <p className="text-xs text-ceramic-text-secondary mb-2">Lesoes Previas</p>
                <ul className="space-y-1">
                  {athlete.anamnesis.injuries.map((injury, index) => (
                    <li key={index} className="text-sm text-ceramic-text-primary">
                      - {injury}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
