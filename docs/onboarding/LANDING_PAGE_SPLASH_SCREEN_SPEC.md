# Landing Page / Splash Screen - Design & Copy Specification

**Status**: Versão 1.0 - Professional Beta Design
**Date**: Dezembro 2025
**Target**: Beta users + early adopters
**Design Philosophy**: Value-driven, minimal, accessibility-first

---

## 1. Overview: Landing Page Strategy

### 1.1 Purpose

The Splash Screen serves as:
- **First impression** of Aica for new users
- **Value communicator** (não vende features, mas benefícios)
- **Soft onboarding** (builds trust before asking for commitment)
- **Gate-keeper** (direciona para sign-up vs sign-in)

### 1.2 Key Principles

1. **Value Over Features**: "Help you understand yourself" not "We have AI analysis"
2. **Inclusive Design**: Accessible (WCAG AAA), readable, mobile-first
3. **Trust Building**: Professional, not overpromised, honest about beta status
4. **Minimalist**: No testimonials/social proof (beta version), focus on core value
5. **Action-Oriented**: Clear CTAs, one primary action per screen

### 1.3 Responsive Breakpoints

- **Mobile**: 360px - 640px (primary focus)
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+

---

## 2. Visual Design System

### 2.1 Color Palette

```
Primary Colors:
- Primary Blue: #6B9EFF (Calm, trust, introspection)
- Primary Purple: #845EF7 (Growth, transformation)
- Accent Orange: #FF922B (Energy, warmth, connection)
- Success Green: #51CF66 (Affirmation, health)

Neutral Colors:
- Dark Text: #2B1B17 (Dark brown, warmer than pure black)
- Secondary Text: #5C554B (Warm gray)
- Light Background: #F8F7F5 (Off-white cream)
- Border: #E8E6E0 (Subtle divider)

Semantic:
- Error: #FA5252 (Soft red)
- Warning: #FFA94D (Warm amber)
- Info: #4C6EF5 (Medium blue)
```

### 2.2 Typography

```
Font Stack: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif

Sizes:
- H1 (Hero): 48px / 52px line-height (Mobile: 32px / 40px)
- H2 (Section Title): 32px / 40px line-height (Mobile: 24px / 32px)
- H3 (Subsection): 24px / 32px line-height (Mobile: 20px / 28px)
- Body: 16px / 24px line-height
- Small: 14px / 20px line-height
- Tiny: 12px / 16px line-height

Weight Distribution:
- Headlines: 700 (Bold)
- Section headers: 600 (Semibold)
- Body: 400 (Regular)
- Emphasis: 500 (Medium)
- Links: 500 with underline on hover
```

### 2.3 Spacing & Rhythm

```
Base Unit: 4px (8px, 12px, 16px, 24px, 32px, 48px, 64px)

Vertical Rhythm:
- Element spacing: 24px (6 units)
- Section spacing: 48px (12 units)
- Large section spacing: 64px (16 units)

Container Max Width: 1200px
Container Padding: 24px (mobile), 32px (tablet+)
```

### 2.4 Shadows & Elevation

```
Subtle Shadow (Cards): 0 1px 3px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.12)
Medium Shadow (Hover): 0 4px 12px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.15)
Focus Shadow: 0 0 0 3px rgba(107, 158, 255, 0.4) (Blue focus ring)
```

### 2.5 Animations

```
Transitions:
- Hover states: 200ms ease-in-out
- State changes: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- Page transitions: 250ms fade-in

Animations (keyframes):
- Fade-in: opacity 0 → 1 over 400ms
- Slide-up: translateY(20px) → 0 over 400ms
- Pulse: opacity oscillates 1 → 0.8 → 1 (subtle, 3s loop)

Reduced Motion: Respect prefers-reduced-motion, disable non-essential animations
```

---

## 3. Page Structure & Sections

### 3.1 High-Level Layout

