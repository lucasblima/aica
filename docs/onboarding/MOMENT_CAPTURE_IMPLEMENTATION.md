# Moment Capture Component - Implementation Details

**Component**: `MomentCaptureFlow.tsx`
**LOC**: ~500 lines + 750 lines sub-components
**Status**: Complete & Ready for Integration
**Date**: December 11, 2025

---

## Overview

The Moment Capture Flow is the second interactive component in PHASE 2 onboarding. It guides users through capturing their first moment in 7 sequential steps:

1. **Step 2.1** - Moment Type Selection (6 options in grid)
2. **Step 2.2** - Emotion Selection (5 + custom)
3. **Step 2.3** - Life Areas Selection (multiple choice)
4. **Step 2.4** - Social Proof Display (value indicators)
5. **Step 2.5** - Reflection Input (optional text)
6. **Step 2.6** - Audio Recording (optional)
7. **Step 2.7** - Review & Confirmation

---

## Architecture

### Component Hierarchy

```
MomentCaptureFlow
├── Header (Title + Description)
├── Progress Bar (Current/Total Steps)
├── Step Indicators (7 dots, clickable)
├── Step Content (Animated)
│   ├── MomentTypeSelector (Step 1)
│   ├── EmotionPicker (Step 2)
│   ├── LifeAreaSelector (Step 3)
│   ├── ValueIndicator (Step 4)
│   ├── ReflectionInput (Step 5)
│   ├── AudioRecorder (Step 6)
│   └── MomentReview (Step 7)
├── Error Display
└── Navigation (Previous/Next/Save)
```

### Data Flow

```
User Input → State Update → Validation → UI Update → Render

Example:
Select Moment Type
  ↓
setState({ momentTypeId: "challenge" })
  ↓
Show Emotion Picker
  ↓
Select Emotion
  ↓
setState({ emotion: "happy" })
  ↓
Enable "Next" button
  ↓
Proceed to Life Areas
```

### State Management

```typescript
interface FlowState {
  currentStep: number; // 1-7
  momentTypeId?: string;
  emotion?: string;
  customEmotion?: string;
  lifeAreas: string[];
  reflection: string;
  audioRecording?: AudioRecording;
  loading: boolean;
  error: string | null;
}
```

---

## Step Details

### Step 2.1: Moment Type Selection

**Purpose**: User selects type of moment they want to share

**Options** (6):
1. **Desafio Superado** (⛰️, Orange)
   - Description: "Um obstáculo que você venceu"
   - Examples: "Tive coragem para pedir um aumento"

2. **Alegria/Celebração** (🎉, Green)
   - Description: "Um momento de felicidade ou vitória"
   - Examples: "Minha promoção foi aprovada"

3. **Aprendizado/Insight** (💡, Blue)
   - Description: "Algo importante que você aprendeu"
   - Examples: "Entendi por que reajo assim"

4. **Reflexão Profunda** (🪞, Purple)
   - Description: "Pensamentos sobre quem você é"
   - Examples: "Refleti sobre meus valores"

5. **Luta/Dificuldade** (⚡, Red)
   - Description: "Um desafio que está enfrentando"
   - Examples: "Estou me sentindo sozinho"

6. **Mudança/Transformação** (🦋, Purple)
   - Description: "Você está mudando em alguma forma"
   - Examples: "Sinto-me diferente após a mudança"

**Component**:
```typescript
<MomentTypeSelector
  selected={state.momentTypeId}
  onSelect={updateMomentType}
/>
```

**Validation**: Required field

**Storage**:
```typescript
setState(prev => ({
  ...prev,
  momentTypeId: typeId,
  error: null
}));
```

### Step 2.2: Emotion Selection

**Purpose**: Capture emotional state associated with moment

**Options** (5 preset + custom):
1. 😢 Triste
2. 😐 Neutro
3. 😊 Alegre
4. 😄 Muito Alegre
5. 😡 Bravo
6. + Outro sentimento (custom text input)

**Component**:
```typescript
<EmotionPicker
  selected={state.emotion}
  customEmotion={state.customEmotion}
  onSelect={updateEmotion}
  onCustomChange={updateCustomEmotion}
/>
```

**Validation**: Either preset emotion OR custom emotion required

**Storage**:
```typescript
// Preset
setState(prev => ({
  ...prev,
  emotion: emotionId,
  customEmotion: undefined
}));

// Custom
setState(prev => ({
  ...prev,
  customEmotion: text,
  emotion: undefined
}));
```

### Step 2.3: Life Areas Selection

