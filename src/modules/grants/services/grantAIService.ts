/**
 * Grant AI Service - Módulo Captação
 *
 * Serviço de integração com Gemini AI para geração inteligente de
 * conteúdo de propostas de editais baseado em contexto do briefing.
 *
 * REFATORADO PARA USAR EDGE FUNCTIONS - Chamadas seguras via backend
 *
 * @module modules/grants/services/grantAIService
 */

import type { GenerateFieldPayload, BriefingData } from '../types'
import { trackAIUsage } from '../../../services/aiUsageTrackingService'
import * as EdgeFunctionService from '../../../services/edgeFunctionService'

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GrantAIService');

// ============================================
// AI FIELD GENERATION
// ============================================

/**
 * Gera conteúdo de um campo do formulário usando Gemini AI via Edge Function
 *
 * Esta função constrói um prompt contextualizado com:
 * - Texto completo do edital
 * - Critérios de avaliação e suas ponderações
 * - Configuração do campo (label, limite de caracteres, hints)
 * - Briefing completo do projeto
 * - Documento fonte do projeto (se disponível)
 * - Respostas anteriores de outros campos (para coesão)
 *
 * @param context - Contexto completo para geração
 * @returns Conteúdo gerado (respeitando limite de caracteres)
 * @throws Error se a geração falhar
 */
export async function generateFieldContent(
  context: GenerateFieldPayload
): Promise<string> {
  const startTime = Date.now()

  try {
    const result = await EdgeFunctionService.generateFieldContent({
      edital_text: context.edital_text,
      evaluation_criteria: context.evaluation_criteria,
      field_config: context.field_config,
      briefing: context.briefing,
      previous_responses: context.previous_responses,
      source_document_content: context.source_document_content,
      edital_text_content: context.edital_text_content,
      opportunity_documents_content: context.opportunity_documents_content,
      project_id: context.project_id,
    })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (result as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.0-flash-exp',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        module_id: context.project_id,
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'generate_field_content',
          field_id: context.field_config.id,
          field_label: context.field_config.label,
          max_chars: context.field_config.max_chars,
          has_source_doc: !!context.source_document_content,
          has_edital_content: !!context.edital_text_content,
          criteria_count: context.evaluation_criteria?.length || 0
        }
      }).catch(error => {
        log.warn('Non-blocking error:', error)
      })
    }
    // ========================================

    return result.generatedText
  } catch (error) {
    log.error('Erro ao gerar conteúdo:', error)
    throw new Error(
      `Falha na geração de conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }
}

// ============================================
// EDITAL STRUCTURE ANALYSIS
// ============================================

/**
 * Analisa edital completo e extrai informações estruturadas usando Gemini
 *
 * @param editalText - Texto completo do edital
 * @returns Objeto estruturado com dados do edital
 * @throws Error se a análise falhar
 */
export async function analyzeEditalStructure(editalText: string): Promise<{
  title: string;
  funding_agency: string;
  program_name: string;
  edital_number: string;
  min_funding: number | null;
  max_funding: number | null;
  counterpart_percentage: number | null;
  submission_start: string | null;
  submission_deadline: string;
  result_date: string | null;
  eligible_themes: string[];
  eligibility_requirements: Record<string, any>;
  evaluation_criteria: Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    min_score: number;
    max_score: number;
  }>;
  form_fields: Array<{
    id: string;
    label: string;
    max_chars: number;
    required: boolean;
    ai_prompt_hint: string;
    placeholder: string;
  }>;
  external_system_url: string | null;
}> {
  const startTime = Date.now()

  try {
    const data = await EdgeFunctionService.analyzeEditalStructure({ editalText })

    log.debug('Análise do edital concluída:', {
      title: data.title,
      criteriaCount: data.evaluation_criteria?.length || 0,
      fieldsCount: data.form_fields?.length || 0
    })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (data as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.0-flash-exp',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'analyze_edital_structure',
          edital_length: editalText.length,
          criteria_extracted: data.evaluation_criteria?.length || 0,
          fields_extracted: data.form_fields?.length || 0,
          has_funding_info: !!(data.min_funding || data.max_funding)
        }
      }).catch(error => {
        log.warn('Non-blocking error:', error)
      })
    }
    // ========================================

    return data
  } catch (error) {
    log.error('Erro ao analisar edital:', error)
    throw new Error('Falha ao analisar o edital. Verifique o conteúdo do PDF.')
  }
}

// ============================================
// FORM FIELDS PARSING
// ============================================

/**
 * Parseia texto colado pelo usuário e extrai os campos do formulário
 *
 * O usuário pode colar texto em formato livre como:
 * "1. Apresentação da Empresa (máx 3000 caracteres)
 *  2. Descrição do Projeto (máx 5000 caracteres)"
 *
 * A IA identifica:
 * - Quantas perguntas existem
 * - Nome/label de cada pergunta
 * - Limite de caracteres
 *
 * @param pastedText - Texto colado pelo usuário
 * @returns Array de campos estruturados
 * @throws Error se parsing falhar
 */
export async function parseFormFieldsFromText(pastedText: string): Promise<Array<{
  id: string;
  label: string;
  max_chars: number;
  required: boolean;
  ai_prompt_hint: string;
  placeholder: string;
}>> {
  const startTime = Date.now()

  try {
    const result = await EdgeFunctionService.parseFormFields({ text: pastedText })

    log.debug('Campos do formulário parseados:', {
      count: result.fields.length,
      fields: result.fields.map((f) => ({ label: f.label, max_chars: f.max_chars }))
    })

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usageMetadata = (result as any).__usageMetadata
    if (usageMetadata) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: (result as any).model || 'gemini-2.0-flash-exp',
        input_tokens: usageMetadata.promptTokenCount || 0,
        output_tokens: usageMetadata.candidatesTokenCount || 0,
        module_type: 'grants',
        duration_seconds: (Date.now() - startTime) / 1000,
        request_metadata: {
          use_case: 'parse_form_fields',
          input_text_length: pastedText.length,
          fields_parsed: result.fields.length
        }
      }).catch(error => {
        log.warn('Non-blocking error:', error)
      })
    }
    // ========================================

    return result.fields
  } catch (error) {
    log.error('Erro ao parsear campos do formulário:', error)
    throw new Error('Falha ao analisar os campos. Verifique o formato do texto.')
  }
}

// ============================================
// PDF EXTRACTION (Placeholder)
// ============================================

/**
 * Extrai texto de um PDF de edital
 *
 * @param pdfPath - Caminho do arquivo PDF
 * @returns Texto extraído do PDF
 * @throws Error se a extração falhar
 *
 * @todo Implementar integração com serviço de extração de PDF
 * Por enquanto retorna string vazia como placeholder
 */
export async function extractEditalText(pdfPath: string): Promise<string> {
  log.warn(
    'extractEditalText() ainda não implementado. ' +
    'Integre com o microserviço de extração de PDF (VITE_PDF_EXTRACTOR_URL) ' +
    'ou use uma biblioteca cliente como pdf-parse ou pdfjs-dist.'
  )

  // Placeholder - retornar vazio por enquanto
  return ''

  /*
   * Exemplo de implementação futura:
   *
   * const response = await fetch(`${import.meta.env.VITE_PDF_EXTRACTOR_URL}/extract`, {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({ pdf_path: pdfPath })
   * })
   *
   * const data = await response.json()
   * return data.text || ''
   */
}
