/**
 * Gemini Sentiment Analysis Integration
 * Analyzes emotional content using Google's Gemini API
 *
 * Features:
 * - Sentiment scoring (-1 to 1)
 * - Emotion detection
 * - Confidence scoring
 * - Fallback for failures
 */

import { GeminiClient } from '@/lib/gemini'
import { SentimentAnalysisResult } from '@/modules/journey/types/persistenceTypes'

import { createNamespacedLogger } from '@/lib/logger'

const log = createNamespacedLogger('GeminiSentimentAnalysis')
const geminiClient = GeminiClient.getInstance()

/**
 * Analyze content sentiment using Gemini
 * @param content - Text or transcription to analyze
 * @returns Sentiment analysis result
 */
export async function analyzeSentimentWithGemini(content: string): Promise<SentimentAnalysisResult> {
  if (!content || content.trim().length === 0) {
    return getDefaultSentimentResult()
  }

  try {
    const prompt = `Análise o sentimento do seguinte texto em Português e retorne um JSON.

Texto: "${content}"

Retorne EXATAMENTE este JSON (sem markdown):
{
  "sentiment_score": <número entre -1 e 1>,
  "sentiment_label": "<very_positive|positive|neutral|negative|very_negative>",
  "confidence": <número entre 0 e 1>,
  "keywords": [<lista de palavras-chave que indicam sentimento>],
  "tone": "<descriptivo tom em 1-2 palavras>",
  "intensity": <1-10>
}

Diretrizes:
- sentiment_score: -1 (muito negativo) a 1 (muito positivo)
- Seja preciso e empático
- Considere contexto e nuances da linguagem
- Detecte múltiplas emoções se presentes`

    const response = await geminiClient.call({
      action: 'analyze_sentiment',
      payload: {
        content: content.substring(0, 2000), // Limit to 2000 chars for cost
        prompt,
        temperature: 0.3,
        maxOutputTokens: 300,
      },
    })

    const responseText = response.result?.text || JSON.stringify(response.result)
    const parsed = parseGeminiSentimentResponse(responseText)

    return {
      score: parsed.sentiment_score,
      label: parsed.sentiment_label,
      confidence: parsed.confidence,
      keywords: parsed.keywords,
      generatedAt: new Date(),
    }
  } catch (error) {
    log.error('Error analyzing sentiment:', error)
    return getDefaultSentimentResult()
  }
}

/**
 * Analyze multiple texts and compare sentiments
 */
export async function compareSentiments(texts: string[]): Promise<SentimentAnalysisResult[]> {
  const results = await Promise.all(texts.map(text => analyzeSentimentWithGemini(text)))
  return results
}

/**
 * Detect emotional patterns from sentiment history
 */
