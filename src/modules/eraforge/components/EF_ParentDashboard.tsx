/**
 * EF_ParentDashboard - Parental controls screen
 *
 * PIN entry, child management with create/edit, progress reports,
 * session timeout, and expanded settings.
 * Protected area for parents to configure EraForge.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ChildProfile, ParentalSettings, WorldMember } from '../types/eraforge.types';

// ─── Emoji Picker Grid ────────────────────────────────────
const AVATAR_EMOJIS = [
  '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🐵',
  '🦄', '🐲', '🦅', '🐬', '🦋', '🐢', '🐙', '🦜',
  '🧙', '🧝', '🧚', '🦸', '🧑‍🚀', '🧑‍🔬', '🧑‍🎨', '🧑‍🏫',
  '⭐', '🌈', '🌸', '🍀', '🔥', '💎', '🎯', '🎨',
];

// ─── Constants ─────────────────────────────────────────────
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CURRENT_YEAR = new Date().getFullYear();
const MIN_BIRTH_YEAR = CURRENT_YEAR - 16;
const MAX_BIRTH_YEAR = CURRENT_YEAR - 3;
const MAX_CHILDREN = 5;

const fredokaFont = { fontFamily: "'Fredoka', 'Nunito', sans-serif" };

// ─── Era Display Map ───────────────────────────────────────
const ERA_LABELS: Record<string, string> = {
  stone_age: 'Idade da Pedra',
  ancient_egypt: 'Egito Antigo',
  classical_greece: 'Grécia Clássica',
  roman_empire: 'Império Romano',
  medieval: 'Medieval',
  renaissance: 'Renascimento',
  industrial_revolution: 'Revolução Industrial',
  modern: 'Moderno',
  future: 'Futuro',
};

// ─── Props ─────────────────────────────────────────────────
interface EF_ParentDashboardProps {
  children: ChildProfile[];
  settings: ParentalSettings | null;
  /** Optional world member stats per child (keyed by child_id) */
  worldMembers?: Record<string, WorldMember>;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onUpdateSettings: (updates: Partial<ParentalSettings>) => void;
  onAddChild: (input: { display_name: string; avatar_emoji: string; birth_year?: number }) => void;
  onEditChild: (id: string, input: { display_name?: string; avatar_emoji?: string }) => void;
  onBack: () => void;
}

// ─── Stat Bar Component ────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ceramic-text-secondary">{label}</span>
        <span className="font-medium text-ceramic-text-primary">{clamped}%</span>
      </div>
      <div
        className="h-2 rounded-full bg-ceramic-inset overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${clamped}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

