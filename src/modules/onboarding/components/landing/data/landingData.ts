/**
 * Landing Page Data — All hardcoded content for the landing page.
 *
 * Sources: scoreExplainerService, consciousnessPointsService,
 * gamificationService, healthScoreService, and AICA domain models.
 */

// ── Domain definitions (7 AICA modules) ──

export const DOMAINS = [
  { id: 'atlas', label: 'Produtividade', model: 'Carga Cognitiva', reference: 'Sweller (1988)', icon: 'LayoutDashboard', description: 'Gestão de tarefas com matriz de Eisenhower e análise de carga cognitiva', demoScore: 0.78, validatedPtBr: false },
  { id: 'journey', label: 'Bem-estar', model: 'PERMA-Profiler', reference: 'Butler & Kern (2016)', icon: 'Heart', description: 'Diário de consciência com análise psicométrica validada', demoScore: 0.65, validatedPtBr: true },
  { id: 'connections', label: 'Relacionamentos', model: 'Camadas de Dunbar', reference: 'Dunbar (1992)', icon: 'Users', description: 'CRM pessoal com health score de relacionamentos', demoScore: 0.72, validatedPtBr: false },
  { id: 'finance', label: 'Finanças', model: 'Saúde Financeira', reference: 'Financial Health Network (2024)', icon: 'Wallet', description: 'Economia comportamental aplicada às suas finanças', demoScore: 0.58, validatedPtBr: false },
  { id: 'grants', label: 'Captação', model: 'Força do Pesquisador (RSS)', reference: 'Hirsch (2005)', icon: 'GraduationCap', description: 'Parsing de editais e gestão de captação com IA', demoScore: 0.85, validatedPtBr: false },
  { id: 'studio', label: 'Produção', model: 'Score de Convidado', reference: 'Best practices', icon: 'Mic', description: 'Produção de podcast com pesquisa de convidados', demoScore: 0.70, validatedPtBr: false },
  { id: 'flux', label: 'Treinamento', model: 'Balanço de Estresse (TSB)', reference: 'Banister (1975)', icon: 'Dumbbell', description: 'Ciência do treinamento para coaches e atletas', demoScore: 0.62, validatedPtBr: false },
] as const;

// ── Scoring models (from scoreExplainerService) ──

export const SCORING_MODELS = [
  { id: 'life_score', domain: 'cross', title: 'Life Score', summary: 'Pontuação composta que integra todas as áreas da sua vida, calculada como média geométrica ponderada.', formula: 'Mesma abordagem do IDH (UNDP)', scale: '0-1, onde 0.80+ = prosperando', contested: false },
  { id: 'cognitive_load', domain: 'atlas', title: 'Carga Cognitiva', summary: 'Estima a demanda mental de uma tarefa baseado na complexidade dos elementos e sua interatividade.', formula: 'CL = elementos × interatividade × (1/expertise)', scale: '0-1', contested: false },
  { id: 'flow_state', domain: 'atlas', title: 'Probabilidade de Flow', summary: 'Probabilidade de entrar em estado de fluxo (foco total), baseada no equilíbrio desafio-habilidade.', formula: 'Desafio ≈ Habilidade + metas claras + feedback imediato', scale: '0-1, onde 0.8+ = condições ideais', contested: false },
  { id: 'planning_fallacy', domain: 'atlas', title: 'Correção da Falácia do Planejamento', summary: 'Corrige estimativas de tempo usando seu histórico pessoal de precisão.', formula: 'Tempo corrigido = estimativa × multiplicador pessoal', scale: 'Razão (média: 1.5x)', contested: false },
  { id: 'decision_fatigue', domain: 'atlas', title: 'Fadiga de Decisão', summary: 'Sugere agendar decisões complexas no início do dia, quando a capacidade de decisão é maior.', formula: 'Heurística prática baseada em horário', scale: 'Qualitativo', contested: true },
  { id: 'perma_profiler', domain: 'journey', title: 'PERMA-Profiler (Bem-estar)', summary: 'Avaliação completa do bem-estar em 5 dimensões: Emoções Positivas, Engajamento, Relacionamentos, Significado e Realização.', formula: '23 items, escala 0-10 por dimensão', scale: '0-10, onde 7+ = florescendo', contested: false },
  { id: 'swls', domain: 'journey', title: 'Satisfação com a Vida (SWLS)', summary: 'Medida global de satisfação com a vida usando 5 perguntas simples.', formula: '5 items, escala 1-7 (total 5-35)', scale: '31+ = extremamente satisfeito, 20 = neutro', contested: false },
  { id: 'dunbar_layers', domain: 'connections', title: 'Camadas de Dunbar', summary: 'Classifica seus contatos em camadas baseadas na frequência e proximidade — do círculo íntimo (5) aos conhecidos (500).', formula: '5 → 15 → 50 → 150 → 500', scale: 'Camadas concêntricas', contested: false },
  { id: 'gottman_ratio', domain: 'connections', title: 'Razão de Gottman', summary: 'Proporção entre interações positivas e negativas — 5:1 ou melhor indica relacionamento saudável.', formula: 'Positivas:Negativas ≥ 5:1', scale: '≥5:1 = saudável, <1:1 = crítico', contested: false },
  { id: 'finhealth_score', domain: 'finance', title: 'Saúde Financeira', summary: 'Avaliação em 4 componentes: gastar, poupar, emprestar e planejar.', formula: '4 componentes × 0-100 cada', scale: '80+ = saudável, 40-79 = gerenciando, <40 = vulnerável', contested: false },
  { id: 'prospect_theory', domain: 'finance', title: 'Aversão à Perda', summary: 'Perder R$100 dói 2.25x mais do que ganhar R$100 alegra — usamos isso para motivar economia.', formula: 'λ = 2.25 (Kahneman & Tversky)', scale: 'Multiplicador de perda', contested: false },
  { id: 'researcher_strength', domain: 'grants', title: 'Força do Pesquisador (RSS)', summary: 'Score composto da produção científica: h-index, citações, impacto de revistas e colaboração.', formula: 'RSS = 0.30×h + 0.20×citações + 0.15×m-quotient + 0.20×IF + 0.15×centralidade', scale: '0-1 por campo', contested: false },
  { id: 'guest_scoring', domain: 'studio', title: 'Score de Convidado', summary: 'Avaliação de candidatos a convidados do podcast em 4 dimensões: expertise, alcance, relevância e diversidade.', formula: '0.30×expertise + 0.25×alcance + 0.30×relevância + 0.15×diversidade', scale: '0-1, onde 0.8+ = excelente', contested: false },
  { id: 'ctl_atl_tsb', domain: 'flux', title: 'Balanço de Estresse de Treino (TSB)', summary: 'Monitora a relação entre carga crônica (fitness) e aguda (fadiga) para otimizar desempenho.', formula: 'TSB = CTL (42 dias) - ATL (7 dias)', scale: '>0 = recuperado, -10 a 0 = produtivo, <-30 = risco', contested: false },
  { id: 'negative_spiral', domain: 'cross', title: 'Detecção de Espiral Negativa', summary: 'Alerta quando 3+ áreas correlacionadas declinam simultaneamente, indicando um problema sistêmico.', formula: 'Correlação cruzada entre domínios', scale: 'Warning (3 domínios) / Critical (4+)', contested: false },
] as const;

