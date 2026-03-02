# Strategic API arsenal for AICA Life OS

**BrasilAPI, Groq, Deepgram, and 50+ other free APIs can power all seven AICA modules at zero monthly cost.** The public-apis ecosystem contains over 1,400 categorized APIs, and after systematic analysis, the strongest strategy for a bootstrapped Brazilian SaaS emerges: lean heavily on Brazil-native APIs (BrasilAPI, AwesomeAPI, brapi.dev, BCB), complement Google Gemini with Groq as a speed-optimized fallback, and exploit the WhatsApp Cloud API's free service conversations — critical in a market where **93% of smartphone users** rely on WhatsApp daily. Every API recommended below has a production-viable free tier, HTTPS support, and works with the React 18 + TypeScript + Supabase stack.

---

## 1. Atlas: task intelligence through weather, holidays, and timezone APIs

Atlas's Eisenhower Matrix needs contextual awareness — knowing when Brazil has a holiday, what the weather looks like for outdoor tasks, and which timezone the user occupies. The API stack here is remarkably strong and almost entirely free.

**Google Calendar API** remains the cornerstone integration. With **1 million queries per day** on the free tier and full OAuth 2.0 support, bidirectional sync between Eisenhower Matrix tasks and calendar events is straightforward. Access via the `gapi` client library or proxy through Supabase Edge Functions to keep credentials secure.

**Open-Meteo** is the standout weather API — completely free, no API key required, **CORS-enabled**, and covering all of Brazil with 14-day forecasts at hourly resolution. It enables intelligent task scheduling: surface a prompt like "Best window for your outdoor run today: 7–9am, 24°C, no rain" by querying `https://api.open-meteo.com/v1/forecast?latitude=-23.55&longitude=-46.63&hourly=temperature_2m,precipitation`. For production commercial use, self-hosting the open-source backend or subscribing at ~€15/month is recommended.

**Nager.Date** delivers Brazilian holidays with Portuguese local names, completely free, no authentication, CORS-enabled. The endpoint `GET /api/v3/PublicHolidays/2026/BR` returns every national holiday with `localName` in Portuguese — essential for scheduling around Carnaval, Tiradentes, and state-level observances. **ipapi.co** (1,000 lookups/day, no key, CORS-enabled, HTTPS) auto-detects the user's Brazilian timezone across all four zones (Acre, Amazon, Brasília, Fernando de Noronha).

For Pomodoro timers and habit tracking, **no external API is needed** — implement client-side with React hooks and Web Workers for background accuracy, storing sessions directly in Supabase tables. This avoids unnecessary API dependencies.

| API | Free Tier | Auth | CORS | Priority |
|-----|-----------|------|------|----------|
| Google Calendar API | 1M queries/day | OAuth 2.0 | Via gapi | **High** |
| Open-Meteo | 10K calls/day | None | ✅ | **High** |
| Nager.Date | Unlimited | None | ✅ | **High** |
| ipapi.co | 1,000/day | None | ✅ | **High** |
| Todoist API | 50 req/min | OAuth 2.0 | Backend | Medium |
| OpenWeatherMap | 1,000/day | API Key | ✅ | Medium |

---

## 2. Jornada: sentiment analysis and quotes that speak Portuguese

Jornada's reflection engine needs two things: inspirational content and emotional intelligence. The key insight is that **Google Gemini already handles 80% of this** — sentiment analysis, emotion detection, personalized reflection prompts, affirmation generation, and quote translation — all natively in Brazilian Portuguese.

**ZenQuotes** provides batches of 50 quotes per API call with no authentication, refreshing daily. The free tier allows 5 requests per 30-second window. Since quotes arrive in English, route them through Gemini for Portuguese translation with cultural adaptation. **API Ninjas** adds 10,000 calls per month across 80+ APIs on a single free key, including quotes filtered by category (happiness, wisdom, life), an advice endpoint for journaling prompts, and exercise suggestions for wellness tracking.

For structured sentiment scoring beyond Gemini's conversational analysis, **Google Cloud Natural Language API** offers **5,000 units per month free** with native Brazilian Portuguese (pt-BR) support. Each unit covers 1,000 characters of text. It returns numerical sentiment scores (-1.0 to +1.0) and magnitude, perfect for charting mood trends over time in Supabase. New accounts also receive **$300 in Google Cloud credits** for 90 days.

**OpenWeatherMap** supports `lang=pt_br` for weather descriptions in Portuguese, enabling mood-weather correlation tracking. Store weather conditions alongside journal entries, then use Supabase PostgREST queries to surface insights like "You tend to feel most creative on rainy afternoons."

