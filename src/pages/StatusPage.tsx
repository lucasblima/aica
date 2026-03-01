import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Tag,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { CeramicLoadingState, CeramicErrorState } from '@/components/ui';

// ==================== TYPES ====================

type OverallStatus = 'operational' | 'degraded' | 'outage';
type Severity = 'outage' | 'degraded' | 'maintenance';
type ChangeType = 'feat' | 'fix' | 'improvement' | 'security' | 'infra' | 'docs' | 'perf';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  started_at: string;
  resolved_at: string | null;
  duration_minutes: number | null;
  affected_module: string | null;
  created_at: string;
  updated_at: string;
}

interface ChangelogEntry {
  id: string;
  date: string;
  change_type: ChangeType;
  description: string;
  source: string;
  commit_sha: string | null;
  pr_number: number | null;
  created_at: string;
}

type RoadmapStatus = 'planned' | 'in_progress' | 'done';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  module: string | null;
  status: RoadmapStatus;
  quarter: string | null;
  priority: number;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

// ==================== STATUS CONFIG ====================

const STATUS_CONFIG: Record<
  OverallStatus,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  operational: {
    label: 'Todos os sistemas operacionais',
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success/10',
    borderColor: 'border-ceramic-success',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'Degradacao parcial do servico',
    color: 'text-ceramic-warning',
    bgColor: 'bg-ceramic-warning/10',
    borderColor: 'border-ceramic-warning',
    icon: AlertTriangle,
  },
  outage: {
    label: 'Interrupcao do servico',
    color: 'text-ceramic-error',
    bgColor: 'bg-ceramic-error/10',
    borderColor: 'border-ceramic-error',
    icon: XCircle,
  },
};

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; dotColor: string; textColor: string }
> = {
  outage: {
    label: 'Queda',
    dotColor: 'bg-ceramic-error',
    textColor: 'text-ceramic-error',
  },
  degraded: {
    label: 'Degradacao',
    dotColor: 'bg-ceramic-warning',
    textColor: 'text-ceramic-warning',
  },
  maintenance: {
    label: 'Manutencao',
    dotColor: 'bg-ceramic-success',
    textColor: 'text-ceramic-success',
  },
};

const CHANGE_TYPE_CONFIG: Record<
  ChangeType,
  { label: string; bgColor: string; textColor: string }