// ─── Toggle Component ──────────────────────────────────────
function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors relative ${
        checked ? 'bg-amber-500' : 'bg-ceramic-border'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function EF_ParentDashboard({
  children: childProfiles,
  settings,
  worldMembers,
  onVerifyPin,
  onUpdateSettings,
  onAddChild,
  onEditChild,
  onBack,
}: EF_ParentDashboardProps) {
  // ─── PIN State ───────────────────────────────────────────
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // ─── Dashboard State ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'children' | 'settings'>('children');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  // ─── Create Child State ──────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🦁');
  const [newBirthYear, setNewBirthYear] = useState<number | undefined>(undefined);

  // ─── Session Timeout ─────────────────────────────────────
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isVerified) {
      timeoutRef.current = setTimeout(() => {
        setIsVerified(false);
        setPin('');
      }, SESSION_TIMEOUT_MS);
    }
  }, [isVerified]);

  useEffect(() => {
    if (!isVerified) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    const handler = () => resetTimeout();

    events.forEach(e => window.addEventListener(e, handler));
    resetTimeout();

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVerified, resetTimeout]);

  // ─── PIN Handlers ────────────────────────────────────────
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

  // ─── Child CRUD Handlers ─────────────────────────────────
  const handleCreateChild = () => {
    if (!newName.trim()) return;
    onAddChild({
      display_name: newName.trim(),
      avatar_emoji: newEmoji,
      birth_year: newBirthYear,
    });
    setNewName('');
    setNewEmoji('🦁');
    setNewBirthYear(undefined);
    setShowCreateModal(false);
  };

  const handleStartEdit = (child: ChildProfile) => {
    setEditingChildId(child.id);
    setEditName(child.display_name);
    setEditEmoji(child.avatar_emoji || '👤');
  };

  const handleSaveEdit = () => {
    if (!editingChildId || !editName.trim()) return;
    onEditChild(editingChildId, {
      display_name: editName.trim(),
      avatar_emoji: editEmoji,
    });
    setEditingChildId(null);
  };

  const handleCancelEdit = () => {
    setEditingChildId(null);
  };

  // ═══════════════════════════════════════════════════════════
  // PIN ENTRY SCREEN
  // ═══════════════════════════════════════════════════════════
  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-ceramic-base">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="text-4xl">🔒</div>
          <h1
            className="text-2xl font-bold text-ceramic-text-primary"
            style={fredokaFont}
          >
            Área dos Pais
          </h1>
          <p className="text-sm text-ceramic-text-secondary">
            Digite o PIN para acessar
          </p>

          <div className="flex justify-center gap-2" aria-label="Indicadores de dígitos do PIN">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold ${
                  pin.length > i
                    ? 'bg-amber-100 text-amber-600 shadow-ceramic-emboss'
                    : 'bg-ceramic-inset text-ceramic-text-secondary'
                } ${pinError ? 'ring-2 ring-ceramic-error' : ''}`}
                aria-hidden="true"
              >
                {pin.length > i ? '*' : ''}
              </div>
            ))}
          </div>

          {pinError && (
            <p className="text-sm text-ceramic-error" role="alert">PIN incorreto</p>
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
            aria-label="Campo de entrada do PIN"
          />

          <div className="grid grid-cols-3 gap-2" aria-label="Teclado numérico">
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
                aria-label={key === 'del' ? 'Apagar' : key === null ? '' : `Dígito ${key}`}
                className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                  key === null
                    ? 'invisible'
                    : 'bg-ceramic-card shadow-ceramic-emboss text-ceramic-text-primary active:bg-ceramic-inset'
                }`}
                style={fredokaFont}
              >
                {key === 'del' ? '⌫' : key}
              </button>
            ))}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pin.length < 4 || verifying}
            aria-label={verifying ? 'Verificando PIN' : 'Entrar com PIN'}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
            style={fredokaFont}
          >
            {verifying ? 'Verificando...' : 'Entrar'}
          </button>

          <button
            onClick={onBack}
            aria-label="Voltar ao jogo"
            className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD (after PIN verified)
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-ceramic-base min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-ceramic-text-primary"
          style={fredokaFont}
        >
          Painel dos Pais
        </h1>
        <button
          onClick={() => {
            setIsVerified(false);
            setPin('');
          }}
          aria-label="Bloquear e voltar ao PIN"
          className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary flex items-center gap-1"
        >
          🔒 Bloquear
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('children')}
          aria-label="Aba Crianças"
          aria-selected={activeTab === 'children'}
          role="tab"
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'children'
              ? 'bg-amber-500 text-white shadow-ceramic-emboss'
              : 'bg-ceramic-card text-ceramic-text-secondary'
          }`}
          style={fredokaFont}
        >
          Crianças
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          aria-label="Aba Configurações"
          aria-selected={activeTab === 'settings'}
          role="tab"
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-white shadow-ceramic-emboss'
              : 'bg-ceramic-card text-ceramic-text-secondary'
          }`}
          style={fredokaFont}
        >
          Configurações
        </button>
      </div>

      {/* ─── Children Tab ─────────────────────────────────── */}
      {activeTab === 'children' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-ceramic-text-primary"
              style={fredokaFont}
            >
              Crianças ({childProfiles.length}/{MAX_CHILDREN})
            </h2>
          </div>

          {/* Child Cards */}
          <div className="space-y-3">
            {childProfiles.map(child => {
              const isExpanded = expandedChildId === child.id;
              const isEditing = editingChildId === child.id;
              const stats = worldMembers?.[child.id];

              return (
                <div
                  key={child.id}
                  className="bg-ceramic-card rounded-xl shadow-ceramic-emboss overflow-hidden"
                >
                  {/* Child Row (clickable to expand) */}
                  <button
                    onClick={() => {
                      if (isEditing) return;
                      setExpandedChildId(isExpanded ? null : child.id);
                    }}
                    aria-expanded={isExpanded}
                    aria-label={`Perfil de ${child.display_name}`}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-ceramic-cool/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-ceramic-inset flex items-center justify-center text-xl">
                      {child.avatar_emoji || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ceramic-text-primary truncate">
                        {child.display_name}
                      </div>
                      {child.birth_year && (
                        <div className="text-xs text-ceramic-text-secondary">
                          Nascimento: {child.birth_year}
                        </div>
                      )}
                    </div>
                    <div className={`text-ceramic-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▾
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && !isEditing && (
                    <div className="px-3 pb-3 space-y-3 border-t border-ceramic-border">
                      {/* Progress Reports */}
                      {stats ? (
                        <div className="pt-3 space-y-2">
                          <div className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide">
                            Progresso
                          </div>
                          <StatBar label="Conhecimento" value={stats.knowledge} color="bg-blue-400" />
                          <StatBar label="Cooperação" value={stats.cooperation} color="bg-green-400" />
                          <StatBar label="Coragem" value={stats.courage} color="bg-amber-400" />
                          <div className="flex justify-between text-xs text-ceramic-text-secondary pt-1">
                            <span>Turnos hoje: {stats.turns_today}</span>
                            {stats.last_turn_date && (
                              <span>Último: {new Date(stats.last_turn_date).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 text-xs text-ceramic-text-secondary italic">
                          Nenhum progresso registrado ainda.
                        </div>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEdit(child)}
                        aria-label={`Editar perfil de ${child.display_name}`}
                        className="w-full py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                        style={fredokaFont}
                      >
                        Editar Perfil
                      </button>
                    </div>
                  )}

                  {/* Edit Mode */}
                  {isEditing && (
                    <div className="px-3 pb-3 space-y-3 border-t border-ceramic-border">
                      <div className="pt-3 space-y-2">
                        <label className="block text-xs font-medium text-ceramic-text-secondary">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          maxLength={30}
                          aria-label="Nome da criança"
                          className="w-full px-3 py-2 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
                          style={fredokaFont}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-ceramic-text-secondary">
                          Avatar
                        </label>
                        <div className="grid grid-cols-8 gap-1.5">
                          {AVATAR_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => setEditEmoji(emoji)}
                              aria-label={`Selecionar avatar ${emoji}`}
                              aria-pressed={editEmoji === emoji}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                                editEmoji === emoji
                                  ? 'bg-amber-100 ring-2 ring-amber-500 scale-110'
                                  : 'bg-ceramic-inset hover:bg-ceramic-cool'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleCancelEdit}
                          aria-label="Cancelar edição"
                          className="flex-1 py-2 text-sm font-medium text-ceramic-text-secondary bg-ceramic-inset rounded-lg hover:bg-ceramic-border transition-colors"
                          style={fredokaFont}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={!editName.trim()}
                          aria-label="Salvar alterações"
                          className="flex-1 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg transition-colors"
                          style={fredokaFont}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Child Button */}
          {childProfiles.length < MAX_CHILDREN && (
            <button
              onClick={() => setShowCreateModal(true)}
              aria-label="Adicionar nova criança"
              className="w-full py-3 bg-ceramic-inset text-sm font-bold text-ceramic-text-secondary rounded-xl hover:bg-ceramic-border transition-colors"
              style={fredokaFont}
            >
              + Adicionar Criança
            </button>
          )}
        </div>
      )}

      {/* ─── Settings Tab ─────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-3">
          <h2
            className="text-lg font-semibold text-ceramic-text-primary"
            style={fredokaFont}
          >
            Configurações
          </h2>

          {/* Max Turns */}
          <div className="flex items-center justify-between p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
            <div>
              <div className="text-sm font-medium text-ceramic-text-primary">Turnos por dia</div>
              <div className="text-xs text-ceramic-text-secondary">Limite diário de jogadas</div>
            </div>
            <select
              value={settings?.max_turns_per_day ?? 10}
              onChange={e => onUpdateSettings({ max_turns_per_day: Number(e.target.value) })}
              aria-label="Máximo de turnos por dia"
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
              <div className="text-xs text-ceramic-text-secondary">Narração por voz do jogo</div>
            </div>
            <Toggle
              checked={settings?.voice_enabled ?? false}
              onChange={val => onUpdateSettings({ voice_enabled: val })}
              ariaLabel="Ativar narração por voz"
            />
          </div>

          {/* Allowed Hours */}
          <div className="p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss space-y-3">
            <div>
              <div className="text-sm font-medium text-ceramic-text-primary">Horário permitido</div>
              <div className="text-xs text-ceramic-text-secondary">Período em que a criança pode jogar</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-ceramic-text-secondary mb-1">Início</label>
                <input
                  type="time"
                  value={(settings as unknown as Record<string, unknown>)?.allowed_start_time as string ?? '08:00'}
                  onChange={e => onUpdateSettings({ allowed_start_time: e.target.value } as unknown as Partial<ParentalSettings>)}
                  aria-label="Horário de início permitido"
                  className="w-full px-3 py-1.5 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
                />
              </div>
              <div className="text-ceramic-text-secondary pt-4">—</div>
              <div className="flex-1">
                <label className="block text-xs text-ceramic-text-secondary mb-1">Fim</label>
                <input
                  type="time"
                  value={(settings as unknown as Record<string, unknown>)?.allowed_end_time as string ?? '20:00'}
                  onChange={e => onUpdateSettings({ allowed_end_time: e.target.value } as unknown as Partial<ParentalSettings>)}
                  aria-label="Horário de fim permitido"
                  className="w-full px-3 py-1.5 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
                />
              </div>
            </div>
          </div>

          {/* Simulation Toggle */}
          <div className="flex items-center justify-between p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
            <div>
              <div className="text-sm font-medium text-ceramic-text-primary">Modo simulação</div>
              <div className="text-xs text-ceramic-text-secondary">Ativa consequências nas decisões</div>
            </div>
            <Toggle
              checked={(settings as unknown as Record<string, unknown>)?.simulation_enabled as boolean ?? true}
              onChange={val => onUpdateSettings({ simulation_enabled: val } as unknown as Partial<ParentalSettings>)}
              ariaLabel="Ativar modo simulação"
            />
          </div>

          {/* Back button */}
          <button
            onClick={onBack}
            aria-label="Voltar ao jogo"
            className="w-full py-3 mt-4 text-sm font-medium text-ceramic-text-secondary bg-ceramic-inset rounded-xl hover:bg-ceramic-border transition-colors"
            style={fredokaFont}
          >
            Voltar ao Jogo
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         CREATE CHILD MODAL
         ═══════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Adicionar criança"
        >
          <div className="w-full max-w-sm bg-ceramic-base rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2
              className="text-xl font-bold text-ceramic-text-primary text-center"
              style={fredokaFont}
            >
              Nova Criança
            </h2>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ceramic-text-secondary">
                Nome
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={30}
                placeholder="Nome da criança"
                aria-label="Nome da nova criança"
                className="w-full px-3 py-2.5 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={fredokaFont}
                autoFocus
              />
            </div>

            {/* Emoji Picker */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ceramic-text-secondary">
                Avatar
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATAR_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    aria-label={`Selecionar avatar ${emoji}`}
                    aria-pressed={newEmoji === emoji}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                      newEmoji === emoji
                        ? 'bg-amber-100 ring-2 ring-amber-500 scale-110'
                        : 'bg-ceramic-inset hover:bg-ceramic-cool'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Birth Year */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ceramic-text-secondary">
                Ano de nascimento (opcional)
              </label>
              <select
                value={newBirthYear ?? ''}
                onChange={e => setNewBirthYear(e.target.value ? Number(e.target.value) : undefined)}
                aria-label="Ano de nascimento"
                className="w-full px-3 py-2 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
              >
                <option value="">Selecionar...</option>
                {Array.from({ length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 }, (_, i) => MAX_BIRTH_YEAR - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-ceramic-card rounded-xl">
              <div className="w-10 h-10 rounded-full bg-ceramic-inset flex items-center justify-center text-xl">
                {newEmoji}
              </div>
              <div className="text-sm font-medium text-ceramic-text-primary" style={fredokaFont}>
                {newName || 'Nome da criança'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Cancelar criação"
                className="flex-1 py-2.5 text-sm font-medium text-ceramic-text-secondary bg-ceramic-inset rounded-xl hover:bg-ceramic-border transition-colors"
                style={fredokaFont}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateChild}
                disabled={!newName.trim()}
                aria-label="Confirmar criação da criança"
                className="flex-1 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors"
                style={fredokaFont}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