**Affirmations.dev** is a delightful zero-auth, zero-config API returning positive affirmations — useful as lightweight daily prompts, though it requires translation for Portuguese users.

| API | Free Tier | PT-BR | Priority |
|-----|-----------|-------|----------|
| Google Gemini (in stack) | 15 RPM, 1M tokens/day | ✅ Native | **High** |
| Google Cloud NL API | 5K units/mo + $300 credits | ✅ Native | **High** |
| ZenQuotes | Unlimited with attribution | Via Gemini translation | **High** |
| API Ninjas | 10K calls/mo | Via translation | **High** |
| OpenWeatherMap | 1K calls/day | ✅ `lang=pt_br` | **High** |
| Affirmations.dev | Unlimited, no auth | ❌ English only | Low |

---

## 3. Studio: a complete podcast production pipeline at zero cost

Studio's podcast production chain — record, transcribe, edit, synthesize, distribute — can be assembled entirely from free-tier APIs and open-source libraries. This is the module with the most impressive free-tier coverage.

**Google Cloud Text-to-Speech** anchors the synthesis pipeline with **4 million characters per month** on standard voices and **1 million on WaveNet** voices, both free. Brazilian Portuguese (pt-BR) voices are available at both quality tiers. At roughly 150 words per minute of audio, 4M characters translates to approximately **60+ hours of generated audio monthly** — more than enough for a podcast production platform.

For transcription, **Deepgram** offers the most generous onboarding: **$200 in free credits with no expiration**, covering approximately 26,000 minutes on the Nova-3 model. It supports Portuguese, speaker diarization, and real-time streaming with sub-300ms latency via WebSocket. **AssemblyAI** adds **$50 in credits** (~185 hours) with speaker diarization, sentiment analysis per segment, auto-chapter generation, and PII redaction — features that transform raw transcripts into structured podcast metadata.

Client-side audio processing requires no API at all. **FFmpeg.wasm** runs the full FFmpeg toolkit in the browser via WebAssembly — trimming, concatenation, mixing, normalization, format conversion. **Wavesurfer.js** renders interactive waveforms with zoom, regions for editing, and timeline markers, with a React wrapper available. The **Web Audio API** handles recording, real-time analysis, and waveform visualization natively in the browser.

For sound design, **Freesound** provides 500,000+ Creative Commons-licensed sound effects searchable by text query, and **Jamendo** offers 500,000+ CC-licensed music tracks filterable by genre, mood, and whether they're instrumental. The **Podcast Index API** (100% free, open ecosystem) handles podcast directory registration and supports Podcasting 2.0 features like chapters and transcripts.

| API | Free Tier | PT-BR | Primary Use | Priority |
|-----|-----------|-------|-------------|----------|
| Google Cloud TTS | 4M chars/mo standard | ✅ | Voice synthesis | **High** |
| Deepgram | $200 credits (no expiry) | ✅ | Real-time STT | **High** |
| AssemblyAI | $50 credits (~185 hrs) | ✅ | Transcription + intelligence | **High** |
| Freesound | Free (CC licensed) | N/A | Sound effects | **High** |
| Jamendo | Free (CC licensed) | N/A | Background music | **High** |
| Podcast Index | 100% free | ✅ | Distribution/indexing | **High** |
| FFmpeg.wasm | Open source | N/A | Audio processing | **High** |
| Wavesurfer.js | Open source (BSD-3) | N/A | Waveform editor | **High** |
| ElevenLabs | 10K chars/mo | ✅ | Premium AI voices | Medium |

---

## 4. Connections: CRM enrichment from email hashes to company data

Professional CRM functionality demands contact enrichment without expensive data providers. The strategy combines several modest free tiers into a comprehensive enrichment pipeline.

**Gravatar** is the hidden gem — completely free, no rate limits, serving 80+ million profiles. Hash any email with MD5 and retrieve avatar images plus profile data (name, bio, social links). This solves the "cold start problem" for new CRM contacts instantly. **Hunter.io** provides **25 email searches and 50 verifications per month** for finding professional email addresses by domain, plus a new enrichment API that returns person and company data. **ZeroBounce** adds **100 email verifications monthly** with 99.6% accuracy and detection of 30+ email types.

For business card scanning, **Google Gemini's multimodal vision** (already in the stack) parses uploaded business card photos into structured contact fields — name, title, company, email, phone — with excellent Portuguese text recognition. No additional API needed.

**Resend** handles transactional email at **3,000 emails per month free** (100/day) with React Email templates built in JSX/TSX — a perfect fit for the React 18 + TypeScript stack. Founded by Brazilian developer Zeno Rocha, it understands the LATAM market. Note that **SendGrid discontinued its free tier** in July 2025.

