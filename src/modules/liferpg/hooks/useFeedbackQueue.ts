/**
 * useFeedbackQueue — Fetch pending questions, prioritize, process answers.
 * Max 2 questions/day per user, diversified across entities.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FeedbackQuestion } from '../types/liferpg';

const log = createNamespacedLogger('useFeedbackQueue');

const MAX_DAILY_QUESTIONS = 2;
const ANSWERED_TODAY_KEY = 'liferpg_feedback_answered_today';

interface UseFeedbackQueueReturn {
  currentQuestion: FeedbackQuestion | null;
  loading: boolean;
  dailyLimitReached: boolean;
  answerQuestion: (questionId: string, answer: string) => Promise<boolean>;
  skipQuestion: (questionId: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

function getAnsweredToday(): number {
  try {
    const stored = localStorage.getItem(ANSWERED_TODAY_KEY);
    if (!stored) return 0;
    const { date, count } = JSON.parse(stored);
    if (date !== new Date().toISOString().split('T')[0]) return 0;
    return count;
  } catch {
    return 0;
  }
}

function incrementAnsweredToday(): void {
  const date = new Date().toISOString().split('T')[0];
  const current = getAnsweredToday();
  localStorage.setItem(ANSWERED_TODAY_KEY, JSON.stringify({ date, count: current + 1 }));
}

export function useFeedbackQueue(): UseFeedbackQueueReturn {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [answeredToday, setAnsweredToday] = useState(0);

  const dailyLimitReached = answeredToday >= MAX_DAILY_QUESTIONS;

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('entity_feedback_queue')
        .select('*, entity_personas!inner(persona_name, avatar_emoji, entity_type)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Diversify: one question per persona, sorted by priority
      const seen = new Set<string>();
      const diversified = (data || []).filter((q: FeedbackQuestion) => {
        if (seen.has(q.persona_id)) return false;
        seen.add(q.persona_id);
        return true;
      });

      setQuestions(diversified);
      setAnsweredToday(getAnsweredToday());
    } catch (err) {
      log.error('Failed to load feedback queue', { err });
    } finally {
      setLoading(false);
    }
  }, []);

  const answerQuestion = useCallback(async (questionId: string, answer: string): Promise<boolean> => {
    try {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return false;

      // Update question
      const { error } = await supabase
        .from('entity_feedback_queue')
        .update({
          answer,
          answered_at: new Date().toISOString(),
          status: 'answered',
        })
        .eq('id', questionId);

      if (error) throw error;

      // Log event
      await supabase.from('entity_event_log').insert({
        persona_id: question.persona_id,
        event_type: 'feedback_answered',
        event_data: {
          question_id: questionId,
          question_type: question.question_type,
          answer_preview: answer.slice(0, 100),
        },
        triggered_by: 'user',
      });

      // Recovery: +2 HP for answering feedback
      const { data: persona } = await supabase
        .from('entity_personas')
        .select('hp')
        .eq('id', question.persona_id)
        .single();

      if (persona) {
        await supabase
          .from('entity_personas')
          .update({ hp: Math.min(100, (persona.hp || 0) + 2) })
          .eq('id', question.persona_id);
      }

      incrementAnsweredToday();
      setAnsweredToday((prev) => prev + 1);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));

      return true;
    } catch (err) {
      log.error('Failed to answer question', { err });
      return false;
    }
  }, [questions]);

  const skipQuestion = useCallback(async (questionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('entity_feedback_queue')
        .update({ status: 'skipped' })
        .eq('id', questionId);

      if (error) throw error;
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      return true;
    } catch (err) {
      log.error('Failed to skip question', { err });
      return false;
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQuestion = dailyLimitReached ? null : questions[0] || null;

  return {
    currentQuestion,
    loading,
    dailyLimitReached,
    answerQuestion,
    skipQuestion,
    reload: loadQuestions,
  };
}
