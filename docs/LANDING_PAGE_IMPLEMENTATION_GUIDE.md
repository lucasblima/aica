# Landing Page "Ordem ao Caos" - Guia de Implementação
**Documento Complementar à Especificação Técnica**
**Versão:** 1.0

---

## 1. QUICK START

### 1.1 Como Começar
```bash
# Criar branch de feature
git checkout -b feature/landing-ordem-ao-caos

# Estrutura de diretórios
mkdir -p src/modules/onboarding/components/landing-v5/{components,services,types,hooks}

# Criar arquivos base
touch src/modules/onboarding/components/landing-v5/LandingPageV5.tsx
touch src/modules/onboarding/components/landing-v5/components/ChaosPanel.tsx
touch src/modules/onboarding/components/landing-v5/components/OrderPanel.tsx
touch src/modules/onboarding/components/landing-v5/services/demoProcessingService.ts
```

### 1.2 Checklist de Implementação
```markdown
## Fase 1: MVP Estático
- [ ] Criar estrutura de componentes
- [ ] Layout lado-a-lado desktop
- [ ] Layout stack mobile
- [ ] Ceramic design aplicado
- [ ] Dados mock carregados

## Fase 2: Animações Básicas
- [ ] Float effect no caos
- [ ] Transição caos → ordem
- [ ] Stagger animation nos módulos
- [ ] Performance check (60fps)

## Fase 3: Processamento Mock
- [ ] Pipeline de processamento
- [ ] Estados de loading
- [ ] Classificação de mensagens
- [ ] Popular módulos

## Fase 4: Interatividade
- [ ] Botão "Processar"
- [ ] Hover states
- [ ] Click handlers
- [ ] CTA integration

## Fase 5: Polish
- [ ] Acessibilidade (a11y)
- [ ] Performance optimization
- [ ] Mobile testing
- [ ] Browser compatibility

## Fase 6: Analytics
- [ ] GA4 events
- [ ] Hotjar setup
- [ ] A/B testing config
```

---

## 2. EXEMPLOS DE CÓDIGO

### 2.1 LandingPageV5.tsx (Estrutura Principal)
```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChaosPanel } from './components/ChaosPanel';
import { OrderPanel } from './components/OrderPanel';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { demoProcessingService } from './services/demoProcessingService';
import type { DemoMessage, ProcessedModules } from './types';

/**
 * LandingPageV5 - "Ordem ao Caos"
 *
 * Layout lado-a-lado que demonstra o valor core da Aica:
 * transformar caos de informações em ordem estruturada através de IA.
 */
export function LandingPageV5() {
  const [messages] = useState<DemoMessage[]>(() =>
    demoProcessingService.generateDemoMessages()
  );
  const [processedModules, setProcessedModules] = useState<ProcessedModules | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');

  const handleProcessChaos = async () => {
    setIsProcessing(true);

    try {
      // Simula pipeline de processamento com delays realistas
      await demoProcessingService.processMessages(
        messages,
        (stage) => setProcessingStage(stage),
        (modules) => setProcessedModules(modules)
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Hero Section */}
      <section className="py-20 px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-black text-ceramic-text-primary mb-4"
        >
          Ordem ao Caos
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-ceramic-text-secondary max-w-3xl mx-auto mb-12"
        >
          Veja sua informação desorganizada se transformar em ação estruturada.
          Sem criar conta. Sem instalar nada. Apenas experimente.
        </motion.p>

        <motion.button
          onClick={handleProcessChaos}
          disabled={isProcessing}
          className="px-12 py-6 rounded-full bg-ceramic-base text-ceramic-text-primary font-bold text-lg ceramic-shadow hover:scale-105 transition-transform disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isProcessing ? 'Processando...' : 'Processar Meu Caos'}
        </motion.button>
      </section>

      {/* Processing Pipeline (when active) */}
      {isProcessing && (
        <ProcessingPipeline
          stage={processingStage}
          messageCount={messages.length}
        />
      )}

      {/* Main Demo Area: Caos ← → Ordem */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Caos */}
          <ChaosPanel
            messages={messages}
            isProcessing={isProcessing}
          />

          {/* Right: Ordem */}
          <OrderPanel
            modules={processedModules}
            isProcessing={isProcessing}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-4xl font-black text-ceramic-text-primary mb-6">
          Pronto para trazer ordem à sua vida?
        </h2>
        <button className="px-12 py-6 rounded-full bg-ceramic-accent text-white font-bold text-lg hover:scale-105 transition-transform">
          Começar Agora Grátis
        </button>
      </section>
    </div>
  );
}
```

