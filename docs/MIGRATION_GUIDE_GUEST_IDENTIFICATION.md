# Migration Guide: Legacy Preparation Mode to Guest Identification Wizard

**Target Audience**: Frontend developers migrating podcast episode creation code
**Migration Difficulty**: Medium
**Estimated Time**: 2-4 hours
**Breaking Changes**: Yes (see section below)

## Executive Summary

The podcast module has been redesigned to replace the legacy "Preparation Mode" with a new **Guest Identification Wizard**. This migration guide helps developers update their code to use the new workflow.

### Key Changes

| Aspect | Legacy (Old) | New Wizard |
|--------|--------------|------------|
| **Entry Point** | Direct to PreparationMode | GuestIdentificationWizard first |
| **Guest Data** | Collected ad-hoc in PreparationMode | Collected upfront in structured wizard |
| **Episode Creation** | Created manually by user action | Created automatically by wizard |
| **Profile Search** | Embedded in PreparationMode | Separate wizard step with AI integration |
| **Contact Info** | Not captured | Phone and email captured for coordination |
| **User Flow** | Single linear flow | Dual-path (public figure vs common person) |

## Breaking Changes

### 1. GuestIdentificationWizard Now Requires `userId` Prop

**What Changed**:
```typescript
// OLD: userId was optional or implicit
<GuestIdentificationWizard
    showId={showId}
    onComplete={handleComplete}
/>

// NEW: userId is required and explicit
<GuestIdentificationWizard
    showId={showId}
    userId={userId}  // REQUIRED
    onComplete={handleComplete}
/>
```

**Why**: Ensures proper episode ownership and RLS policy enforcement.

**How to Fix**:
```typescript
// In parent component (e.g., PodcastCopilotView.tsx)
const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
        }
    };
    getUserId();
}, []);

// Only render wizard when userId is available
{userId && (
    <GuestIdentificationWizard
        showId={showId}
        userId={userId}
        onComplete={handleComplete}
        onCancel={handleCancel}
    />
)}
```

### 2. `podcast_episodes.user_id` is Now NOT NULL

**What Changed**:
```sql
-- OLD: user_id was nullable
ALTER TABLE podcast_episodes ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- NEW: user_id is NOT NULL
ALTER TABLE podcast_episodes
    ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Why**: Prevents orphaned episodes and ensures data isolation.

**How to Fix Existing Data**:
```sql
-- Step 1: Update existing episodes with NULL user_id
-- IMPORTANT: Replace 'default-user-uuid' with actual user UUID
UPDATE podcast_episodes
SET user_id = 'default-user-uuid'
WHERE user_id IS NULL;

-- Step 2: Add NOT NULL constraint
ALTER TABLE podcast_episodes
    ALTER COLUMN user_id SET NOT NULL;
```

### 3. Episode Creation Moved from PreparationMode to Wizard

**What Changed**:
```typescript
// OLD: Episode created manually in PreparationMode or before wizard
const handleCreateEpisode = async () => {
    const { data: episode } = await supabase
        .from('podcast_episodes')
        .insert({ show_id: showId, title: 'New Episode' });
    // Then open PreparationMode with episode
};

// NEW: Episode created automatically by wizard
const handleWizardComplete = (wizardData, episodeId) => {
    // Episode already exists with ID = episodeId
    // Navigate directly to PreProductionHub
    navigate(`/podcast/pre-production/${episodeId}`);
};
```

**Why**: Ensures all required data (guest info, theme, scheduling) is captured before episode creation.

**How to Migrate**:
1. Remove manual episode creation code
2. Update `onComplete` handler to receive `episodeId`
3. Pass `episodeId` to PreProductionHub instead of creating episode there

### 4. Guest Contact Fields Added to Schema

**What Changed**:
```sql
-- NEW COLUMNS in podcast_episodes
ALTER TABLE podcast_episodes
    ADD COLUMN guest_phone TEXT,
    ADD COLUMN guest_email TEXT;
```

**Migration**: Run `supabase/migrations/20251210_add_guest_contact_to_episodes.sql`

**How to Use**:
```typescript
// Wizard automatically populates these fields
const { data: episode } = await supabase
    .from('podcast_episodes')
    .select('guest_phone, guest_email')
    .eq('id', episodeId)
    .single();

// Use for sending pauta approval link
if (episode.guest_email) {
    await sendPautaApprovalEmail(episode.guest_email, pautaUrl);
}
```

## Migration Steps

### Step 1: Update Database Schema

Run migrations in order:

```bash
# Step 1: Apply podcast production workflow (if not already applied)
supabase migration up 20251205_podcast_production_workflow

