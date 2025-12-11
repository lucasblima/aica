# Step 2 - Compartilhar um Momento: Multiple Choice Redesign

**Status**: Versão 1.0 - Detalhamento completo do fluxo
**Data**: Dezembro 2025
**Objetivo**: Redesenhar Step 2 para capturar contexto via múltipla escolha ANTES de pedir texto livre

---

## 1. Visão Geral: Problema & Solução

### 1.1 Problema Identificado

**Versão Anterior (Descartada)**:
- Perguntava "Compartilhe um momento importante" com input de texto livre
- Assumia engajamento/reflexão profunda
- Alta fricção para novo usuário
- Sensação de "tarefa" ao invés de "oportunidade de valor"

**Novo Approach**:
1. **Primeira**, mostrar MÚLTIPLAS OPÇÕES para tipo de momento
2. **Segunda**, permitir seleção de categorias/contexto (visualmente)
3. **Terceira**, mostrar exemplos de como outros usam (anônimo, agregado)
4. **Quarta**, ENTÃO pedir reflexão/texto livre (opcional)
5. **Quinta**, oferecer gravação de áudio (optional)

**Benefício**: Acelera decisão, reduz fricção, demonstra valor antes de pedir investimento emocional

---

## 2. Fluxo Completo: Step 2 UX Journey

```
┌─────────────────────────────────────────────┐
│ STEP 2.1: Tipo de Momento                   │
│ "Que tipo de momento você quer compartilhar?"│
│                                              │
│ [Opcão 1: Desafio Superado]                 │
│ [Opção 2: Alegria/Celebração]               │
│ [Opção 3: Aprendizado/Insight]              │
│ [Opção 4: Reflexão Profunda]                │
│ [Opção 5: Luta/Dificuldade]                 │
│ [Opção 6: Mudança/Transformação]            │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 2.2: Como Você Se Sente?              │
│ "Qual é o seu estado emocional?"            │
│                                              │
│ [😢 Triste] [😐 Neutro] [😊 Alegre]        │
│ [😄 Muito Alegre] [😡 Bravo]               │
│                                              │
│ Ou: "Outro sentimento?" → descrição livre   │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 2.3: Áreas da Vida Afetadas?          │
│ "Isso está relacionado a..."                │
│ (Pode marcar múltiplas)                     │
│                                              │
│ [✓] Saúde Mental/Bem-estar                 │
│ [ ] Saúde Física                           │
│ [ ] Relacionamentos                        │
│ [ ] Trabalho/Carreira                      │
│ [ ] Financeiro                             │
│ [ ] Pessoal/Espiritual                     │
│ [ ] Outra (especificar)                    │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 2.4: Mostrar Valor (Social Proof)     │
│                                              │
│ "Aqui está como outros compartilham:"      │
│ (Exemplos anônimos, agregados)             │
│                                              │
│ "1,234 momentos compartilhados essa semana" │
│ "48% dos usuários encontram padrões nos    │
│  primeiros 3 momentos compartilhados"      │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 2.5: Refletir (OPCIONAL)              │
│ "Descreva um pouco mais (opcional)..."      │
│                                              │
│ [Text input com placeholder sugestivo]      │
│ "Você pode descrever em suas próprias      │
│  palavras, ou deixar vazio para continuar" │
│                                              │
│ Sugestões de prompt:                        │
│ - "Como isso aconteceu?"                    │
│ - "Por que é importante?"                   │
│ - "O que você aprendeu?"                    │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 2.6: Áudio (OPCIONAL)                 │
│ "Quer gravar um áudio?"                     │
│                                              │
│ [ Record Audio Button ]                     │
│ "Deixe a reflexão ser ainda mais pessoal"  │
│ "Leve 1 minuto ou menos"                    │
│                                              │
│ [ou Pular esta parte]                       │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 2.7: Review & Confirm                 │
│                                              │
│ Mostrar resumo do que foi capturado:        │
│ - Tipo: Desafio Superado                    │
│ - Emoção: 😊 Alegre                         │
│ - Áreas: Saúde, Relacionamentos            │
│ - Texto: "Conversei com um amigo sobre..." │
│ - Áudio: ✓ Gravado                         │
│                                              │
│ [ ← Editar ] [ Salvar Momento ]            │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│ STEP 3: Success & Rewards                   │
│                                              │
│ "Momento salvo com sucesso! 🎉"             │
│ "+25 Consciousness Points"                  │
│ "Você está progredindo..." (Streak info)    │
│                                              │
│ [Próximo Passo] ou [Pular]                 │
└─────────────────────────────────────────────┘
```

