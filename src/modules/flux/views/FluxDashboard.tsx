/**
 * FluxDashboard - Main coach dashboard view
 *
 * Displays athlete grid with colorimetric status, alert summary, and quick stats.
 * Entry point for the Flux module.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlux } from '../context/FluxContext';
import {
  MOCK_ATHLETES_WITH_METRICS,
  getMockAlertsForAthlete,
  getMockFeedbacksForAthlete,
  getMockUnacknowledgedAlerts,
} from '../mockData';
import { AthleteCard } from '../components/AthleteCard';
import { AlertBadge } from '../components/AlertBadge';
import { ArrowLeft, AlertCircle, Users, TrendingUp, Plus } from 'lucide-react';

export default function FluxDashboard() {
  const navigate = useNavigate();
  const { actions } = useFlux();

  // Mock data
  const athletes = MOCK_ATHLETES_WITH_METRICS;
  const unacknowledgedAlerts = getMockUnacknowledgedAlerts();
  const criticalAlerts = unacknowledgedAlerts.filter((a) => a.severity === 'critical');

  // Aggregate stats
  const activeAthletes = athletes.filter((a) => a.status === 'active').length;
  const avgAdherence =
    athletes.reduce((sum, a) => sum + (a.adherence_rate || 0), 0) / athletes.length;

  // Handle athlete click
  const handleAthleteClick = (athleteId: string) => {
    actions.viewAthleteDetail(athleteId);
    navigate(`/flux/athlete/${athleteId}`);
  };

  // Handle alert click
  const handleAlertsClick = () => {
    actions.manageAlerts({ unacknowledged_only: true });
    navigate('/flux/alerts');
  };

  return (
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

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 ceramic-card flex items-center justify-center">
            <span className="text-3xl">🏊</span>
          </div>
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5">
              Modulo
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Flux
            </h1>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Active Athletes */}
          <div className="ceramic-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-2">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
                Atletas
              </p>
            </div>
            <p className="text-2xl font-bold text-ceramic-text-primary">
              {activeAthletes}
            </p>
          </div>

          {/* Avg Adherence */}
          <div className="ceramic-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
                Adesao Media
              </p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(avgAdherence)}%
            </p>
          </div>

          {/* Critical Alerts */}
          <div
            onClick={handleAlertsClick}
            className="ceramic-card p-4 space-y-2 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-2 bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
                Alertas
              </p>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {criticalAlerts.length}
            </p>
          </div>
        </div>

        {/* Critical Alerts Preview */}
        {criticalAlerts.length > 0 && (
          <div
            onClick={handleAlertsClick}
            className="ceramic-card p-4 mb-6 bg-red-50 border border-red-200 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-bold text-red-700">
                {criticalAlerts.length} alerta(s) critico(s) requer(em) atencao
              </p>
            </div>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <AlertBadge key={alert.id} alert={alert} compact />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Athletes Grid */}
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ceramic-text-primary">Meus Atletas</h2>
          <button className="flex items-center gap-2 px-4 py-2 ceramic-card hover:scale-105 transition-transform">
            <Plus className="w-4 h-4 text-ceramic-text-primary" />
            <span className="text-sm font-bold text-ceramic-text-primary">Novo Atleta</span>
          </button>
        </div>

        <div className="grid gap-4">
          {athletes.map((athlete) => {
            const athleteAlerts = getMockAlertsForAthlete(athlete.id);
            const athleteFeedbacks = getMockFeedbacksForAthlete(athlete.id);

            return (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                recentFeedbacks={athleteFeedbacks}
                activeAlerts={athleteAlerts}
                adherenceRate={athlete.adherence_rate || 0}
                onClick={() => handleAthleteClick(athlete.id)}
              />
            );
          })}
        </div>

        {/* Empty State (if no athletes) */}
        {athletes.length === 0 && (
          <div className="ceramic-inset p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto ceramic-card flex items-center justify-center">
              <Users className="w-8 h-8 text-ceramic-text-secondary" />
            </div>
            <div>
              <p className="text-lg font-bold text-ceramic-text-primary mb-2">
                Nenhum atleta cadastrado
              </p>
              <p className="text-sm text-ceramic-text-secondary font-light">
                Comece adicionando seu primeiro atleta ao Flux
              </p>
            </div>
            <button className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform">
              Adicionar Primeiro Atleta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
