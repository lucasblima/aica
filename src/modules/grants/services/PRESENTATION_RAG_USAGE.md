# Presentation RAG Service - Usage Guide

**Issue #117 - Phase 3: RAG Integration + Content Generation**

This guide demonstrates how to use the Presentation RAG services to generate intelligent slide content using organization documents.

---

## Overview

The Presentation RAG system consists of three main services:

1. **presentationRAGService.ts** - Context building from documents via RAG
2. **presentationPrompts.ts** - Audience-specific prompt engineering
3. **presentationContentGenerator.ts** - Content generation with validation

---

## Quick Start

### 1. Generate a Single Slide

```typescript
import { generateSlideContent, buildPresentationContext } from '@/modules/grants/services';
import type { SlideType, TargetFocus } from '@/modules/grants/types';

// Step 1: Build context from organization documents
const context = await buildPresentationContext({
  organizationId: 'org-uuid',
  projectId: 'project-uuid', // optional
  targetFocus: 'esg', // 'esg' | 'tax' | 'brand' | 'impact' | 'general'
});

// Step 2: Generate slide content
const coverSlide = await generateSlideContent({
  slideType: 'cover',
  context,
  targetFocus: 'esg',
  temperature: 0.7, // optional, default: 0.7
  maxTokens: 2000, // optional, default: 2000
});

console.log(coverSlide);
// {
//   title: "Transformando Vidas através da Educação",
//   subtitle: "Projeto de Inclusão Digital 2024",
//   tagline: "Juntos, construímos um futuro melhor"
// }
```

---

### 2. Generate Full Presentation

```typescript
import { generateFullPresentation } from '@/modules/grants/services';

const presentation = await generateFullPresentation(
  'org-uuid',
  'project-uuid', // or null for organization-only presentation
  [
    'cover',
    'organization',
    'project',
    'impact-metrics',
    'timeline',
    'team',
    'incentive-law',
    'tiers',
    'contact',
  ],
  'esg', // target focus
  'professional' // template: 'professional' | 'creative' | 'institutional'
);

console.log(presentation);
// {
//   title: "Projeto Educação Digital",
//   template: "professional",
//   target_focus: "esg",
//   slides: [
//     { slide_type: 'cover', content: {...}, sort_order: 0 },
//     { slide_type: 'organization', content: {...}, sort_order: 1 },
//     ...
//   ],
//   metadata: {
//     organization_id: "org-uuid",
//     project_id: "project-uuid",
//     rag_stats: {
//       total_documents_searched: 25,
//       average_similarity: 0.82
//     }
//   }
// }
```

---

## Target Audiences (Focus Types)

The system personalizes content based on the target audience:

### ESG Focus
```typescript
targetFocus: 'esg'
```
- **Emphasis:** Sustainability, social/environmental impact, SDGs
- **Tone:** Inspirational, value-driven
- **Keywords:** impact, sustainability, transformation, community

### Tax Focus
```typescript
targetFocus: 'tax'
```
- **Emphasis:** Fiscal benefits, ROI, tax deductions, compliance
- **Tone:** Technical, objective, financially-oriented
- **Keywords:** deduction, incentive, ROI, compliance

### Brand Focus
```typescript
targetFocus: 'brand'
```
- **Emphasis:** Brand visibility, positive association, reputation
- **Tone:** Persuasive, marketing-oriented
- **Keywords:** visibility, reputation, media, stakeholders

### Impact Focus
```typescript
targetFocus: 'impact'
```
- **Emphasis:** Lives transformed, concrete results, beneficiaries
- **Tone:** Emotional, narrative, humanized
- **Keywords:** transformation, beneficiaries, stories, direct impact

### General Focus
```typescript
targetFocus: 'general'
```
- **Emphasis:** Balanced approach covering social impact and benefits
- **Tone:** Professional, clear, balanced

---

## Available Slide Types

The system supports 12 slide types:

| Slide Type | Description | Required Fields |
|------------|-------------|-----------------|
| `cover` | Presentation cover page | title |
| `organization` | Organization overview | name, description |
| `project` | Project details | title, description, objectives |
| `impact-metrics` | Impact statistics | metrics array |
| `timeline` | Project timeline | events array |
| `team` | Team members | members array |
| `incentive-law` | Tax incentive info | lawName, deductionPercentage |
| `tiers` | Sponsorship tiers | tiers array |
| `testimonials` | Testimonials | testimonials array |
| `media` | Media coverage | mediaItems array |
| `comparison` | Before/after comparison | comparisonItems array |
| `contact` | Contact information | organizationName, email |

---

## Context Building

### Basic Context
```typescript
const context = await buildPresentationContext({
  organizationId: 'org-uuid',
});
```

### With Project Context
```typescript
const context = await buildPresentationContext({
  organizationId: 'org-uuid',
  projectId: 'project-uuid',
  targetFocus: 'impact',
});
```