> = {
  feat: { label: 'Novidade', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  fix: { label: 'Correcao', bgColor: 'bg-ceramic-error/10', textColor: 'text-ceramic-error' },
  improvement: { label: 'Melhoria', bgColor: 'bg-ceramic-info/10', textColor: 'text-ceramic-info' },
  security: { label: 'Seguranca', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
  infra: { label: 'Infra', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  docs: { label: 'Documentacao', bgColor: 'bg-ceramic-cool', textColor: 'text-ceramic-text-secondary' },
  perf: { label: 'Performance', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
};

const ROADMAP_STATUS_CONFIG: Record<
  RoadmapStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  in_progress: {
    label: 'Em Desenvolvimento',
    icon: Clock,
    color: 'text-ceramic-info',
    bgColor: 'bg-ceramic-info/10',
  },
  planned: {
    label: 'Planejado',
    icon: Tag,
    color: 'text-ceramic-warning',
    bgColor: 'bg-amber-50',
  },
  done: {
    label: 'Concluido',
    icon: CheckCircle2,
    color: 'text-ceramic-success',
    bgColor: 'bg-ceramic-success/10',
  },
};

const MODULE_COLORS: Record<string, string> = {
  'Atlas': 'bg-blue-100 text-blue-700',
  'Journey': 'bg-purple-100 text-purple-700',
  'Studio': 'bg-rose-100 text-rose-700',
  'Grants': 'bg-emerald-100 text-emerald-700',
  'Connections': 'bg-cyan-100 text-cyan-700',
  'Finance': 'bg-amber-100 text-amber-700',
  'Flux': 'bg-orange-100 text-orange-700',
  'Chat': 'bg-indigo-100 text-indigo-700',
  'Gamificacao': 'bg-yellow-100 text-yellow-700',
  'Plataforma': 'bg-ceramic-cool text-ceramic-text-secondary',
  'Integracoes': 'bg-teal-100 text-teal-700',
};

// ==================== HELPERS ====================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

// ==================== 24H TIMELINE ====================

const SLOT_COUNT = 48;
const SLOT_DURATION_MS = 30 * 60 * 1000;

type SlotStatus = 'operational' | 'degraded' | 'outage';

interface TimelineSlot {
  start: Date;
  end: Date;
  status: SlotStatus;
  incident: Incident | null;
}

interface MidnightMarker {
  position: number;
  label: string;
}

function computeTimelineSlots(incidents: Incident[], now: Date): TimelineSlot[] {
  const slots: TimelineSlot[] = [];

  for (let i = SLOT_COUNT - 1; i >= 0; i--) {
    const slotEnd = new Date(now.getTime() - i * SLOT_DURATION_MS);
    const slotStart = new Date(slotEnd.getTime() - SLOT_DURATION_MS);

    let worstStatus: SlotStatus = 'operational';
    let worstIncident: Incident | null = null;

    for (const incident of incidents) {
      const incStart = new Date(incident.started_at);
      const incEnd = incident.resolved_at ? new Date(incident.resolved_at) : now;

      if (incStart < slotEnd && incEnd > slotStart) {
        const severity = incident.severity === 'outage' ? 'outage' : 'degraded';
        if (severity === 'outage' || (severity === 'degraded' && worstStatus === 'operational')) {
          worstStatus = severity;
          worstIncident = incident;
        }
      }
    }

    slots.push({ start: slotStart, end: slotEnd, status: worstStatus, incident: worstIncident });
  }

  return slots;
}

function computeMidnightMarkers(now: Date): MidnightMarker[] {
  const timelineStart = now.getTime() - SLOT_COUNT * SLOT_DURATION_MS;
  const timelineEnd = now.getTime();
  const totalDuration = timelineEnd - timelineStart;
  const markers: MidnightMarker[] = [];

  const startDate = new Date(timelineStart);
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() <= timelineStart) d.setDate(d.getDate() + 1);

  while (d.getTime() < timelineEnd) {
    const position = ((d.getTime() - timelineStart) / totalDuration) * 100;
    const dayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    markers.push({ position, label: dayLabel });
    d.setDate(d.getDate() + 1);
  }

  return markers;
}

function formatSlotTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const SLOT_COLORS: Record<SlotStatus, string> = {
  operational: 'bg-ceramic-success',
  degraded: 'bg-ceramic-warning',
  outage: 'bg-ceramic-error',
};

const SLOT_LABELS: Record<SlotStatus, string> = {
  operational: 'Operacional',
  degraded: 'Degradado',
  outage: 'Interrompido',
};

function TimelineRow({
  label,
  slots,
  midnightMarkers,
  isLast,
}: {
  label: string;
  slots: TimelineSlot[];
  midnightMarkers: MidnightMarker[];
  isLast: boolean;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<'above' | 'below'>('above');

  const handleMouseEnter = (index: number, e: React.MouseEvent) => {
    setActiveSlot(index);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos(rect.top < 120 ? 'below' : 'above');
  };

  const activeData = activeSlot !== null ? slots[activeSlot] : null;

  return (
    <div className={`flex items-center gap-0 ${!isLast ? 'mb-2' : ''}`}>
      <span className="text-[11px] text-ceramic-text-secondary shrink-0 w-28 text-right mr-3 truncate" title={label}>
        {label}
      </span>

      <div className="relative flex-1 flex gap-[1.5px]">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`relative h-7 flex-1 rounded-[2px] ${SLOT_COLORS[slot.status]} transition-opacity cursor-pointer ${
              activeSlot !== null && activeSlot !== i ? 'opacity-40' : 'opacity-100'
            }`}
            onMouseEnter={(e) => handleMouseEnter(i, e)}
            onMouseLeave={() => setActiveSlot(null)}
            role="img"
            aria-label={`${formatSlotTime(slot.start)} – ${formatSlotTime(slot.end)}: ${SLOT_LABELS[slot.status]}`}
          />
        ))}

        {midnightMarkers.map((marker, i) => (
          <div
            key={`midnight-${i}`}
            className="absolute top-0 bottom-0 w-px bg-ceramic-text-secondary/30 pointer-events-none z-10"
            style={{ left: `${marker.position}%` }}
          />
        ))}

        {activeData && activeSlot !== null && (
          <div
            className={`absolute z-50 pointer-events-none ${
              tooltipPos === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
            style={{
              left: `${((activeSlot + 0.5) / SLOT_COUNT) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-ceramic-text-primary text-ceramic-base text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              <p className="font-semibold">
                {formatSlotTime(activeData.start)} – {formatSlotTime(activeData.end)}
              </p>
              <p className={`mt-0.5 ${
                activeData.status === 'operational' ? 'text-green-300' :
                activeData.status === 'degraded' ? 'text-yellow-300' : 'text-red-300'
              }`}>
                {SLOT_LABELS[activeData.status]}
              </p>
              {activeData.incident && (
                <p className="mt-0.5 text-ceramic-border max-w-[220px] truncate">
                  {activeData.incident.title}
                </p>
              )}
            </div>
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent ${
                tooltipPos === 'above'
                  ? 'top-full border-t-[5px] border-t-ceramic-text-primary'
                  : 'bottom-full border-b-[5px] border-b-ceramic-text-primary'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusTimeline24h({ incidents }: { incidents: Incident[] }) {
  const now = useMemo(() => new Date(), []);
  const midnightMarkers = useMemo(() => computeMidnightMarkers(now), [now]);

  const generalSlots = useMemo(() => computeTimelineSlots(incidents, now), [incidents, now]);

  const moduleRows = useMemo(() => {
    const moduleMap = new Map<string, Incident[]>();
    for (const inc of incidents) {
      if (inc.affected_module) {
        const existing = moduleMap.get(inc.affected_module) || [];
        existing.push(inc);
        moduleMap.set(inc.affected_module, existing);
      }
    }
    return Array.from(moduleMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([moduleName, moduleIncidents]) => ({
        label: moduleName,
        slots: computeTimelineSlots(moduleIncidents, now),
      }));
  }, [incidents, now]);

  return (
    <div className="mt-6">
      {/* Time axis labels */}
      <div className="flex items-center gap-0 mb-1">
        <span className="shrink-0 w-28 mr-3" />
        <div className="relative flex-1 h-4">
          <span className="absolute left-0 text-[10px] text-ceramic-text-secondary font-medium">
            24h
          </span>
          {midnightMarkers.map((marker, i) => (
            <span
              key={`day-label-${i}`}
              className="absolute text-[10px] text-ceramic-text-secondary font-medium -translate-x-1/2"
              style={{ left: `${marker.position}%` }}
            >
              {marker.label}
            </span>
          ))}
          <span className="absolute right-0 text-[10px] text-ceramic-text-secondary font-medium">
            agora
          </span>
        </div>
      </div>

      {/* General row */}
      <TimelineRow
        label="Plataforma AICA"
        slots={generalSlots}
        midnightMarkers={midnightMarkers}
        isLast={moduleRows.length === 0}
      />

      {/* Module-specific rows */}
      {moduleRows.map((row, i) => (
        <TimelineRow
          key={row.label}
          label={row.label}
          slots={row.slots}
          midnightMarkers={midnightMarkers}
          isLast={i === moduleRows.length - 1}
        />
      ))}

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 ml-[124px]">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-ceramic-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm bg-ceramic-success" />
          Operacional
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-ceramic-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm bg-ceramic-warning" />
          Degradado
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-ceramic-text-secondary">
          <span className="w-2.5 h-2.5 rounded-sm bg-ceramic-error" />
          Interrompido
        </span>
      </div>
    </div>
  );
}

// ==================== GROUPED CHANGELOG ====================

function groupChangelogByDate(entries: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const groups = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.date) || [];
    existing.push(entry);
    groups.set(entry.date, existing);
  }
  return groups;
}

function groupRoadmapByStatus(items: RoadmapItem[]): Map<RoadmapStatus, RoadmapItem[]> {
  const groups = new Map<RoadmapStatus, RoadmapItem[]>();
  const order: RoadmapStatus[] = ['in_progress', 'planned', 'done'];
  for (const status of order) {
    groups.set(status, []);
  }
  for (const item of items) {
    const existing = groups.get(item.status) || [];
    existing.push(item);
    groups.set(item.status, existing);
  }
  return groups;
}

// ==================== COMPONENT ====================

export function StatusPage() {
  const navigate = useNavigate();

  const [overallStatus, setOverallStatus] = useState<OverallStatus>('operational');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statusRes, incidentsRes, changelogRes, roadmapRes] = await Promise.all([
        supabase.rpc('get_overall_service_status'),
        supabase.rpc('get_public_incidents'),
        supabase.rpc('get_public_changelog', { p_limit: 30 }),
        supabase.rpc('get_roadmap_items'),
      ]);

      if (statusRes.error) throw statusRes.error;
      if (incidentsRes.error) throw incidentsRes.error;
      if (changelogRes.error) throw changelogRes.error;
      if (roadmapRes.error) throw roadmapRes.error;

      setOverallStatus((statusRes.data as OverallStatus) || 'operational');
      setIncidents((incidentsRes.data as Incident[]) || []);
      setChangelog((changelogRes.data as ChangelogEntry[]) || []);
      setRoadmap((roadmapRes.data as RoadmapItem[]) || []);
    } catch (err) {
      console.error('[StatusPage] Failed to fetch status data:', err);
      setError('Status indisponivel no momento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changelogGroups = useMemo(() => groupChangelogByDate(changelog), [changelog]);
  const roadmapGroups = useMemo(() => groupRoadmapByStatus(roadmap), [roadmap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ceramic-base">
        <header className="sticky top-0 z-40 bg-ceramic-base border-b border-ceramic-border">
          <div className="max-w-[900px] mx-auto px-6 md:px-8 h-16 flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-info rounded-lg p-2"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Voltar</span>
            </button>
          </div>
        </header>
        <main className="max-w-[900px] mx-auto px-6 md:px-8 py-12">
          <CeramicLoadingState variant="page" message="Verificando status dos servicos..." />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ceramic-base">
        <header className="sticky top-0 z-40 bg-ceramic-base border-b border-ceramic-border">
          <div className="max-w-[900px] mx-auto px-6 md:px-8 h-16 flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-info rounded-lg p-2"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Voltar</span>
            </button>
          </div>
        </header>
        <main className="max-w-[900px] mx-auto px-6 md:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-ceramic-text-primary mb-8">
            Status do Servico
          </h1>
          <CeramicErrorState
            title="Status indisponivel"
            message={error}
            onRetry={fetchData}
          />
        </main>
      </div>
    );
  }

  const status = STATUS_CONFIG[overallStatus];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ceramic-base border-b border-ceramic-border">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 h-16 flex items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ceramic-info rounded-lg p-2"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[900px] mx-auto px-6 md:px-8 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-ceramic-text-primary mb-4">
          Status do Servico
        </h1>
        <p className="text-sm text-ceramic-text-secondary mb-8">
          Ultima atualizacao: {formatDate(new Date().toISOString().split('T')[0])}
        </p>

        {/* Status Banner + 24h Timeline */}
        <div className={`${status.bgColor} ${status.borderColor} border rounded-xl p-6 mb-12`}>
          <div className="flex items-center gap-4">
            <StatusIcon size={32} className={status.color} />
            <div>
              <p className={`text-lg font-semibold ${status.color}`}>
                {status.label}
              </p>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                Monitoramento continuo de todos os modulos da plataforma AICA.
              </p>
            </div>
          </div>
          <StatusTimeline24h incidents={incidents} />
        </div>

        {/* Incidents — only if there are active incidents */}
        {incidents.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">
              Incidentes Recentes
            </h2>
            <div className="space-y-4">
              {incidents.map((incident) => {
                const severityCfg = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.degraded;
                return (
                  <div
                    key={incident.id}
                    className="bg-ceramic-cool border border-ceramic-border rounded-xl p-6"
                  >
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className={`w-2 h-2 rounded-full ${severityCfg.dotColor}`} />
                        <span className={severityCfg.textColor}>{severityCfg.label}</span>
                      </span>
                      <span className="text-xs text-ceramic-text-secondary">
                        {formatDate(incident.started_at.split('T')[0])}
                      </span>
                      {incident.affected_module && (
                        <span className="text-xs text-ceramic-text-secondary bg-ceramic-cool border border-ceramic-border rounded-full px-2 py-0.5">
                          {incident.affected_module}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-ceramic-text-primary mb-2">
                      {incident.title}
                    </h3>
                    <p className="text-sm text-ceramic-text-secondary leading-relaxed mb-3">
                      {incident.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-ceramic-text-secondary">
                      {incident.duration_minutes && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} />
                          {formatDuration(incident.duration_minutes)}
                        </span>
                      )}
                      {incident.resolved_at ? (
                        <span className="inline-flex items-center gap-1 text-ceramic-success">
                          <CheckCircle2 size={14} />
                          Resolvido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ceramic-warning">
                          <AlertTriangle size={14} />
                          Em andamento
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Roadmap */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-ceramic-text-primary mb-2">
            Roadmap de Desenvolvimento
          </h2>
          <p className="text-sm text-ceramic-text-secondary mb-6">
            O que estamos construindo e o que vem por ai.
          </p>

          {roadmap.length === 0 ? (
            <p className="text-sm text-ceramic-text-secondary">
              Nenhum item no roadmap ainda.
            </p>
          ) : (
            <div className="space-y-8">
              {Array.from(roadmapGroups.entries()).map(([status, items]) => {
                if (items.length === 0) return null;
                const cfg = ROADMAP_STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;

                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-4">
                      <StatusIcon size={18} className={cfg.color} />
                      <h3 className={`text-base font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </h3>
                      <span className="text-xs text-ceramic-text-secondary bg-ceramic-cool rounded-full px-2 py-0.5">
                        {items.length}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item) => {
                        const moduleColor = item.module
                          ? MODULE_COLORS[item.module] || 'bg-ceramic-cool text-ceramic-text-secondary'
                          : null;

                        return (
                          <div
                            key={item.id}
                            className={`${cfg.bgColor} border border-ceramic-border rounded-xl p-5 transition-shadow hover:shadow-md`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="text-sm font-semibold text-ceramic-text-primary leading-snug">
                                {item.title}
                              </h4>
                              {item.quarter && (
                                <span className="text-[10px] font-medium text-ceramic-text-secondary bg-ceramic-cool border border-ceramic-border rounded-full px-2 py-0.5 shrink-0">
                                  {item.quarter}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ceramic-text-secondary leading-relaxed mb-3">
                              {item.description}
                            </p>
                            {moduleColor && (
                              <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${moduleColor}`}>
                                {item.module}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Changelog — grouped by date */}
        <section>
          <h2 className="text-2xl font-bold text-ceramic-text-primary mb-6">
            Registro de Alteracoes
          </h2>
          {changelog.length === 0 ? (
            <p className="text-sm text-ceramic-text-secondary">
              Nenhuma alteracao registrada ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {Array.from(changelogGroups.entries()).map(([date, entries]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-semibold text-ceramic-text-primary">
                      {formatDateShort(date)}
                    </span>
                    <div className="flex-1 h-px bg-ceramic-border" />
                  </div>
                  <div className="space-y-2 pl-2">
                    {entries.map((entry) => {
                      const typeCfg = CHANGE_TYPE_CONFIG[entry.change_type] || CHANGE_TYPE_CONFIG.fix;
                      return (
                        <div key={entry.id} className="flex items-start gap-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeCfg.bgColor} ${typeCfg.textColor} shrink-0 mt-0.5`}
                          >
                            <Tag size={12} />
                            {typeCfg.label}
                          </span>
                          <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                            {entry.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-ceramic-cool border-t border-ceramic-border py-8 mt-16">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <p className="text-sm text-ceramic-text-secondary">
            &copy; {new Date().getFullYear()} AICA Life OS - Comtxae Educacao
            Cultura e Tecnologia Ltda. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default StatusPage;
