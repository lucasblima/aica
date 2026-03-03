import React from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

interface DossierInsertPreviewProps {
  text: string;
  targetSection: string;
  onInsert: () => void;
  onDismiss: () => void;
}

export function DossierInsertPreview({ text, targetSection, onInsert, onDismiss }: DossierInsertPreviewProps) {
  const sectionLabel = targetSection === 'bio' ? 'Biografia' : targetSection === 'ficha' ? 'Ficha Tecnica' : 'Noticias';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="my-3 p-4 rounded-xl bg-ceramic-info/10 border-l-4 border-ceramic-info"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-ceramic-info">
          Preview — sera inserido em: {sectionLabel}
        </span>
        <button onClick={onDismiss} className="p-1 hover:bg-ceramic-cool rounded">
          <X className="w-3.5 h-3.5 text-ceramic-text-secondary" />
        </button>
      </div>
      <p className="text-sm text-ceramic-text-primary whitespace-pre-wrap mb-3">{text}</p>
      <button
        onClick={onInsert}
        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Inserir no Dossie
      </button>
    </motion.div>
  );
}