**Purpose**: Identify which life areas are affected

**Options** (6, multiple choice):
1. 🧠 Saúde Mental (blue)
2. 💪 Saúde Física (red)
3. 👥 Relacionamentos (orange)
4. 💼 Trabalho/Carreira (indigo)
5. 💰 Financeiro (green)
6. ✨ Pessoal/Espiritual (purple)

**Component**:
```typescript
<LifeAreaSelector
  selected={state.lifeAreas}
  onToggle={toggleLifeArea}
/>
```

**Validation**: Optional (but displays selection count)

**Storage**:
```typescript
setState(prev => ({
  ...prev,
  lifeAreas: prev.lifeAreas.includes(areaId)
    ? prev.lifeAreas.filter(id => id !== areaId)
    : [...prev.lifeAreas, areaId]
}));
```

### Step 2.4: Social Proof Display

**Purpose**: Show value of platform to build confidence

**Statistics**:
1. **Weekly Moments**: "1,234 momentos compartilhados essa semana"
2. **Pattern Discovery**: "48% dos usuários encontram padrões nos primeiros 3 momentos"
3. **Avg Insights**: "3.2 insights gerados em média por semana"

**Component**:
```typescript
<ValueIndicator
  weeklyMomentCount={1234}
  patternDiscoveryRate={48}
  avgInsightsPerUser={3.2}
/>
```

**Purpose**:
- Build social proof
- Reduce intimidation
- Show platform effectiveness
- Create FOMO (positive)

**No User Input Required**

### Step 2.5: Reflection Input

**Purpose**: Optional deeper reflection on moment

**Features**:
- Optional text input (0-1000 characters)
- Dynamic prompts based on moment type
- Character counter
- Helpful hints

**Component**:
```typescript
<ReflectionInput
  momentTypeId={state.momentTypeId}
  value={state.reflection}
  onChange={updateReflection}
  maxChars={1000}
/>
```

**Dynamic Prompts**:
```typescript
const REFLECTION_PROMPTS = {
  challenge: [
    'Como você enfrentou isso?',
    'O que aprendeu neste desafio?',
    'Como isso mudou sua perspectiva?'
  ],
  joy: [
    'Por que esse momento foi tão especial?',
    'Com quem você compartilhou essa alegria?',
    'Como se sentiu depois?'
  ],
  // ... more for each type
};
```

**Validation**: Optional

**Storage**:
```typescript
setState(prev => ({
  ...prev,
  reflection: text
}));
```

### Step 2.6: Audio Recording

**Purpose**: Optional audio reflection for personal touch

**Features**:
- Microphone access
- Real-time recording with timer
- Max 2 minutes (configurable)
- Playback preview
- Delete/Retry options
- Browser compatibility check

**Component**:
```typescript
<AudioRecorder
  onRecordingComplete={updateAudioRecording}
  maxDuration={120}
  currentRecording={state.audioRecording}
  onRemoveRecording={removeAudioRecording}
/>
```

**Recording Flow**:
1. Click "Clique para Gravar"
2. Grant microphone access
3. Recording starts (visual feedback: pulsing red dot)
4. Timer displays (MM:SS format)
5. Auto-stops at 2 minutes
6. Preview with playback controls
7. Accept or retry

**Validation**: Optional

**Storage**:
```typescript
interface AudioRecording {
  blob: Blob;
  duration: number;
  url: string;
}

setState(prev => ({
  ...prev,
  audioRecording: recording
}));
```

**Browser Requirements**:
- MediaRecorder API
- getUserMedia API
- HTTPS (production)

### Step 2.7: Review & Confirmation

**Purpose**: Final review of all data before saving

**Display**:
- Moment Type (icon + name)
- Emotion (emoji + label)
- Life Areas (colored chips)
- Reflection (truncated/full text)
- Audio (playback control)
- Summary statistics

**Features**:
- Edit button on each section (navigate back to step)
- Estimated consciousness points display
- Confirmation buttons
- Loading state during save

**Component**:
```typescript
<MomentReview
  data={momentData}
  onConfirm={submitMoment}
  onEdit={goToStep}
  isLoading={state.loading}
/>
```

**Validation**: Confirms previous selections

**Actions**:
- ← Back button: returns to step 1
- Save button: calls submitMoment()

**Storage**: Final confirmation before API call

---

## Sub-Component Details

### MomentTypeSelector

**File**: `moment/MomentTypeSelector.tsx`

