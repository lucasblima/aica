import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus, Clock } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { HeaderGlobal } from '@/components/layout';
import type { ContentCalendarEntry } from '../types/studio';

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  spotify: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  youtube: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  instagram: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  tiktok: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  linkedin: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  twitter: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
  newsletter: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  blog: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
};

const PLATFORM_DOTS: Record<string, string> = {
  spotify: 'bg-green-500',
  youtube: 'bg-red-500',
  instagram: 'bg-purple-500',
  tiktok: 'bg-gray-500',
  linkedin: 'bg-blue-500',
  twitter: 'bg-sky-500',
  newsletter: 'bg-violet-500',
  blog: 'bg-amber-500',
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  scheduled: { label: 'Agendado', className: 'bg-blue-100 text-blue-700' },
  publishing: { label: 'Publicando', className: 'bg-amber-100 text-amber-700' },
  published: { label: 'Publicado', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Falhou', className: 'bg-red-100 text-red-700' },
};

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function ContentCalendarPage() {
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [entries, setEntries] = useState<ContentCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date(currentYear, currentMonth, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('studio_content_calendar')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_at', startDate)
        .lte('scheduled_at', endDate)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setEntries((data || []).map((e: any) => ({
        ...e,
        scheduledAt: new Date(e.scheduled_at),
        publishedAt: e.published_at ? new Date(e.published_at) : undefined,
        createdAt: new Date(e.created_at),
        userId: e.user_id,
        projectId: e.project_id,
        clipId: e.clip_id,
      })));
    } catch (err) {
      console.error('Failed to load calendar entries:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const entriesByDay = useMemo(() => {
    const map = new Map<number, ContentCalendarEntry[]>();
    for (const entry of entries) {
      const day = entry.scheduledAt.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(entry);
    }
    return map;
  }, [entries]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  };

  const selectedEntries = selectedDay ? (entriesByDay.get(selectedDay) || []) : [];
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      <HeaderGlobal title="Calendario de Conteudo" subtitle="STUDIO" onLogoClick={() => navigate('/')} />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32 pt-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={goToPrevMonth} className="ceramic-inset p-2 rounded-xl hover:scale-105 transition-transform">
            <ChevronLeft className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <button onClick={goToNextMonth} className="ceramic-inset p-2 rounded-xl hover:scale-105 transition-transform">
            <ChevronRight className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map(name => (
            <div key={name} className="text-center text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-ceramic-cool animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const dayEntries = entriesByDay.get(day) || [];
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-start transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-100 border-2 border-amber-400 scale-105'
                      : isToday(day)
                        ? 'bg-amber-50 border border-amber-200'
                        : 'bg-ceramic-base hover:bg-ceramic-cool border border-ceramic-border'
                  }`}
                >
                  <span className={`text-xs font-bold ${
                    isSelected ? 'text-amber-700' : isToday(day) ? 'text-amber-600' : 'text-ceramic-text-primary'
                  }`}>
                    {day}
                  </span>
                  {dayEntries.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {dayEntries.slice(0, 4).map((entry, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOTS[entry.platform] || 'bg-gray-400'}`}
                        />
                      ))}
                      {dayEntries.length > 4 && (
                        <span className="text-[8px] text-ceramic-text-secondary">+{dayEntries.length - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Day Detail Sidebar */}
        <AnimatePresence>
          {selectedDay !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6 ceramic-card rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-ceramic-text-primary">
                  {selectedDay} de {MONTH_NAMES[currentMonth]}
                </h3>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors">
                    <Plus className="w-3 h-3" />
                    Agendar Novo
                  </button>
                  <button onClick={() => setSelectedDay(null)} className="ceramic-inset p-1.5 rounded-lg">
                    <X className="w-4 h-4 text-ceramic-text-secondary" />
                  </button>
                </div>
              </div>

              {selectedEntries.length === 0 ? (
                <div className="ceramic-inset rounded-xl p-6 text-center">
                  <p className="text-sm text-ceramic-text-secondary">Nenhum conteudo agendado para este dia.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEntries.map(entry => {
                    const colors = PLATFORM_COLORS[entry.platform] || PLATFORM_COLORS.blog;
                    const status = STATUS_LABELS[entry.status] || STATUS_LABELS.draft;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl bg-ceramic-cool">
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                          {entry.platform}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ceramic-text-primary truncate">
                            {entry.caption || 'Sem titulo'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-ceramic-text-secondary" />
                            <span className="text-[10px] text-ceramic-text-secondary">
                              {entry.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
