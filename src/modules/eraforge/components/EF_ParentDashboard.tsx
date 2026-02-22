/**
 * EF_ParentDashboard - Parental controls screen
 *
 * PIN entry, child management, and session limit settings.
 * Protected area for parents to configure EraForge.
 */

import React, { useState } from 'react';
import type { ChildProfile, ParentalSettings } from '../types/eraforge.types';

interface EF_ParentDashboardProps {
  children: ChildProfile[];
  settings: ParentalSettings | null;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onUpdateSettings: (updates: { max_turns_per_day?: number; voice_enabled?: boolean }) => void;
  onAddChild: () => void;
  onBack: () => void;
}

export function EF_ParentDashboard({
  children: childProfiles,
  settings,
  onVerifyPin,
  onUpdateSettings,
  onAddChild,
  onBack,
}: EF_ParentDashboardProps) {
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handlePinSubmit = async () => {
    if (pin.length < 4) return;
    setVerifying(true);
    setPinError(false);

    const valid = await onVerifyPin(pin);
    if (valid) {
      setIsVerified(true);
    } else {
      setPinError(true);
      setPin('');
    }
    setVerifying(false);
  };

  // PIN Entry
  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-ceramic-base">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="text-4xl">🔒</div>
          <h1
            className="text-2xl font-bold text-ceramic-text-primary"
            style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
          >
            Area dos Pais
          </h1>
          <p className="text-sm text-ceramic-text-secondary">
            Digite o PIN para acessar
          </p>

          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${
                  pin.length > i
                    ? 'bg-amber-100 text-amber-600 shadow-ceramic-emboss'
                    : 'bg-ceramic-inset text-ceramic-text-secondary'
                } ${pinError ? 'ring-2 ring-ceramic-error' : ''}`}
              >
                {pin.length > i ? '*' : ''}
              </div>
            ))}
          </div>

          {pinError && (
            <p className="text-sm text-ceramic-error">PIN incorreto</p>
          )}

          <input
            type="number"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
            className="sr-only"
            autoFocus
          />

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (key === null) return;
                  if (key === 'del') {
                    setPin(p => p.slice(0, -1));
                  } else {
                    setPin(p => p.length < 6 ? p + key : p);
                  }
                  setPinError(false);
                }}
                disabled={key === null}
                className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                  key === null
                    ? 'invisible'
                    : 'bg-ceramic-card shadow-ceramic-emboss text-ceramic-text-primary active:bg-ceramic-inset'
                }`}
                style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
              >
                {key === 'del' ? '⌫' : key}
              </button>
            ))}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pin.length < 4 || verifying}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
            style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
          >
            {verifying ? 'Verificando...' : 'Entrar'}
          </button>

          <button
            onClick={onBack}
            className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Dashboard (after PIN verified)
  return (
    <div className="p-6 space-y-6 bg-ceramic-base min-h-screen">
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-ceramic-text-primary"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          Painel dos Pais
        </h1>
        <button
          onClick={onBack}
          className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary"
        >
          Voltar
        </button>
      </div>

      {/* Children List */}
      <div>
        <h2
          className="text-lg font-semibold text-ceramic-text-primary mb-3"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          Criancas ({childProfiles.length})
        </h2>
        <div className="space-y-2">
          {childProfiles.map(child => (
            <div
              key={child.id}
              className="flex items-center gap-3 p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss"
            >
              <div className="w-10 h-10 rounded-full bg-ceramic-inset flex items-center justify-center text-xl">
                {child.avatar_emoji || '👤'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-ceramic-text-primary">
                  {child.display_name}
                </div>
                {child.birth_year && (
                  <div className="text-xs text-ceramic-text-secondary">
                    Nascimento: {child.birth_year}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onAddChild}
          className="mt-3 w-full py-2 bg-ceramic-inset text-sm font-medium text-ceramic-text-secondary rounded-lg hover:bg-ceramic-border transition-colors"
        >
          + Adicionar Crianca
        </button>
      </div>

      {/* Settings */}
      <div>
        <h2
          className="text-lg font-semibold text-ceramic-text-primary mb-3"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          Configuracoes
        </h2>
        <div className="space-y-3">
          {/* Max Turns */}
          <div className="flex items-center justify-between p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
            <div>
              <div className="text-sm font-medium text-ceramic-text-primary">Turnos por dia</div>
              <div className="text-xs text-ceramic-text-secondary">Limite diario de jogadas</div>
            </div>
            <select
              value={settings?.max_turns_per_day ?? 10}
              onChange={e => onUpdateSettings({ max_turns_per_day: Number(e.target.value) })}
              className="bg-ceramic-inset rounded-lg px-3 py-1.5 text-sm text-ceramic-text-primary"
            >
              {[5, 10, 15, 20, 30].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Voice Toggle */}
          <div className="flex items-center justify-between p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
            <div>
              <div className="text-sm font-medium text-ceramic-text-primary">Voz ativada</div>
              <div className="text-xs text-ceramic-text-secondary">Narracao por voz do jogo</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ voice_enabled: !(settings?.voice_enabled ?? false) })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings?.voice_enabled ? 'bg-amber-500' : 'bg-ceramic-border'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings?.voice_enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
