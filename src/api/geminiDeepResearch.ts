/**
 * Gemini Deep Research API Integration
 *
 * Provides deep research capabilities for podcast guest profiles
 * using Google's Gemini API for information gathering.
 *
 * NOTE: This is a client-side implementation. For production,
 * consider moving to a backend service to protect API keys.
 */

// Lazy import - only load GoogleGenAI if we have a valid API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Check if API key is valid (exists, not empty, not just whitespace)
const hasValidApiKey = GEMINI_API_KEY && typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.trim().length > 10;

if (!hasValidApiKey) {
  console.warn('⚠️  VITE_GEMINI_API_KEY not configured - Gemini Deep Research will use mock data');
}

export interface DeepResearchRequest {
  query: string;
  include_sources?: boolean;
  max_depth?: number;
}

export interface DeepResearchResponse {
  success: boolean;
  confidence_score?: number;
  quality_score?: number;

  // Biography
  biography?: string;
  summary?: string;
  sources?: Array<{ url: string; title: string; date: string }>;

  // Technical sheet
  full_name?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  occupation?: string;
  known_for?: string;
  education?: string;
  awards?: Array<{ name: string; year: number; organization?: string }>;
  social_media?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };

  // Controversies & news
  controversies?: Array<{
    title: string;
    summary: string;
    source: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    date: string;
  }>;
  recent_news?: Array<{
    title: string;
    url: string;
    source: string;
    date: string;
  }>;

  error?: string;
}

/**
 * Perform deep research on a person using Gemini API
 */
export async function performDeepResearch(
  request: DeepResearchRequest
): Promise<DeepResearchResponse> {
  // If no valid API key, use mock immediately
  if (!hasValidApiKey) {
    console.warn('No valid API key - using mock data');
    return mockDeepResearch(request.query);
  }

  try {
    // Dynamic import only when we have a valid key
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI(GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Construct detailed research prompt
    const prompt = `
You are a professional researcher preparing information for a podcast interview.

Research the following person in detail:
${request.query}

Provide a comprehensive profile in JSON format with the following structure:

{
  "full_name": "Complete legal name",
  "birth_date": "YYYY-MM-DD format if known",
  "birth_place": "City, Country",
  "nationality": "Country",
  "occupation": "Current main occupation",
  "known_for": "What they are famous for (brief)",
  "education": "Educational background",
  "biography": "Detailed biography (3-5 paragraphs)",
  "summary": "Brief summary (2-3 sentences)",
  "awards": [
    {
      "name": "Award name",
      "year": 2023,
      "organization": "Awarding organization"
    }
  ],
  "social_media": {
    "twitter": "handle or URL",
    "instagram": "handle or URL",
    "linkedin": "profile URL",
    "youtube": "channel URL"
  },
  "controversies": [
    {
      "title": "Controversy title",
      "summary": "Brief description",
      "source": "Source of information",
      "sentiment": "negative",
      "date": "YYYY-MM-DD"
    }
  ],
  "recent_news": [
    {
      "title": "News headline",
      "url": "news article URL",
      "source": "Publication name",
      "date": "YYYY-MM-DD"
    }
  ],
  "sources": [
    {
      "url": "source URL",
      "title": "Source title",
      "date": "YYYY-MM-DD"
    }
  ],
  "confidence_score": 85,
  "quality_score": 90
}

Important guidelines:
- Use only factual, verifiable information
- Include confidence_score (0-100) based on information availability
- Include quality_score (0-100) based on source reliability
- If information is not available, use null or empty arrays
- For controversies, maintain neutral tone and verify facts
- Include recent news from the last 6-12 months
- Provide sources for key information when possible

Return ONLY valid JSON, no additional text.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

      const data = JSON.parse(jsonText);

      return {
        success: true,
        ...data,
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.log('Raw response:', text);

      // Fallback: return text as biography
      return {
        success: true,
        biography: text,
        summary: text.substring(0, 200) + '...',
        confidence_score: 50,
        quality_score: 50,
        error: 'Response was not in expected JSON format, using as plain text',
      };
    }
  } catch (error) {
    console.error('Error in Gemini Deep Research:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Mock implementation for development/testing without API key
 */
export function mockDeepResearch(query: string): DeepResearchResponse {
  const guestName = query.split(':')[0]?.trim() || 'Convidado';

  return {
    success: true,
    confidence_score: 75,
    quality_score: 70,
    full_name: guestName,
    occupation: 'Personalidade Pública',
    known_for: 'Trabalhos na área de atuação',
    biography: `${guestName} é uma personalidade conhecida em sua área de atuação. Informações detalhadas serão adicionadas após pesquisa mais aprofundada.`,
    summary: `Perfil de ${guestName} com informações básicas.`,
    sources: [
      {
        url: 'https://example.com',
        title: 'Fonte de exemplo',
        date: new Date().toISOString().split('T')[0],
      },
    ],
    recent_news: [],
    controversies: [],
    awards: [],
    social_media: {},
  };
}
