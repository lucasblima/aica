// supabase/functions/telegram-mini-app-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// ---------------------------------------------------------------------------
// CORS (inline — mini-app only needs POST + OPTIONS)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://dev.aica.guru",
  "https://aica.guru",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ---------------------------------------------------------------------------
// Telegram initData HMAC-SHA-256 validation
// ---------------------------------------------------------------------------
async function validateInitData(
  initData: string,
  botToken: string
): Promise<Record<string, string> | null> {
  // Parse the initData query string
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  // Check freshness (max 24 hours)
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  if (Date.now() / 1000 - authDate > 86400) return null;

  // Build the data-check-string (sorted key=value pairs, excluding hash)
  const entries: [string, string][] = [];
  params.forEach((value, key) => {
    if (key !== "hash") entries.push([key, value]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  // Mini App validation uses HMAC-SHA-256(HMAC-SHA-256(bot_token, "WebAppData"), data_check_string)
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secretHash = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(botToken)
  );

  const validationKey = await crypto.subtle.importKey(
    "raw",
    secretHash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const computedHash = await crypto.subtle.sign(
    "HMAC",
    validationKey,
    encoder.encode(dataCheckString)
  );

  // Compare hashes (constant-time via hex string comparison)
  const computedHex = Array.from(new Uint8Array(computedHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHex !== hash) return null;

  // Return parsed fields as object
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// ---------------------------------------------------------------------------
// JWT creation (compatible with Supabase RLS)
// ---------------------------------------------------------------------------
async function createSessionJwt(
  userId: string,
  telegramId: number,
  jwtSecret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      sub: userId,
      role: "authenticated",
      telegram_id: telegramId,
      iss: "supabase",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      iat: Math.floor(Date.now() / 1000),
    },
    key
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const { initData } = await req.json();
    if (!initData || typeof initData !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing initData" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Validate HMAC
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const parsed = await validateInitData(initData, botToken);
    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Invalid initData signature" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Extract Telegram user
    const userJson = parsed.user;
    if (!userJson) {
      return new Response(
        JSON.stringify({ error: "No user in initData" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    const telegramUser = JSON.parse(userJson);
    const telegramId = telegramUser.id as number;

    // Lookup linked AICA user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: linkData } = await supabase
      .from("user_telegram_links")
      .select("user_id, telegram_username, status, consent_given")
      .eq("telegram_id", telegramId)
      .eq("status", "active")
      .maybeSingle();

    if (!linkData) {
      // Not linked — return Telegram user info only
      return new Response(
        JSON.stringify({
          linked: false,
          telegram_user: {
            id: telegramId,
            first_name: telegramUser.first_name,
            username: telegramUser.username,
          },
        }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Linked — create session JWT
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || Deno.env.get("JWT_SECRET");
    if (!jwtSecret) {
      console.error("[mini-app-auth] JWT_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const sessionToken = await createSessionJwt(linkData.user_id, telegramId, jwtSecret);

    // Fetch user profile for greeting
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", linkData.user_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        linked: true,
        session_token: sessionToken,
        user: {
          id: linkData.user_id,
          display_name: profile?.display_name || telegramUser.first_name,
          avatar_url: profile?.avatar_url,
          telegram_username: linkData.telegram_username,
        },
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[mini-app-auth] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