For event networking, **Eventbrite** and **Meetup** APIs both offer free OAuth-authenticated access to event discovery — particularly valuable for the active Brazilian tech meetup community.

| API | Free Tier | Key Feature | Priority |
|-----|-----------|-------------|----------|
| Gravatar | Unlimited, no auth | Profile from email hash | **High** |
| Hunter.io | 25 searches + 50 verifications/mo | Email finder + enrichment | **High** |
| ZeroBounce | 100 verifications/mo | Email validation | **High** |
| Gemini Vision (in stack) | Part of Gemini free tier | Business card OCR | **High** |
| Resend | 3,000 emails/mo | React Email templates | **High** |
| GitHub API | 5,000 req/hr authenticated | Developer profiles | Medium |
| Eventbrite | Free | Event discovery | Medium |

---

## 5. Grants: Brazilian government APIs are the foundation

The Grants module benefits from an exceptional fact: **every major Brazilian government data source offers completely free, unauthenticated APIs**. This is the module with the strongest free-tier alignment.

**BrasilAPI** is the Swiss Army knife — a single community-driven endpoint at `brasilapi.com.br` serving CNPJ company lookups, CEP postal codes with geolocation, IBGE municipality data, bank information, national holidays, DDD area codes, SELIC/CDI rates, FIPE vehicle pricing, PIX participants, weather from CPTEC/INPE, and more. No authentication, CORS-enabled, ~289ms average response. It should be the **first integration** for any Brazilian SaaS.

**Portal da Transparência** (`api.portaldatransparencia.gov.br`) exposes federal government transfers, convênios, budget execution data, and program spending — searchable by municipality IBGE code, year, and ministry. Rate limited at **90 requests/minute** during business hours. Free registration grants an API token. This is essential for tracking government funding flows and grant disbursements.

**IBGE API** provides demographic context critical for grant applications: population data, economic indicators, geographic boundaries in GeoJSON/TopoJSON, census results, and municipality-level statistics — all free and unauthenticated.

For academic research powering grant proposals, **OpenAlex** stands alone with **250 million scholarly works**, completely free, no authentication, and explicit tracking of Brazilian funders including CAPES, CNPq, and FAPESP. The `/funders` endpoint enables searching for publications funded by specific Brazilian agencies. **CrossRef** (150M+ DOI records, free) and **Semantic Scholar** (200M+ papers with AI-generated TLDRs, free) round out the literature search capabilities.

**Critical gap:** CNPq, CAPES, FAPESP, and FINEP do **not** provide public RESTful APIs for grant calls. The recommended workaround is building a scraping/aggregation layer via Supabase Edge Functions that periodically checks these agency websites, combined with OpenAlex/CrossRef for funded research tracking.

For PDF generation of grant proposals, client-side libraries (`@react-pdf/renderer`, `jsPDF`) running in the browser eliminate any API dependency, with output stored directly in Supabase Storage.

| API | Free Tier | Auth | Brazil Relevance | Priority |
|-----|-----------|------|-----------------|----------|
| BrasilAPI | Unlimited, CORS | None | Maximum | **Critical** |
| Portal da Transparência | 90 req/min | Token (free) | Maximum | **Critical** |
| IBGE API | Unlimited | None | Maximum | **Critical** |
| BCB PTAX / SGS | Unlimited | None | Maximum | **Critical** |
| OpenAlex | 100K calls/day | None (email for priority) | High | **Critical** |
| ReceitaWS | 3 queries/min | None | Maximum | **High** |
| CrossRef | Unlimited | None | High | **High** |
| Semantic Scholar | 100 req/5min | None | Medium | **High** |

---

## 6. Finance: Brazilian-native APIs outperform international alternatives

For a BRL-centric personal finance module, Brazilian-built APIs consistently outperform global alternatives in data relevance, free tier generosity, and cultural fit.

**AwesomeAPI** (`economia.awesomeapi.com.br`) provides **100,000 requests per month free**, covering 150+ currency pairs with BRL-native data updated every 30 seconds. No API key required for cached data. The endpoint `GET /json/last/USD-BRL` returns buy/sell/bid spreads — far more useful than international exchange APIs that only provide mid-market rates.

**brapi.dev** is purpose-built for B3/Bovespa data: real-time quotes for 400+ Brazilian stocks, FIIs (REITs), BDRs, dividends, and fundamental analysis (P/L, P/VP, ROE). The free tier covers basic quotes and 3-month history. **HG Brasil Finance API** adds **400 requests/day free**, returning currencies, IBOVESPA, IFIX, and bitcoin in a single JSON response — ideal for a dashboard overview widget.