---

## 3. Componentes Detalhados

### 3.1 STEP 2.1: Tipo de Momento - Card Grid

**Objetivo**: Usuário escolhe 1 tipo de momento

**Design**:
- Grid: 2 colunas (mobile), 3 colunas (tablet), 3 colunas (desktop)
- Cards interativas, selecionáveis
- Altura: Flex para acomodar texto
- Transição visual clara ao selecionar

```typescript
// MomentType.tsx

export interface MomentTypeOption {
  id: string;
  label: string;
  icon: string;           // Emoji ou lucide icon name
  description: string;    // Descrição breve
  color: string;         // Background color
  examples?: string[];   // 2-3 exemplos de momentos
}

export const MOMENT_TYPES: MomentTypeOption[] = [
  {
    id: 'challenge',
    label: 'Desafio Superado',
    icon: '⛰️',
    description: 'Um obstáculo que você venceu',
    color: '#FF922B',
    examples: ['Tive coragem para pedir um aumento', 'Enfrentei meu medo']
  },
  {
    id: 'joy',
    label: 'Alegria/Celebração',
    icon: '🎉',
    description: 'Um momento de felicidade ou vitória',
    color: '#51CF66',
    examples: ['Minha promoção foi aprovada', 'Passei no exame']
  },
  {
    id: 'learning',
    label: 'Aprendizado/Insight',
    icon: '💡',
    description: 'Algo importante que você aprendeu',
    color: '#6B9EFF',
    examples: ['Entendi por que reajo assim', 'Descobri um novo padrão']
  },
  {
    id: 'reflection',
    label: 'Reflexão Profunda',
    icon: '🪞',
    description: 'Pensamentos sobre quem você é',
    color: '#845EF7',
    examples: ['Refleti sobre meus valores', 'Questionei meu rumo']
  },
  {
    id: 'struggle',
    label: 'Luta/Dificuldade',
    icon: '⚡',
    description: 'Um desafio que está enfrentando',
    color: '#FA5252',
    examples: ['Estou me sentindo sozinho', 'Tenho dificuldade em relaxar']
  },
  {
    id: 'transformation',
    label: 'Mudança/Transformação',
    icon: '🦋',
    description: 'Você está mudando em alguma forma',
    color: '#845EF7',
    examples: ['Sinto-me diferente após a mudança', 'Minha perspectiva evoluiu']
  }
];

interface MomentTypeSelectionProps {
  onSelect: (typeId: string) => void;
  selected?: string;
}

export function MomentTypeSelection({ onSelect, selected }: MomentTypeSelectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Que tipo de momento você quer compartilhar?
        </h2>
        <p className="text-[#5C554B]">
          Escolha uma categoria que melhor descreva sua experiência
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {MOMENT_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`p-4 rounded-xl transition-all border-2 ${
              selected === type.id
                ? 'border-current bg-opacity-10'
                : 'border-transparent hover:border-gray-200'
            }`}
            style={{
              backgroundColor: selected === type.id ? `${type.color}20` : '#F8F7F5',
              borderColor: selected === type.id ? type.color : undefined
            }}
          >
            <div className="text-3xl mb-2">{type.icon}</div>
            <h3 className="font-bold text-sm text-[#2B1B17] mb-1">
              {type.label}
            </h3>
            <p className="text-xs text-[#5C554B] mb-2">
              {type.description}
            </p>
            {selected === type.id && (
              <div className="text-xs font-semibold" style={{ color: type.color }}>
                ✓ Selecionado
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Show examples for selected type */}
      {selected && (
        <div className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0]">
          <p className="text-xs font-semibold text-[#948D82] mb-2">EXEMPLOS:</p>
          <ul className="space-y-1">
            {MOMENT_TYPES.find(t => t.id === selected)?.examples?.map((ex, i) => (
              <li key={i} className="text-sm text-[#5C554B]">
                • {ex}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

### 3.2 STEP 2.2: Emoção - Emotion Picker

**Objetivo**: Usuário seleciona sua emoção atual

**Design**:
- 5 opções principais (emoji buttons)
- Cada botão: 64px × 64px (touchable)
- "Outra emoção?" opção para texto livre
- Seleção única

```typescript
// EmotionPicker.tsx

