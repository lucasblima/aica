/**
 * JourneyDetail View
 *
 * Detailed view of a single learning journey with progress tracking and notes.
 * Uses Ceramic Design System with midnight blue + gold accent theme.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, GraduationCap, FileText, Clock, ArrowLeft, Plus } from 'lucide-react';
import { useJourneys } from '../hooks/useJourneys';
import { useNotes } from '../hooks/useNotes';
import { JourneyProgress } from '../components/JourneyProgress';
import { NoteEditor } from '../components/NoteEditor';
import { CreateNotePayload } from '../types';
import { cardElevationVariants, staggerContainer, staggerItem } from '../../../../lib/animations/ceramic-motion';

interface JourneyDetailProps {
  spaceId: string;
  journeyId: string;
  onBack?: () => void;
}

export const JourneyDetail: React.FC<JourneyDetailProps> = ({
  spaceId,
  journeyId,
  onBack,
}) => {
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [journey, setJourney] = useState<any>(null);

  const { updateProgress, logTime, updateJourney } = useJourneys({
    spaceId,
    autoFetch: false,
  });

  const { notes, createNote } = useNotes({ spaceId, journeyId });

  // Fetch journey details
  useEffect(() => {
    const fetchJourney = async () => {
      // This would be replaced with actual journey fetch
      // For now, using placeholder
      setJourney({
        id: journeyId,
        title: 'Sample Journey',
        journey_type: 'course',
        progress_pct: 50,
        completed_modules: 5,
        total_modules: 10,
        logged_hours: 15,
        estimated_hours: 30,
        status: 'active',
      });
    };

    fetchJourney();
  }, [journeyId]);

  const handleCreateNote = async (payload: CreateNotePayload) => {
    try {
      await createNote({ ...payload, journey_id: journeyId });
      setShowNoteEditor(false);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  if (!journey) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
        <div className="ceramic-card p-8">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-700 animate-spin" />
            <span className="text-sm text-ceramic-text-secondary">
              Carregando jornada...
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
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para jornadas
          </button>
        )}

        {/* Journey Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="ceramic-inset w-12 h-12 flex items-center justify-center bg-blue-800">
              <BookOpen className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-ceramic-text-primary text-etched mb-1">
                {journey.title}
              </h1>
              <p className="text-sm text-ceramic-text-secondary flex items-center gap-2">
                <span className="ceramic-inset-shallow px-2 py-1 text-[10px] text-blue-700 uppercase tracking-wider bg-blue-50">
                  {journey.journey_type}
                </span>
                <span>•</span>
                <span>{journey.status === 'active' ? 'Em Progresso' : 'Concluído'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNoteEditor(true)}
            className="ceramic-card px-4 py-2 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-ceramic-text-primary">Nova Nota</span>
          </button>
        </div>

        {/* Progress Overview */}
        <div className="ceramic-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Progresso da Jornada
            </span>
            <span className="text-lg font-black text-blue-700">
              {journey.progress_pct}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${journey.progress_pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="ceramic-inset-shallow p-3 text-center bg-blue-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <GraduationCap className="w-4 h-4 text-blue-700" />
                <span className="text-base font-black text-blue-700">
                  {journey.completed_modules}/{journey.total_modules}
                </span>
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
                Módulos
              </div>
            </div>

            <div className="ceramic-inset-shallow p-3 text-center bg-amber-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-base font-black text-amber-600">
                  {journey.logged_hours}h/{journey.estimated_hours}h
                </span>
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider">
                Tempo
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {/* Progress Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Recursos
            </h2>
          </div>

          <motion.div
            className="ceramic-card p-4"
            variants={cardElevationVariants}
            initial="rest"
            whileHover="hover"
          >
            <JourneyProgress
              journey={journey}
              onUpdateProgress={(completed) => updateProgress(journeyId, completed)}
              onLogTime={(hours) => logTime(journeyId, hours)}
              onUpdate={(payload) => updateJourney(journeyId, payload)}
            />
          </motion.div>
        </section>

        {/* Notes Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Notas da Jornada
            </h2>
            <span className="text-xs text-ceramic-text-secondary/60">
              ({notes.length})
            </span>
          </div>

          {/* Note Editor */}
          <AnimatePresence>
            {showNoteEditor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="ceramic-card p-4">
                  <NoteEditor
                    onSave={handleCreateNote}
                    onCancel={() => setShowNoteEditor(false)}
                    journeyId={journeyId}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes List */}
          {notes.length === 0 ? (
            <motion.div
              className="ceramic-tray p-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-amber-50">
                <FileText className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-sm text-ceramic-text-secondary mb-4">
                Nenhuma nota ainda. Crie sua primeira nota para capturar insights.
              </p>
              <button
                onClick={() => setShowNoteEditor(true)}
                className="ceramic-card px-4 py-2 text-xs font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                Criar primeira nota
              </button>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {notes.map((note) => (
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
                      <h3 className="text-base font-bold text-ceramic-text-primary flex-1">
                        {note.title}
                      </h3>
                      <span className="ceramic-inset-shallow px-2 py-1 text-[10px] text-blue-700 uppercase tracking-wider bg-blue-50">
                        {note.note_type}
                      </span>
                    </div>
                    <p className="text-sm text-ceramic-text-secondary line-clamp-3 leading-relaxed">
                      {note.content}
                    </p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {note.tags.map((tag) => (
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

        {/* Time Tracking Stats */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Estatísticas de Tempo
            </h2>
          </div>

          <motion.div
            className="ceramic-card p-4"
            variants={cardElevationVariants}
            initial="rest"
            whileHover="hover"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-blue-700 mb-1">
                  {journey.logged_hours}h
                </div>
                <div className="text-xs text-ceramic-text-secondary">
                  Tempo Registrado
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-amber-600 mb-1">
                  {journey.estimated_hours - journey.logged_hours}h
                </div>
                <div className="text-xs text-ceramic-text-secondary">
                  Tempo Restante
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default JourneyDetail;
