# Workspace Loading Test Guide

**Server**: http://localhost:3000/
**Status**: ✅ Running (PID 26388)
**Date**: 2025-12-19

---

## 🧪 Test Steps

### Step 1: Navigate to Studio
1. Open browser at http://localhost:3000/
2. Login if needed
3. Click on **"Estúdio"** in navigation

**Expected**: Studio main view loads

---

### Step 2: Access Podcast Workspace
1. In Studio view, click on **"Podcast"** or existing podcast show
2. Select an existing episode OR create a new episode
3. Workspace should load

**What to Watch For**:
- ❌ **OLD BEHAVIOR**: Screen stuck on "Carregando episódio..." forever
- ✅ **NEW BEHAVIOR**: Loading screen appears briefly, then workspace loads

---

### Step 3: Check Console Logs
**Open Browser DevTools** (F12) → Console tab

**Expected Logs** (in order):
```
[StudioWorkspace] Rendering with project: {...}
[useWorkspaceState] Loading episode: <episode-id>
[useWorkspaceState] Episode query result: { episode: {...}, episodeError: null }
[useWorkspaceState] Episode biography: <biography-text or null>
[useWorkspaceState] Episode data: <full-episode-json>
[useWorkspaceState] Hydrated state: {
  currentStage: 'research' or 'setup',
  visitedStages: [...],
  hasDossier: true/false,
  hasTopics: <number>,
  isLoading: false
}
[useWorkspaceState] Should transition to: 'research' or 'setup'
[PodcastWorkspace] Initial state loaded: {
  isLoading: false,  // ← IMPORTANT: Should be false!
  error: null,
  currentStage: 'research' or 'setup',
  episodeId: <id>
}
[PodcastWorkspace] Mounting provider with loaded state: {
  currentStage: 'research' or 'setup',
  isLoading: false,  // ← IMPORTANT: Should be false!
  hasError: false
}
[WorkspaceContent] Rendering with state: {
  isLoading: false,  // ← IMPORTANT: Should be false!
  error: null,
  currentStage: 'research' or 'setup',
  visitedStages: [...]
}
```

**🚨 Red Flags** (Old Bug):
- If you see `isLoading: true` in the final logs
- If `[WorkspaceContent]` log shows `isLoading: true`
- If no logs after `[useWorkspaceState] Hydrated state:`

---

### Step 4: Verify Workspace UI
**What You Should See**:

1. **Header** (top):
   - Show title
   - Episode title or "Novo Episódio"
   - Save status indicator
   - Back button

2. **Stage Stepper** (navigation):
   - Setup → Research → Pauta → Production
   - Current stage highlighted
   - Completed stages marked

3. **Stage Content** (main area):
   - If no biography: **Setup Stage**
     - Guest type selection
     - Guest name field
     - Theme field
     - Scheduling options

   - If biography exists: **Research Stage**
     - Guest biography
     - Controversies
     - Suggested topics
     - Ice breakers

**What You Should NOT See**:
- ❌ Infinite loading spinner
- ❌ "Carregando episódio..." stuck forever
- ❌ Blank screen
- ❌ Error screen

---

## 🔍 Debugging Failed Tests

### If Workspace Still Stuck Loading:

**Check 1**: Verify `isLoading` state
```javascript
// In DevTools Console, type:
document.querySelector('[data-testid="studio-workspace"]')
// If null, workspace didn't mount
```

**Check 2**: Check for errors
```javascript
// Look for red errors in Console
// Common issues:
// - Supabase connection failed
// - Episode not found
// - Authentication error
```

**Check 3**: Verify episode exists
```javascript
// In Console, check if episode loads:
// Should see episode data in logs
// If episodeError is not null, episode doesn't exist
```

---

## ✅ Success Criteria

- [ ] Loading screen appears briefly (< 2 seconds)
- [ ] Workspace loads and displays content
- [ ] Console shows `isLoading: false` in final logs
- [ ] Header displays episode info
- [ ] Stage stepper shows current stage
- [ ] Stage content renders (Setup or Research)
- [ ] No infinite loading spinner
- [ ] No console errors

---

## 📊 Test Results Template

Copy this and fill out after testing:

```
## Test Results

**Date**: 2025-12-19
**Browser**: [Chrome/Firefox/Edge]
**Tester**: [Your name]

### ✅ Passed Tests
- [ ] Workspace loads without infinite loading
- [ ] Console logs show isLoading: false
- [ ] Header displays correctly
- [ ] Stage stepper visible
- [ ] Stage content renders

### ❌ Failed Tests
- [ ] [Describe any failures]

### Console Logs
```
[Paste relevant console logs here]
```

### Screenshots
- [Attach screenshots if needed]

### Notes
[Any additional observations]
```

---

## 🐛 Known Issues

1. **AI Services Not Configured**: If backend isn't set up, AI features won't work
   - Dossier generation will fail gracefully
   - Guest search will return fallback

2. **Supabase Connection**: If `.env` not configured, workspace won't load
   - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

3. **Authentication**: Must be logged in to access workspace
   - Episode data requires valid user session

---

**Ready to test?** Open http://localhost:3000/ and follow the steps above! 🚀
