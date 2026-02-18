/**
 * Briefing AI Service - Geração automática de briefing com IA
 *
 * REFATORADO PARA USAR EDGE FUNCTIONS - Chamadas seguras via backend
 */

import type { BriefingData, FormField } from '../types'
import * as EdgeFunctionService from '../../../services/edgeFunctionService'
import { trackAIUsage } from '../../../services/aiUsageTrackingService'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('BriefingAIService');

/**
 * Contexto para geração de briefing
 */
export interface BriefingGenerationContext {
  companyName?: string
  projectIdea?: string
  editalTitle?: string
  editalText?: string
  /** Conteúdo do documento fonte (PDF, MD, TXT, DOCX) - PRINCIPAL FONTE DE DADOS */
  sourceDocumentContent?: string | null
  /** Campos dinâmicos do edital para extração */
  formFields?: FormField[]
}

/**
 * Gera briefing completo automaticamente com base no documento fonte
 *
 * IMPORTANTE: Esta função EXTRAI informações do documento fonte fornecido.
 * NÃO inventa dados se o documento não for fornecido.
 *
 * @param context - Contexto incluindo o documento fonte e campos dinâmicos
 * @returns Briefing extraído do documento (Record<string, string> para campos dinâmicos)
 * @throws Error se documento fonte não for fornecido ou API falhar
 */
export async function generateAutoBriefing(context: BriefingGenerationContext): Promise<Record<string, string>> {
  const startTime = Date.now()

  try {
    const result = await EdgeFunctionService.generateAutoBriefing({
      companyName: context.companyName,
      projectIdea: context.projectIdea,
      editalTitle: context.editalTitle,
      editalText: context.editalText,
      sourceDocumentContent: context.sourceDocumentContent,
      formFields: context.formFields,
    })

    log.debug('Briefing gerado com sucesso:', {
      fields: Object.keys(result.briefing).length,
      totalChars: JSON.stringify(result.briefing).length
    })

    // Log detalhado de cada campo para debug
    log.debug('Campos extraídos:')
    Object.entries(result.briefing).forEach(([key, value]) => {
      const preview = typeof value === 'string'
        ? value.substring(0, 100) + (value.length > 100 ? '...' : '')
        : `[TIPO INVÁLIDO: ${typeof value}]`
      log.debug(`  - ${key}: ${preview}`)
    })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (result as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.5-flash',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'generate_auto_briefing',
          has_source_document: !!context.sourceDocumentContent,
          source_doc_length: context.sourceDocumentContent?.length || 0,
          form_fields_count: context.formFields?.length || 0,
          fields_extracted: Object.keys(result.briefing).length
        }
      }).catch(error => {
        log.warn('Grants AI Tracking - Non-blocking error:', { error })
      })
    }
    // ========================================

    return result.briefing
  } catch (error) {
    log.error('Erro ao gerar briefing automático:', { error })
    throw new Error('Falha ao gerar briefing. Tente preencher manualmente.')
  }
}

/**
 * Melhora/expande um campo específico do briefing
 */
export async function improveBriefingField(
  fieldId: keyof BriefingData,
  currentContent: string,
  allBriefing: BriefingData
): Promise<string> {
  const startTime = Date.now()

  try {
    const result = await EdgeFunctionService.improveBriefingField({
      fieldId,
      currentContent,
      allBriefing,
    })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (result as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.5-flash',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'improve_briefing_field',
          field_id: fieldId as string,
          current_length: currentContent.length,
          improved_length: result.improvedText.length
        }
      }).catch(error => {
        log.warn('Grants AI Tracking - Non-blocking error:', { error })
      })
    }
    // ========================================

    return result.improvedText
  } catch (error) {
    log.error('Erro ao melhorar campo:', { error })
    throw new Error('Falha ao melhorar o texto.')
  }
}

// ============================================================================
// FORM FIELDS EXTRACTION
// ============================================================================

export interface ParsedFormField {
  label: string
  maxChars?: number
  required?: boolean
  hint?: string
  placeholder?: string
}

/**
 * Parse form fields from pasted text using AI
 * Extracts question labels, character limits, and requirements
 */
export async function parseFormFieldsFromText(text: string): Promise<ParsedFormField[]> {
  try {
    const result = await EdgeFunctionService.parseFormFields({ text })

    log.debug('Parsed form fields:', { count: result.fields.length })

    // Convert Edge Function format to ParsedFormField format
    return result.fields.map(f => ({
      label: f.label,
      maxChars: f.max_chars,
      required: f.required,
      hint: f.ai_prompt_hint,
      placeholder: f.placeholder,
    }))
  } catch (error) {
    log.error('Erro ao extrair campos do formulário:', { error })
    throw new Error('Falha ao extrair campos. Tente adicionar manualmente.')
  }
}

// ============================================================================
// REQUIRED DOCUMENTS EXTRACTION
// ============================================================================

export interface ExtractedDocument {
  name: string
  description?: string
  dueDate?: string
}

/**
 * Extract required documents list from edital PDF content
 */
export async function extractRequiredDocuments(pdfContent: string): Promise<ExtractedDocument[]> {
  const startTime = Date.now()

  try {
    const result = await EdgeFunctionService.extractRequiredDocuments({ pdfContent })

    log.debug('Extracted required documents:', { count: result.documents.length })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (result as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.5-flash',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'extract_required_documents',
          pdf_content_length: pdfContent.length,
          documents_extracted: result.documents.length
        }
      }).catch(error => {
        log.warn('Grants AI Tracking - Non-blocking error:', { error })
      })
    }
    // ========================================

    return result.documents
  } catch (error) {
    log.error('Erro ao extrair documentos do edital:', { error })
    throw new Error('Falha ao extrair documentos. Adicione manualmente.')
  }
}

// ============================================================================
// TIMELINE EXTRACTION
// ============================================================================

export interface ExtractedPhase {
  name: string
  description?: string
  date: string
}

/**
 * Extract timeline phases from edital PDF content
 */
export async function extractTimelinePhases(pdfContent: string): Promise<ExtractedPhase[]> {
  const startTime = Date.now()

  try {
    const result = await EdgeFunctionService.extractTimelinePhases({ pdfContent })

    log.debug('Extracted timeline phases:', { count: result.phases.length })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (result as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.5-flash',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'extract_timeline_phases',
          pdf_content_length: pdfContent.length,
          phases_extracted: result.phases.length
        }
      }).catch(error => {
        log.warn('Grants AI Tracking - Non-blocking error:', { error })
      })
    }
    // ========================================

    return result.phases
  } catch (error) {
    log.error('Erro ao extrair cronograma do edital:', { error })
    throw new Error('Falha ao extrair cronograma. Adicione manualmente.')
  }
}
