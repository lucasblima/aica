/**
 * EF_ParentDashboard - Parental controls screen
 *
 * PIN entry, child management with create/edit, progress reports,
 * session timeout, and expanded settings.
 * Protected area for parents to configure EraForge.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EF_NavHeader } from './EF_NavHeader';
import type { ChildProfile, ParentalSettings, WorldMember } from '../types/eraforge.types';
import { EraforgeGameService } from '../services/eraforgeGameService';
import type { ChildStatDay, ChildTurnHistoryEntry } from '../services/eraforgeGameService';
import type { ChildProfileCreateInput } from '../types/eraforge.types';

// ─── Emoji Picker Grid ────────────────────────────────────
const AVATAR_EMOJIS = [
  '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🐵',
  '🦄', '🐲', '🦅', '🐬', '🦋', '🐢', '🐙', '🦜',
  '🧙', '🧝', '🧚', '🦸', '🧑‍🚀', '🧑‍🔬', '🧑‍🎨', '🧑‍🏫',
  '⭐', '🌈', '🌸', '🍀', '🔥', '💎', '🎯', '🎨',
];

// ─── Color Picker Options (8 colors, 4×2 grid) ───────────
const AVATAR_COLORS = [
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Ciano' },
];

// ─── Constants ─────────────────────────────────────────────
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const CURRENT_YEAR = new Date().getFullYear();
const MIN_BIRTH_YEAR = CURRENT_YEAR - 16;
const MAX_BIRTH_YEAR = CURRENT_YEAR - 3;
const MAX_CHILDREN = 5;
const TURNS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const fredokaFont = { fontFamily: "'Fredoka', 'Nunito', sans-serif" };
const nunitoFont = { fontFamily: "'Nunito', sans-serif" };

// ─── Props ─────────────────────────────────────────────────
interface EF_ParentDashboardProps {
  children: ChildProfile[];
  settings: ParentalSettings | null;
  worldMembers?: Record<string, WorldMember>;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onUpdateSettings: (updates: Partial<ParentalSettings>) => void;
  onAddChild: (input: ChildProfileCreateInput) => void;
  onEditChild: (id: string, input: { display_name?: string; avatar_emoji?: string; avatar_color?: string }) => void;
  onBack: () => void;
}

// ─── Stat Bar Component ────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ceramic-text-secondary" style={nunitoFont}>{label}</span>
        <span className="font-medium text-ceramic-text-primary" style={nunitoFont}>{clamped}%</span>
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

// ─── Color Picker Component ────────────────────────────────
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {AVATAR_COLORS.map(color => (
        <button
          key={color.value}
          onClick={() => onChange(color.value)}
          aria-label={`Cor ${color.label}`}
          aria-pressed={value === color.value}
          className={`w-10 h-10 rounded-full transition-all ${
            value === color.value
              ? 'ring-2 ring-offset-2 ring-ceramic-text-primary scale-110'
              : 'hover:scale-105'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.label}
        />
      ))}
    </div>
  );
}

// ─── Sparkline SVG Component ───────────────────────────────
function Sparkline({
  data,
  color,
  label,
}: {
  data: number[];
  color: string;
  label: string;
}) {
  const w = 120;
  const h = 36;
  const padding = 4;

  if (data.length < 2) {
    return (
      <div className="text-xs text-ceramic-text-secondary italic" style={nunitoFont}>
        Sem dados
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = padding + ((1 - (v - min) / range) * (h - padding * 2));
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  const areaPoints = [
    `${padding},${h - padding}`,
    ...points,
    `${w - padding},${h - padding}`,
  ].join(' ');

  return (
    <div className="space-y-1">
      <div className="text-xs text-ceramic-text-secondary" style={nunitoFont}>{label}</div>
      <svg
        width={w}
        height={h}
        aria-label={`Gráfico de ${label}`}
        role="img"
      >
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Filled area */}
        <polygon
          points={areaPoints}
          fill={`url(#grad-${label})`}
        />
        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Start dot */}
        <circle cx={firstPoint.split(',')[0]} cy={firstPoint.split(',')[1]} r="2.5" fill={color} opacity="0.6" />
        {/* End dot */}
        <circle cx={lastPoint.split(',')[0]} cy={lastPoint.split(',')[1]} r="3" fill={color} />
      </svg>
    </div>
  );
}