**Props**:
```typescript
interface MomentTypeSelectorProps {
  selected?: string;
  onSelect: (typeId: string) => void;
}
```

**Features**:
- 6-option grid (responsive)
- Color-coded cards
- Icon display
- Example list for selected type
- Smooth animations

**Styling**:
- Unselected: white background, subtle border
- Selected: colored background, colored border, checkmark
- Hover: border appears

### EmotionPicker

**File**: `moment/EmotionPicker.tsx`

**Props**:
```typescript
interface EmotionPickerProps {
  selected?: string;
  customEmotion?: string;
  onSelect: (emotionId: string) => void;
  onCustomChange: (text: string) => void;
}
```

**Features**:
- 5 emoji buttons (large, touchable)
- Custom emotion toggle
- Text input for custom emotion
- Smooth transitions

**Layout**:
- Horizontal flex layout (wraps on mobile)
- 64px × 64px buttons
- 12px spacing

### LifeAreaSelector

**File**: `moment/LifeAreaSelector.tsx`

**Props**:
```typescript
interface LifeAreaSelectorProps {
  selected: string[];
  onToggle: (areaId: string) => void;
}
```

**Features**:
- 6 toggleable chips
- Color-coded per area
- Multiple selection
- Selection count display
- Smooth animations

**Layout**:
- Flex wrap layout
- Full-width on mobile
- Responsive gap

### ValueIndicator

**File**: `moment/ValueIndicator.tsx`

**Props**:
```typescript
interface ValueIndicatorProps {
  weeklyMomentCount?: number;
  patternDiscoveryRate?: number;
  avgInsightsPerUser?: number;
}
```

**Features**:
- 3-stat grid layout
- Icon display (emoji)
- Color-coded stats
- Responsive layout
- Info footer

### ReflectionInput

**File**: `moment/ReflectionInput.tsx`

**Props**:
```typescript
interface ReflectionInputProps {
  momentTypeId?: string;
  value: string;
  onChange: (text: string) => void;
  minChars?: number;
  maxChars?: number;
}
```

**Features**:
- Expandable textarea
- Character counter
- Dynamic prompts
- Helpful hints
- Input validation feedback

### AudioRecorder

**File**: `moment/AudioRecorder.tsx`

**Props**:
```typescript
interface AudioRecorderProps {
  onRecordingComplete: (recording: AudioRecording) => void;
  maxDuration?: number;
  currentRecording?: AudioRecording;
  onRemoveRecording?: () => void;
}
```

**Features**:
- Microphone access request
- Visual recording feedback
- Timer display (MM:SS)
- Playback preview
- Delete/Retry options
- Auto-stop at max duration

### MomentReview

**File**: `moment/MomentReview.tsx`

**Props**:
```typescript
interface MomentReviewProps {
  data: MomentCaptureData;
  onConfirm: () => void;
  onEdit: (step: number) => void;
  isLoading?: boolean;
}
```

**Features**:
- Summary cards for each field
- Edit links (navigate to step)
- Points estimation
- Completion count
- Save with loading state

---

## Validation Logic

### Step Progression Validation

```typescript
const canProceed = (): boolean => {
  switch (state.currentStep) {
    case 1: return !!state.momentTypeId;
    case 2: return !!state.emotion || !!state.customEmotion;
    case 3: return true; // Optional
    case 4: return true; // Info only
    case 5: return true; // Optional
    case 6: return true; // Optional
    case 7: return true; // Review
    default: return false;
  }
};
```

### Confirmation Validation

```typescript
const submitMoment = async () => {
  if (!state.momentTypeId || (!state.emotion && !state.customEmotion)) {
    setState(prev => ({
      ...prev,
      error: 'Verifique os dados do momento'
    }));
    return;
  }
  // Proceed with API call
};
```

---

## API Integration

### Create Moment Entry (To Be Implemented)

**Endpoint**: `POST /api/journey/create-moment`

**Request**:
```typescript
interface CreateMomentRequest {
  userId: string;
  momentTypeId: string;
  emotion: string;
  customEmotion?: string;
  lifeAreas: string[];
  reflection?: string;
  audioFile?: {
    blob: Blob;
    mimeType: string;
    duration: number;
  };
}
```

**Response**:
```typescript
interface CreateMomentResponse {
  momentId: string;
  pointsAwarded: number;
  leveledUp: boolean;
  nextStep: 'view_modules' | 'complete_onboarding';
  suggestedModules: Array<{
    id: string;
    name: string;
    reason: string;
    priority: number;
  }>;
}
```