```
┌─────────────────────────────────┐
│        HEADER/NAV               │  (Navigation, language selector)
├─────────────────────────────────┤
│        HERO SECTION             │  (Main CTA, headline, visual)
├─────────────────────────────────┤
│     VALUE PROPOSITION           │  (3 core benefits)
├─────────────────────────────────┤
│       HOW IT WORKS              │  (4-step flow visualization)
├─────────────────────────────────┤
│    TRUST INDICATORS             │  (Beta badge, data privacy, simple stats)
├─────────────────────────────────┤
│      CTA SECTION                │  (Sign up / Login buttons)
├─────────────────────────────────┤
│       FOOTER                    │  (Links, privacy, copyright)
└─────────────────────────────────┘
```

---

## 4. Section-by-Section Specification

### 4.1 HEADER / NAVIGATION

```
Height: 64px (mobile: 56px)
Background: White with subtle border-bottom
Sticky: Yes (stays visible on scroll)

Layout:
  [Logo] [Spacer] [Language Selector] [Auth Buttons]

Logo:
  - Text-based: "Aica" (36px, 700 weight, #2B1B17)
  - Spacing: 16px left padding from edge
  - Link: to landing page

Language Selector:
  - Dropdown: "PT-BR" (current)
  - Options: ["English", "Português (Brasil)", "Español"]
  - Hidden on mobile (<768px)

Auth Buttons (right side):
  - "Entrar" (Login):
    - Style: Ghost button (border only)
    - Border: 1px #E8E6E0
    - Padding: 8px 16px
    - Hover: bg-light-gray

  - "Começar" (Sign Up):
    - Style: Solid button
    - Background: #6B9EFF
    - Text: White, 600 weight
    - Padding: 8px 20px
    - Hover: bg-darker-blue, shadow-medium

Mobile (<640px):
  - Hide language selector
  - Logo size: 28px
  - Buttons: Stack vertically in dropdown menu (hamburger icon)
```

#### 4.1.1 Code Example

```tsx
// Header.tsx
import React from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function Header({ onLoginClick, onSignUpClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E6E0]">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="text-[#2B1B17] text-3xl font-bold">
          Aica
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 ml-auto">
          <select className="text-sm text-[#5C554B] bg-transparent border border-[#E8E6E0] rounded px-3 py-2">
            <option>PT-BR</option>
            <option>English</option>
            <option>Español</option>
          </select>

          <button
            onClick={onLoginClick}
            className="text-sm font-500 text-[#5C554B] px-4 py-2 border border-[#E8E6E0] rounded hover:bg-[#F8F7F5]"
          >
            Entrar
          </button>

          <button
            onClick={onSignUpClick}
            className="text-sm font-600 text-white px-5 py-2 bg-[#6B9EFF] rounded hover:bg-[#5A8FEF] shadow-sm"
          >
            Começar
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E8E6E0] p-4 space-y-3">
          <button
            onClick={onLoginClick}
            className="w-full text-sm font-500 text-[#2B1B17] px-4 py-2 border border-[#E8E6E0] rounded"
          >
            Entrar
          </button>
          <button
            onClick={onSignUpClick}
            className="w-full text-sm font-600 text-white px-4 py-2 bg-[#6B9EFF] rounded"
          >
            Começar
          </button>
        </div>
      )}
    </header>
  );
}
```

---

### 4.2 HERO SECTION

