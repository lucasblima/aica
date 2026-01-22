# Presentation Generator - Fase 2

**Issue:** #117 - Gerador de Apresentações HTML/PDF com RAG
**Status:** Fase 2 Completa ✅
**Data:** 2026-01-22

---

## Estrutura de Pastas

```
src/modules/grants/components/presentation/
├── slides/                     # 12 tipos de slides
│   ├── CoverSlide.tsx
│   ├── OrganizationSlide.tsx
│   ├── ProjectSlide.tsx
│   ├── ImpactMetricsSlide.tsx
│   ├── TimelineSlide.tsx
│   ├── TeamSlide.tsx
│   ├── IncentiveLawSlide.tsx
│   ├── TiersSlide.tsx
│   ├── TestimonialsSlide.tsx
│   ├── MediaSlide.tsx
│   ├── ComparisonSlide.tsx
│   ├── ContactSlide.tsx
│   └── index.ts
├── canvas/                     # Componentes de edição
│   ├── SlideCanvas.tsx         # Viewport 1920x1080 + navegação
│   ├── EditableText.tsx        # Edição inline de texto
│   └── index.ts
├── templates/                  # 3 templates CSS
│   ├── professional.css
│   ├── creative.css
│   ├── institutional.css
│   └── index.ts
├── PresentationDemo.tsx        # Componente de demonstração
├── index.ts                    # Barrel export
└── README.md                   # Esta documentação
```

---

## 12 Tipos de Slides Implementados

| Slide | Tipo | Descrição |
|-------|------|-----------|
| 1 | `cover` | Capa com logo, título, subtítulo e tagline |
| 2 | `organization` | Sobre a organização (missão, visão, conquistas) |
| 3 | `project` | Detalhes do projeto (objetivos, resumo executivo) |
| 4 | `impact-metrics` | Métricas e números de impacto |
| 5 | `timeline` | Linha do tempo / cronograma |
| 6 | `team` | Equipe do projeto com fotos |
| 7 | `incentive-law` | Benefícios da Lei de Incentivo |
| 8 | `tiers` | Cotas de patrocínio |
| 9 | `testimonials` | Depoimentos com fotos |
| 10 | `media` | Galeria de imagens/vídeos |
| 11 | `comparison` | Tabela comparativa |
| 12 | `contact` | CTA e informações de contato |

---

## 3 Templates CSS

