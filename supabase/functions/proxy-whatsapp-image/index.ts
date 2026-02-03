/**
 * Proxy WhatsApp Image Edge Function
 *
 * Proxies WhatsApp profile pictures to bypass hotlink protection.
 * WhatsApp servers block direct image requests from external domains.
 *
 * Endpoint: GET /functions/v1/proxy-whatsapp-image?url={encodedUrl}
 * Response: Image binary data with appropriate Content-Type
 *
 * Issue: #91 - WhatsApp Timeline Integration
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Cache for images (in-memory, resets on function cold start)
const imageCache = new Map<string, { data: Uint8Array; contentType: string; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    // Get URL from query parameter
    const url = new URL(req.url)
    const imageUrl = url.searchParams.get('url')

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate URL is from WhatsApp
    const parsedUrl = new URL(imageUrl)
    const allowedHosts = ['pps.whatsapp.net', 'mmg.whatsapp.net', 'web.whatsapp.com']

    if (!allowedHosts.some(host => parsedUrl.hostname.endsWith(host))) {
      return new Response(JSON.stringify({ error: 'Only WhatsApp image URLs are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check cache
    const cached = imageCache.get(imageUrl)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[proxy-whatsapp-image] Cache hit for: ${imageUrl.substring(0, 50)}...`)
      return new Response(cached.data, {
        headers: {
          ...corsHeaders,
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=300',
        },
      })
    }

    console.log(`[proxy-whatsapp-image] Fetching: ${imageUrl.substring(0, 80)}...`)

    // Fetch image from WhatsApp
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://web.whatsapp.com/',
      },
    })

    if (!response.ok) {
      console.error(`[proxy-whatsapp-image] Upstream error: ${response.status}`)
      return new Response(JSON.stringify({ error: `Failed to fetch image: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get image data
    const imageData = new Uint8Array(await response.arrayBuffer())
    const contentType = response.headers.get('Content-Type') || 'image/jpeg'

    // Cache the image
    imageCache.set(imageUrl, {
      data: imageData,
      contentType,
      timestamp: Date.now(),
    })

    // Clean old cache entries
    const now = Date.now()
    for (const [key, value] of imageCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        imageCache.delete(key)
      }
    }

    console.log(`[proxy-whatsapp-image] Success: ${imageData.length} bytes`)

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    })

  } catch (error) {
    const err = error as Error
    console.error('[proxy-whatsapp-image] Error:', err.message)

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
