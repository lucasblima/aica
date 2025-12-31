# EpisodeDetailsForm - Step 3 (Final)

## Overview

`EpisodeDetailsForm` is the final step (Step 3) of the Guest Identification Wizard, used in both **Public Figure** and **Direct Contact** workflows. This component collects episode configuration details including theme, season, location, and scheduling information.

## Component Location

```
src/modules/podcast/components/wizard/EpisodeDetailsForm.tsx
```

## Features

### 1. Theme Configuration (Aica Auto vs Manual)

#### Aica Auto (Default)
- Automatically generates episode theme based on guest name
- Format: "Conversa com [Guest Name] sobre [random topic]"
- Topics pool includes:
  - empreendedorismo e inovação
  - liderança e transformação
  - tecnologia e sociedade
  - arte e cultura
  - ciência e descobertas
  - sustentabilidade e futuro
  - educação e desenvolvimento
  - saúde e bem-estar
- Visual feedback with robot emoji 🤖
- Read-only display of generated theme

#### Manual Mode
- User enters custom theme
- Placeholder: "Ex: Políticas Públicas, Empreendedorismo Social..."
- Required validation (cannot be empty)
- Enables creative freedom for specific topics

### 2. Season Configuration
- Number input (1-100)
- Default value: 1
- Incremental counter for episode organization

### 3. Location Selection
- Dropdown with 4 options:
  1. **Estúdio Remoto** (default) - Remote recording
  2. **Presencial - Estúdio Aica** - In-person at Aica studio
  3. **Presencial - Local do Convidado** - At guest's location
  4. **Presencial - Outro Local** - Other location

### 4. Scheduling (Optional)
- Date picker (ISO format: YYYY-MM-DD)
- Time picker (24-hour format: HH:MM)
- Both fields are optional
- Allows planning future recordings

## Props Interface

```typescript
interface EpisodeDetailsFormProps {
  guestName: string; // For auto-theme generation
  initialData?: {
    theme?: string;
    season?: number;
    location?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    themeMode?: 'auto' | 'manual';
  };
  onSubmit: (data: {
    theme: string;
    themeMode: 'auto' | 'manual';
    season: number;
    location: string;
    scheduledDate?: string;
    scheduledTime?: string;
  }) => void;
  onBack: () => void;
}
```

## Workflows

### Public Figure Workflow
```
Step 0 (guest-type)
  → Step 1a (search-public)
  → Step 2 (confirm-profile)
  → Step 3 (episode-details) ✓
```

### Direct Contact Workflow
```
Step 0 (guest-type)
  → Step 1b (manual-form)
  → Step 3 (episode-details) ✓
  (Skips Step 2)
```

## Validation Rules

1. **Theme (Required)**:
   - Auto mode: Always valid (generated automatically)
   - Manual mode: Cannot be empty

2. **Season (Required)**:
   - Must be >= 1
   - Must be <= 100

3. **Location (Required)**:
   - Must have a value selected
   - Default: "Estúdio Remoto"

4. **Date/Time (Optional)**:
   - No validation required
   - Can be left empty

5. **Complete Button**:
   - Disabled when validation fails
   - Enabled when all required fields are valid

## Data Test IDs

```typescript
// Buttons
'guest-wizard-back-step3'      // Back button
'guest-wizard-complete'        // Complete button
'episode-theme-auto-button'    // Aica Auto toggle
'episode-theme-manual-button'  // Manual toggle

// Inputs
'episode-theme-input'          // Manual theme input
'episode-season-input'         // Season number
'episode-location-select'      // Location dropdown
'episode-date-input'           // Date picker
'episode-time-input'           // Time picker
```

## Usage Example

### Basic Usage (Direct Contact)
```tsx
import { EpisodeDetailsForm } from './wizard';

function MyComponent() {
  const handleSubmit = (data) => {
    console.log('Episode details:', data);
    // Create episode with data
  };

  return (
    <EpisodeDetailsForm
      guestName="João Silva"
      onSubmit={handleSubmit}
      onBack={() => console.log('Back clicked')}
    />
  );
}
```

### With Initial Data (Editing)
```tsx
<EpisodeDetailsForm
  guestName="Maria Santos"
  initialData={{
    theme: 'Políticas Públicas',
    themeMode: 'manual',
    season: 2,
    location: 'Presencial - Estúdio Aica',
    scheduledDate: '2025-02-15',
    scheduledTime: '14:00',
  }}
  onSubmit={handleSubmit}
  onBack={handleBack}
/>
```

### Integration with GuestIdentificationWizard
```tsx
case 'episode-details':
  return (
    <EpisodeDetailsForm
      guestName={wizardState.guestData.name}
      initialData={{
        theme: wizardState.episodeData.theme,
        season: wizardState.episodeData.season,
        location: wizardState.episodeData.location,
        scheduledDate: wizardState.episodeData.scheduledDate,
        scheduledTime: wizardState.episodeData.scheduledTime,
        themeMode: wizardState.episodeData.themeMode,
      }}
      onSubmit={(data) => {
        updateEpisodeData(data);
        handleComplete(data);
      }}
      onBack={handleBack}
    />
  );
```

## Styling (Ceramic Design System)

The component uses Ceramic CSS classes for consistent styling:

