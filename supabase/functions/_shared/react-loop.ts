/**
 * ReACT Loop Engine — Reasoning + Acting
 *
 * Generic loop: Thought -> Action (tool call) -> Observation (result) -> Repeat -> Final Answer
 *
 * Gemini generates JSON at each step choosing a tool call or final answer.
 * The loop executes tools, collects observations, and feeds them back until Gemini answers.
 *
 * Usage:
 *   import { runReactLoop } from '../_shared/react-loop.ts';
 *   const result = await runReactLoop(config, callModel, { onStep });
 */

import { extractJSON, assessConfidence } from './model-router.ts'
import { truncateReference } from './context-manager.ts'

// ============================================================================
// TYPES
// ============================================================================

export interface ReactTool {
  name: string
  description: string
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

export interface ReactConfig {
  tools: ReactTool[]
  minToolCalls: number
  maxToolCalls: number
  maxCharsPerObservation: number
  timeoutPerStepMs: number
  totalTimeoutMs: number
  systemPrompt: string
  userMessage: string
  history?: Array<{ role: string; content: string }>
}

export interface ReactStep {
  thought: string
  action: { tool: string; params: Record<string, unknown> } | null
  observation: string | null
  timestamp: string
}

export interface ReactResult {
  finalAnswer: string
  steps: ReactStep[]
  model: string
  tokens: { input: number; output: number }
  confidence: number
  wasEscalated: boolean
}

export interface ReactOptions {
  onStep?: (step: ReactStep) => void
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface GeminiToolCallResponse {
  thought: string
  action: { tool: string; params: Record<string, unknown> }
}

interface GeminiFinalResponse {
  thought: string
  final_answer: string
}

type GeminiStepResponse = GeminiToolCallResponse | GeminiFinalResponse

function isFinalAnswer(resp: GeminiStepResponse): resp is GeminiFinalResponse {
  return 'final_answer' in resp && typeof resp.final_answer === 'string'
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildSystemPrompt(config: ReactConfig): string {
  const toolDescriptions = config.tools
    .map(t => `- **${t.name}**: ${t.description}`)
    .join('\n')

  return `${config.systemPrompt}

You have access to the following tools:
${toolDescriptions || '(no tools available)'}

At each step, respond with a JSON object. Choose ONE of these formats:

1. To use a tool:
{"thought": "your reasoning", "action": {"tool": "tool_name", "params": {"key": "value"}}}

2. To give your final answer (only after gathering enough information):
{"thought": "your reasoning", "final_answer": "your complete answer"}

Rules:
- Always include a "thought" field explaining your reasoning.
- Use tools to gather information before answering.
- Respond ONLY with valid JSON, no markdown or extra text.`
}

function buildPrompt(
  config: ReactConfig,
  steps: ReactStep[],
  forceToolUse: boolean,
  forceSynthesize: boolean,
): string {
  const parts: string[] = []

  // System prompt
  parts.push(buildSystemPrompt(config))

  // History (if any)
  if (config.history && config.history.length > 0) {
    parts.push('\n--- Conversation History ---')
    for (const msg of config.history) {
      parts.push(`[${msg.role}]: ${msg.content}`)
    }
    parts.push('--- End History ---\n')
  }

  // User message
  parts.push(`User question: ${config.userMessage}`)

  // Previous steps
  if (steps.length > 0) {
    parts.push('\n--- Previous Steps ---')
    for (let i = 0; i < steps.length; i++) {
      parts.push(`Step ${i + 1}:`)
      parts.push(`Thought: ${steps[i].thought}`)
      if (steps[i].action) {
        parts.push(`Action: ${JSON.stringify(steps[i].action)}`)
        parts.push(`Observation: ${steps[i].observation ?? '(no result)'}`)
      }
    }
    parts.push('--- End Steps ---\n')
  }

  // Directives
  if (forceSynthesize) {
    parts.push(
      'You have reached the maximum number of tool calls. You MUST now provide your final answer. ' +
      'Respond with: {"thought": "...", "final_answer": "..."}'
    )
  } else if (forceToolUse) {
    parts.push(
      'You have not used enough tools yet. You MUST use at least one more tool before giving a final answer. ' +
      'Respond with: {"thought": "...", "action": {"tool": "...", "params": {...}}}'
    )
  }

  return parts.join('\n')
}

// ============================================================================
// TOOL EXECUTION
// ============================================================================

async function executeToolWithTimeout(
  tool: ReactTool,
  params: Record<string, unknown>,
  timeoutMs: number,
): Promise<string> {
  const result = await Promise.race([
    tool.execute(params),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool '${tool.name}' timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])

  // Serialize result to string
  if (typeof result === 'string') return result
  return JSON.stringify(result)
}

// ============================================================================
// MAIN LOOP
// ============================================================================

export async function runReactLoop(
  config: ReactConfig,
  callModel: (prompt: string, model: 'fast' | 'smart') => Promise<{ text: string; tokens: { input: number; output: number } }>,
  options?: ReactOptions,
): Promise<ReactResult> {
  const steps: ReactStep[] = []
  let totalTokens = { input: 0, output: 0 }
  let toolCallCount = 0
  const startTime = Date.now()
  let usedModel: 'fast' | 'smart' = 'fast'

  // Build tool lookup map
  const toolMap = new Map<string, ReactTool>()
  for (const tool of config.tools) {
    toolMap.set(tool.name, tool)
  }

  // Main loop
  while (toolCallCount < config.maxToolCalls) {
    // Check total timeout
    if (Date.now() - startTime >= config.totalTimeoutMs) {
      break
    }

    const forceToolUse = toolCallCount < config.minToolCalls
    const forceSynthesize = false
    const prompt = buildPrompt(config, steps, forceToolUse, forceSynthesize)

    // Call Gemini
    const modelResponse = await callModel(prompt, 'fast')
    totalTokens.input += modelResponse.tokens.input
    totalTokens.output += modelResponse.tokens.output

    // Parse response
    let parsed: GeminiStepResponse
    try {
      parsed = extractJSON<GeminiStepResponse>(modelResponse.text)
    } catch {
      // If JSON parsing fails, treat as error and break
      return {
        finalAnswer: `Error: Could not parse model response. Raw: ${modelResponse.text.substring(0, 200)}`,
        steps,
        model: usedModel,
        tokens: totalTokens,
        confidence: 0,
        wasEscalated: false,
      }
    }

    // If model wants to give final answer
    if (isFinalAnswer(parsed)) {
      if (toolCallCount < config.minToolCalls) {
        // Reject early final answer — loop will continue with forceToolUse directive
        continue
      }

      // Accept final answer
      let finalAnswer = parsed.final_answer
      let wasEscalated = false

      // Assess confidence
      const confidence = assessConfidence(finalAnswer)

      if (confidence < 0.6) {
        // Escalate: re-synthesize with Pro model
        const synthesisPrompt = buildPrompt(config, steps, false, false) +
          '\n\nPrevious answer was low-confidence. Please provide a thorough, detailed answer.'
        const escalatedResponse = await callModel(synthesisPrompt, 'smart')
        totalTokens.input += escalatedResponse.tokens.input
        totalTokens.output += escalatedResponse.tokens.output

        try {
          const escalatedParsed = extractJSON<GeminiFinalResponse>(escalatedResponse.text)
          if ('final_answer' in escalatedParsed) {
            finalAnswer = escalatedParsed.final_answer
          } else {
            finalAnswer = escalatedResponse.text
          }
        } catch {
          finalAnswer = escalatedResponse.text
        }

        wasEscalated = true
        usedModel = 'smart'
      }

      const finalConfidence = assessConfidence(finalAnswer)

      return {
        finalAnswer,
        steps,
        model: usedModel,
        tokens: totalTokens,
        confidence: finalConfidence,
        wasEscalated,
      }
    }

    // Model wants to call a tool
    const actionParsed = parsed as GeminiToolCallResponse
    const toolName = actionParsed.action.tool
    const toolParams = actionParsed.action.params
    const tool = toolMap.get(toolName)

    let observation: string
    if (!tool) {
      observation = `Error: Tool '${toolName}' not found. Available tools: ${config.tools.map(t => t.name).join(', ')}`
    } else {
      try {
        const rawObservation = await executeToolWithTimeout(tool, toolParams, config.timeoutPerStepMs)
        observation = truncateReference(rawObservation, config.maxCharsPerObservation)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        observation = `Error executing tool '${toolName}': ${message}`
      }
    }

    const step: ReactStep = {
      thought: actionParsed.thought || '',
      action: { tool: toolName, params: toolParams },
      observation,
      timestamp: new Date().toISOString(),
    }

    steps.push(step)
    toolCallCount++

    if (options?.onStep) {
      options.onStep(step)
    }
  }

  // If we exited the loop without a final answer (maxToolCalls or timeout),
  // force a synthesis call
  const synthesisPrompt = buildPrompt(config, steps, false, true)
  const synthesisResponse = await callModel(synthesisPrompt, 'fast')
  totalTokens.input += synthesisResponse.tokens.input
  totalTokens.output += synthesisResponse.tokens.output

  let finalAnswer: string
  try {
    const parsed = extractJSON<GeminiFinalResponse>(synthesisResponse.text)
    finalAnswer = 'final_answer' in parsed ? parsed.final_answer : synthesisResponse.text
  } catch {
    finalAnswer = synthesisResponse.text
  }

  const confidence = assessConfidence(finalAnswer)

  return {
    finalAnswer,
    steps,
    model: usedModel,
    tokens: totalTokens,
    confidence,
    wasEscalated: false,
  }
}
