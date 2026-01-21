/**
 * AI Analysis Service
 * Real-time content analysis for Journey moments
 *
 * Provides:
 * - Reflective questions
 * - Pattern identification
 * - Theme suggestions
 * - Emotional insights
 */

import { GeminiClient } from '@/lib/gemini/client';
import { createNamespacedLogger } from '@/lib/logger';
import { trackAIUsage } from '@/services/aiUsageTrackingService';

const log = createNamespacedLogger('AIAnalysis');

export interface AISuggestion {
  type: 'reflection' | 'question' | 'pattern';
  message: string;
  icon?: string;
}

/**
 * Analyzes content in real-time and returns a suggestion
 * Called after 3s of no typing (debounced)
 */
export async function analyzeContentRealtime(content: string): Promise<AISuggestion | null> {
  if (content.trim().length < 20) {
    return null;
  }

  const startTime = Date.now();

  try {
    const gemini = GeminiClient.getInstance();

    const response = await gemini.call({
      action: 'analyze_content_realtime',
      payload: {
        content,
        prompt: `Você é um coach de auto-reflexão. Analise este momento pessoal e forneça UMA sugestão útil.

Momento: "${content}"

Retorne um JSON no seguinte formato:
{
  "type": "reflection" | "question" | "pattern",
  "message": "sua sugestão aqui (máximo 2 linhas)"
}

Tipos:
- "reflection": Uma observação ou reflexão sobre o momento
- "question": Uma pergunta profunda para aprofundar a reflexão
- "pattern": Um padrão ou tema que você identifica

Seja conciso e empático. Máximo 2 linhas.`,
        temperature: 0.8,
        maxOutputTokens: 150,
      },
    });

    // Track AI usage (non-blocking, fire-and-forget)
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: response.model || 'gemini-2.0-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'analyzeContentRealtime',
        operation: 'realtime_analysis',
        content_length: content.length,
      }
    }).catch(error => {
      // Non-blocking: log error but don't throw
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
    });

    // Parse JSON response
    const text = response.result?.text || JSON.stringify(response.result);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Fallback: return a generic suggestion
      return {
        type: 'question',
        message: 'O que você aprendeu com essa experiência?',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      type: parsed.type || 'reflection',
      message: parsed.message || 'Continue refletindo sobre isso.',
    };
  } catch (error) {
    log.error('[aiAnalysisService] Error analyzing content:', error);

    // Fallback suggestions based on content length and keywords
    return generateFallbackSuggestion(content);
  }
}

/**
 * Generates post-capture insights by analyzing the moment + recent history
 */
export async function generatePostCaptureInsight(
  newMoment: string,
  recentMoments: Array<{ content: string; tags: string[]; created_at: string }>
): Promise<{
  message: string;
  relatedMoments: number;
  theme?: string;
  action?: 'view_similar' | 'view_patterns';
}> {
  // Extract themes from recent moments (outside try for fallback access)
  const recentTexts = recentMoments.map((m) => m.content).join('\n---\n');
  const allTags = recentMoments.flatMap((m) => m.tags);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const startTime = Date.now();

  try {
    const gemini = GeminiClient.getInstance();

    const response = await gemini.call({
      action: 'generate_post_capture_insight',
      payload: {
        newMoment,
        recentTexts,
        topTags: topTags.join(', '),
        prompt: `Analise este novo momento pessoal e identifique conexões com momentos recentes.

Novo momento: "${newMoment}"

Momentos recentes (últimos 7 dias):
${recentTexts}

Tags recorrentes: ${topTags.join(', ')}

Retorne um JSON:
{
  "message": "insight em 1-2 linhas (ex: 'Este é o 3º momento sobre trabalho esta semana')",
  "theme": "tema principal identificado (opcional)",
  "relatedCount": número de momentos relacionados,
  "action": "view_similar" ou "view_patterns" (sugestão de próximo passo)
}`,
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    });

    // Track AI usage (non-blocking, fire-and-forget)
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: response.model || 'gemini-2.0-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'generatePostCaptureInsight',
        operation: 'post_capture_insight',
        recent_moments_count: recentMoments?.length || 0,
      }
    }).catch(error => {
      // Non-blocking: log error but don't throw
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
    });

    const text = response.result?.text || JSON.stringify(response.result);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        message: 'Momento salvo! Continue registrando sua jornada.',
        relatedMoments: 0,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      message: parsed.message || 'Momento salvo com sucesso!',
      relatedMoments: parsed.relatedCount || 0,
      theme: parsed.theme,
      action: parsed.action || 'view_patterns',
    };
  } catch (error) {
    log.error('[aiAnalysisService] Error generating insight:', error);

    // Fallback based on tags
    if (topTags.length > 0) {
      return {
        message: `Momento salvo! Você tem ${recentMoments.length} momentos recentes sobre "${topTags[0]}".`,
        relatedMoments: recentMoments.length,
        theme: topTags[0],
        action: 'view_similar',
      };
    }

    return {
      message: 'Momento salvo! Continue registrando sua jornada.',
      relatedMoments: 0,
    };
  }
}