export interface EmotionOption {
  id: string;
  emoji: string;
  label: string;
  aliases?: string[];    // Outras palavras que descrevem isso
}

export const EMOTIONS: EmotionOption[] = [
  {
    id: 'sad',
    emoji: '😢',
    label: 'Triste',
    aliases: ['deprimido', 'desanimado', 'desapontado']
  },
  {
    id: 'neutral',
    emoji: '😐',
    label: 'Neutro',
    aliases: ['ok', 'calmo', 'equilibrado']
  },
  {
    id: 'happy',
    emoji: '😊',
    label: 'Alegre',
    aliases: ['feliz', 'contente', 'satisfeito']
  },
  {
    id: 'excited',
    emoji: '😄',
    label: 'Muito Alegre',
    aliases: ['entusiasmado', 'animado', 'empolgado']
  },
  {
    id: 'angry',
    emoji: '😡',
    label: 'Bravo',
    aliases: ['frustrado', 'irritado', 'revoltado']
  }
];

interface EmotionPickerProps {
  onSelect: (emotionId: string) => void;
  customEmotion?: string;
  onCustomChange?: (text: string) => void;
  selected?: string;
}

export function EmotionPicker({
  onSelect,
  customEmotion,
  onCustomChange,
  selected
}: EmotionPickerProps) {
  const [showCustom, setShowCustom] = React.useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Como você está se sentindo?
        </h2>
        <p className="text-[#5C554B]">
          Escolha a emoção que melhor descreve seu estado atual
        </p>
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        {EMOTIONS.map(emotion => (
          <button
            key={emotion.id}
            onClick={() => {
              onSelect(emotion.id);
              setShowCustom(false);
            }}
            className={`flex flex-col items-center p-4 rounded-xl transition-all ${
              selected === emotion.id
                ? 'ring-2 ring-offset-2 scale-110'
                : 'hover:scale-105'
            }`}
            style={{
              ringColor: selected === emotion.id ? '#6B9EFF' : undefined
            }}
          >
            <span className="text-5xl mb-2">{emotion.emoji}</span>
            <span className="text-sm font-semibold text-[#2B1B17]">
              {emotion.label}
            </span>
          </button>
        ))}
      </div>

      {/* Custom emotion option */}
      <div className="border-t border-[#E8E6E0] pt-4">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="text-[#6B9EFF] font-semibold text-sm hover:underline"
        >
          {showCustom ? '✕ Cancelar' : '+ Outro sentimento?'}
        </button>

        {showCustom && (
          <div className="mt-3">
            <input
              type="text"
              value={customEmotion || ''}
              onChange={e => onCustomChange?.(e.target.value)}
              placeholder="Ex: Nostálgico, Calmo, Energizado..."
              className="w-full px-4 py-2 border border-[#E8E6E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9EFF]"
            />
            {customEmotion && (
              <p className="text-xs text-[#948D82] mt-2">
                Você selecionou: <strong>{customEmotion}</strong>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 3.3 STEP 2.3: Áreas da Vida - Multi-Select Chips

**Objetivo**: Usuário marca 1+ áreas afetadas

**Design**:
- Chips/tags clicáveis
- Permite múltipla seleção
- Visual feedback claro (cor, checkmark)
- Opcional: campo "Outra"

```typescript
// LifeAreaSelector.tsx

export interface LifeArea {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
}

export const LIFE_AREAS: LifeArea[] = [
  {
    id: 'mental_health',
    label: 'Saúde Mental',
    icon: '🧠',
    color: '#6B9EFF',
    description: 'Bem-estar emocional, ansiedade, depressão'
  },
  {
    id: 'physical_health',
    label: 'Saúde Física',
    icon: '💪',
    color: '#FF6B6B',
    description: 'Exercício, nutrição, energia'
  },
  {
    id: 'relationships',
    label: 'Relacionamentos',
    icon: '👥',
    color: '#FF922B',
    description: 'Família, amigos, amor'
  },
  {
    id: 'work',
    label: 'Trabalho/Carreira',
    icon: '💼',
    color: '#4C6EF5',
    description: 'Profissão, desenvolvimento, oportunidades'
  },
  {
    id: 'finance',
    label: 'Financeiro',
    icon: '💰',
    color: '#51CF66',
    description: 'Dinheiro, dívidas, gastos'
  },
  {
    id: 'personal',
    label: 'Pessoal/Espiritual',
    icon: '✨',
    color: '#845EF7',
    description: 'Propósito, valores, crescimento'
  }
];

interface LifeAreaSelectorProps {
  selected: string[];
  onToggle: (areaId: string) => void;
}

export function LifeAreaSelector({ selected, onToggle }: LifeAreaSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Isso está relacionado a...?
        </h2>
        <p className="text-[#5C554B]">
          Escolha uma ou mais áreas (opcional)
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {LIFE_AREAS.map(area => (
          <button
            key={area.id}
            onClick={() => onToggle(area.id)}
            className={`px-4 py-3 rounded-full transition-all border-2 font-medium text-sm ${
              selected.includes(area.id)
                ? 'border-current text-white'
                : 'border-[#E8E6E0] text-[#5C554B] hover:border-[#948D82]'
            }`}
            style={{
              backgroundColor: selected.includes(area.id) ? area.color : 'transparent',
              borderColor: selected.includes(area.id) ? area.color : undefined
            }}
            title={area.description}
          >
            <span className="mr-2">{area.icon}</span>
            {area.label}
            {selected.includes(area.id) && <span className="ml-2">✓</span>}
          </button>
        ))}
      </div>

      {/* Info about selections */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-[#6B9EFF] rounded-lg p-3">
          <p className="text-sm text-[#5C554B]">
            Você selecionou <strong>{selected.length}</strong> área(s).
            Isso nos ajuda a personalizar recomendações de módulos.
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### 3.4 STEP 2.4: Social Proof / Value Indicator

**Objetivo**: Mostrar que outros compartilham, criar FOMO positivo

**Design**:
- Estatísticas simples, honestas
- Agregadas, anônimas
- Reforçam valor da plataforma

```typescript
// ValueIndicator.tsx

interface ValueIndicatorProps {
  weeklyMomentCount?: number;
  patternDiscoveryRate?: number;
  avgInsightsPerUser?: number;
}

export function ValueIndicator({
  weeklyMomentCount = 1234,
  patternDiscoveryRate = 48,
  avgInsightsPerUser = 3.2
}: ValueIndicatorProps) {
  return (
    <div className="bg-gradient-to-r from-[#6B9EFF]/10 to-[#845EF7]/10 rounded-lg border border-[#6B9EFF]/20 p-6 my-6">
      <p className="text-sm font-semibold text-[#948D82] mb-4 uppercase tracking-wide">
        Aqui está como outros usam Aica:
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#6B9EFF]">
            {weeklyMomentCount.toLocaleString()}
          </p>
          <p className="text-xs text-[#5C554B] mt-1">
            Momentos compartilhados<br />essa semana
          </p>
        </div>

        <div className="text-center border-l border-r border-[#E8E6E0]">
          <p className="text-2xl font-bold text-[#845EF7]">
            {patternDiscoveryRate}%
          </p>
          <p className="text-xs text-[#5C554B] mt-1">
            Dos usuários encontram<br />padrões nos primeiros 3 momentos
          </p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-[#FF922B]">
            {avgInsightsPerUser.toFixed(1)}
          </p>
          <p className="text-xs text-[#5C554B] mt-1">
            Insights gerados em média<br />por semana
          </p>
        </div>
      </div>

      <p className="text-xs text-[#948D82] mt-4 text-center italic">
        Dados agregados e anônimos de usuários ativos
      </p>
    </div>
  );
}
```

---

### 3.5 STEP 2.5: Refletir (Optional) - Text Input

**Objetivo**: Capturar reflexão adicional (OPCIONAL)

**Design**:
- Text area expansível
- Placeholder sugestivo
- Prompt dinâmico baseado no tipo de momento
- Contador de caracteres (informativo)

```typescript
// ReflectionInput.tsx

export const REFLECTION_PROMPTS: Record<string, string[]> = {
  challenge: [
    'Como você enfrentou isso?',
    'O que aprendeu neste desafio?',
    'Como isso mudou sua perspectiva?'
  ],
  joy: [
    'Por que esse momento foi tão especial?',
    'Com quem você compartilhou essa alegria?',
    'Como se sentiu depois?'
  ],
  learning: [
    'Como essa descoberta mudou você?',
    'Quando você percebeu isso?',
    'Como vai usar esse conhecimento?'
  ],
  reflection: [
    'Por que está refletindo sobre isso agora?',
    'Qual conclusão você chegou?',
    'O que essa reflexão revelou sobre você?'
  ],
  struggle: [
    'Há quanto tempo está lidam com isso?',
    'Que apoio você gostaria?',
    'Como isso o afeta?'
  ],
  transformation: [
    'Quando começou essa mudança?',
    'Como você se sente sobre ela?',
    'Que diferença está fazendo?'
  ]
};

interface ReflectionInputProps {
  momentTypeId?: string;
  value: string;
  onChange: (text: string) => void;
  minChars?: number;
  maxChars?: number;
}

export function ReflectionInput({
  momentTypeId,
  value,
  onChange,
  minChars = 0,
  maxChars = 1000
}: ReflectionInputProps) {
  const prompts = momentTypeId ? REFLECTION_PROMPTS[momentTypeId] || [] : [];
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Descreva um pouco mais
        </h2>
        <p className="text-[#5C554B] text-sm">
          Opcional - deixe vazio se preferir continuar
        </p>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxChars))}
        placeholder={`${randomPrompt || 'Você pode descrever em suas próprias palavras, ou deixar vazio...'}`}
        rows={4}
        className="w-full px-4 py-3 border border-[#E8E6E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] resize-none"
      />

      <div className="flex justify-between items-center">
        <div className="text-xs text-[#948D82]">
          {value.length} / {maxChars} caracteres
        </div>

        {value.length > 100 && (
          <div className="text-xs text-[#6B9EFF]">
            ✓ Excelente reflexão!
          </div>
        )}
      </div>

      {/* Helpful hint */}
      {!value && (
        <div className="bg-[#F8F7F5] rounded-lg p-3 border border-[#E8E6E0]">
          <p className="text-xs text-[#948D82]">
            💡 <strong>Dica:</strong> {randomPrompt}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### 3.6 STEP 2.6: Áudio Opcional - Audio Recorder

**Objetivo**: Permitir gravação de áudio (OPCIONAL)

**Design**:
- Record button com visual feedback
- Timer durante gravação
- Playback para preview
- Delete/retry options

```typescript
// AudioRecorder.tsx

export interface AudioRecording {
  blob: Blob;
  duration: number;
  url: string;
}

interface AudioRecorderProps {
  onRecordingComplete: (recording: AudioRecording) => void;
  maxDuration?: number; // seconds
}

export function AudioRecorder({
  onRecordingComplete,
  maxDuration = 120 // 2 minutes
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [recording, setRecording] = React.useState<AudioRecording | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecording({ blob, duration, url });
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= maxDuration) {
            stopRecording();
            return prev;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setDuration(0);
  };

  const confirmRecording = () => {
    if (recording) onRecordingComplete(recording);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[#2B1B17] mb-2">
          Quer gravar um áudio?
        </h2>
        <p className="text-[#5C554B] text-sm">
          Deixe a reflexão ser ainda mais pessoal (opcional, máx 2 minutos)
        </p>
      </div>

      {!recording ? (
        <div>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-full py-6 rounded-lg font-bold transition-all flex flex-col items-center justify-center gap-3 ${
              isRecording
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-[#6B9EFF] text-white hover:bg-[#5A8FEF]'
            }`}
          >
            {isRecording ? (
              <>
                <div className="animate-pulse w-4 h-4 bg-red-500 rounded-full"></div>
                Gravando... {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
              </>
            ) : (
              <>
                <Mic size={24} />
                Clique para Gravar
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-[#F8F7F5] rounded-lg p-4">
            <p className="text-xs text-[#948D82] mb-2">GRAVAÇÃO:</p>
            <audio
              src={recording.url}
              controls
              className="w-full"
            />
            <p className="text-xs text-[#948D82] mt-2">
              Duração: {Math.floor(recording.duration / 60)}:{String(recording.duration % 60).padStart(2, '0')}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={deleteRecording}
              className="flex-1 px-4 py-2 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5]"
            >
              Deletar
            </button>
            <button
              onClick={confirmRecording}
              className="flex-1 px-4 py-2 bg-[#51CF66] text-white font-semibold rounded-lg hover:bg-[#40C057]"
            >
              Usar Esta Gravação
            </button>
          </div>
        </div>
      )}

      {!recording && (
        <button
          onClick={() => {/* Skip audio */}}
          className="w-full text-[#6B9EFF] font-semibold text-sm hover:underline"
        >
          Pular esta parte
        </button>
      )}
    </div>
  );
}
```

---

### 3.7 STEP 2.7: Review & Confirm

**Objetivo**: Revisão final antes de persistir

**Design**:
- Resumo visual do que foi capturado
- Permite editar qualquer campo
- Confirmação clara

```typescript
// MomentReview.tsx

export interface MomentCapture {
  momentTypeId: string;
  emotion: string;
  lifeAreas: string[];
  reflection: string;
  audioRecording?: AudioRecording;
  customEmotion?: string;
}

interface MomentReviewProps {
  data: MomentCapture;
  onConfirm: () => void;
  onEdit: (field: string) => void;
  isLoading?: boolean;
}

export function MomentReview({
  data,
  onConfirm,
  onEdit,
  isLoading = false
}: MomentReviewProps) {
  const momentType = MOMENT_TYPES.find(t => t.id === data.momentTypeId);
  const emotion = EMOTIONS.find(e => e.id === data.emotion);
  const selectedAreas = data.lifeAreas.map(id =>
    LIFE_AREAS.find(a => a.id === id)
  ).filter(Boolean);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-[#2B1B17]">
        Revisão do Seu Momento
      </h2>

      {/* Tipo */}
      <div className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#948D82] uppercase mb-1">Tipo</p>
            <p className="text-lg font-bold text-[#2B1B17]">
              {momentType?.icon} {momentType?.label}
            </p>
          </div>
          <button
            onClick={() => onEdit('momentType')}
            className="text-[#6B9EFF] font-semibold text-sm hover:underline"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Emoção */}
      <div className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#948D82] uppercase mb-1">Emoção</p>
            <p className="text-lg font-bold text-[#2B1B17]">
              {emotion?.emoji} {data.customEmotion || emotion?.label}
            </p>
          </div>
          <button
            onClick={() => onEdit('emotion')}
            className="text-[#6B9EFF] font-semibold text-sm hover:underline"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Áreas */}
      {selectedAreas.length > 0 && (
        <div className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#948D82] uppercase">Áreas</p>
            <button
              onClick={() => onEdit('lifeAreas')}
              className="text-[#6B9EFF] font-semibold text-sm hover:underline"
            >
              Editar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAreas.map(area => (
              <span
                key={area?.id}
                className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: area?.color }}
              >
                {area?.icon} {area?.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reflexão */}
      {data.reflection && (
        <div className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#948D82] uppercase">Reflexão</p>
            <button
              onClick={() => onEdit('reflection')}
              className="text-[#6B9EFF] font-semibold text-sm hover:underline"
            >
              Editar
            </button>
          </div>
          <p className="text-[#2B1B17] leading-relaxed">{data.reflection}</p>
        </div>
      )}

      {/* Áudio */}
      {data.audioRecording && (
        <div className="bg-[#F8F7F5] rounded-lg p-4 border border-[#E8E6E0]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#948D82] uppercase">Áudio</p>
            <button
              onClick={() => onEdit('audio')}
              className="text-[#6B9EFF] font-semibold text-sm hover:underline"
            >
              Remover
            </button>
          </div>
          <audio src={data.audioRecording.url} controls className="w-full" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-[#E8E6E0]">
        <button
          onClick={() => onEdit('back')}
          className="flex-1 px-4 py-3 border border-[#E8E6E0] text-[#5C554B] font-semibold rounded-lg hover:bg-[#F8F7F5]"
        >
          ← Voltar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-3 bg-[#6B9EFF] text-white font-semibold rounded-lg hover:bg-[#5A8FEF] disabled:opacity-50"
        >
          {isLoading ? 'Salvando...' : 'Salvar Momento'}
        </button>
      </div>
    </div>
  );
}
```

---

## 4. State Management

```typescript
// useOnboardingStep2.ts

export interface Step2State {
  momentTypeId?: string;
  emotion?: string;
  customEmotion?: string;
  lifeAreas: string[];
  reflection: string;
  audioRecording?: AudioRecording;
  currentStep: number; // 1-7
}

export function useOnboardingStep2() {
  const [state, setState] = React.useState<Step2State>({
    lifeAreas: [],
    reflection: '',
    currentStep: 1
  });

  const updateField = (field: keyof Step2State, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, 7) }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) }));
  };

  const reset = () => {
    setState({
      lifeAreas: [],
      reflection: '',
      currentStep: 1
    });
  };

  const isValidForNext = (): boolean => {
    switch (state.currentStep) {
      case 1: return !!state.momentTypeId;
      case 2: return !!state.emotion || !!state.customEmotion;
      case 3: return true; // Optional
      case 4: return true; // Info only
      case 5: return true; // Optional
      case 6: return true; // Optional
      case 7: return true; // Review
      default: return false;
    }
  };

  return {
    state,
    updateField,
    nextStep,
    prevStep,
    reset,
    isValidForNext
  };
}
```

---

## 5. API Endpoints

```typescript
// POST /api/journey/create-moment-from-onboarding

export interface CreateMomentRequest {
  user_id: string;
  momentTypeId: string;          // 'challenge', 'joy', etc
  emotion: string;               // 'happy', 'sad', etc
  customEmotion?: string;        // If user entered custom
  lifeAreas: string[];           // ['health', 'work']
  reflection?: string;           // Optional text
  audioFile?: {
    blob: Blob;
    mimeType: string;
    duration: number;
  };
}

export interface CreateMomentResponse {
  momentId: string;
  pointsAwarded: number;
  leveledUp: boolean;
  nextStep: 'view_modules' | 'complete_onboarding';
  suggestedModules: Array<{
    id: string;
    name: string;
    reason: string; // Why recommended
    priority: number;
  }>;
}

// Implementation Flow:
// 1. Upload audio to Supabase Storage (if provided)
// 2. Transcribe audio (Whisper API)
// 3. Analyze sentiment (Gemini API)
// 4. Generate tags/categorization (AI)
// 5. INSERT into moment_entries table
// 6. Award consciousness points
// 7. Update user stats
// 8. Generate module recommendations
// 9. Return response
```

---

## 6. Validação & Error Handling

```typescript
// Step 2.5: Reflexão deve ter entre 20 e 1000 caracteres
// Se muito curta: "Sua reflexão é muito breve. Quer adicionar mais?"
// Se muito longa: "Sua reflexão é bem completa! Você pode deixar como está."

// Step 2.6: Áudio deve ter entre 1 segundo e 2 minutos
// Se muito curto: "Áudio muito breve. Quer tentar novamente?"
// Se muito longo: "Áudio ultrapassou 2 minutos. Truncando..."

// Falhas de persistência:
// "Erro ao salvar momento. Tente novamente."
// Botão com retry automático
```

---

## 7. UX Flow - Mobile vs Desktop

### Mobile (< 640px)
- Single-column layout
- Full-width inputs
- Stack buttons vertically
- Swipe to navigate between steps (optional)
- Bottom navigation with "Next" / "Previous"

### Desktop (> 1024px)
- Can show step on left, form on right
- Or: center-aligned max-width container
- Side-by-side buttons
- Progress bar at top

---

## 8. Success States & Feedback

```
After Step 2.7 Confirmation:

┌─────────────────────────────────────┐
│ "Momento salvo com sucesso! 🎉"     │
│                                      │
│ "+25 Consciousness Points"           │
│ [Visual celebration animation]       │
│                                      │
│ "Seu streak: 2 dias 🔥"             │
│ "Você está progredindo..."           │
│                                      │
│ [Next Step] ou [Explorar Módulos]   │
└─────────────────────────────────────┘
```

---

**Documento criado**: 11/12/2025
**Próximo passo**: MODULOS_RECOMENDACOES_LOGIC.md
