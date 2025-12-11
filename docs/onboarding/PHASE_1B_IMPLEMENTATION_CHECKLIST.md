# PHASE 1B: Implementation Checklist

**Status**: Ready for Integration
**Date**: 2025-12-11

---

## Files Created

### 1. Database Migration
- **Path**: `supabase/migrations/20251211_onboarding_context_captures.sql`
- **Purpose**: Create table for storing contextual trail responses
- **Size**: ~300 lines
- **Status**: Ready to apply to Supabase

**To apply**:
```bash
# Via Supabase CLI
supabase db push

# Via Supabase Dashboard
1. Go to SQL Editor
2. Copy contents of migration file
3. Run in SQL Editor
```

---

### 2. TypeScript Types
- **Path**: `src/types/onboardingTypes.ts`
- **Purpose**: Comprehensive type definitions for onboarding
- **Size**: ~250 lines
- **Exports**:
  - `ContextualAnswer`
  - `ContextualQuestion`
  - `ContextualTrail`
  - `ContextualQuestionResponse`
  - `OnboardingContextCapture`
  - `StoredContextCapture`
  - `OnboardingStatus`
  - `CaptureTrailRequest`
  - `CaptureTrailResponse`
  - `FinalizeOnboardingResponse`
  - `TrailToModulesMap`
  - `WeightedAnswer`
  - `OnboardingFlowState`
  - `ModuleRecommendation`
  - Plus helper types

**Status**: Ready to use
**No dependencies**: Pure TypeScript

---

### 3. Contextual Trails Data
- **Path**: `src/data/contextualTrails.ts`
- **Purpose**: Static data for all 5 trails with questions and answers
- **Size**: ~1000 lines
- **Exports**:
  - `CONTEXTUAL_TRAILS` (Record)
  - `ALL_TRAILS` (Array)
  - `TRAIL_TO_MODULES_MAP` (Record)
  - `getTrailById()` (function)
  - `getAllTrailsByPriority()` (function)

**Status**: Complete with all 5 trails
- `health-emotional` (4 questions)
- `health-physical` (3 questions)
- `finance` (3 questions)
- `relationships` (3 questions)
- `growth` (3 questions)

**Data includes**:
- All weights (0-10)
- All emojis/icons
- All trigger modules
- All descriptions
- Proper ordering

---

### 4. Backend Service
- **Path**: `src/services/onboardingService.ts`
- **Purpose**: Business logic for trails, scoring, storage
- **Size**: ~450 lines
- **Key Functions**:
  - `getCourseTrails()` → Array<ContextualTrail>
  - `getTrailById_API(trailId)` → ContextualTrail
  - `captureTrailResponses(userId, trailId, responses)` → { score, modules, points }
  - `getUserOnboardingStatus(userId)` → OnboardingStatus
  - `calculateRecommendedModules(userId)` → ModuleRecommendation[]
  - `isOnboardingComplete(userId)` → boolean
  - `getOnboardingProgressPercentage(userId)` → number
  - `resetUserOnboarding(userId)` → boolean

**Dependencies**:
- `src/types/onboardingTypes.ts`
- `src/data/contextualTrails.ts`
- `src/services/supabaseClient.ts`

**Status**: Ready to use
**No external APIs required** (uses Supabase only)

---

### 5. API Endpoints
- **Path**: `src/api/onboardingAPI.ts`
- **Purpose**: HTTP endpoint wrappers for frontend consumption
- **Size**: ~350 lines
- **Endpoints**:
  - `GET /api/onboarding/trails` → listAllTrails()
  - `GET /api/onboarding/trails/:trailId` → getTrailDetails()
  - `POST /api/onboarding/capture-context` → captureContextualTrail()
  - `GET /api/onboarding/status` → getOnboardingStatusEndpoint()
  - `POST /api/onboarding/finalize` → finalizeOnboarding()
  - `GET /api/onboarding/recommendations/:userId` → getUserRecommendations()

**Dependencies**:
- `src/types/onboardingTypes.ts`
- `src/services/onboardingService.ts`

**Status**: Ready to use
**Can be deployed as-is or moved to Edge Functions**