// ─── Progress Graph Section ────────────────────────────────
function ProgressGraph({ childId }: { childId: string }) {
  const [history, setHistory] = useState<ChildStatDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    EraforgeGameService.getChildStatsHistory(childId)
      .then(res => setHistory(res.data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="text-xs text-ceramic-text-secondary italic pt-2" style={nunitoFont}>
        Carregando gráfico...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-xs text-ceramic-text-secondary italic pt-2" style={nunitoFont}>
        Nenhum dado de progresso ainda.
      </div>
    );
  }

  const knowledgeData = history.map(d => d.knowledge);
  const cooperationData = history.map(d => d.cooperation);
  const courageData = history.map(d => d.courage);

  return (
    <div className="space-y-2 pt-2">
      <div className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide" style={nunitoFont}>
        Últimos 7 dias
      </div>
      <div className="flex gap-4 flex-wrap">
        <Sparkline data={knowledgeData} color="#60a5fa" label="Conhecimento" />
        <Sparkline data={cooperationData} color="#34d399" label="Cooperação" />
        <Sparkline data={courageData} color="#fbbf24" label="Coragem" />
      </div>
    </div>
  );
}

// ─── Delta Badge ───────────────────────────────────────────
function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
        positive
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
      style={nunitoFont}
    >
      {positive ? '+' : ''}{value}
    </span>
  );
}

