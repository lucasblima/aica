# Landing Page Interactive Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the AICA public landing page to showcase the real product through interactive demos, emphasize the Telegram bot, and create dual conversion (Telegram + invite code).

**Architecture:** Pure visual landing components with hardcoded demo data — no auth, no Supabase queries (except existing invite validation). All demo components are separate from internal app components but use the same Ceramic Design System tokens. Framer Motion for all animations.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (Ceramic tokens), Framer Motion, Lucide icons

**Design Doc:** `docs/plans/2026-03-01-landing-page-interactive-demo-design.md`

---

## Task 1: Foundation — Demo Data & Chat Scripts

**Files:**
- Create: `src/modules/onboarding/components/landing/data/demoData.ts`
- Create: `src/modules/onboarding/components/landing/data/chatScripts.ts`

**Step 1: Create demo data file**

All hardcoded data for the landing page demos. No imports from internal services.

```typescript
// src/modules/onboarding/components/landing/data/demoData.ts

// === HERO DASHBOARD ===
export const heroDashboard = {
  tasksToday: 3,
  balance: 2400,
  streakDays: 47,
  cpPoints: 1240,
  momentsCount: 156,
  nextEvent: { title: 'Reunião de alinhamento', time: '14:00', type: 'meeting' as const },
  insight: 'Seu padrão de foco é mais forte pela manhã — 73% das tarefas concluídas antes das 12h.',
};

// === MODULE DEMOS ===
export const atlasDemo = {
  tasks: [
    { id: '1', title: 'Entregar proposta FAPERJ', quadrant: 'urgent-important' as const },
    { id: '2', title: 'Responder e-mail do orientador', quadrant: 'urgent-important' as const },
    { id: '3', title: 'Planejar sprints do mês', quadrant: 'not-urgent-important' as const },
    { id: '4', title: 'Revisar artigo do colega', quadrant: 'not-urgent-important' as const },
    { id: '5', title: 'Atualizar LinkedIn', quadrant: 'not-urgent-not-important' as const },
  ],
};

export const journeyDemo = {
  // 28 days of heatmap data (4 weeks)
  heatmap: Array.from({ length: 28 }, (_, i) => ({
    date: `2026-02-${String(i + 1).padStart(2, '0')}`,
    intensity: [0, 1, 2, 3, 2, 1, 0, 3, 2, 1, 3, 2, 0, 1, 2, 3, 3, 2, 1, 0, 2, 3, 1, 2, 3, 2, 1, 3][i],
    emotion: ['😌', '😊', '🤔', '😄', '😊', '😐', '😴', '😄', '😊', '😐', '😄', '😊', '😴', '😐', '😊', '😄', '😄', '😊', '😐', '😴', '😊', '😄', '😐', '😊', '😄', '😊', '😐', '😄'][i],
  })),
  emotions: [
    { emoji: '😄', label: 'Alegria', count: 8 },
    { emoji: '😊', label: 'Gratidão', count: 7 },
    { emoji: '🤔', label: 'Reflexão', count: 4 },
    { emoji: '😐', label: 'Neutro', count: 5 },
    { emoji: '😴', label: 'Cansaço', count: 3 },
  ],
};

export const studioDemo = {
  phases: [
    { id: 'research', label: 'Pesquisa', status: 'done' as const, detail: '12 fontes coletadas, dossier do convidado pronto' },
    { id: 'script', label: 'Pauta', status: 'done' as const, detail: 'Roteiro com 8 blocos, 45min estimados' },
    { id: 'record', label: 'Gravação', status: 'active' as const, detail: 'Agendada para 15/03 às 10h' },
    { id: 'edit', label: 'Edição', status: 'pending' as const, detail: 'Aguardando gravação' },
    { id: 'publish', label: 'Publicação', status: 'pending' as const, detail: 'Spotify + YouTube' },
  ],
  episodeTitle: 'IA na Educação: O Futuro é Agora?',
  guestName: 'Dra. Marina Silva',
};

export const grantsDemo = {
  edital: {
    title: 'FAPERJ — Jovem Cientista 2026',
    deadline: '2026-04-15',
    matchScore: 87,
    matchBreakdown: [
      { criteria: 'Área de pesquisa', score: 95 },
      { criteria: 'Nível acadêmico', score: 90 },
      { criteria: 'Publicações', score: 78 },
      { criteria: 'Orçamento compatível', score: 85 },
    ],
    value: 'R$ 120.000',
    duration: '24 meses',
  },
};

export const financeDemo = {
  months: [
    { month: 'Jan', income: 8500, expense: 6200 },
    { month: 'Fev', income: 8500, expense: 7100 },
    { month: 'Mar', income: 9200, expense: 5800 },
  ],
  balance: 2400,
  burnRate: 12,
};

export const connectionsDemo = {
  contacts: [
    { id: '1', name: 'Ana Clara', role: 'Orientadora', space: 'Academia', x: 30, y: 40 },
    { id: '2', name: 'Pedro', role: 'Co-founder', space: 'Ventures', x: 70, y: 30 },
    { id: '3', name: 'Mariana', role: 'Designer', space: 'Ventures', x: 60, y: 65 },
    { id: '4', name: 'Carlos', role: 'Mentor', space: 'Habitat', x: 25, y: 70 },
    { id: '5', name: 'Juliana', role: 'Amiga', space: 'Tribo', x: 80, y: 60 },
    { id: '6', name: 'Rafael', role: 'Colega', space: 'Academia', x: 45, y: 20 },
  ],
  links: [
    ['1', '6'], ['2', '3'], ['2', '4'], ['3', '5'], ['4', '1'], ['5', '3'],
  ] as [string, string][],
};

export const fluxDemo = {
  weekDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  blocks: [
    { day: 0, modality: 'Força', color: 'amber' as const, exercises: ['Supino', 'Remada', 'Desenvolvimento'] },
    { day: 1, modality: 'Cardio', color: 'blue' as const, exercises: ['Corrida 5km', 'Alongamento'] },
    { day: 2, modality: 'Força', color: 'amber' as const, exercises: ['Agachamento', 'Leg Press', 'Panturrilha'] },
    { day: 3, modality: 'Descanso', color: 'gray' as const, exercises: ['Mobilidade', 'Yoga'] },
    { day: 4, modality: 'HIIT', color: 'red' as const, exercises: ['Tabata 20min', 'Core'] },
    { day: 5, modality: 'Força', color: 'amber' as const, exercises: ['Bíceps', 'Tríceps', 'Ombro'] },
    { day: 6, modality: 'Descanso', color: 'gray' as const, exercises: ['Caminhada leve'] },
  ],
};

export const agendaDemo = {
  events: [
    { day: 3, title: 'Reunião de alinhamento', color: 'amber' as const, time: '14:00' },
    { day: 5, title: 'Defesa de projeto', color: 'red' as const, time: '09:00' },
    { day: 8, title: 'Consulta médica', color: 'blue' as const, time: '11:00' },
    { day: 12, title: 'Workshop IA', color: 'green' as const, time: '15:00' },
    { day: 15, title: 'Gravação podcast', color: 'purple' as const, time: '10:00' },
    { day: 18, title: 'Entrega FAPERJ', color: 'red' as const, time: '23:59' },
    { day: 22, title: 'Mentoria', color: 'amber' as const, time: '16:00' },
    { day: 25, title: 'Aniversário Ana', color: 'green' as const, time: 'Dia todo' },
  ],
};

// === TELEGRAM PREVIEW ===
export const telegramCommands = [
  { command: '/resumo', response: '📊 Seu dia:\n• 3 tarefas pendentes\n• Reunião às 14h\n• Saldo: R$ 2.4k\n• Streak: 47 dias 🔥' },
  { command: '/tarefa', response: '✅ Tarefa criada: "Revisar proposta FAPERJ"\nPrioridade: Alta | Prazo: Amanhã' },
  { command: '/gasto', response: '💰 Gasto registrado: R$ 45,00\nCategoria: Alimentação\nSaldo atualizado: R$ 2.355' },
  { command: '/humor', response: '🧭 Momento registrado: Gratidão\n"Hoje foi produtivo"\nStreak: 47 → 48 dias! 🎉' },
];
```