**Implementation**:
```typescript
const submitMoment = async () => {
  setState(prev => ({ ...prev, loading: true }));

  try {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('momentTypeId', state.momentTypeId);
    formData.append('emotion', state.emotion || '');
    formData.append('customEmotion', state.customEmotion || '');
    formData.append('lifeAreas', JSON.stringify(state.lifeAreas));
    formData.append('reflection', state.reflection);

    if (state.audioRecording) {
      formData.append('audioFile', state.audioRecording.blob);
      formData.append('audioDuration', state.audioRecording.duration.toString());
    }

    const response = await fetch('/api/journey/create-moment', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    onComplete(data);
  } catch (error) {
    setState(prev => ({
      ...prev,
      error: error.message,
      loading: false
    }));
  }
};
```

---

## Animations

### Step Transitions

```typescript
<motion.div
  key={state.currentStep}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {renderStepContent()}
</motion.div>
```

### Button Interactions

```typescript
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  onClick={handleClick}
>
  {/* Button content */}
</motion.button>
```

### Progress Bar

```typescript
<motion.div
  animate={{ width: `${percentage}%` }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
  className="h-3 bg-gradient-to-r from-[#6B9EFF] to-[#845EF7]"
/>
```

### Recording Indicator

```typescript
<motion.div
  animate={{ scale: [1, 1.2, 1] }}
  transition={{ duration: 1, repeat: Infinity }}
  className="w-5 h-5 bg-red-500 rounded-full"
/>
```

---

## Responsive Behavior

### Mobile (< 640px)
- Single column layout
- Full-width inputs
- Stack buttons vertically
- Larger touch targets (48px min)
- Horizontal emoji buttons

### Tablet (640px - 1024px)
- 2-column moment type grid
- Readable layout
- Side-by-side buttons
- Optimized spacing

### Desktop (> 1024px)
- 3-column moment type grid
- Centered max-width container
- Side-by-side buttons
- Enhanced spacing

---

## Accessibility

### ARIA Labels
```typescript
<button
  aria-label={`Selecionar ${type.label}`}
  aria-pressed={isSelected}
  onClick={() => onSelect(type.id)}
>
  {/* Button */}
</button>
```

### Semantic Structure
```typescript
<section aria-label="Passo 1: Tipo de Momento">
  <h2>{/* Title */}</h2>
  <div role="group">
    {/* Options */}
  </div>
</section>
```

### Focus Management
- All interactive elements focusable
- Focus ring visible (2px offset)
- Logical tab order

### Color Contrast
- Text: 4.5:1+ (WCAG AAA)
- Component borders: 3:1+ minimum
- Icons have text labels

---

## Testing Checklist

### Unit Tests
- [ ] `updateMomentType()` logic
- [ ] `updateEmotion()` with custom option
- [ ] `toggleLifeArea()` toggle logic
- [ ] `updateReflection()` text truncation
- [ ] Audio recording mock tests
- [ ] Validation functions

### Integration Tests
- [ ] Complete 7-step flow
- [ ] Skip optional steps
- [ ] Go back between steps
- [ ] Audio recording end-to-end
- [ ] API submission

### E2E Tests
- [ ] Full onboarding with audio
- [ ] Full onboarding without audio
- [ ] Edit during review
- [ ] Mobile responsiveness
- [ ] Browser microphone handling

### Accessibility
- [ ] Keyboard navigation (Tab, Shift+Tab)
- [ ] Screen reader testing
- [ ] Color contrast verification
- [ ] Focus management

---

## Performance Notes

### Optimizations
- Audio blob cleanup on unmount
- Timer cleanup in AudioRecorder
- Memoized moment type list
- Lazy-loaded audio recorder

### Bundle Size
- All sub-components in single directory
- Tree-shaking compatible
- No external dependencies (except Framer Motion, Lucide)

---

## Deployment Checklist

- [ ] API endpoints implemented
- [ ] Audio upload handler created
- [ ] Storage service configured
- [ ] Moment table schema verified
- [ ] Consciousness points logic verified
- [ ] Streak tracking integrated
- [ ] E2E tests passing
- [ ] Mobile testing completed
- [ ] Accessibility audit passed

---

**Created**: December 11, 2025
**Last Updated**: December 11, 2025
**Related Documentation**:
- `PHASE2_IMPLEMENTATION.md` - Complete PHASE 2 overview
- `STEP2_MULTIPLE_CHOICE_REDESIGN.md` - UX specifications
- `TRAIL_SELECTION_IMPLEMENTATION.md` - Trail selection details
