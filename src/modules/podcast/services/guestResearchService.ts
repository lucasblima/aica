/**
 * Guest Research Service
 *
 * Integrates with Gemini API to research public figures for podcast interviews.
 * Uses deep research capabilities to gather biographical information, recent facts,
 * and topics of interest.
 *
 * Task: 2.2 - Integrate Gemini API for guest research
 */

import { GeminiClient } from '@/lib/gemini/client';
import type { GeminiChatResponse } from '@/lib/gemini/types';
import type { GuestProfile } from '../types/wizard.types';

/**
 * System instruction for guest research
 *
 * Guides Gemini to provide accurate, factual information formatted as JSON.
 */
const GUEST_RESEARCH_SYSTEM_INSTRUCTION = `
Você é um assistente de pesquisa especializado em preparar entrevistas para podcasts.

Responsabilidades:
- Pesquisar informações precisas e verificáveis sobre figuras públicas
- Focar em conquistas e fatos recentes (últimos 2 anos)
- Identificar tópicos de interesse relevantes para uma entrevista
- Alertar sobre controvérsias importantes que o entrevistador deve conhecer
- Retornar apenas informações confiáveis

Estilo:
- Seja conciso mas informativo
- Use linguagem clara e objetiva
- Priorize qualidade sobre quantidade
- Indique quando informações não são confiáveis

Formato:
Retorne APENAS um objeto JSON válido, sem markdown ou texto adicional.
`.trim();

/**
 * Fallback profile when research fails
 *
 * Returns a basic profile with the provided name and reference,
 * indicating that detailed research was unavailable.
 */
function createFallbackProfile(name: string, reference: string): GuestProfile {
  return {
    name,
    title: reference || 'Convidado',
    biography: 'Informações detalhadas não disponíveis no momento. Por favor, forneça mais contexto sobre o convidado.',
    recent_facts: [],
    topics_of_interest: [],
    controversies: [],
    is_reliable: false,
    confidence_score: 0,
    researched_at: new Date().toISOString(),
  };
}

/**
 * Build the research prompt for Gemini
 *
 * @param name - Guest name to research
 * @param reference - Additional context (e.g., "CEO Tesla", "Ator de Hollywood")
 * @returns Formatted prompt string
 */
function buildResearchPrompt(name: string, reference: string): string {
  return `
Pesquise a seguinte pessoa para uma entrevista de podcast:

Nome: ${name}
Contexto/Referência: ${reference}

Por favor, forneça:
1. Nome completo e título profissional
2. Uma biografia de 2-3 frases
3. 3-5 fatos notáveis ou conquistas recentes (últimos 2 anos)
4. 3-5 tópicos pelos quais a pessoa é conhecida ou apaixonada
5. Quaisquer controvérsias significativas que um entrevistador deveria saber

Retorne as informações no seguinte formato JSON:
{
  "name": "string (nome completo)",
  "title": "string (título profissional/cargo)",
  "biography": "string (biografia de 2-3 frases)",
  "recent_facts": ["string", "string", ...],
  "topics_of_interest": ["string", "string", ...],
  "controversies": ["string", "string", ...] (opcional, pode ser array vazio),
  "image_url": "string (opcional, URL de imagem de perfil público)",
  "is_reliable": true/false (true se encontrou informações confiáveis),
  "confidence_score": number (0-100, confiança na precisão das informações)
}

Se você não conseguir encontrar informações confiáveis sobre esta pessoa, retorne um objeto com is_reliable: false e confidence_score: 0.

IMPORTANTE: Retorne APENAS o objeto JSON, sem markdown, sem blocos de código, sem texto adicional.
`.trim();
}

/**
 * Parse Gemini response and validate GuestProfile structure
 *
 * @param response - Raw Gemini API response
 * @returns Validated GuestProfile or null if parsing fails
 */