```
Height: 500px (mobile: 600px - allow content to breathe)
Background: Gradient from light cream to light blue
  linear-gradient(135deg, #F8F7F5 0%, #F0F5FF 100%)
Padding: 64px vertical (mobile: 48px), 32px horizontal

Layout: Two columns (mobile: stacked)
  [Content] [Illustration/Visual]

Content Column (Left):
  Max Width: 500px

  Headline:
  - Text: "Conheça a si mesmo. Transforme sua vida."
  - Size: 48px / 52px line-height (mobile: 32px / 40px)
  - Weight: 700
  - Color: #2B1B17
  - Margin-bottom: 24px

  Subheadline:
  - Text: "Aica é seu companheiro pessoal para autoconhecimento e crescimento.
           Registre seus momentos, receba insights personalizados,
           e observe as transformações acontecerem."
  - Size: 18px / 28px line-height (mobile: 16px / 24px)
  - Color: #5C554B
  - Margin-bottom: 32px
  - Font-weight: 400

  CTA Buttons:
  - Primary: "Começar Agora"
    - Background: #6B9EFF
    - Text: White, 600 weight
    - Padding: 14px 32px
    - Size: 16px
    - Hover: bg-[#5A8FEF], shadow-medium
    - Focus: 3px outline #6B9EFF

  - Secondary: "Saber Mais"
    - Background: White
    - Border: 2px #6B9EFF
    - Text: #6B9EFF, 600 weight
    - Padding: 12px 28px (account for border)
    - Hover: bg-[#F8F7F5]
    - Margin-left: 16px (mobile: margin-top 16px, full-width)

Visual Column (Right):
  Display: Flex, center aligned
  Content: Abstract illustration or animated gradient
  Dimensions: 400px × 400px (mobile: 300px × 300px, hidden on very small screens)

  Suggested Visuals:
  - Calming gradient circles
  - Overlapping circular shapes (representing growth/moments)
  - Animated gradient that subtly moves
  - OR: Illustration of person in meditation pose (simple line art)

Mobile Layout:
  - Stack vertically
  - Visual: Top (smaller, 280px × 280px)
  - Content: Bottom
  - CTA buttons: Full width, stacked vertically
```

#### 4.2.1 Code Example

```tsx
// HeroSection.tsx
import React from 'react';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-[#F8F7F5] to-[#F0F5FF] py-16 md:py-24 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-12 items-center">

        {/* Content */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] leading-tight">
            Conheça a si mesmo.<br />
            <span className="bg-gradient-to-r from-[#6B9EFF] to-[#845EF7] bg-clip-text text-transparent">
              Transforme sua vida.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#5C554B] leading-relaxed">
            Aica é seu companheiro pessoal para autoconhecimento e crescimento.
            Registre seus momentos, receba insights personalizados, e observe
            as transformações acontecerem.
          </p>

          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <button className="px-8 py-3 bg-[#6B9EFF] text-white font-600 rounded-lg hover:bg-[#5A8FEF] transition-all shadow-sm hover:shadow-md">
              Começar Agora
              <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </button>

            <button className="px-8 py-3 border-2 border-[#6B9EFF] text-[#6B9EFF] font-600 rounded-lg hover:bg-[#F0F5FF] transition-all">
              Saber Mais
            </button>
          </div>

          <p className="text-sm text-[#948D82] pt-4">
            Versão beta gratuita • Sem cartão de crédito necessário
          </p>
        </div>

        {/* Illustration */}
        <div className="hidden md:flex justify-center">
          <div className="w-96 h-96 bg-gradient-to-br from-[#6B9EFF]/20 via-[#845EF7]/10 to-[#FF922B]/5 rounded-3xl animate-pulse" />
        </div>
      </div>
    </section>
  );
}
```

---

### 4.3 VALUE PROPOSITION SECTION

```
Background: White
Padding: 64px vertical, 32px horizontal
Title: "Por que Aica?"
  - Size: 36px / 44px (mobile: 28px / 36px)
  - Weight: 700
  - Color: #2B1B17
  - Margin-bottom: 48px
  - Text-align: center

Layout: 3-column grid (mobile: 1 column, stacked)
  [Card 1] [Card 2] [Card 3]

Card Structure:
  Background: #F8F7F5 (light cream)
  Border: 1px #E8E6E0 (subtle)
  Padding: 32px
  Border-radius: 16px
  Transition: 200ms
  Hover: shadow-medium, translateY(-4px)

  Content:
  - Icon: 64px × 64px, centered, color varies by benefit
  - Headline: 20px / 28px, 700 weight, #2B1B17, 24px bottom margin
  - Description: 16px / 24px, 400 weight, #5C554B
  - Link: "Saiba mais →" (optional, 14px, underline on hover)

Card 1: Autoconhecimento Profundo
  Icon: Brain icon (#6B9EFF blue)
  Headline: "Autoconhecimento Profundo"
  Description: "Entenda seus padrões emocionais, comportamentos e valores através
               de registro estruturado de momentos. Veja como você realmente é,
               não como imagina ser."

Card 2: Crescimento Personalizado
  Icon: Zap icon (#845EF7 purple)
  Headline: "Crescimento Personalizado"
  Description: "Recomendações customizadas baseadas em seu contexto de vida.
               Se você está focado em saúde, finanças ou relacionamentos,
               Aica aprende e se adapta."

Card 3: Privacidade & Segurança
  Icon: Lock icon (#51CF66 green)
  Headline: "Privacidade & Segurança"
  Description: "Seus dados são seus. Criptografia end-to-end, sem venda de dados,
               sem rastreamento. Você controla completamente o que é compartilhado."
```

