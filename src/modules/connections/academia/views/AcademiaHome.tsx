/**
 * AcademiaHome View - Temple of Knowledge
 *
 * Main dashboard for Academia archetype.
 * Uses Ceramic Design System with midnight blue + gold accent theme.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, FileText, Clock, TrendingUp } from 'lucide-react';
import { useJourneys } from '../hooks/useJourneys';
import { useNotes } from '../hooks/useNotes';
import { cardElevationVariants, staggerContainer, staggerItem } from '../../../../lib/animations/ceramic-motion';

interface AcademiaHomeProps {
  spaceId: string;
  onNavigateToJourney?: (journeyId: string) => void;
}

export const AcademiaHome: React.FC<AcademiaHomeProps> = ({
  spaceId,
  onNavigateToJourney
}) => {
  const { journeys, loading: journeysLoading } = useJourneys({
    spaceId,
    status: 'active',
  });

  const { notes, loading: notesLoading } = useNotes({ spaceId });

  const loading = journeysLoading || notesLoading;

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
              <p className="text-sm text-ceramic-text-secondary">
                Nenhuma jornada ativa. Comece um novo curso ou livro.
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {activeJourneys.map((journey) => (
                <motion.div
                  key={journey.id}
                  variants={staggerItem}
                  onClick={() => onNavigateToJourney?.(journey.id)}
                  className="cursor-pointer"
                >
                  <motion.div
                    className="ceramic-card p-4"
                    variants={cardElevationVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="pressed"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-ceramic-text-primary mb-1">
                          {journey.title}
                        </h3>
                        <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">
                          {journey.journey_type}
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
                        <span>{journey.completed_modules}/{journey.total_modules} módulos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{journey.logged_hours}h de {journey.estimated_hours}h</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
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
    </div>
  );
};

export default AcademiaHome;
