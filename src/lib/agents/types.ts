/**
 * AI Agent System Types
 *
 * Defines the type system for AICA's module-specific AI agents.
 * Each module has a specialized agent with domain expertise,
 * tool capabilities, and response format expectations.
 */

import type { GeminiModel } from '../gemini/models'

/**
 * Available AICA modules that have AI agents
 */
export type AgentModule =
  | 'atlas'
  | 'captacao'
  | 'studio'
  | 'journey'
  | 'finance'
  | 'connections'
  | 'coordinator'

/**
 * Tools available to agents via Gemini
 */
export type AgentTool =
  | 'file_search'      // RAG via File Search V2 stores
  | 'grounded_search'  // Google Search grounding
  | 'code_execution'   // Gemini code execution sandbox
  | 'function_calling' // Custom function calling

/**
 * Configuration for a module AI agent
 */
export interface AgentConfig {
  /** Module identifier */
  module: AgentModule
  /** Display name in Portuguese */
  displayName: string
  /** Short description of agent capabilities */
  description: string
  /** System prompt that defines agent behavior */
  systemPrompt: string
  /** Recommended Gemini model tier for this agent */
  defaultModel: GeminiModel
  /** Tools this agent can use */
  tools: AgentTool[]
  /** Maximum output tokens for responses */
  maxOutputTokens: number
  /** Temperature for generation (0.0 - 2.0) */
  temperature: number
  /** File Search categories this agent can access */
  fileSearchCategories?: string[]
}

/**
 * Context passed to an agent for a specific interaction
 */
export interface AgentContext {
  /** User ID for data scoping */
  userId: string
  /** Current module context data (varies by module) */
  moduleData?: Record<string, any>
  /** Conversation history */
  history?: AgentMessage[]
  /** File Search store IDs to query */
  fileSearchStores?: string[]
  /** Whether to enable Google Search grounding */
  enableGrounding?: boolean
}

/**
 * A message in an agent conversation
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

/**
 * Response from an agent interaction
 */
export interface AgentResponse {
  /** The agent's text response */
  text: string
  /** Sources from File Search or Google Search */
  sources?: AgentSource[]
  /** Grounding citations */
  citations?: AgentCitation[]
  /** Which agent handled the request */
  agent: AgentModule
  /** Token usage metadata */
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

/**
 * A source reference from RAG or Google Search
 */
export interface AgentSource {
  title: string
  uri?: string
  confidence?: number
}

/**
 * A citation linking response text to a source
 */
export interface AgentCitation {
  text: string
  sourceIndex: number
  confidence: number
}
