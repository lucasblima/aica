/**
 * TemplateLibraryView - Biblioteca de Templates de Treino
 *
 * Tela 1 do Flow Module: Grid filtrável de templates com drag support,
 * quick actions (edit/duplicate/delete/favorite), e criação de novos templates.
 * #538: Own templates can be edited (if usage_count === 0). Prescribed templates are locked.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Star,
  Copy,
  Trash2,
  GripVertical,
  X,
  ArrowLeft,
  User as UserIcon,
  Pencil,
  Lock,
} from 'lucide-react';
import { WorkoutTemplateService } from '../services/workoutTemplateService';
import { useWorkoutTemplates } from '../hooks';
import { useAuth } from '@/hooks/useAuth';
import TemplateFormDrawer from '../components/forms/TemplateFormDrawer';
import type {
  WorkoutTemplate,
  TemplateFilters,
  WorkoutIntensity,
  TrainingModality,
} from '../types/flow';
import type { ExerciseStructureV2 } from '../types/series';
import { MODALITY_CONFIG } from '../types/flux';

const ZONE_LABELS: Record<string, string> = {
  z1: 'Zona 1 (50-60%)',
  z2: 'Zona 2 (60-70%)',
  z3: 'Zona 3 (70-80%)',
  z4: 'Zona 4 (80-90%)',
  z5: 'Zona 5 (90-100%)',
};

const INTENSITY_LABELS: Record<string, string> = {
  low: 'Leve',
  medium: 'Moderada',
  high: 'Alta',
  z1: 'Z1',
  z2: 'Z2',
  z3: 'Z3',
  z4: 'Z4',
  z5: 'Z5',
};

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-ceramic-info/20 text-ceramic-info',
  medium: 'bg-ceramic-warning/20 text-ceramic-warning',
  high: 'bg-ceramic-error/20 text-ceramic-error',
  z1: 'bg-ceramic-info/20 text-ceramic-info',
  z2: 'bg-ceramic-success/20 text-ceramic-success',
  z3: 'bg-ceramic-warning/20 text-ceramic-warning',
  z4: 'bg-amber-500/20 text-amber-600',
  z5: 'bg-ceramic-error/20 text-ceramic-error',
};

const ZONE_PILL_COLORS: Record<string, string> = {
  Z1: 'bg-green-500',
  Z2: 'bg-yellow-400',
  Z3: 'bg-orange-400',
  Z4: 'bg-red-400',
  Z5: 'bg-red-600',
};

/** Format work value for display on library cards */
function formatWorkValue(value: number, unit: string, unitDetail?: string): string {
  if (unit === 'seconds' || unitDetail === 'seconds') {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = Math.round(value % 60);
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}min`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
  }
  if (unit === 'minutes' || unitDetail === 'minutes') {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  }
  if (unit === 'meters' || unitDetail === 'meters') {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}km`;
    return `${value}m`;
  }
  if (unit === 'time') {
    // Cycling time mode - delegate to detail
    return formatWorkValue(value, unitDetail || 'minutes');
  }
  if (unit === 'distance') {
    return formatWorkValue(value, unitDetail || 'meters');
  }
  return `${value}`;
}

/** Extract unique zones from V2 exercise_structure */
function getUniqueZones(es: any): string[] {
  if (!es?.series || !Array.isArray(es.series)) return [];
  const zones = new Set<string>();
  for (const s of es.series) {
    if (s.zone) zones.add(s.zone);
  }
  return Array.from(zones).sort();
}