#### 4.3.1 Code Example

```tsx
// ValueProposition.tsx
import React from 'react';
import { Brain, Zap, Lock } from 'lucide-react';

const benefits = [
  {
    icon: Brain,
    color: '#6B9EFF',
    title: 'Autoconhecimento Profundo',
    description: 'Entenda seus padrões emocionais, comportamentos e valores através de registro estruturado de momentos. Veja como você realmente é, não como imagina ser.'
  },
  {
    icon: Zap,
    color: '#845EF7',
    title: 'Crescimento Personalizado',
    description: 'Recomendações customizadas baseadas em seu contexto de vida. Se você está focado em saúde, finanças ou relacionamentos, Aica aprende e se adapta.'
  },
  {
    icon: Lock,
    color: '#51CF66',
    title: 'Privacidade & Segurança',
    description: 'Seus dados são seus. Criptografia end-to-end, sem venda de dados, sem rastreamento. Você controla completamente o que é compartilhado.'
  }
];

export function ValueProposition() {
  return (
    <section className="bg-white py-20 md:py-28 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-[#2B1B17] mb-16">
          Por que Aica?
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <Icon
                  size={64}
                  color={benefit.color}
                  className="mx-auto mb-6"
                  strokeWidth={1.5}
                />
                <h3 className="text-xl font-bold text-[#2B1B17] text-center mb-4">
                  {benefit.title}
                </h3>
                <p className="text-[#5C554B] text-center leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

---

### 4.4 HOW IT WORKS SECTION

```
Background: Light gradient (#F8F7F5 to white)
Padding: 64px vertical, 32px horizontal
Title: "Como Funciona"
  - Size: 36px / 44px (mobile: 28px / 36px)
  - Weight: 700
  - Color: #2B1B17
  - Margin-bottom: 48px
  - Text-align: center

Layout: 4 Steps in timeline
  [Step 1] ──→ [Step 2] ──→ [Step 3] ──→ [Step 4]

Step Structure:
  Container:
    - Flex layout
    - Vertical alignment
    - Width: ~23% each (mobile: 100%, stacked with arrows between)

  Number Badge:
    - Circle: 48px × 48px
    - Background: #6B9EFF
    - Text: "1", white, 24px, 700 weight
    - Position: Top center

  Icon:
    - Size: 48px × 48px
    - Color: #6B9EFF
    - Centered below badge

  Title:
    - 18px / 24px, 700 weight, #2B1B17
    - Margin-top: 16px
    - Text-align: center

  Description:
    - 14px / 20px, 400 weight, #5C554B
    - Margin-top: 12px
    - Text-align: center

Arrows (between steps):
  - Display: none on mobile
  - Height: 2px, #E8E6E0
  - Arrow head: #6B9EFF (→)
  - Flex-grow: 1
  - Vertical align: center

Step 1: Registro de Momentos
  Icon: Heart / Zap
  Description: "Registre seus momentos, sentimentos e reflexões.
               Use texto, áudio ou ambos."

Step 2: Análise Inteligente
  Icon: Brain
  Description: "Aica analisa seus padrões e contexto para
               entender o que é importante para você."

Step 3: Recomendações Personalizadas
  Icon: Target
  Description: "Receba módulos e insights personalizados para
               o que você realmente quer trabalhar."

Step 4: Transformação
  Icon: Sparkles
  Description: "Acompanhe seu crescimento com dashboards,
               reflexões e conquistas semanais."
```

#### 4.4.1 Code Example

```tsx
// HowItWorks.tsx
import React from 'react';
import { Heart, Brain, Target, Sparkles } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Heart,
    title: 'Registro de Momentos',
    description: 'Registre seus momentos, sentimentos e reflexões. Use texto, áudio ou ambos.'
  },
  {
    number: 2,
    icon: Brain,
    title: 'Análise Inteligente',
    description: 'Aica analisa seus padrões e contexto para entender o que é importante para você.'
  },
  {
    number: 3,
    icon: Target,
    title: 'Recomendações Personalizadas',
    description: 'Receba módulos e insights personalizados para o que você realmente quer trabalhar.'
  },
  {
    number: 4,
    icon: Sparkles,
    title: 'Transformação',
    description: 'Acompanhe seu crescimento com dashboards, reflexões e conquistas semanais.'
  }
];

