import { describe, it, expect, vi } from 'vitest'

// Mock model-router to avoid Deno npm: import resolution in vitest
vi.mock('../../../supabase/functions/_shared/model-router.ts', () => ({
  extractJSON<T = unknown>(text: string): T {
    // Strip code fences
    let cleaned = text.replace(/```(?:json)?\s*\n?/g, '').trim()
    try { return JSON.parse(cleaned) } catch { /* continue */ }
    const objStart = cleaned.indexOf('{')
    const arrStart = cleaned.indexOf('[')
    let start = -1, end = -1
    if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
      start = objStart; end = cleaned.lastIndexOf('}')
    } else if (arrStart >= 0) {
      start = arrStart; end = cleaned.lastIndexOf(']')
    }
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.substring(start, end + 1)) } catch { /* fall */ }
    }
    throw new Error(`Failed to extract JSON: ${text.substring(0, 200)}`)
  },
  assessConfidence(text: string, expectJson?: boolean): number {
    let score = 1.0
    if (!text || text.trim().length === 0) return 0
    if (text.trim().length < 20) score -= 0.3
    const lowerText = text.toLowerCase()
    const phrases = ['i cannot', "i'm not sure", "i don't know", 'unable to']
    for (const p of phrases) { if (lowerText.includes(p)) { score -= 0.3; break } }
    return Math.max(0, Math.min(1, score))
  },
}))

import type { ReactConfig, ReactStep, ReactResult, ReactTool } from '../../../supabase/functions/_shared/react-loop'
import { runReactLoop } from '../../../supabase/functions/_shared/react-loop'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ReactConfig with sensible defaults, overridable */
function makeConfig(overrides: Partial<ReactConfig> = {}): ReactConfig {
  return {
    tools: [],
    minToolCalls: 1,
    maxToolCalls: 5,
    maxCharsPerObservation: 4000,
    timeoutPerStepMs: 30000,
    totalTimeoutMs: 150000,
    systemPrompt: 'You are a test agent.',
    userMessage: 'What is 2+2?',
    ...overrides,
  }
}

/** Create a mock tool */
function makeTool(name: string, result: unknown = 'tool-result'): ReactTool {
  return {
    name,
    description: `A tool called ${name}`,
    execute: vi.fn().mockResolvedValue(result),
  }
}

/** Helper: build a callModel mock that returns a sequence of JSON responses */
function makeCallModel(responses: Array<Record<string, unknown>>) {
  const queue = [...responses]
  return vi.fn().mockImplementation(async () => {
    const next = queue.shift()
    if (!next) throw new Error('callModel called more times than expected')
    return {
      text: JSON.stringify(next),
      tokens: { input: 100, output: 50 },
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runReactLoop', () => {
  describe('basic flow: tool call then final answer', () => {
    it('executes one tool call and returns final answer', async () => {
      const tool = makeTool('calculator', 4)
      const config = makeConfig({ tools: [tool], minToolCalls: 1, maxToolCalls: 5 })
      const callModel = makeCallModel([
        { thought: 'I need to calculate.', action: { tool: 'calculator', params: { a: 2, b: 2 } } },
        { thought: 'Got the answer.', final_answer: 'The answer is 4.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.finalAnswer).toBe('The answer is 4.')
      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].thought).toBe('I need to calculate.')
      expect(result.steps[0].action).toEqual({ tool: 'calculator', params: { a: 2, b: 2 } })
      expect(result.steps[0].observation).toBe('4')
      expect(tool.execute).toHaveBeenCalledWith({ a: 2, b: 2 })
    })
  })

  describe('multiple tool calls', () => {
    it('executes multiple tools in sequence', async () => {
      const search = makeTool('search', 'found doc about fish')
      const summarize = makeTool('summarize', 'fish are aquatic')
      const config = makeConfig({ tools: [search, summarize], minToolCalls: 1, maxToolCalls: 5 })

      const callModel = makeCallModel([
        { thought: 'Search first.', action: { tool: 'search', params: { q: 'fish' } } },
        { thought: 'Now summarize.', action: { tool: 'summarize', params: { text: 'found doc about fish' } } },
        { thought: 'Done.', final_answer: 'Fish are aquatic animals.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(2)
      expect(result.steps[0].action!.tool).toBe('search')
      expect(result.steps[1].action!.tool).toBe('summarize')
      expect(result.finalAnswer).toBe('Fish are aquatic animals.')
      expect(search.execute).toHaveBeenCalledOnce()
      expect(summarize.execute).toHaveBeenCalledOnce()
    })
  })

  describe('maxToolCalls enforcement', () => {
    it('stops after maxToolCalls even if Gemini wants more', async () => {
      const tool = makeTool('infinite', 'more data')
      const config = makeConfig({ tools: [tool], minToolCalls: 1, maxToolCalls: 3 })

      // Gemini always wants another tool call — never sends final_answer
      const callModel = makeCallModel([
        { thought: 'Step 1.', action: { tool: 'infinite', params: {} } },
        { thought: 'Step 2.', action: { tool: 'infinite', params: {} } },
        { thought: 'Step 3.', action: { tool: 'infinite', params: {} } },
        // After maxToolCalls, the loop should force a final synthesis
        { thought: 'Forced to conclude.', final_answer: 'Forced answer after max steps.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(3)
      expect(tool.execute).toHaveBeenCalledTimes(3)
      // The 4th callModel was the forced synthesis
      expect(result.finalAnswer).toBe('Forced answer after max steps.')
    })
  })

  describe('minToolCalls enforcement', () => {
    it('rejects early final_answer before minToolCalls', async () => {
      const tool = makeTool('lookup', 'data')
      const config = makeConfig({ tools: [tool], minToolCalls: 2, maxToolCalls: 5 })

      const callModel = makeCallModel([
        // Gemini tries to answer right away — should be rejected
        { thought: 'I already know.', final_answer: 'Premature answer.' },
        // After rejection, Gemini uses a tool
        { thought: 'Fine, using tool.', action: { tool: 'lookup', params: { q: 'data' } } },
        // Still need one more tool call (minToolCalls = 2)
        { thought: 'Still early.', final_answer: 'Still premature.' },
        // Second tool call
        { thought: 'Using tool again.', action: { tool: 'lookup', params: { q: 'more data' } } },
        // Now final answer allowed
        { thought: 'Now I can answer.', final_answer: 'Proper answer after 2 tools.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(2)
      expect(tool.execute).toHaveBeenCalledTimes(2)
      expect(result.finalAnswer).toBe('Proper answer after 2 tools.')
    })
  })

  describe('observation truncation', () => {
    it('truncates long observations', async () => {
      const longResult = 'x'.repeat(10000)
      const tool = makeTool('bigdata', longResult)
      const config = makeConfig({
        tools: [tool],
        minToolCalls: 1,
        maxToolCalls: 5,
        maxCharsPerObservation: 200,
      })

      const callModel = makeCallModel([
        { thought: 'Get data.', action: { tool: 'bigdata', params: {} } },
        { thought: 'Done.', final_answer: 'Summary.' },
      ])

      const result = await runReactLoop(config, callModel)

      // The observation stored in steps should be truncated
      expect(result.steps[0].observation!.length).toBeLessThanOrEqual(200)
      expect(result.steps[0].observation).toContain('[... truncated ...]')
    })
  })

  describe('token tracking', () => {
    it('sums tokens across all model calls', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      // 2 model calls: tool step + final answer = 2 * (100 input + 50 output)
      const callModel = makeCallModel([
        { thought: 'Use tool.', action: { tool: 't', params: {} } },
        { thought: 'Answer.', final_answer: 'Done.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.tokens.input).toBe(200)
      expect(result.tokens.output).toBe(100)
    })
  })

  describe('step recording', () => {
    it('records each step with thought, action, observation, and timestamp', async () => {
      const tool = makeTool('t', 'result')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      const callModel = makeCallModel([
        { thought: 'Thinking...', action: { tool: 't', params: { x: 1 } } },
        { thought: 'Got it.', final_answer: 'Answer.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(1)
      const step = result.steps[0]
      expect(step.thought).toBe('Thinking...')
      expect(step.action).toEqual({ tool: 't', params: { x: 1 } })
      expect(step.observation).toBe('result')
      expect(step.timestamp).toBeDefined()
      // Timestamp should be ISO format
      expect(new Date(step.timestamp).toISOString()).toBe(step.timestamp)
    })
  })

  describe('unknown tool handling', () => {
    it('records error observation when tool not found', async () => {
      const config = makeConfig({ tools: [makeTool('real_tool', 'ok')], minToolCalls: 1 })

      const callModel = makeCallModel([
        { thought: 'Use fake tool.', action: { tool: 'nonexistent', params: {} } },
        { thought: 'Answer.', final_answer: 'Done despite error.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].observation).toContain('nonexistent')
      expect(result.steps[0].observation).toMatch(/not found|unknown|error/i)
    })
  })

  describe('tool execution error handling', () => {
    it('captures tool execution errors as observations', async () => {
      const failTool: ReactTool = {
        name: 'fail',
        description: 'A tool that fails',
        execute: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      }
      const config = makeConfig({ tools: [failTool], minToolCalls: 1 })

      const callModel = makeCallModel([
        { thought: 'Try tool.', action: { tool: 'fail', params: {} } },
        { thought: 'Handle error.', final_answer: 'Tool failed, but I can still answer.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].observation).toContain('Database connection failed')
      expect(result.finalAnswer).toBe('Tool failed, but I can still answer.')
    })
  })

  describe('onStep callback', () => {
    it('calls onStep after each tool step', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })
      const onStep = vi.fn()

      const callModel = makeCallModel([
        { thought: 'Step 1.', action: { tool: 't', params: {} } },
        { thought: 'Step 2.', action: { tool: 't', params: {} } },
        { thought: 'Done.', final_answer: 'Answer.' },
      ])

      await runReactLoop(config, callModel, { onStep })

      expect(onStep).toHaveBeenCalledTimes(2)
      expect(onStep.mock.calls[0][0].thought).toBe('Step 1.')
      expect(onStep.mock.calls[1][0].thought).toBe('Step 2.')
    })
  })

  describe('confidence and escalation', () => {
    it('sets confidence on result', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      const callModel = makeCallModel([
        { thought: 'Use tool.', action: { tool: 't', params: {} } },
        { thought: 'Answer.', final_answer: 'A detailed, confident answer with good content.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('escalates to smart model when confidence is low', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      // First call: tool step. Second call: low-confidence final answer.
      // Third call (escalation with smart model): better answer.
      const callModel = vi.fn()
        .mockResolvedValueOnce({
          text: JSON.stringify({ thought: 'Use tool.', action: { tool: 't', params: {} } }),
          tokens: { input: 100, output: 50 },
        })
        .mockResolvedValueOnce({
          // Very short, uncertain answer => low confidence
          text: JSON.stringify({ thought: 'Unsure.', final_answer: 'i don\'t know' }),
          tokens: { input: 100, output: 50 },
        })
        .mockResolvedValueOnce({
          // Escalation call with 'smart' model
          text: JSON.stringify({ thought: 'Escalated.', final_answer: 'A much better, detailed answer with thorough explanation.' }),
          tokens: { input: 200, output: 100 },
        })

      const result = await runReactLoop(config, callModel)

      expect(result.wasEscalated).toBe(true)
      expect(result.finalAnswer).toBe('A much better, detailed answer with thorough explanation.')
      // The 3rd callModel call should use 'smart' model
      expect(callModel.mock.calls[2][1]).toBe('smart')
    })
  })

  describe('per-step timeout', () => {
    it('records timeout error when tool exceeds timeoutPerStepMs', async () => {
      const slowTool: ReactTool = {
        name: 'slow',
        description: 'A very slow tool',
        execute: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 5000))
        ),
      }
      const config = makeConfig({
        tools: [slowTool],
        minToolCalls: 1,
        timeoutPerStepMs: 100, // very short timeout
      })

      const callModel = makeCallModel([
        { thought: 'Use slow tool.', action: { tool: 'slow', params: {} } },
        { thought: 'Handle timeout.', final_answer: 'Tool timed out, answering from knowledge.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(1)
      expect(result.steps[0].observation).toMatch(/timed? ?out/i)
    })
  })

  describe('total timeout', () => {
    it('aborts loop when totalTimeoutMs is exceeded', async () => {
      const tool: ReactTool = {
        name: 'slow',
        description: 'Slow tool',
        execute: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 200))
        ),
      }
      const config = makeConfig({
        tools: [tool],
        minToolCalls: 1,
        maxToolCalls: 10,
        totalTimeoutMs: 300,  // Will expire after ~1-2 tool calls
        timeoutPerStepMs: 500,
      })

      // Keep providing tool calls
      const callModel = makeCallModel([
        { thought: 'Step 1.', action: { tool: 'slow', params: {} } },
        { thought: 'Step 2.', action: { tool: 'slow', params: {} } },
        { thought: 'Step 3.', action: { tool: 'slow', params: {} } },
        { thought: 'Step 4.', action: { tool: 'slow', params: {} } },
        { thought: 'Forced.', final_answer: 'Forced answer due to timeout.' },
      ])

      const result = await runReactLoop(config, callModel)

      // Should have fewer steps than maxToolCalls due to timeout
      expect(result.steps.length).toBeLessThan(4)
      expect(result.finalAnswer).toBeTruthy()
    })
  })

  describe('model field tracking', () => {
    it('records the model used', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      const callModel = makeCallModel([
        { thought: 'Use tool.', action: { tool: 't', params: {} } },
        { thought: 'Done.', final_answer: 'Answer.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.model).toBe('fast')
    })
  })

  describe('history context', () => {
    it('passes history to callModel as part of prompt', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({
        tools: [tool],
        minToolCalls: 1,
        history: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
      })

      const callModel = makeCallModel([
        { thought: 'Use tool.', action: { tool: 't', params: {} } },
        { thought: 'Done.', final_answer: 'Answer.' },
      ])

      await runReactLoop(config, callModel)

      // The first callModel call should include the history in the prompt
      const firstPrompt = callModel.mock.calls[0][0] as string
      expect(firstPrompt).toContain('Previous message')
      expect(firstPrompt).toContain('Previous response')
    })
  })

  describe('JSON parse resilience', () => {
    it('handles Gemini response with markdown code fences', async () => {
      const tool = makeTool('t', 'ok')
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      const callModel = vi.fn()
        .mockResolvedValueOnce({
          text: '```json\n{"thought": "Use tool.", "action": {"tool": "t", "params": {}}}\n```',
          tokens: { input: 100, output: 50 },
        })
        .mockResolvedValueOnce({
          text: '```json\n{"thought": "Done.", "final_answer": "Answer."}\n```',
          tokens: { input: 100, output: 50 },
        })

      const result = await runReactLoop(config, callModel)

      expect(result.finalAnswer).toBe('Answer.')
      expect(result.steps).toHaveLength(1)
    })
  })

  describe('edge case: zero minToolCalls', () => {
    it('allows immediate final answer when minToolCalls is 0', async () => {
      const config = makeConfig({ tools: [], minToolCalls: 0, maxToolCalls: 5 })

      const callModel = makeCallModel([
        { thought: 'I know the answer.', final_answer: 'Immediate answer.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps).toHaveLength(0)
      expect(result.finalAnswer).toBe('Immediate answer.')
    })
  })

  describe('tool result serialization', () => {
    it('handles object results from tools', async () => {
      const tool = makeTool('api', { status: 'ok', data: [1, 2, 3] })
      const config = makeConfig({ tools: [tool], minToolCalls: 1 })

      const callModel = makeCallModel([
        { thought: 'Call API.', action: { tool: 'api', params: {} } },
        { thought: 'Done.', final_answer: 'Got data.' },
      ])

      const result = await runReactLoop(config, callModel)

      expect(result.steps[0].observation).toContain('"status"')
      expect(result.steps[0].observation).toContain('"data"')
    })
  })
})
