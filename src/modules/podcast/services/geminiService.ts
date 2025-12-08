/**
 * Gemini Service - Podcast Module
 *
 * Refatorado para usar backend seguro via Edge Functions/Python server
 * Remove chamadas diretas ao Gemini API (API key agora protegida no backend)
 */

import { GeminiClient } from '@/lib/gemini'
import type { Dossier } from '../types'

// Initialize client singleton
const geminiClient = GeminiClient.getInstance()

// =====================================================
// PREPARATION MODE FUNCTIONS
// =====================================================

/**
 * Suggest a trending guest for podcast interview
 * Uses Edge Function (fast operation < 10s)
 */
export const suggestTrendingGuest = async (): Promise<string> => {
  try {
    const response = await geminiClient.call({
      action: 'suggest_guest',
      payload: {},
      model: 'smart' // Use smarter model for better suggestions
    })

    return response.result || ""
  } catch (error) {
    console.error("Erro ao sugerir convidado:", error)
    return ""
  }
}

/**
 * Suggest a trending theme based on guest name
 * Uses Edge Function (fast operation < 10s)
 */
export const suggestTrendingTheme = async (guestName: string): Promise<string> => {
  try {
    const response = await geminiClient.call({
      action: 'suggest_topic',
      payload: { guestName },
      model: 'smart'
    })

    return response.result || "Carreira e Atualidades"
  } catch (error) {
    console.error("Erro ao sugerir tema:", error)
    return ""
  }
}

/**
 * Generate comprehensive dossier for podcast guest
 * Uses Edge Function (fast operation < 10s)
 *
 * For deep research (> 10s), use the Python server endpoint instead
 */
export const generateDossier = async (guestName: string, theme?: string): Promise<Dossier> => {
  try {
    const response = await geminiClient.call({
      action: 'generate_dossier',
      payload: {
        guestName,
        theme: theme || undefined
      },
      model: 'smart' // Use smarter model for detailed dossiers
    })

    // Parse and structure the response
    const data = typeof response.result === 'string'
      ? JSON.parse(response.result)
      : response.result

    const finalTheme = (theme && theme.trim())
      ? theme
      : (data.derivedTheme || "Carreira & Atualidades")

    return {
      guestName,
      episodeTheme: finalTheme,
      biography: data.biography || "Não foi possível gerar o dossiê automaticamente.",
      controversies: data.controversies || [],
      suggestedTopics: data.suggestedTopics || [],
      iceBreakers: data.iceBreakers || [],
      technicalSheet: data.technicalSheet || undefined
    } as Dossier

  } catch (error) {
    console.error("Erro ao gerar dossiê:", error)

    // Fallback dossier
    return {
      guestName,
      episodeTheme: theme || "Carreira & Atualidades",
      biography: "Não foi possível gerar o dossiê automaticamente.",
      controversies: [],
      suggestedTopics: [],
      iceBreakers: []
    }
  }
}

/**
 * Analyze sentiment and topics from news articles
 * Uses Edge Function (fast operation < 10s)
 */
export const analyzeNews = async (articles: any[]): Promise<any[]> => {
  if (articles.length === 0) return []

  try {
    const response = await geminiClient.call({
      action: 'analyze_news',
      payload: { articles },
      model: 'fast' // Fast model sufficient for sentiment analysis
    })

    const analysis = response.result

    // Merge analysis with original articles
    return articles.map((article, idx) => {
      const result = analysis.find((a: any) => a.index === idx + 1 || a.index === idx)
      return {
        ...article,
        sentiment: result?.sentiment || 'neutral',
        topics: result?.topics || [],
        index: idx
      }
    })

  } catch (error) {
    console.error("Erro na análise de notícias:", error)
    return articles // Return original if analysis fails
  }
}

/**
 * Suggest a dynamic topic based on pauta and category
 * Uses Edge Function (fast operation < 10s)
 */
export const suggestDynamicTopic = async (
  pauta: Dossier,
  category?: { name: string; description?: string } | null
): Promise<string> => {
  try {
    const response = await geminiClient.call({
      action: 'suggest_dynamic_topic',
      payload: {
        guestName: pauta.guestName,
        episodeTheme: pauta.episodeTheme,
        category: category ? {
          name: category.name,
          description: category.description
        } : null
      },
      model: 'smart'
    })

    return response.result || ""

  } catch (error) {
    console.error("Erro ao sugerir tópico:", error)
    return ""
  }
}

/**
 * Generate more ice breaker questions
 * Uses Edge Function (fast operation < 10s)
 */
export const generateMoreIceBreakers = async (
  guestName: string,
  theme: string,
  existing: string[],
  count: number = 3
): Promise<string[]> => {
  try {
    const response = await geminiClient.call({
      action: 'generate_ice_breakers',
      payload: {
        guestName,
        theme,
        existing,
        count
      },
      model: 'smart'
    })

    return response.result || []

  } catch (error) {
    console.error("Erro ao gerar ice breakers:", error)
    return []
  }
}

/**
 * Chat with Aica AI assistant
 * Uses Edge Function (fast operation < 10s)
 */
export const chatWithAica = async (message: string, context: string): Promise<string> => {
  try {
    const response = await geminiClient.call({
      action: 'chat_aica',
      payload: {
        message,
        context
      },
      model: 'fast' // Fast model for chat
    })

    return response.result || "Desculpe, estou indisponível no momento."

  } catch (error) {
    console.error("Erro no chat:", error)
    return "Desculpe, estou indisponível no momento."
  }
}

/**
 * Get Gemini Live client for real-time WebSocket communication
 * Uses WebSocket Edge Function
 *
 * @deprecated This function should be updated to use the new WebSocket proxy
 * For now, returns null to prevent direct API calls
 */
export const getLiveClient = () => {
  console.warn(
    'getLiveClient() is deprecated. ' +
    'Use WebSocket connection to /functions/v1/gemini-live instead'
  )
  return null
}
