# MicrophoneFAB Component

The **MicrophoneFAB** (Floating Action Button) is the primary voice input interaction point for the application. It features the Digital Ceramic System design with a distinctive concave inset effect.

## Features

- **Digital Ceramic Design System**: Follows the tactile ceramic aesthetic with proper shadow hygiene
- **Three Visual States**: Inactive, Active/Recording, and Disabled
- **Smooth Animations**: Powered by Framer Motion for fluid state transitions
- **Accessibility**: Full ARIA support with proper labels and roles
- **Responsive**: Fixed positioning optimized for both mobile and desktop

## Installation

The component is already part of the ceramic components collection:

```typescript
import { MicrophoneFAB } from '@/modules/journey/components/ceramic';
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isRecording` | `boolean` | Yes | - | Whether the microphone is currently recording |
| `onPress` | `() => void` | Yes | - | Callback function when the FAB is pressed |
| `disabled` | `boolean` | No | `false` | Whether the button is disabled |

## Usage

### Basic Example

```typescript
import React, { useState } from 'react';
import { MicrophoneFAB } from '@/modules/journey/components/ceramic';

export const VoiceInputView: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);

  const handlePress = () => {
    setIsRecording(!isRecording);
    // Add your voice recording logic here
  };

  return (
    <div>
      <MicrophoneFAB
        isRecording={isRecording}
        onPress={handlePress}
      />
    </div>
  );
};
```

### With Voice Recording Service

```typescript
import React, { useState } from 'react';
import { MicrophoneFAB } from '@/modules/journey/components/ceramic';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

export const JourneyView: React.FC = () => {
  const {
    isRecording,
    startRecording,
    stopRecording,
    transcript
  } = useVoiceRecording();

  const handlePress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  return (
    <div>
      {transcript && (
        <div className="ceramic-card p-6">
          <p>{transcript}</p>
        </div>
      )}

      <MicrophoneFAB
        isRecording={isRecording}
        onPress={handlePress}
      />
    </div>
  );
};
```

### Disabled State

```typescript
<MicrophoneFAB
  isRecording={false}
  onPress={() => {}}
  disabled={true}
/>
```

## Visual States

### 1. Inactive/Idle State
- **Background**: `#F0EFE9` (Ceramic Cream)
- **Shadow**: `ceramic-concave` class - Deep inset creating a "dish" effect
- **Icon**: Microphone in `#5C554B` (Lead)

### 2. Active/Recording State
- **Background**: `#F0EFE9` (Ceramic Cream)
- **Shadow**: Concave inset + Amber glow `0 0 20px rgba(217, 119, 6, 0.4)`
- **Icon**: Microphone in Amber (`#D97706`)
- **Animation**: Pulsing glow effect (2s infinite loop)

### 3. Hover State (Inactive only)
- **Effect**: Subtle elevation via `ceramic-elevated` class
- **Icon**: Slightly darker shade
- **Transition**: Smooth 0.2s ease

### 4. Disabled State
- **Opacity**: 50%
- **Cursor**: `not-allowed`
- **Interactions**: All animations and hover effects disabled

## Design Specifications

- **Size**: 64x64px (w-16 h-16)
- **Shape**: Perfectly circular (`rounded-full`)
- **Position**: Fixed at `bottom-6 right-6`
- **Z-Index**: 50 (above content, below modals)
- **Icon Size**: 28x28px (w-7 h-7)

## Animations

### Pulse Animation (Recording State)
```typescript
animate={{
  boxShadow: [
    '0 0 20px rgba(217, 119, 6, 0.4)',
    '0 0 30px rgba(217, 119, 6, 0.6)',
    '0 0 20px rgba(217, 119, 6, 0.4)'
  ]
}}
transition={{
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut'
}}
```

### Icon Scale Animation (Recording State)
```typescript
animate={{
  scale: [1, 1.1, 1]
}}
transition={{
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut'
}}
```

### Tap Animation
```typescript
whileTap={{ scale: 0.95 }}
```

## Accessibility

The component includes proper ARIA attributes for screen readers:

- `aria-label`: Descriptive label ("Start recording" / "Stop recording")
- `role="button"`: Explicit button role
- `aria-pressed`: Indicates recording state (true/false)

## CSS Classes Used

### From Digital Ceramic System (index.css)

- `.ceramic-concave`: Inset circular shadow for button
- `.ceramic-elevated`: Raised state on hover
- `.notification-pulse`: Amber pulse animation (available but not used in favor of Framer Motion)

### Tailwind Utilities

- `fixed bottom-6 right-6 z-50`: Positioning
- `w-16 h-16`: Size (64x64px)
- `rounded-full`: Perfect circle
- `flex items-center justify-center`: Icon centering
- `transition-all duration-200`: Smooth transitions

## Color Palette

| Color Name | Hex | Usage |
|------------|-----|-------|
| Ceramic Cream | `#F0EFE9` | Background |
| Lead | `#5C554B` | Icon (inactive) |
| Taupe Shadow | `rgba(163, 158, 145, 0.30)` | Inset shadow |
| White Highlight | `rgba(255, 255, 255, 1.0)` | Inset highlight |
| Amber Primary | `#D97706` | Icon & glow (active) |
| Amber Glow | `rgba(217, 119, 6, 0.4)` | Pulse effect |

## Dependencies

- `react` (^18.x)
- `framer-motion` (^12.x)
- `@heroicons/react` (^2.x)
- `tailwindcss` (^3.x)

## Browser Support

The component uses modern CSS features and should work in:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Performance Notes

- Animations run at 60fps using Framer Motion's optimized renderer
- GPU-accelerated transforms (scale, opacity)
- No layout thrashing or reflows during animations

## Future Enhancements

Potential improvements for future versions:

1. **Haptic Feedback**: Add vibration on tap (mobile devices)
2. **Audio Visualization**: Show waveform during recording
3. **Permission Indicators**: Visual cues for microphone permissions
4. **Customizable Position**: Props for different screen positions
5. **Theme Variants**: Dark mode support

## Related Components

- `LifeWeeksStrip`: Consciousness point visualization
- `CeramicMomentCard`: Moment display cards
- Other components in the `ceramic` collection

## License

Part of the Aica Frontend application.