export async function detectEmotionalPatterns(
  sentimentHistory: SentimentAnalysisResult[]
): Promise<{
  trend: 'ascending' | 'descending' | 'stable' | 'volatile'
  averageScore: number
  dominantEmotion: string
  patterns: string[]
}> {
  if (sentimentHistory.length === 0) {
    return {
      trend: 'stable',
      averageScore: 0,
      dominantEmotion: 'neutral',
      patterns: [],
    }
  }

  // Calculate trend
  const scores = sentimentHistory.map(s => s.score)
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length

  const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
  const secondHalf = scores.slice(Math.floor(scores.length / 2))

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  let trend: 'ascending' | 'descending' | 'stable' | 'volatile'
  if (secondAvg > firstAvg + 0.2) {
    trend = 'ascending'
  } else if (secondAvg < firstAvg - 0.2) {
    trend = 'descending'
  } else if (Math.max(...scores) - Math.min(...scores) > 1.5) {
    trend = 'volatile'
  } else {
    trend = 'stable'
  }

  // Dominant emotion
  const labelCounts = sentimentHistory.reduce(
    (acc, s) => {
      acc[s.label] = (acc[s.label] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const dominantEmotion = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

  // Detect patterns
  const patterns: string[] = []

  if (trend === 'ascending') {
    patterns.push('Você esta melhorando emocionalmente!')
  } else if (trend === 'descending') {
    patterns.push('Parece que você tem passado por um período desafiador.')
  }

  if (averageScore > 0.3) {
    patterns.push('Sua tendencia geral é positiva.')
  } else if (averageScore < -0.3) {
    patterns.push('Você tem expressado sentimentos mais negativos ultimamente.')
  }

  const negativeCount = sentimentHistory.filter(s => s.score < -0.3).length
  if (negativeCount >= sentimentHistory.length * 0.5) {
    patterns.push('Considere buscar apoio se estiver se sentindo muito negativo.')
  }

  return {
    trend,
    averageScore,
    dominantEmotion,
    patterns,
  }
}

/**
 * Generate sentiment-based insights
 */
export async function generateSentimentInsights(
  content: string,
  sentiment: SentimentAnalysisResult
): Promise<string> {
  if (!content) return 'Sem insights disponíveis.'

  try {
    const prompt = `Com base no sentimento analisado, gere um insight util e empático.

Conteúdo: "${content.substring(0, 500)}"
Sentimento: ${sentiment.label} (score: ${sentiment.score})
Palavras-chave: ${sentiment.keywords.join(', ')}

Retorne um insight em 2-3 frases que seja:
- Empático e não julgador
- Oferça uma perspectiva útil
- Sugira reflexão construtiva`

    const response = await geminiClient.call({
      action: 'generate_sentiment_insights',
      payload: {
        content: content.substring(0, 500),
        sentiment: sentiment.label,
        prompt,
        temperature: 0.7,
        maxOutputTokens: 150,
      },
    })

    return response.result?.text || 'Reflexão completa para seu momento.'
  } catch (error) {
    log.error('Error generating insights:', error)
    return 'Reflexão completa para seu momento.'
  }
}

/**
 * Parse Gemini's sentiment response
 */
function parseGeminiSentimentResponse(responseText: string): {
  sentiment_score: number
  sentiment_label: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number
  keywords: string[]
} {
  try {
    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return getDefaultSentimentParsed()
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate and normalize sentiment score
    let score = parseFloat(parsed.sentiment_score) || 0
    score = Math.max(-1, Math.min(1, score))

    // Normalize sentiment label
    const validLabels = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
    const label = validLabels.includes(parsed.sentiment_label)
      ? parsed.sentiment_label
      : labelFromScore(score)

    // Normalize confidence
    let confidence = parseFloat(parsed.confidence) || 0.5
    confidence = Math.max(0, Math.min(1, confidence))

    // Extract keywords
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []

    return {
      sentiment_score: score,
      sentiment_label: label as any,
      confidence,
      keywords: keywords.filter((k: any) => typeof k === 'string'),
    }
  } catch (error) {
    log.error('Error parsing response:', error)
    return getDefaultSentimentParsed()
  }
}

/**
 * Determine sentiment label from score
 */
function labelFromScore(score: number): 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative' {
  if (score >= 0.5) return 'very_positive'
  if (score >= 0.15) return 'positive'
  if (score >= -0.15) return 'neutral'
  if (score >= -0.5) return 'negative'
  return 'very_negative'
}

/**
 * Get default sentiment result
 */
function getDefaultSentimentResult(): SentimentAnalysisResult {
  return {
    score: 0,
    label: 'neutral',
    confidence: 0.5,
    keywords: [],
    generatedAt: new Date(),
  }
}

/**
 * Get default parsed sentiment
 */
function getDefaultSentimentParsed(): {
  sentiment_score: number
  sentiment_label: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number
  keywords: string[]
} {
  return {
    sentiment_score: 0,
    sentiment_label: 'neutral',
    confidence: 0.5,
    keywords: [],
  }
}

/**
 * Batch sentiment analysis for multiple texts
 */
export async function batchAnalyzeSentiments(
  texts: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<SentimentAnalysisResult[]> {
  const results: SentimentAnalysisResult[] = []

  for (let i = 0; i < texts.length; i++) {
    const result = await analyzeSentimentWithGemini(texts[i])
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, texts.length)
    }
  }

  return results
}

/**
 * Cache sentiment analysis results
 */
const sentimentCache = new Map<string, { result: SentimentAnalysisResult; timestamp: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Get cached sentiment or analyze
 */
export async function getCachedOrAnalyzeSentiment(
  content: string,
  forceRefresh: boolean = false
): Promise<SentimentAnalysisResult> {
  const contentHash = hashString(content)

  if (!forceRefresh) {
    const cached = sentimentCache.get(contentHash)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result
    }
  }

  const result = await analyzeSentimentWithGemini(content)
  sentimentCache.set(contentHash, { result, timestamp: Date.now() })

  return result
}

/**
 * Simple hash function for caching
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString()
}

/**
 * Clear sentiment cache
 */
export function clearSentimentCache(): void {
  sentimentCache.clear()
}

/**
 * Get cache stats
 */
export function getSentimentCacheStats(): { size: number; entries: number } {
  return {
    size: sentimentCache.size,
    entries: sentimentCache.size,
  }
}
