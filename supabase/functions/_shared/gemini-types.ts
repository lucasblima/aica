// ==========================================================================
// gemini-types.ts — Shared type declarations for Gemini Edge Functions
// Extracted from gemini-chat/index.ts
// ==========================================================================

// ============================================================================
// BASE REQUEST TYPES
// ============================================================================

export interface BaseRequest {
  action?: string
  payload?: Record<string, any>
  model?: 'fast' | 'smart'
}

export interface ChatRequest {
  message: string
  context?: string
  history?: Array<{ role: string; content: string }>
  systemPrompt?: string
}

// ============================================================================
// SENTIMENT ANALYSIS TYPES
// ============================================================================

export interface SentimentAnalysisPayload {
  content: string
  context?: string
}

export interface SentimentAnalysisResult {
  timestamp: string
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number
  emotions: string[]
  triggers: string[]
  energyLevel: number
}

export interface WhatsAppSentimentPayload {
  text: string
  instance?: string
}

export interface WhatsAppSentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  sentimentScore: number
  triggers: string[]
  summary: string
}

// ============================================================================
// JOURNEY MODULE TYPES
// ============================================================================

export interface MomentData {
  id: string
  content: string
  emotion: string
  sentiment_data?: {
    sentiment: string
    sentimentScore: number
  }
  tags: string[]
  created_at: string
}

export interface WeeklySummaryPayload {
  moments: MomentData[]
}

export interface KeyMoment {
  id: string
  preview: string
  sentiment: string
  created_at: string
}

export interface WeeklySummaryResult {
  emotionalTrend: 'ascending' | 'stable' | 'descending' | 'volatile'
  dominantEmotions: string[]
  keyMoments: KeyMoment[]
  insights: string[]
  suggestedFocus: string
}

export interface AnalyzeMomentPayload {
  content: string
  user_emotion?: string
}

export const VALID_EMOTION_VALUES = ['happy', 'sad', 'anxious', 'angry', 'thoughtful', 'calm', 'grateful', 'tired', 'inspired', 'neutral', 'excited', 'disappointed', 'frustrated', 'loving', 'scared', 'determined', 'sleepy', 'overwhelmed', 'confident', 'confused'] as const

export interface AnalyzeMomentResult {
  tags: string[]
  mood: { emoji: string; label: string; value: string }
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number
  emotions: string[]
  triggers: string[]
  energyLevel: number
}

export interface EvaluateQualityPayload {
  input_type: 'moment' | 'question_answer' | 'reflection'
  content: string
  question_text?: string
  summary_context?: string
}

export interface EvaluateQualityResult {
  quality_score: number
  relevance: number
  depth: number
  authenticity: number
  clarity: number
  feedback_message: string
  feedback_tier: 'low' | 'medium' | 'high' | 'exceptional'
}

// ============================================================================
// DAILY REPORT TYPES
// ============================================================================

export interface DailyReportPayload {
  userId: string
  date: string
  tasksCompleted: number
  tasksTotal: number
  productivityScore: number
  moodScore?: number
  energyLevel?: number
  activeModules?: string[]
  content?: string
}

export interface DailyReportResult {
  summary: string
  insights: string[]
  recommendations: string[]
  motivationalMessage: string
}

// ============================================================================
// STUDIO / PODCAST TYPES
// ============================================================================

export interface GenerateDossierPayload {
  guestName: string
  theme?: string
}

export interface TechnicalSheet {
  name: string
  profession: string
  socialMedia: { platform: string; handle: string }[]
  keyFacts?: string[]
}

export interface DossierResult {
  biography: string
  controversies: string[]
  suggestedTopics: string[]
  iceBreakers: string[]
  technicalSheet?: TechnicalSheet
  derivedTheme?: string
}

export interface IceBreakerPayload {
  guestName: string
  keyFacts?: string[]
  occupation?: string
}

export interface IceBreakerResult {
  iceBreakers: Array<{ question: string; rationale: string }>
}