**Step 2: Create chat scripts file**

```typescript
// src/modules/onboarding/components/landing/data/chatScripts.ts

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  context?: {
    icon: string;
    label: string;
    modules: string[];
    details: { label: string; value: string }[];
  };
  delay: number; // ms before this message appears
}

export interface ChatScript {
  id: string;
  label: string;
  messages: ChatMessage[];
}

export const chatScripts: ChatScript[] = [
  {
    id: 'finance',
    label: 'Meus gastos',
    messages: [
      {
        role: 'user',
        text: 'Quanto gastei essa semana?',
        delay: 0,
      },
      {
        role: 'ai',
        text: 'R$ 847 essa semana — 23% acima do seu padrão. O maior aumento foi em alimentação fora (+40%). Quer que eu crie uma meta de economia?',
        context: {
          icon: '📊',
          label: 'Finance',
          modules: ['Finance'],
          details: [
            { label: 'Saldo atual', value: 'R$ 2.400' },
            { label: 'Burn rate', value: '12 dias' },
            { label: 'Maior gasto', value: 'Alimentação' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'productivity',
    label: 'Minha produtividade',
    messages: [
      {
        role: 'user',
        text: 'Como está minha produtividade?',
        delay: 0,
      },
      {
        role: 'ai',
        text: '7 tarefas concluídas hoje, streak de 47 dias ativo. Mas notei que você parou de registrar momentos há 2 dias — tudo bem?',
        context: {
          icon: '🧠',
          label: 'Journey + Atlas',
          modules: ['Journey', 'Atlas'],
          details: [
            { label: 'CP Total', value: '1.240 pts' },
            { label: 'Streak', value: '47 dias' },
            { label: 'Tarefas hoje', value: '7/9' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'schedule',
    label: 'Próximos eventos',
    messages: [
      {
        role: 'user',
        text: 'O que tenho agendado para esta semana?',
        delay: 0,
      },
      {
        role: 'ai',
        text: 'Você tem 4 compromissos: Reunião de alinhamento (ter 14h), Defesa de projeto (qui 9h), Workshop IA (sex 15h) e Mentoria (sáb 16h). Quinta está puxada — quer que eu sugira um bloco de preparação?',
        context: {
          icon: '📅',
          label: 'Agenda',
          modules: ['Agenda'],
          details: [
            { label: 'Esta semana', value: '4 eventos' },
            { label: 'Próximo', value: 'Ter 14:00' },
            { label: 'Dia mais cheio', value: 'Quinta' },
          ],
        },
        delay: 1500,
      },
    ],
  },
  {
    id: 'emotional',
    label: 'Meus padrões',
    messages: [
      {
        role: 'user',
        text: 'Quais são meus padrões emocionais?',
        delay: 0,
      },
      {
        role: 'ai',
        text: 'Nos últimos 28 dias: alegria predomina (30%), seguida de gratidão (26%). Seus melhores dias são terças e quintas. Cansaço aparece mais nos domingos à noite. Quer criar um ritual de domingo para mudar isso?',
        context: {
          icon: '🧭',
          label: 'Journey',
          modules: ['Journey'],
          details: [
            { label: 'Emoção dominante', value: 'Alegria (30%)' },
            { label: 'Momentos', value: '156 registrados' },
            { label: 'Padrão', value: 'Melhor terça/quinta' },
          ],
        },
        delay: 1500,
      },
    ],
  },
];
```

