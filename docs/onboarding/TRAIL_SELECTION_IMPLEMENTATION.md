# Trail Selection Component - Implementation Details

**Component**: `TrailSelectionFlow.tsx`
**LOC**: ~450 lines
**Status**: Complete & Ready for Integration
**Date**: December 11, 2025

---

## Overview

The Trail Selection Flow is the first interactive component in PHASE 2 onboarding. It guides users through:

1. **Trail Selection** - Choose 1-5 trails to explore
2. **Question Answering** - Answer 3-4 questions per trail
3. **Score Calculation** - Get individual trail scores
4. **Results Display** - See completed trails and scores
5. **Finalization** - Unlock Step 2 (Moment Capture)

---

## Architecture

### Component Hierarchy

```
TrailSelectionFlow
├── Header (Title + Description)
├── ProgressBar (Current/Total)
├── Phase-Specific Content
│   ├── Trail Selection Phase
│   │   └── Grid of TrailCards
│   ├── Answering Phase
│   │   ├── Current Trail Info
│   │   └── TrailQuestions (with Q&A)
│   └── Complete Phase
│       └── Summary + Finalization
└── Navigation (Previous/Next/Skip)
```

### Data Flow

```
User Input → State Update → Validation → API Call → State Update → UI Render
```

### State Transitions

```
INIT
 ↓
trail-selection (user picks trails)
 ↓
answering-questions (user answers 1 question at a time)
 ↓
results (all trails completed, show summary)
 ↓
complete (finalization)
```

---

## Implementation Details

### 1. Trail Selection Phase

**User Actions**:
- Click on trail cards to toggle selection
- Can select 1-5 trails (configurable via `maxTrails`)
- "Continue" button validates and starts answering phase

**Key Functions**:
```typescript
const toggleTrailSelection = (trailId: string) => {
  // Toggle selection if within limit
};

const startAnsweringTrails = () => {
  // Validate at least 1 trail selected
  // Transition to answering-questions phase
};
```

**Validation**:
- At least 1 trail required
- Cannot exceed `maxTrails`
- Error shown if validation fails

### 2. Question Answering Phase

**Structure**:
- One question at a time
- Single or multiple choice based on `question.type`
- Progress indicator shows current position

**Key Functions**:
```typescript
const handleAnswerSelect = (answerId, questionId, isMultiple) => {
  // Single choice: replace previous answer
  // Multiple choice: toggle answer in array
};

const nextQuestion = () => {
  // Validate required field
  // Move to next question or end trail
};

const prevQuestion = () => {
  // Allow navigation backward
};

const skipTrail = () => {
  // Don't save responses, move to next trail
};

const submitTrail = async () => {
  // Call API: captureContextualTrail()
  // Store score
  // Move to next trail or results
};
```

**Answer Storage**:
```typescript
responses: {
  "question_id": ["answer_id_1", "answer_id_2"] // Multiple choice
  "question_id": ["answer_id"] // Single choice
}
```

### 3. Results Phase

**Display**:
- List of completed trails
- Score per trail (0-100 scale)
- Number of trails completed vs. required
- Recommendations preview

**Finalization**:
- "Continue to Next Step" button
- Calls `finalizeOnboarding(userId)`
- Validates minimum trails completed (default: 3)
- Triggers `onComplete()` callback

---

## Key Features

### Progress Tracking

```typescript
const totalTrails = state.selectedTrails.length;
const completedTrails = state.completedTrails.length;
const progressPercent = (completedTrails / totalTrails) * 100;
```

Displayed via `ProgressBar` component:
```typescript
<ProgressBar
  current={completedTrails + 1}
  total={totalTrails}
  label={`Trilha ${completedTrails + 1} de ${totalTrails}`}
/>
```

### Error Handling

**Error Types**:
1. No trail selected
2. Required question not answered
3. API call fails
4. Not enough trails completed

**Error Display**:
- Red alert box with icon
- Clear error message in Portuguese
- Actionable guidance

