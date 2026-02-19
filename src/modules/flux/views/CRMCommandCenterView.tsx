/**
 * CRMCommandCenterView - Command Center de Gestao de Atletas
 *
 * Tela 5: Central de comando com filtros avancados, acoes em massa, automacoes,
 * e visao consolidada de todos os atletas
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Send, Filter, X, MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AthleteService } from '../services/athleteService';
import { AutomationService } from '../services/automationService';
import { ConnectionStatusDot } from '../components/ConnectionStatusDot';
import type { Athlete, TrainingModality, AthleteLevel, AthleteStatus } from '../types/flux';
import type { WorkoutAutomation, CRMFilters } from '../types/flow';
import { MODALITY_CONFIG, LEVEL_LABELS, STATUS_CONFIG } from '../types/flux';

// ============================================================================
// Bulk WhatsApp Modal
// ============================================================================

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: (Athlete & { adherence_rate?: number })[];
}

function BulkWhatsAppModal({ isOpen, onClose, athletes }: BulkWhatsAppModalProps) {
  const [messageTemplate, setMessageTemplate] = useState(
    'Oi {{nome}}, tudo bem? Passando para dar uma atualizacao sobre seus treinos desta semana. Como voce esta se sentindo? Algum feedback ou dificuldade? Estou aqui pra te ajudar!'
  );

  if (!isOpen) return null;

  const athletesWithPhone = athletes.filter((a) => a.phone);
  const athletesWithoutPhone = athletes.filter((a) => !a.phone);

  const buildWhatsAppUrl = (athlete: Athlete) => {
    const phone = athlete.phone.replace(/[+\s-]/g, '');
    const firstName = athlete.name.split(' ')[0];
    const personalizedMessage = messageTemplate.replace(/\{\{nome\}\}/g, firstName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(personalizedMessage)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[85vh] bg-ceramic-base rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ceramic-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ceramic-success/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-ceramic-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ceramic-text-primary">
                Mensagem em Massa
              </h2>
              <p className="text-xs text-ceramic-text-secondary">
                {athletesWithPhone.length} atleta{athletesWithPhone.length !== 1 ? 's' : ''} com telefone
                {athletesWithoutPhone.length > 0 && (
                  <span className="text-ceramic-warning">
                    {' '}({athletesWithoutPhone.length} sem telefone)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg ceramic-inset flex items-center justify-center hover:bg-white/50 transition-colors"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Message Template */}
        <div className="p-4 border-b border-ceramic-border">
          <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
            Modelo de Mensagem
          </label>
          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="w-full h-28 p-3 bg-ceramic-base rounded-xl border border-ceramic-border text-sm text-ceramic-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-ceramic-success/50"
            placeholder="Digite o modelo da mensagem..."
          />
          <p className="mt-1 text-xs text-ceramic-text-secondary">
            Use {'{{nome}}'} para inserir o primeiro nome do atleta automaticamente.
          </p>
        </div>

        {/* Athlete List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {athletesWithPhone.map((athlete) => {
            const modalityConfig = MODALITY_CONFIG[athlete.modality];
            return (
              <div
                key={athlete.id}
                className="flex items-center justify-between p-3 ceramic-card rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{modalityConfig?.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-ceramic-text-primary">
                      {athlete.name}
                    </p>
                    <p className="text-xs text-ceramic-text-secondary">{athlete.phone}</p>
                  </div>
                </div>

                <a
                  href={buildWhatsAppUrl(athlete)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-ceramic-success hover:bg-ceramic-success/90 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir WhatsApp
                </a>
              </div>
            );
          })}

          {athletesWithoutPhone.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider mb-2">
                Sem telefone cadastrado
              </p>
              {athletesWithoutPhone.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-3 ceramic-inset rounded-lg mb-2 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{MODALITY_CONFIG[athlete.modality]?.icon}</span>
                    <p className="text-sm text-ceramic-text-secondary">{athlete.name}</p>
                  </div>
                  <span className="text-xs text-ceramic-text-secondary">Sem telefone</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ceramic-border flex items-center justify-between">
          <p className="text-xs text-ceramic-text-secondary">
            Cada link abre o WhatsApp individualmente
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main View
// ============================================================================

export default function CRMCommandCenterView() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<(Athlete & { adherence_rate?: number })[]>([]);
  const [automations, setAutomations] = useState<WorkoutAutomation[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<CRMFilters>({});
  const [loading, setLoading] = useState(true);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [athletesRes, automationsRes] = await Promise.all([
      AthleteService.getAthletesWithAdherence(),
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
    setSelectedAthletes(new Set(filteredAthletes.map((a) => a.id)));
  };

  const clearSelection = () => {
    setSelectedAthletes(new Set());
  };

  const selectedAthletesList = useMemo(
    () => athletes.filter((a) => selectedAthletes.has(a.id)),
    [athletes, selectedAthletes]
  );

  const avgConsistency = useMemo(() => {
    const active = filteredAthletes.filter((a) => a.status === 'active');
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, a) => acc + (a.adherence_rate ?? 0), 0);
    return Math.round(sum / active.length);
  }, [filteredAthletes]);

  const hasActiveFilters = filters.modality || filters.level || filters.status;

  const clearFilters = () => {
    setFilters({ search: filters.search });
  };

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
                onClick={() => setBulkModalOpen(true)}
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
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Consistencia Media</p>
            <p className="text-2xl font-bold text-ceramic-text-primary">{avgConsistency}%</p>
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Automacoes Ativas</p>
            <p className="text-2xl font-bold text-ceramic-text-primary">{automations.length}</p>
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Selecionados</p>
            <p className="text-2xl font-bold text-ceramic-accent">{selectedAthletes.size}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar atletas..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              className="flex-1 px-4 py-2 bg-white/50 rounded-lg border border-ceramic-border text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
            <button
              onClick={selectAll}
              className="px-4 py-2 ceramic-card hover:bg-white/50 rounded-lg text-sm font-medium text-ceramic-text-primary"
            >
              Selecionar Todos
            </button>
            {selectedAthletes.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-4 py-2 ceramic-card hover:bg-white/50 rounded-lg text-sm font-medium text-ceramic-text-primary"
              >
                Limpar Selecao
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-ceramic-text-secondary" />
              <span className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider">Filtros</span>
            </div>

            {/* Modality Filter */}
            <select
              value={filters.modality || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  modality: (e.target.value as TrainingModality) || undefined,
                })
              }
              className="px-3 py-1.5 bg-ceramic-base border border-ceramic-border rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            >
              <option value="">Todas Modalidades</option>
              {(Object.entries(MODALITY_CONFIG) as [TrainingModality, { label: string; icon: string }][]).map(
                ([key, config]) => (
                  <option key={key} value={key}>
                    {config.icon} {config.label}
                  </option>
                )
              )}
            </select>

            {/* Level Filter */}
            <select
              value={filters.level || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  level: (e.target.value as AthleteLevel) || undefined,
                })
              }
              className="px-3 py-1.5 bg-ceramic-base border border-ceramic-border rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            >
              <option value="">Todos Niveis</option>
              {(Object.entries(LEVEL_LABELS) as [AthleteLevel, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: (e.target.value as AthleteStatus) || undefined,
                })
              }
              className="px-3 py-1.5 bg-ceramic-base border border-ceramic-border rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            >
              <option value="">Todos Status</option>
              {(Object.entries(STATUS_CONFIG) as [AthleteStatus, { label: string }][]).map(
                ([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                )
              )}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ceramic-error hover:text-ceramic-error/80 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="text-ceramic-text-secondary">Carregando atletas...</div>
        ) : filteredAthletes.length === 0 ? (
          <div className="ceramic-inset p-8 text-center rounded-xl">
            <p className="text-ceramic-text-secondary">
              {hasActiveFilters
                ? 'Nenhum atleta encontrado com os filtros selecionados.'
                : 'Nenhum atleta cadastrado.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm font-medium text-ceramic-accent hover:text-ceramic-accent/80 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAthletes.map((athlete) => {
              const isSelected = selectedAthletes.has(athlete.id);
              const modalityConfig = MODALITY_CONFIG[athlete.modality];

              return (
                <div
                  key={athlete.id}
                  onClick={() => toggleAthlete(athlete.id)}
                  className={`ceramic-card p-4 cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-ceramic-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAthlete(athlete.id)}
                        className="w-4 h-4 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xl">{modalityConfig?.icon}</span>
                    </div>
                    <ConnectionStatusDot status={athlete.invitation_status} />
                  </div>

                  <h3 className="text-base font-bold text-ceramic-text-primary mb-1">
                    {athlete.name}
                  </h3>
                  <p className="text-xs text-ceramic-text-secondary mb-3">
                    {LEVEL_LABELS[athlete.level]} · {modalityConfig?.label}
                  </p>

                  {/* Per-athlete adherence bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wide text-ceramic-text-secondary font-medium">Adesao</span>
                      <span className={`text-xs font-bold ${
                        (athlete.adherence_rate ?? 0) >= 80 ? 'text-ceramic-success' :
                        (athlete.adherence_rate ?? 0) >= 60 ? 'text-amber-500' : 'text-ceramic-error'
                      }`}>
                        {athlete.adherence_rate ?? 0}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (athlete.adherence_rate ?? 0) >= 80 ? 'bg-ceramic-success' :
                          (athlete.adherence_rate ?? 0) >= 60 ? 'bg-amber-500' : 'bg-ceramic-error'
                        }`}
                        style={{ width: `${Math.min(athlete.adherence_rate ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/flux/athlete/${athlete.id}`);
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

      {/* Bulk WhatsApp Modal */}
      <BulkWhatsAppModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        athletes={selectedAthletesList}
      />
    </div>
  );
}