**Step 3: Verify files compile**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to the new data files

**Step 4: Commit**

```bash
git add src/modules/onboarding/components/landing/data/
git commit -m "feat(landing): add demo data and chat scripts for interactive landing"
```

---

## Task 2: Hero Section — Mini Dashboard Demo

**Files:**
- Create: `src/modules/onboarding/components/landing/components/HeroDashboardDemo.tsx`
- Modify: `src/modules/onboarding/components/landing/components/HeroSection.tsx`

**Step 1: Create HeroDashboardDemo component**

Pure visual component — animated mini-dashboard with counter effects and Ceramic styling.

```tsx
// src/modules/onboarding/components/landing/components/HeroDashboardDemo.tsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CheckCircle, Flame, TrendingUp, Calendar, Lightbulb } from 'lucide-react';
import { heroDashboard } from '../data/demoData';

function AnimatedCounter({ target, prefix = '', suffix = '', duration = 2000 }: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <motion.span
      onViewportEnter={() => setStarted(true)}
      viewport={{ once: true }}
    >
      {prefix}{count.toLocaleString('pt-BR')}{suffix}
    </motion.span>
  );
}

export function HeroDashboardDemo() {
  const d = heroDashboard;

  const statCards = [
    { icon: CheckCircle, label: 'Tarefas hoje', value: d.tasksToday, color: 'text-ceramic-success' },
    { icon: TrendingUp, label: 'Saldo', value: d.balance, prefix: 'R$ ', suffix: '', color: 'text-ceramic-info' },
    { icon: Flame, label: 'Streak', value: d.streakDays, suffix: ' dias', color: 'text-amber-500' },
  ];

  return (
    <motion.div
      className="w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="bg-ceramic-base rounded-[2rem] shadow-ceramic-emboss p-6 md:p-8 border border-ceramic-border/50">
        {/* Amber top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mb-6" />

        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-ceramic-cool/50 rounded-xl p-3 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <div className="text-xl font-bold text-ceramic-text-primary">
                <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="text-xs text-ceramic-text-secondary">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          <motion.div
            className="flex items-center gap-3 bg-ceramic-cool/30 rounded-xl px-4 py-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <Calendar className="w-4 h-4 text-ceramic-info shrink-0" />
            <div>
              <span className="text-sm font-medium text-ceramic-text-primary">Próximo: </span>
              <span className="text-sm text-ceramic-text-secondary">
                {d.nextEvent.title} às {d.nextEvent.time}
              </span>
            </div>
          </motion.div>

          <motion.div
            className="flex items-start gap-3 bg-amber-50/50 rounded-xl px-4 py-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-ceramic-text-secondary italic">
              {d.insight}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 2: Rewrite HeroSection to use the dashboard demo**

Replace the current HeroSection (chaos shards + OS card) with the new hero featuring the dashboard demo. Keep the strong headline and scroll indicator.

The new HeroSection should be a single full-viewport section:
- Background: `bg-ceramic-base`
- Headline at top: "Você não precisa de mais um app. Você precisa de um sistema que te entenda."
- Sub-headline: "Seu sistema operacional de vida — tátil, unificado, inteligente."
- `<HeroDashboardDemo />` centered
- Two CTAs: "Experimentar no Telegram" (amber, links to `t.me/AicaLifeBot`) and "Entrar" (secondary)
- Scroll indicator at bottom

Remove: FleeingShard, chaos shards, OS card second section, counter-rotate CSS.
Keep: motion entrance patterns, viewport-triggered animations.

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Visual check**

Run: `npm run dev`
Navigate to `/landing` and verify:
- Headline renders with correct typography
- Dashboard cards appear with stagger animation
- Numbers count up
- Info cards slide in
- CTAs are visible and clickable

**Step 5: Commit**

```bash
git add src/modules/onboarding/components/landing/components/HeroDashboardDemo.tsx
git add src/modules/onboarding/components/landing/components/HeroSection.tsx
git commit -m "feat(landing): replace chaos shards hero with interactive dashboard demo"
```

---

## Task 3: Chat Showcase Section

**Files:**
- Create: `src/modules/onboarding/components/landing/components/ChatDemoMessage.tsx`
- Create: `src/modules/onboarding/components/landing/components/ChatDemoContext.tsx`
- Create: `src/modules/onboarding/components/landing/components/ChatDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/ChatShowcase.tsx`

**Step 1: Create ChatDemoMessage**

Individual message bubble — user messages in ceramic-cool, AI messages in amber tint.

```tsx
// src/modules/onboarding/components/landing/components/ChatDemoMessage.tsx
import { motion } from 'framer-motion';