export function HowItWorks() {
  return (
    <section className="bg-gradient-to-b from-[#F8F7F5] to-white py-20 md:py-28 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-[#2B1B17] mb-16">
          Como Funciona
        </h2>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#6B9EFF] rounded-full flex items-center justify-center text-white font-bold text-lg mb-4">
                  {step.number}
                </div>
                <Icon size={48} className="text-[#6B9EFF] mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-bold text-[#2B1B17] mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-[#5C554B] leading-relaxed">
                  {step.description}
                </p>

                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute w-8 h-0.5 bg-[#E8E6E0] -right-4 top-16">
                    <span className="text-[#6B9EFF] ml-2">→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

---

### 4.5 TRUST INDICATORS SECTION

```
Background: White
Padding: 48px vertical, 32px horizontal
Layout: 3 columns (mobile: 1 column)

Column 1: Beta Status
  Icon: Sparkles (small, 24px, #FF922B)
  Title: "Versão Beta"
  Text: "Construída com feedback de early adopters.
         Seu input direto molda o futuro de Aica."
  Size: 14px / 20px, #5C554B

Column 2: Privacy & Security
  Icon: Lock (small, 24px, #51CF66)
  Title: "Privacidade em Primeiro Lugar"
  Text: "Seus dados nunca são vendidos. Criptografia de ponta a ponta.
         Você controla completamente sua privacidade."
  Size: 14px / 20px, #5C554B

Column 3: Simple Stats (Optional)
  Text: "1000+ usuários já estão transformando suas vidas com Aica"
  OR
  Text: "4.8/5 ⭐ Satisfação dos usuários em testes beta"
  Size: 14px / 20px, #5C554B
  Style: Centered, slightly larger text

Note: Use simple, honest metrics. No fake testimonials.
```

#### 4.5.1 Code Example

```tsx
// TrustIndicators.tsx
import React from 'react';
import { Sparkles, Lock } from 'lucide-react';

export function TrustIndicators() {
  return (
    <section className="bg-white py-16 px-6 md:px-8 border-t border-[#E8E6E0]">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-3 gap-12">

        <div className="text-center">
          <Sparkles size={32} className="text-[#FF922B] mx-auto mb-4" />
          <h3 className="font-semibold text-[#2B1B17] mb-2">Versão Beta</h3>
          <p className="text-sm text-[#5C554B]">
            Construída com feedback de early adopters. Seu input direto molda o futuro de Aica.
          </p>
        </div>

        <div className="text-center">
          <Lock size={32} className="text-[#51CF66] mx-auto mb-4" />
          <h3 className="font-semibold text-[#2B1B17] mb-2">Privacidade em Primeiro Lugar</h3>
          <p className="text-sm text-[#5C554B]">
            Seus dados nunca são vendidos. Criptografia de ponta a ponta. Você controla completamente sua privacidade.
          </p>
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-[#6B9EFF] mb-2">1000+</p>
          <p className="text-sm text-[#5C554B]">
            Usuários já transformando suas vidas com Aica
          </p>
        </div>
      </div>
    </section>
  );
}
```

---

### 4.6 CTA SECTION (Final Call-to-Action)

```
Background: Gradient from #F8F7F5 to white
Padding: 64px vertical, 32px horizontal
Text-align: Center

Headline:
  - Text: "Pronto para começar sua transformação?"
  - Size: 32px / 40px (mobile: 24px / 32px)
  - Weight: 700
  - Color: #2B1B17
  - Margin-bottom: 24px

Subheadline:
  - Text: "Junte-se a milhares de pessoas descobrindo a si mesmas."
  - Size: 16px / 24px
  - Color: #5C554B
  - Margin-bottom: 32px

Buttons:
  - Primary: "Criar Conta Gratuita"
    - Background: #6B9EFF
    - Padding: 14px 40px
    - Font: 16px, 600 weight, white
    - Hover: bg-[#5A8FEF], shadow-md

  - Secondary: "Agendar Demo"
    - Background: White
    - Border: 2px #6B9EFF
    - Text: #6B9EFF, 600 weight
    - Padding: 12px 36px
    - Margin-left: 16px (mobile: 0, separate line)
    - Hover: bg-[#F8F7F5]

Extra Text (small):
  - "Sem cartão de crédito necessário"
  - Size: 12px / 16px
  - Color: #948D82
  - Margin-top: 16px

Mobile Layout:
  - Buttons stack vertically
  - Full-width on mobile
```

#### 4.6.1 Code Example

```tsx
// FinalCTA.tsx
import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FinalCTAProps {
  onSignUp: () => void;
  onDemo: () => void;
}

export function FinalCTA({ onSignUp, onDemo }: FinalCTAProps) {
  return (
    <section className="bg-gradient-to-b from-[#F8F7F5] to-white py-20 md:py-24 px-6 md:px-8">
      <div className="max-w-[600px] mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#2B1B17] mb-4">
          Pronto para começar sua transformação?
        </h2>

        <p className="text-lg text-[#5C554B] mb-8">
          Junte-se a milhares de pessoas descobrindo a si mesmas.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center mb-4">
          <button
            onClick={onSignUp}
            className="px-10 py-3 bg-[#6B9EFF] text-white font-600 rounded-lg hover:bg-[#5A8FEF] transition-all shadow-sm hover:shadow-md flex items-center justify-center"
          >
            Criar Conta Gratuita
            <ArrowRight size={18} className="ml-2" />
          </button>

          <button
            onClick={onDemo}
            className="px-10 py-3 border-2 border-[#6B9EFF] text-[#6B9EFF] font-600 rounded-lg hover:bg-[#F0F5FF] transition-all"
          >
            Agendar Demo
          </button>
        </div>

        <p className="text-xs text-[#948D82]">
          Sem cartão de crédito necessário
        </p>
      </div>
    </section>
  );
}
```

---

### 4.7 FOOTER

```
Background: #2B1B17 (dark)
Text: White
Padding: 48px vertical, 32px horizontal

Layout: 4 columns (mobile: 2x2 grid)

Column 1: About
  Title: "Aica"
  Links:
    - Sobre Nós
    - Blog
    - Carreiras

Column 2: Product
  Title: "Produto"
  Links:
    - Features
    - Pricing
    - Roadmap

Column 3: Company
  Title: "Empresa"
  Links:
    - Contato
    - Imprensa
    - Partners

Column 4: Legal
  Title: "Legal"
  Links:
    - Privacidade
    - Termos de Serviço
    - Cookie Policy

Bottom Bar:
  - Left: Copyright "© 2025 Aica. Todos os direitos reservados."
  - Center: Social media icons (LinkedIn, Twitter, Instagram)
  - Right: Language selector

Style:
  - Link color: White
  - Hover: #6B9EFF
  - Font size: 14px / 20px
  - Line height: 2.5x for list spacing
```

#### 4.7.1 Code Example

```tsx
// Footer.tsx
import React from 'react';
import { Linkedin, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#2B1B17] text-white py-16 px-6 md:px-8">
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-4 gap-12 mb-12">

        {/* Column 1 */}
        <div>
          <h3 className="font-semibold mb-4">Aica</h3>
          <ul className="space-y-2">
            {['Sobre Nós', 'Blog', 'Carreiras'].map(item => (
              <li key={item}>
                <a href="#" className="text-sm hover:text-[#6B9EFF] transition">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2 */}
        <div>
          <h3 className="font-semibold mb-4">Produto</h3>
          <ul className="space-y-2">
            {['Features', 'Pricing', 'Roadmap'].map(item => (
              <li key={item}>
                <a href="#" className="text-sm hover:text-[#6B9EFF] transition">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 */}
        <div>
          <h3 className="font-semibold mb-4">Empresa</h3>
          <ul className="space-y-2">
            {['Contato', 'Imprensa', 'Partners'].map(item => (
              <li key={item}>
                <a href="#" className="text-sm hover:text-[#6B9EFF] transition">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 */}
        <div>
          <h3 className="font-semibold mb-4">Legal</h3>
          <ul className="space-y-2">
            {['Privacidade', 'Termos de Serviço', 'Cookie Policy'].map(item => (
              <li key={item}>
                <a href="#" className="text-sm hover:text-[#6B9EFF] transition">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-[#948D82] mb-4 md:mb-0">
          © 2025 Aica. Todos os direitos reservados.
        </p>

        <div className="flex gap-6">
          <a href="#" className="hover:text-[#6B9EFF] transition">
            <Linkedin size={20} />
          </a>
          <a href="#" className="hover:text-[#6B9EFF] transition">
            <Twitter size={20} />
          </a>
          <a href="#" className="hover:text-[#6B9EFF] transition">
            <Instagram size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
}
```

---

## 5. Accessibility Checklist (WCAG AAA)

- [ ] Color contrast: All text meets 7:1 ratio (AAA standard)
- [ ] Font sizes: Minimum 16px on mobile, 18px on desktop
- [ ] Focus rings: Visible 3px outline on all interactive elements
- [ ] Keyboard navigation: All interactive elements reachable via Tab
- [ ] Screen reader: Proper semantic HTML (h1-h6, button, nav, main)
- [ ] Image alt text: All images have descriptive alt text
- [ ] Motion: Respect prefers-reduced-motion media query
- [ ] Links: Link text should be descriptive (not "click here")
- [ ] Language: `lang="pt-BR"` on root element
- [ ] Mobile: Touch targets minimum 48px × 48px

---

## 6. Performance Metrics

- Lighthouse Performance: 90+
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 4s

---

## 7. Copy Tone & Voice

### 7.1 Tone Principles

- **Conversational**: Not corporate-speak
- **Empathetic**: Acknowledges user struggles
- **Honest**: Transparent about beta, limitations, and capabilities
- **Hopeful**: Optimistic about potential for growth
- **Clear**: Jargon-free, simple sentences

### 7.2 Copy Examples

**Good**: "Registre seus momentos e observe padrões emergir"
**Avoid**: "Leverage AI-powered sentiment analysis for actionable insights"

**Good**: "Privacidade em primeiro lugar. Seus dados nunca são vendidos."
**Avoid**: "Enterprise-grade encryption with zero-knowledge architecture"

**Good**: "Beta gratuito - nós queremos seu feedback"
**Avoid**: "Limited-time promotional offer for early adopters"

---

## 8. Responsive Design Breakpoints

```css
/* Mobile First */
/* < 640px: Mobile (base) */
/* 640px - 1024px: Tablet */
/* > 1024px: Desktop */

@media (min-width: 640px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (max-width: 639px) { /* Mobile only */ }
```

---

## 9. Testing Checklist

- [ ] Load time on 3G network
- [ ] Mobile usability (no horizontal scroll, legible text)
- [ ] Desktop responsiveness (max-width 1200px, not stretched)
- [ ] Dark mode appearance (if applicable)
- [ ] CTA click tracking (analytics)
- [ ] Sign-up form validation
- [ ] Link destinations (no broken links)
- [ ] Video performance (if embedded)
- [ ] Cross-browser compatibility (Chrome, Safari, Firefox, Edge)

---

**Documento criado**: 11/12/2025
**Próximo passo**: STEP2_MULTIPLE_CHOICE_REDESIGN.md
