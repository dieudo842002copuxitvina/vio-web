import Anthropic from '@anthropic-ai/sdk'

// Shared Anthropic client for all AI features.
// Model: claude-sonnet-4-6 — best balance of quality and cost for production use.
export const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const AI_MODEL = 'claude-sonnet-4-6' as const
