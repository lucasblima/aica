# AuthLoadingScreen - Integration Guide

## Overview
The `AuthLoadingScreen` component provides a visually consistent loading screen that displays while the application checks for an active authentication session.

## Features
- **Ceramic Design System**: Uses the same ceramic/neumorphic design as the rest of the app
- **Smooth Animations**: Framer Motion animations for a polished UX
- **Consistent Branding**: Sparkles icon and "Aica Life OS" branding
- **Subtle Loading Indicator**: Three animated dots to show activity
- **Background Decorations**: Subtle animated circles for visual interest

## Usage in App.tsx

### Current State (lines 146-187)
The app currently checks authentication immediately in a `useEffect`:

```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setIsAuthenticated(!!session);
    setUserId(session?.user?.id || null);
    setUserEmail(session?.user?.email || null);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
    setUserId(session?.user?.id || null);
    setUserEmail(session?.user?.email || null);
  });

  return () => subscription.unsubscribe();
}, []);
```

### Integration Steps

1. **Add loading state** to track when auth check is in progress:

```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Add this line
const [userId, setUserId] = useState<string | null>(null);
const [userEmail, setUserEmail] = useState<string | null>(null);
```

2. **Import the component**:

```typescript
import { AuthLoadingScreen } from './src/components/AuthLoadingScreen';
```

3. **Update the auth check useEffect** to set loading state:

```typescript
useEffect(() => {
  setIsCheckingAuth(true); // Start loading

  supabase.auth.getSession().then(({ data: { session } }) => {
    setIsAuthenticated(!!session);
    setUserId(session?.user?.id || null);
    setUserEmail(session?.user?.email || null);
    setIsCheckingAuth(false); // Stop loading
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
    setUserId(session?.user?.id || null);
    setUserEmail(session?.user?.email || null);
  });

  return () => subscription.unsubscribe();
}, []);
```

4. **Show loading screen while checking auth** (modify the Routes return):

```typescript
return (
  <Routes>
    {/* Guest Approval Page - Public route for podcast guests */}
    <Route
      path="/guest-approval/:episodeId/:approvalToken"
      element={<GuestApprovalPage />}
    />

    {/* Landing Page - Unauthenticated users */}
    <Route
      path="/landing"
      element={<LandingPage />}
    />

    {/* Main App - Show loading screen while checking auth */}
    <Route
      path="/*"
      element={
        isCheckingAuth ? (
          <AuthLoadingScreen />
        ) : isAuthenticated ? (
          renderMainApp()
        ) : (
          <Navigate to="/landing" replace />
        )
      }
    />
  </Routes>
);
```

## Complete Example

```typescript
import { AuthLoadingScreen } from './src/components/AuthLoadingScreen';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('vida');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // NEW
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // ... rest of state declarations

  useEffect(() => {
    // ... cleanExpiredAuthParams logic ...

    setIsCheckingAuth(true); // NEW

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
      setIsCheckingAuth(false); // NEW
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... rest of component logic ...

  return (
    <Routes>
      <Route
        path="/guest-approval/:episodeId/:approvalToken"
        element={<GuestApprovalPage />}
      />

      <Route
        path="/landing"
        element={<LandingPage />}
      />

      <Route
        path="/*"
        element={
          isCheckingAuth ? (
            <AuthLoadingScreen />
          ) : isAuthenticated ? (
            renderMainApp()
          ) : (
            <Navigate to="/landing" replace />
          )
        }
      />
    </Routes>
  );
}
```

## Design System Consistency

The component uses the same design patterns as `Login.tsx`:
- **Ceramic Base Background**: `bg-ceramic-base` (#F0EFE9)
- **Ceramic Card Shadow**: `boxShadow: '8px 8px 16px #c5c5c5, -8px -8px 16px #ffffff'`
- **Sparkles Icon**: Same icon as used in Login
- **Text Etched Effect**: `.text-etched` class for subtle depth
- **Color Palette**:
  - Primary text: `text-ceramic-text-primary` (#5C554B)
  - Secondary text: `text-ceramic-text-secondary` (#948D82)

## Accessibility
- Uses semantic HTML
- Provides visual feedback through animation
- Maintains color contrast ratios
- Responsive design (works on mobile and desktop)
