/**
 * TemplateLibraryView - Biblioteca de Templates de Treino
 *
 * Tela 1 do Flow Module: Grid filtrável de templates com drag support,
 * quick actions (edit/duplicate/delete/favorite), e criação de novos templates.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Star,
  Copy,
  Edit2,
  Trash2,
  GripVertical,
  X,
  ArrowLeft,
  User as UserIcon,
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

  // Determine mode based on URL
  const mode: 'create' | 'edit' | 'list' = location.pathname.includes('/new')
    ? 'create'
    : location.pathname.includes('/edit')
    ? 'edit'
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

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [templates, filters]);

  // Load template for editing
  useEffect(() => {
    if (mode === 'edit' && templateId) {
      loadTemplateForEdit(templateId);
    } else if (mode === 'list') {
      setEditingTemplate(null);
      setModalOpen(false);
    } else if (mode === 'create') {
      setEditingTemplate(null);
      setModalOpen(true);
    }
  }, [mode, templateId]);

  const loadTemplateForEdit = async (id: string) => {
    const { data, error } = await WorkoutTemplateService.getTemplateById(id);

    if (error) {
      console.error('Error loading template:', error);
      navigate('/flux/templates');
    } else if (data) {
      setEditingTemplate(data);
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTemplate(null);
    navigate('/flux/templates');
  };

  const handleModalSave = (template: WorkoutTemplate) => {
    // Optimistic update — immediately reflect the saved template in the grid
    setFilteredTemplates((prev) => {
      const exists = prev.some((t) => t.id === template.id);
      if (exists) {
        // Edit: replace existing template
        return prev.map((t) => (t.id === template.id ? template : t));
      }
      // Create: prepend new template
      return [template, ...prev];
    });

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
    const newFavorite = !template.is_favorite;

    // Optimistic update — reflect change immediately in UI
    setFilteredTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? { ...t, is_favorite: newFavorite } : t))
    );

    const { error: toggleError } = await WorkoutTemplateService.toggleFavorite(template.id, newFavorite);
    if (toggleError) {
      console.error('[TemplateLibraryView] Favorite toggle failed, reverting:', toggleError);
      // Revert optimistic update on failure
      setFilteredTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_favorite: template.is_favorite } : t))
      );
    }
    // Always refresh from DB to ensure is_favorite state stays in sync
    // This is critical: the DB is the source of truth for favorites,
    // not local state. The refresh ensures consistency after toggling.
    await refresh();
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    await WorkoutTemplateService.duplicateTemplate(template.id);
    // Real-time hook will update automatically
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    if (!confirm(`Deletar template "${template.name}"?`)) return;

    await WorkoutTemplateService.deleteTemplate(template.id);
    // Real-time hook will update automatically
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

          {/* Favorites Toggle + Clear */}
          <div className="flex items-center justify-between">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                currentUserId={user?.id}
                onToggleFavorite={handleToggleFavorite}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDragging={draggedTemplate?.id === template.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Form Drawer */}
      <TemplateFormDrawer
        mode={mode === 'edit' ? 'edit' : 'create'}
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
  onDuplicate: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
  onDragStart: (template: WorkoutTemplate) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function TemplateCard({
  template,
  currentUserId,
  onToggleFavorite,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
}: TemplateCardProps) {
  const navigate = useNavigate();
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

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(template);
        }}
        className="absolute top-3 right-3 p-2 rounded-lg ceramic-inset hover:bg-white/50 transition-colors z-10"
      >
        <Star
          className={`w-4 h-4 ${
            template.is_favorite
              ? 'fill-ceramic-warning text-ceramic-warning'
              : 'text-ceramic-text-secondary'
          }`}
        />
      </button>

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
                <span className="text-ceramic-accent font-bold shrink-0">
                  {es.series.length} {es.series.length === 1 ? 'série' : 'séries'}
                </span>
                <span className="line-clamp-2">
                  {es.series.map((s: any) => {
                    if (s.reps) return `${s.reps} rep`;
                    if (s.distance_meters) return `${s.distance_meters}m`;
                    if (s.work_value) {
                      const unit = s.work_unit === 'minutes' ? 'min' : s.work_unit === 'seconds' ? 's' : 'm';
                      return `${s.work_value}${unit}`;
                    }
                    return 'série';
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
          <button
            onClick={() => navigate(`/flux/templates/${template.id}/edit`)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-primary">Editar</span>
          </button>

          <button
            onClick={() => onDuplicate(template)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-ceramic-text-secondary" />
            <span className="text-xs font-medium text-ceramic-text-primary" title="Cria um novo template com base neste">Criar a partir deste</span>
          </button>

          <button
            onClick={() => onDelete(template)}
            className="px-3 py-2 ceramic-inset hover:bg-ceramic-error/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-ceramic-error" />
          </button>
        </div>
      </div>
    </div>
  );
}
