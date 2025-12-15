import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  CheckCircle2,
  Play,
  Pause,
  Archive,
  X,
} from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { ProjectDetail } from './ProjectDetail';
import { useProjects, useCreateProject } from '../hooks/useProjects';
import { Project, CreateProjectPayload } from '../services/projectService';

interface ProjectListProps {
  connectionSpaceId?: string;
}

/**
 * ProjectList - Grid of ProjectCards with filters and creation
 *
 * Features:
 * - Grid of ProjectCards
 * - Filters: status, connection_space
 * - Sorting: progress, date, name
 * - "New Project" button with modal
 * - Empty state with illustrations
 */
export const ProjectList: React.FC<ProjectListProps> = ({ connectionSpaceId }) => {
  // State
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'progress' | 'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Hooks
  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    connection_space_id: connectionSpaceId,
  };
  const { projects, loading, refresh } = useProjects(filters);
  const { createProject, isCreating } = useCreateProject();

  // Create project form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('📋');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newStatus, setNewStatus] = useState<Project['status']>('active');

  // Sort projects
  const sortedProjects = [...projects].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'progress':
        const progressA = a.total_tasks ? (a.completed_tasks || 0) / a.total_tasks : 0;
        const progressB = b.total_tasks ? (b.completed_tasks || 0) / b.total_tasks : 0;
        comparison = progressA - progressB;
        break;
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'name':
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Handle create project
  const handleCreateProject = async () => {
    if (!newTitle.trim()) {
      alert('Por favor, adicione um título ao projeto');
      return;
    }

    const payload: CreateProjectPayload = {
      title: newTitle,
      description: newDescription || undefined,
      icon: newIcon,
      color: newColor,
      target_date: newTargetDate || undefined,
      status: newStatus,
      connection_space_id: connectionSpaceId,
    };

    const created = await createProject(payload);

    if (created) {
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewIcon('📋');
      setNewColor('#3B82F6');
      setNewTargetDate('');
      setNewStatus('active');
      setShowCreateModal(false);

      // Refresh list
      refresh();
    }
  };

  // Status filter options
  const statusOptions = [
    { value: 'all', label: 'Todos', icon: Filter },
    { value: 'active', label: 'Ativos', icon: Play },
    { value: 'on_hold', label: 'Em Pausa', icon: Pause },
    { value: 'completed', label: 'Concluídos', icon: CheckCircle2 },
    { value: 'archived', label: 'Arquivados', icon: Archive },
  ];

  // Color presets
  const colorPresets = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];

  // Emoji presets
  const emojiPresets = ['📋', '🎯', '🚀', '💼', '🏆', '⭐', '🔥', '💡', '🎨', '📚', '🏠', '💰'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-ceramic-text-primary text-etched">
            Meus Projetos
          </h2>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Organize suas tarefas em projetos
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="ceramic-card px-6 py-3 rounded-2xl font-bold text-ceramic-accent hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Projeto
        </button>
      </div>

      {/* Filters and Sorting */}
      <div className="ceramic-card p-4 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Status filters */}
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    statusFilter === option.value
                      ? 'ceramic-concave text-ceramic-accent'
                      : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl ceramic-tray text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
            >
              <option value="date">Data</option>
              <option value="progress">Progresso</option>
              <option value="name">Nome</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 rounded-xl ceramic-card hover:shadow-md transition-all"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4 text-ceramic-accent" />
              ) : (
                <SortDesc className="w-4 h-4 text-ceramic-accent" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="ceramic-tray p-12 rounded-2xl text-center">
          <p className="text-ceramic-text-secondary">Carregando projetos...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && sortedProjects.length === 0 && (
        <motion.div
          className="ceramic-tray p-12 rounded-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="ceramic-inset w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-blue-50"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Plus className="w-10 h-10 text-ceramic-accent" />
          </motion.div>

          <h3 className="text-xl font-bold text-ceramic-text-primary mb-3">
            {statusFilter === 'all' ? 'Nenhum projeto ainda' : `Nenhum projeto ${statusOptions.find(o => o.value === statusFilter)?.label.toLowerCase()}`}
          </h3>

          <p className="text-ceramic-text-secondary mb-6 max-w-md mx-auto">
            {statusFilter === 'all'
              ? 'Organize suas tarefas criando projetos. Projetos ajudam você a agrupar tarefas relacionadas e acompanhar o progresso.'
              : `Você não tem projetos ${statusOptions.find(o => o.value === statusFilter)?.label.toLowerCase()} no momento.`}
          </p>

          <button
            onClick={() => setShowCreateModal(true)}
            className="ceramic-card px-6 py-3 rounded-2xl font-bold text-ceramic-accent hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Projeto
          </button>
        </motion.div>
      )}

      {/* Projects Grid */}
      {!loading && sortedProjects.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          <AnimatePresence mode="popLayout">
            {sortedProjects.map(project => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              >
                <ProjectCard
                  project={project}
                  onClick={() => setSelectedProjectId(project.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Project count */}
      {!loading && sortedProjects.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-ceramic-text-tertiary">
            {sortedProjects.length} {sortedProjects.length === 1 ? 'projeto' : 'projetos'}
            {statusFilter !== 'all' && ` - ${statusOptions.find(o => o.value === statusFilter)?.label.toLowerCase()}`}
          </p>
        </div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#F0EFE9] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto opacity-100"
                style={{ backgroundColor: '#F0EFE9', opacity: 1 }}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-ceramic-text-secondary/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-ceramic-text-primary">
                      Criar Novo Projeto
                    </h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 rounded-xl hover:bg-ceramic-text-secondary/10 transition-colors"
                    >
                      <X className="w-6 h-6 text-ceramic-text-secondary" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Icon and Color */}
                  <div className="flex gap-6">
                    {/* Icon picker */}
                    <div>
                      <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                        Ícone
                      </label>
                      <div
                        className="ceramic-concave w-20 h-20 rounded-xl flex items-center justify-center text-4xl mb-3"
                        style={{ backgroundColor: `${newColor}15` }}
                      >
                        {newIcon}
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {emojiPresets.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => setNewIcon(emoji)}
                            className={`w-10 h-10 text-xl hover:scale-110 transition-transform rounded-lg ${
                              newIcon === emoji ? 'ceramic-concave' : 'ceramic-tray'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color picker */}
                    <div className="flex-1">
                      <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                        Cor
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorPresets.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewColor(color)}
                            className={`h-12 rounded-lg transition-all ${
                              newColor === color ? 'ring-2 ring-ceramic-accent ring-offset-2' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                      Título *
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-ceramic-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                      placeholder="Ex: Lançamento do Produto"
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                      Descrição
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-ceramic-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-ceramic-accent resize-none"
                      placeholder="Descreva o objetivo deste projeto..."
                      rows={4}
                    />
                  </div>

                  {/* Target Date */}
                  <div>
                    <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                      Data Alvo
                    </label>
                    <input
                      type="date"
                      value={newTargetDate}
                      onChange={(e) => setNewTargetDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-ceramic-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium text-ceramic-text-secondary mb-2 block">
                      Status Inicial
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.slice(1).map(option => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setNewStatus(option.value as Project['status'])}
                            className={`p-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                              newStatus === option.value
                                ? 'ceramic-concave text-ceramic-accent'
                                : 'ceramic-tray text-ceramic-text-secondary'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-ceramic-text-secondary/10 flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl ceramic-tray font-bold hover:shadow-md transition-all"
                    disabled={isCreating}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateProject}
                    disabled={isCreating || !newTitle.trim()}
                    className="flex-1 px-6 py-3 rounded-xl bg-ceramic-accent-dark text-white font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Criando...' : 'Criar Projeto'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Project Detail Drawer */}
      {selectedProjectId && (
        <ProjectDetail
          projectId={selectedProjectId}
          isOpen={!!selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onUpdate={refresh}
        />
      )}
    </div>
  );
};
