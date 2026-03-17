/**
 * Client-side Intent Classifier
 *
 * Hybrid keyword-based classification that maps user messages
 * to the appropriate AICA module agent. Falls back to 'coordinator'
 * when confidence is low or classification is ambiguous.
 */

import type { AgentModule } from './types'

export interface IntentResult {
  module: AgentModule | 'coordinator'
  confidence: number
  actionHint: string
  needsServerClassification: boolean
}

const MODULE_KEYWORDS: Record<Exclude<AgentModule, 'coordinator'>, string[]> = {
  atlas: [
    'tarefa', 'task', 'prioridade', 'eisenhower', 'produtividade',
    'pendente', 'urgente', 'prazo', 'deadline', 'to-do', 'todo',
    'lista', 'checklist',
  ],
  journey: [
    'momento', 'emoção', 'sentimento', 'diário', 'reflexão',
    'autoconhecimento', 'consciência', 'meditação', 'gratidão', 'humor',
  ],
  connections: [
    'contato', 'pessoa', 'whatsapp', 'rede', 'amigo', 'colega',
    'crm', 'relacionamento', 'networking', 'telefone',
  ],
  finance: [
    'dinheiro', 'conta', 'orçamento', 'extrato', 'investimento',
    'gasto', 'receita', 'saldo', 'transferencia', 'boleto', 'pix', 'cartao',
  ],
  flux: [
    'treino', 'atleta', 'exercicio', 'workout', 'serie', 'repeticao',
    'carga', 'academia', 'corrida', 'musculacao',
  ],
  studio: [
    'podcast', 'episódio', 'convidado', 'gravação', 'pauta',
    'entrevista', 'microfone', 'áudio',
  ],
  captacao: [
    'edital', 'grant', 'faperj', 'cnpq', 'finep', 'proposta',
    'captacao', 'patrocinio', 'incentivo', 'lei',
  ],
  agenda: [
    'reunião', 'evento', 'calendário', 'horário', 'compromisso',
    'agendar', 'marcar', 'encontro', 'call',
  ],
}

const ACTION_HINTS: Record<Exclude<AgentModule, 'coordinator'>, string> = {
  atlas: 'Gerenciar tarefas e prioridades',
  journey: 'Registrar momentos e reflexoes',
  connections: 'Gerenciar contatos e rede',
  finance: 'Analisar finanças',
  flux: 'Gerenciar treinos e atletas',
  studio: 'Produzir podcast',
  captacao: 'Buscar editais e captacao',
  agenda: 'Organizar agenda e compromissos',
}

/**
 * Remove accents and normalize text for keyword matching
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Classify a user message into the most likely AICA module.
 * Uses keyword matching with fallback to coordinator for ambiguous cases.
 */
export function classifyIntent(message: string): IntentResult {
  const normalizedMessage = normalize(message)
  const words = normalizedMessage.split(/\s+/).filter(w => w.length > 1)
  const totalWords = words.length

  if (totalWords === 0) {
    return {
      module: 'coordinator',
      confidence: 0,
      actionHint: 'Mensagem vazia',
      needsServerClassification: true,
    }
  }

  const scores: Partial<Record<Exclude<AgentModule, 'coordinator'>, number>> = {}

  for (const [mod, keywords] of Object.entries(MODULE_KEYWORDS)) {
    const module = mod as Exclude<AgentModule, 'coordinator'>
    let matchCount = 0
    for (const keyword of keywords) {
      const normalizedKeyword = normalize(keyword)
      if (normalizedMessage.includes(normalizedKeyword)) {
        matchCount++
      }
    }
    if (matchCount > 0) {
      scores[module] = matchCount
    }
  }

  const entries = Object.entries(scores) as [Exclude<AgentModule, 'coordinator'>, number][]

  if (entries.length === 0) {
    return {
      module: 'coordinator',
      confidence: 0,
      actionHint: 'Classificação generica',
      needsServerClassification: true,
    }
  }

  entries.sort((a, b) => b[1] - a[1])

  const topModule = entries[0][0]
  const topScore = entries[0][1]

  // Ambiguous: two modules tied for top score
  if (entries.length > 1 && entries[1][1] === topScore) {
    return {
      module: 'coordinator',
      confidence: Math.min(topScore / totalWords, 0.5),
      actionHint: 'Multiplos modulos detectados',
      needsServerClassification: true,
    }
  }

  const confidence = Math.min(topScore / totalWords, 0.95)

  return {
    module: topModule,
    confidence,
    actionHint: ACTION_HINTS[topModule],
    needsServerClassification: confidence < 0.7,
  }
}
