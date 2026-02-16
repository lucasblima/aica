/**
 * Test Process Edital Edge Function
 *
 * Diagnostic function to test configuration without actually processing files.
 * Returns detailed information about environment and configuration.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = { ...getCorsHeaders(req), 'Content-Type': 'application/json' }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,

      // Environment checks
      environment: {
        SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '✅ Set' : '❌ Missing',
        SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ Set' : '❌ Missing',
        GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') ? '✅ Set' : '❌ Missing',
      },

      // Request info
      headers: {
        authorization: req.headers.get('Authorization') ? '✅ Present' : '❌ Missing',
        origin: req.headers.get('origin') || 'None',
        'content-type': req.headers.get('content-type') || 'None',
      },

      // Test API key format (without revealing it)
      apiKeyValidation: {
        geminiKeyExists: !!Deno.env.get('GEMINI_API_KEY'),
        geminiKeyLength: Deno.env.get('GEMINI_API_KEY')?.length || 0,
        geminiKeyPrefix: Deno.env.get('GEMINI_API_KEY')?.substring(0, 6) || 'N/A',
      }
    }

    // Test Gemini API connectivity (if key exists)
    if (Deno.env.get('GEMINI_API_KEY')) {
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${Deno.env.get('GEMINI_API_KEY')}`
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        diagnostics.geminiApiTest = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          reachable: testResponse.ok ? '✅ Yes' : '❌ No',
        }

        if (!testResponse.ok) {
          const errorText = await testResponse.text()
          diagnostics.geminiApiTest.error = errorText.substring(0, 200)
        }
      } catch (error) {
        diagnostics.geminiApiTest = {
          error: error instanceof Error ? error.message : 'Unknown error',
          reachable: '❌ No - Network error'
        }
      }
    } else {
      diagnostics.geminiApiTest = {
        skipped: 'GEMINI_API_KEY not configured'
      }
    }

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        status: 200,
        headers: corsHeaders
      }
    )

  } catch (error) {
    const err = error as Error
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        stack: err.stack,
      }, null, 2),
      {
        status: 500,
        headers: corsHeaders
      }
    )
  }
})
