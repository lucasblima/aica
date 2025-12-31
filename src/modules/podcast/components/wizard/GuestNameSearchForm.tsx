/**
 * Guest Name Search Form - Step 1a of Guest Identification Wizard
 *
 * Form for searching public figure guests via Gemini API.
 * User provides name and optional reference/context to help identify the correct person.
 *
 * This is the first step after selecting "Public Figure" (Figura Pública).
 *
 * Features:
 * - Name field (required, min 3 characters)
 * - Reference field (optional but recommended)
 * - Info box explaining how reference helps
 * - Loading state during search
 * - Back navigation
 *
 * Data Test IDs:
 * - guest-wizard-name: Name input field
 * - guest-wizard-reference: Reference textarea
 * - guest-wizard-search: Search button
 * - guest-wizard-back-step1: Back button
 */

import React, { useState } from 'react';

export interface GuestNameSearchFormProps {
  initialData?: {
    name: string;
    reference: string;
  };
  onSearch: (data: { name: string; reference: string }) => Promise<void>;
  onBack: () => void;
  isSearching?: boolean;
}

export const GuestNameSearchForm: React.FC<GuestNameSearchFormProps> = ({
  initialData,
  onSearch,
  onBack,
  isSearching = false,
}) => {
  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [reference, setReference] = useState(initialData?.reference || '');
  const [nameError, setNameError] = useState<string | null>(null);

  // Validation
  const validateName = (value: string): boolean => {
    if (value.trim().length === 0) {
      setNameError('Nome é obrigatório');
      return false;
    }
    if (value.trim().length < 3) {
      setNameError('Nome deve ter pelo menos 3 caracteres');
      return false;
    }
    setNameError(null);
    return true;
  };

  // Handlers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    // Clear error while typing
    if (nameError) {
      setNameError(null);
    }
  };

  const handleNameBlur = () => {
    if (name.trim().length > 0) {
      validateName(name);
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReference(e.target.value);
  };

  const handleSearch = async () => {
    // Validate before submitting
    if (!validateName(name)) {
      return;
    }

    // Call parent search handler
    await onSearch({
      name: name.trim(),
      reference: reference.trim(),
    });
  };

  // Check if search button should be disabled
  const isSearchDisabled = isSearching || name.trim().length < 3;

  return (
    <div className="ceramic-card p-8 space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-ceramic-text-primary">
          Quem será entrevistado?
        </h2>
        <p className="text-ceramic-text-secondary">
          Busca automática de informações
        </p>
      </div>

      {/* Name Field */}
      <div className="space-y-2">
        <label
          htmlFor="guest-name"
          className="block text-sm font-medium text-ceramic-text-primary"
        >
          Nome do convidado <span className="text-red-500">*</span>
        </label>
        <input
          id="guest-name"
          data-testid="guest-wizard-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          placeholder="Ex: Elon Musk"
          disabled={isSearching}
          className={`
            ceramic-input w-full
            ${nameError ? 'border-red-500 focus:ring-red-500' : ''}
            ${isSearching ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        />
        {nameError && (
          <p className="text-sm text-red-600">{nameError}</p>
        )}
      </div>

      {/* Reference Field */}
      <div className="space-y-2">
        <label
          htmlFor="guest-reference"
          className="block text-sm font-medium text-ceramic-text-primary"
        >
          Referência ou contexto
        </label>
        <textarea
          id="guest-reference"
          data-testid="guest-wizard-reference"
          value={reference}
          onChange={handleReferenceChange}
          placeholder="Ex: CEO Tesla, empreendedor"
          disabled={isSearching}
          rows={3}
          className={`
            ceramic-input w-full resize-none
            ${isSearching ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        />
        <p className="text-xs text-ceramic-text-secondary">
          Opcional, mas recomendado para melhor precisão na busca
        </p>
      </div>

      {/* Info Box - Reference Guidance */}
      <div className="ceramic-inset p-4 rounded-lg space-y-3">
        <div className="flex items-start space-x-3">
          <div className="text-xl flex-shrink-0">ℹ️</div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-ceramic-text-secondary leading-relaxed">
              A <strong className="text-ceramic-text-primary">referência</strong> ajuda a buscar a pessoa correta. Adicione cargo, empresa ou área de atuação para melhor resultado.
            </p>
          </div>
        </div>

        {/* Examples */}
        <div className="ml-8 space-y-1">
          <p className="text-sm font-medium text-ceramic-text-primary">💡 Exemplos:</p>
          <ul className="text-sm text-ceramic-text-secondary space-y-1">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>"Presidente do Brasil"</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>"Fundador da Microsoft"</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>"Cientista, física quântica"</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center gap-4 pt-4">
        {/* Back Button */}
        <button
          data-testid="guest-wizard-back-step1"
          onClick={onBack}
          disabled={isSearching}
          className={`
            ceramic-button-secondary
            ${isSearching ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          ◀ Voltar
        </button>

        {/* Search Button */}
        <button
          data-testid="guest-wizard-search"
          onClick={handleSearch}
          disabled={isSearchDisabled}
          className={`
            ceramic-button-primary flex items-center gap-2
            ${isSearchDisabled ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          {isSearching ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Buscar Perfil</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GuestNameSearchForm;