---

### 6. Documentation
- **Path**: `docs/onboarding/PHASE_1B_API_IMPLEMENTATION.md`
- **Purpose**: Complete technical documentation
- **Sections**:
  1. Architecture overview
  2. Type definitions
  3. Static data structure
  4. Service functions
  5. API endpoints (with examples)
  6. Database schema
  7. Complete user journey
  8. Code examples
  9. Deployment options
  10. Troubleshooting

**Status**: Comprehensive and complete

---

## Integration Steps

### Step 1: Apply Database Migration
```bash
cd supabase
supabase db push
```

Verify:
```bash
supabase db list
# Should show: onboarding_context_captures
```

---

### Step 2: Import Types in Components

```typescript
import {
  ContextualTrail,
  OnboardingStatus,
  CaptureTrailRequest,
  CaptureTrailResponse,
} from '@/types/onboardingTypes';
```

---

### Step 3: Use Service Functions

```typescript
import { getCourseTrails, captureTrailResponses } from '@/services/onboardingService';

// Get all trails
const trails = await getCourseTrails();

// Capture responses
const result = await captureTrailResponses(
  userId,
  'health-emotional',
  responses
);
```

---

### Step 4: Use API Endpoints

```typescript
import {
  listAllTrails,
  captureContextualTrail,
  getOnboardingStatusEndpoint,
} from '@/api/onboardingAPI';

// List trails
const { success, trails } = await listAllTrails();

// Capture trail
const response = await captureContextualTrail({
  userId: currentUser.id,
  trailId: 'health-emotional',
  responses: [...]
});

// Get status
const { success, status, progressPercentage } =
  await getOnboardingStatusEndpoint(userId);
```

---

### Step 5: Create UI Components

Create components for:
1. **TrailsGrid** - Display 5 trails with cards
   - Show: Icon, Name, Description, Color, Priority
   - Allow selection of 1+ trails

2. **TrailQuestions** - Display questions one by one
   - Support single/multiple choice
   - Show progress (Question X of Y)
   - Validate required fields

3. **TrailResults** - Show score and recommendations
   - Display trail_score (0-10)
   - Show recommended_modules list
   - Display pointsAwarded
   - Buttons: Next Trail / View Recommendations / Skip

4. **OnboardingStatus** - Show overall progress
   - Progress bar (X/5 trails)
   - List completed trails
   - Average score
   - Button: Continue / Finish

---

### Step 6: Wire into Onboarding Flow

```
OnboardingWizard (parent)
├─ Step 1: Splash Screen
├─ Step 1b: TrailsGrid (NEW)
├─ Step 1c: TrailQuestions (NEW)
├─ Step 1d: TrailResults (NEW)
├─ Step 2: MomentCapture
├─ Step 3: Recommendations
└─ Step 4: Complete

// Add routing:
const [currentStep, setCurrentStep] = useState('trails-selection');
const [selectedTrailIds, setSelectedTrailIds] = useState<string[]>([]);
```

---

## Testing Checklist

### Unit Tests

- [ ] `calculateTrailScore()` returns correct average
- [ ] `validateAndEnrichResponses()` catches missing required questions
- [ ] `getTrailById()` returns correct trail
- [ ] `captureTrailResponses()` stores to DB correctly

### Integration Tests

- [ ] Can retrieve all 5 trails
- [ ] Can capture responses to health-emotional trail
- [ ] Trail score calculates correctly
- [ ] Recommended modules are aggregated
- [ ] RLS policies prevent cross-user data access
- [ ] getUserOnboardingStatus() returns accurate count

### E2E Tests

- [ ] User selects trail → sees questions
- [ ] User answers all questions → gets score
- [ ] User completes 3 trails → can finalize
- [ ] User finalizes → gets modules list
- [ ] Progress percentage updates correctly
- [ ] Consciousness points awarded

---

## Database Validation

### Verify Migration Applied

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'onboarding_context_captures';

-- Check columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'onboarding_context_captures';