// ─── Decision History Section ──────────────────────────────
function DecisionHistory({ childId }: { childId: string }) {
  const [history, setHistory] = useState<ChildTurnHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    EraforgeGameService.getChildTurnHistory(childId, 10)
      .then(res => setHistory(res.data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="text-xs text-ceramic-text-secondary italic pt-2" style={nunitoFont}>
        Carregando decisões...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-xs text-ceramic-text-secondary italic pt-2" style={nunitoFont}>
        Nenhuma decisão registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      <div className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide" style={nunitoFont}>
        Últimas Decisões
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {history.map(entry => (
          <div
            key={entry.id}
            className="bg-ceramic-inset rounded-lg p-2.5 space-y-1"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-ceramic-text-primary leading-tight" style={fredokaFont}>
                {entry.scenario_title ?? 'Cenário sem título'}
              </div>
              <div className="text-xs text-ceramic-text-secondary whitespace-nowrap" style={nunitoFont}>
                {new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
            </div>
            {entry.consequence_narrative && (
              <div className="text-xs text-ceramic-text-secondary line-clamp-2" style={nunitoFont}>
                {entry.consequence_narrative}
              </div>
            )}
            <div className="flex items-center gap-1 flex-wrap">
              <DeltaBadge value={entry.knowledge_delta} />
              <DeltaBadge value={entry.cooperation_delta} />
              <DeltaBadge value={entry.courage_delta} />
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const [editColor, setEditColor] = useState(AVATAR_COLORS[0].value);

  // ─── Create Child State ──────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🦁');
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0].value);
  const [newBirthYear, setNewBirthYear] = useState<number | undefined>(undefined);
  const [consentChecked, setConsentChecked] = useState(false);

  // ─── Expanded child sub-tab ───────────────────────────────
  const [childSubTab, setChildSubTab] = useState<'progress' | 'history'>('progress');

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
    if (!newName.trim() || !consentChecked) return;
    onAddChild({
      display_name: newName.trim(),
      avatar_emoji: newEmoji,
      avatar_color: newColor,
      birth_year: newBirthYear,
      consent_given_at: new Date().toISOString(),
    });
    setNewName('');
    setNewEmoji('🦁');
    setNewColor(AVATAR_COLORS[0].value);
    setNewBirthYear(undefined);
    setConsentChecked(false);
    setShowCreateModal(false);
  };

  const handleStartEdit = (child: ChildProfile) => {
    setEditingChildId(child.id);
    setEditName(child.display_name);
    setEditEmoji(child.avatar_emoji || '🦁');
    setEditColor(child.avatar_color || AVATAR_COLORS[0].value);
  };

  const handleSaveEdit = () => {
    if (!editingChildId || !editName.trim()) return;
    onEditChild(editingChildId, {
      display_name: editName.trim(),
      avatar_emoji: editEmoji,
      avatar_color: editColor,
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
          <p className="text-sm text-ceramic-text-secondary" style={nunitoFont}>
            {settings?.pin_hash
              ? 'Digite o PIN para acessar'
              : 'Defina um PIN de 4 dígitos para proteger esta área'}
          </p>

          <div className="flex justify-center gap-2" aria-label="Indicadores de dígitos do PIN">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold transition-all ${
                  pin.length > i
                    ? 'bg-amber-100 text-amber-600 shadow-ceramic-emboss'
                    : 'bg-ceramic-inset text-ceramic-text-secondary'
                } ${pinError ? 'ring-2 ring-ceramic-error animate-pulse' : ''}`}
                aria-hidden="true"
              >
                {pin.length > i ? '*' : ''}
              </div>
            ))}
          </div>

          {pinError && (
            <p className="text-sm text-ceramic-error" role="alert" style={nunitoFont}>PIN incorreto. Tente novamente.</p>
          )}

          {/* Hidden accessible input for keyboard users */}
          <input
            type="number"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(v);
              setPinError(false);
            }}
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
                    setPin(p => p.length < 4 ? p + key : p);
                  }
                  setPinError(false);
                }}
                disabled={key === null}
                aria-label={key === 'del' ? 'Apagar' : key === null ? '' : `Dígito ${key}`}
                className={`h-12 rounded-lg font-bold text-lg transition-all active:scale-95 ${
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
            aria-label={verifying ? 'Verificando PIN' : (settings?.pin_hash ? 'Entrar com PIN' : 'Definir PIN')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-95"
            style={fredokaFont}
          >
            {verifying ? 'Verificando...' : (settings?.pin_hash ? 'Entrar' : 'Definir PIN')}
          </button>

          <button
            onClick={onBack}
            aria-label="Voltar ao jogo"
            className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            style={nunitoFont}
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
    <div className="bg-ceramic-base min-h-screen">
      <EF_NavHeader title="Painel dos Pais" onBack={onBack} />

      <div className="p-6 space-y-6">
        {/* Lock button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setIsVerified(false);
              setPin('');
            }}
            aria-label="Bloquear e voltar ao PIN"
            className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary flex items-center gap-1 transition-colors"
            style={nunitoFont}
          >
            🔒 Bloquear
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2" role="tablist">
          <button
            onClick={() => setActiveTab('children')}
            aria-label="Aba Crianças"
            aria-selected={activeTab === 'children'}
            role="tab"
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
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
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
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
                const avatarBg = child.avatar_color || AVATAR_COLORS[0].value;

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
                        setChildSubTab('progress');
                      }}
                      aria-expanded={isExpanded}
                      aria-label={`Perfil de ${child.display_name}`}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-ceramic-cool/50 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm flex-shrink-0"
                        style={{ backgroundColor: avatarBg + '33', border: `2px solid ${avatarBg}` }}
                      >
                        {child.avatar_emoji || '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ceramic-text-primary truncate" style={fredokaFont}>
                          {child.display_name}
                        </div>
                        {child.birth_year && (
                          <div className="text-xs text-ceramic-text-secondary" style={nunitoFont}>
                            Nascimento: {child.birth_year}
                          </div>
                        )}
                      </div>
                      <div className={`text-ceramic-text-secondary transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        ▾
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && !isEditing && (
                      <div className="px-3 pb-3 space-y-3 border-t border-ceramic-border">
                        {/* Current Stats */}
                        {stats ? (
                          <div className="pt-3 space-y-2">
                            <div className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wide" style={nunitoFont}>
                              Estatísticas Atuais
                            </div>
                            <StatBar label="Conhecimento" value={stats.knowledge} color="bg-blue-400" />
                            <StatBar label="Cooperação" value={stats.cooperation} color="bg-green-400" />
                            <StatBar label="Coragem" value={stats.courage} color="bg-amber-400" />
                            <div className="flex justify-between text-xs text-ceramic-text-secondary pt-1" style={nunitoFont}>
                              <span>Turnos hoje: {stats.turns_today}</span>
                              {stats.last_turn_date && (
                                <span>Último: {new Date(stats.last_turn_date).toLocaleDateString('pt-BR')}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-3 text-xs text-ceramic-text-secondary italic" style={nunitoFont}>
                            Nenhum progresso registrado ainda.
                          </div>
                        )}

                        {/* Sub-tabs: Progress Graph / Decision History */}
                        <div className="flex gap-1 border-t border-ceramic-border pt-3">
                          <button
                            onClick={() => setChildSubTab('progress')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              childSubTab === 'progress'
                                ? 'bg-amber-100 text-amber-700'
                                : 'text-ceramic-text-secondary hover:bg-ceramic-cool'
                            }`}
                            style={nunitoFont}
                          >
                            Progresso
                          </button>
                          <button
                            onClick={() => setChildSubTab('history')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              childSubTab === 'history'
                                ? 'bg-amber-100 text-amber-700'
                                : 'text-ceramic-text-secondary hover:bg-ceramic-cool'
                            }`}
                            style={nunitoFont}
                          >
                            Decisões
                          </button>
                        </div>

                        {childSubTab === 'progress' && (
                          <ProgressGraph childId={child.id} />
                        )}

                        {childSubTab === 'history' && (
                          <DecisionHistory childId={child.id} />
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
                          <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
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
                          <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
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

                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
                            Cor do Perfil
                          </label>
                          <ColorPicker value={editColor} onChange={setEditColor} />
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
                <div className="text-sm font-medium text-ceramic-text-primary" style={fredokaFont}>Turnos por dia</div>
                <div className="text-xs text-ceramic-text-secondary" style={nunitoFont}>Limite diário de jogadas</div>
              </div>
              <select
                value={settings?.max_turns_per_day ?? 5}
                onChange={e => onUpdateSettings({ max_turns_per_day: Number(e.target.value) })}
                aria-label="Máximo de turnos por dia"
                className="bg-ceramic-inset rounded-lg px-3 py-1.5 text-sm text-ceramic-text-primary"
                style={nunitoFont}
              >
                {TURNS_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Voice Toggle */}
            <div className="flex items-center justify-between p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
              <div>
                <div className="text-sm font-medium text-ceramic-text-primary" style={fredokaFont}>Voz ativada</div>
                <div className="text-xs text-ceramic-text-secondary" style={nunitoFont}>Narração por voz do jogo</div>
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
                <div className="text-sm font-medium text-ceramic-text-primary" style={fredokaFont}>Horário permitido</div>
                <div className="text-xs text-ceramic-text-secondary" style={nunitoFont}>Período em que a criança pode jogar</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-ceramic-text-secondary mb-1" style={nunitoFont}>Início</label>
                  <input
                    type="time"
                    value={settings?.allowed_start_time ?? '08:00'}
                    onChange={e => onUpdateSettings({ allowed_start_time: e.target.value })}
                    aria-label="Horário de início permitido"
                    className="w-full px-3 py-1.5 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
                  />
                </div>
                <div className="text-ceramic-text-secondary pt-4">—</div>
                <div className="flex-1">
                  <label className="block text-xs text-ceramic-text-secondary mb-1" style={nunitoFont}>Fim</label>
                  <input
                    type="time"
                    value={settings?.allowed_end_time ?? '20:00'}
                    onChange={e => onUpdateSettings({ allowed_end_time: e.target.value })}
                    aria-label="Horário de fim permitido"
                    className="w-full px-3 py-1.5 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
                  />
                </div>
              </div>
            </div>

            {/* Simulation Toggle */}
            <div className="flex items-center justify-between p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
              <div>
                <div className="text-sm font-medium text-ceramic-text-primary" style={fredokaFont}>Modo simulação</div>
                <div className="text-xs text-ceramic-text-secondary" style={nunitoFont}>Ativa consequências nas decisões</div>
              </div>
              <Toggle
                checked={settings?.simulation_enabled ?? true}
                onChange={val => onUpdateSettings({ simulation_enabled: val })}
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
                <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
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
                <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
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

              {/* Color Picker */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
                  Cor do Perfil
                </label>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>

              {/* Birth Year */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ceramic-text-secondary" style={nunitoFont}>
                  Ano de nascimento (opcional)
                </label>
                <select
                  value={newBirthYear ?? ''}
                  onChange={e => setNewBirthYear(e.target.value ? Number(e.target.value) : undefined)}
                  aria-label="Ano de nascimento"
                  className="w-full px-3 py-2 bg-ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
                  style={nunitoFont}
                >
                  <option value="">Selecionar...</option>
                  {Array.from({ length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 }, (_, i) => MAX_BIRTH_YEAR - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-ceramic-card rounded-xl">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm"
                  style={{ backgroundColor: newColor + '33', border: `2px solid ${newColor}` }}
                >
                  {newEmoji}
                </div>
                <div className="text-sm font-medium text-ceramic-text-primary" style={fredokaFont}>
                  {newName || 'Nome da criança'}
                </div>
              </div>

              {/* LGPD Parental Consent */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={e => setConsentChecked(e.target.checked)}
                    className="sr-only"
                    aria-label="Confirmar consentimento parental LGPD"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      consentChecked
                        ? 'bg-amber-500 border-amber-500'
                        : 'bg-ceramic-inset border-ceramic-border group-hover:border-amber-400'
                    }`}
                  >
                    {consentChecked && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-ceramic-text-secondary leading-relaxed" style={nunitoFont}>
                  Confirmo que sou o responsável legal e autorizo a criação deste perfil infantil conforme a{' '}
                  <strong className="text-ceramic-text-primary">LGPD Art. 14</strong>.
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setConsentChecked(false);
                  }}
                  aria-label="Cancelar criação"
                  className="flex-1 py-2.5 text-sm font-medium text-ceramic-text-secondary bg-ceramic-inset rounded-xl hover:bg-ceramic-border transition-colors"
                  style={fredokaFont}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateChild}
                  disabled={!newName.trim() || !consentChecked}
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
    </div>
  );
}