```typescript
{state.error && (
  <motion.div className="flex gap-3 items-start p-4 bg-red-50 border border-red-200 rounded-lg">
    <AlertCircle size={20} className="text-red-600" />
    <p className="text-red-700">{state.error}</p>
  </motion.div>
)}
```

### Animations

**Staggered Trail Cards**:
```typescript
{trails.map((trail, index) => (
  <motion.div
    key={trail.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <TrailCard {...} />
  </motion.div>
))}
```

**Phase Transitions**:
```typescript
<motion.div
  key="trail-selection"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="space-y-8"
>
  {/* Content */}
</motion.div>
```

### Responsive Design

**Mobile** (< 640px):
```typescript
<div className="grid grid-cols-1 gap-4">
  {/* Single column */}
</div>
```

**Tablet** (640px - 1024px):
```typescript
<div className="grid grid-cols-2 gap-4">
  {/* Two columns */}
</div>
```

**Desktop** (> 1024px):
```typescript
<div className="grid grid-cols-3 gap-4">
  {/* Three columns */}
</div>
```

---

## Sub-Components

### TrailCard

**Purpose**: Visual representation of a single trail

**Features**:
- Icon and color display
- Title and description
- Selection indicator
- Hover effects

**Props**:
```typescript
interface TrailCardProps {
  trail: ContextualTrail;
  isSelected: boolean;
  onToggle: () => void;
}
```

**Styling**:
- Selected: Colored background + border
- Unselected: White background, hover border
- Smooth transitions

### TrailQuestions

**Purpose**: Render questions with answer options

**Features**:
- Single and multiple choice support
- Help text display
- Required field indicators
- Progress dots

**Props**:
```typescript
interface TrailQuestionsProps {
  trail: ContextualTrail;
  currentQuestionIndex: number;
  responses: Record<string, string[]>;
  onAnswerSelect: (answerId, questionId, isMultiple) => void;
}
```

**Question Rendering**:
```typescript
<motion.button
  onClick={() => onAnswerSelect(answer.id, currentQuestion.id, isMultiple)}
  className={`w-full p-4 rounded-xl border-2 transition-all ${
    isSelected ? 'border-[#6B9EFF] bg-blue-50' : 'border-[#E8E6E0]'
  }`}
>
  {/* Answer content */}
</motion.button>
```

---

## API Integration

### Capture Trail Responses

**Endpoint**: `POST /api/onboarding/capture-context`

**Request**:
```typescript
const request: CaptureTrailRequest = {
  userId,
  trailId: currentTrail.id,
  responses: currentTrail.questions.map(question => ({
    questionId: question.id,
    selectedAnswerIds: state.responses[question.id] || [],
  }))
};

const response = await captureContextualTrail(request);
```

**Response**:
```typescript
interface CaptureTrailResponse {
  success: boolean;
  trailId: string;
  trailScore: number; // 0-10
  recommendedModules: string[];
  pointsAwarded?: number;
  nextStep: 'complete_more_trails' | 'view_recommendations' | 'step_2_moment_capture';
  message: string;
}
```

### Finalize Onboarding

**Endpoint**: `POST /api/onboarding/finalize`

**Request**:
```typescript
const result = await finalizeOnboarding(userId);
```

**Response**:
```typescript
interface FinalizeOnboardingResponse {
  success: boolean;
  nextStep: 'step_2_moment_capture' | 'step_3_recommendations';
  allRecommendedModules: string[];
  averageScore: number;
  pointsAwarded?: number;
  message: string;
}
```

---

## Usage Example

```typescript
import TrailSelectionFlow from '@/modules/onboarding/components/TrailSelectionFlow';

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTrailsComplete = (result: CaptureTrailResponse) => {
    console.log('Trails completed:', result);
    // Navigate to Step 2
    navigate('/onboarding/step-2-moment');
  };

  const handleError = (error: string) => {
    console.error('Trail selection error:', error);
    // Show error toast
    toast.error(error);
  };

  return (
    <TrailSelectionFlow
      userId={user.id}
      onComplete={handleTrailsComplete}
      onError={handleError}
      maxTrails={5}
      minTrailsRequired={3}
    />
  );
}
```