interface Props {
  role: 'user' | 'ai';
  text: string;
  isTyping?: boolean;
}

export function ChatDemoMessage({ role, text, isTyping }: Props) {
  const isUser = role === 'user';

  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-ceramic-cool rounded-br-md text-ceramic-text-primary'
            : 'bg-amber-50 border border-amber-200/50 rounded-bl-md text-ceramic-text-primary'
        }`}
      >
        {isTyping ? (
          <div className="flex gap-1.5 py-1 px-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{text}</p>
        )}
      </div>
    </motion.div>
  );
}
```

**Step 2: Create ChatDemoContext**

Expandable context card that shows which modules the AI is referencing.

```tsx
// src/modules/onboarding/components/landing/components/ChatDemoContext.tsx
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  icon: string;
  label: string;
  modules: string[];
  details: { label: string; value: string }[];
}

export function ChatDemoContext({ icon, label, modules, details }: Props) {
  return (
    <motion.div
      className="ml-4 mt-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="bg-white/60 border border-ceramic-border/40 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-semibold text-ceramic-text-secondary uppercase tracking-wide">
            {label}
          </span>
          <div className="flex gap-1 ml-auto">
            {modules.map(m => (
              <span key={m} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {details.map(d => (
            <div key={d.label}>
              <div className="text-[10px] text-ceramic-text-secondary">{d.label}</div>
              <div className="text-xs font-medium text-ceramic-text-primary">{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 3: Create ChatDemo orchestrator**

Manages the simulated conversation flow — typing indicators, message sequencing, script switching.

```tsx
// src/modules/onboarding/components/landing/components/ChatDemo.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatDemoMessage } from './ChatDemoMessage';
import { ChatDemoContext } from './ChatDemoContext';
import type { ChatScript, ChatMessage } from '../data/chatScripts';

interface Props {
  script: ChatScript;
  onComplete?: () => void;
}

export function ChatDemo({ script, onComplete }: Props) {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState<string | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  const playScript = useCallback(() => {
    // Clear previous
    setVisibleMessages([]);
    setIsTyping(false);
    setShowContext(null);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    let cumulativeDelay = 500; // initial pause

    script.messages.forEach((msg, i) => {
      // Show typing indicator before AI messages
      if (msg.role === 'ai') {
        const typingTimeout = window.setTimeout(() => {
          setIsTyping(true);
        }, cumulativeDelay);
        timeoutsRef.current.push(typingTimeout);
        cumulativeDelay += 1200; // typing duration
      }

      // Show the message
      const msgTimeout = window.setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages(prev => [...prev, msg]);

        // Show context card after AI message
        if (msg.context) {
          const ctxTimeout = window.setTimeout(() => {
            setShowContext(msg.text);
          }, 400);
          timeoutsRef.current.push(ctxTimeout);
        }
      }, cumulativeDelay);
      timeoutsRef.current.push(msgTimeout);

      cumulativeDelay += msg.role === 'user' ? 800 : 500;
    });

    // Signal completion
    if (onComplete) {
      const doneTimeout = window.setTimeout(onComplete, cumulativeDelay + 500);
      timeoutsRef.current.push(doneTimeout);
    }
  }, [script, onComplete]);

  useEffect(() => {
    playScript();
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, [playScript]);

  return (
    <div className="space-y-3 min-h-[200px]">
      <AnimatePresence mode="popLayout">
        {visibleMessages.map((msg, i) => (
          <div key={`${script.id}-${i}`}>
            <ChatDemoMessage role={msg.role} text={msg.text} />
            {msg.context && showContext === msg.text && (
              <ChatDemoContext {...msg.context} />
            )}
          </div>
        ))}
      </AnimatePresence>
      {isTyping && (
        <ChatDemoMessage role="ai" text="" isTyping />
      )}
    </div>
  );
}
```

**Step 4: Create ChatShowcase section wrapper**

Full section with headline, chat demo, suggestion pills, and Telegram CTA.

```tsx
// src/modules/onboarding/components/landing/components/ChatShowcase.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { ChatDemo } from './ChatDemo';
import { chatScripts } from '../data/chatScripts';

