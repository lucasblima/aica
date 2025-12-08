import { supabase } from './supabaseClient';

// =====================================================
// Journey Service — Momentos, Perguntas, Reflexões
// =====================================================

export interface JourneyMoment {
  id: string;
  user_id: string;
  content: string;
  mood?: string;
  type: 'moment' | 'question_answer' | 'reflection';
  question_id?: string;
  week_number: number;
  created_at: string;
}

export interface DailyQuestion {
  id: string;
  question: string;
  category: string;
  created_at: string;
}

export interface JourneyStats {
  level: number;
  levelName: string;
  streakDays: number;
  totalMoments: number;
  totalQuestions: number;
  totalReflections: number;
  lastMoment?: {
    text: string;
    date: string;
    mood?: string;
  };
}

/**
 * Buscar stats da jornada do usuário
 */
export async function getJourneyStats(userId: string): Promise<JourneyStats> {
  // Buscar contagens
  const { data: moments, error } = await supabase
    .from('journey_moments')
    .select('id, content, type, created_at, mood')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const totalMoments = moments?.filter(m => m.type === 'moment').length || 0;
  const totalQuestions = moments?.filter(m => m.type === 'question_answer').length || 0;
  const totalReflections = moments?.filter(m => m.type === 'reflection').length || 0;

  // Calcular streak
  const streakDays = calculateStreak(moments || []);

  // Calcular nível
  const { level, levelName } = calculateLevel(totalMoments + totalQuestions + totalReflections);

  // Último momento
  const lastMomentData = moments?.[0];
  const lastMoment = lastMomentData ? {
    text: lastMomentData.content,
    date: formatRelativeDate(lastMomentData.created_at),
    mood: lastMomentData.mood
  } : undefined;

  return {
    level,
    levelName,
    streakDays,
    totalMoments,
    totalQuestions,
    totalReflections,
    lastMoment
  };
}

/**
 * Registrar um momento
 */
export async function registerMoment(
  userId: string,
  content: string,
  weekNumber: number,
  type: 'moment' | 'question_answer' | 'reflection' = 'moment',
  questionId?: string
): Promise<JourneyMoment> {
  const { data, error } = await supabase
    .from('journey_moments')
    .insert({
      user_id: userId,
      content,
      type,
      question_id: questionId,
      week_number: weekNumber
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Buscar pergunta do dia
 */
export async function getDailyQuestion(): Promise<DailyQuestion> {
  const dayOfWeek = new Date().getDay();

  // Buscar pergunta baseada no dia da semana
  const { data, error } = await supabase
    .from('journey_questions')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback para pergunta aleatória
    const { data: randomQuestion } = await supabase
      .from('journey_questions')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (randomQuestion) return randomQuestion;

    // Fallback final
    const today = new Date().toISOString();
    return {
      id: 'default',
      question: 'O que drenou sua energia hoje e o que a restaurou?',
      category: 'reflection',
      created_at: today
    };
  }

  return data;
}

/**
 * Verificar se usuário respondeu pergunta hoje
 */
export async function hasAnsweredToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { count } = await supabase
    .from('journey_moments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'question_answer')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  return (count ?? 0) > 0;
}

/**
 * Buscar momentos recentes
 */
export async function getRecentMoments(userId: string, limit: number = 10): Promise<JourneyMoment[]> {
  const { data, error } = await supabase
    .from('journey_moments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// === Helpers ===

function calculateStreak(moments: any[]): number {
  if (moments.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Agrupar por dia
  const daySet = new Set(
    moments.map(m => new Date(m.created_at).toISOString().split('T')[0])
  );

  // Contar dias consecutivos a partir de hoje
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    if (daySet.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

function calculateLevel(totalEntries: number): { level: number; levelName: string } {
  const levels = [
    { min: 0, name: 'Observador' },
    { min: 7, name: 'Consciente' },
    { min: 30, name: 'Reflexivo' },
    { min: 90, name: 'Sábio' },
    { min: 180, name: 'Mestre' },
    { min: 365, name: 'Iluminado' }
  ];

  let current = levels[0];
  let level = 1;

  for (let i = 0; i < levels.length; i++) {
    if (totalEntries >= levels[i].min) {
      current = levels[i];
      level = i + 1;
    }
  }

  return { level, levelName: current.name };
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