---

## Validation Logic

### Step 1: Trail Selection
```typescript
const validateTrailSelection = () => {
  if (state.selectedTrails.length === 0) {
    setState(prev => ({ ...prev, error: 'Selecione pelo menos uma trilha' }));
    return false;
  }
  return true;
};
```

### Step 2: Question Answer
```typescript
const validateQuestion = (question: ContextualQuestion) => {
  if (!question.isRequired) return true;

  const hasAnswer = state.responses[question.id]?.length > 0;
  if (!hasAnswer) {
    setState(prev => ({ ...prev, error: 'Por favor, responda esta pergunta' }));
    return false;
  }
  return true;
};
```

### Step 3: Minimum Trails
```typescript
const validateMinimumTrails = () => {
  if (state.completedTrails.length < minTrailsRequired) {
    setState(prev => ({
      ...prev,
      error: `Complete pelo menos ${minTrailsRequired} trilhas`
    }));
    return false;
  }
  return true;
};
```

---

## Accessibility Features

### ARIA Labels
```typescript
<button
  aria-pressed={isSelected}
  aria-label={`Selecionar ${trail.name}`}
  onClick={() => toggleTrailSelection(trail.id)}
>
  {/* Button content */}
</button>
```

### Semantic HTML
```typescript
<motion.button
  role="option"
  aria-pressed={isSelected}
  onClick={() => onAnswerSelect(answer.id, questionId, isMultiple)}
>
  {/* Answer option */}
</motion.button>
```

### Focus Management
- All interactive elements are keyboard accessible
- Focus ring visible on hover/focus
- Tab order follows logical flow

### Color Contrast
- Text: 4.5:1+ (WCAG AAA)
- Interactive elements: 3:1+ minimum
- No information conveyed by color alone

---

## Performance Optimization

### Memoization
```typescript
const currentTrail = useMemo(
  () => CONTEXTUAL_TRAILS[state.selectedTrails[state.currentTrailIndex]],
  [state.selectedTrails, state.currentTrailIndex]
);
```

### Callback Optimization
```typescript
const handleAnswerSelect = useCallback(
  (answerId, questionId, isMultiple) => {
    // Update state
  },
  [] // Dependencies
);
```

### Conditional Rendering
```typescript
{state.phase === 'answering-questions' && currentTrail && (
  <motion.div>
    {/* Only render when needed */}
  </motion.div>
)}
```

---

## Testing Checklist

### Unit Tests
- [ ] `toggleTrailSelection()` logic
- [ ] `handleAnswerSelect()` for single/multiple
- [ ] `nextQuestion()` validation
- [ ] `submitTrail()` API call
- [ ] Phase transitions

### Integration Tests
- [ ] Complete trail selection to finalization flow
- [ ] Error handling and recovery
- [ ] Navigation between questions
- [ ] API response handling

### E2E Tests
- [ ] Select 1 trail, complete, finalize
- [ ] Select 3 trails, complete, finalize
- [ ] Skip a trail
- [ ] Navigate backward through questions
- [ ] Mobile responsiveness

### Accessibility Tests
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] Screen reader compatibility
- [ ] Color contrast verification
- [ ] Focus visibility

---

## Deployment Notes

1. **Dependencies**: Ensure `framer-motion` is installed
2. **Tailwind CSS**: Verify all utility classes are configured
3. **Lucide Icons**: Required for icon rendering
4. **API Endpoints**: Confirm backend endpoints are live
5. **Testing**: Run E2E tests before deployment
6. **Monitoring**: Track completion rates and errors

---

**Created**: December 11, 2025
**Last Updated**: December 11, 2025
**Related Files**:
- `PHASE2_IMPLEMENTATION.md` - Complete PHASE 2 overview
- `STEP2_MULTIPLE_CHOICE_REDESIGN.md` - Step 2 specifications
- `TRILHAS_CONTEXTUAIS_E_PERGUNTAS.md` - Trail data specifications