The **Banco Central do Brasil SGS API** delivers every Brazilian economic indicator a finance module needs: SELIC (series 11), CDI (series 12), IPCA inflation (series 433), USD/BRL exchange (series 1), and GDP (series 1207). Completely free, no authentication. Example: `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json` returns the last 12 months of IPCA data. Note: lacks CORS headers, so proxy through Supabase Edge Functions.

**CoinGecko** covers cryptocurrency with **10,000 calls per month free** and native BRL support (`vs_currencies=brl`). For payment processing, **Mercado Pago** is non-negotiable for Brazil — supporting PIX (QR code + copy/paste), credit/debit cards, and boleto bancário through a JavaScript SDK (`@mercadopago/sdk-js`) that integrates cleanly with React.

For receipt scanning, leverage **Gemini's multimodal vision** first (zero additional cost), with **Mindee** as a dedicated backup offering **250 pages per month free** with structured JSON extraction of merchant, total, taxes, and line items from Portuguese receipts.

| API | Free Tier | BRL Native | Priority |
|-----|-----------|------------|----------|
| AwesomeAPI | 100K req/mo | ✅ | **High** |
| BCB SGS API | Unlimited | ✅ | **High** |
| brapi.dev | Basic quotes free | ✅ B3/Bovespa | **High** |
| HG Brasil Finance | 400 req/day | ✅ | **High** |
| CoinGecko | 10K calls/mo | ✅ BRL support | **High** |
| Mercado Pago | Free integration, tx fees only | ✅ PIX + boleto | **High** |
| Mindee (OCR) | 250 pages/mo | Portuguese support | **High** |
| Alpha Vantage | 25 req/day | .SA suffix for B3 | Medium |

---

## 7. Gamification and cross-module services tie everything together

The gamification layer (achievements, streaks, XP, leaderboards) should be **built custom in Supabase** using tables for achievements, user_achievements, and leaderboard views with Row Level Security. No reliable free external API exists for custom gamification logic — Supabase is the right tool.

