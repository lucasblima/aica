/**
 * SubtaskList Component
 * Inline checklist for managing subtasks within a parent task
 */

import React, { useState } from 'react';
import { Trash2, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Subtask interface
 */
export interface Subtask {
  id: string; // Temporary UUID or database ID
  title: string;
  is_completed: boolean;
  order: number;
}

interface SubtaskListProps {
  /** Array of subtasks */
  subtasks: Subtask[];
  /** Callback when subtasks change */
  onChange: (subtasks: Subtask[]) => void;
  /** Optional custom class */
  className?: string;
}

/**
 * Generate temporary UUID for new subtasks
 */
function generateTempId(): string {
  return `temp-${Math.random().toString(36).substr(2, 9)}`;
}

export function SubtaskList({
  subtasks,
  onChange,
  className = ''
}: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [error, setError] = useState('');

  /**
   * Add a new subtask
   */
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) {
      setError('Subtarefa não pode estar vazia');
      return;
    }

    if (newSubtaskTitle.length > 200) {
      setError('Subtarefa deve ter no máximo 200 caracteres');
      return;
    }

    const newSubtask: Subtask = {
      id: generateTempId(),
      title: newSubtaskTitle.trim(),
      is_completed: false,
      order: subtasks.length,
    };

    onChange([...subtasks, newSubtask]);
    setNewSubtaskTitle('');
    setError('');
  };

  /**
   * Toggle subtask completion
   */
  const handleToggleSubtask = (id: string) => {
    onChange(
      subtasks.map(st =>
        st.id === id ? { ...st, is_completed: !st.is_completed } : st
      )
    );
  };

  /**
   * Update subtask title
   */
  const handleUpdateSubtask = (id: string, newTitle: string) => {
    if (newTitle.length > 200) return;

    onChange(
      subtasks.map(st =>
        st.id === id ? { ...st, title: newTitle } : st
      )
    );
  };

  /**
   * Delete a subtask
   */
  const handleDeleteSubtask = (id: string) => {
    onChange(subtasks.filter(st => st.id !== id));
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Existing Subtasks */}
      <div className="space-y-2">
        {subtasks.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-ceramic-text-secondary">
              Nenhuma subtarefa adicionada
            </p>
          </div>
        ) : (
          subtasks.map((subtask, index) => (
            <motion.div
              key={subtask.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3 ceramic-inset p-3 rounded-lg group"
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleSubtask(subtask.id)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  subtask.is_completed
                    ? 'bg-ceramic-accent border-ceramic-accent'
                    : 'border-ceramic-text-secondary hover:border-ceramic-accent'
                }`}
              >
                {subtask.is_completed && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>

              {/* Title */}
              <input
                type="text"
                value={subtask.title}
                onChange={(e) => handleUpdateSubtask(subtask.id, e.target.value)}
                placeholder="Título da subtarefa"
                className={`flex-1 bg-transparent text-sm font-medium outline-none transition-all ${
                  subtask.is_completed
                    ? 'text-ceramic-text-secondary line-through'
                    : 'text-ceramic-text-primary'
                }`}
                maxLength={200}
              />

              {/* Character count */}
              <span className="text-xs text-ceramic-text-tertiary flex-shrink-0">
                {subtask.title.length}/200
              </span>

              {/* Delete Button */}
              <button
                onClick={() => handleDeleteSubtask(subtask.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Deletar subtarefa"
              >
                <Trash2 className="w-4 h-4 text-ceramic-negative hover:scale-110 transition-transform" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Add New Subtask */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => {
              setNewSubtaskTitle(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="+ Nova subtarefa (Enter para adicionar)"
            maxLength={200}
            className="flex-1 ceramic-inset px-3 py-2 rounded-lg text-sm placeholder-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          <button
            onClick={handleAddSubtask}
            disabled={!newSubtaskTitle.trim()}
            className="flex-shrink-0 ceramic-concave p-2 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            title="Adicionar subtarefa"
          >
            <Plus className="w-4 h-4 text-ceramic-text-primary" />
          </button>
        </div>

        {/* Character counter */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-ceramic-text-tertiary">
            {newSubtaskTitle.length}/200
          </span>
          {error && (
            <span className="text-xs text-ceramic-negative font-medium">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {subtasks.length > 0 && (
        <div className="pt-2 border-t border-ceramic-text-secondary/10 flex justify-between items-center text-xs text-ceramic-text-secondary">
          <span>
            {subtasks.filter(st => st.is_completed).length} de {subtasks.length} concluídas
          </span>
          {subtasks.filter(st => st.is_completed).length === subtasks.length && subtasks.length > 0 && (
            <span className="text-ceramic-positive font-bold">✓ Completo</span>
          )}
        </div>
      )}
    </div>
  );
}

export default SubtaskList;