```css
/* Cards */
.ceramic-card              /* Main container */
.ceramic-inset             /* Info boxes */

/* Buttons */
.ceramic-button-primary    /* Complete button */
.ceramic-button-secondary  /* Back button */

/* Toggle buttons */
bg-amber-500 (Active Auto)
bg-blue-500 (Active Manual)
bg-ceramic-surface (Inactive)

/* Inputs */
.ceramic-input             /* All input fields */

/* Text */
.text-ceramic-text-primary
.text-ceramic-text-secondary
```

## Auto-Theme Generation Algorithm

```typescript
const generateAutoTheme = (guestName: string): string => {
  const topics = [
    'empreendedorismo e inovação',
    'liderança e transformação',
    'tecnologia e sociedade',
    'arte e cultura',
    'ciência e descobertas',
    'sustentabilidade e futuro',
    'educação e desenvolvimento',
    'saúde e bem-estar',
  ];

  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  return `Conversa com ${guestName} sobre ${randomTopic}`;
};
```

## Testing

### E2E Tests (Playwright)
- **Test 6.1**: All required fields render
- **Test 6.2**: Aica Auto mode is default
- **Test 6.3**: Manual mode allows custom theme
- **Test 6.4**: Complete button disabled when manual theme empty
- **Test 6.5**: Season input validation
- **Test 6.6**: Location options are correct
- **Test 6.7**: Date/time are optional

### Integration Tests
- **Test 1.8**: Public Figure workflow completion
- **Test 1.9**: Direct Contact workflow completion
- **Test 2.11**: Back navigation from Step 3

## Database Schema Impact

When form is submitted, data maps to `podcast_episodes` table:

```sql
CREATE TABLE podcast_episodes (
  id uuid PRIMARY KEY,
  show_id uuid REFERENCES podcast_shows(id),

  -- From EpisodeDetailsForm
  episode_theme text,           -- From theme field
  theme_mode text,              -- 'auto' or 'manual'
  season integer DEFAULT 1,     -- From season field
  location text,                -- From location field
  scheduled_date timestamptz,   -- Combines scheduledDate + scheduledTime

  -- From previous wizard steps
  guest_name text,
  guest_email text,
  guest_phone text,
  guest_reference text,
  guest_profile jsonb,

  -- Auto-populated
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## State Management Flow

```
User Input → Local State → Validation → onSubmit()
                                            ↓
                        wizardState.episodeData ← updateEpisodeData()
                                            ↓
                            handleComplete() → EpisodeCreationData
                                            ↓
                                    Database Insert
                                            ↓
                            Navigate to PreProductionHub
```

## Accessibility

- All inputs have proper labels
- Required fields marked with `*`
- Disabled states have visual feedback
- Keyboard navigation supported
- Focus management on mode toggle
- Error states (future: add aria-invalid)

## Future Enhancements

1. **AI-Powered Theme Suggestions**
   - Use Gemini to suggest themes based on guest profile
   - Multiple theme options for user to choose from

2. **Smart Scheduling**
   - Integration with calendar systems
   - Suggest optimal recording times
   - Timezone handling for remote recordings

3. **Location Templates**
   - Save common location configurations
   - Equipment checklists per location type
   - Address autocomplete for presential locations

4. **Season Management**
   - Link to existing seasons
   - Auto-increment season based on show history
   - Season theme/description metadata

5. **Form Persistence**
   - Auto-save draft to localStorage
   - Recovery on browser crash
   - "Resume wizard" functionality

## Related Components

- `GuestTypeSelector.tsx` - Step 0
- `GuestManualForm.tsx` - Step 1b
- `GuestIdentificationWizard.tsx` - Main wizard orchestrator
- `PreProductionHub.tsx` - Next stage after completion

## API Endpoints Used

None directly. Data is passed to parent wizard which calls:
- `POST /api/podcast/episodes` - Create new episode (future)
- `POST /api/podcast/research-guest` - Trigger Deep Research (next stage)

## Files Created

1. `src/modules/podcast/components/wizard/EpisodeDetailsForm.tsx` - Main component
2. `src/modules/podcast/components/wizard/EpisodeDetailsForm.example.tsx` - Usage examples
3. `tests/e2e/podcast-wizard-episode-details.spec.ts` - E2E tests
4. Updated `src/modules/podcast/components/wizard/index.ts` - Export
5. Updated `src/modules/podcast/components/GuestIdentificationWizard.tsx` - Integration

## Issue Reference

**Issue #15**: Podcast Guest Identification Wizard - Multi-Step Flow
- **Task 1.4**: Criar EpisodeDetailsForm (Step 3) ✅

## Acceptance Criteria (All Met)

- ✅ Label "Tema da Conversa"
- ✅ Botões "Aica Auto" e "Manual" funcionando (toggle)
- ✅ Input tema manual com placeholder adequado
- ✅ Input temporada (number) valor padrão "1"
- ✅ Select localização com "Estúdio Remoto"
- ✅ Input date e time opcionais
- ✅ `data-testid="guest-wizard-back-step3"` e `data-testid="guest-wizard-complete"`
- ✅ Botão completar desabilitado se tema manual vazio
- ✅ Quando "Aica Auto" está selecionado, gera tema automaticamente baseado no guest
