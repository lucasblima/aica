# Generate Presentation PDF - Edge Function

**Issue:** #117 - Presentation Generator (Phase 4)
**Purpose:** Convert HTML slides to high-quality PDF using Puppeteer
**Resolution:** 1920x1080px (Full HD landscape)

---

## Features

- ✅ **12 Slide Types:** cover, organization, project, impact-metrics, timeline, team, incentive-law, tiers, testimonials, media, comparison, contact
- ✅ **3 Templates:** professional, creative, institutional
- ✅ **High-Quality PDF:** 2x device pixel ratio for crisp output
- ✅ **Storage Integration:** Uploads to `presentation-assets` bucket
- ✅ **Signed URLs:** 1-hour temporary access
- ✅ **RLS Security:** User ownership verification

---

## Local Development

### 1. Start Local Supabase
```bash
npx supabase start
```

### 2. Serve Edge Function
```bash
npx supabase functions serve generate-presentation-pdf --no-verify-jwt
```

### 3. Test Request
```bash
# With authentication
curl -i --location --request POST \
  'http://127.0.0.1:54321/functions/v1/generate-presentation-pdf' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data @test-request.json

# Response:
{
  "success": true,
  "pdf_url": "https://...signed_url...",
  "storage_path": "{user_id}/decks/{deck_id}.pdf",
  "total_slides": 12
}
```

---

## Deploy to Production

### 1. Deploy Function
```bash
npx supabase functions deploy generate-presentation-pdf
```

### 2. Set Environment Variables (if needed)
```bash
npx supabase secrets set SUPABASE_URL=your_url
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 3. Test Production
```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-presentation-pdf' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"deck_id":"uuid","user_id":"uuid"}'
```

---

## Request/Response

### Request Body
```typescript
{
  deck_id: string;   // UUID of the deck
  user_id: string;   // UUID of the authenticated user
}
```

### Success Response (200)
```typescript
{
  success: true;
  pdf_url: string;        // Signed URL (1-hour expiry)
  storage_path: string;   // Path in bucket
  total_slides: number;   // Number of slides rendered
}
```

### Error Response (4xx/5xx)
```typescript
{
  success: false;
  error: string;  // Error message
}
```

---

## Slide Content Schemas

### Cover Slide
```typescript
{
  title: string;
  subtitle?: string;
  tagline?: string;
  logoUrl?: string;
  approvalNumber?: string;
}
```

### Organization Slide
```typescript
{
  name: string;
  description?: string;
  mission?: string;
  achievements?: string[];
  logoUrl?: string;
}
```

### Project Slide
```typescript
{
  name: string;
  executiveSummary?: string;
  objectives?: string[];
  duration?: string;
  location?: string;
}
```

### Impact Metrics Slide
```typescript
{
  title: string;
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
    icon?: string;
    description?: string;
  }>;
  impactStatement?: string;
}
```

### Timeline Slide
```typescript
{
  title: string;
  events: Array<{
    date: string;
    title: string;
    description?: string;
    isHighlighted?: boolean;
  }>;
}
```

### Team Slide
```typescript
{
  title: string;
  members: Array<{
    name: string;
    role: string;
    bio?: string;
    photoUrl?: string;
    linkedIn?: string;
  }>;
}
```

### Incentive Law Slide
```typescript
{
  lawName: string;
  lawShortName?: string;
  jurisdiction?: string;
  taxType?: string;
  deductionPercentage?: number;
  description?: string;
}
```

### Tiers Slide
```typescript
{
  title: string;
  currency?: string;
  tiers: Array<{
    name: string;
    value: number;
    description?: string;
    deliverables?: Array<{ title: string }>;
    isHighlighted?: boolean;
  }>;
}
```

### Testimonials Slide
```typescript
{
  title: string;
  testimonials: Array<{
    quote: string;
    author: string;
    role?: string;
    photoUrl?: string;
  }>;
}
```

### Media Slide
```typescript
{
  title: string;
  mediaItems: Array<{
    outlet: string;
    logoUrl?: string;
    headline?: string;
    date?: string;
  }>;
}
```

### Comparison Slide
```typescript
{
  title: string;
  items: Array<{
    label: string;
    features: Array<{
      name: string;
      available: boolean;
    }>;
  }>;
}
```

### Contact Slide
```typescript
{
  title: string;
  callToAction?: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}
```

---

## Template Customization

### Professional (Corporate)
- **Primary:** #1e3a5f (dark blue)
- **Secondary:** #f4a261 (orange)
- **Fonts:** Montserrat (titles), Open Sans (body)

### Creative (Artistic)
- **Primary:** #6366f1 (indigo)
- **Secondary:** #ec4899 (pink)
- **Fonts:** Poppins (titles), Inter (body)

### Institutional (Government)
- **Primary:** #1e40af (blue)
- **Secondary:** #059669 (green)
- **Fonts:** Roboto (titles), Source Sans Pro (body)

---

## Performance Notes

- **Puppeteer Launch:** ~2 seconds
- **Per Slide Render:** ~1-2 seconds
- **PDF Merge:** ~1 second
- **Storage Upload:** ~1 second
- **Total (12 slides):** ~15-20 seconds

---

## Troubleshooting

### Error: "Puppeteer launch failed"
```bash
# Install Chromium dependencies (Linux)
apt-get install -y chromium-browser
```

### Error: "Storage upload failed"
```bash
# Verify bucket exists
SELECT * FROM storage.buckets WHERE name = 'presentation-assets';

# Check RLS policies
SELECT * FROM storage.policies WHERE bucket_id = 'presentation-assets';
```

### Error: "Deck not found"
```sql
-- Verify deck ownership
SELECT * FROM generated_decks WHERE id = 'deck_id' AND user_id = 'user_id';
```

---

## Security Checklist

- [x] JWT authentication required
- [x] User ID validation
- [x] Deck ownership verification (RLS)
- [x] Storage path follows pattern: `{user_id}/decks/{deck_id}.pdf`
- [x] CORS headers configured
- [x] Signed URLs with expiration

---

## Dependencies

- `@supabase/supabase-js@2` - Supabase client
- `puppeteer@16.2.0` - Headless Chrome for PDF
- `pdf-lib@^1.17.1` - PDF merging

---

## Related Files

- **Migration:** `supabase/migrations/20260122000001_generated_decks.sql`
- **Documentation:** `docs/implementation/PHASE_4_PDF_GENERATION_COMPLETE.md`
- **Plan:** `docs/implementation/ISSUE_117_PRESENTATION_GENERATOR_PLAN.md`

---

**Maintained by:** Backend Architect Agent
**Last Updated:** 2026-01-22
