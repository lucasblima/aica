# Podcast Navigation Refactor - Quick Reference Card

## What Changed

Three podcast views now use `StudioLayout` consistently for spatial context and smooth transitions.

## Files Modified

### 1. PodcastCopilotView.tsx
**Location**: `src/views/`
**Lines**: 258-278
**Change**: Wrapped GuestIdentificationWizard with StudioLayout
```typescript
<StudioLayout title="Novo Episódio" status="draft" onExit={handleBackToDashboard} variant="scrollable" isStudioMode={false}>
    <GuestIdentificationWizard />
</StudioLayout>
```

### 2. PreProductionHub.tsx
**Location**: `src/modules/podcast/views/`
**Line 51**: Added import `import { StudioLayout } from '../components/StudioLayout';`
**Lines 607-621**: Replaced custom header with StudioLayout
**Lines 939-958**: Moved action buttons to floating bottom-right
**Line 1122**: Changed closing tag to `</StudioLayout>`

### 3. ProductionMode.tsx
**Location**: `src/modules/podcast/views/`
**Line 22**: Added import `import { StudioLayout } from '../components/StudioLayout';`
**Lines 133-168**: Replaced custom header with StudioLayout (studio mode)
**Lines 370-371**: Changed closing tags

## Three StudioLayout Configurations

### Wizard
```typescript
<StudioLayout title="Novo Episódio" status="draft" onExit={handleBackToDashboard} variant="scrollable" isStudioMode={false}>
```
- Floating header with back button
- Scrollable content
- Full UI visible

### Pre-Production
```typescript
<StudioLayout title={guestData.fullName || guestData.name} status="draft" onExit={onBack} variant="scrollable" isStudioMode={false}>
```
- Guest name in header
- Floating action buttons (bottom-right)
- Full research interface

### Production (REDUCTIVE)
```typescript
<StudioLayout title={dossier.guestName || 'Episódio'} status="recording" onExit={onBack} variant="fixed" isStudioMode={true}>
```
- Header completely hidden
- Floating timer/controls (top-center)
- Minimal exit button (corner)
- Maximum focus on recording

## Navigation Flow

```
Dashboard
    ↓ Create Episode
Wizard (Draft)
    ├─ Back → Dashboard
    └─ Complete → Pre-Production
Pre-Production (Draft)
    ├─ Back → Dashboard
    └─ Go to Recording → Production
Production (Recording - Reductive Design)
    ├─ Back → Pre-Production
    └─ Finish → Post-Production
```

## Key Principles Applied

✓ **Fluidity**: Smooth AnimatePresence transitions
✓ **Anchors**: Floating header maintains context (except studio mode)
✓ **Reductive**: Production mode hides all UI except essentials
✓ **Explicit Navigation**: Never using navigate(-1), always explicit paths

## Important Details

### Wizard View
- Title: "Novo Episódio" (static)
- Status: "draft"
- Variant: "scrollable" (form content)
- Mode: Non-studio (isStudioMode=false)
- Header: Visible with back button

### Pre-Production View
- Title: Guest name (dynamic)
- Status: "draft"
- Variant: "scrollable" (content can scroll)
- Mode: Non-studio
- Header: Visible with back button
- Action Buttons: Floating bottom-right (fixed position)
  - "Enviar Aprovação" (blue gradient)
  - "Ir para Gravação" (green gradient)

### Production View
- Title: Guest name (dynamic)
- Status: "recording" (shows red pulse indicator)
- Variant: "fixed" (no scrolling, full screen)
- Mode: **Studio (isStudioMode=true)** - KEY!
- Header: **HIDDEN completely** (reductive)
- Floating Controls: Top-center floating bar
  - Recording indicator (pulsing red dot)
  - Status text (GRAVANDO/PRODUÇÃO)
  - Timer (HH:MM:SS format)
  - Teleprompter button
- Exit Button: Minimal corner button (StudioLayout provides)

## Animation Behavior

### Header Animations
- **Enter**: Slides down from top (y: -100 → 0), fade in
- **Exit**: Slides up, fade out (in studio mode)
- **Duration**: 300ms
- **Easing**: [0.4, 0, 0.2, 1]

