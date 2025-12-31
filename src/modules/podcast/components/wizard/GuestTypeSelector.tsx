/**
 * Guest Type Selector - Step 0 of Guest Identification Wizard
 *
 * Allows user to choose between two guest types:
 * 1. Public Figure: Person with Wikipedia, news articles, etc. - uses automatic search
 * 2. Direct Contact: Common person - manual entry (name, phone, email)
 *
 * This is the first step in the guest identification workflow.
 */

import React, { useState } from 'react';
import type { GuestType } from '../../types/wizard.types';

export interface GuestTypeSelectorProps {
  onSelectType: (type: GuestType) => void;
  onCancel: () => void;
}

export const GuestTypeSelector: React.FC<GuestTypeSelectorProps> = ({
  onSelectType,
  onCancel,
}) => {
  const [hoveredType, setHoveredType] = useState<GuestType | null>(null);

  const handleSelectType = (type: GuestType) => {
    onSelectType(type);
  };

  return (
    <div className="ceramic-card p-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-ceramic-text-primary">
          Quem é seu convidado?
        </h2>
        <p className="text-ceramic-text-secondary">
          Escolha como deseja identificar seu convidado para o podcast
        </p>
      </div>

      {/* Type Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Public Figure Card */}
        <button
          data-testid="guest-type-public-figure"
          onClick={() => handleSelectType('public-figure')}
          onMouseEnter={() => setHoveredType('public-figure')}
          onMouseLeave={() => setHoveredType(null)}
          className={`
            ceramic-card p-6 text-left cursor-pointer transition-all duration-200
            ${hoveredType === 'public-figure'
              ? 'scale-[1.02] ring-2 ring-amber-500 shadow-xl'
              : 'hover:shadow-lg'
            }
          `}
        >
          {/* Icon */}
          <div className="mb-4 text-4xl">
            👤
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Figura Pública
          </h3>

          {/* Method Label */}
          <div className="mb-3">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
              Busca automática
            </span>
          </div>

          {/* Description */}
          <p className="text-ceramic-text-secondary text-sm leading-relaxed">
            Para pessoas conhecidas que aparecem em Wikipedia, notícias, ou possuem presença pública significativa.
          </p>

          {/* Features List */}
          <ul className="mt-4 space-y-2 text-sm text-ceramic-text-secondary">
            <li className="flex items-start">
              <span className="mr-2 text-amber-500">✓</span>
              <span>Busca automática de informações</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-amber-500">✓</span>
              <span>Biografia e contexto gerados por IA</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-amber-500">✓</span>
              <span>Notícias e fatos recentes</span>
            </li>
          </ul>
        </button>

        {/* Direct Contact Card */}
        <button
          data-testid="guest-type-common-person"
          onClick={() => handleSelectType('direct-contact')}
          onMouseEnter={() => setHoveredType('direct-contact')}
          onMouseLeave={() => setHoveredType(null)}
          className={`
            ceramic-card p-6 text-left cursor-pointer transition-all duration-200
            ${hoveredType === 'direct-contact'
              ? 'scale-[1.02] ring-2 ring-blue-500 shadow-xl'
              : 'hover:shadow-lg'
            }
          `}
        >
          {/* Icon */}
          <div className="mb-4 text-4xl">
            📝
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">
            Contato Direto
          </h3>

          {/* Method Label */}
          <div className="mb-3">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              Cadastro manual
            </span>
          </div>

          {/* Description */}
          <p className="text-ceramic-text-secondary text-sm leading-relaxed">
            Para pessoas comuns ou contatos diretos que você conhece pessoalmente.
          </p>

          {/* Features List */}
          <ul className="mt-4 space-y-2 text-sm text-ceramic-text-secondary">
            <li className="flex items-start">
              <span className="mr-2 text-blue-500">✓</span>
              <span>Cadastro rápido e manual</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-blue-500">✓</span>
              <span>Nome, telefone e email</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-blue-500">✓</span>
              <span>Informações personalizadas</span>
            </li>
          </ul>
        </button>
      </div>

      {/* Info Box - Tip */}
      <div className="ceramic-inset p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-2xl flex-shrink-0">💡</div>
          <div className="text-sm text-ceramic-text-secondary leading-relaxed">
            <strong className="text-ceramic-text-primary">Dica:</strong> Se o convidado tem Wikipedia, página pública ou aparece em notícias, escolha <strong className="text-amber-600">"Figura Pública"</strong> para busca automática de informações. Para contatos pessoais ou pessoas sem presença pública, use <strong className="text-blue-600">"Contato Direto"</strong>.
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      <div className="text-center">
        <button
          data-testid="guest-wizard-cancel"
          onClick={onCancel}
          className="text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default GuestTypeSelector;