# Step 2: Add guest contact fields
supabase migration up 20251210_add_guest_contact_to_episodes

# Step 3: Verify schema
supabase db diff --schema public
```

Expected output should show:
- `podcast_episodes.user_id` (NOT NULL)
- `podcast_episodes.guest_phone` (TEXT)
- `podcast_episodes.guest_email` (TEXT)
- `podcast_guest_research` table

### Step 2: Update Imports

```typescript
// OLD
import PreparationMode from '../views/PreparationMode';

// NEW: Add new imports
import { GuestIdentificationWizard } from '../components/GuestIdentificationWizard';
import { GuestTypeSelector } from '../components/GuestTypeSelector';
import { GuestManualForm } from '../components/GuestManualForm';
```

### Step 3: Update Parent Component (PodcastCopilotView)

**Before**:
```typescript
const PodcastCopilotView = () => {
    const [mode, setMode] = useState<'home' | 'preparation'>('home');

    const handleStartNewEpisode = () => {
        setMode('preparation');
    };

    return (
        <>
            {mode === 'home' && <ShowsList onSelectShow={handleStartNewEpisode} />}
            {mode === 'preparation' && <PreparationMode showId={selectedShowId} />}
        </>
    );
};
```

**After**:
```typescript
const PodcastCopilotView = () => {
    const [mode, setMode] = useState<'home' | 'wizard' | 'pre_production'>('home');
    const [userId, setUserId] = useState<string | null>(null);
    const [episodeId, setEpisodeId] = useState<string | null>(null);

    // Get authenticated user ID
    useEffect(() => {
        const getUserId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            } else {
                // Redirect to login or show error
                navigate('/login');
            }
        };
        getUserId();
    }, []);

    const handleStartNewEpisode = (showId: string) => {
        setSelectedShowId(showId);
        setMode('wizard');
    };

    const handleWizardComplete = (wizardData, newEpisodeId) => {
        setEpisodeId(newEpisodeId);
        setMode('pre_production');
    };

    const handleWizardCancel = () => {
        setMode('home');
    };

    return (
        <>
            {mode === 'home' && (
                <ShowsList onSelectShow={handleStartNewEpisode} />
            )}

            {mode === 'wizard' && userId && (
                <GuestIdentificationWizard
                    showId={selectedShowId}
                    userId={userId}
                    onComplete={handleWizardComplete}
                    onCancel={handleWizardCancel}
                />
            )}

            {mode === 'pre_production' && episodeId && (
                <PreProductionHub episodeId={episodeId} />
            )}
        </>
    );
};
```

### Step 4: Update PreProductionHub

**Before**:
```typescript
const PreProductionHub = ({ showId }) => {
    const [episode, setEpisode] = useState(null);

    // Create episode on mount
    useEffect(() => {
        const createEpisode = async () => {
            const { data } = await supabase
                .from('podcast_episodes')
                .insert({ show_id: showId })
                .single();
            setEpisode(data);
        };
        createEpisode();
    }, []);

    // ...
};
```

**After**:
```typescript
const PreProductionHub = ({ episodeId }) => {
    const [episode, setEpisode] = useState(null);

    // Load existing episode (already created by wizard)
    useEffect(() => {
        const loadEpisode = async () => {
            const { data } = await supabase
                .from('podcast_episodes')
                .select('*, guest_research:podcast_guest_research(*)')
                .eq('id', episodeId)
                .single();
            setEpisode(data);
        };
        loadEpisode();
    }, [episodeId]);

    // Guest info is already populated
    if (!episode) return <LoadingSpinner />;

    return (
        <div>
            <h1>Pre-Production: {episode.guest_name}</h1>
            <p>Theme: {episode.episode_theme}</p>
            <p>Scheduled: {episode.scheduled_date}</p>
            {/* Research panel, pauta builder, etc. */}
        </div>
    );
};
```

### Step 5: Update Tests

**Before**:
```typescript
it('should create episode when entering preparation mode', async () => {
    render(<PodcastCopilotView />);

    fireEvent.click(screen.getByText('New Episode'));

    // Wait for episode creation
    await waitFor(() => {
        expect(screen.getByText('Preparation Mode')).toBeInTheDocument();
    });
});
```

**After**:
```typescript
it('should complete wizard and create episode', async () => {
    render(<PodcastCopilotView />);

    // Step 0: Select guest type
    fireEvent.click(screen.getByText('New Episode'));
    fireEvent.click(screen.getByTestId('guest-type-public-figure'));

    // Step 1: Enter guest info
    fireEvent.change(screen.getByTestId('guest-wizard-name'), {
        target: { value: 'Eduardo Paes' }
    });
    fireEvent.click(screen.getByTestId('guest-wizard-search'));

    // Step 2: Confirm profile
    await waitFor(() => {
        expect(screen.getByText('Confirme o convidado')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Eduardo/ }));

    // Step 3: Complete episode details
    fireEvent.click(screen.getByTestId('guest-wizard-complete'));

    // Verify episode created and navigated to PreProductionHub
    await waitFor(() => {
        expect(screen.getByText('Pre-Production: Eduardo Paes')).toBeInTheDocument();
    });
});
```

## Backward Compatibility

### Supporting Legacy Episodes

Episodes created before the migration may not have all new fields populated. Handle gracefully:

```typescript
const PreProductionHub = ({ episodeId }) => {
    const [episode, setEpisode] = useState(null);

    useEffect(() => {
        const loadEpisode = async () => {
            const { data } = await supabase
                .from('podcast_episodes')
                .select('*')
                .eq('id', episodeId)
                .single();
            setEpisode(data);
        };
        loadEpisode();
    }, [episodeId]);

    if (!episode) return <LoadingSpinner />;

    // Handle legacy episodes without guest contact info
    const canSendApproval = episode.guest_email || episode.guest_phone;

    return (
        <div>
            <h1>{episode.guest_name || 'Guest TBD'}</h1>

            {!canSendApproval && (
                <Alert variant="warning">
                    Missing contact information.
                    <button onClick={handleAddContactInfo}>Add Contact Info</button>
                </Alert>
            )}

            {canSendApproval && (
                <button onClick={handleSendApproval}>Send Pauta for Approval</button>
            )}
        </div>
    );
};
```

### Phased Rollout Strategy

**Option 1: Big Bang (Recommended for small teams)**
- Deploy all changes at once
- Inform users of new workflow
- Update all existing code paths

**Option 2: Feature Flag (Recommended for large teams)**
```typescript
const USE_NEW_WIZARD = process.env.REACT_APP_ENABLE_GUEST_WIZARD === 'true';

