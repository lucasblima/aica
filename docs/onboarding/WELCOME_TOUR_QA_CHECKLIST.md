# Welcome Tour - QA & UX Review Checklist

## Functional Requirements

### Navigation & Interaction
- [ ] **First slide displays on load**
  - Component mounts and shows Atlas slide
  - Progress dots highlight first dot
  - Navigation arrows: prev disabled, next enabled

- [ ] **Arrow button navigation**
  - Click Next: moves to Jornada slide
  - Click Previous: moves back to Atlas slide
  - Last slide: Next button disabled
  - First slide: Previous button disabled

- [ ] **Progress dots navigation**
  - Click any dot: jumps to corresponding slide
  - Active dot highlights with pillar color
  - Inactive dots appear gray

- [ ] **Keyboard navigation**
  - Left arrow key: Previous slide
  - Right arrow key: Next slide
  - Tab key: Cycles through buttons
  - Enter/Space: Activates buttons
  - Escape: Closes modal (not tour)

- [ ] **Touch/swipe navigation (mobile)**
  - Swipe right: Previous slide
  - Swipe left: Next slide
  - Minimum 50px distance required
  - Works with vertical scroll without triggering

- [ ] **Skip button**
  - Click Skip: Calls onSkip callback
  - User can skip from any slide
  - No interruption message needed

- [ ] **Explore button (each slide)**
  - Click "Explore [Pillar]": Calls onPillarExplore with pillar data
  - Stops auto-play on click
  - Button state normal (no loading indicator)

- [ ] **Learn More button**
  - Click "Saber Mais": Opens PillarDetails modal
  - Modal displays pillar information
  - Modal can be closed with X button, ESC key, or backdrop

- [ ] **Complete button (last slide only)**
  - Appears only on slide 4 (Financeiro)
  - Click "Começar a Explorar": Calls onComplete callback
  - Button text clear and actionable

### Modal Interaction
- [ ] **Modal opens correctly**
  - Shows pillar name and description
  - Displays benefits in grid/list
  - Shows example use case
  - Provides links to documentation

- [ ] **Modal closes correctly**
  - X button closes modal
  - ESC key closes modal
  - Backdrop click closes modal
  - Body scroll prevented when open

- [ ] **Modal actions**
  - "Começar Agora" button calls onPillarExplore
  - "Voltar" button closes modal
  - Both buttons functional and responsive

### Auto-play Functionality
- [ ] **Auto-play enabled by default**
  - Slides advance every 5 seconds
  - Auto-play only on slides 1-3, not on slide 4
  - Auto-play stops on last slide

- [ ] **Auto-play stops on user interaction**
  - Click arrow button: auto-play stops
  - Click progress dot: auto-play stops
  - Keyboard navigation: auto-play stops
  - Swipe/touch: auto-play stops

- [ ] **Auto-play can be disabled**
  - Pass autoPlayEnabled={false} prop
  - Component works normally without auto-play

## Visual Design & Branding

