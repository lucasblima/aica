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
  Filter,
  Star,
  Copy,
  Edit2,
  Trash2,
  GripVertical,
  X,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { WorkoutTemplateService } from '../services/workoutTemplateService';
import { TemplateFormModal } from '../components/forms';
import type {
  WorkoutTemplate,
  TemplateFilters,
  WorkoutCategory,
  WorkoutIntensity,
  TrainingModality,
} from '../types/flow';
import { MODALITY_CONFIG } from '../types/flux';

const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  warmup: 'Aquecimento',
  main: 'Principal',
  cooldown: 'Desaquecimento',
  recovery: 'Recuperação',
  test: 'Teste',
};

const INTENSITY_LABELS: Record<WorkoutIntensity, string> = {
  low: 'Leve',
  medium: 'Moderada',
  high: 'Alta',
};

const INTENSITY_COLORS: Record<WorkoutIntensity, string> = {
  low: 'bg-ceramic-info/20 text-ceramic-info',
  medium: 'bg-ceramic-warning/20 text-ceramic-warning',
  high: 'bg-ceramic-error/20 text-ceramic-error',
};

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

  // State
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<WorkoutTemplate[]>([]);
  const [filters, setFilters] = useState<TemplateFilters>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [draggedTemplate, setDraggedTemplate] = useState<WorkoutTemplate | null>(null);
  const [isModalOpen, setModalOpen] = useState(mode !== 'list');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

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

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await WorkoutTemplateService.getTemplates();

    if (error) {
      console.error('Error loading templates:', error);
    } else if (data) {
      setTemplates(data);
    }

    setLoading(false);
  };

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
    // Refresh templates list
    loadTemplates();
    // Close modal and navigate back
    handleModalClose();
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
    const { data, error } = await WorkoutTemplateService.toggleFavorite(
      template.id,
      !template.is_favorite
    );

    if (!error && data) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_favorite: data.is_favorite } : t))
      );
    }
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    const { data, error } = await WorkoutTemplateService.duplicateTemplate(template.id);

    if (!error && data) {
      setTemplates((prev) => [data, ...prev]);
    }
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    if (!confirm(`Deletar template "${template.name}"?`)) return;

    const { error } = await WorkoutTemplateService.deleteTemplate(template.id);

    if (!error) {
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    }
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
      {/* Header */}
      <div className="pt-8 px-6 pb-6 border-b border-ceramic-text-secondary/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-ceramic-text-primary mb-2">
              Biblioteca de Templates
            </h1>
            <p className="text-sm text-ceramic-text-secondary">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}{' '}
              {activeFiltersCount > 0 && `(${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''})`}
            </p>
          </div>

          <button
            onClick={() => navigate('/flux/templates/new')}
            className="flex items-center gap-2 px-6 py-3 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white rounded-lg shadow-md hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold">Novo Template</span>
          </button>
        </div>

        {/* Search + Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ceramic-text-secondary" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
              className="w-full pl-12 pr-4 py-3 bg-white/50 rounded-lg border border-ceramic-text-secondary/20 text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              showFilters
                ? 'bg-ceramic-accent text-white'
                : 'bg-white/50 text-ceramic-text-primary hover:bg-white/80'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 ceramic-card space-y-4">
            {/* Modality Filter */}
            <div>
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
                Modalidade
              </p>
              <div className="flex flex-wrap gap-2">
                {(['swimming', 'running', 'cycling', 'strength'] as TrainingModality[]).map(
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

            {/* Category Filter */}
            <div>
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
                Categoria
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
                  <button
                    key={category}
                    onClick={() => handleFilterChange('category', category as WorkoutCategory)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.category === category
                        ? 'bg-ceramic-accent text-white'
                        : 'ceramic-inset hover:bg-white/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Filter */}
            <div>
              <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-2">
                Intensidade
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(INTENSITY_LABELS).map(([intensity, label]) => (
                  <button
                    key={intensity}
                    onClick={() => handleFilterChange('intensity', intensity as WorkoutIntensity)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.intensity === intensity
                        ? 'bg-ceramic-accent text-white'
                        : 'ceramic-inset hover:bg-white/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorites Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-ceramic-text-secondary/10">
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
        )}
      </div>

      {/* Templates Grid */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-ceramic-text-secondary">Carregando templates...</div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 ceramic-inset">
            <p className="text-lg font-bold text-ceramic-text-primary mb-2">
              Nenhum template encontrado
            </p>
            <p className="text-sm text-ceramic-text-secondary mb-4">
              {activeFiltersCount > 0
                ? 'Tente ajustar os filtros ou criar um novo template'
                : 'Comece criando seu primeiro template de treino'}
            </p>
            <button
              onClick={() => navigate('/flux/templates/new')}
              className="flex items-center gap-2 px-4 py-2 bg-ceramic-accent text-white rounded-lg hover:bg-ceramic-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Criar Template</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
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

      {/* Template Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <TemplateFormModal
            mode={mode === 'edit' ? 'edit' : 'create'}
            initialData={editingTemplate || undefined}
            onClose={handleModalClose}
            onSave={handleModalSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: WorkoutTemplate;
  onToggleFavorite: (template: WorkoutTemplate) => void;
  onDuplicate: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
  onDragStart: (template: WorkoutTemplate) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function TemplateCard({
  template,
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
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                INTENSITY_COLORS[template.intensity]
              }`}
            >
              {INTENSITY_LABELS[template.intensity]}
            </span>
          </div>
          <h3 className="text-base font-bold text-ceramic-text-primary line-clamp-2">
            {template.name}
          </h3>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-sm text-ceramic-text-secondary line-clamp-2">
            {template.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-ceramic-text-secondary pt-2 border-t border-ceramic-text-secondary/10">
          <div className="flex items-center gap-1">
            <span className="font-medium">{template.duration}</span>
            <span>min</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">{CATEGORY_LABELS[template.category]}</span>
          </div>
          {template.usage_count > 0 && (
            <div className="flex items-center gap-1">
              <Copy className="w-3 h-3" />
              <span>{template.usage_count}x usado</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-ceramic-cool rounded text-[10px] font-medium text-ceramic-text-primary"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-ceramic-cool rounded text-[10px] font-medium text-ceramic-text-secondary">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

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
            <span className="text-xs font-medium text-ceramic-text-primary">Duplicar</span>
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