export default function TemplateLibraryView() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const location = useLocation();

  // Determine mode based on URL (edit is state-driven via handleEdit, not URL-driven)
  const mode: 'create' | 'list' = location.pathname.includes('/new')
    ? 'create'
    : 'list';

  // Auth for creator attribution
  const { user } = useAuth();

  // Real-time templates subscription
  const { templates, isLoading, error, refresh } = useWorkoutTemplates();

  // Local state
  const [filteredTemplates, setFilteredTemplates] = useState<WorkoutTemplate[]>([]);
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [draggedTemplate, setDraggedTemplate] = useState<WorkoutTemplate | null>(null);
  const [isModalOpen, setModalOpen] = useState(mode !== 'list');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [favoritingIds, setFavoritingIds] = useState<Set<string>>(new Set());
  const [groupByModality, setGroupByModality] = useState(false);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [templates, filters]);

  // Sync drawer state with URL mode
  useEffect(() => {
    if (location.pathname.includes('/edit')) {
      // Legacy /edit URLs redirect to list — editing is now state-driven via card actions
      navigate('/flux/templates', { replace: true });
      return;
    }
    if (mode === 'list') {
      // Only reset if drawer isn't being opened by handleEdit (state-driven)
      if (!editingTemplate) {
        setModalOpen(false);
      }
    } else if (mode === 'create') {
      setEditingTemplate(null);
      setModalOpen(true);
    }
  }, [mode, templateId, location.pathname]);

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTemplate(null);
    navigate('/flux/templates');
  };

  const handleModalSave = (template: WorkoutTemplate) => {
    if (editingTemplate) {
      // Edit mode — update the existing template in the grid
      setFilteredTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? template : t))
      );
    } else {
      // Create mode — prepend new template to grid
      setFilteredTemplates((prev) => [template, ...prev]);
    }

    // Also refresh from DB to ensure consistency with real-time subscription
    refresh();
    // Do NOT call handleModalClose() here — the drawer shows a success message
    // for 1 second, then calls onClose (which maps to handleModalClose).
    // Calling it here causes a double-close + premature navigation.
  };

  const applyFilters = () => {
    let filtered = [...templates];

    if (filters.modality) {
      filtered = filtered.filter((t) => t.modality === filters.modality);
    }

    if (filters.category) {
      filtered = filtered.filter((t) => t.category === filters.category);
    }

    if (filters.intensity) {
      filtered = filtered.filter((t) => t.intensity === filters.intensity);
    }

    if (filters.favorites_only) {
      filtered = filtered.filter((t) => t.is_favorite);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleFilterChange = (key: keyof TemplateFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === prev[key] ? undefined : value, // Toggle off if same
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleToggleFavorite = async (template: WorkoutTemplate) => {
    // Guard: only the owner can favorite their own templates (RLS blocks PATCH on others)
    if (!user || template.user_id !== user.id) {
      console.warn('[TemplateLibraryView] Cannot favorite community template — not owner');
      return;
    }

    // Debounce: prevent rapid-fire clicks
    if (favoritingIds.has(template.id)) return;
    setFavoritingIds((prev) => new Set(prev).add(template.id));

    const newFavorite = !template.is_favorite;

    // Optimistic update — reflect change immediately in UI
    setFilteredTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, is_favorite: newFavorite } : t))
    );

    try {
      const { error: toggleError } = await WorkoutTemplateService.toggleFavorite(template.id, newFavorite);
      if (toggleError) {
        console.error('[TemplateLibraryView] Favorite toggle failed, reverting:', toggleError);
        // Revert optimistic update on failure
        setFilteredTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, is_favorite: template.is_favorite } : t))
        );
      }
      // Always refresh from DB to ensure is_favorite state stays in sync
      await refresh();
    } finally {
      setFavoritingIds((prev) => {
        const next = new Set(prev);
        next.delete(template.id);
        return next;
      });
    }
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    await WorkoutTemplateService.duplicateTemplate(template.id);
    // Real-time hook will update automatically
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    const message = template.usage_count > 0
      ? `Este exercicio foi prescrito para ${template.usage_count} treino(s). Deletar removera o vinculo. Deseja continuar?`
      : `Deletar template "${template.name}"?`;
    if (!confirm(message)) return;

    const { error: deleteError } = await WorkoutTemplateService.deleteTemplate(template.id);
    if (deleteError) {
      console.error('[TemplateLibraryView] Delete failed:', deleteError);
    }
    // Always refresh to sync UI with DB state
    await refresh();
  };

  const handleEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setModalOpen(true);
  };

  const handleDragStart = (template: WorkoutTemplate) => {
    setDraggedTemplate(template);
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      {/* Back Button */}
      <div className="p-6 pb-0">
        <button
          onClick={() => navigate('/flux')}
          className="flex items-center gap-2 px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors w-fit"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>
      </div>

      {/* Header */}
      <div className="pt-4 px-6 pb-6 border-b border-ceramic-text-secondary/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-ceramic-text-primary mb-2">
              Biblioteca de Exercícios
            </h1>
            <p className="text-sm text-ceramic-text-secondary">
              {filteredTemplates.length} exercício{filteredTemplates.length !== 1 ? 's' : ''}{' '}
              {activeFiltersCount > 0 && `(${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''})`}
            </p>
          </div>

          <button
            onClick={() => navigate('/flux/templates/new')}
            className="flex items-center gap-2 px-6 py-3 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white rounded-lg shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold">Novo Exercício</span>
          </button>
        </div>

        {/* Filters (always visible) */}
        <div className="space-y-4 mb-4">
          {/* Modality Filter */}
          <div>
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
              Modalidade
            </p>
            <div className="flex flex-wrap gap-2">
              {(['swimming', 'running', 'cycling', 'strength', 'walking'] as TrainingModality[]).map(
                (modality) => (
                  <button
                    key={modality}
                    onClick={() => handleFilterChange('modality', modality)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      filters.modality === modality
                        ? 'bg-ceramic-accent text-white'
                        : 'ceramic-inset hover:bg-white/50'
                    }`}
                  >
                    <span>{MODALITY_CONFIG[modality]?.icon}</span>
                    <span className="text-sm font-medium">
                      {MODALITY_CONFIG[modality]?.label}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Zone Filter */}
          <div>
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
              Zona
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ZONE_LABELS).map(([zone, label]) => (
                <button
                  key={zone}
                  onClick={() => handleFilterChange('intensity', zone as WorkoutIntensity)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filters.intensity === zone
                      ? 'bg-ceramic-accent text-white'
                      : 'ceramic-inset hover:bg-white/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Favorites Toggle + Group by Modality + Clear */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.favorites_only || false}
                  onChange={(e) => handleFilterChange('favorites_only', e.target.checked || undefined)}
                  className="w-4 h-4 rounded border-ceramic-text-secondary/20"
                />
                <span className="text-sm font-medium text-ceramic-text-primary">
                  Apenas favoritos
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByModality}
                  onChange={(e) => setGroupByModality(e.target.checked)}
                  className="w-4 h-4 rounded border-ceramic-text-secondary/20"
                />
                <span className="text-sm font-medium text-ceramic-text-primary">
                  Agrupar por modalidade
                </span>
              </label>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-text-secondary" />
          <input
            type="text"
            placeholder="Buscar exercícios..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
            className="w-full pl-12 pr-4 py-3 bg-white/50 rounded-lg border border-ceramic-text-secondary/20 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-ceramic-text-secondary">Carregando templates...</div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 ceramic-inset">
            <p className="text-lg font-bold text-ceramic-text-primary mb-2">
              Nenhum exercício encontrado
            </p>
            <p className="text-sm text-ceramic-text-secondary mb-4">
              {activeFiltersCount > 0
                ? 'Tente ajustar os filtros ou criar um novo exercício'
                : 'Comece criando seu primeiro exercício'}
            </p>
            <button
              onClick={() => navigate('/flux/templates/new')}
              className="flex items-center gap-2 px-4 py-2 bg-ceramic-accent text-white rounded-lg hover:bg-ceramic-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Criar Exercício</span>
            </button>
          </div>
        ) : groupByModality ? (
          <div className="space-y-8">
            {(['swimming', 'running', 'cycling', 'strength', 'walking'] as TrainingModality[])
              .map((mod) => {
                const modTemplates = filteredTemplates.filter((t) => t.modality === mod);
                if (modTemplates.length === 0) return null;
                const config = MODALITY_CONFIG[mod];
                return (
                  <div key={mod}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">{config?.icon}</span>
                      <h3 className="text-lg font-bold text-ceramic-text-primary">{config?.label}</h3>
                      <span className="text-sm text-ceramic-text-secondary">({modTemplates.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          currentUserId={user?.id}
                          onToggleFavorite={handleToggleFavorite}
                          onEdit={handleEdit}
                          onDuplicate={handleDuplicate}
                          onDelete={handleDelete}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedTemplate?.id === template.id}
                          favoritingId={favoritingIds.has(template.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                currentUserId={user?.id}
                onToggleFavorite={handleToggleFavorite}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDragging={draggedTemplate?.id === template.id}
                favoritingId={favoritingIds.has(template.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Form Drawer */}
      <TemplateFormDrawer
        mode={editingTemplate ? 'edit' : 'create'}
        initialData={editingTemplate || undefined}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: WorkoutTemplate;
  currentUserId?: string;
  onToggleFavorite: (template: WorkoutTemplate) => void;
  onEdit?: (template: WorkoutTemplate) => void;
  onDuplicate: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
  onDragStart: (template: WorkoutTemplate) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  favoritingId?: boolean;
}

function TemplateCard({
  template,
  currentUserId,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  favoritingId,
}: TemplateCardProps) {
  const modalityConfig = MODALITY_CONFIG[template.modality as TrainingModality];

  return (
    <div
      draggable
      onDragStart={() => onDragStart(template)}
      onDragEnd={onDragEnd}
      className={`ceramic-card group relative overflow-hidden transition-all cursor-move ${
        isDragging ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'
      }`}
    >
      {/* Drag Handle */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-5 h-5 text-ceramic-text-secondary" />
      </div>

      {/* Favorite Button — only for own templates (RLS blocks PATCH on community templates) */}
      {(currentUserId && template.user_id === currentUserId) ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(template);
          }}
          disabled={favoritingId}
          className={`absolute top-3 right-3 p-2 rounded-lg ceramic-inset hover:bg-white/50 transition-colors z-10 ${
            favoritingId ? 'opacity-50 cursor-wait' : ''
          }`}
        >
          <Star
            className={`w-4 h-4 ${
              template.is_favorite
                ? 'fill-ceramic-warning text-ceramic-warning'
                : 'text-ceramic-text-secondary'
            }`}
          />
        </button>
      ) : (
        <div
          className="absolute top-3 right-3 p-2 rounded-lg ceramic-inset opacity-30 cursor-not-allowed z-10"
          title="Apenas seus próprios templates podem ser favoritados"
        >
          <Star className="w-4 h-4 text-ceramic-text-secondary" />
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="pr-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{modalityConfig?.icon}</span>
            {/* Zone pills from exercise_structure */}
            {(() => {
              const zones = getUniqueZones(template.exercise_structure);
              if (zones.length > 0) {
                return zones.map((z) => (
                  <span
                    key={z}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${ZONE_PILL_COLORS[z] || 'bg-ceramic-text-secondary'}`}
                  >
                    {z}
                  </span>
                ));
              }
              // Fallback for legacy templates without V2 structure
              return (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    INTENSITY_COLORS[template.intensity] || ''
                  }`}
                >
                  {INTENSITY_LABELS[template.intensity] || template.intensity}
                </span>
              );
            })()}
          </div>
          <h3 className="text-base font-bold text-ceramic-text-primary line-clamp-2">
            {template.name}
          </h3>
        </div>

        {/* Exercise Structure Mini-List */}
        {(() => {
          const es = template.exercise_structure as ExerciseStructureV2 | undefined;
          if (!es?.series?.length) {
            // Fallback: plain description for legacy templates
            return template.description ? (
              <p className="text-sm text-ceramic-text-secondary line-clamp-2">
                {template.description}
              </p>
            ) : null;
          }
          return (
            <div className="space-y-1 text-xs text-ceramic-text-secondary">
              {es.warmup && (
                <div className="flex items-start gap-1.5">
                  <span className="text-ceramic-warning font-bold shrink-0">Aq.</span>
                  <span className="line-clamp-1">{es.warmup}</span>
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <span className="text-ceramic-accent font-bold shrink-0">P.</span>
                <span className="line-clamp-2">
                  {es.series.map((s: any) => {
                    const reps = s.repetitions && s.repetitions > 1 ? `${s.repetitions}x` : '';
                    let work = '';
                    if (s.exercise_name) work = s.exercise_name;
                    else if (s.reps) work = `${s.reps} rep${s.load_kg ? ` ${s.load_kg}kg` : ''}`;
                    else if (s.distance_meters) work = formatWorkValue(s.distance_meters, 'meters');
                    else if (s.work_value) work = formatWorkValue(s.work_value, s.work_unit, s.unit_detail);
                    else work = 'série';
                    const rest = (s.rest_minutes || s.rest_seconds)
                      ? ` int ${s.rest_minutes ? `${s.rest_minutes}'` : ''}${s.rest_seconds ? `${s.rest_seconds}"` : ''}`
                      : '';
                    return `${reps}${work}${rest}`;
                  }).join(' + ')}
                </span>
              </div>
              {es.cooldown && (
                <div className="flex items-start gap-1.5">
                  <span className="text-ceramic-info font-bold shrink-0">Des.</span>
                  <span className="line-clamp-1">{es.cooldown}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Metadata + Creator Attribution */}
        <div className="flex items-center justify-between text-xs text-ceramic-text-secondary pt-2 border-t border-ceramic-text-secondary/10">
          <div className="flex items-center gap-3">
            {template.duration > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{template.duration}</span>
                <span>min</span>
              </div>
            )}
            {template.usage_count > 0 && (
              <div className="flex items-center gap-1">
                <Copy className="w-3 h-3" />
                <span>{template.usage_count}x usado</span>
              </div>
            )}
          </div>

          {/* Creator badge — only show when user is authenticated */}
          {currentUserId && (
            template.user_id === currentUserId ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ceramic-accent/10 text-ceramic-accent text-[10px] font-bold uppercase tracking-wider">
                <UserIcon className="w-3 h-3" />
                Meu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ceramic-info/10 text-ceramic-info text-[10px] font-bold uppercase tracking-wider">
                <UserIcon className="w-3 h-3" />
                Comunidade
              </span>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-ceramic-text-secondary/10">
          {/* Edit — only for own templates that have NOT been prescribed */}
          {currentUserId && template.user_id === currentUserId && !(template.usage_count > 0) && onEdit && (
            <button
              onClick={() => onEdit(template)}
              className="flex items-center justify-center gap-2 px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              <span className="text-xs font-medium text-ceramic-text-primary">Editar</span>
            </button>
          )}

          {/* Lock badge — prescribed templates cannot be edited */}
          {currentUserId && template.user_id === currentUserId && template.usage_count > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-2 text-ceramic-text-secondary"
              title="Prescrito — nao pode ser editado"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Prescrito</span>
            </div>
          )}

          <button
            onClick={() => onDuplicate(template)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-primary" title="Cria um novo template com base neste">Criar a partir deste</span>
          </button>

          {/* Delete only for own templates */}
          {currentUserId && template.user_id === currentUserId && (
            <button
              onClick={() => onDelete(template)}
              className="px-3 py-2 ceramic-inset hover:bg-ceramic-error/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-ceramic-error" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
