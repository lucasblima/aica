import type { DemoMessage, ProcessedModules } from '../types';

/**
 * demoProcessingService
 *
 * Simula o processamento de mensagens WhatsApp através de IA.
 * Em produção, isso seria substituído por chamadas reais a Edge Functions.
 */

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const demoProcessingService = {
  /**
   * Gera mensagens de demonstração realistas
   */
  generateDemoMessages(): DemoMessage[] {
    const templates = [
      // Atlas (Tarefas)
      { text: "Reunião amanhã 14h com João sobre projeto", senderName: "João", chaos_level: 85, category: 'atlas' as const },
      { text: "Comprar presente de aniversário para mãe", senderName: "Mãe", chaos_level: 90, category: 'atlas' as const },
      { text: "Ligar dentista para remarcar consulta", senderName: "Maria", chaos_level: 95, category: 'atlas' as const },
      { text: "Revisar contrato ate sexta-feira", senderName: "Carlos", chaos_level: 80, category: 'atlas' as const },

      // Journey (Momentos)
      { text: "Tive uma ideia incrível durante a caminhada hoje", senderName: "Eu", chaos_level: 75, category: 'journey' as const },
      { text: "Me senti frustrado na reunião de equipe", senderName: "Eu", chaos_level: 70, category: 'journey' as const },
      { text: "Primeira vez meditando, experiência transformadora", senderName: "Eu", chaos_level: 65, category: 'journey' as const },

      // Studio (Podcasts)
      { text: "Ideia de podcast: IA e ética no século XXI", senderName: "Eu", chaos_level: 88, category: 'studio' as const },
      { text: "Convidar Maria Silva para entrevista sobre sustentabilidade", senderName: "Pedro", chaos_level: 82, category: 'studio' as const },
      { text: "Tópico interessante: futuro do trabalho remoto", senderName: "Eu", chaos_level: 86, category: 'studio' as const },

      // Connections (Relacionamentos)
      { text: "Pedro não responde há 2 semanas", senderName: "Pedro", chaos_level: 92, category: 'connections' as const },
      { text: "Ana me mandou artigo sobre neurociência", senderName: "Ana", chaos_level: 60, category: 'connections' as const },
      { text: "Grupo da família planejando reunião", senderName: "Família", chaos_level: 78, category: 'connections' as const },
    ];

    return templates.map((template, index) => ({
      id: `msg-${index}`,
      text: template.text,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
      sender: template.senderName === 'Eu' ? 'user' as const : 'contact' as const,
      senderName: template.senderName,
      chaos_level: template.chaos_level,
      category: template.category
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
      .filter(m => m.category === 'atlas' || ['reunião', 'comprar', 'ligar', 'revisar'].some(kw => m.text.toLowerCase().includes(kw)))
      .map(m => ({
        id: `task-${m.id}`,
        title: this.extractTaskTitle(m.text),
        scheduled_time: this.extractDateTime(m.text),
        priority: this.inferPriority(m.text),
        source: 'whatsapp_demo',
        auto_created: true
      }));

    const journey = messages
      .filter(m => m.category === 'journey' || ['ideia', 'senti', 'experiência', 'meditando'].some(kw => m.text.toLowerCase().includes(kw)))
      .map(m => ({
        id: `moment-${m.id}`,
        content: m.text,
        sentiment: this.analyzeSentiment(m.text),
        tags: this.extractTags(m.text),
        consciousness_points: Math.floor(Math.random() * 50) + 20
      }));

    const studio = messages
      .filter(m => m.category === 'studio' || ['podcast', 'convidar', 'tópico', 'entrevista'].some(kw => m.text.toLowerCase().includes(kw)))
      .map(m => ({
        id: `episode-${m.id}`,
        title: this.extractPodcastTitle(m.text),
        status: 'idea' as const,
        potential_guests: this.extractGuestNames(m.text),
        topics: this.extractTags(m.text)
      }));

    const connections = messages
      .filter(m => m.category === 'connections')
      .map(m => ({
        name: this.extractContactName(m.text) || 'Contato',
        last_interaction: m.timestamp,
        relationship_health: this.assessRelationshipHealth(m.text)
      }));

    return { atlas, journey, studio, connections };
  },

  // Helper methods
  extractTaskTitle(text: string): string {
    return text.split(/[.:]/)[0].trim();
  },

  extractDateTime(text: string): string | null {
    if (text.toLowerCase().includes('amanhã')) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
    if (text.toLowerCase().includes('sexta')) {
      const today = new Date();
      const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
      return new Date(Date.now() + daysUntilFriday * 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  },

  inferPriority(text: string): 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('urgente') || lowerText.includes('hoje') || lowerText.includes('amanhã')) {
      return 'urgent_important';
    }
    if (lowerText.includes('contrato') || lowerText.includes('projeto')) {
      return 'not_urgent_important';
    }
    return 'not_urgent_not_important';
  },

  analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['incrível', 'transformadora', 'boa', 'ótimo', 'feliz'];
    const negativeWords = ['frustrado', 'difícil', 'problema', 'triste', 'ansioso'];

    const lowerText = text.toLowerCase();
    const hasPositive = positiveWords.some(w => lowerText.includes(w));
    const hasNegative = negativeWords.some(w => lowerText.includes(w));

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
    if (match) return match[1].trim();

    const topicMatch = text.match(/tópico[:\s]+(.+)/i);
    if (topicMatch) return topicMatch[1].trim();

    return text.split(':')[0].trim();
  },

  extractGuestNames(text: string): string[] {
    const nameMatch = text.match(/convidar\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    return nameMatch ? [nameMatch[1]] : [];
  },

  extractContactName(text: string): string | null {
    const nameMatch = text.match(/^([A-Z][a-z]+)/);
    return nameMatch ? nameMatch[1] : null;
  },

  assessRelationshipHealth(text: string): 'strong' | 'moderate' | 'declining' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('não responde') || lowerText.includes('semanas')) {
      return 'declining';
    }
    if (lowerText.includes('mandou') || lowerText.includes('artigo')) {
      return 'strong';
    }
    return 'moderate';
  }
};
