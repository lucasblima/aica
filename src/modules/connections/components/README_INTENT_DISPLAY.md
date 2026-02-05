# WhatsApp Intent Display - Issue #91

## Overview
WhatsApp messages são processadas pelo backend usando Gemini para extrair **intenções** semânticas em vez de armazenar texto bruto. Isso garante compliance com WhatsApp ToS e permite análise de sentimento/urgência.

## Componentes Atualizados

### WhatsAppContactCard
Componente atualizado para exibir intents extraídos em vez de mensagens brutas.

#### Mudanças Principais

1. **Novos campos de props:**
```typescript
contact: ContactNetwork & {
  last_intent_preview?: string;        // "Perguntou sobre o projeto X"
  last_intent_category?: IntentCategory; // 'question' | 'response' | ...
  last_intent_sentiment?: IntentSentiment; // 'positive' | 'neutral' | 'negative' | 'urgent'
  last_intent_urgency?: number;        // 1-5 (4+ mostra badge "Urgente")
  processing_status?: ProcessingStatus; // 'pending' | 'processing' | 'completed' | 'failed'
}
```

2. **Componente IntentPreview:**
- Exibe ícone baseado na categoria (MessageCircleQuestion, Calendar, FileText, etc.)
- Cor baseada no sentimento (verde=positive, cinza=neutral, vermelho=negative, laranja=urgent)
- Badge "Urgente" para urgência >= 4
- Fallback para `last_message_preview` se intent não estiver disponível

3. **Indicador de processamento:**
- Spinner "Processando..." quando `processing_status === 'pending'`
- Mostra que a mensagem está sendo processada pelo Gemini

## Tipos (src/modules/connections/types/intent.ts)

### IntentCategory
9 categorias semânticas:
- `question`: Pergunta do contato
- `response`: Resposta/confirmação
- `scheduling`: Agendamento/calendário
- `document`: Documento compartilhado
- `audio`: Mensagem de voz
- `social`: Saudação/small talk
- `request`: Solicitação de ação
- `update`: Atualização de status
- `media`: Foto/vídeo/sticker

### IntentSentiment
- `positive`: Tom positivo
- `neutral`: Neutro
- `negative`: Tom negativo
- `urgent`: Requer atenção urgente

### ProcessingStatus
- `pending`: Aguardando processamento
- `processing`: Em processamento
- `completed`: Processado com sucesso
- `failed`: Falha no processamento

## Mapeamento de Ícones

| Categoria | Ícone Lucide | Uso |
|-----------|--------------|-----|
| question | MessageCircleQuestion | Perguntas |
| response | MessageCircleReply | Respostas |
| scheduling | Calendar | Agendamentos |
| document | FileText | Documentos |
| audio | Mic | Mensagens de voz |
| social | Smile | Saudações |
| request | ClipboardList | Solicitações |
| update | RefreshCw | Atualizações |
| media | Image | Mídias |

## Mapeamento de Cores (Tailwind)

| Sentiment | Classe Tailwind | Visual |
|-----------|-----------------|--------|
| positive | text-green-600 | Verde |
| neutral | text-gray-600 | Cinza |
| negative | text-red-600 | Vermelho |
| urgent | text-orange-600 | Laranja |

## Compatibilidade Retroativa

O componente mantém compatibilidade com contatos que ainda não têm intents processados:

```tsx
{contact.last_intent_preview ? (
  <IntentPreview contact={contact} />
) : contact.last_message_preview ? (
  // Fallback: exibir preview de mensagem antiga
  <div>...</div>
) : null}
```

## Fluxo de Dados

1. Mensagem chega via Evolution API → `webhook-evolution`
2. Webhook chama `extract-intent` Edge Function
3. Gemini processa mensagem → extrai intent
4. Intent armazenado em `whatsapp_messages` (campos `intent_*`)
5. Trigger atualiza `contact_network.last_intent_*`
6. Real-time subscription atualiza UI
7. WhatsAppContactCard renderiza `<IntentPreview />`

## Exemplo de Uso

```tsx
import { WhatsAppContactCard } from '@/modules/connections/components/WhatsAppContactCard'

<WhatsAppContactCard
  contact={{
    id: '123',
    name: 'João Silva',
    last_intent_preview: 'Perguntou sobre o orçamento do projeto',
    last_intent_category: 'question',
    last_intent_sentiment: 'urgent',
    last_intent_urgency: 5,
    processing_status: 'completed',
    // ... outros campos ContactNetwork
  }}
  onClick={(contact) => console.log('Clicked', contact)}
/>
```

## Edge Cases

1. **Mensagem sendo processada:**
   - Exibe spinner "Processando..."
   - Fallback para `last_message_preview` se disponível

2. **Processamento falhou:**
   - Não exibe intent
   - Fallback para `last_message_preview`
   - TODO: Adicionar indicador de falha no futuro

3. **Contato sem mensagens:**
   - Não exibe preview (null)
   - Normal para contatos recém-adicionados

4. **Migração gradual:**
   - Mensagens antigas: usam `last_message_preview`
   - Mensagens novas: usam `last_intent_preview`
   - Componente suporta ambos

## Performance

- Intents são pré-computados no backend (Edge Function)
- Sem processamento no cliente
- Icones carregados via tree-shaking (Lucide)
- Minimal re-renders (React.memo não necessário para este componente)

## Acessibilidade

- Intent summary é legível por screen readers
- Cores de sentimento têm contraste adequado (WCAG AA)
- Ícones têm labels semânticos
- Badge "Urgente" é anunciado corretamente

## Próximos Passos (Futuro)

- [ ] Timeline view mostrando histórico de intents
- [ ] Filtro por categoria de intent
- [ ] Busca semântica usando embeddings
- [ ] Agregação de intents (ex: "3 perguntas não respondidas")