const PodcastCopilotView = () => {
    // ...

    const handleStartNewEpisode = (showId) => {
        if (USE_NEW_WIZARD) {
            setMode('wizard');
        } else {
            // Legacy path
            setMode('preparation');
        }
    };

    return (
        <>
            {mode === 'wizard' && USE_NEW_WIZARD && (
                <GuestIdentificationWizard {...props} />
            )}

            {mode === 'preparation' && !USE_NEW_WIZARD && (
                <LegacyPreparationMode {...props} />
            )}
        </>
    );
};
```

## Troubleshooting

### Issue: "Column user_id violates not-null constraint"

**Symptom**: Error when creating episode: `null value in column "user_id" violates not-null constraint`

**Cause**: Parent component not passing userId prop, or auth context not available

**Fix**:
```typescript
// Verify auth state before rendering wizard
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
    console.error('No authenticated user');
    navigate('/login');
    return;
}

// Pass userId to wizard
<GuestIdentificationWizard userId={user.id} {...otherProps} />
```

### Issue: "Episode created but PreProductionHub shows 404"

**Symptom**: Wizard completes successfully but PreProductionHub can't find episode

**Cause**: RLS policy blocking access because user_id mismatch

**Fix**:
```typescript
// Debug: Check episode ownership
const { data: episode } = await supabase
    .from('podcast_episodes')
    .select('id, user_id')
    .eq('id', episodeId)
    .single();

const { data: { user } } = await supabase.auth.getUser();

console.log('Episode user_id:', episode.user_id);
console.log('Current user id:', user.id);
console.log('Match:', episode.user_id === user.id);

// If mismatch, episode was created with wrong user_id
// Solution: Ensure wizard receives correct userId prop
```

### Issue: "Guest profile search always fails"

**Symptom**: Step 1a always shows "Busca automatica falhou" error

**Cause**: Gemini API not configured or rate limit exceeded

**Fix**:
```typescript
// Check API configuration
console.log('Gemini API Key:', process.env.VITE_GEMINI_API_KEY ? 'Set' : 'Missing');

