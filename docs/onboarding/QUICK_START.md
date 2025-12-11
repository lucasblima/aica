# Landing Page - Quick Start Guide

**Get the landing page running in 3 simple steps**

---

## Step 1: Verify Files Are in Place

Check that all components exist:

```bash
# From project root
ls -la src/modules/onboarding/components/landing/

# Should show:
# - Header.tsx
# - HeroSection.tsx
# - ValueProposition.tsx
# - HowItWorks.tsx
# - TrustIndicators.tsx
# - CTASection.tsx
# - Footer.tsx

# Also check main component
ls -la src/modules/onboarding/components/LandingPage.tsx

# And module exports
ls -la src/modules/onboarding/index.ts
```

---

## Step 2: Start Development Server

```bash
# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev

# Navigate to http://localhost:5173
```

You should see:
- Clean white landing page
- Aica logo in header
- Hero section with blue gradient
- Navigation with "Entrar" and "Começar" buttons

---

## Step 3: Test Basic Interactivity

Open browser DevTools (F12) and test:

1. **Mobile Responsiveness**
   - Press Ctrl+Shift+M (DevTools)
   - Shrink to 375px width
   - Verify mobile menu appears

2. **Button Navigation**
   - Click "Começar" button
   - Should error (no /auth/signup route yet)
   - Check console for error

3. **Scroll & Animations**
   - Scroll down page
   - Observe fade-in animations
   - Cards should lift on hover

4. **Keyboard Navigation**
   - Press Tab repeatedly
   - All buttons should show focus ring
   - Verify logical order

---

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution**: Verify all imports use correct paths:
```tsx
// Correct
import { LandingPage } from './src/modules/onboarding';

// Check if path exists
ls src/modules/onboarding/index.ts
```

### Issue: Styles not loading
**Solution**: Ensure Tailwind is configured:
```js
// tailwind.config.js should include
content: ["./**/*.{js,ts,jsx,tsx}"]
```

### Issue: Navigation errors
**Solution**: Auth routes don't exist yet. Create them:
```tsx
// Add to your router or App.tsx
{
  path: '/auth/login',
  element: <LoginPage />
},
{
  path: '/auth/signup',
  element: <SignupPage />
}
```

### Issue: Mobile menu not showing
**Solution**: Check viewport meta tag:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

---

## Integration with Existing Auth

### If you have auth routes already:

Update App.tsx:
```tsx
// At top of file
import { LandingPage } from './src/modules/onboarding';

// In component logic
if (!isAuthenticated) {
  return <LandingPage />;
}
```

### If you don't have auth routes yet:

Create placeholder pages:
```tsx
// src/pages/LoginPage.tsx
export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1>Login Page (Coming Soon)</h1>
    </div>
  );
}

// src/pages/SignupPage.tsx
export function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1>Sign Up Page (Coming Soon)</h1>
    </div>
  );
}
```

Then update router:
```tsx
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import { LandingPage } from './src/modules/onboarding';

const routes = [
  { path: '/', element: <LandingPage /> },
  { path: '/auth/login', element: <LoginPage /> },
  { path: '/auth/signup', element: <SignupPage /> },
];
```

---

## Testing Checklist

Run through these quickly to verify everything works:

### Desktop View
- [ ] Page loads without errors
- [ ] Logo visible and clickable
- [ ] "Entrar" button visible
- [ ] "Começar" button visible (blue, prominent)
- [ ] Can scroll through all sections
- [ ] All buttons have visible hover states
- [ ] Focus ring appears when tabbing

### Mobile View (375px)
- [ ] No horizontal scrolling
- [ ] Hamburger menu appears
- [ ] Menu opens/closes smoothly
- [ ] Buttons stack vertically
- [ ] Text is readable (no tiny text)
- [ ] Touch targets are large (48px+)

### Tablet View (768px)
- [ ] All sections visible
- [ ] Language selector appears
- [ ] Two-column layouts work
- [ ] Cards display properly

### Animations
- [ ] Page elements fade in smoothly
- [ ] Cards lift on hover
- [ ] Buttons change color on hover
- [ ] Animations are smooth (not jerky)

### Accessibility
- [ ] All buttons focusable via Tab
- [ ] Focus ring is visible and blue
- [ ] No keyboard traps
- [ ] Screen reader can navigate (if available)

---

## Customization Quick Tips

### Change Colors
Find-replace in all files:
```
#6B9EFF → your-primary-color
#845EF7 → your-secondary-color
#51CF66 → your-success-color
#FF922B → your-accent-color
```

### Change Text/Copy
Edit each component:
```tsx
// src/modules/onboarding/components/landing/HeroSection.tsx
<h1>Your custom headline</h1>
<p>Your custom subheading</p>
```