-- Check RLS enabled
SELECT relname, relrowsecurity
FROM pg_class WHERE relname = 'onboarding_context_captures';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'onboarding_context_captures';
```

---

## Performance Considerations

### Indexes Explained

1. **`idx_onboarding_context_captures_user_id`**
   - Used for: `WHERE user_id = ?`
   - Importance: HIGH (every query filtered by user)

2. **`idx_onboarding_context_captures_trail_id`**
   - Used for: `WHERE trail_id = ?`
   - Importance: MEDIUM (admin/analytics queries)

3. **`idx_onboarding_context_captures_created_at`**
   - Used for: `ORDER BY created_at DESC`
   - Importance: MEDIUM (pagination, recent captures)

4. **`idx_onboarding_context_captures_responses` (GIN)**
   - Used for: JSONB queries on responses column
   - Importance: LOW (not currently used, prepared for future)

5. **`idx_onboarding_context_captures_recommended_modules` (GIN)**
   - Used for: Array queries on recommended_modules
   - Importance: LOW (not currently used, prepared for future)

### Query Performance

Expected query times (on typical DB):
- Get user's trails: ~5ms
- Capture responses: ~20ms
- Get recommendations: ~10ms
- Full onboarding status: ~30ms

---

## Deployment Strategy

### Development Environment
- [x] Database migration ready
- [x] Backend service implemented
- [x] API endpoints ready
- [ ] UI components (next phase)

### Staging Environment
- [ ] Apply migration to staging DB
- [ ] Test all endpoints with staging auth
- [ ] Run E2E tests
- [ ] Performance load testing

### Production Deployment
- [ ] Schedule downtime (if needed)
- [ ] Apply migration to prod DB
- [ ] Enable RLS policies
- [ ] Deploy updated frontend
- [ ] Monitor logs and metrics
- [ ] Rollback plan ready

---

## Known Limitations & TODOs

### Current Limitations
1. **Score Calculation**: Simple average of weights
   - Future: Consider question importance weights

2. **Module Recommendations**: Union of triggerModules
   - Future: Add confidence scoring and ranking

3. **Consciousness Points**: Fixed formula
   - Future: Dynamic based on trail difficulty

### TODOs for Next Phase
- [ ] Implement UI components for trail selection
- [ ] Implement UI components for question display
- [ ] Implement UI components for results
- [ ] Add animations and transitions
- [ ] Add i18n support
- [ ] Move endpoints to Supabase Edge Functions
- [ ] Add admin dashboard for analytics
- [ ] Add A/B testing for trail order
- [ ] Add user feedback mechanism
- [ ] Implement retry logic for failed captures

---

## Quick Reference

### File Structure
```
src/
├── api/
│   └── onboardingAPI.ts                    [Endpoints]
├── data/
│   └── contextualTrails.ts                 [Static Data]
├── services/
│   └── onboardingService.ts                [Business Logic]
├── types/
│   └── onboardingTypes.ts                  [Type Definitions]
└── modules/
    └── onboarding/
        └── views/
            ├── TrailsGrid.tsx              [TODO]
            ├── TrailQuestions.tsx          [TODO]
            ├── TrailResults.tsx            [TODO]
            └── OnboardingWizard.tsx        [Parent]

supabase/
└── migrations/
    └── 20251211_onboarding_context_captures.sql [DB Schema]

docs/
└── onboarding/
    ├── PHASE_1B_API_IMPLEMENTATION.md      [Full Docs]
    ├── PHASE_1B_IMPLEMENTATION_CHECKLIST.md [This file]
    ├── TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md [Spec]
    └── PERSISTENCIA_DADOS_JOURNEY.md      [Data Flow]
```

---

## Support & Questions

For questions about:
- **Types & Interfaces**: See `src/types/onboardingTypes.ts`
- **Data Structure**: See `src/data/contextualTrails.ts`
- **Business Logic**: See `src/services/onboardingService.ts`
- **API Usage**: See `src/api/onboardingAPI.ts`
- **Complete Documentation**: See `docs/onboarding/PHASE_1B_API_IMPLEMENTATION.md`

---

**Created**: 2025-12-11
**Status**: Ready for Frontend Integration
**Next Phase**: PHASE 1C - UI Components