function parseGeminiResponse(response: GeminiChatResponse): GuestProfile | null {
  try {
    const result = response.result;

    // If result is already an object, use it directly
    if (typeof result === 'object' && result !== null) {
      return validateAndNormalizeProfile(result);
    }

    // If result is a string, try to parse it as JSON
    if (typeof result === 'string') {
      // Remove markdown code blocks if present
      const cleaned = result
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      return validateAndNormalizeProfile(parsed);
    }

    return null;
  } catch (error) {
    console.error('[guestResearchService] Failed to parse Gemini response:', error);
    return null;
  }
}

/**
 * Validate and normalize the profile object
 *
 * @param data - Parsed data object
 * @returns Normalized GuestProfile
 */
function validateAndNormalizeProfile(data: any): GuestProfile {
  return {
    name: String(data.name || ''),
    title: String(data.title || ''),
    biography: String(data.biography || ''),
    recent_facts: Array.isArray(data.recent_facts) ? data.recent_facts.map(String) : [],
    topics_of_interest: Array.isArray(data.topics_of_interest)
      ? data.topics_of_interest.map(String)
      : [],
    controversies: Array.isArray(data.controversies)
      ? data.controversies.map(String)
      : undefined,
    image_url: data.image_url ? String(data.image_url) : undefined,
    is_reliable: Boolean(data.is_reliable),
    confidence_score: typeof data.confidence_score === 'number' ? data.confidence_score : 0,
    researched_at: new Date().toISOString(),
  };
}

/**
 * Search for a guest profile using Gemini API
 *
 * This is the main entry point for guest research. It calls the Gemini API
 * with a structured prompt and returns a validated GuestProfile.
 *
 * @param name - Guest name to search for
 * @param reference - Additional context about the guest (e.g., "CEO Tesla")
 * @returns Promise resolving to GuestProfile
 *
 * @example
 * ```ts
 * const profile = await searchGuestProfile('Elon Musk', 'CEO Tesla');
 * console.log(profile.biography);
 * console.log(profile.recent_facts);
 * ```
 */
export async function searchGuestProfile(
  name: string,
  reference: string
): Promise<GuestProfile> {
  console.log('[guestResearchService] Starting guest research...', { name, reference });

  try {
    const client = GeminiClient.getInstance();

    // Build research prompt
    const prompt = buildResearchPrompt(name, reference);

    // Call Gemini API with deep research action
    // Note: Using 'research_guest' action which will be added to Gemini types
    const response = await client.call({
      action: 'research_guest' as any, // Type assertion until we update types
      payload: {
        guest_name: name,
        reference,
        prompt,
        system_instruction: GUEST_RESEARCH_SYSTEM_INSTRUCTION,
      },
    });

    console.log('[guestResearchService] Received Gemini response');

    // Parse and validate response
    const profile = parseGeminiResponse(response);

    if (!profile) {
      console.warn('[guestResearchService] Failed to parse response, using fallback');
      return createFallbackProfile(name, reference);
    }

    // If research was unreliable, use fallback
    if (!profile.is_reliable || profile.confidence_score < 30) {
      console.warn('[guestResearchService] Low confidence research, using fallback');
      return createFallbackProfile(name, reference);
    }

    console.log('[guestResearchService] Guest research completed successfully', {
      confidence: profile.confidence_score,
    });

    return profile;
  } catch (error) {
    console.error('[guestResearchService] Error during guest research:', error);

    // Handle specific error types
    if ((error as any).code === 'RATE_LIMITED') {
      throw new Error(
        'Atingimos o limite de pesquisas. Por favor, aguarde alguns instantes e tente novamente.'
      );
    }

    if ((error as any).code === 'UNAUTHORIZED') {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // For all other errors, return fallback profile
    console.warn('[guestResearchService] Returning fallback profile due to error');
    return createFallbackProfile(name, reference);
  }
}

/**
 * Hook for using guest research in React components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [loading, setLoading] = useState(false);
 *   const [profile, setProfile] = useState<GuestProfile | null>(null);
 *
 *   const handleSearch = async () => {
 *     setLoading(true);
 *     try {
 *       const result = await searchGuestProfile('Elon Musk', 'CEO Tesla');
 *       setProfile(result);
 *     } catch (error) {
 *       console.error(error);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return <button onClick={handleSearch}>Search Guest</button>;
 * }
 * ```
 */
export { searchGuestProfile as default };
