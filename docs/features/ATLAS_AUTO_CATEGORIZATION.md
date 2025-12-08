# Atlas Auto-Categorization Feature

## Overview

Intelligent task categorization powered by Gemini AI in the Atlas module. Automatically suggests categories for tasks as users type, improving task organization and productivity tracking.

## Implementation Date
2025-12-06

## Architecture

### Backend (Edge Function)
- **Location**: `supabase/functions/gemini-chat/index.ts`
- **Action**: `categorize_task`
- **Model**: Gemini Fast (for quick responses)
- **Security**: Authenticated via Supabase JWT

### Database Schema
- **Migration**: `supabase/migrations/20251206_add_category_to_work_items.sql`
- **Table**: `work_items`
- **New Column**: `category TEXT CHECK (category IN ('Trabalho', 'Pessoal', 'Saúde', 'Educação', 'Finanças', 'Outros'))`
- **Index**: `idx_work_items_category` for efficient filtering

### Frontend Components

#### 1. Hook: `useTaskCategorization`
**Location**: `src/modules/atlas/hooks/useTaskCategorization.ts`

**Purpose**: Manages AI categorization logic and state

**Features**:
- Calls GeminiClient with `categorize_task` action
- Validates AI response against allowed categories
- Returns loading state and suggested category
- Provides debounced version to avoid excessive API calls

**Usage**:
```typescript
const {
  suggestedCategory,
  isLoading,
  debouncedCategorize,
  clearSuggestion
} = useTaskCategorization();
```

#### 2. Hook: `useDebounce`
**Location**: `src/hooks/useDebounce.ts`

**Purpose**: Generic debouncing utility to prevent excessive API calls

**Features**:
- Delays function execution until user stops typing
- Configurable delay (default: 1000ms)
- Auto-cleanup on unmount

#### 3. Component: `CategorySuggestion`
**Location**: `src/modules/atlas/components/CategorySuggestion.tsx`

**Purpose**: UI component to display AI suggestion with accept/reject actions

**Features**:
- Color-coded badges per category
- Loading state with spinner
- Accept (checkmark) and Reject (X) buttons
- Smooth animations and transitions

#### 4. Integration: `TaskCreationInput`
**Location**: `src/modules/atlas/components/TaskCreationInput.tsx`

**Changes**:
- Added `useTaskCategorization` hook
- Triggers categorization on input change (debounced)
- Displays `CategorySuggestion` component
- Shows selected category badge
- Passes category to `atlasService.createTask()`

#### 5. Service: `atlasService`
**Location**: `src/modules/atlas/services/atlasService.ts`

**Changes**:
- Added `category` field to `workItemData`
- Maps `category` from response to `AtlasTask`

#### 6. Types: `plane.ts`
**Location**: `src/modules/atlas/types/plane.ts`

**Changes**:
- Added `TaskCategory` type
- Added optional `category` field to `TaskInput` and `AtlasTask`

## Categories

| Category   | Use Case                              | Example Tasks                        |
|------------|---------------------------------------|--------------------------------------|
| Trabalho   | Work-related tasks                    | "Reunião com cliente", "Enviar relatório" |
| Pessoal    | Personal tasks                        | "Lavar roupa", "Comprar presente"    |
| Saúde      | Health-related tasks                  | "Consulta médica", "Academia"        |
| Educação   | Education and learning                | "Estudar React", "Curso de inglês"   |
| Finanças   | Financial tasks                       | "Pagar boleto", "Declarar IR"        |
| Outros     | Everything else                       | Any task that doesn't fit above      |

## User Experience Flow

1. **User starts typing a task**
   - Example: "Consulta com dentista"

2. **After 1 second (debounce)**
   - Frontend calls `GeminiClient.call({ action: 'categorize_task' })`
   - Backend analyzes task description
   - Returns suggested category: "Saúde"

3. **UI shows suggestion**
   - Green badge appears: "Categoria sugerida: Saúde"
   - User sees checkmark (accept) and X (reject) buttons

4. **User accepts suggestion**
   - Category is locked
   - Badge changes to: "Categoria: Saúde" with "Alterar" link

5. **User submits task**
   - Task is created with `category: 'Saúde'`
   - Database stores the category
   - UI resets for next task

## Testing Scenarios

### Test Case 1: Work Task
**Input**: "Reunião com cliente às 14h"
**Expected Category**: Trabalho
**Validation**: Task saved with `category = 'Trabalho'`

### Test Case 2: Health Task
**Input**: "Consulta médica"
**Expected Category**: Saúde
**Validation**: Task saved with `category = 'Saúde'`

### Test Case 3: Finance Task
**Input**: "Pagar boleto do condomínio"
**Expected Category**: Finanças
**Validation**: Task saved with `category = 'Finanças'`

### Test Case 4: Education Task
**Input**: "Estudar para prova de matemática"
**Expected Category**: Educação
**Validation**: Task saved with `category = 'Educação'`

### Test Case 5: Personal Task
**Input**: "Lavar o carro"
**Expected Category**: Pessoal
**Validation**: Task saved with `category = 'Pessoal'`

### Test Case 6: Ambiguous Task
**Input**: "Ligar para João"
**Expected Category**: Outros (fallback)
**Validation**: Task saved with `category = 'Outros'`

### Test Case 7: Reject Suggestion
**Input**: "Academia"
**Suggested**: Saúde
**User Action**: Click X to reject
**Expected**: Suggestion disappears, task created without category

### Test Case 8: Offline/Error Handling
**Scenario**: Backend unavailable
**Expected**: Error message displayed, task creation continues without category

### Test Case 9: Short Input
**Input**: "Ok"
**Expected**: No categorization triggered (< 3 characters)

### Test Case 10: Debounce Test
**Action**: Type "Con" then quickly type "sulta médica"
**Expected**: Only ONE API call after user stops typing

## Performance Considerations

1. **Debouncing**: 1-second delay prevents API spam
2. **Fast Model**: Uses Gemini Fast for sub-second responses
3. **Validation**: Client-side validation of AI responses
4. **Graceful Degradation**: Works without category if AI fails
5. **Index**: Database index on category for fast filtering

## Security

- All API calls authenticated via Supabase JWT
- Category values validated by database constraint
- No direct Gemini API exposure to frontend
- Rate limiting handled by backend

## Future Enhancements

1. **Learning from corrections**: Track when users reject suggestions to improve accuracy
2. **Bulk categorization**: Categorize existing tasks
3. **Custom categories**: Allow users to create custom categories
4. **Category-based filtering**: Filter tasks by category in UI
5. **Category analytics**: Show task distribution by category
6. **Multi-language support**: Categorize tasks in different languages

## Dependencies

- `@/lib/gemini`: GeminiClient for AI calls
- `@/hooks/useDebounce`: Debouncing utility
- `lucide-react`: Icons (Check, X, Loader2)
- Supabase: Database and authentication

## Configuration

No additional configuration required. Feature is enabled by default once migration is applied.

## Rollback Procedure

If needed, to disable the feature:

1. Remove `CategorySuggestion` component from `TaskCreationInput`
2. Remove `category` field from task creation
3. (Optional) Drop column: `ALTER TABLE work_items DROP COLUMN category;`

## Support

For issues or questions:
- Check Gemini backend logs: `supabase functions logs gemini-chat`
- Check frontend console for validation errors
- Verify migration was applied: `SELECT column_name FROM information_schema.columns WHERE table_name = 'work_items' AND column_name = 'category';`