### Pillar Cards
- [ ] **Atlas card**
  - Blue gradient background (#6B9EFF to #4A7FE8)
  - CheckSquare icon displays at 120px
  - Headline: "Apresentamos o Atlas"
  - Description and benefits visible
  - Color contrast: 7:1 or better

- [ ] **Jornada card**
  - Purple gradient background (#845EF7 to #6D39E0)
  - Heart icon displays at 120px
  - Headline: "Apresentamos a Jornada"
  - All content properly styled

- [ ] **Podcast card**
  - Orange gradient background (#FF922B to #E67700)
  - Microphone icon displays at 120px
  - "Novo" badge appears top-right
  - All content properly styled

- [ ] **Financeiro card**
  - Green gradient background (#51CF66 to #38A169)
  - TrendingUp icon displays at 120px
  - Headline: "Apresentamos o Financeiro"
  - All content properly styled

### Layout & Spacing
- [ ] **Desktop layout (1200px+)**
  - Card centered horizontally
  - Max width of 1000px
  - Proper padding around content
  - Navigation centered below card

- [ ] **Tablet layout (768px)**
  - Card responsive to tablet width
  - Buttons stack if needed
  - Text sizes appropriate
  - Touch targets adequate

- [ ] **Mobile layout (360px+)**
  - Card full width with side margins
  - Text sizes scaled appropriately
  - Buttons stack vertically
  - Touch targets 48x48px minimum

### Typography
- [ ] **Headline**
  - Font size: 32px (mobile), 48px (desktop)
  - Font weight: Bold (700)
  - Color: White
  - Line height: Appropriate for readability

- [ ] **Description**
  - Font size: 18px (mobile), 20px (desktop)
  - Font weight: Regular (400)
  - Color: White (95% opacity)
  - Line height: 1.5-1.6

- [ ] **Benefits list**
  - Font size: 16px
  - Font weight: Medium (500)
  - Color: White
  - Bullet points or checkmarks visible

- [ ] **Body text**
  - Font size: 14-16px
  - Font weight: Regular (400)
  - Color: Text color appropriate for background
  - Readable and clear

### Colors & Contrast
- [ ] **Text contrast (WCAG AAA)**
  - White text on blue: 7:1+ ✓
  - White text on purple: 7:1+ ✓
  - White text on orange: 7:1+ ✓
  - White text on green: 7:1+ ✓
  - All secondary text meets 7:1 ratio

- [ ] **Color blindness safe**
  - Icons work without color alone
  - Text labels always present
  - Patterns/shapes provide distinction

- [ ] **Color accuracy**
  - Atlas: #6B9EFF (blue)
  - Jornada: #845EF7 (purple)
  - Podcast: #FF922B (orange)
  - Financeiro: #51CF66 (green)

### Animations & Transitions
- [ ] **Card entrance animation**
  - Fade in smoothly over 0.6s
  - Slide up slightly (y: 20px to 0)
  - Icon animates at 0.1s delay
  - Content animates at 0.2s delay
  - Smooth easing (easeOut)

- [ ] **Card exit animation**
  - Fade out over 0.3s
  - Slide down (y: -20px)
  - Quick and responsive

- [ ] **Progress dot animation**
  - Active dot expands smoothly
  - Color matches pillar
  - Spring animation (stiffness 300, damping 30)
  - Visual feedback on hover

- [ ] **Button animations**
  - Hover: Scale 1.1x
  - Click: Scale 0.95x
  - Disabled: No animation

- [ ] **Modal animation**
  - Backdrop fades in/out
  - Modal scales and fades (0.3s)
  - Smooth entrance from center
  - Respects prefers-reduced-motion

## Accessibility (WCAG AAA)

### Keyboard Navigation
- [ ] **Tab order logical**
  - Skip button first
  - Previous button
  - Progress dots
  - Next button
  - Pillar card content (buttons)
  - Tab wraps correctly

- [ ] **Focus indicators visible**
  - 3px blue ring around buttons
  - Ring offset 2px
  - Visible on all interactive elements
  - Color contrast 3:1+ on all backgrounds

- [ ] **Escape key handling**
  - Closes modal if open
  - Doesn't close tour
  - No default behavior conflict

- [ ] **Enter/Space key handling**
  - Activates buttons
  - Activates progress dots
  - No accidental scrolling

### Screen Reader Support
- [ ] **Semantic HTML**
  - Region role on carousel container
  - Navigation role on progress dots
  - Tab list role on dots
  - Tab role on individual dots
  - Dialog role on modal

- [ ] **ARIA labels**
  - "Welcome tour of Aica pillars" on region
  - "Tour navigation dots" on nav
  - "Navigate to [pillar] slide" on dots
  - "Go to [pillar] slide" on dots
  - "Previous slide" / "Next slide" on arrows
  - "Explore [pillar]" on buttons
  - "Learn more" on buttons

- [ ] **ARIA attributes**
  - aria-selected on active progress dot
  - aria-live="polite" on slide counter
  - aria-modal="true" on modal
  - aria-labelledby on modal title

- [ ] **Live regions**
  - Slide counter announces changes
  - Modal opening announced
  - Status updates provided

### Visual Accessibility
- [ ] **Color contrast**
  - All text: 7:1 or better
  - Interactive elements: 3:1 or better
  - Focus indicators: 3:1 or better

- [ ] **Target sizing**
  - Buttons: 48x48px minimum
  - Progress dots: 32px minimum touch area
  - Text links: Adequate spacing

- [ ] **Reduced motion**
  - Respects prefers-reduced-motion setting
  - Animations disabled or minimized
  - All content still accessible

### Color Independence
- [ ] **Color alone doesn't convey info**
  - Progress dots have text labels
  - Icons visible without color
  - Status indicated by shape too

### Text Alternatives
- [ ] **Icons have labels**
  - CheckSquare: "Atlas"
  - Heart: "Jornada"
  - Microphone: "Podcast"
  - TrendingUp: "Financeiro"
  - All icons have aria-label or adjacent text

## Responsive Design

### Mobile (360px - 767px)
- [ ] **Layout adapts correctly**
  - Single column layout
  - Full width cards with side margins
  - Buttons stack vertically
  - Navigation arrows spread out

- [ ] **Text sizing**
  - Headlines readable at 32px
  - Body text at 16px
  - No text overflow
  - Line heights appropriate

- [ ] **Touch interactions**
  - Buttons large enough (48x48px)
  - Spacing adequate between buttons
  - Swipe navigation smooth
  - No accidental clicks

- [ ] **Viewport**
  - No horizontal scrollbar
  - All content visible without pinch-zoom
  - Viewport meta tag set correctly

### Tablet (768px - 1199px)
- [ ] **Layout scaling**
  - Card resizes appropriately
  - Maximum width respected
  - Navigation centered
  - All elements visible

- [ ] **Touch targets**
  - Still adequate for touch
  - Proper spacing maintained
  - Easy to tap without error

### Desktop (1200px+)
- [ ] **Full layout**
  - Card centered and sized correctly
  - Max width of 1000px
  - Proper whitespace
  - Navigation well-spaced

- [ ] **Mouse interactions**
  - Hover states work smoothly
  - Cursor changes appropriately
  - Click targets clear

## Browser & Device Compatibility

### Browsers
- [ ] **Chrome/Edge 90+**
  - All features work
  - Animations smooth
  - No console errors

- [ ] **Firefox 88+**
  - All features work
  - Touch events work (if on touch device)
  - No compatibility issues

- [ ] **Safari 14+**
  - Animations work smoothly
  - Touch events work
  - No layout quirks

- [ ] **Mobile browsers**
  - iOS Safari works
  - Chrome mobile works
  - Touch events responsive

### Devices
- [ ] **Mobile phones**
  - iPhone 12+
  - Android flagship
  - Low-end Android
  - Tablet devices

- [ ] **Orientations**
  - Portrait mode
  - Landscape mode
  - Rotation handling

## Performance

### Load Time
- [ ] **Component loads quickly**
  - Initial render < 500ms
  - Interactive within 1s
  - Smooth interactions with 60fps

- [ ] **Bundle size**
  - Component code < 15KB gzipped
  - Animations don't block interaction
  - No unnecessary re-renders

### Animation Performance
- [ ] **Animations smooth at 60fps**
  - Card transitions smooth
  - Progress dots animate smoothly
  - Modal animations fluid
  - No jank on any interaction

- [ ] **GPU acceleration used**
  - Transforms used (not position)
  - Opacity used for fade
  - No layout thrashing

## Error States & Edge Cases

### Edge Cases
- [ ] **Very long pillar names**
  - Text wraps correctly
  - No overflow
  - Layout stable

- [ ] **Very short screen widths (320px)**
  - Content still visible
  - No horizontal scroll
  - Touch targets adequate

- [ ] **No JavaScript**
  - Basic information visible
  - Fallback links work
  - Graceful degradation

- [ ] **Slow network**
  - Component loads eventually
  - No frozen UI
  - Users can still interact

### Error Handling
- [ ] **Callback errors don't break UI**
  - onComplete error handled
  - onSkip error handled
  - onPillarExplore error handled

- [ ] **User can retry actions**
  - If navigation fails, can try again
  - If skip fails, can retry
  - No dead states

## Analytics & Tracking

### Events Fired
- [ ] **Tour started**
  - Event fired on component mount
  - Contains user_id and timestamp

- [ ] **Slide changes**
  - Event fired for each slide view
  - Contains pillar_id and view_duration

- [ ] **Pillar explored**
  - Event fired when explore clicked
  - Contains pillar_id

- [ ] **Learn more opened**
  - Event fired when modal opens
  - Contains pillar_id

- [ ] **Tour completed**
  - Event fired on completion
  - Contains total_duration

- [ ] **Tour skipped**
  - Event fired on skip
  - Contains skip_slide_index

## Documentation

- [ ] **README.md exists**
  - Component usage documented
  - Props documented
  - Examples provided

- [ ] **Code comments present**
  - Complex logic explained
  - Accessibility notes included
  - Animation timing explained

- [ ] **Type definitions complete**
  - All interfaces exported
  - Props typed
  - Callbacks typed

- [ ] **Integration guide exists**
  - How to integrate in onboarding
  - Database schema provided
  - Example implementations

## Deployment Checklist

- [ ] **Production build works**
  - No console errors
  - All features functional
  - Animations smooth

- [ ] **Environment variables set**
  - Analytics enabled
  - URLs correct
  - Timeouts appropriate

- [ ] **Database migrations run**
  - Tables created
  - Columns added
  - Indexes created

- [ ] **Analytics configured**
  - Event tracking enabled
  - Events firing correctly
  - Dashboard updated

- [ ] **Monitoring set up**
  - Error tracking enabled
  - Performance monitoring active
  - User session tracking

## User Testing

### Usability Testing
- [ ] **New user can navigate tour**
  - Completes without help
  - Understands pillar purpose
  - Makes expected next choice

- [ ] **Skip button clear**
  - Users understand they can skip
  - Comfortable skipping if desired
  - No confusion about where they'll go

- [ ] **Learn More modal useful**
  - Provides additional context
  - Not overwhelming
  - Clear next steps

### A11y Testing
- [ ] **Keyboard-only user can complete**
  - Tab through all elements
  - Activate buttons with Enter/Space
  - Navigate slides with arrows

- [ ] **Screen reader user understands content**
  - All text readable
  - Structure understood
  - Purpose of elements clear

- [ ] **Motion-sensitive user can use**
  - Animations reduced or disabled
  - Content still clear
  - No functionality lost

## Final Sign-off

- [ ] All checklist items verified
- [ ] No critical issues remain
- [ ] Component ready for production
- [ ] Documentation complete
- [ ] Team approval obtained

---

**Completed by:** [Name]
**Date:** [Date]
**Version:** 1.0.0
**Status:** Ready for Production