### Change Images/Graphics
Replace the gradient illustration in HeroSection:
```tsx
// Instead of gradient divs, add your image
<img src="/your-hero-image.png" alt="Hero" className="w-96 h-96" />
```

### Add Newsletter Signup
Add to CTASection after buttons:
```tsx
<form className="mt-8 flex gap-2">
  <input type="email" placeholder="seu@email.com" className="flex-1 px-4 py-2 border border-[#E8E6E0] rounded" />
  <button className="px-6 py-2 bg-[#6B9EFF] text-white rounded">
    Subscribe
  </button>
</form>
```

---

## File Reference

### Main Files to Know
```
src/modules/onboarding/
├── components/LandingPage.tsx          # Main component - import this
├── components/landing/Header.tsx       # Navigation
├── components/landing/HeroSection.tsx  # Main CTA
├── components/landing/Footer.tsx       # Links & info
└── index.ts                            # Exports

docs/onboarding/
├── LANDING_PAGE_SPLASH_SCREEN_SPEC.md  # Original spec
├── LANDING_PAGE_IMPLEMENTATION.md      # Detailed docs
├── LANDING_PAGE_UX_ANALYSIS.md         # UX review
└── QUICK_START.md                      # This file
```

### Key Dependencies
- React (18.3+)
- React Router Dom (7.10+)
- Lucide React (0.554+) - Icons
- Tailwind CSS (4.1+) - Styling
- Framer Motion (12.23+) - Optional, for advanced animations

All are already in package.json ✓

---

## Performance Check

### Build for Production
```bash
npm run build

# Check output size
# Should be < 200KB for this component
```

### Run Lighthouse Audit
```
1. Build the app (npm run build)
2. Deploy to a server
3. Open Chrome DevTools (F12)
4. Go to Lighthouse tab
5. Click "Generate report"
6. Target metrics:
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 95+
```

---

## Next Steps

### Immediate (This Week)
1. ✓ Verify files created
2. ✓ Run dev server
3. ✓ Test on mobile
4. ✓ Create auth routes

### Short Term (Next Week)
1. [ ] Create real Login/Signup pages
2. [ ] Connect to Supabase auth
3. [ ] Test full auth flow
4. [ ] Deploy to staging

### Medium Term (Next Month)
1. [ ] Add analytics tracking
2. [ ] Implement language switching
3. [ ] A/B test variations
4. [ ] Monitor conversion metrics

### Long Term (Next Quarter)
1. [ ] Add testimonials section
2. [ ] Implement demo scheduling
3. [ ] Add video content
4. [ ] Dark mode support

---

## Support Resources

### Documentation
1. **Full Spec**: `LANDING_PAGE_SPLASH_SCREEN_SPEC.md`
   - Design specifications
   - Copy and content
   - Visual system details

2. **Implementation Guide**: `LANDING_PAGE_IMPLEMENTATION.md`
   - Component documentation
   - Props and usage
   - Customization examples

3. **UX Analysis**: `LANDING_PAGE_UX_ANALYSIS.md`
   - Design decisions
   - Accessibility details
   - Performance optimization

### External Resources
- Tailwind Docs: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- React Router: https://reactrouter.com
- Accessibility: https://www.w3.org/WAI/

---

## Troubleshooting

### Button clicks don't work
Check that auth routes exist:
```tsx
// In your router config, you should have:
{
  path: '/auth/login',
  element: <LoginPage />
}
```

### Styles look broken
1. Ensure Tailwind is running: `npm run dev`
2. Check tailwind.config.js includes all paths
3. Try clearing cache: `npm cache clean --force`

### Animations are jerky
1. Check browser performance (DevTools > Performance)
2. Try disabling other extensions
3. Test in incognito mode (no extensions)

### Mobile menu is stuck open
1. Check viewport meta tag is set
2. Try clearing browser cache
3. Test in different browser

### Console errors
1. Search error message in components
2. Check file paths are correct
3. Verify all imports exist

---

## Quick Commands Reference

```bash
# Start development
npm run dev

# Build for production
npm run build

# Run tests (if set up)
npm test

# Type checking
npx tsc --noEmit

# Format code
npx prettier --write .

# Check accessibility
# Use axe DevTools extension in browser
```

---

## Questions?

1. **Check the docs first**: Read LANDING_PAGE_IMPLEMENTATION.md
2. **Review components**: Look at comments in the .tsx files
3. **Test accessibility**: Use axe DevTools browser extension
4. **Check network tab**: Ensure no 404s or missing resources

---

**Version**: 1.0
**Last Updated**: December 11, 2025
**Status**: Ready to Use
