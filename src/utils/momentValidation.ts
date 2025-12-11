/**
 * Moment Validation Utility
 * Comprehensive validation for moment creation inputs
 *
 * Provides:
 * - Input validation
 * - XSS prevention
 * - Field sanitization
 * - Error messages
 */

import {
  CreateMomentEntryInput,
  LifeArea,
  MomentCategory,
  ValidationResult,
} from '@/modules/journey/types/persistenceTypes'
import { AVAILABLE_EMOTIONS } from '@/modules/journey/types/moment'

/**
 * Validate moment creation input
 * @param input - User-provided moment input
 * @returns Validation result with errors/warnings
 */
export function validateMomentInput(input: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const validatedInput: Partial<CreateMomentEntryInput> = {}

  // Validate userId (required)
  if (!input.userId || typeof input.userId !== 'string' || input.userId.trim().length === 0) {
    errors.push('userId is required and must be a non-empty string')
  } else {
    validatedInput.userId = input.userId.trim()
  }

  // Validate emotion (required)
  if (!input.emotionSelected || typeof input.emotionSelected !== 'string') {
    errors.push('emotionSelected is required')
  } else {
    const validEmotion = AVAILABLE_EMOTIONS.find(e => e.value === input.emotionSelected)
    if (!validEmotion) {
      errors.push(`emotionSelected must be one of: ${AVAILABLE_EMOTIONS.map(e => e.value).join(', ')}`)
    } else {
      validatedInput.emotionSelected = input.emotionSelected
    }
  }

  // Validate emotion intensity (required, 1-10)
  if (typeof input.emotionIntensity !== 'number') {
    errors.push('emotionIntensity is required and must be a number')
  } else if (input.emotionIntensity < 1 || input.emotionIntensity > 10) {
    errors.push('emotionIntensity must be between 1 and 10')
  } else {
    validatedInput.emotionIntensity = Math.round(input.emotionIntensity)
  }

  // Validate life areas (required, at least one)
  if (!Array.isArray(input.lifeAreas)) {
    errors.push('lifeAreas is required and must be an array')
  } else if (input.lifeAreas.length === 0) {
    errors.push('At least one lifeArea must be selected')
  } else {
    const validAreas: LifeArea[] = []
    const validAreaValues: LifeArea[] = [
      'health',
      'relationships',
      'work',
      'finance',
      'personal-growth',
      'spirituality',
      'creativity',
      'learning',
    ]

    for (const area of input.lifeAreas) {
      if (validAreaValues.includes(area)) {
        validAreas.push(area)
      } else {
        warnings.push(`Unknown life area: ${area}`)
      }
    }

    if (validAreas.length === 0) {
      errors.push(`lifeAreas must contain valid areas: ${validAreaValues.join(', ')}`)
    } else {
      validatedInput.lifeAreas = validAreas
    }
  }

  // Validate content (optional, but at least one of content/audio required)
  if (input.content !== undefined && input.content !== null) {
    const sanitized = sanitizeText(input.content)
    if (sanitized.length > 10000) {
      errors.push('Content must be less than 10,000 characters')
    } else if (sanitized.length > 0) {
      validatedInput.content = sanitized
    } else if (!input.audioFile) {
      warnings.push('Content is empty. Make sure to provide audio if no text is provided.')
    }
  }

  // Validate audio (optional)
  if (input.audioFile !== undefined && input.audioFile !== null) {
    if (!(input.audioFile instanceof Blob)) {
      errors.push('audioFile must be a Blob')
    } else if (input.audioFile.size === 0) {
      errors.push('audioFile cannot be empty')
    } else if (input.audioFile.size > 25 * 1024 * 1024) {
      // 25MB limit
      errors.push('audioFile must be less than 25MB')
    } else {
      validatedInput.audioFile = input.audioFile
    }
  }

  // Validate that at least one content source exists
  if (!validatedInput.content && !validatedInput.audioFile) {
    errors.push('Either content or audioFile must be provided')
  }

  // Validate tags (optional)
  if (input.tags !== undefined && input.tags !== null) {
    if (!Array.isArray(input.tags)) {
      warnings.push('tags must be an array, ignoring')
    } else {
      const validTags = input.tags
        .filter((tag: any) => typeof tag === 'string')
        .map((tag: string) => sanitizeTag(tag))
        .filter((tag: string) => tag.length > 0)
        .slice(0, 10) // Max 10 tags

      if (validTags.length > 0) {
        validatedInput.tags = validTags
      }
    }
  }

  // Validate moment type (optional)
  if (input.momentType !== undefined && input.momentType !== null) {
    const validCategories: MomentCategory[] = ['reflection', 'milestone', 'challenge', 'learning', 'breakthrough']
    if (!validCategories.includes(input.momentType)) {
      warnings.push(`Unknown momentType: ${input.momentType}, ignoring`)
    } else {
      validatedInput.momentType = input.momentType
    }
  }

  // Validate happened_at (optional)
  if (input.happened_at !== undefined && input.happened_at !== null) {
    const date = new Date(input.happened_at)
    if (isNaN(date.getTime())) {
      warnings.push('happened_at is not a valid date, ignoring')
    } else if (date > new Date()) {
      warnings.push('happened_at cannot be in the future, ignoring')
    } else {
      validatedInput.happened_at = date
    }
  }

  // Validate location (optional)
  if (input.location !== undefined && input.location !== null) {
    const sanitized = sanitizeText(input.location)
    if (sanitized.length > 200) {
      warnings.push('location is too long, truncating')
      validatedInput.location = sanitized.substring(0, 200)
    } else if (sanitized.length > 0) {
      validatedInput.location = sanitized
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validatedInput: validatedInput as CreateMomentEntryInput,
  }
}

/**
 * Sanitize text input to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return ''

  return text
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
}

/**
 * Sanitize tag input
 */
export function sanitizeTag(tag: string): string {
  if (typeof tag !== 'string') return ''

  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

/**
 * Check if content has XSS vulnerabilities
 */
export function hasXSSPatterns(text: string): boolean {
  if (typeof text !== 'string') return false

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /eval\(/gi,
  ]

  return xssPatterns.some(pattern => pattern.test(text))
}

/**
 * Validate emotional intensity is reasonable
 */
export function isValidEmotionIntensity(intensity: number): boolean {
  return typeof intensity === 'number' && intensity >= 1 && intensity <= 10
}

/**
 * Validate life areas
 */
export function isValidLifeArea(area: string): area is LifeArea {
  const validAreas: LifeArea[] = [
    'health',
    'relationships',
    'work',
    'finance',
    'personal-growth',
    'spirituality',
    'creativity',
    'learning',
  ]
  return validAreas.includes(area as LifeArea)
}

/**
 * Check if moment has both text and audio (for 'both' type detection)
 */
export function hasMultipleContentTypes(input: CreateMomentEntryInput): boolean {
  return !!(input.content && input.content.trim().length > 0 && input.audioFile)
}

/**
 * Estimate CP points for a moment based on characteristics
 */
export function estimateBaseCP(input: CreateMomentEntryInput): number {
  let points = 5 // Base points for registering

  // Bonus for content length
  if (input.content && input.content.length > 100) points += 3
  if (input.content && input.content.length > 300) points += 2

  // Bonus for audio
  if (input.audioFile) points += 5

  // Bonus for emotion intensity
  if (input.emotionIntensity >= 8) points += 2

  // Bonus for multiple life areas
  if (input.lifeAreas && input.lifeAreas.length >= 2) points += 2

  // Bonus for custom tags
  if (input.tags && input.tags.length > 0) points += 1

  return Math.min(points, 25) // Cap at 25 points base
}

/**
 * Generate validation summary message
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return 'Input is valid'
  }

  const parts: string[] = []

  if (!result.valid) {
    parts.push(`${result.errors.length} error(s)`)
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`)
  }

  return parts.join(', ')
}

/**
 * Rate limiting: Check if user is creating moments too frequently
 * Returns true if rate limit is NOT exceeded
 */
export function checkRateLimit(lastMomentCreatedAt: Date | null, maxPerDay: number = 100): boolean {
  if (!lastMomentCreatedAt) return true

  const now = new Date()
  const timeSinceLastMoment = now.getTime() - lastMomentCreatedAt.getTime()

  // Minimum 1 second between moments
  const minIntervalMs = 1000

  return timeSinceLastMoment >= minIntervalMs
}

/**
 * Validate batch of moments
 */
export function validateMomentBatch(inputs: any[]): {
  valid: CreateMomentEntryInput[]
  invalid: { input: any; result: ValidationResult }[]
} {
  const valid: CreateMomentEntryInput[] = []
  const invalid: { input: any; result: ValidationResult }[] = []

  for (const input of inputs) {
    const result = validateMomentInput(input)
    if (result.valid) {
      valid.push(result.validatedInput!)
    } else {
      invalid.push({ input, result })
    }
  }

  return { valid, invalid }
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    'userId is required': 'Erro: Usuario nao identificado',
    'emotionSelected is required': 'Por favor, selecione uma emocao',
    'emotionIntensity is required': 'Por favor, indique a intensidade da emocao',
    'emotionIntensity must be between 1 and 10': 'A intensidade deve estar entre 1 e 10',
    'lifeAreas is required': 'Por favor, selecione pelo menos uma area da vida',
    'At least one lifeArea must be selected': 'Por favor, selecione pelo menos uma area da vida',
    'Either content or audioFile must be provided': 'Por favor, forneça texto ou arquivo de audio',
    'Content must be less than 10,000 characters': 'Seu texto é muito longo (maximo 10.000 caracteres)',
    'audioFile must be less than 25MB': 'Seu arquivo de audio é muito grande (maximo 25MB)',
  }

  return errorMap[error] || `Erro: ${error}`
}