### 2.2 ChaosPanel.tsx (Visualização do Caos)
```typescript
import React from 'react';
import { motion } from 'framer-motion';
import type { DemoMessage } from '../types';

interface ChaosPanelProps {
  messages: DemoMessage[];
  isProcessing: boolean;
}

export function ChaosPanel({ messages, isProcessing }: ChaosPanelProps) {
  return (
    <div className="relative min-h-[600px] p-8 rounded-3xl overflow-hidden"
         style={{
           background: 'linear-gradient(135deg, #F0EFE9 0%, #E5E3DA 100%)'
         }}>
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-3xl font-black text-ceramic-text-primary mb-2">
          🌪️ Caos
        </h3>
        <p className="text-ceramic-text-secondary">
          Mensagens desorganizadas, informação dispersa
        </p>
      </div>

      {/* Floating Messages */}
      <div className="relative h-[500px]">
        {messages.map((message, index) => (
          <FloatingMessageCard
            key={message.id}
            message={message}
            index={index}
            isProcessing={isProcessing}
          />
        ))}
      </div>

      {/* Chaos Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          {/* Noise texture ou pattern */}
          <svg width="100%" height="100%">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" opacity="0.3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function FloatingMessageCard({
  message,
  index,
  isProcessing
}: {
  message: DemoMessage;
  index: number;
  isProcessing: boolean;
}) {
  // Posição aleatória mas determinística (baseada no index)
  const randomX = (index * 137.5) % 100; // Golden ratio distribution
  const randomY = (index * 47) % 80;
  const randomRotate = (index * 13) % 20 - 10;

  return (
    <motion.div
      initial={{
        x: `${randomX}%`,
        y: `${randomY}%`,
        rotate: randomRotate,
        opacity: 0
      }}
      animate={{
        x: `${randomX}%`,
        y: isProcessing ? '-100%' : `${randomY}%`, // Voa para fora quando processando
        rotate: isProcessing ? 0 : [randomRotate, randomRotate + 5, randomRotate],
        opacity: isProcessing ? 0 : [0.6, 0.8, 0.6],
      }}
      transition={{
        duration: isProcessing ? 0.8 : 3,
        delay: isProcessing ? index * 0.05 : index * 0.1,
        repeat: isProcessing ? 0 : Infinity,
        repeatType: "reverse"
      }}
      className="absolute max-w-[200px] p-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg"
    >
      <p className="text-sm text-gray-700 line-clamp-2">
        {message.text}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-500">
          {message.sender === 'user' ? '📤' : '📥'}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
}
```

### 2.3 OrderPanel.tsx (Visualização da Ordem)
```typescript
import React from 'react';
import { motion } from 'framer-motion';
import { AtlasCard } from './ModuleCards/AtlasCard';
import { JourneyCard } from './ModuleCards/JourneyCard';
import { StudioCard } from './ModuleCards/StudioCard';
import { ConnectionsCard } from './ModuleCards/ConnectionsCard';
import type { ProcessedModules } from '../types';

interface OrderPanelProps {
  modules: ProcessedModules | null;
  isProcessing: boolean;
}

export function OrderPanel({ modules, isProcessing }: OrderPanelProps) {
  const isEmpty = !modules;

  return (
    <div className="relative min-h-[600px] p-8 ceramic-tray rounded-3xl">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-3xl font-black text-ceramic-text-primary mb-2">
          ✨ Ordem
        </h3>
        <p className="text-ceramic-text-secondary">
          Informação estruturada, pronta para ação
        </p>
      </div>

      {/* Empty State */}
      {isEmpty && !isProcessing && (
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl text-ceramic-text-secondary">
              Aguardando processamento...
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isProcessing && (
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[200px] ceramic-card rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Modules Grid */}
      {modules && !isProcessing && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          <ModuleCardWrapper index={0}>
            <AtlasCard tasks={modules.atlas} />
          </ModuleCardWrapper>

          <ModuleCardWrapper index={1}>
            <JourneyCard moments={modules.journey} />
          </ModuleCardWrapper>

          <ModuleCardWrapper index={2}>
            <StudioCard episodes={modules.studio} />
          </ModuleCardWrapper>

          <ModuleCardWrapper index={3}>
            <ConnectionsCard connections={modules.connections} />
          </ModuleCardWrapper>
        </motion.div>
      )}
    </div>
  );
}

function ModuleCardWrapper({
  children,
  index
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={{
        hidden: { scale: 0.8, opacity: 0, y: 20 },
        visible: {
          scale: 1,
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
          }
        }
      }}
      whileHover={{
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      className="cursor-pointer"
    >
      {children}
    </motion.div>
  );
}
```

