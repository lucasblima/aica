/**
 * PodcastWizardForm Component
 *
 * Form content for creating a new podcast episode.
 * Extracted from StudioWizard to allow the wizard shell
 * to render different forms per project type.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Calendar,
  MapPin,
  Hash,
  ChevronDown
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface PodcastWizardFormProps {
  formData: {
    title: string;
    guestName: string;
    theme: string;
    description: string;
    scheduledDate: string;
    scheduledTime: string;
    location: string;
    season: string;
  };
  onChange: (field: string, value: string) => void;
  inputClasses: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCATIONS = [
  'Radio Tupi',
  'Estudio Remoto',
  'Podcast House',
  'Outro'
];

// ============================================================================
// COMPONENT
// ============================================================================

export const PodcastWizardForm: React.FC<PodcastWizardFormProps> = ({
  formData,
  onChange,
  inputClasses
}) => {
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
          Titulo *
        </label>
        <input
          data-testid="episode-title"
          type="text"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Ex: Conversa com Eduardo Paes"
          autoFocus
          className={inputClasses}
        />
      </div>

      {/* Guest Name */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
          <User className="w-3 h-3 inline mr-1" />
          Nome do Convidado *
        </label>
        <input
          data-testid="guest-name"
          type="text"
          value={formData.guestName}
          onChange={(e) => onChange('guestName', e.target.value)}
          placeholder="Ex: Joao Silva"
          className={inputClasses}
        />
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
          Tema *
        </label>
        <input
          type="text"
          value={formData.theme}
          onChange={(e) => onChange('theme', e.target.value)}
          placeholder="Ex: Politicas Publicas, Inovacao"
          className={inputClasses}
        />
      </div>

      {/* Optional Details — Collapsible */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowOptionalDetails(!showOptionalDetails)}
          className="flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <motion.div
            animate={{ rotate: showOptionalDetails ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
          Detalhes opcionais
        </button>

        <AnimatePresence>
          {showOptionalDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                    Descricao
                  </label>
                  <textarea
                    data-testid="episode-description"
                    value={formData.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    placeholder="Adicione detalhes sobre o episodio..."
                    rows={3}
                    className={`${inputClasses} resize-none`}
                  />
                </div>

                {/* Scheduling Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Data
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => onChange('scheduledDate', e.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => onChange('scheduledTime', e.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Local
                    </label>
                    <select
                      value={formData.location}
                      onChange={(e) => onChange('location', e.target.value)}
                      className={inputClasses}
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Season */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ceramic-text-primary mb-2">
                      <Hash className="w-3 h-3 inline mr-1" />
                      Temporada
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.season}
                      onChange={(e) => onChange('season', e.target.value)}
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
