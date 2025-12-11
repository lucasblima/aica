# Onboarding Module - Aica

Professional landing page and onboarding components for the Aica platform.

## Components Overview

### LandingPage
The main landing page component that orchestrates all sections.

```tsx
import { LandingPage } from './';

export function App() {
  return <LandingPage />;
}
```

**Features:**
- Complete splash screen for unauthenticated users
- Smooth navigation and scroll handling
- Semantic HTML structure
- WCAG AAA accessibility
- Mobile-first responsive design

### Header
Sticky navigation header with language selector and auth buttons.

```tsx
import { Header } from './landing/Header';

<Header
  onLoginClick={() => navigate('/auth/login')}
  onSignUpClick={() => navigate('/auth/signup')}
/>
```

**Props:**
- `onLoginClick: () => void` - Handle login button click
- `onSignUpClick: () => void` - Handle sign up button click

### HeroSection
Main value proposition with headline, subheading, and CTA buttons.

```tsx
import { HeroSection } from './landing/HeroSection';

<HeroSection
  onSignUpClick={handleSignUp}
  onLearnMoreClick={handleLearnMore}
/>
```

**Props:**
- `onSignUpClick: () => void` - Primary CTA click handler
- `onLearnMoreClick: () => void` - Secondary button handler

**Features:**
- Gradient background
- Side-by-side layout (desktop) / stacked (mobile)
- Animated illustration with decorative shapes
- Two-button CTA design

### ValueProposition
Three-column benefit cards highlighting core features.

```tsx
import { ValueProposition } from './landing/ValueProposition';

<ValueProposition />
```

**Static Component** - no props required

**Features:**
- 3 benefit cards with icons
- Hover animations and lift effects
- Staggered entrance animations
- Responsive: 1 column mobile, 3 columns desktop

**Benefits Displayed:**
1. Autoconhecimento Profundo (Deep Self-Knowledge)
2. Crescimento Personalizado (Personalized Growth)
3. Privacidade & Segurança (Privacy & Security)

### HowItWorks
Four-step process visualization with icons and descriptions.

```tsx
import { HowItWorks } from './landing/HowItWorks';

<HowItWorks />
```

**Static Component** - no props required

**Features:**
- 4-step timeline with badges
- Responsive: vertical stacking mobile, horizontal desktop
- Connected line and arrows (desktop)
- Staggered animations

**Steps:**
1. Registro de Momentos (Register Moments)
2. Análise Inteligente (Intelligent Analysis)
3. Recomendações Personalizadas (Personalized Recommendations)
4. Transformação (Transformation)

### TrustIndicators
Three-column trust and credibility signals.

```tsx
import { TrustIndicators } from './landing/TrustIndicators';

<TrustIndicators />
```

**Static Component** - no props required

**Features:**
- Beta status indicator
- Privacy & security assurance
- User statistics (1000+ users)
- Color-coded indicator icons
- Inspirational quote at bottom

### CTASection
Final call-to-action section before footer.

```tsx
import { CTASection } from './landing/CTASection';

<CTASection
  onSignUpClick={handleSignUp}
  onDemoClick={handleDemo}
/>
```

**Props:**
- `onSignUpClick: () => void` - Primary CTA handler (required)
- `onDemoClick?: () => void` - Optional demo scheduling handler

**Features:**
- Centered layout with id="cta" for anchor navigation
- Optional demo button
- Trust badges
- Gradient accent line

### Footer
Comprehensive footer with links, social media, and legal information.

```tsx
import { Footer } from './landing/Footer';

<Footer />
```

**Static Component** - no props required

**Features:**
- 4 link columns: Company, Product, Legal, Resources
- Social media icons: LinkedIn, Twitter, Instagram, Email, GitHub
- Dynamic copyright year
- Status badge
- Accessibility-friendly structure

---

## Design System

### Colors
```
Primary Blue: #6B9EFF
Primary Purple: #845EF7
Accent Orange: #FF922B
Success Green: #51CF66
Dark Text: #2B1B17
Secondary Text: #5C554B
Light Background: #F8F7F5
Border: #E8E6E0
Dark BG: #2B1B17 (footer)
```

### Typography
- Font: Inter (with system font fallbacks)
- H1: 48px (mobile: 32px)
- H2: 32px (mobile: 24px)
- Body: 16px / 24px line-height
- Responsive scaling applied

### Spacing
Base unit: 4px
- sm: 8px
- md: 12px
- base: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

### Animations
- fade-in-up: 400ms ease
- scale-in: 300ms ease
- pulse-slow: 3s loop
- Staggered delays on list items

---

## Responsive Design

### Breakpoints
- **Mobile**: 0 - 640px (default styles)
- **Tablet**: 641px - 1024px (md: prefix)
- **Desktop**: 1025px+ (lg: prefix)

