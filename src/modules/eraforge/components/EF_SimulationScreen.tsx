/**
 * EF_SimulationScreen - Cinematic 14-day simulation summary
 *
 * Shows an animated timeline of simulated events with:
 * - "Enquanto voce esteve fora..." animated title
 * - Horizontal scrollable day timeline (Dia 1-14)
 * - Progressive event reveal with auto-play (3s delay)
 * - TTS narration per event via onSpeak callback
 * - Stats before/after comparison with animated progress bars
 * - Skip narration + toggle auto-play controls
 * - "Continuar aventura!" CTA at the end
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { SimulationEvent, StatsDelta, Era } from '../types/eraforge.types';
import { ERA_LABELS } from '../types/eraforge.types';

// ============================================
// TYPES
// ============================================

interface EF_SimulationScreenProps {
  events: SimulationEvent[];
  summary: string;
  statsDelta: StatsDelta;
  statsBefore?: { knowledge: number; cooperation: number; courage: number };
  statsAfter?: { knowledge: number; cooperation: number; courage: number };
  startDate?: string;
  endDate?: string;
  onBack: () => void;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const FREDOKA = "'Fredoka', 'Nunito', sans-serif";
const AUTO_PLAY_DELAY_MS = 3000;
const TOTAL_DAYS = 14;

const IMPACT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-400',
  neutral: 'bg-amber-400',
  negative: 'bg-rose-400',
};

const IMPACT_BORDER: Record<string, string> = {
  positive: 'border-emerald-400',
  neutral: 'border-amber-400',
  negative: 'border-rose-400',
};

const IMPACT_GLOW: Record<string, string> = {
  positive: 'shadow-[0_0_12px_rgba(52,211,153,0.4)]',
  neutral: 'shadow-[0_0_12px_rgba(251,191,36,0.4)]',
  negative: 'shadow-[0_0_12px_rgba(251,113,133,0.4)]',
};

const IMPACT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};

const STAT_CONFIG = [
  { key: 'knowledge' as const, label: 'Conhecimento', emoji: '\u{1F4DA}', color: 'bg-blue-500' },
  { key: 'cooperation' as const, label: 'Cooperação', emoji: '\u{1F91D}', color: 'bg-green-500' },
  { key: 'courage' as const, label: 'Coragem', emoji: '\u{2694}\u{FE0F}', color: 'bg-red-500' },
];

// ============================================
// HELPERS
// ============================================

function assignEventsToDays(events: SimulationEvent[], totalDays: number): Map<number, SimulationEvent[]> {
  const dayMap = new Map<number, SimulationEvent[]>();
  if (events.length === 0) return dayMap;

  // Spread events across days as evenly as possible
  const eventsPerDay = Math.max(1, Math.ceil(events.length / totalDays));
  let eventIdx = 0;
  for (let day = 1; day <= totalDays && eventIdx < events.length; day++) {
    const dayEvents: SimulationEvent[] = [];
    for (let i = 0; i < eventsPerDay && eventIdx < events.length; i++) {
      dayEvents.push(events[eventIdx]);
      eventIdx++;
    }
    if (dayEvents.length > 0) {
      dayMap.set(day, dayEvents);
    }
  }
  return dayMap;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================
// SUB-COMPONENTS
// ============================================

/** Animated title with typewriter effect */
function AnimatedTitle({ onComplete }: { onComplete: () => void }) {
  const text = 'Enquanto voc\u00EA esteve fora...';
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (visibleChars < text.length) {
      const timer = setTimeout(() => setVisibleChars(v => v + 1), 60);
      return () => clearTimeout(timer);
    } else {
      const done = setTimeout(onComplete, 600);
      return () => clearTimeout(done);
    }
  }, [visibleChars, text.length, onComplete]);

  return (
    <div className="text-center py-4">
      <h1
        className="text-2xl sm:text-3xl font-bold text-ceramic-text-primary"
        style={{ fontFamily: FREDOKA }}
      >
        {text.slice(0, visibleChars)}
        <span className="animate-pulse text-amber-500">|</span>
      </h1>
      <p className="text-ceramic-text-secondary text-sm mt-2 opacity-70">
        {'\u{1F989}'} Sábia Coruja preparou um resumo especial
      </p>
    </div>
  );
}