### 2.4 ProcessingPipeline.tsx (Pipeline Visual)
```typescript
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProcessingPipelineProps {
  stage: string;
  messageCount: number;
}

const PIPELINE_STAGES = [
  { id: 'analyzing', label: 'Analisando mensagens', icon: '🔍', duration: 1000 },
  { id: 'embedding', label: 'Gerando embeddings', icon: '🧠', duration: 1500 },
  { id: 'classifying', label: 'Classificando intenções', icon: '🎯', duration: 1200 },
  { id: 'organizing', label: 'Organizando módulos', icon: '📊', duration: 800 }
];

export function ProcessingPipeline({ stage, messageCount }: ProcessingPipelineProps) {
  const [progress, setProgress] = useState(0);
  const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.id === stage);

  useEffect(() => {
    // Simula progresso suave
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 100));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto mb-12 p-8 ceramic-card rounded-3xl"
    >
      {/* Pipeline Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black text-ceramic-text-primary">
          Processando {messageCount} mensagens
        </h3>
        <div className="text-4xl">⚡</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="ceramic-groove rounded-full h-4 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-right text-sm text-ceramic-text-secondary mt-2">
          {progress}% concluído
        </p>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((pipelineStage, index) => {
          const isActive = index === currentStageIndex;
          const isComplete = index < currentStageIndex;

          return (
            <motion.div
              key={pipelineStage.id}
              initial={{ opacity: 0.3, scale: 0.9 }}
              animate={{
                opacity: isActive ? 1 : isComplete ? 0.6 : 0.3,
                scale: isActive ? 1.1 : 1
              }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3
                ${isActive ? 'ceramic-card animate-pulse' : 'ceramic-inset'}
              `}>
                {pipelineStage.icon}
              </div>

              {/* Label */}
              <p className={`
                text-sm font-semibold
                ${isActive ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'}
              `}>
                {pipelineStage.label}
              </p>

              {/* Check mark for completed */}
              {isComplete && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-2 text-green-600 text-xl"
                >
                  ✓
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
```

### 2.5 demoProcessingService.ts (Mock Processing)
```typescript
import type { DemoMessage, ProcessedModules } from '../types';

/**
 * demoProcessingService
 *
 * Simula o processamento de mensagens WhatsApp através de IA.
 * Em produção, isso seria substituído por chamadas reais a Edge Functions.
 */

export const demoProcessingService = {
  /**
   * Gera mensagens de demonstração realistas
   */
  generateDemoMessages(): DemoMessage[] {
    const templates = [
      // Atlas (Tarefas)
      { text: "Reunião amanhã 14h com João sobre projeto", chaos_level: 85, category: 'atlas' },
      { text: "Comprar presente de aniversário para mãe", chaos_level: 90, category: 'atlas' },
      { text: "Ligar dentista para remarcar consulta", chaos_level: 95, category: 'atlas' },
      { text: "Revisar contrato até sexta-feira", chaos_level: 80, category: 'atlas' },

      // Journey (Momentos)
      { text: "Tive uma ideia incrível durante a caminhada hoje", chaos_level: 75, category: 'journey' },
      { text: "Me senti frustrado na reunião de equipe", chaos_level: 70, category: 'journey' },
      { text: "Primeira vez meditando, experiência transformadora", chaos_level: 65, category: 'journey' },

      // Studio (Podcasts)
      { text: "Ideia de podcast: IA e ética no século XXI", chaos_level: 88, category: 'studio' },
      { text: "Convidar Maria Silva para entrevista sobre sustentabilidade", chaos_level: 82, category: 'studio' },
      { text: "Tópico interessante: futuro do trabalho remoto", chaos_level: 86, category: 'studio' },

      // Connections (Relacionamentos)
      { text: "Pedro não responde há 2 semanas", chaos_level: 92, category: 'connections' },
      { text: "Ana me mandou artigo sobre neurociência", chaos_level: 60, category: 'connections' },
      { text: "Grupo da família planejando reunião", chaos_level: 78, category: 'connections' },
    ];

    return templates.map((template, index) => ({
      id: `msg-${index}`,
      text: template.text,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
      sender: Math.random() > 0.5 ? 'user' : 'contact',
      chaos_level: template.chaos_level,
      category: template.category as any
    }));
  },

  /**
   * Processa mensagens e classifica em módulos
   * Simula delays realistas de processamento de IA
   */
  async processMessages(
    messages: DemoMessage[],
    onStageChange: (stage: string) => void,
    onComplete: (modules: ProcessedModules) => void
  ): Promise<void> {
    // Stage 1: Analyzing
    onStageChange('analyzing');
    await delay(1000);

    // Stage 2: Embedding
    onStageChange('embedding');
    await delay(1500);

    // Stage 3: Classifying
    onStageChange('classifying');
    const classified = this.classifyMessages(messages);
    await delay(1200);

    // Stage 4: Organizing
    onStageChange('organizing');
    await delay(800);

    // Complete
    onComplete(classified);
  },

  /**
   * Classifica mensagens em módulos baseado em keywords
   * Em produção, isso seria feito por Gemini com embeddings
   */
  classifyMessages(messages: DemoMessage[]): ProcessedModules {
    const atlas = messages
      .filter(m => ['reunião', 'comprar', 'ligar', 'revisar'].some(kw => m.text.toLowerCase().includes(kw)))
      .map(m => ({
        id: `task-${m.id}`,
        title: this.extractTaskTitle(m.text),
        scheduled_time: this.extractDateTime(m.text),
        priority: this.inferPriority(m.text),
        source: 'whatsapp_demo',
        auto_created: true
      }));

    const journey = messages
      .filter(m => ['ideia', 'senti', 'experiência', 'meditando'].some(kw => m.text.toLowerCase().includes(kw)))
      .map(m => ({
        id: `moment-${m.id}`,
        content: m.text,
        sentiment: this.analyzeSentiment(m.text),
        tags: this.extractTags(m.text),
        consciousness_points: Math.floor(Math.random() * 50) + 20
      }));

    const studio = messages
      .filter(m => ['podcast', 'convidar', 'tópico', 'entrevista'].some(kw => m.text.toLowerCase().includes(kw)))
      .map(m => ({
        id: `episode-${m.id}`,
        title: this.extractPodcastTitle(m.text),
        status: 'idea' as const,
        potential_guests: this.extractGuestNames(m.text),
        topics: this.extractTags(m.text)
      }));

    const connections = messages
      .map(m => ({
        name: this.extractContactName(m.text),
        last_interaction: m.timestamp,
        relationship_health: this.assessRelationshipHealth(m.text)
      }))
      .filter(c => c.name !== null) as any;

    return { atlas, journey, studio, connections };
  },

  // Helper methods
  extractTaskTitle(text: string): string {
    return text.split(/[.:]/)[0].trim();
  },

  extractDateTime(text: string): string | null {
    if (text.includes('amanhã')) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  },

  inferPriority(text: string): 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important' {
    if (text.includes('urgente') || text.includes('hoje') || text.includes('amanhã')) {
      return 'urgent_important';
    }
    return 'not_urgent_important';
  },

  analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['incrível', 'transformadora', 'boa'];
    const negativeWords = ['frustrado', 'difícil', 'problema'];

    const hasPositive = positiveWords.some(w => text.toLowerCase().includes(w));
    const hasNegative = negativeWords.some(w => text.toLowerCase().includes(w));

    if (hasPositive) return 'positive';
    if (hasNegative) return 'negative';
    return 'neutral';
  },

  extractTags(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 5).slice(0, 3);
  },

  extractPodcastTitle(text: string): string {
    const match = text.match(/podcast[:\s]+(.+)/i);
    return match ? match[1].trim() : text;
  },

  extractGuestNames(text: string): string[] {
    const nameMatch = text.match(/convidar\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return nameMatch ? [nameMatch[1]] : [];
  },

  extractContactName(text: string): string | null {
    const nameMatch = text.match(/^([A-Z][a-z]+)/);
    return nameMatch ? nameMatch[1] : null;
  },

  assessRelationshipHealth(text: string): 'strong' | 'moderate' | 'declining' {
    if (text.includes('não responde') || text.includes('semanas')) {
      return 'declining';
    }
    if (text.includes('mandou') || text.includes('artigo')) {
      return 'strong';
    }
    return 'moderate';
  }
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 2.6 types/index.ts (TypeScript Definitions)
```typescript
export interface DemoMessage {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'contact';
  chaos_level: number; // 0-100
  category?: 'atlas' | 'journey' | 'studio' | 'connections';
}

export interface ProcessedModules {
  atlas: AtlasTask[];
  journey: JourneyMoment[];
  studio: StudioEpisode[];
  connections: Connection[];
}

export interface AtlasTask {
  id: string;
  title: string;
  scheduled_time: string | null;
  priority: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important';
  source: string;
  auto_created: boolean;
}

export interface JourneyMoment {
  id: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  consciousness_points: number;
}

export interface StudioEpisode {
  id: string;
  title: string;
  status: 'idea' | 'preparation' | 'recording' | 'published';
  potential_guests: string[];
  topics: string[];
}

export interface Connection {
  name: string;
  last_interaction: Date;
  relationship_health: 'strong' | 'moderate' | 'declining';
}

export type ProcessingStage = 'analyzing' | 'embedding' | 'classifying' | 'organizing';
```

---

## 3. DIAGRAMAS DE ARQUITETURA

### 3.1 Fluxo de Componentes
```
┌─────────────────────────────────────────────────────┐
│           LandingPageV5 (Container)                 │
│                                                     │
│  State:                                             │
│  - messages: DemoMessage[]                          │
│  - processedModules: ProcessedModules | null        │
│  - isProcessing: boolean                            │
│  - processingStage: string                          │
│                                                     │
│  Methods:                                           │
│  - handleProcessChaos()                             │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────┴───────────┬──────────────────┐
    ▼                      ▼                  ▼
┌─────────┐        ┌──────────────┐    ┌─────────┐
│ Chaos   │        │ Processing   │    │ Order   │
│ Panel   │        │ Pipeline     │    │ Panel   │
└─────────┘        └──────────────┘    └─────────┘
    │                                       │
    ▼                                       ▼
Floating                              Module Cards
Messages                              - AtlasCard
                                     - JourneyCard
                                     - StudioCard
                                     - ConnectionsCard
```

### 3.2 Fluxo de Dados (Processing)
```
User Click "Processar"
        │
        ▼
handleProcessChaos()
        │
        ▼
demoProcessingService.processMessages()
        │
        ├─► Stage 1: Analyzing (1s delay)
        │   └─► onStageChange('analyzing')
        │
        ├─► Stage 2: Embedding (1.5s delay)
        │   └─► onStageChange('embedding')
        │
        ├─► Stage 3: Classifying (1.2s delay)
        │   └─► classifyMessages()
        │
        ├─► Stage 4: Organizing (0.8s delay)
        │   └─► onStageChange('organizing')
        │
        └─► Complete
            └─► onComplete(processedModules)
                    │
                    ▼
            setProcessedModules()
                    │
                    ▼
            OrderPanel re-renders
                    │
                    ▼
            Stagger animation triggers
```

---

## 4. GUIA DE ESTILO VISUAL

### 4.1 Paleta de Cores Expandida
```css
/* Ceramic Base (já existente) */
--ceramic-base: #F0EFE9;
--ceramic-text-primary: #5C554B;
--ceramic-text-secondary: #8B8378;
--ceramic-accent: #D97706;

/* Chaos Theme */
--chaos-bg-start: #F0EFE9;
--chaos-bg-end: #E5E3DA;
--chaos-card-bg: rgba(255, 255, 255, 0.6);
--chaos-text-faded: #A39E91;
--chaos-shadow: rgba(163, 158, 145, 0.3);

/* Order Theme */
--order-bg: #F0EFE9;
--order-card-bg: #F0EFE9; /* Solid ceramic */
--order-text-crisp: #5C554B;
--order-shadow-dark: rgba(163, 158, 145, 0.20);
--order-shadow-light: rgba(255, 255, 255, 0.90);

/* Module Colors */
--atlas-color: #3B82F6;      /* Blue */
--journey-color: #8B5CF6;    /* Purple */
--studio-color: #F59E0B;     /* Orange */
--connections-color: #10B981; /* Green */

/* Processing Pipeline */
--pipeline-bg: linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%);
--pipeline-complete: #10B981;
```

### 4.2 Animação de Referência (Timing)
```javascript
// Durations (ms)
const ANIMATION_DURATIONS = {
  messageFloat: 3000,      // Float up/down
  chaosToOrder: 800,       // Transition flight
  stagger: 100,            // Delay between cards
  cardHover: 200,          // Hover scale
  pipelineStage: 1000,     // Each pipeline stage
};

// Easing functions
const EASINGS = {
  smooth: [0.6, 0.05, 0.01, 0.9],     // Custom cubic-bezier
  spring: { type: "spring", stiffness: 100, damping: 15 },
  bounce: { type: "spring", stiffness: 300, damping: 20 },
};
```

---

## 5. CHECKLIST DE ACESSIBILIDADE

### 5.1 Keyboard Navigation
```typescript
// Em todos os componentes interativos
<motion.button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  tabIndex={0}
  aria-label="Processar caos e organizar informações"
>
  Processar
</motion.button>
```

### 5.2 ARIA Labels
```jsx
{/* ChaosPanel */}
<div
  role="region"
  aria-label="Mensagens desorganizadas"
  aria-live="polite"
>
  {/* Floating messages */}
</div>

{/* OrderPanel */}
<div
  role="region"
  aria-label="Informações organizadas"
  aria-live="assertive"
  aria-busy={isProcessing}
>
  {/* Module cards */}
</div>

{/* ProcessingPipeline */}
<div
  role="progressbar"
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`Processamento em ${progress}%`}
/>
```

### 5.3 Reduce Motion
```typescript
import { useReducedMotion } from 'framer-motion';

function ChaosPanel() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        y: shouldReduceMotion ? 0 : [0, -10, 0],
        transition: {
          duration: shouldReduceMotion ? 0 : 3,
          repeat: shouldReduceMotion ? 0 : Infinity
        }
      }}
    >
      {/* Content */}
    </motion.div>
  );
}
```

---

## 6. PERFORMANCE CHECKLIST

### 6.1 Code Splitting
```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const OrderPanel = lazy(() => import('./components/OrderPanel'));
const ProcessingPipeline = lazy(() => import('./components/ProcessingPipeline'));

function LandingPageV5() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OrderPanel modules={modules} />
    </Suspense>
  );
}
```

### 6.2 Memo para Cards
```typescript
import { memo } from 'react';

export const FloatingMessageCard = memo(function FloatingMessageCard({
  message,
  index
}: FloatingMessageCardProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.message.id === nextProps.message.id &&
         prevProps.index === nextProps.index;
});
```

### 6.3 Debounce em Interações
```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

function InteractiveCard() {
  const handleHover = useMemo(
    () => debounce(() => {
      // Expensive hover logic
    }, 100),
    []
  );

  return <div onMouseEnter={handleHover} />;
}
```

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests (Vitest)
```typescript
// demoProcessingService.test.ts
import { describe, it, expect } from 'vitest';
import { demoProcessingService } from './demoProcessingService';

describe('demoProcessingService', () => {
  it('generates realistic demo messages', () => {
    const messages = demoProcessingService.generateDemoMessages();

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toHaveProperty('text');
    expect(messages[0]).toHaveProperty('chaos_level');
  });

  it('classifies messages into correct modules', () => {
    const messages = [
      {
        id: '1',
        text: 'Reunião amanhã 14h',
        timestamp: new Date(),
        sender: 'user',
        chaos_level: 80
      }
    ] as any;

    const modules = demoProcessingService.classifyMessages(messages);

    expect(modules.atlas.length).toBeGreaterThan(0);
    expect(modules.atlas[0].title).toContain('Reunião');
  });
});
```

### 7.2 E2E Tests (Playwright)
```typescript
// landing-v5.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Landing Page V5 - Ordem ao Caos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing-v5');
  });

  test('should render chaos and order panels', async ({ page }) => {
    await expect(page.getByText('🌪️ Caos')).toBeVisible();
    await expect(page.getByText('✨ Ordem')).toBeVisible();
  });

  test('should process chaos when button clicked', async ({ page }) => {
    await page.click('text=Processar Meu Caos');

    // Pipeline should appear
    await expect(page.getByText('Processando')).toBeVisible();

    // Wait for completion (max 5s)
    await expect(page.getByText('100% concluído')).toBeVisible({ timeout: 5000 });

    // Order panel should be populated
    await expect(page.locator('.module-card')).toHaveCount(4);
  });

  test('should animate messages from chaos to order', async ({ page }) => {
    // Get initial position of first message
    const messageCard = page.locator('.floating-message-card').first();
    const initialBox = await messageCard.boundingBox();

    // Trigger processing
    await page.click('text=Processar Meu Caos');

    // Message should move (y position changes)
    await page.waitForTimeout(1000);
    const finalBox = await messageCard.boundingBox();

    expect(finalBox?.y).not.toBe(initialBox?.y);
  });
});
```

---

## 8. DEPLOYMENT CHECKLIST

### 8.1 Pre-Deploy
```bash
# Build check
npm run build
npm run typecheck

# Lighthouse audit
npm install -g lighthouse
lighthouse https://localhost:5173/landing-v5 --view

# Bundle analysis
npm run build -- --analyze
```

### 8.2 Feature Flag Setup
```typescript
// src/config/features.ts
export const FEATURES = {
  LANDING_V5_ENABLED: import.meta.env.VITE_FEATURE_LANDING_V5 === 'true',
  LANDING_V5_AB_TEST: import.meta.env.VITE_AB_TEST_LANDING === 'true',
};

// src/router/AppRouter.tsx
import { FEATURES } from '@/config/features';

function AppRouter() {
  const landingComponent = FEATURES.LANDING_V5_AB_TEST
    ? (Math.random() > 0.5 ? LandingPageV5 : LandingPage)
    : FEATURES.LANDING_V5_ENABLED
      ? LandingPageV5
      : LandingPage;

  return (
    <Routes>
      <Route path="/" element={landingComponent} />
      {/* ... */}
    </Routes>
  );
}
```

### 8.3 Analytics Events
```typescript
// src/services/analytics.ts
export const trackLandingEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  // Google Analytics 4
  window.gtag?.('event', eventName, {
    page_version: 'v5_ordem_ao_caos',
    ...properties
  });

  // Hotjar
  window.hj?.('event', eventName);
};

// Usage in component
trackLandingEvent('demo_started', {
  message_count: messages.length
});
```

---

## 9. CONCLUSÃO

Este guia de implementação fornece:

1. **Código pronto para uso** - Copy-paste friendly
2. **Arquitetura clara** - Componentes modulares e testáveis
3. **Performance garantida** - Lazy loading, memoization, debouncing
4. **Acessibilidade built-in** - WCAG AA compliance
5. **Testing completo** - Unit + E2E coverage
6. **Deploy seguro** - Feature flags + A/B testing

**Próximo passo:** Começar implementação da Fase 1 (MVP Estático)

---

**Documento Vivo:** Este guia será atualizado conforme a implementação progride.