### 1. Professional
- **Estilo:** Clean, corporativo
- **Cores:** Azul escuro (#1e3a5f) + Laranja (#ed8936)
- **Tipografia:** Montserrat (títulos) + Open Sans (corpo)
- **Uso:** Grandes empresas, apresentações formais

### 2. Creative
- **Estilo:** Bold, artístico
- **Cores:** Roxo (#6366f1) + Rosa (#ec4899) + Teal (#14b8a6)
- **Tipografia:** Poppins (títulos) + Inter (corpo)
- **Uso:** Projetos culturais, startups criativas

### 3. Institutional
- **Estilo:** Formal, governamental
- **Cores:** Azul (#1e40af) + Verde (#059669) + Amarelo (#f59e0b)
- **Tipografia:** Roboto (títulos) + Source Sans Pro (corpo)
- **Uso:** Projetos governamentais, editais públicos

---

## Como Usar

### 1. Importar Componentes

```typescript
import { SlideCanvas } from '@/modules/grants/components/presentation/canvas';
import type { DeckSlide, TemplateType } from '@/modules/grants/types/presentation';
```

### 2. Preparar Dados dos Slides

```typescript
const slides: DeckSlide[] = [
  {
    id: '1',
    deckId: 'my-deck',
    slideType: 'cover',
    slideOrder: 0,
    content: {
      type: 'cover',
      title: 'Meu Projeto',
      subtitle: 'Tagline do projeto',
    },
    customCss: null,
    isVisible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // ... mais slides
];
```

### 3. Usar o SlideCanvas

```typescript
function MyPresentation() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [template, setTemplate] = useState<TemplateType>('professional');
  const [zoom, setZoom] = useState(1);

  return (
    <SlideCanvas
      slides={slides}
      currentSlideIndex={currentSlideIndex}
      template={template}
      zoom={zoom}
      onSlideChange={setCurrentSlideIndex}
      onZoomChange={setZoom}
      editMode={true}
      onSlideUpdate={(slideId, content) => {
        // Atualizar conteúdo do slide
      }}
    />
  );
}
```

---

## Funcionalidades Implementadas

### SlideCanvas
- ✅ Viewport fixo de 1920x1080px
- ✅ Sistema de zoom (50%, 75%, 100%, 125%, 150%)
- ✅ Navegação entre slides (prev/next)
- ✅ Thumbnails laterais
- ✅ Troca de template em tempo real
- ✅ Modo de edição on/off

### EditableText
- ✅ Edição inline com `contentEditable`
- ✅ Auto-save on blur
- ✅ Suporte a multiline
- ✅ Placeholder quando vazio
- ✅ Strip formatting on paste
- ✅ Previne line breaks quando `multiline=false`

### Slides
- ✅ Props tipadas para cada tipo de slide
- ✅ Renderização com template CSS aplicado
- ✅ Edição inline de todos os campos de texto
- ✅ Suporte a imagens/logos
- ✅ Layouts responsivos dentro do viewport

### Templates CSS
- ✅ CSS variables para fácil customização
- ✅ Hot-swap entre templates
- ✅ Estilos consistentes para todos os slides
- ✅ Suporte a dark mode (variáveis CSS)

---

## Demonstração

Execute o componente de demonstração:

```typescript
import { PresentationDemo } from '@/modules/grants/components/presentation/PresentationDemo';

function App() {
  return <PresentationDemo />;
}
```

---

## TypeScript Types

Todos os tipos estão definidos em:
```
src/modules/grants/types/presentation.ts
```

Principais interfaces:
- `DeckSlide` - Slide individual
- `SlideContent` - Union type de todos os conteúdos
- `CoverSlideContent`, `OrganizationSlideContent`, etc. - Conteúdos específicos
- `BaseSlideProps<T>` - Props base para componentes de slide
- `SlideCanvasProps` - Props do SlideCanvas
- `EditableTextProps` - Props do EditableText

---

## Próximos Passos (Fase 3+)

### Fase 3: RAG + Gemini Integration
- [ ] Service `presentationRAGService.ts`
- [ ] Context builder (organização + projeto)
- [ ] Prompts por público-alvo (ESG, Tax, Brand, Impact)
- [ ] Content generator

### Fase 4: Edge Function PDF Export
- [ ] Edge Function `generate-presentation-pdf`
- [ ] HTML template renderer
- [ ] Puppeteer PDF generation

### Fase 5: Wizard UI
- [ ] `PresentationBuilder` component
- [ ] Step navigation
- [ ] Auto-save
- [ ] Drag-and-drop reordering

---

## Dependências Instaladas

```json
{
  "@dnd-kit/core": "^latest",
  "@dnd-kit/sortable": "^latest",
  "@dnd-kit/utilities": "^latest"
}
```

---

## Testes

Para testar manualmente:

1. Adicione o `PresentationDemo` a uma rota
2. Navegue pelos slides usando os controles
3. Teste os 3 templates (Professional, Creative, Institutional)
4. Ative o modo de edição e edite textos inline
5. Teste o zoom (50% - 150%)

---

## Conformidade

- ✅ Segue padrões do projeto (Tailwind CSS)
- ✅ TypeScript strict mode
- ✅ Componentes funcionais com hooks
- ✅ Barrel exports para importações limpas
- ✅ Documentação inline (JSDoc)
- ✅ Copyright headers em todos os arquivos

---

**Implementado por:** UX Design Guardian Agent
**Revisado por:** Lucas Boscacci Lima
**Data:** 2026-01-22