// Add fallback behavior
const handleSearchProfile = async () => {
    try {
        const result = await searchGuestProfile(guestName, guestReference);
        // ... handle success
    } catch (error) {
        console.error('Profile search error:', error);

        // Graceful degradation: use fallback profile
        const fallbackProfile = {
            name: guestName,
            fullName: guestName,
            title: guestReference || 'Convidado',
            summary: 'Profile created manually. Add details in pre-production.'
        };

        setSearchResults([fallbackProfile]);
        setStep(2); // Allow user to proceed
    }
};
```

### Issue: "Phone validation rejects valid numbers"

**Symptom**: Manual form shows "Telefone invalido" for real phone numbers

**Cause**: Regex doesn't handle all Brazilian formats

**Fix**: Update validation regex in `GuestManualForm.tsx`:
```typescript
const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');

    // Accept:
    // - 10 digits: (21) 9999-9999
    // - 11 digits: (21) 99999-9999
    // - 12 digits: 5521999999999 (country code)
    // - 13 digits: +5521999999999
    return digits.length >= 10 && digits.length <= 13;
};
```

## Performance Considerations

### Bundle Size Impact

New wizard adds ~33KB gzipped to bundle. If this is a concern, lazy load:

```typescript
// In PodcastCopilotView.tsx
const GuestWizard = lazy(() =>
    import('../components/GuestIdentificationWizard').then(module => ({
        default: module.GuestIdentificationWizard
    }))
);

// Render with Suspense
<Suspense fallback={<LoadingSpinner />}>
    {mode === 'wizard' && (
        <GuestWizard {...props} />
    )}
</Suspense>
```

### Database Query Optimization

New wizard makes 1 database insert. Compare to legacy approach (multiple queries):

**Legacy** (3 queries):
1. Insert episode skeleton
2. Update with guest info
3. Update with scheduling

**New Wizard** (1 query):
```typescript
// Single atomic insert with all data
await supabase.from('podcast_episodes').insert({
    show_id, user_id, guest_name, guest_phone, guest_email,
    episode_theme, scheduled_date, status: 'draft'
});
```

## Rollback Plan

If issues arise, rollback in reverse order:

### Step 1: Revert Frontend Code
```bash
git revert <commit-hash-of-wizard-integration>
```

### Step 2: Revert Database (CAUTION: May lose data)
```sql
-- Make user_id nullable again (ONLY if no new episodes created)
ALTER TABLE podcast_episodes ALTER COLUMN user_id DROP NOT NULL;

-- Remove contact fields (ONLY if not used)
ALTER TABLE podcast_episodes
    DROP COLUMN guest_phone,
    DROP COLUMN guest_email;
```

**WARNING**: Do NOT revert database if production episodes exist with new schema.

### Step 3: Verify Legacy Path Still Works
```bash
npm run test:e2e -- legacy-preparation-mode.spec.ts
```

## FAQ

**Q: Can I skip the wizard and create episodes manually?**
A: Not recommended. The wizard ensures all required data is captured. If absolutely necessary, you can insert directly via SQL, but you must provide all required fields including `user_id`.

**Q: What happens to episodes created before the migration?**
A: They continue to work but may lack some fields (guest_phone, guest_email). Update them manually or prompt users to add missing info.

**Q: Can I customize the wizard steps?**
A: Yes, but carefully. The wizard component is modular. You can fork it and modify step logic, but ensure database constraints are still met.

**Q: How do I test the wizard without Gemini API?**
A: Mock the `searchGuestProfile` function in tests:
```typescript
jest.mock('../../services/podcastProductionService', () => ({
    searchGuestProfile: jest.fn().mockResolvedValue({
        success: true,
        data: { full_name: 'Test Guest', occupation: 'Tester' }
    })
}));
```

**Q: Does the wizard work on mobile?**
A: Yes, fully responsive. However, multi-step wizards can be cramped on small screens. Consider tablet as minimum recommended viewport.

## Additional Resources

- [Guest Identification Workflow Documentation](./features/GUEST_IDENTIFICATION_WORKFLOW.md)
- [Backend Architecture](./architecture/backend_architecture.md)
- [Podcast UX Questions Answered](./PODCAST_UX_QUESTIONS_ANSWERED.md)
- [Supabase RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For migration issues:
1. Check [Troubleshooting section](#troubleshooting) above
2. Review component source code in `src/modules/podcast/components/`
3. Check Supabase logs for RLS policy errors
4. Contact backend team for database migration issues

---

**Last Updated**: 2025-12-10
**Migration Status**: In Progress
**Estimated Completion**: Q1 2025
