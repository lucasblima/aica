/**
 * AcademiaHome View - Temple of Knowledge
 *
 * Main dashboard for Academia archetype.
 * Uses Ceramic Design System with midnight blue + gold accent theme.
 * Full CRUD: Create, Read, Update, Delete learning journeys.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, GraduationCap, FileText, Clock, TrendingUp, ArrowLeft, Plus, X, Edit2, Trash2, MoreVertical, Users, Award, LayoutDashboard } from 'lucide-react';
import { useJourneys } from '../hooks/useJourneys';
import { useNotes } from '../hooks/useNotes';
import { journeyService } from '../services/journeyService';
import { cardElevationVariants, staggerContainer, staggerItem } from '../../../../lib/animations/ceramic-motion';
import type { JourneyType, CreateJourneyPayload, AcademiaJourney } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('AcademiaHome');

interface AcademiaHomeProps {
  spaceId?: string;
  onNavigateToJourney?: (journeyId: string) => void;
}

export const AcademiaHome: React.FC<AcademiaHomeProps> = ({
  spaceId: propSpaceId,
  onNavigateToJourney
}) => {
  const navigate = useNavigate();
  const { spaceId: paramSpaceId } = useParams<{ spaceId: string }>();
  const spaceId = propSpaceId || paramSpaceId || 'default-space';

  // CRUD Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { journeys, loading: journeysLoading, createJourney, deleteJourney, refresh } = useJourneys({
    spaceId,
  });

  const { notes, loading: notesLoading } = useNotes({ spaceId });

  const loading = journeysLoading || notesLoading;

  // Create journey handler
  const handleCreateJourney = async (data: CreateJourneyPayload) => {
    setIsCreating(true);
    try {
      await createJourney(data);
      setShowCreateModal(false);
    } catch (error) {
      log.error('Erro ao criar jornada:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete journey handler
  const handleDeleteJourney = async (journeyId: string) => {
    setIsDeleting(true);
    try {
      await deleteJourney(journeyId);
      setShowDeleteConfirm(null);
    } catch (error) {
      log.error('Erro ao deletar jornada:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigation handler
  const handleNavigateToJourney = (journeyId: string) => {
    if (onNavigateToJourney) {
      onNavigateToJourney(journeyId);
    } else {
      navigate(`/connections/academia/${spaceId}/journey/${journeyId}`);
    }
  };

  // Get active journeys
  const activeJourneys = journeys.filter((j) => j.status === 'active').slice(0, 3);

  // Get recent notes (last 5)
  const recentNotes = notes.slice(0, 5);

  // Calculate stats
  const totalHours = journeys.reduce((sum, j) => sum + (j.logged_hours || 0), 0);
  const completedJourneys = journeys.filter(j => j.status === 'completed').length;

  if (loading) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
        <div className="ceramic-card p-8">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-700 animate-spin" />
            <span className="text-sm text-ceramic-text-secondary">
              Carregando biblioteca...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header Section */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={() => navigate('/connections')}
              className="ceramic-inset p-3 rounded-full hover:bg-blue-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-ceramic-text-primary" />
            </button>
            <div className="ceramic-inset w-12 h-12 flex items-center justify-center bg-blue-800">
              <GraduationCap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
                Academia
              </h1>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                Templo do Conhecimento
              </p>
            </div>
          </div>

          {/* Create New Journey Button */}
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="ceramic-card px-5 py-2.5 flex items-center gap-2 bg-blue-800"
            variants={cardElevationVariants}
            initial="rest"
            whileHover="hover"
            whileTap="pressed"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white uppercase tracking-wider">
              Nova Jornada
            </span>
          </motion.button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-blue-200 pb-2 mb-4">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => navigate(`/connections/academia/${spaceId}/notes`)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 text-ceramic-text-secondary rounded-lg font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            Notas
          </button>
          <button
            onClick={() => navigate(`/connections/academia/${spaceId}/mentorships`)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 text-ceramic-text-secondary rounded-lg font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            Mentorias
          </button>
          <button
            onClick={() => navigate(`/connections/academia/${spaceId}/portfolio`)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 text-ceramic-text-secondary rounded-lg font-medium transition-colors"
          >
            <Award className="w-4 h-4" />
            Portfolio
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ceramic-inset-shallow p-3 text-center bg-blue-50">
            <div className="text-xl font-black text-blue-700">
              {activeJourneys.length}
            </div>
            <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
              Jornadas Ativas
            </div>
          </div>

          <div className="ceramic-inset-shallow p-3 text-center bg-amber-50">
            <div className="text-xl font-black text-amber-600">
              {totalHours}h
            </div>
            <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
              Horas Estudadas
            </div>
          </div>

          <div className="ceramic-inset-shallow p-3 text-center bg-blue-50">
            <div className="text-xl font-black text-blue-700">
              {notes.length}
            </div>
            <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
              Notas
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {/* Current Learning Journeys */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Jornadas de Aprendizado
            </h2>
            <span className="text-xs text-ceramic-text-secondary/60">
              ({activeJourneys.length})
            </span>
          </div>

          {activeJourneys.length === 0 ? (
            <motion.div
              className="ceramic-tray p-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-blue-50">
                <BookOpen className="w-8 h-8 text-blue-700" />
              </div>
              <p className="text-sm text-ceramic-text-secondary mb-4">
                Nenhuma jornada ativa. Comece um novo curso ou livro.
              </p>
              <motion.button
                onClick={() => setShowCreateModal(true)}
                className="ceramic-card px-4 py-2 inline-flex items-center gap-2 bg-blue-800"
                variants={cardElevationVariants}
                initial="rest"
                whileHover="hover"
                whileTap="pressed"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Nova Jornada</span>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {activeJourneys.map((journey) => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  onNavigate={handleNavigateToJourney}
                  onEdit={(id) => navigate(`/connections/academia/${spaceId}/journey/${id}/edit`)}
                  onDelete={(id) => setShowDeleteConfirm(id)}
                />
              ))}
            </motion.div>
          )}
        </section>

        {/* Reading List Progress */}
        {completedJourneys > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Progresso
              </h2>
            </div>

            <motion.div
              className="ceramic-card p-4"
              variants={cardElevationVariants}
              initial="rest"
              whileHover="hover"
            >
              <div className="text-center">
                <div className="text-3xl font-black text-amber-500 mb-1">
                  {completedJourneys}
                </div>
                <div className="text-xs text-ceramic-text-secondary">
                  Jornadas Completadas
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Notes Preview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Notas Recentes
            </h2>
            <span className="text-xs text-ceramic-text-secondary/60">
              ({recentNotes.length})
            </span>
          </div>

          {recentNotes.length === 0 ? (
            <motion.div
              className="ceramic-tray p-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-amber-50">
                <FileText className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-sm text-ceramic-text-secondary">
                Sua base de conhecimento está vazia. Crie sua primeira nota.
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {recentNotes.map((note) => (
                <motion.div
                  key={note.id}
                  variants={staggerItem}
                >
                  <motion.div
                    className="ceramic-card p-4"
                    variants={cardElevationVariants}
                    initial="rest"
                    whileHover="hover"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-bold text-ceramic-text-primary">
                        {note.title}
                      </h3>
                      <span className="ceramic-inset-shallow px-2 py-1 text-[10px] text-blue-700 uppercase tracking-wider bg-blue-50">
                        {note.note_type}
                      </span>
                    </div>
                    <p className="text-xs text-ceramic-text-secondary line-clamp-2">
                      {note.content.substring(0, 100)}...
                    </p>
                    {note.tags.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>

      {/* Create Modal */}
      <CreateJourneyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateJourney}
        isLoading={isCreating}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDeleteJourney(showDeleteConfirm)}
        isLoading={isDeleting}
        journeyTitle={journeys.find(j => j.id === showDeleteConfirm)?.title || 'esta jornada'}
      />
    </div>
  );
};

/**
 * JourneyCard - Individual journey card with actions
 */
interface JourneyCardProps {
  journey: AcademiaJourney;
  onNavigate: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function JourneyCard({ journey, onNavigate, onEdit, onDelete }: JourneyCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      variants={staggerItem}
      className="cursor-pointer relative group"
    >
      <motion.div
        className="ceramic-card p-4"
        variants={cardElevationVariants}
        initial="rest"
        whileHover="hover"
        whileTap="pressed"
        onClick={() => onNavigate(journey.id)}
      >
        {/* Action Menu Button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 rounded-lg hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-ceramic-text-secondary" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-ceramic-text-secondary/10 py-1 min-w-[140px] z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onEdit(journey.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-ceramic-text-primary hover:bg-blue-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    onDelete(journey.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-start justify-between mb-3 pr-8">
          <div className="flex-1">
            <h3 className="text-base font-bold text-ceramic-text-primary mb-1">
              {journey.title}
            </h3>
            <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
              {journey.journey_type} {journey.provider && `- ${journey.provider}`}
            </p>
          </div>
          <div className="ceramic-inset-shallow px-3 py-1 bg-blue-50">
            <span className="text-xs font-bold text-blue-700">
              {journey.progress_pct}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${journey.progress_pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary">
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            <span>{journey.completed_modules}/{journey.total_modules || '?'} modulos</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{journey.logged_hours}h de {journey.estimated_hours || '?'}h</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * CreateJourneyModal - Modal for creating new learning journey
 */
interface CreateJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateJourneyPayload) => Promise<void>;
  isLoading: boolean;
}

const JOURNEY_TYPES: { value: JourneyType; label: string }[] = [
  { value: 'course', label: 'Curso Online' },
  { value: 'book', label: 'Livro' },
  { value: 'certification', label: 'Certificacao' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'mentorship', label: 'Mentoria' },
];

function CreateJourneyModal({ isOpen, onClose, onSubmit, isLoading }: CreateJourneyModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    provider: '',
    instructor: '',
    journey_type: 'course' as JourneyType,
    total_modules: '',
    estimated_hours: '',
    url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    await onSubmit({
      title: formData.title.trim(),
      provider: formData.provider.trim() || undefined,
      instructor: formData.instructor.trim() || undefined,
      journey_type: formData.journey_type,
      total_modules: formData.total_modules ? parseInt(formData.total_modules) : undefined,
      estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : undefined,
      url: formData.url.trim() || undefined,
    });

    // Reset form
    setFormData({
      title: '',
      provider: '',
      instructor: '',
      journey_type: 'course',
      total_modules: '',
      estimated_hours: '',
      url: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-base w-full max-w-lg rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <div className="ceramic-concave w-10 h-10 flex items-center justify-center bg-blue-800">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-ceramic-text-primary">Nova Jornada</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Titulo *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: React Mastery Course"
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
          </div>

          {/* Journey Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Tipo de Jornada
            </label>
            <select
              value={formData.journey_type}
              onChange={(e) => setFormData({ ...formData, journey_type: e.target.value as JourneyType })}
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {JOURNEY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Provider & Instructor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Plataforma/Editora
              </label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="Ex: Udemy, Alura"
                className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Instrutor/Autor
              </label>
              <input
                type="text"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="Nome do instrutor"
                className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modules & Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Total de Modulos
              </label>
              <input
                type="number"
                value={formData.total_modules}
                onChange={(e) => setFormData({ ...formData, total_modules: e.target.value })}
                placeholder="Ex: 12"
                min="1"
                className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Horas Estimadas
              </label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="Ex: 40"
                min="1"
                className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Link do Curso/Livro
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
              className="w-full p-3 rounded-xl ceramic-inset text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 ceramic-card py-3 rounded-xl font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title.trim()}
              className="flex-1 ceramic-card py-3 rounded-xl bg-blue-800 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Jornada
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/**
 * DeleteConfirmModal - Confirmation modal for deleting journey
 */
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  journeyTitle: string;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, isLoading, journeyTitle }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-ceramic-base w-full max-w-md rounded-2xl shadow-2xl p-6"
      >
        <div className="text-center">
          <div className="ceramic-concave w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-50">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Excluir Jornada?
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-6">
            Tem certeza que deseja excluir <strong>{journeyTitle}</strong>? Todo o progresso sera perdido.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 ceramic-card py-3 rounded-xl font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 ceramic-card py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AcademiaHome;