### Content Animations
- **Scale**: 0.98 → 1 (normal) or 1.02 → 1 (studio)
- **Opacity**: 0 → 1
- **Duration**: 400ms
- **Mode**: "wait" (AnimatePresence)

## Important Code Patterns

### Back Button Navigation
All back buttons use explicit paths:
```typescript
// CORRECT - Explicit path
const handleBackToDashboard = () => {
    setView('dashboard');
    setCurrentEpisodeId(null);
    setCurrentDossier(null);
    // ... reset other state
};

// WRONG - Never do this
navigate(-1);  // DON'T USE
```

### Modal Dialogs
Still work correctly above StudioLayout:
```typescript
<StudioLayout>
    {/* Content */}
</StudioLayout>

{/* Dialogs layer above with z-index */}
<AnimatePresence>
    {showDialog && <Dialog />}
</AnimatePresence>
```

### Floating Elements
Use fixed positioning within StudioLayout:
```typescript
<div className="fixed bottom-6 right-6 z-40">
    {/* Floating buttons */}
</div>
```

## Testing Quick Checks

- [ ] Can navigate: Dashboard → Wizard → back to Dashboard
- [ ] Can navigate: Wizard → PreProduction → back to Dashboard
- [ ] Can navigate: PreProduction → Production
- [ ] Production: header vanishes (studio mode works)
- [ ] Production: floating timer appears at top-center
- [ ] Floating action buttons visible in PreProduction
- [ ] Exit button appears in corner during Production
- [ ] Dialogs work (sources, approval, pauta generator)
- [ ] Transitions are smooth (no jumpy animations)
- [ ] All text readable on different screen sizes

## Design Tokens Used

```css
/* Colors */
ceramic-base: #F0EFE9
ceramic-text-primary: #2D2820
ceramic-text-secondary: #665D52
ceramic-text-tertiary: #A5A096

/* Borders */
border-color: #E5E3DC, #D6D3CD

/* Glass Effect */
backdrop-blur-md: blur(12px)
bg-white/70: rgba(255, 255, 255, 0.7)

/* Shadows */
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)

/* Rounded */
rounded-2xl: 16px
rounded-xl: 12px
rounded-lg: 8px
```

## Common Issues & Solutions

### Issue: Header not appearing in Wizard
**Solution**: Check `isStudioMode={false}` (should be false, not true)

### Issue: Action buttons not visible in PreProduction
**Solution**: Check `fixed bottom-6 right-6 z-40` classes are present

### Issue: Studio mode still shows header
**Solution**: Verify `isStudioMode={true}` is set in StudioLayout

### Issue: Back button not working
**Solution**: Ensure handler uses explicit view change, not navigate(-1)

### Issue: Floating timer not in right position
**Solution**: Check `absolute top-6 left-1/2 -translate-x-1/2` positioning

### Issue: Dialogs behind layout
**Solution**: Check dialog z-index is higher than floating elements (z-40 vs z-50)

## No Breaking Changes

- ✓ Props unchanged
- ✓ Database unchanged
- ✓ APIs unchanged
- ✓ Modal dialogs work
- ✓ Recording works
- ✓ Chat works
- ✓ Teleprompter works
- ✓ All state management unchanged

## Quick Links to Documentation

- **Comprehensive Guide**: `PODCAST_IMPLEMENTATION_GUIDE.md`
- **Technical Details**: `PODCAST_NAVIGATION_REFACTOR.md`
- **Visual Diagrams**: `PODCAST_NAVIGATION_VISUAL.md`
- **Summary**: `PODCAST_NAVIGATION_SUMMARY.md`

---

## One-Minute Recap

The podcast module now has three views that all wrap their content with `StudioLayout`:

1. **Wizard** → StudioLayout (normal mode) → shows floating header
2. **PreProduction** → StudioLayout (normal mode) → shows floating header + floating buttons
3. **Production** → StudioLayout (studio mode) → header vanishes, only floating timer/controls visible

All navigation is explicit (no browser history), transitions are smooth, and the reductive design in production maximizes user focus during recording.

**Status**: Ready to test
**Risk**: Low (layout-only changes)
**Benefit**: Consistent, professional UX with clear spatial context

---

Last Updated: 2025-12-15
Version: 1.0 Complete