For the notification infrastructure that powers gamification engagement, **OneSignal** offers **unlimited mobile push notifications** on the free tier with up to 10,000 web push subscribers, timezone-based delivery (critical for Brazil's four time zones), and Portuguese language support. **Firebase Cloud Messaging** provides an alternative with completely unlimited free messaging but requires more development effort.

**QR code generation** is trivially handled by the `qrcode.react` npm package (client-side, zero API calls) or the **goQR.me API** (completely free, no auth: `https://api.qrserver.com/v1/create-qr-code/?data=TEXT&size=200x200`). For data visualization powering productivity analytics and XP charts, **Recharts** is the natural choice — a React-native charting library requiring zero API calls.

| Service | Free Tier | Use Case | Priority |
|---------|-----------|----------|----------|
| OneSignal | Unlimited mobile push | Achievement notifications | **High** |
| Resend | 3,000 emails/mo | Weekly progress reports | **High** |
| Recharts (library) | Open source | Analytics dashboards | **High** |
| Cloudflare Turnstile | Unlimited | Bot protection, LGPD compliant | **High** |
| qrcode.react (library) | Open source | QR code generation | Medium |
| goQR.me API | Unlimited, no auth | Server-side QR generation | Medium |

---

## AI and ML capabilities far beyond Gemini

Google Gemini is AICA's primary AI, but three complementary services dramatically expand capabilities. **Groq** provides **free-forever LLM inference** at 300+ tokens per second using Llama and Mixtral models — making it the ideal speed-optimized fallback when Gemini rate limits are hit. It uses an OpenAI-compatible SDK, so switching requires changing only the base URL:

```typescript
const client = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: GROQ_KEY });
```

**Hugging Face Inference Providers** offers free monthly credits across 300+ models for specialized tasks: named entity recognition (`dslim/bert-base-NER`), summarization (`facebook/bart-large-cnn`), multilingual sentiment analysis, zero-shot classification, and Portuguese-capable embeddings. All accessible via the `@huggingface/inference` JavaScript SDK.

For embeddings and vector search powering semantic features across all modules, **Jina AI** provides free high-quality multilingual embeddings (up to 2048 dimensions), stored directly in **Supabase pgvector** (already in the stack). Supabase pgvector delivers sub-50ms query times for up to 100,000 documents — no separate vector database needed until significant scale.

**DeepL API Free** offers **500,000 characters per month** with arguably the best Portuguese translation quality available, critical for translating English quotes, API responses, and content into natural Brazilian Portuguese. **LibreTranslate** serves as a self-hostable unlimited fallback. **OCR.space** provides **25,000 requests per month free** for document scanning with Portuguese support.

| API | Free Tier | Key Strength | Priority |
|-----|-----------|-------------|----------|
| Groq | Free forever, 14.4K req/day | 300+ tokens/sec inference | **High** |
| Hugging Face Inference | Free monthly credits | 300+ specialized ML models | **High** |
| Jina AI Embeddings | Free (non-commercial) | Multilingual embeddings | **High** |
| DeepL API Free | 500K chars/mo | Best PT-BR translation | **High** |
| OpenRouter | 30+ free models | Model variety/routing | Medium |
| OCR.space | 25K req/mo | Document OCR, Portuguese | Medium |
| LibreTranslate | Unlimited (self-hosted) | Free translation fallback | Medium |

---

## WhatsApp integration is not optional in Brazil

With **120 million+ Brazilian WhatsApp users**, messaging integration is arguably AICA's most important growth channel. The **WhatsApp Cloud API** (Meta) is the official path: application setup is free, and **all user-initiated service conversations are free and unlimited** within 24-hour windows. Utility template messages outside the window cost approximately $0.008 per message for Brazil.

Direct Cloud API access requires Meta Business verification but eliminates BSP subscription fees. Supabase Edge Functions serve as webhook handlers for incoming messages, and the integration enables task reminders, habit notifications, journal prompts, and an AI chatbot powered by Gemini — all delivered through Brazil's most-used app.

The **Telegram Bot API** is 100% free with no per-message charges — supporting 30 messages per second globally, inline keyboards, Mini Apps, and even payments. The TypeScript-first **grammy.js** framework makes integration clean. Telegram serves as the secondary notification channel, particularly popular among Brazil's developer and tech-savvy communities.

---

## Authentication stays simple with Supabase

**Supabase Auth** (already in the stack) handles **50,000 monthly active users free** with email/password, magic links, OAuth for 20+ providers, MFA/TOTP, and Row Level Security at the database level — more secure than middleware-based auth. Adding an external auth provider like Clerk or Auth0 is unnecessary overhead.

Enhance security with **Cloudflare Turnstile** (unlimited free, invisible CAPTCHA, LGPD-compliant, native Supabase integration) and **Have I Been Pwned's Pwned Passwords API** (completely free, no auth, k-anonymity model checking against 900M+ breached passwords). Both integrate in under 30 minutes.

---

## The bootstrapped solo developer's implementation roadmap

For a solo developer maximizing impact per hour of integration work, this prioritized sequence delivers the most value fastest:

**Week 1 — Foundation (zero-cost, highest impact):** BrasilAPI (CEP, CNPJ, holidays, rates), Supabase pgvector for embeddings, Cloudflare Turnstile for security, Nager.Date for Atlas holidays, Open-Meteo for weather intelligence.

**Week 2 — Intelligence layer:** Groq as Gemini fallback, Google Cloud NL API for sentiment scoring, ZenQuotes + Gemini translation for Jornada quotes, BCB SGS API for economic indicators.

**Week 3 — Communication:** WhatsApp Cloud API webhook setup, OneSignal for push notifications, Resend for email, Telegram Bot via grammy.js.

**Week 4 — Studio and Finance:** Google Cloud TTS for podcast voices, Deepgram for transcription, AwesomeAPI + brapi.dev for finance data, Freesound + Jamendo for audio assets.

**Total monthly cost at launch: $0.** The entire stack above runs within free tiers. The first costs appear when Deepgram's $200 credit and AssemblyAI's $50 credit are exhausted (likely 6–12 months of moderate usage), at which point budget approximately $15–50/month for STT services. Every other API listed has a permanent free tier.

---

## Conclusion

AICA Life OS sits at a remarkable convergence: Brazil's government open-data mandates deliver world-class free APIs for institutional data (BrasilAPI, IBGE, BCB, Portal da Transparência), the AI inference market has commoditized to the point where production-grade LLM access is free (Groq, Hugging Face, OpenRouter), and the Supabase stack already includes auth, storage, vector search, and edge functions that eliminate entire categories of paid services. The strategic insight isn't just which APIs to use — it's recognizing that **AICA's Brazilian focus is an advantage**, not a limitation, because Brazil's open-data ecosystem is among the most generous in the world. The 52 categories in the public-apis repository contain over 1,400 APIs, but the ~50 recommended here, carefully selected for free-tier viability, Portuguese support, and CORS compatibility, cover every module comprehensively while keeping the dependency count manageable for a solo developer.