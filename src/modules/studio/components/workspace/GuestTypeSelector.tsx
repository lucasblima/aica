/**
 * GuestTypeSelector Component
 *
 * Simple selector for categorizing guests as Public Figures or Common People.
 * Migrated from _deprecated/modules/podcast/components/GuestTypeSelector.tsx
 *
 * Wave 5 - Stream 1: Setup Stage Components Migration
 * - Updated imports to new module structure
 * - Applied Ceramic Design System patterns
 * - Enhanced accessibility (WCAG 2.1 AA)
 * - Maintained framer-motion animations
 * - Preserved Jony Ive design principles: simplicity, clarity, focus
 *
 * Design Philosophy:
 * - Public Figure: People with Wikipedia presence, public recognition
 * - Direct Contact: Regular people without broad public recognition
 *
 * @module studio/components/workspace
 */

import React from 'react';
import { motion } from 'framer-motion';
import { User, Users, Sparkles, Phone } from 'lucide-react';

export type GuestCategory = 'public_figure' | 'common_person';

interface GuestTypeSelectorProps {
  /** Currently selected guest type */
  selectedType: GuestCategory | null;
  /** Callback when guest type is selected */
  onSelect: (type: GuestCategory) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * GuestTypeSelector - Elegant guest categorization component
 *
 * Allows users to choose between two guest types:
 * 1. Public Figure - Automated search via Wikipedia, news, social media
 * 2. Direct Contact - Manual entry of name, phone, email
 *
 * Accessibility Features:
 * - ARIA radio group semantics
 * - Keyboard navigation support
 * - Screen reader announcements
 * - Focus indicators
 * - Color contrast compliance
 */
export const GuestTypeSelector: React.FC<GuestTypeSelectorProps> = ({
  selectedType,
  onSelect,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`} data-testid="guest-type-selector">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-ceramic-text-primary">
          Quem é seu convidado?
        </h2>
        <p className="text-sm text-ceramic-secondary">
          Escolha o tipo para otimizar a pesquisa
        </p>
      </div>

      {/* Accessibility: Fieldset with legend for grouped radio buttons */}
      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <legend className="sr-only">Tipo de convidado</legend>

        {/* Public Figure Option */}
        <motion.button
          type="button"
          onClick={() => onSelect('public_figure')}
          data-testid="guest-type-public-figure"
          role="radio"
          aria-checked={selectedType === 'public_figure'}
          aria-label="Figura Pública - Pessoas conhecidas publicamente com busca automática via Wikipedia, notícias e redes sociais"
          className={`
            relative p-6 rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4 focus:ring-ceramic-accent/30
            ${
              selectedType === 'public_figure'
                ? 'border-ceramic-accent bg-ceramic-accent shadow-lg'
                : 'border-ceramic-border bg-ceramic-base hover:border-ceramic-accent/50 hover:shadow-md'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Selection indicator */}
          {selectedType === 'public_figure' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-ceramic-accent rounded-full flex items-center justify-center shadow-lg"
              aria-hidden="true"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          )}

          <div className="flex flex-col items-center text-center space-y-3">
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center transition-colors
                ${
                  selectedType === 'public_figure'
                    ? 'bg-ceramic-accent'
                    : 'bg-ceramic-surface-hover'
                }
              `}
              aria-hidden="true"
            >
              <Users
                className={`w-8 h-8 ${
                  selectedType === 'public_figure'
                    ? 'text-white'
                    : 'text-ceramic-secondary'
                }`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ceramic-text-primary">
                Figura Pública
              </h3>
              <p className="text-sm text-ceramic-secondary mt-1">
                Pessoas conhecidas publicamente
              </p>
            </div>

            <div className="text-xs text-ceramic-secondary space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" aria-hidden="true" />
                <span>Busca automática</span>
              </div>
              <div>Wikipedia, notícias, redes sociais</div>
            </div>
          </div>
        </motion.button>

        {/* Common Person Option */}
        <motion.button
          type="button"
          onClick={() => onSelect('common_person')}
          data-testid="guest-type-common-person"
          role="radio"
          aria-checked={selectedType === 'common_person'}
          aria-label="Contato Direto - Pessoas sem presença pública ampla com cadastro manual de nome, telefone e email"
          className={`
            relative p-6 rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4 focus:ring-ceramic-success/30
            ${
              selectedType === 'common_person'
                ? 'border-ceramic-success bg-ceramic-success-bg shadow-lg'
                : 'border-ceramic-border bg-ceramic-base hover:border-ceramic-success/50 hover:shadow-md'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Selection indicator */}
          {selectedType === 'common_person' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-ceramic-success rounded-full flex items-center justify-center shadow-lg"
              aria-hidden="true"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          )}

          <div className="flex flex-col items-center text-center space-y-3">
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center transition-colors
                ${
                  selectedType === 'common_person'
                    ? 'bg-ceramic-success'
                    : 'bg-ceramic-surface-hover'
                }
              `}
              aria-hidden="true"
            >
              <User
                className={`w-8 h-8 ${
                  selectedType === 'common_person'
                    ? 'text-white'
                    : 'text-ceramic-secondary'
                }`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-ceramic-text-primary">
                Contato Direto
              </h3>
              <p className="text-sm text-ceramic-secondary mt-1">
                Pessoas sem presença pública ampla
              </p>
            </div>

            <div className="text-xs text-ceramic-secondary space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Phone className="w-3 h-3" aria-hidden="true" />
                <span>Cadastro manual</span>
              </div>
              <div>Nome, telefone e email</div>
            </div>
          </div>
        </motion.button>
      </fieldset>

      {/* Help text */}
      <div
        className="mt-6 p-4 bg-ceramic-surface-hover rounded-lg border border-ceramic-border"
        role="note"
        aria-label="Dica de uso"
      >
        <p className="text-xs text-ceramic-secondary text-center">
          <strong>Dica:</strong> Se o convidado tem Wikipedia ou é conhecido
          publicamente, escolha "Figura Pública". Caso contrário, escolha
          "Contato Direto".
        </p>
      </div>
    </div>
  );
};

export default GuestTypeSelector;