### Advanced Options
```typescript
const context = await buildPresentationContext({
  organizationId: 'org-uuid',
  projectId: 'project-uuid',
  targetFocus: 'esg',
  maxDocumentsPerCategory: 15, // default: 10
  similarityThreshold: 0.75, // default: 0.7
});
```

### Context Structure
```typescript
interface PresentationContext {
  organization: {
    name: string;
    mission?: string;
    vision?: string;
    history?: string;
    team?: string;
    values?: string;
    cnpj?: string;
    foundedYear?: number;
  };

  project: {
    title: string;
    objectives?: string;
    goals?: string;
    budget?: string;
    timeline?: string;
    beneficiaries?: string;
  } | null;

  impact: {
    beneficiaries?: string;
    metrics?: string;
    testimonials?: string;
    results?: string;
    media?: string;
    awards?: string;
  };

  rawDocuments: {
    organization: DocumentSearchResult[];
    project: DocumentSearchResult[];
    impact: DocumentSearchResult[];
  };
}
```

---

## Validation

All generated content is automatically validated using Zod schemas:

```typescript
import { validateSlideContent } from '@/modules/grants/services';

const validation = validateSlideContent('cover', content);

if (validation.success) {
  console.log('Valid content:', validation.data);
} else {
  console.error('Validation errors:', validation.errors);
}
```

### Auto-Sanitization

If validation fails, the system attempts to auto-sanitize:

```typescript
import { sanitizeSlideContent } from '@/modules/grants/services';

const sanitized = sanitizeSlideContent('organization', invalidContent);

if (sanitized) {
  console.log('Content sanitized successfully');
}
```

---

## Error Handling

### Content Generation Errors

```typescript
try {
  const content = await generateSlideContent({
    slideType: 'cover',
    context,
    targetFocus: 'esg',
  });
} catch (error) {
  if (error.type === 'validation_error') {
    console.error('Content validation failed:', error.message);
  } else if (error.type === 'api_error') {
    console.error('Gemini API error:', error.message);
    if (error.retryable) {
      // Retry logic
    }
  } else if (error.type === 'rate_limit') {
    console.error('Rate limit exceeded');
  }
}
```

### Context Building Errors

```typescript
try {
  const context = await buildPresentationContext(options);
} catch (error) {
  if (error.type === 'missing_documents') {
    console.error('No documents found for organization');
  } else if (error.type === 'search_failed') {
    console.error('RAG search failed:', error.message);
  }
}
```

---

## Advanced Usage

### Custom Temperature

Control creativity level (0-1, higher = more creative):

```typescript
const content = await generateSlideContent({
  slideType: 'cover',
  context,
  targetFocus: 'brand',
  temperature: 0.9, // More creative
});
```

### Regenerate Existing Content

Refine existing slide content:

```typescript
const refinedContent = await generateSlideContent({
  slideType: 'organization',
  context,
  targetFocus: 'esg',
  existingContent: {
    name: 'ONG Exemplo',
    description: 'Descrição básica',
  },
});
```

### Context Enrichment

Manually enrich context with computed fields:

```typescript
import { enrichContext } from '@/modules/grants/services';

let context = await buildPresentationContext(options);
context = enrichContext(context); // Extracts year, CNPJ, etc.
```

### Context Validation

Validate context before generation:

```typescript
import { validateContext } from '@/modules/grants/services';

const validation = validateContext(context);

if (!validation.valid) {
  console.error('Invalid context:', validation.errors);
}
```

---

## Performance Considerations

1. **Caching:** RAG searches can be cached at the application level
2. **Parallel Generation:** Generate multiple slides in parallel for speed:

```typescript
const slidePromises = slideTypes.map((type) =>
  generateSlideContent({
    slideType: type,
    context,
    targetFocus: 'esg',
  })
);

const slides = await Promise.all(slidePromises);
```

3. **Token Limits:** Each slide generation uses ~1000-2000 tokens
4. **Rate Limits:** Gemini API has rate limits - implement backoff

---

## Testing

### Mock Context for Testing

```typescript
const mockContext: PresentationContext = {
  organization: {
    name: 'Test Org',
    mission: 'Test mission',
  },
  project: null,
  impact: {
    beneficiaries: '1000 pessoas',
  },
  targetFocus: 'general',
  rawDocuments: {
    organization: [],
    project: [],
    impact: [],
  },
};
```

---

## Next Steps

- **Phase 4:** Implement Slide Components (React UI)
- **Phase 5:** Add Drag-and-Drop Editor
- **Phase 6:** Implement PDF Export via Puppeteer

---

## Related Files

- `src/modules/grants/types/presentationRAG.ts` - Type definitions
- `src/modules/grants/services/presentationRAGService.ts` - Context building
- `src/modules/grants/services/presentationPrompts.ts` - Prompt templates
- `src/modules/grants/services/presentationContentGenerator.ts` - Content generation
- `src/modules/grants/services/presentationContentSchemas.ts` - Zod schemas
- `supabase/functions/generate-slide-content/index.ts` - Edge Function

---

**Status:** Phase 3 Complete ✅
**Next Phase:** Phase 4 - Slide Components (UX Design Guardian)
