/**
 * TagInput Component
 * Free-form tag input with color-coded pills
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface TagInputProps {
  /** Array of tags */
  tags: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Optional custom class */
  className?: string;
}

/**
 * Generate a consistent color for a tag based on its name
 */
function getTagColor(tag: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-300',
    'bg-purple-100 text-purple-700 border-purple-300',
    'bg-pink-100 text-pink-700 border-pink-300',
    'bg-amber-100 text-amber-700 border-amber-300',
    'bg-emerald-100 text-emerald-700 border-emerald-300',
    'bg-cyan-100 text-cyan-700 border-cyan-300',
    'bg-indigo-100 text-indigo-700 border-indigo-300',
    'bg-rose-100 text-rose-700 border-rose-300',
  ];

  // Use hash of tag name to pick color consistently
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

export function TagInput({
  tags,
  onChange,
  className = ''
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  /**
   * Add a new tag on Enter or comma
   */
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();

    // Validation
    if (!trimmedTag) {
      setError('Etiqueta não pode estar vazia');
      return;
    }

    if (trimmedTag.length > 50) {
      setError('Etiqueta deve ter no máximo 50 caracteres');
      return;
    }

    if (tags.includes(trimmedTag)) {
      setError('Essa etiqueta já foi adicionada');
      return;
    }

    if (tags.length >= 20) {
      setError('Máximo de 20 etiquetas');
      return;
    }

    onChange([...tags, trimmedTag]);
    setInput('');
    setError('');
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(input);
    } else if (e.key === ',') {
      e.preventDefault();
      handleAddTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      // Delete last tag on backspace if input is empty
      onChange(tags.slice(0, -1));
    }
  };

  /**
   * Remove a tag
   */
  const handleRemoveTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tag Pills */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <div className="w-full text-center py-2">
            <p className="text-sm text-ceramic-text-secondary">
              Nenhuma etiqueta adicionada
            </p>
          </div>
        ) : (
          tags.map((tag, index) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getTagColor(
                tag
              )} group/tag hover:scale-105 transition-transform`}
            >
              <span className="capitalize">{tag}</span>
              <button
                onClick={() => handleRemoveTag(index)}
                className="opacity-70 group-hover/tag:opacity-100 transition-opacity hover:scale-110"
                title={`Remover etiqueta "${tag}"`}
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Input Field */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma etiqueta (Enter ou , para adicionar)"
            className="flex-1 ceramic-inset px-3 py-2 rounded-lg text-sm placeholder-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            maxLength={50}
          />
        </div>

        {/* Info Text */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-ceramic-text-tertiary">
            {tags.length}/20 etiquetas • {input.length}/50 caracteres
          </span>
          {error && (
            <span className="text-ceramic-negative font-medium">
              {error}
            </span>
          )}
        </div>
      </div>

      {/* Suggestions/Hints */}
      <div className="ceramic-inset p-3 rounded-lg space-y-2">
        <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
          Dicas
        </p>
        <ul className="text-xs text-ceramic-text-tertiary space-y-1">
          <li>• Use Enter ou , para adicionar uma etiqueta</li>
          <li>• Etiquetas são convertidas em minúsculas</li>
          <li>• Máximo 20 etiquetas, 50 caracteres cada</li>
          <li>• Pressione Backspace com campo vazio para remover última</li>
        </ul>
      </div>
    </div>
  );
}

export default TagInput;
