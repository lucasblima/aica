import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('TaskCreationQuickAdd');

interface TaskCreationQuickAddProps {
  userId: string;
  onTaskCreated: () => void;
}

export const TaskCreationQuickAdd: React.FC<TaskCreationQuickAddProps> = ({
  userId,
  onTaskCreated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          title: title.trim(),
          is_urgent: false,
          is_important: false,
          archived: false,
          status: 'todo',
          priority: 'medium'
        });

      if (insertError) {
        log.error('Insert error:', insertError);
        setError('Erro ao criar tarefa. Tente novamente.');
        return;
      }

      // Success - reset form and notify parent
      setTitle('');
      setIsOpen(false);
      onTaskCreated();
    } catch (err) {
      log.error('Unexpected error:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setTitle('');
    setError(null);
  };

  return (
    <div className="ceramic-card p-4 rounded-2xl">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="add-button"
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-ceramic-text-secondary hover:text-ceramic-accent transition-colors group"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="ceramic-concave w-8 h-8 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold">Adicionar tarefa</span>
          </motion.button>
        ) : (
          <motion.form
            key="add-form"
            onSubmit={handleSubmit}
            className="space-y-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Input Field */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que você precisa fazer?"
                className="w-full px-4 py-3 bg-ceramic-base border-2 border-ceramic-text-secondary/20 rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:border-ceramic-accent transition-colors"
                autoFocus
                disabled={isLoading}
                maxLength={500}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs text-ceramic-error mt-2 ml-1"
                >
                  {error}
                </motion.p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !title.trim()}
                className="flex-1 ceramic-card px-4 py-2.5 rounded-xl text-sm font-bold text-ceramic-accent hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Criar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="ceramic-inset px-4 py-2.5 rounded-xl text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