export interface PautaQuestionsPayload {
  guestName: string
  outline: { title: string; mainSections: Array<{ title: string; keyPoints: string[] }> }
  keyFacts?: string[]
  controversies?: string[]
  additionalContext?: string
}

export interface PautaQuestionsResult {
  questions: Array<{
    id: string
    text: string
    category: 'abertura' | 'desenvolvimento' | 'aprofundamento' | 'fechamento'
    followUps: string[]
    context?: string
    priority: 'high' | 'medium' | 'low'
  }>
}

export interface PautaOutlinePayload {
  guestName: string
  theme: string
  biography?: string
  keyFacts?: string[]
  controversies?: string[]
  duration?: number
  style?: { tone: 'formal' | 'casual' | 'investigativo' | 'humano'; depth: 'shallow' | 'medium' | 'deep' }
}

export interface OutlineSection {
  title: string
  description: string
  duration: number
  keyPoints: string[]
  suggestedTransition?: string
}

export interface PautaOutlineResult {
  title: string
  introduction: OutlineSection
  mainSections: OutlineSection[]
  conclusion: OutlineSection
}

export interface ResearchGuestPayload {
  guest_name: string
  reference?: string
  prompt?: string
  system_instruction?: string
}

export interface GuestProfile {
  name: string
  title: string
  biography: string
  recent_facts: string[]
  topics_of_interest: string[]
  controversies?: string[]
  image_url?: string
  is_reliable: boolean
  confidence_score: number
  researched_at: string
}

// ============================================================================
// GRANTS MODULE TYPES
// ============================================================================

export interface GenerateFieldContentPayload {
  edital_text: string
  evaluation_criteria: Array<{
    name: string
    description: string
    weight: number
    min_score: number
    max_score: number
  }>
  field_config: {
    id: string
    label: string
    max_chars: number
    required: boolean
    ai_prompt_hint?: string
  }
  briefing: Record<string, string>
  previous_responses?: Record<string, string>
  source_document_content?: string | null
  edital_text_content?: string | null
  opportunity_documents_content?: string | null
  project_id?: string
}

export interface AnalyzeEditalStructurePayload {
  editalText: string
}

export interface ParseFormFieldsPayload {
  text: string
}

export interface ParsedFormField {
  id: string
  label: string
  max_chars: number
  required: boolean
  ai_prompt_hint: string
  placeholder: string
}

// ============================================================================
// BRIEFING MODULE TYPES
// ============================================================================

export interface GenerateAutoBriefingPayload {
  companyName?: string
  projectIdea?: string
  editalTitle?: string
  editalText?: string
  sourceDocumentContent?: string | null
  formFields?: Array<{
    id: string
    label: string
    max_chars: number
    required: boolean
    ai_prompt_hint?: string
  }>
}

export interface ImproveBriefingFieldPayload {
  fieldId: string
  currentContent: string
  allBriefing: Record<string, string>
}

export interface ExtractRequiredDocumentsPayload {
  pdfContent: string
}

export interface ExtractTimelinePhasesPayload {
  pdfContent: string
}

// ============================================================================
// PDF PROCESSING / FINANCE TYPES
// ============================================================================

export interface ParseStatementPayload {
  rawText: string
}

export interface CategorizeTransactionsPayload {
  transactions: Array<{ description: string; amount: number; type: 'income' | 'expense' }>
}

// ============================================================================
// CHAT ACTION TYPES
// ============================================================================

export interface ChatAction {
  id: string
  type: string
  label: string
  icon: string
  module: string
  params: Record<string, any>
}

export interface UserContextResult {
  contextString: string
  rawData: {
    tasks: any[]
    moments: any[]
    transactions: any[]
    events: any[]
  }
}

// ============================================================================
// AGENT CHAT TYPES
// ============================================================================

export interface ChatWithAgentPayload {
  message: string
  context?: string
  moduleData?: Record<string, any>
  history?: Array<{ role: string; content: string }>
}