// ── Spiral pairs (cross-domain correlations) ──

export const SPIRAL_PAIRS = [
  { domainA: 'journey', domainB: 'atlas', description: 'Bem-estar e produtividade — estresse reduz foco e desempenho' },
  { domainA: 'finance', domainB: 'journey', description: 'Saúde financeira e bem-estar — preocupações financeiras afetam sono e humor' },
  { domainA: 'connections', domainB: 'journey', description: 'Relacionamentos e bem-estar — isolamento social e solidão' },
  { domainA: 'atlas', domainB: 'flux', description: 'Produtividade e treino — sobrecarga de trabalho reduz exercício' },
  { domainA: 'finance', domainB: 'connections', description: 'Finanças e relacionamentos — estresse financeiro gera conflitos' },
  { domainA: 'journey', domainB: 'flux', description: 'Bem-estar e treino — saúde mental afeta motivação para exercício' },
] as const;

// ── Consciousness Points (CP) categories ──

export const CP_CATEGORIES = [
  { id: 'presence', icon: '\u{1F9D8}', label: 'Presença', description: 'Ser intencional no momento', color: '#8B5CF6' },
  { id: 'reflection', icon: '\u{1F4D4}', label: 'Reflexão', description: 'Olhar para dentro com honestidade', color: '#EC4899' },
  { id: 'connection', icon: '\u{1F49A}', label: 'Conexão', description: 'Cuidar de quem importa', color: '#10B981' },
  { id: 'intention', icon: '\u{1F3AF}', label: 'Intenção', description: 'Agir com propósito', color: '#F59E0B' },
  { id: 'growth', icon: '\u{1F331}', label: 'Crescimento', description: 'Celebrar conquistas reais', color: '#3B82F6' },
] as const;

// ── Pricing tiers ──

export const PRICING_TIERS = [
  {
    name: 'Free',
    price: 0,
    credits: 500,
    highlighted: false,
    features: ['8 módulos completos', 'Scoring básico', 'Chat com IA', 'Export de dados'],
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    price: 34.99,
    credits: 2500,
    highlighted: true,
    features: ['Tudo do Free', 'IA avançada (Gemini Pro)', 'Análise cross-module', 'Suporte prioritário', 'WhatsApp completo'],
    cta: 'Assinar Pro',
  },
  {
    name: 'Max',
    price: 89.99,
    credits: 10000,
    highlighted: false,
    features: ['Tudo do Pro', 'Acesso à API', 'Dashboard avançado', 'Suporte dedicado'],
    cta: 'Assinar Max',
  },
] as const;

// ── Compound effect examples (cross-module intelligence) ──

export const COMPOUND_EXAMPLES = [
  {
    modules: ['atlas', 'grants', 'connections'],
    text: 'Uma tarefa no Atlas conectada a um edital no Grants e um contato no Connections — o AICA sugere agendar reunião com o co-autor.',
  },
  {
    modules: ['finance', 'journey'],
    text: 'Padrões financeiros do Finance cruzados com bem-estar do Journey — detectamos que gastos impulsivos aumentam quando seu humor cai.',
  },
  {
    modules: ['atlas', 'journey', 'finance'],
    text: 'Produtividade caindo + bem-estar caindo + finanças deteriorando = alerta sistêmico antes que vire crise.',
  },
] as const;

// ── Type exports ──

export type Domain = typeof DOMAINS[number];
export type ScoringModel = typeof SCORING_MODELS[number];
export type SpiralPair = typeof SPIRAL_PAIRS[number];
export type CPCategory = typeof CP_CATEGORIES[number];
export type PricingTier = typeof PRICING_TIERS[number];
export type CompoundExample = typeof COMPOUND_EXAMPLES[number];
