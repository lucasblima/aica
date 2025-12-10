/**
 * GuestTypeSelector Component
 *
 * Simple selector for categorizing guests as Public Figures or Common People.
 * Based on Jony Ive design principles: simplicity, clarity, focus.
 *
 * Public Figure: People with Wikipedia presence, public recognition
 * Common Person: Regular people without broad public recognition
 */

import React from 'react'
import { motion } from 'framer-motion'
import { User, Users, Sparkles, Phone } from 'lucide-react'

export type GuestCategory = 'public_figure' | 'common_person'

interface GuestTypeSelectorProps {
  selectedType: GuestCategory | null
  onSelect: (type: GuestCategory) => void
  className?: string
}

export const GuestTypeSelector: React.FC<GuestTypeSelectorProps> = ({
  selectedType,
  onSelect,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`} data-testid="guest-type-selector">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          Quem é seu convidado?
        </h2>
        <p className="text-sm text-gray-600">
          Escolha o tipo para otimizar a pesquisa
        </p>
      </div>

      {/* Accessibility: Fieldset with legend for grouped radio buttons */}
      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <legend className="sr-only">Tipo de convidado</legend>

        {/* Public Figure Option */}
        <motion.button
          onClick={() => onSelect('public_figure')}
          data-testid="guest-type-public-figure"
          role="radio"
          aria-checked={selectedType === 'public_figure'}
          aria-label="Figura Pública - Pessoas conhecidas publicamente com busca automática via Wikipedia, notícias e redes sociais"
          className={`
            relative p-6 rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4 focus:ring-blue-500/50
            ${
              selectedType === 'public_figure'
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
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
              className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          )}

          <div className="flex flex-col items-center text-center space-y-3">
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${
                  selectedType === 'public_figure'
                    ? 'bg-blue-500'
                    : 'bg-gray-100'
                }
              `}
            >
              <Users
                className={`w-8 h-8 ${
                  selectedType === 'public_figure'
                    ? 'text-white'
                    : 'text-gray-600'
                }`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Figura Pública
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Pessoas conhecidas publicamente
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Busca automática</span>
              </div>
              <div>Wikipedia, notícias, redes sociais</div>
            </div>
          </div>
        </motion.button>

        {/* Common Person Option */}
        <motion.button
          onClick={() => onSelect('common_person')}
          data-testid="guest-type-common-person"
          role="radio"
          aria-checked={selectedType === 'common_person'}
          aria-label="Pessoa Comum - Pessoas sem presença pública ampla com cadastro manual de nome, telefone e email"
          className={`
            relative p-6 rounded-xl border-2 transition-all
            focus:outline-none focus:ring-4 focus:ring-green-500/50
            ${
              selectedType === 'common_person'
                ? 'border-green-500 bg-green-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
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
              className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>
          )}

          <div className="flex flex-col items-center text-center space-y-3">
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${
                  selectedType === 'common_person'
                    ? 'bg-green-500'
                    : 'bg-gray-100'
                }
              `}
            >
              <User
                className={`w-8 h-8 ${
                  selectedType === 'common_person'
                    ? 'text-white'
                    : 'text-gray-600'
                }`}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Pessoa Comum
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Pessoas sem presença pública ampla
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Phone className="w-3 h-3" />
                <span>Cadastro manual</span>
              </div>
              <div>Nome, telefone e email</div>
            </div>
          </div>
        </motion.button>
      </fieldset>

      {/* Help text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          <strong>Dica:</strong> Se o convidado tem Wikipedia ou é conhecido
          publicamente, escolha "Figura Pública". Caso contrário, escolha
          "Pessoa Comum".
        </p>
      </div>
    </div>
  )
}

export default GuestTypeSelector