/**
 * Clusters moments by theme using AI
 * Returns grouped moments by detected themes
 */
export async function clusterMomentsByTheme(
  moments: Array<{ id: string; content: string; tags: string[] }>
): Promise<
  Array<{
    theme: string;
    emoji: string;
    momentIds: string[];
    description: string;
  }>
> {
  if (moments.length === 0) {
    return [];
  }

  const startTime = Date.now();

  try {
    const gemini = GeminiClient.getInstance();
    const momentsSummary = moments
      .map((m, i) => `[${i}] ${m.content.substring(0, 100)}...`)
      .join('\n');

    const response = await gemini.call({
      action: 'cluster_moments_by_theme',
      payload: {
        moments: momentsSummary,
        prompt: `Analise estes momentos pessoais e agrupe-os por temas principais.

Momentos:
${momentsSummary}

Retorne um JSON array de temas:
[
  {
    "theme": "nome do tema",
    "emoji": "emoji representativo",
    "momentIds": [índices dos momentos deste tema],
    "description": "descrição curta do tema"
  }
]

Máximo 5 temas. Seja específico e empático.`,
        temperature: 0.6,
        maxOutputTokens: 500,
      },
    });

    // Track AI usage (non-blocking, fire-and-forget)
    trackAIUsage({
      operation_type: 'text_generation',
      ai_model: response.model || 'gemini-2.0-flash',
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      module_type: 'journey',
      duration_seconds: (Date.now() - startTime) / 1000,
      request_metadata: {
        function_name: 'clusterMomentsByTheme',
        operation: 'cluster_by_theme',
        moments_count: moments.length,
      }
    }).catch(error => {
      // Non-blocking: log error but don't throw
      log.warn('[Journey AI Tracking] Non-blocking error:', error.message);
    });

    const text = response.result?.text || JSON.stringify(response.result);
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map indices back to moment IDs
    return parsed.map((cluster: any) => ({
      theme: cluster.theme,
      emoji: cluster.emoji,
      momentIds: cluster.momentIds.map((idx: number) => moments[idx]?.id).filter(Boolean),
      description: cluster.description,
    }));
  } catch (error) {
    log.error('[aiAnalysisService] Error clustering moments:', error);
    return [];
  }
}

/**
 * Fallback suggestions when AI fails
 */
function generateFallbackSuggestion(content: string): AISuggestion {
  const lowerContent = content.toLowerCase();

  // Pattern-based fallbacks
  if (lowerContent.includes('trabalho') || lowerContent.includes('projeto')) {
    return {
      type: 'question',
      message: 'Como esse trabalho se conecta com seus objetivos maiores?',
    };
  }

  if (lowerContent.includes('sentindo') || lowerContent.includes('emoção')) {
    return {
      type: 'reflection',
      message: 'Identificar emoções é o primeiro passo para compreendê-las.',
    };
  }

  if (lowerContent.includes('aprendi') || lowerContent.includes('descobri')) {
    return {
      type: 'pattern',
      message: 'Isso parece um momento de crescimento! 🌱',
    };
  }

  // Generic fallbacks
  const genericQuestions = [
    'O que você aprendeu com essa experiência?',
    'Como isso se conecta com o que você valoriza?',
    'Que ação você pode tomar a partir disso?',
    'Como você pode aplicar isso no futuro?',
  ];

  return {
    type: 'question',
    message: genericQuestions[Math.floor(Math.random() * genericQuestions.length)],
  };
}
