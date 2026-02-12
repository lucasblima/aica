/**
 * WorkoutTemplateLibrary - Sidebar with draggable workout templates
 *
 * Phase 1: Visual mockup (drag visual only, no @dnd-kit yet)
 * Displays templates filtered by athlete modality and category.
 */

import React, { useState, useMemo } from 'react';
import { GripVertical, Activity, Filter } from 'lucide-react';
import {
  getTemplatesByModality,
  getTemplatesByCategory,
  type WorkoutTemplate,
} from '../../mockData/workoutTemplates';
import { MODALITY_CONFIG, type TrainingModality, type ExerciseCategory } from '../../types';

interface WorkoutTemplateLibraryProps {
  modality: TrainingModality;
  onTemplateSelect?: (template: WorkoutTemplate) => void;
}

const CATEGORY_LABELS: Record<ExerciseCategory, { label: string; icon: string; color: string }> = {
  warmup: { label: 'Aquecimento', icon: '🔥', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  main: { label: 'Principal', icon: '💪', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  cooldown: { label: 'Desaquecimento', icon: '❄️', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
};

const INTENSITY_COLORS = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
};

export const WorkoutTemplateLibrary: React.FC<WorkoutTemplateLibraryProps> = ({
  modality,
  onTemplateSelect,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');

  // Filter templates by modality and category
  const templates = useMemo(() => {
    if (selectedCategory === 'all') {
      return getTemplatesByModality(modality);
    }
    return getTemplatesByCategory(modality, selectedCategory);
  }, [modality, selectedCategory]);

  const modalityConfig = MODALITY_CONFIG[modality];

  return (
    <div className="w-80 h-full bg-ceramic-base border-r border-stone-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="ceramic-inset p-2">
            <span className="text-xl">{modalityConfig.icon}</span>
          </div>
          <div>
            <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
              Biblioteca
            </p>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              {modalityConfig.label}
            </h3>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedCategory === 'all'
                ? 'ceramic-card bg-ceramic-base shadow-sm text-ceramic-text-primary'
                : 'ceramic-inset text-ceramic-text-secondary hover:bg-white/50'
            }`}
          >
            <Filter className="w-3 h-3" />
            Todos
          </button>
          {Object.entries(CATEGORY_LABELS).map(([category, config]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as ExerciseCategory)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                selectedCategory === category
                  ? `ceramic-card shadow-sm ${config.color}`
                  : 'ceramic-inset text-ceramic-text-secondary hover:bg-white/50'
              }`}
            >
              <span className="text-xs">{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {templates.length === 0 ? (
          <div className="ceramic-inset p-6 rounded-xl text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-ceramic-text-secondary" />
            <p className="text-sm text-ceramic-text-secondary">
              Nenhum template nesta categoria
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              modalityColor={modalityConfig.color}
              onClick={() => onTemplateSelect?.(template)}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-stone-200 bg-white">
        <div className="flex items-center justify-between text-xs text-ceramic-text-secondary">
          <span className="font-medium">{templates.length} template(s)</span>
          <span className="flex items-center gap-1">
            <GripVertical className="w-3 h-3" />
            Arraste para o grid
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Template Card Component
// ============================================

interface TemplateCardProps {
  template: WorkoutTemplate;
  modalityColor: string;
  onClick: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, modalityColor, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm transition-all hover:border-stone-300 hover:shadow-md cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('templateId', template.id);
        console.log('Drag started:', template.name);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          <Activity size={12} className="text-stone-400" />
          {template.category}
        </span>
        <GripVertical size={14} className="text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title */}
      <div>
        <h4 className="font-semibold text-stone-900 text-sm leading-tight mb-1">
          {template.name}
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-stone-500">
            {template.duration} min
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${INTENSITY_COLORS[template.intensity]}`}>
            {template.intensity === 'low' ? 'Leve' : template.intensity === 'medium' ? 'Média' : 'Alta'}
          </span>
        </div>
      </div>

      {/* Technical Details (if available) */}
      {template.sets && (
        <div className="text-xs text-stone-500 pt-2 border-t border-stone-100">
          {template.sets}x {template.reps}
          {template.rest && template.rest !== '0' && ` • ${template.rest} rest`}
        </div>
      )}

      {/* Accent Line (modality color) */}
      <div
        className={`absolute left-0 top-2 h-12 w-1 rounded-r ${modalityColor}`}
        style={{ opacity: 0.8 }}
      />
    </div>
  );
};
