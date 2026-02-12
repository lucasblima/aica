/**
 * CRMCommandCenterView - Command Center de Gestão de Atletas
 *
 * Tela 5: Central de comando com filtros avançados, ações em massa, automações,
 * e visão consolidada de todos os atletas
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Send, Zap, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AthleteProfileService } from '../services/athleteProfileService';
import { AutomationService } from '../services/automationService';
import type { AthleteProfile, WorkoutAutomation, CRMFilters } from '../types/flow';
import { MODALITY_CONFIG } from '../types/flux';

export default function CRMCommandCenterView() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [automations, setAutomations] = useState<WorkoutAutomation[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<CRMFilters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [athletesRes, automationsRes] = await Promise.all([
      AthleteProfileService.getAllProfiles(),
      AutomationService.getActiveAutomations(),
    ]);

    if (athletesRes.data) setAthletes(athletesRes.data);
    if (automationsRes.data) setAutomations(automationsRes.data);
    setLoading(false);
  };

  const filteredAthletes = athletes.filter((athlete) => {
    if (filters.modality && athlete.modality !== filters.modality) return false;
    if (filters.level && athlete.level !== filters.level) return false;
    if (filters.status && athlete.status !== filters.status) return false;
    if (
      filters.consistency_min &&
      (athlete.consistency_rate || 0) < filters.consistency_min
    )
      return false;
    if (
      filters.consistency_max &&
      (athlete.consistency_rate || 0) > filters.consistency_max
    )
      return false;
    if (
      filters.search &&
      !athlete.name.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  const toggleAthlete = (athleteId: string) => {
    const newSelected = new Set(selectedAthletes);
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId);
    } else {
      newSelected.add(athleteId);
    }
    setSelectedAthletes(newSelected);
  };

  const selectAll = () => {
    setSelectedAthletes(new Set(filteredAthletes.map((a) => a.athlete_id)));
  };

  const clearSelection = () => {
    setSelectedAthletes(new Set());
  };

  const avgConsistency =
    filteredAthletes.length > 0
      ? Math.round(
          filteredAthletes.reduce((sum, a) => sum + (a.consistency_rate || 0), 0) /
            filteredAthletes.length
        )
      : 0;

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      <div className="pt-8 px-6 pb-6 border-b border-ceramic-text-secondary/10">
        <button
          onClick={() => navigate('/flux')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-ceramic-text-primary mb-2">
              Command Center
            </h1>
            <p className="text-sm text-ceramic-text-secondary">
              {filteredAthletes.length} atleta{filteredAthletes.length !== 1 ? 's' : ''} •{' '}
              {selectedAthletes.size} selecionado{selectedAthletes.size !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedAthletes.size > 0 && (
              <button
                onClick={() => alert('Enviar mensagem em massa (em desenvolvimento)')}
                className="flex items-center gap-2 px-4 py-2 bg-ceramic-success text-white rounded-lg hover:bg-ceramic-success/90"
              >
                <Send className="w-4 h-4" />
                <span className="font-medium">Enviar Mensagem ({selectedAthletes.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Total Atletas</p>
            <p className="text-2xl font-bold text-ceramic-text-primary">{filteredAthletes.length}</p>
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Consistência Média</p>
            <p className="text-2xl font-bold text-ceramic-text-primary">{avgConsistency}%</p>
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Automações Ativas</p>
            <p className="text-2xl font-bold text-ceramic-text-primary">{automations.length}</p>
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Selecionados</p>
            <p className="text-2xl font-bold text-ceramic-accent">{selectedAthletes.size}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar atletas..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="flex-1 px-4 py-2 bg-white/50 rounded-lg border border-ceramic-text-secondary/20"
          />
          <button
            onClick={selectAll}
            className="px-4 py-2 ceramic-card hover:bg-white/50 rounded-lg text-sm font-medium"
          >
            Selecionar Todos
          </button>
          {selectedAthletes.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-4 py-2 ceramic-card hover:bg-white/50 rounded-lg text-sm font-medium"
            >
              Limpar Seleção
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="text-ceramic-text-secondary">Carregando atletas...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAthletes.map((athlete) => {
              const isSelected = selectedAthletes.has(athlete.athlete_id);
              const modalityConfig = MODALITY_CONFIG[athlete.modality as any];

              return (
                <div
                  key={athlete.athlete_id}
                  onClick={() => toggleAthlete(athlete.athlete_id)}
                  className={`ceramic-card p-4 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-ceramic-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAthlete(athlete.athlete_id)}
                        className="w-4 h-4 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xl">{modalityConfig?.icon}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ceramic-text-secondary">Consistência</p>
                      <p className="text-lg font-bold">{athlete.consistency_rate || 0}%</p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-ceramic-text-primary mb-1">
                    {athlete.name}
                  </h3>
                  <p className="text-xs text-ceramic-text-secondary mb-2">
                    {athlete.level} • {modalityConfig?.label}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/flux/athlete/${athlete.athlete_id}`);
                    }}
                    className="w-full px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg text-xs font-medium transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
