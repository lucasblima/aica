/**
 * Gemini API Pricing Configuration
 *
 * Preços em USD por 1 milhão de tokens.
 * Fonte: https://ai.google.dev/gemini-api/docs/pricing
 * Última atualização: Dezembro 2025
 */

export interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  audioInputPerMillionTokens?: number;
  cachePerMillionTokens?: number;
}

/**
 * Tabela de preços por modelo Gemini
 */
export const GEMINI_PRICING: Record<string, ModelPricing> = {
  // Modelos rápidos (2.0 Flash)
  'gemini-2.0-flash': {
    inputPerMillionTokens: 0.10,
    outputPerMillionTokens: 0.40,
    audioInputPerMillionTokens: 0.70,
    cachePerMillionTokens: 0.025,
  },
  'gemini-2.0-flash-exp': {
    inputPerMillionTokens: 0.10,
    outputPerMillionTokens: 0.40,
    audioInputPerMillionTokens: 0.70,
    cachePerMillionTokens: 0.025,
  },
  'gemini-2.0-flash-001': {
    inputPerMillionTokens: 0.10,
    outputPerMillionTokens: 0.40,
    audioInputPerMillionTokens: 0.70,
    cachePerMillionTokens: 0.025,
  },

  // Gemini 2.5 Flash (melhor balanço custo/qualidade)
  'gemini-2.5-flash': {
    inputPerMillionTokens: 0.30,
    outputPerMillionTokens: 2.50,
    audioInputPerMillionTokens: 1.00,
    cachePerMillionTokens: 0.03,
  },

  // Gemini 2.5 Pro (alta qualidade)
  'gemini-2.5-pro': {
    inputPerMillionTokens: 1.25,
    outputPerMillionTokens: 10.00,
    cachePerMillionTokens: 0.125,
  },

  // Modelos legacy (1.5)
  'gemini-1.5-pro': {
    inputPerMillionTokens: 1.25,
    outputPerMillionTokens: 5.00,
    audioInputPerMillionTokens: 1.25,
    cachePerMillionTokens: 0.3125,
  },
  'gemini-1.5-flash': {
    inputPerMillionTokens: 0.075,
    outputPerMillionTokens: 0.30,
    audioInputPerMillionTokens: 0.075,
    cachePerMillionTokens: 0.01875,
  },

  // Embeddings (grátis no tier gratuito)
  'text-embedding-004': {
    inputPerMillionTokens: 0.00,
    outputPerMillionTokens: 0.00,
  },
};

/**
 * Preços fixos por operação (não baseados em tokens)
 */
export const FIXED_OPERATION_PRICING: Record<string, number> = {
  'file_indexing_per_1000_docs': 0.15,
  'file_search_query': 0.05,
  'transcription_per_minute': 0.025,
  'video_generation_per_minute': 5.00,
  'image_generation_per_image': 2.00,
};

/**
 * Calcula o custo de uma chamada baseado em tokens
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  isAudioInput: boolean = false
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = GEMINI_PRICING[model] || GEMINI_PRICING['gemini-2.0-flash'];

  const inputRate = isAudioInput && pricing.audioInputPerMillionTokens
    ? pricing.audioInputPerMillionTokens
    : pricing.inputPerMillionTokens;

  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillionTokens;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: parseFloat(inputCost.toFixed(6)),
    outputCost: parseFloat(outputCost.toFixed(6)),
    totalCost: parseFloat(totalCost.toFixed(6)),
  };
}

/**
 * Estima custo antes de fazer a chamada (baseado em contagem de tokens do prompt)
 */
export function estimateCost(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number = 1000
): number {
  const { totalCost } = calculateTokenCost(model, estimatedInputTokens, estimatedOutputTokens);
  return totalCost;
}
