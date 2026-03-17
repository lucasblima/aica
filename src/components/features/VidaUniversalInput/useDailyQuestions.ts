/**
 * useDailyQuestions — Hook for carousel daily questions
 *
 * Fetches a shuffled batch of daily questions from:
 * 1. Supabase `daily_questions` table (if user is authenticated)
 * 2. Fallback to the local pool from dailyQuestionService
 *
 * Returns a stable list of questions that rotates daily.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { createNamespacedLogger } from '@/lib/logger'
import type { DailyQuestion } from '@/modules/journey/types/dailyQuestion'

const log = createNamespacedLogger('useDailyQuestions')

/** How many questions to display in the carousel */
const CAROUSEL_SIZE = 8

/**
 * Local fallback pool — a curated subset of questions for when DB is unavailable.
 * These match the dailyQuestionService pool but are kept minimal for the carousel.
 */
const FALLBACK_QUESTIONS: Pick<DailyQuestion, 'id' | 'question_text' | 'category'>[] = [
  { id: 'fb-1', question_text: 'O que você quer conquistar hoje?', category: 'change' },
  { id: 'fb-2', question_text: 'Como você esta se sentindo neste momento?', category: 'reflection' },
  { id: 'fb-3', question_text: 'Qual area da sua vida precisa de mais atenção?', category: 'reflection' },
  { id: 'fb-4', question_text: 'O que te deixaria orgulhoso hoje?', category: 'gratitude' },
  { id: 'fb-5', question_text: 'Como você pode se cuidar melhor agora?', category: 'energy' },
  { id: 'fb-6', question_text: 'Qual foi a melhor parte do seu dia?', category: 'gratitude' },
  { id: 'fb-7', question_text: 'O que você aprendeu recentemente?', category: 'learning' },
  { id: 'fb-8', question_text: 'Como você quer se sentir nesta semana?', category: 'energy' },
  { id: 'fb-9', question_text: 'Com quem você gostaria de se reconectar?', category: 'connection' },
  { id: 'fb-10', question_text: 'O que da sentido ao seu dia a dia?', category: 'purpose' },
  { id: 'fb-11', question_text: 'Que ideia tem ocupado sua mente?', category: 'creativity' },
  { id: 'fb-12', question_text: 'Você tem se movimentado o suficiente?', category: 'health' },
]

/**
 * Fisher-Yates shuffle with a daily seed so the order is stable per day
 * but changes each new day.
 */
function shuffleWithDailySeed<T>(array: T[]): T[] {
  const copy = [...array]
  // Use day-of-year as seed for deterministic daily shuffle
  const now = new Date()
  let seed = now.getFullYear() * 1000 + Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Simple seeded PRNG (mulberry32)
  function nextRandom(): number {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export interface DailyQuestionItem {
  id: string
  text: string
  category: string
}

export function useDailyQuestions() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<DailyQuestionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const fetchedRef = useRef(false)

  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true)

      if (user?.id) {
        // Try fetching from Supabase
        const { data, error } = await supabase
          .from('daily_questions')
          .select('id, question_text, category')
          .eq('active', true)
          .limit(30)

        if (!error && data && data.length > 0) {
          const shuffled = shuffleWithDailySeed(data).slice(0, CAROUSEL_SIZE)
          setQuestions(shuffled.map(q => ({
            id: q.id,
            text: q.question_text,
            category: q.category,
          })))
          return
        }

        if (error) {
          log.warn('Failed to fetch daily questions from DB, using fallback:', error.message)
        }
      }

      // Fallback: use local pool
      const shuffled = shuffleWithDailySeed(FALLBACK_QUESTIONS).slice(0, CAROUSEL_SIZE)
      setQuestions(shuffled.map(q => ({
        id: q.id,
        text: q.question_text,
        category: q.category,
      })))
    } catch (err) {
      log.error('Error in useDailyQuestions:', err)
      // Ultimate fallback
      const shuffled = shuffleWithDailySeed(FALLBACK_QUESTIONS).slice(0, CAROUSEL_SIZE)
      setQuestions(shuffled.map(q => ({
        id: q.id,
        text: q.question_text,
        category: q.category,
      })))
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchQuestions()
    }
  }, [fetchQuestions])

  return { questions, isLoading }
}