/** Single day pill in the horizontal timeline */
function DayPill({
  day,
  hasEvents,
  isActive,
  isRevealed,
  onClick,
}: {
  day: number;
  hasEvents: boolean;
  isActive: boolean;
  isRevealed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Dia ${day}${hasEvents ? ' - tem eventos' : ''}`}
      className={[
        'flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300',
        isActive
          ? 'bg-amber-500 text-white scale-110 shadow-lg'
          : isRevealed && hasEvents
            ? 'bg-ceramic-card text-ceramic-text-primary shadow-ceramic-emboss'
            : 'bg-ceramic-cool/50 text-ceramic-text-secondary',
      ].join(' ')}
      style={{ fontFamily: FREDOKA, minWidth: 56 }}
    >
      <span className="text-xs font-medium">Dia</span>
      <span className="text-lg font-bold">{day}</span>
      {hasEvents && (
        <div
          className={[
            'w-2 h-2 rounded-full transition-all duration-500',
            isRevealed ? 'bg-amber-400' : 'bg-ceramic-border',
          ].join(' ')}
        />
      )}
    </button>
  );
}

/** Event card with reveal animation */
function EventCard({
  event,
  index,
  isRevealed,
  isNarrating,
}: {
  event: SimulationEvent;
  index: number;
  isRevealed: boolean;
  isNarrating: boolean;
}) {
  const eraLabel = ERA_LABELS[event.era] || event.era;

  return (
    <div
      className={[
        'border-l-4 rounded-r-xl p-4 transition-all duration-700',
        IMPACT_BORDER[event.impact] || 'border-ceramic-border',
        isRevealed
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8',
        isNarrating
          ? `bg-ceramic-card ${IMPACT_GLOW[event.impact] || ''}`
          : 'bg-ceramic-card/80',
      ].join(' ')}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-ceramic-text-primary leading-tight">
            {event.title}
          </h3>
          <p className="text-xs text-ceramic-text-secondary mt-1 leading-relaxed">
            {event.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={[
              'inline-block w-3 h-3 rounded-full',
              IMPACT_COLORS[event.impact] || 'bg-ceramic-border',
            ].join(' ')}
            title={IMPACT_LABELS[event.impact]}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ceramic-cool/60 text-ceramic-text-secondary">
          {eraLabel}
        </span>
        <span
          className={[
            'text-[10px] px-2 py-0.5 rounded-full',
            event.impact === 'positive' ? 'bg-emerald-100 text-emerald-700'
              : event.impact === 'negative' ? 'bg-rose-100 text-rose-700'
              : 'bg-amber-100 text-amber-700',
          ].join(' ')}
        >
          {IMPACT_LABELS[event.impact]}
        </span>
        {isNarrating && (
          <span className="text-[10px] text-amber-500 animate-pulse font-medium">
            {'\u{1F50A}'} Narrando...
          </span>
        )}
      </div>
    </div>
  );
}

/** Animated stat bar comparing before and after */
function StatComparisonBar({
  label,
  emoji,
  color,
  before,
  after,
  delta,
  animate,
}: {
  label: string;
  emoji: string;
  color: string;
  before: number;
  after: number;
  delta: number;
  animate: boolean;
}) {
  const maxStat = 100;
  const beforePct = clamp((before / maxStat) * 100, 0, 100);
  const afterPct = clamp((after / maxStat) * 100, 0, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ceramic-text-primary flex items-center gap-1.5">
          <span>{emoji}</span>
          <span>{label}</span>
        </span>
        <span
          className={[
            'text-xs font-bold',
            delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'text-ceramic-text-secondary',
          ].join(' ')}
        >
          {delta > 0 ? '+' : ''}{delta}
        </span>
      </div>

      {/* Before bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ceramic-text-secondary w-10">Antes</span>
        <div className="flex-1 h-2.5 bg-ceramic-cool/40 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color} opacity-40 transition-all duration-1000 ease-out`}
            style={{ width: animate ? `${beforePct}%` : '0%' }}
          />
        </div>
        <span className="text-[10px] text-ceramic-text-secondary w-6 text-right">{before}</span>
      </div>

      {/* After bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ceramic-text-primary font-semibold w-10">Depois</span>
        <div className="flex-1 h-2.5 bg-ceramic-cool/40 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
            style={{
              width: animate ? `${afterPct}%` : '0%',
              transitionDelay: '300ms',
            }}
          />
        </div>
        <span className="text-[10px] text-ceramic-text-primary font-semibold w-6 text-right">{after}</span>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EF_SimulationScreen({
  events,
  summary,
  statsDelta,
  statsBefore,
  statsAfter,
  startDate,
  endDate,
  onBack,
  onSpeak,
  isSpeaking = false,
  onStopSpeaking,
}: EF_SimulationScreenProps) {
  // --- State ---
  const [titleDone, setTitleDone] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [revealedCount, setRevealedCount] = useState(0);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [narratingIdx, setNarratingIdx] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [animateStats, setAnimateStats] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // --- Derived ---
  const dayMap = useMemo(() => assignEventsToDays(events, TOTAL_DAYS), [events]);
  const allRevealed = revealedCount >= events.length;

  // Compute effective before/after stats
  const effectiveBefore = statsBefore || { knowledge: 50, cooperation: 50, courage: 50 };
  const effectiveAfter = statsAfter || {
    knowledge: effectiveBefore.knowledge + (statsDelta.knowledge ?? 0),
    cooperation: effectiveBefore.cooperation + (statsDelta.cooperation ?? 0),
    courage: effectiveBefore.courage + (statsDelta.courage ?? 0),
  };

  // --- Title completion ---
  const handleTitleDone = useCallback(() => {
    setTitleDone(true);
    // Find first day with events
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      if (dayMap.has(d)) {
        setActiveDay(d);
        break;
      }
    }
  }, [dayMap]);

  // --- Auto-play progression ---
  useEffect(() => {
    if (!titleDone || !autoPlay || allRevealed) return;

    autoPlayTimerRef.current = setTimeout(() => {
      setRevealedCount(prev => {
        const next = prev + 1;
        // Narrate the event
        if (onSpeak && events[prev]) {
          const ev = events[prev];
          setNarratingIdx(prev);
          onSpeak(`${ev.title}. ${ev.description}`);
        }
        return next;
      });
    }, AUTO_PLAY_DELAY_MS);

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [titleDone, autoPlay, revealedCount, allRevealed, events, onSpeak]);

  // --- Track which day is active based on revealed events ---
  useEffect(() => {
    if (revealedCount === 0) return;

    let cumulativeIdx = 0;
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const dayEvents = dayMap.get(d);
      if (dayEvents) {
        cumulativeIdx += dayEvents.length;
        if (cumulativeIdx >= revealedCount) {
          setActiveDay(d);
          break;
        }
      }
    }
  }, [revealedCount, dayMap]);

  // --- Scroll timeline to active day ---
  useEffect(() => {
    if (activeDay && timelineRef.current) {
      const pill = timelineRef.current.querySelector(`[data-day="${activeDay}"]`);
      if (pill) {
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeDay]);

  // --- Show stats + CTA when all revealed ---
  useEffect(() => {
    if (allRevealed && events.length > 0) {
      const statsTimer = setTimeout(() => {
        setShowStats(true);
        setTimeout(() => setAnimateStats(true), 100);
        setTimeout(() => setShowCTA(true), 800);
      }, 1000);
      return () => clearTimeout(statsTimer);
    }
  }, [allRevealed, events.length]);

  // --- Clear narrating when speech stops ---
  useEffect(() => {
    if (!isSpeaking) {
      setNarratingIdx(null);
    }
  }, [isSpeaking]);

  // --- Reveal all events instantly ---
  const handleRevealAll = useCallback(() => {
    setAutoPlay(false);
    setRevealedCount(events.length);
    if (onStopSpeaking) onStopSpeaking();
  }, [events.length, onStopSpeaking]);

  // --- Skip to specific day ---
  const handleDayClick = useCallback((day: number) => {
    setActiveDay(day);

    // Count events up to and including this day
    let count = 0;
    for (let d = 1; d <= day; d++) {
      const dayEvents = dayMap.get(d);
      if (dayEvents) count += dayEvents.length;
    }
    if (count > revealedCount) {
      setRevealedCount(count);
    }
  }, [dayMap, revealedCount]);

  // --- Toggle auto-play ---
  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => !prev);
    if (isSpeaking && onStopSpeaking) {
      onStopSpeaking();
    }
  }, [isSpeaking, onStopSpeaking]);

  // --- Build flat event list with day markers ---
  const flatEvents = useMemo(() => {
    const result: Array<{ event: SimulationEvent; day: number; globalIdx: number }> = [];
    let idx = 0;
    for (let d = 1; d <= TOTAL_DAYS; d++) {
      const dayEvents = dayMap.get(d);
      if (dayEvents) {
        for (const ev of dayEvents) {
          result.push({ event: ev, day: d, globalIdx: idx });
          idx++;
        }
      }
    }
    return result;
  }, [dayMap]);

  // --- Date range label ---
  const dateRangeLabel = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${new Date(endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    : '14 dias de simulação';

  return (
    <div className="flex flex-col min-h-full pb-6">
      {/* ---- Animated Title ---- */}
      {!titleDone ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <AnimatedTitle onComplete={handleTitleDone} />
        </div>
      ) : (
        <div className="p-4 space-y-5 animate-[fadeIn_0.5s_ease-out]">
          {/* Header */}
          <div className="text-center">
            <h1
              className="text-xl sm:text-2xl font-bold text-ceramic-text-primary"
              style={{ fontFamily: FREDOKA }}
            >
              Enquanto voc{'\u00EA'} esteve fora...
            </h1>
            <p className="text-ceramic-text-secondary text-xs mt-1">
              {'\u{1F4C5}'} {dateRangeLabel}
            </p>
          </div>

          {/* ---- Controls Bar ---- */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={toggleAutoPlay}
              aria-label={autoPlay ? 'Pausar narração automática' : 'Retomar narração automática'}
              className={[
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors',
                autoPlay
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-ceramic-cool text-ceramic-text-secondary',
              ].join(' ')}
            >
              {autoPlay ? '\u{25B6}\u{FE0F}' : '\u{23F8}\u{FE0F}'}
              <span>{autoPlay ? 'Reproduzindo' : 'Pausado'}</span>
            </button>

            {!allRevealed && (
              <button
                onClick={handleRevealAll}
                aria-label="Pular narração e mostrar todos os eventos"
                className="text-xs px-3 py-1.5 rounded-lg bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border transition-colors"
              >
                Pular tudo {'\u{23E9}'}
              </button>
            )}

            {isSpeaking && onStopSpeaking && (
              <button
                onClick={onStopSpeaking}
                aria-label="Parar narração por voz"
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
              >
                {'\u{1F507}'} Parar voz
              </button>
            )}
          </div>

          {/* ---- Horizontal Day Timeline ---- */}
          <div className="relative">
            <div
              ref={timelineRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-ceramic-border scrollbar-track-transparent"
              role="tablist"
              aria-label="Linha do tempo por dia"
            >
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(day => (
                <div key={day} data-day={day}>
                  <DayPill
                    day={day}
                    hasEvents={dayMap.has(day)}
                    isActive={activeDay === day}
                    isRevealed={(() => {
                      let count = 0;
                      for (let d = 1; d <= day; d++) {
                        const dEvents = dayMap.get(d);
                        if (dEvents) count += dEvents.length;
                      }
                      return count <= revealedCount;
                    })()}
                    onClick={() => handleDayClick(day)}
                  />
                </div>
              ))}
            </div>
            {/* Fade edges */}
            <div className="absolute top-0 left-0 w-6 h-full bg-gradient-to-r from-ceramic-base to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-6 h-full bg-gradient-to-l from-ceramic-base to-transparent pointer-events-none" />
          </div>

          {/* ---- Progress Indicator ---- */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-ceramic-cool/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: events.length > 0 ? `${(revealedCount / events.length) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-[10px] text-ceramic-text-secondary flex-shrink-0">
              {revealedCount}/{events.length} eventos
            </span>
          </div>

          {/* ---- Event Cards ---- */}
          <div className="space-y-3">
            <h2
              className="text-base font-semibold text-ceramic-text-primary"
              style={{ fontFamily: FREDOKA }}
            >
              {'\u{1F4DC}'} Eventos da Simulação
            </h2>

            {flatEvents.length > 0 ? (
              <div className="space-y-2.5">
                {flatEvents.map(({ event, day, globalIdx }, i) => {
                  // Show day separator
                  const showDaySep = i === 0 || flatEvents[i - 1].day !== day;
                  return (
                    <React.Fragment key={globalIdx}>
                      {showDaySep && (
                        <div className="flex items-center gap-2 pt-2">
                          <div className="h-px flex-1 bg-ceramic-border/50" />
                          <span
                            className="text-[10px] font-bold text-amber-600 uppercase tracking-wider"
                            style={{ fontFamily: FREDOKA }}
                          >
                            Dia {day}
                          </span>
                          <div className="h-px flex-1 bg-ceramic-border/50" />
                        </div>
                      )}
                      <EventCard
                        event={event}
                        index={globalIdx}
                        isRevealed={globalIdx < revealedCount}
                        isNarrating={narratingIdx === globalIdx}
                      />
                    </React.Fragment>
                  );
                })}
                <div ref={eventsEndRef} />
              </div>
            ) : (
              <div className="p-4 bg-ceramic-inset rounded-xl text-center">
                <p className="text-ceramic-text-secondary text-sm">
                  Nenhum evento registrado nesta simulação.
                </p>
              </div>
            )}
          </div>

          {/* ---- Summary Card ---- */}
          {allRevealed && summary && (
            <div className="p-4 bg-ceramic-card rounded-xl shadow-ceramic-emboss animate-[fadeIn_0.5s_ease-out]">
              <h2
                className="text-sm font-semibold text-ceramic-text-primary mb-2"
                style={{ fontFamily: FREDOKA }}
              >
                {'\u{1F989}'} Resumo da Sábia Coruja
              </h2>
              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                {summary}
              </p>
            </div>
          )}

          {/* ---- Stats Before/After ---- */}
          {showStats && (
            <div className="p-4 bg-ceramic-card rounded-xl shadow-ceramic-emboss space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <h2
                className="text-sm font-semibold text-ceramic-text-primary"
                style={{ fontFamily: FREDOKA }}
              >
                {'\u{1F4CA}'} Evolução dos Atributos
              </h2>
              {STAT_CONFIG.map(stat => (
                <StatComparisonBar
                  key={stat.key}
                  label={stat.label}
                  emoji={stat.emoji}
                  color={stat.color}
                  before={effectiveBefore[stat.key]}
                  after={effectiveAfter[stat.key]}
                  delta={statsDelta[stat.key] ?? 0}
                  animate={animateStats}
                />
              ))}

              {/* Delta chips */}
              <div className="flex justify-center gap-3 pt-2 border-t border-ceramic-border/30">
                {STAT_CONFIG.map(stat => {
                  const d = statsDelta[stat.key] ?? 0;
                  return (
                    <div
                      key={stat.key}
                      className={[
                        'text-xs font-bold px-2.5 py-1 rounded-full',
                        d > 0 ? 'bg-emerald-100 text-emerald-700'
                          : d < 0 ? 'bg-rose-100 text-rose-700'
                          : 'bg-ceramic-cool text-ceramic-text-secondary',
                      ].join(' ')}
                    >
                      {stat.emoji} {d > 0 ? '+' : ''}{d}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- CTA Button ---- */}
          {showCTA && (
            <button
              onClick={onBack}
              aria-label="Continuar aventura e voltar ao jogo"
              className={[
                'w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
                'text-white font-bold rounded-xl transition-all duration-200',
                'shadow-lg hover:shadow-xl active:scale-[0.98]',
                'animate-[fadeIn_0.5s_ease-out]',
              ].join(' ')}
              style={{ fontFamily: FREDOKA }}
            >
              {'\u{1F680}'} Continuar aventura!
            </button>
          )}

          {/* Fallback back button if events are empty */}
          {events.length === 0 && (
            <button
              onClick={onBack}
              aria-label="Voltar ao início"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
              style={{ fontFamily: FREDOKA }}
            >
              Voltar ao Início
            </button>
          )}
        </div>
      )}
    </div>
  );
}