### Key Features
- Mobile-first approach
- No horizontal scrolling
- Touch-friendly targets (min 48px)
- Readable text sizes (min 16px)
- Flexible layouts with grid/flex

---

## Accessibility

### WCAG AAA Compliance
- ✓ Color contrast: 7:1 ratio minimum
- ✓ Font sizes: 16px+ mobile, 18px+ desktop
- ✓ Focus indicators: Visible 3px rings
- ✓ Keyboard navigation: Full Tab support
- ✓ Semantic HTML: Proper heading hierarchy
- ✓ ARIA labels: All buttons and icons labeled
- ✓ Skip link: Jump to main content
- ✓ Motion: Respects prefers-reduced-motion

### Testing
Use these tools to verify accessibility:
- axe DevTools browser extension
- Lighthouse in Chrome DevTools
- WebAIM contrast checker
- Screen reader (NVDA, JAWS, VoiceOver)

---

## Integration Examples

### Basic Usage
```tsx
import { LandingPage } from './src/modules/onboarding';

export function App() {
  const isAuthenticated = checkAuth();

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Dashboard />;
}
```

### With React Router
```tsx
import { LandingPage } from './src/modules/onboarding';
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/auth/login',
    element: <LoginPage />
  },
  {
    path: '/auth/signup',
    element: <SignupPage />
  },
  {
    path: '/dashboard',
    element: <Dashboard />
  }
]);
```

### Custom Navigation
```tsx
import { LandingPage } from './src/modules/onboarding';
import { useNavigate } from 'react-router-dom';

export function CustomLanding() {
  const navigate = useNavigate();

  // The LandingPage component uses navigate internally
  // But you can wrap it with custom context if needed

  return <LandingPage />;
}
```

---

## Customization Guide

### Change Colors
Update Tailwind classes in components:
```tsx
// Change primary blue to custom color
className="bg-[#YOUR-COLOR]"
```

### Change Copy
Edit text directly in component JSX:
```tsx
// HeroSection.tsx
<h1>Your custom headline</h1>
<p>Your custom subheading</p>
```

### Add Sections
Create new component and import in LandingPage:
```tsx
// landing/Testimonials.tsx
export function Testimonials() {
  return <section>{/* ... */}</section>;
}

// LandingPage.tsx
import { Testimonials } from './landing/Testimonials';

<main>
  {/* ... existing sections */}
  <Testimonials />
  {/* ... */}
</main>
```

### Modify Layout
Update grid/flex classes in components:
```tsx
// Change from 3 columns to 2 columns
className="grid md:grid-cols-2"  // was md:grid-cols-3
```

---

## Performance Tips

1. **Images**: Keep illustrations CSS-based (gradients)
2. **Animations**: Use CSS animations, not JS
3. **Code splitting**: Each component in separate file
4. **Lazy loading**: Images load when visible
5. **Minification**: Built-in with Tailwind/Vite

---

## Browser Support

Tested on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android 10+)

---

## File Structure

```
src/modules/onboarding/
├── components/
│   ├── LandingPage.tsx (main orchestrator)
│   └── landing/
│       ├── Header.tsx
│       ├── HeroSection.tsx
│       ├── ValueProposition.tsx
│       ├── HowItWorks.tsx
│       ├── TrustIndicators.tsx
│       ├── CTASection.tsx
│       └── Footer.tsx
├── index.ts (exports)
└── README.md (this file)
```

---

## Development

### Adding a New Component
1. Create file in `landing/` directory
2. Export from `index.ts`
3. Import in `LandingPage.tsx`
4. Add to main render

### Testing Components
```tsx
// Test individual component
import { HeroSection } from './landing/HeroSection';

export function TestPage() {
  return (
    <HeroSection
      onSignUpClick={() => console.log('SignUp')}
      onLearnMoreClick={() => console.log('Learn More')}
    />
  );
}
```

### Building
```bash
npm run build
```

---

## Known Limitations

1. Language selector is UI-only (no i18n integration)
2. Demo scheduling redirects to footer (implement modal as needed)
3. Social links point to "#" (update with real URLs)
4. Newsletter signup not implemented (add form as needed)

---

## Future Enhancements

- [ ] i18n integration for language switching
- [ ] Demo scheduling modal
- [ ] Analytics event tracking
- [ ] A/B testing variants
- [ ] Dark mode support
- [ ] Email newsletter signup
- [ ] Live chat integration
- [ ] Video hero section

---

## Support

For detailed documentation, see:
- [LANDING_PAGE_IMPLEMENTATION.md](../../docs/onboarding/LANDING_PAGE_IMPLEMENTATION.md)
- [LANDING_PAGE_SPLASH_SCREEN_SPEC.md](../../docs/onboarding/LANDING_PAGE_SPLASH_SCREEN_SPEC.md)

---

**Version**: 1.0
**Last Updated**: December 11, 2025
**Status**: Production Ready