export function ChatShowcase() {
  const [activeScript, setActiveScript] = useState(chatScripts[0]);
  const [key, setKey] = useState(0); // force remount on script change

  const handleScriptChange = (script: typeof chatScripts[0]) => {
    setActiveScript(script);
    setKey(prev => prev + 1);
  };

  return (
    <section className="py-20 md:py-28 bg-ceramic-base">
      <div className="max-w-3xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/50 rounded-full px-4 py-1.5 mb-4">
            <MessageCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Conheça a Vida</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary tracking-tighter mb-4">
            Mais que um chatbot.
          </h2>
          <p className="text-lg text-ceramic-text-secondary max-w-xl mx-auto">
            Uma inteligência que conecta finanças, tarefas, hábitos e emoções para te dar respostas completas.
          </p>
        </motion.div>

        {/* Chat container */}
        <motion.div
          className="bg-white/40 border border-ceramic-border/30 rounded-[2rem] p-6 md:p-8 shadow-ceramic-emboss mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <ChatDemo key={key} script={activeScript} />
        </motion.div>

        {/* Suggestion pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {chatScripts.map(script => (
            <button
              key={script.id}
              onClick={() => handleScriptChange(script)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeScript.id === script.id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool-hover'
              }`}
            >
              {script.label}
            </button>
          ))}
        </div>

        {/* Telegram CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <a
            href="https://t.me/AicaLifeBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-3 rounded-xl shadow-[4px_4px_10px_rgba(180,83,9,0.25)] transition-colors"
          >
            Conversar no Telegram
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
```

**Step 5: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/modules/onboarding/components/landing/components/ChatDemo*.tsx
git add src/modules/onboarding/components/landing/components/ChatShowcase.tsx
git commit -m "feat(landing): add chat showcase section with simulated AI conversations"
```

---

## Task 4: Module Explorer — Tab System

**Files:**
- Create: `src/modules/onboarding/components/landing/components/ModuleTab.tsx`
- Create: `src/modules/onboarding/components/landing/components/ModuleExplorer.tsx`

**Step 1: Create ModuleTab**

Individual tab button with active state indicator.

```tsx
// src/modules/onboarding/components/landing/components/ModuleTab.tsx
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  name: string;
  isActive: boolean;
  onClick: () => void;
}

export function ModuleTab({ icon: Icon, name, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all ${
        isActive
          ? 'bg-amber-50 border-l-4 border-amber-500 text-ceramic-text-primary font-medium'
          : 'text-ceramic-text-secondary hover:bg-ceramic-cool/50 border-l-4 border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-500' : ''}`} />
      <span className="text-sm">{name}</span>
    </button>
  );
}
```

**Step 2: Create ModuleExplorer**

Tab selector + demo panel orchestrator with auto-cycling.

```tsx
// src/modules/onboarding/components/landing/components/ModuleExplorer.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  LayoutGrid, BookOpen, Mic, FileText,
  DollarSign, Users, Activity, Calendar,
} from 'lucide-react';
import { ModuleTab } from './ModuleTab';

// Lazy-load demos for code splitting
const AtlasDemo = lazy(() => import('./demo/AtlasDemo').then(m => ({ default: m.AtlasDemo })));
const JourneyDemo = lazy(() => import('./demo/JourneyDemo').then(m => ({ default: m.JourneyDemo })));
const StudioDemo = lazy(() => import('./demo/StudioDemo').then(m => ({ default: m.StudioDemo })));
const GrantsDemo = lazy(() => import('./demo/GrantsDemo').then(m => ({ default: m.GrantsDemo })));
const FinanceDemo = lazy(() => import('./demo/FinanceDemo').then(m => ({ default: m.FinanceDemo })));
const ConnectionsDemo = lazy(() => import('./demo/ConnectionsDemo').then(m => ({ default: m.ConnectionsDemo })));
const FluxDemo = lazy(() => import('./demo/FluxDemo').then(m => ({ default: m.FluxDemo })));
const AgendaDemo = lazy(() => import('./demo/AgendaDemo').then(m => ({ default: m.AgendaDemo })));

const MODULES = [
  { id: 'atlas', name: 'Atlas', subtitle: 'Priorize o que importa', icon: LayoutGrid, Demo: AtlasDemo },
  { id: 'journey', name: 'Journey', subtitle: 'Consciência diária', icon: BookOpen, Demo: JourneyDemo },
  { id: 'studio', name: 'Studio', subtitle: 'Podcast copilot', icon: Mic, Demo: StudioDemo },
  { id: 'grants', name: 'Grants', subtitle: 'Captação inteligente', icon: FileText, Demo: GrantsDemo },
  { id: 'finance', name: 'Finance', subtitle: 'Visão financeira', icon: DollarSign, Demo: FinanceDemo },
  { id: 'connections', name: 'Connections', subtitle: 'Rede de contatos', icon: Users, Demo: ConnectionsDemo },
  { id: 'flux', name: 'Flux', subtitle: 'Treinos personalizados', icon: Activity, Demo: FluxDemo },
  { id: 'agenda', name: 'Agenda', subtitle: 'Google Calendar sync', icon: Calendar, Demo: AgendaDemo },
];

const AUTO_CYCLE_MS = 5000;

export function ModuleExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const timerRef = useRef<number | null>(null);

  const startCycle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setActiveIndex(prev => (prev + 1) % MODULES.length);
    }, AUTO_CYCLE_MS);
  }, []);

  useEffect(() => {
    if (!userInteracted) startCycle();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [userInteracted, startCycle]);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
    setUserInteracted(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const active = MODULES[activeIndex];

  return (
    <section className="py-20 md:py-28 bg-[#E8E6DF]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary tracking-tighter mb-3">
            8 dimensões da sua vida. Um sistema.
          </h2>
          <p className="text-lg text-ceramic-text-secondary">
            Cada módulo é um bloco tátil que se conecta aos outros.
          </p>
        </motion.div>

        {/* Explorer layout */}
        <motion.div
          className="flex flex-col md:flex-row gap-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {/* Tab list — vertical on desktop, horizontal scroll on mobile */}
          <div className="md:w-56 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
              {MODULES.map((mod, i) => (
                <div key={mod.id} className="shrink-0">
                  <ModuleTab
                    icon={mod.icon}
                    name={mod.name}
                    isActive={i === activeIndex}
                    onClick={() => handleTabClick(i)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Demo panel */}
          <div className="flex-1 min-h-[400px]">
            <div className="bg-ceramic-base rounded-[2rem] shadow-ceramic-emboss p-6 md:p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <active.icon className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-bold text-ceramic-text-primary">{active.name}</h3>
                  <p className="text-sm text-ceramic-text-secondary">{active.subtitle}</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }>
                    <active.Demo />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </section>
  );
}
```

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: May fail because demo components don't exist yet — that's expected, we create them in Task 5.

**Step 4: Commit**

```bash
git add src/modules/onboarding/components/landing/components/ModuleTab.tsx
git add src/modules/onboarding/components/landing/components/ModuleExplorer.tsx
git commit -m "feat(landing): add module explorer with tab system and auto-cycling"
```

---

## Task 5: Module Micro-Demos — Batch 1 (Atlas, Journey, Finance, Agenda)

**Files:**
- Create: `src/modules/onboarding/components/landing/components/demo/AtlasDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/demo/JourneyDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/demo/FinanceDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/demo/AgendaDemo.tsx`

**Step 1: Create AtlasDemo** — Eisenhower Matrix with draggable tasks

Interactive 2x2 matrix. Tasks can be dragged between quadrants using Framer Motion `drag`. Use `atlasDemo` data from demoData.

Key implementation notes:
- 2x2 grid with labels: "Urgente + Importante", "Urgente - Importante", "Não Urgente + Importante", "Não Urgente - Importante"
- Each task is a small pill with drag enabled
- On drag end, detect which quadrant the task landed in and update state
- Ceramic styling: quadrant backgrounds with subtle color coding

**Step 2: Create JourneyDemo** — Heatmap + emotion summary

GitHub-style contribution heatmap (28 days = 4 rows x 7 cols). Each cell colored by intensity (0-3 → transparent to amber-500). Hover shows emoji + date tooltip. Below: emotion summary circles. Use `journeyDemo` data.

**Step 3: Create FinanceDemo** — Bar chart

Simple bar chart (3 months) with income (green) and expense (red) bars side-by-side. No chart library — pure divs with dynamic height. Hover shows exact value. Use `financeDemo` data.

**Step 4: Create AgendaDemo** — Mini calendar

Monthly grid calendar (7 cols for weekdays, ~5 rows). Events shown as colored dots on their days. Click a day with events to show event list below calendar. Use `agendaDemo` data.

**Step 5: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: May still fail if Task 6 demos are missing, but no errors from these 4 files.

**Step 6: Commit**

```bash
git add src/modules/onboarding/components/landing/components/demo/
git commit -m "feat(landing): add Atlas, Journey, Finance, Agenda module demos"
```

---

## Task 6: Module Micro-Demos — Batch 2 (Studio, Grants, Connections, Flux)

**Files:**
- Create: `src/modules/onboarding/components/landing/components/demo/StudioDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/demo/GrantsDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/demo/ConnectionsDemo.tsx`
- Create: `src/modules/onboarding/components/landing/components/demo/FluxDemo.tsx`

**Step 1: Create StudioDemo** — Episode production timeline

Horizontal timeline with 5 phases (research → script → record → edit → publish). Each phase is a circle connected by a line. Done phases: green. Active: amber pulse. Pending: gray. Click a phase to show detail text below. Use `studioDemo` data.

**Step 2: Create GrantsDemo** — Edital card with match score

Single card showing edital title, deadline countdown (calculate from `grantsDemo.edital.deadline`), match score as a circular progress indicator (87%), and a breakdown table on hover. Use `grantsDemo` data.

**Step 3: Create ConnectionsDemo** — Network map

SVG-based network graph. Contacts positioned at their x/y coordinates (as percentages). Lines drawn between linked contacts. Each contact is a circle with initial letter. Hover shows name + role tooltip. Color-coded by space (Academia=blue, Ventures=amber, Habitat=green, Tribo=purple). Use `connectionsDemo` data.

**Step 4: Create FluxDemo** — Weekly training canvas

7-day horizontal row of blocks. Each block shows the day, modality name, and color. Click a block to expand and show exercises list below. Active block has a ring animation. Use `fluxDemo` data.

**Step 5: Verify full build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds (all 8 demos exist now)

**Step 6: Commit**

```bash
git add src/modules/onboarding/components/landing/components/demo/
git commit -m "feat(landing): add Studio, Grants, Connections, Flux module demos"
```

---

## Task 7: Conversion Section — Telegram + Invite Dual CTA

**Files:**
- Create: `src/modules/onboarding/components/landing/components/TelegramPreview.tsx`
- Create: `src/modules/onboarding/components/landing/components/TrustBadges.tsx`
- Modify: `src/modules/onboarding/components/landing/components/ConversionSection.tsx`

**Step 1: Create TelegramPreview**

Mockup of a Telegram conversation with the bot. Shows commands and responses in a phone-like frame.

```tsx
// src/modules/onboarding/components/landing/components/TelegramPreview.tsx
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { telegramCommands } from '../data/demoData';

export function TelegramPreview() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= telegramCommands.length) return;
    const timer = setTimeout(() => setVisibleCount(prev => prev + 1), 1500);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="bg-[#0E1621] rounded-2xl p-4 shadow-lg max-w-sm mx-auto">
      {/* Telegram header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
          A
        </div>
        <div>
          <div className="text-white text-sm font-medium">@AicaLifeBot</div>
          <div className="text-green-400 text-xs">online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 min-h-[200px]">
        {telegramCommands.slice(0, visibleCount).map((cmd, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* User command */}
            <div className="flex justify-end mb-1.5">
              <div className="bg-[#2B5278] text-white text-xs px-3 py-2 rounded-xl rounded-br-sm max-w-[80%]">
                {cmd.command}
              </div>
            </div>
            {/* Bot response */}
            <div className="flex justify-start">
              <div className="bg-[#182533] text-white/90 text-xs px-3 py-2 rounded-xl rounded-bl-sm max-w-[85%] whitespace-pre-line">
                {cmd.response}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input bar */}
      <div className="mt-4 flex items-center gap-2 bg-[#182533] rounded-full px-4 py-2">
        <span className="text-white/40 text-xs flex-1">Mensagem...</span>
        <Send className="w-4 h-4 text-[#4EA4F6]" />
      </div>
    </div>
  );
}
```

**Step 2: Create TrustBadges**

```tsx
// src/modules/onboarding/components/landing/components/TrustBadges.tsx
import { Shield, Lock, EyeOff } from 'lucide-react';

