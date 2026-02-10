/**
 * Episode Details Form - Step 3 (Final) of Guest Identification Wizard
 *
 * This is the final step for both Public Figure and Direct Contact workflows.
 * User defines episode details:
 * - Theme (Aica Auto vs Manual)
 * - Season (default: 1)
 * - Location (Estúdio Remoto, Presencial, etc.)
 * - Scheduled Date/Time (optional)
 *
 * Features:
 * - Aica Auto: Generates theme automatically based on guest name
 * - Manual: User enters custom theme
 * - Validation: Theme required in manual mode
 * - Complete button disabled if validation fails
 */

import React, { useState, useEffect } from 'react';

export interface EpisodeDetailsFormProps {
  guestName: string; // For generating automatic theme
  initialData?: {
    theme?: string;
    season?: number;
    location?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    themeMode?: 'auto' | 'manual';
  };
  onSubmit: (data: {
    theme: string;
    themeMode: 'auto' | 'manual';
    season: number;
    location: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }) => void;
  onBack: () => void;
  isLoading?: boolean; // For showing loading state during save
}

/**
 * Auto-generate episode theme based on guest name
 * Uses randomized topics for variety
 */
const generateAutoTheme = (guestName: string): string => {
  const topics = [
    'empreendedorismo e inovação',
    'liderança e transformação',
    'tecnologia e sociedade',
    'arte e cultura',
    'ciência e descobertas',
    'sustentabilidade e futuro',
    'educação e desenvolvimento',
    'saúde e bem-estar',
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  return `Conversa com ${guestName} sobre ${randomTopic}`;
};

export const EpisodeDetailsForm: React.FC<EpisodeDetailsFormProps> = ({
  guestName,
  initialData,
  onSubmit,
  onBack,
  isLoading = false,
}) => {
  // Theme mode state (auto vs manual)
  const [themeMode, setThemeMode] = useState<'auto' | 'manual'>(
    initialData?.themeMode || 'auto'
  );

  // Form data state
  const [formData, setFormData] = useState({
    theme: initialData?.theme || '',
    season: initialData?.season || 1,
    location: initialData?.location || 'Estúdio Remoto',
    scheduledDate: initialData?.scheduledDate || '',
    scheduledTime: initialData?.scheduledTime || '',
  });

  // Auto-generated theme state
  const [autoTheme, setAutoTheme] = useState<string>('');

  // Generate auto theme when component mounts or guest name changes
  useEffect(() => {
    if (guestName) {
      const generated = generateAutoTheme(guestName);
      setAutoTheme(generated);

      // If in auto mode and no theme set yet, use generated theme
      if (themeMode === 'auto' && !formData.theme) {
        setFormData((prev) => ({ ...prev, theme: generated }));
      }
    }
  }, [guestName]);

  // Handle theme mode toggle
  const handleThemeModeChange = (mode: 'auto' | 'manual') => {
    setThemeMode(mode);

    if (mode === 'auto') {
      // Switch to auto: use auto-generated theme
      setFormData((prev) => ({ ...prev, theme: autoTheme }));
    } else {
      // Switch to manual: clear theme for user input
      setFormData((prev) => ({ ...prev, theme: '' }));
    }
  };

  // Handle input changes
  const handleChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validate form
  const isFormValid = (): boolean => {
    // Theme is required
    if (formData.theme.trim() === '') {
      return false;
    }

    // Season must be >= 1
    if (formData.season < 1) {
      return false;
    }

    // Location is required
    if (formData.location.trim() === '') {
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isFormValid()) {
      onSubmit({
        theme: formData.theme.trim(),
        themeMode,
        season: formData.season,
        location: formData.location,
        scheduledDate: formData.scheduledDate || undefined,
        scheduledTime: formData.scheduledTime || undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="ceramic-card p-8 space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-ceramic-text-primary">
          Detalhes do Episódio
        </h2>
        <p className="text-ceramic-text-secondary">
          Configure as informações do episódio
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-5">
        {/* Theme Section */}
        <div>
          <label className="block text-sm font-medium text-ceramic-text-primary mb-3">
            Tema da Conversa <span className="text-ceramic-error">*</span>
          </label>

          {/* Toggle Buttons: Aica Auto vs Manual */}
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              data-testid="episode-theme-auto-button"
              onClick={() => handleThemeModeChange('auto')}
              className={`
                flex-1 px-4 py-3 rounded-xl font-medium transition-all
                ${
                  themeMode === 'auto'
                    ? 'bg-amber-500 text-white shadow-lg scale-[1.02]'
                    : 'bg-ceramic-surface text-ceramic-text-secondary hover:bg-ceramic-surface/80'
                }
              `}
            >
              <span className="mr-2">⚡</span>
              Aica Auto
            </button>

            <button
              type="button"
              data-testid="episode-theme-manual-button"
              onClick={() => handleThemeModeChange('manual')}
              className={`
                flex-1 px-4 py-3 rounded-xl font-medium transition-all
                ${
                  themeMode === 'manual'
                    ? 'bg-ceramic-accent text-white shadow-lg scale-[1.02]'
                    : 'bg-ceramic-surface text-ceramic-text-secondary hover:bg-ceramic-surface/80'
                }
              `}
            >
              <span className="mr-2">✏️</span>
              Manual
            </button>
          </div>

          {/* Theme Input */}
          {themeMode === 'auto' ? (
            <div className="ceramic-inset p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-xl flex-shrink-0">🤖</div>
                <div className="text-sm">
                  <div className="text-ceramic-text-secondary mb-1">
                    Tema gerado automaticamente:
                  </div>
                  <div className="text-ceramic-text-primary font-medium">
                    "{autoTheme}"
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <input
              type="text"
              data-testid="episode-theme-input"
              placeholder="Ex: Políticas Públicas, Empreendedorismo Social..."
              value={formData.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="ceramic-input w-full"
            />
          )}
        </div>

        {/* Season Field */}
        <div>
          <label
            htmlFor="episode-season"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Temporada <span className="text-ceramic-error">*</span>
          </label>
          <input
            id="episode-season"
            type="number"
            data-testid="episode-season-input"
            min="1"
            max="100"
            value={formData.season}
            onChange={(e) => handleChange('season', parseInt(e.target.value, 10))}
            className="ceramic-input w-full"
          />
        </div>

        {/* Location Field */}
        <div>
          <label
            htmlFor="episode-location"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Localização <span className="text-ceramic-error">*</span>
          </label>
          <select
            id="episode-location"
            data-testid="episode-location-select"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="ceramic-input w-full"
          >
            <option value="Estúdio Remoto">Estúdio Remoto</option>
            <option value="Presencial - Estúdio Aica">
              Presencial - Estúdio Aica
            </option>
            <option value="Presencial - Local do Convidado">
              Presencial - Local do Convidado
            </option>
            <option value="Presencial - Outro Local">
              Presencial - Outro Local
            </option>
          </select>
        </div>

        {/* Date and Time (Optional) */}
        <div>
          <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
            Data e Hora (opcional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Date */}
            <input
              type="date"
              data-testid="episode-date-input"
              value={formData.scheduledDate}
              onChange={(e) => handleChange('scheduledDate', e.target.value)}
              className="ceramic-input w-full"
            />

            {/* Time */}
            <input
              type="time"
              data-testid="episode-time-input"
              value={formData.scheduledTime}
              onChange={(e) => handleChange('scheduledTime', e.target.value)}
              className="ceramic-input w-full"
            />
          </div>
        </div>
      </div>

      {/* Info Box - Tip */}
      <div className="ceramic-inset p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-xl flex-shrink-0">💡</div>
          <div className="text-sm text-ceramic-text-secondary leading-relaxed">
            <strong className="text-ceramic-text-primary">Dica:</strong> Use{' '}
            <strong className="text-amber-600">"Aica Auto"</strong> para gerar
            um tema automaticamente baseado no convidado. Você pode sempre editar
            depois na fase de pré-produção.
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-between">
        <button
          type="button"
          data-testid="guest-wizard-back-step3"
          onClick={onBack}
          className="ceramic-button-secondary px-6 py-3 rounded-xl font-bold transition-all"
        >
          ◀ Voltar
        </button>

        <button
          type="submit"
          data-testid="guest-wizard-complete"
          disabled={!isFormValid() || isLoading}
          className={`
            px-6 py-3 rounded-xl font-bold transition-all
            ${
              isFormValid() && !isLoading
                ? 'ceramic-button-primary'
                : 'bg-ceramic-cool text-ceramic-text-tertiary cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>✓ Completar</>
          )}
        </button>
      </div>
    </form>
  );
};

export default EpisodeDetailsForm;
