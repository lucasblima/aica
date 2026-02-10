/**
 * AlertsView - Alerts management center
 *
 * Filterable list of all alerts by type and severity.
 * Allows acknowledgement and resolution tracking.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwimFlux } from '../context/SwimFluxContext';
import { MOCK_ALERTS, getMockAthleteById } from '../mockData';
import type { AlertType, AlertSeverity } from '../types';
import { AlertBadge } from '../components/AlertBadge';
import { ArrowLeft, Filter, CheckCircle } from 'lucide-react';

export default function AlertsView() {
  const navigate = useNavigate();
  const { state, actions } = useSwimFlux();

  // Local filter state
  const [selectedType, setSelectedType] = useState<AlertType | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  // Filter alerts
  const filteredAlerts = MOCK_ALERTS.filter((alert) => {
    if (selectedType !== 'all' && alert.alert_type !== selectedType) return false;
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (!showAcknowledged && alert.acknowledged_at) return false;
    return true;
  });

  // Group by severity
  const criticalAlerts = filteredAlerts.filter((a) => a.severity === 'critical');
  const highAlerts = filteredAlerts.filter((a) => a.severity === 'high');
  const mediumAlerts = filteredAlerts.filter((a) => a.severity === 'medium');
  const lowAlerts = filteredAlerts.filter((a) => a.severity === 'low');

  // Handle alert click
  const handleAlertClick = (alert: typeof MOCK_ALERTS[0]) => {
    const athlete = getMockAthleteById(alert.athlete_id);
    if (athlete) {
      actions.viewAthleteDetail(athlete.id);
      navigate(`/swimflux/athlete/${athlete.id}`);
    }
  };

  // Handle back
  const handleBack = () => {
    actions.viewDashboard();
    navigate('/swimflux');
  };

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

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 ceramic-card flex items-center justify-center">
            <span className="text-3xl">🚨</span>
          </div>
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5">
              SwimFlux
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Alertas
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="ceramic-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ceramic-text-secondary" />
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Filtros
            </p>
          </div>

          {/* Type Filter */}
          <div>
            <p className="text-xs text-ceramic-text-secondary mb-2 font-medium">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {(['all', 'health', 'motivation', 'absence', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                    ${selectedType === type
                      ? 'bg-ceramic-info text-white'
                      : 'ceramic-card text-ceramic-text-secondary hover:scale-105'
                    }
                  `}
                >
                  {type === 'all' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Severity Filter */}
          <div>
            <p className="text-xs text-ceramic-text-secondary mb-2 font-medium">Severidade</p>
            <div className="flex flex-wrap gap-2">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                    ${selectedSeverity === severity
                      ? 'bg-ceramic-info text-white'
                      : 'ceramic-card text-ceramic-text-secondary hover:scale-105'
                    }
                  `}
                >
                  {severity === 'all' ? 'Todos' : severity}
                </button>
              ))}
            </div>
          </div>

          {/* Show Acknowledged Toggle */}
          <div className="flex items-center gap-3 pt-3 border-t border-ceramic-text-secondary/10">
            <button
              onClick={() => setShowAcknowledged(!showAcknowledged)}
              className={`
                w-5 h-5 ceramic-inset rounded flex items-center justify-center transition-all
                ${showAcknowledged ? 'bg-ceramic-info' : ''}
              `}
            >
              {showAcknowledged && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </button>
            <p className="text-xs font-medium text-ceramic-text-secondary">
              Mostrar alertas reconhecidos
            </p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="px-6 space-y-6">
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-ceramic-error" />
              <h2 className="text-sm font-bold text-ceramic-error uppercase tracking-wider">
                Críticos ({criticalAlerts.length})
              </h2>
            </div>
            <div className="space-y-3">
              {criticalAlerts.map((alert) => (
                <AlertBadge
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleAlertClick(alert)}
                />
              ))}
            </div>
          </div>
        )}

        {/* High Alerts */}
        {highAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-ceramic-warning" />
              <h2 className="text-sm font-bold text-ceramic-warning uppercase tracking-wider">
                Alta ({highAlerts.length})
              </h2>
            </div>
            <div className="space-y-3">
              {highAlerts.map((alert) => (
                <AlertBadge
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleAlertClick(alert)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Medium Alerts */}
        {mediumAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-ceramic-warning" />
              <h2 className="text-sm font-bold text-ceramic-warning uppercase tracking-wider">
                Média ({mediumAlerts.length})
              </h2>
            </div>
            <div className="space-y-3">
              {mediumAlerts.map((alert) => (
                <AlertBadge
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleAlertClick(alert)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Low Alerts */}
        {lowAlerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-ceramic-info" />
              <h2 className="text-sm font-bold text-ceramic-info uppercase tracking-wider">
                Baixa ({lowAlerts.length})
              </h2>
            </div>
            <div className="space-y-3">
              {lowAlerts.map((alert) => (
                <AlertBadge
                  key={alert.id}
                  alert={alert}
                  onClick={() => handleAlertClick(alert)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAlerts.length === 0 && (
          <div className="ceramic-inset p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto ceramic-card flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-ceramic-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-ceramic-text-primary mb-2">
                Nenhum alerta encontrado
              </p>
              <p className="text-sm text-ceramic-text-secondary font-light">
                Todos os atletas estão bem! 🎉
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