const badges = [
  { icon: Shield, label: 'LGPD Compliant' },
  { icon: Lock, label: 'Dados criptografados' },
  { icon: EyeOff, label: 'Sem acesso a senhas' },
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-6 mt-8">
      {badges.map(b => (
        <div key={b.label} className="flex items-center gap-2 text-ceramic-text-secondary">
          <b.icon className="w-4 h-4" />
          <span className="text-sm">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Refactor ConversionSection**

Rewrite `ConversionSection.tsx` as a two-column layout:
- Left: `TelegramPreview` + "Abrir no Telegram" CTA
- Right: Invite code input (preserve existing logic) + waitlist (preserve odometer)
- Bottom: `TrustBadges`

Keep existing props interface for invite code and waitlist functionality. The Telegram column is new; the invite column is a refactored version of the existing code.

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/modules/onboarding/components/landing/components/TelegramPreview.tsx
git add src/modules/onboarding/components/landing/components/TrustBadges.tsx
git add src/modules/onboarding/components/landing/components/ConversionSection.tsx
git commit -m "feat(landing): add Telegram preview and refactor conversion section with dual CTA"
```

---

## Task 8: Footer Refactor

**Files:**
- Modify: `src/modules/onboarding/components/landing/components/FooterSection.tsx`

**Step 1: Update FooterSection**

Simplify to minimal footer:
- Single row: "AICA Life OS — Feito com cerâmica digital" | Privacy link | Terms link | Contact
- Copyright below
- Remove the 4-column grid layout (overkill for current content)
- Keep `bg-ceramic-cool` background

**Step 2: Commit**

```bash
git add src/modules/onboarding/components/landing/components/FooterSection.tsx
git commit -m "refactor(landing): simplify footer to minimal layout"
```

---

## Task 9: Wire Everything Together — LandingPage

**Files:**
- Modify: `src/modules/onboarding/components/landing/LandingPage.tsx`

**Step 1: Update LandingPage**

Replace the current section composition with the new sections. Update header with section anchor links.

New structure:
```tsx
<div>
  <header> (updated with section anchors + Telegram CTA)
  <main>
    <HeroSection />         {/* Task 2 — already refactored */}
    <ChatShowcase />         {/* Task 3 — new */}
    <ModuleExplorer />       {/* Task 4 — new */}
    <ConversionSection />    {/* Task 7 — refactored */}
  </main>
  <FooterSection />          {/* Task 8 — refactored */}
  <AuthSheet />              {/* preserved */}
</div>
```

Header updates:
- Add "Módulos" anchor (scrolls to modules section)
- Replace "Lista de Espera" with "Experimentar" (links to `t.me/AicaLifeBot`)
- Keep "Entrar" button (opens AuthSheet)
- Add smooth scroll behavior to `<html>`

Remove:
- `InteractiveModulesSection` import (replaced by `ModuleExplorer`)
- Security badges inline section (moved into TrustBadges within ConversionSection)

Preserve:
- All invite code state + handlers
- Waitlist hook
- AuthSheet open/close logic
- SEO meta tags effect
- URL `?code=` param parsing

**Step 2: Verify full build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds with no errors

**Step 3: Visual verification**

Run: `npm run dev`
Navigate to `/landing` and verify all 5 sections render correctly:
1. Hero with dashboard demo
2. Chat showcase with animated conversation
3. Module explorer with tab cycling
4. Conversion with Telegram + invite
5. Footer

Check:
- Smooth scroll between sections via header links
- All animations trigger on scroll
- Suggestion pills switch chat scripts
- Module tabs work (click and auto-cycle)
- Invite code validation still works
- "Entrar" opens AuthSheet
- Responsive: check mobile viewport (375px)

**Step 4: Commit**

```bash
git add src/modules/onboarding/components/landing/LandingPage.tsx
git commit -m "feat(landing): wire all new sections into landing page"
```

---

## Task 10: Responsive Polish & Cleanup

**Files:**
- Modify: Various landing components for responsive tweaks
- Delete or keep dormant: `ChaosPanel.tsx`, `OrderPanel.tsx`, `ProcessingPipeline.tsx`, `FounderStorySection.tsx`, `TestimonialSection.tsx`, `WaitlistSection.tsx`, `ModulesOverviewSection.tsx`

**Step 1: Responsive testing**

Check all sections at these breakpoints:
- 375px (iPhone SE)
- 768px (iPad)
- 1024px (laptop)
- 1440px (desktop)

Fix any layout issues: overflow, truncation, touch targets too small, etc.

**Step 2: Cleanup dormant components**

The following files are NOT used anywhere in the active landing page and were never mounted. Evaluate whether to keep or remove:
- `ChaosPanel.tsx` — unused
- `OrderPanel.tsx` — unused
- `ProcessingPipeline.tsx` — unused
- `FounderStorySection.tsx` — unused
- `TestimonialSection.tsx` — unused
- `WaitlistSection.tsx` — unused (ConversionSection handles waitlist)
- `ModulesOverviewSection.tsx` — unused (replaced by ModuleExplorer)

If they have no imports/references elsewhere in the codebase, remove them. Also evaluate `services/demoProcessingService.ts` and `types/index.ts` — if unused, remove.

**Step 3: Performance check**

Run: `npm run build 2>&1 | grep -i 'size\|chunk\|bundle'`
Check that the landing page bundle is reasonable. The 8 demo components are lazy-loaded, so they shouldn't bloat the initial load.

**Step 4: Typecheck**

Run: `npm run typecheck 2>&1 | tail -20`
Expected: No errors

**Step 5: Lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: No errors or only pre-existing warnings

**Step 6: Commit**

```bash
git add -A
git commit -m "chore(landing): responsive polish, cleanup dormant components"
```

---

## Task 11: Final Verification & PR

**Step 1: Full build verification**

```bash
npm run build && npm run typecheck && npm run lint
```
All three must pass.

**Step 2: Visual walkthrough**

Run `npm run dev` and do a complete walkthrough of `/landing`:
1. Page loads fast with no layout shift
2. Hero dashboard animates on scroll
3. Chat messages appear with typing indicator
4. Suggestion pills switch conversations
5. Module explorer auto-cycles and responds to clicks
6. All 8 module demos render correctly
7. Telegram preview shows commands/responses
8. Invite code input works
9. Header navigation smooth-scrolls
10. Mobile layout is correct
11. "Entrar" opens auth sheet
12. "Experimentar" links to Telegram

**Step 3: Create PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(landing): interactive demo redesign" --body "$(cat <<'EOF'
## Summary
- Complete redesign of public landing page with interactive product demos
- New hero section with animated mini-dashboard
- Chat showcase with simulated AI conversations showing cross-module intelligence
- 8 interactive module micro-demos (Atlas matrix, Journey heatmap, etc.)
- Dual conversion: Telegram bot preview + invite code
- Removed abstract metaphors, replaced with real product demonstrations

## Design Doc
`docs/plans/2026-03-01-landing-page-interactive-demo-design.md`

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Visual verification at 375px, 768px, 1024px, 1440px
- [ ] Chat demo scripts switch correctly
- [ ] Module explorer auto-cycles and responds to clicks
- [ ] Invite code validation works
- [ ] Telegram CTA links correctly
- [ ] All animations trigger on scroll

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 4: Wait for PR feedback, address comments**
