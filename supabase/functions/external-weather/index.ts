/**
 * External Weather Edge Function — Open-Meteo + Gemini Insight
 *
 * Fetches weather forecast for a given location and generates a
 * contextual insight in PT-BR using Gemini 2.5 Flash.
 *
 * @endpoint POST /external-weather
 * @auth Required (JWT)
 * @body { latitude: number, longitude: number, city?: string }
 * @returns { success, data: { forecast, insight } }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { fetchExternalApi } from '../_shared/external-api.ts';
import type { ExternalApiConfig, ExternalApiResponse } from '../_shared/external-api.ts';

const TAG = '[external-weather]';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

const WEATHER_CONFIG: ExternalApiConfig = {
  name: 'open-meteo',
  baseUrl: 'https://api.open-meteo.com/v1',
  cacheTtlSeconds: 10800, // 3 hours
  maxRetries: 2,
  rateLimitPerDay: 9000,
};

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weathercode: number[];
    windspeed_10m: number[];
  };
  hourly_units: {
    temperature_2m: string;
    precipitation: string;
    windspeed_10m: string;
  };
}

interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: OpenMeteoResponse['hourly'];
  units: OpenMeteoResponse['hourly_units'];
}

// WMO Weather Code descriptions in PT-BR
const WMO_CODES: Record<number, string> = {
  0: 'Ceu limpo',
  1: 'Predominantemente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina com geada',
  51: 'Garoa leve',
  53: 'Garoa moderada',
  55: 'Garoa intensa',
  61: 'Chuva leve',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  71: 'Neve leve',
  73: 'Neve moderada',
  75: 'Neve forte',
  80: 'Pancadas leves',
  81: 'Pancadas moderadas',
  82: 'Pancadas fortes',
  95: 'Tempestade',
  96: 'Tempestade com granizo leve',
  99: 'Tempestade com granizo forte',
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // 1. Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: jsonHeaders },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user token' }),
        { status: 401, headers: jsonHeaders },
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { latitude, longitude, city } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return new Response(
        JSON.stringify({ success: false, error: 'latitude and longitude are required (numbers)' }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Check weather_cache table first
    // Round lat/lng to 2 decimals for cache key consistency (~1km precision)
    const latRound = Math.round(latitude * 100) / 100;
    const lngRound = Math.round(longitude * 100) / 100;

    const { data: cachedWeather } = await supabase
      .from('weather_cache')
      .select('forecast_data, gemini_insight, updated_at')
      .eq('latitude', latRound)
      .eq('longitude', lngRound)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedWeather) {
      console.log(TAG, `Returning cached weather for ${latRound},${lngRound}`);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            forecast: cachedWeather.forecast_data,
            insight: cachedWeather.gemini_insight,
          },
          source: 'open-meteo',
          cached: true,
          latencyMs: 0,
        }),
        { status: 200, headers: jsonHeaders },
      );
    }

    // 4. Fetch from Open-Meteo
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      hourly: 'temperature_2m,precipitation,weathercode,windspeed_10m',
      forecast_days: '2',
      timezone: 'auto',
    });

    const apiResult: ExternalApiResponse<OpenMeteoResponse> = await fetchExternalApi<OpenMeteoResponse>(
      WEATHER_CONFIG,
      `/forecast?${params}`,
      { cacheKey: `weather:${latRound}:${lngRound}` },
    );

    if (!apiResult.success || !apiResult.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: apiResult.error || 'Failed to fetch weather data',
          source: 'open-meteo',
          cached: false,
          latencyMs: apiResult.latencyMs,
        }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const meteo = apiResult.data;
    const forecast: WeatherForecast = {
      latitude: meteo.latitude,
      longitude: meteo.longitude,
      timezone: meteo.timezone,
      hourly: meteo.hourly,
      units: meteo.hourly_units,
    };

    // 5. Generate Gemini insight (non-critical — if fails, return weather without insight)
    let insight: string | null = null;
    try {
      insight = await generateWeatherInsight(forecast, city);
    } catch (geminiError) {
      console.warn(TAG, `Gemini insight failed (non-critical): ${geminiError}`);
    }

    // 6. Cache in weather_cache table (upsert on lat/lng)
    const expiresAt = new Date(Date.now() + WEATHER_CONFIG.cacheTtlSeconds * 1000).toISOString();
    const { error: upsertError } = await supabase
      .from('weather_cache')
      .upsert(
        {
          latitude: latRound,
          longitude: lngRound,
          city: city || null,
          forecast_data: forecast,
          gemini_insight: insight,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'latitude,longitude' },
      );

    if (upsertError) {
      console.warn(TAG, `Failed to cache weather: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { forecast, insight },
        source: 'open-meteo',
        cached: false,
        latencyMs: apiResult.latencyMs,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    console.error(TAG, 'Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: jsonHeaders },
    );
  }
});

// ============================================================================
// GEMINI INSIGHT GENERATION
// ============================================================================

async function generateWeatherInsight(
  forecast: WeatherForecast,
  city?: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Summarize next 24 hours for prompt context
  const next24h = forecast.hourly.time.slice(0, 24);
  const temps = forecast.hourly.temperature_2m.slice(0, 24);
  const codes = forecast.hourly.weathercode.slice(0, 24);
  const precip = forecast.hourly.precipitation.slice(0, 24);
  const wind = forecast.hourly.windspeed_10m.slice(0, 24);

  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const totalPrecip = precip.reduce((a, b) => a + b, 0);
  const maxWind = Math.max(...wind);
  const dominantCode = getMostFrequent(codes);
  const condition = WMO_CODES[dominantCode] || 'Indefinido';

  const location = city || `${forecast.latitude}, ${forecast.longitude}`;

  const prompt = `Voce e um assistente de produtividade brasileiro. Com base nos dados meteorologicos abaixo, gere UMA frase curta e util (max 100 caracteres) sobre como o clima pode impactar o dia do usuario. Seja pratico e amigavel.

Local: ${location}
Periodo: proximas 24 horas (${next24h[0]} a ${next24h[23]})
Condicao predominante: ${condition}
Temperatura: ${minTemp.toFixed(0)}°C a ${maxTemp.toFixed(0)}°C
Precipitacao total: ${totalPrecip.toFixed(1)}mm
Vento maximo: ${maxWind.toFixed(0)} km/h

Responda SOMENTE com a frase, sem aspas nem explicacao.`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.7,
    },
  });

  const text = result.response.text().trim();
  // Ensure insight is not too long
  return text.length > 150 ? text.substring(0, 147) + '...' : text;
}

function getMostFrequent(arr: number[]): number {
  const counts = new Map<number, number>();
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  let maxCount = 0;
  let maxVal = 0;
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxVal = val;
    }
  }
  return maxVal;
}
