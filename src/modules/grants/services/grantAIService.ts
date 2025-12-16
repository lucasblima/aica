/**
 * Grant AI Service - Módulo Captação
 *
 * Serviço de integração com Gemini AI para geração inteligente de
 * conteúdo de propostas de editais baseado em contexto do briefing.
 *
 * @module modules/grants/services/grantAIService
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { GenerateFieldPayload, BriefingData } from '../types'
import { trackAIUsage, extractGeminiUsageMetadata } from '../../../services/aiUsageTrackingService'

// Inicializar cliente Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
if (!apiKey) {
  console.warn('VITE_GEMINI_API_KEY não configurada. Funcionalidades de IA estarão limitadas.')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

// Modelo recomendado para tarefas de escrita técnica
const MODEL_NAME = 'gemini-2.0-flash-exp'

// ============================================
// UTILIDADE: SANITIZAÇÃO DE RESPOSTA JSON
// ============================================

/**
 * Sanitiza a resposta da IA antes de fazer JSON.parse
 * 
 * Trata casos comuns de formatação incorreta:
 * - Blocos de código markdown (```json ... ```)
 * - Texto antes ou depois do JSON ("Aqui está: {...}")
 * - Aspas simples em vez de duplas
 * - Vírgulas extras no final de arrays/objetos
 * - Quebras de linha problemáticas dentro de strings
 * 
 * @param response - Texto bruto retornado pela IA
 * @returns JSON limpo e pronto para parse
 */
function sanitizeAIJsonResponse(response: string): string {
  let cleaned = response;

  // 1. Remove blocos de código markdown
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // 2. Remove BOM e caracteres invisíveis do início
  cleaned = cleaned.replace(/^\uFEFF/, '').trimStart();

  // 3. Encontra o início do JSON (primeiro { ou [)
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIndex = -1;
  let endChar = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endChar = ']';
  }

  if (startIndex === -1) {
    console.error('[AI] Nenhum JSON encontrado na resposta');
    return cleaned.trim();
  }

  // 4. Encontra o final do JSON (último } ou ] correspondente)
  const lastEndChar = cleaned.lastIndexOf(endChar);

  if (lastEndChar > startIndex) {
    cleaned = cleaned.substring(startIndex, lastEndChar + 1);
  } else {
    cleaned = cleaned.substring(startIndex);
  }

  // 5. Remove vírgulas extras antes de } ou ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // 6. Tenta corrigir aspas simples em chaves (caso comum)
  // Cuidado: não substitui aspas dentro de valores de string
  // Esta é uma tentativa heurística
  cleaned = cleaned.replace(/'([^']+)'\s*:/g, '"$1":');

  return cleaned.trim();
}

/**
 * Tenta fazer parse de JSON com fallback e logs detalhados
 */
function safeJsonParse<T>(jsonString: string, context: string): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    // Log detalhado para debug
    console.error(`[AI] Erro de JSON em ${context}:`, error);
    console.error('[AI] Posição aproximada do erro:', (error as SyntaxError).message);
    console.error('[AI] Primeiros 500 caracteres:', jsonString.substring(0, 500));
    console.error('[AI] Últimos 500 caracteres:', jsonString.substring(jsonString.length - 500));

    // Tenta uma limpeza mais agressiva
    const aggressive = jsonString
      .replace(/[\n\r\t]/g, ' ')  // Remove quebras de linha
      .replace(/\s+/g, ' ')       // Normaliza espaços
      .replace(/,\s*([}\]])/g, '$1'); // Remove vírgulas extras novamente

    try {
      console.log('[AI] Tentando parse com limpeza agressiva...');
      return JSON.parse(aggressive);
    } catch {
      throw new Error(
        `A IA retornou um formato de JSON inválido. ` +
        `Erro original: ${(error as Error).message}. ` +
        `Tente novamente.`
      );
    }
  }
}

// ============================================
// AI FIELD GENERATION
// ============================================

/**
 * Gera conteúdo de um campo do formulário usando Gemini AI
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
 * @throws Error se a geração falhar ou API key não estiver configurada
 */
export async function generateFieldContent(
  context: GenerateFieldPayload
): Promise<string> {
  if (!genAI) {
    throw new Error(
      'API Key do Gemini não configurada. Configure VITE_GEMINI_API_KEY no arquivo .env'
    )
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    // Construir prompt do sistema
    const systemPrompt = buildSystemPrompt(
      context.edital_text,
      context.evaluation_criteria
    )

    // Construir prompt do usuário (com edital PDF + documentos do edital + documentos do projeto)
    const userPrompt = buildUserPrompt(
      context.field_config,
      context.briefing,
      context.previous_responses,
      context.source_document_content,
      context.edital_text_content,
      context.opportunity_documents_content
    )

    // Fazer chamada ao Gemini
    const maxTokens = Math.ceil(context.field_config.max_chars * 2)

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            { text: userPrompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      }
    })

    const response = await result.response
    let generatedText = response.text()

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usage = extractGeminiUsageMetadata(response)
    if (usage) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: MODEL_NAME,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        module_type: 'grants',
        module_id: context.project_id,
        request_metadata: {
          action: 'generate_field_content',
          field_id: context.field_config.id,
          field_label: context.field_config.label,
          max_chars: context.field_config.max_chars,
        }
      }).catch(err => {
        // Tracking não deve interromper fluxo principal
        console.warn('[Grants] Falha no tracking de IA:', err)
      })
    }
    // ========================================

    // Truncar inteligentemente se exceder limite
    generatedText = truncateToCharLimit(
      generatedText,
      context.field_config.max_chars
    )

    return generatedText
  } catch (error) {
    console.error('Erro ao gerar conteúdo com Gemini:', error)
    throw new Error(
      `Falha na geração de conteúdo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }
}

/**
 * Constrói o prompt de sistema com contexto do edital
 *
 * @param editalText - Texto completo do edital
 * @param criteria - Critérios de avaliação
 * @returns Prompt de sistema formatado
 */
function buildSystemPrompt(
  editalText: string,
  criteria: GenerateFieldPayload['evaluation_criteria']
): string {
  let prompt = `Você é um especialista em redação de propostas para editais de fomento à inovação no Brasil.

Sua tarefa é escrever respostas técnicas, objetivas e persuasivas para campos de formulários de inscrição em editais.

**CONTEXTO DO EDITAL:**
${editalText ? editalText : 'Não fornecido. Use o contexto dos critérios de avaliação.'}

`

  if (criteria && criteria.length > 0) {
    prompt += `**CRITÉRIOS DE AVALIAÇÃO:**
Os avaliadores considerarão os seguintes critérios (ordenados por peso):

`
    criteria.forEach(c => {
      prompt += `- **${c.name}** (Peso: ${c.weight}/10, Pontuação: ${c.min_score}-${c.max_score}): ${c.description}\n`
    })

    prompt += `\nGaranta que sua resposta maximize a pontuação nesses critérios.
`
  }

  prompt += `
**DIRETRIZES DE REDAÇÃO:**
1. Use linguagem técnica, mas acessível
2. Seja objetivo e direto ao ponto
3. Inclua dados quantitativos quando possível (ex: "R$ X milhões", "crescimento de Y%", etc.)
4. Demonstre conhecimento do mercado e dos desafios técnicos
5. Mostre diferenciais competitivos claros
6. Relacione sua resposta aos critérios de avaliação
7. Use parágrafos curtos e estruturados
8. Evite jargões excessivos ou linguagem genérica

Escreva de forma que o avaliador perceba expertise, viabilidade técnica e potencial de impacto.
`

  return prompt
}

/**
 * Constrói o prompt do usuário com contexto específico do campo
 *
 * HIERARQUIA DE CONTEXTO (do mais importante para o menos):
 * 1. Edital PDF Principal (texto extraído do PDF oficial do edital)
 * 2. Documentos Adicionais do Edital (anexos, regulamentos, tabelas - compartilhados entre projetos)
 * 3. Documentos do Projeto (arquivos enviados pelo usuário específicos deste projeto)
 * 4. Briefing (respostas manuais do usuário)
 * 5. Respostas Anteriores (para coesão)
 *
 * @param fieldConfig - Configuração do campo
 * @param briefing - Briefing do projeto
 * @param previousResponses - Respostas anteriores de outros campos
 * @param sourceDocumentContent - Conteúdo extraído dos documentos do projeto (opcional)
 * @param editalTextContent - Conteúdo extraído do PDF principal do edital (opcional)
 * @param opportunityDocumentsContent - Conteúdo dos documentos adicionais do edital (opcional)
 * @returns Prompt do usuário formatado
 */
function buildUserPrompt(
  fieldConfig: GenerateFieldPayload['field_config'],
  briefing: Record<string, string>,
  previousResponses?: Record<string, string>,
  sourceDocumentContent?: string | null,
  editalTextContent?: string | null,
  opportunityDocumentsContent?: string | null
): string {
  let prompt = `**CAMPO A SER PREENCHIDO:**
${fieldConfig.label}
`

  if (fieldConfig.ai_prompt_hint) {
    prompt += `Dica: ${fieldConfig.ai_prompt_hint}\n`
  }

  prompt += `Limite de caracteres: ${fieldConfig.max_chars}
Obrigatório: ${fieldConfig.required ? 'Sim' : 'Não'}

`

  // 1. PRIORIDADE MÁXIMA: Edital PDF Principal (contexto compartilhado para todos os projetos)
  if (editalTextContent && editalTextContent.trim().length > 0) {
    prompt += `**📋 EDITAL OFICIAL (PRIORIDADE MÁXIMA - Requisitos e Critérios do Edital):**

${editalTextContent.substring(0, 20000)}

⚠️ CRÍTICO: Este é o texto extraído do PDF oficial do edital. Use as informações acima para garantir que sua resposta está ALINHADA com os requisitos, critérios de avaliação, e diretrizes do edital.

`
  }

  // 2. PRIORIDADE ALTA: Documentos Adicionais do Edital (anexos, regulamentos, tabelas de critérios)
  if (opportunityDocumentsContent && opportunityDocumentsContent.trim().length > 0) {
    prompt += `**📎 DOCUMENTOS COMPLEMENTARES DO EDITAL (Anexos e Regulamentos Compartilhados):**

${opportunityDocumentsContent.substring(0, 15000)}

⚠️ IMPORTANTE: Estes são documentos adicionais do edital (regulamentos, tabelas de critérios, anexos). Use estas informações para complementar o entendimento do edital principal.

`
  }

  // 3. PRIORIDADE MÉDIA: Documentos do Projeto (informações específicas deste projeto)
  if (sourceDocumentContent && sourceDocumentContent.trim().length > 0) {
    prompt += `**📄 DOCUMENTOS DO PROJETO (Fonte de Verdade sobre este Projeto Específico):**

${sourceDocumentContent.substring(0, 15000)}

⚠️ IMPORTANTE: Estes são documentos oficiais fornecidos pelo usuário sobre ESTE projeto específico. Use as informações acima como base principal para personalizar sua resposta. O briefing abaixo é complementar.

`
  }

  // Adicionar briefing (DINÂMICO - itera sobre todos os campos)
  prompt += `**CONTEXTO DO PROJETO (Briefing fornecido pelo usuário):**

`

  // Iterar sobre TODOS os campos do briefing dinamicamente
  Object.entries(briefing).forEach(([fieldId, content]) => {
    if (content && content.trim().length > 0) {
      // Converter field_id para título legível
      const fieldLabel = fieldId
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      prompt += `**${fieldLabel}:**
${content}

`
    }
  });

  // Adicionar respostas anteriores para coesão
  if (previousResponses && Object.keys(previousResponses).length > 0) {
    prompt += `**RESPOSTAS JÁ FORNECIDAS EM OUTROS CAMPOS:**
(Use para garantir coesão e evitar repetições)

`
    Object.entries(previousResponses).forEach(([fieldId, content]) => {
      prompt += `Campo ${fieldId}: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}\n\n`
    })
  }

  prompt += `**TAREFA:**
Escreva uma resposta completa e persuasiva para o campo "${fieldConfig.label}", respeitando o limite de ${fieldConfig.max_chars} caracteres.

Sua resposta:`

  return prompt
}

/**
 * Trunca texto inteligentemente para respeitar limite de caracteres
 *
 * Tenta truncar em uma quebra de parágrafo ou frase completa
 * para manter a qualidade do texto.
 *
 * @param text - Texto a ser truncado
 * @param maxChars - Limite de caracteres
 * @returns Texto truncado
 */
function truncateToCharLimit(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }

  // Tentar truncar em um parágrafo completo
  const paragraphs = text.split('\n\n')
  let result = ''

  for (const para of paragraphs) {
    if ((result + para).length <= maxChars - 10) {
      result += para + '\n\n'
    } else {
      break
    }
  }

  if (result.trim().length > 0) {
    return result.trim()
  }

  // Se não conseguiu preservar parágrafos, truncar em frase completa
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  result = ''

  for (const sentence of sentences) {
    if ((result + sentence).length <= maxChars - 10) {
      result += sentence
    } else {
      break
    }
  }

  if (result.trim().length > 0) {
    return result.trim()
  }

  // Último recurso: truncar bruscamente
  return text.substring(0, maxChars - 3) + '...'
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
  console.warn(
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

// ============================================
// EDITAL STRUCTURE ANALYSIS (Placeholder)
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
  if (!genAI) {
    throw new Error('API Key do Gemini não configurada');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3, // Mais determinístico para extração
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8000,
      },
    });

    const systemPrompt = `Você é um especialista em análise de editais de fomento à inovação no Brasil.

Sua tarefa é extrair TODAS as informações estruturadas de um edital e retornar um JSON válido.

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON, sem texto adicional antes ou depois
2. Use aspas duplas em todas as strings
3. Todos os campos são obrigatórios (use null se não encontrar)
4. Datas no formato ISO: "YYYY-MM-DD"
5. Valores monetários como números (sem R$, pontos ou vírgulas)
6. IDs em snake_case e sem acentos

ESTRUTURA DO JSON:
{
  "title": "Título completo do edital",
  "funding_agency": "Agência de fomento (FAPERJ, FINEP, etc)",
  "program_name": "Nome do programa",
  "edital_number": "Número do edital (ex: 32/2025)",
  "min_funding": 375000,
  "max_funding": 600000,
  "counterpart_percentage": 5.0,
  "submission_start": "2025-01-15",
  "submission_deadline": "2025-03-31",
  "result_date": "2025-06-30",
  "eligible_themes": ["Saúde", "Biotecnologia", "TI/Software"],
  "eligibility_requirements": {
    "min_company_age_years": 2,
    "must_have_cnpj": true,
    "headquarter_location": "Rio de Janeiro",
    "additional_requirements": "Outros requisitos mencionados"
  },
  "evaluation_criteria": [
    {
      "id": "innovation",
      "name": "Grau de Inovação",
      "description": "Descrição do critério",
      "weight": 30,
      "min_score": 7,
      "max_score": 10
    }
  ],
  "form_fields": [
    {
      "id": "company_presentation",
      "label": "Apresentação da Empresa",
      "max_chars": 3000,
      "required": true,
      "ai_prompt_hint": "Descreva histórico, porte, setor de atuação",
      "placeholder": "Descreva a empresa..."
    }
  ],
  "external_system_url": "https://sistema.gov.br"
}

CRITÉRIOS DE AVALIAÇÃO:
- Identifique TODOS os critérios de pontuação/avaliação
- Extraia os pesos (percentuais)
- Identifique pontuações mínimas e máximas
- Se não houver pesos explícitos, distribua igualmente

CAMPOS DO FORMULÁRIO:
- Identifique TODOS os campos que a empresa precisa preencher
- Estime limites de caracteres razoáveis baseado na complexidade
- Marque como required se o edital indicar obrigatoriedade
- Crie dicas úteis para o ai_prompt_hint

ATENÇÃO: Retorne APENAS o JSON, começando com { e terminando com }`;

    const userPrompt = `Analise este edital e retorne o JSON estruturado:

${editalText.substring(0, 50000)}`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = result.response;
    const rawText = response.text();

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usage = extractGeminiUsageMetadata(response)
    if (usage) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: MODEL_NAME,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        module_type: 'grants',
        request_metadata: {
          action: 'analyze_edital_structure',
          edital_length: editalText.length,
        }
      }).catch(err => {
        console.warn('[Grants] Falha no tracking de IA:', err)
      })
    }
    // ========================================

    // Sanitizar resposta da IA
    const jsonText = sanitizeAIJsonResponse(rawText);
    console.log('[AI] Resposta sanitizada, tamanho:', jsonText.length);

    // Parse JSON com tratamento de erro robusto
    type EditalStructure = {
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
    };

    const data = safeJsonParse<EditalStructure>(jsonText, 'analyzeEditalStructure');

    console.log('[AI] Análise do edital concluída:', {
      title: data.title,
      criteriaCount: data.evaluation_criteria?.length || 0,
      fieldsCount: data.form_fields?.length || 0
    });

    return data;
  } catch (error) {
    console.error('Erro ao analisar edital:', error);
    throw new Error('Falha ao analisar o edital. Verifique o conteúdo do PDF.');
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
  if (!genAI) {
    throw new Error('API Key do Gemini não configurada');
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.2, // Muito determinístico para parsing
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4000,
      },
    });

    const systemPrompt = `Você é um especialista em análise de formulários de editais.

Sua tarefa é parsear um texto colado pelo usuário e extrair os campos do formulário.

REGRAS:
1. Identifique TODAS as perguntas/campos mencionados
2. Extraia o nome/label de cada campo
3. Identifique o limite de caracteres (pode estar como "máx X caracteres", "até X caracteres", "X chars", etc)
4. Se não houver limite explícito, estime um valor razoável (entre 1000-5000)
5. Crie um ID único em snake_case sem acentos
6. Marque todos como required: true por padrão
7. Crie dicas úteis para ai_prompt_hint
8. Retorne APENAS o JSON array

FORMATO DE SAÍDA:
[
  {
    "id": "company_presentation",
    "label": "Apresentação da Empresa",
    "max_chars": 3000,
    "required": true,
    "ai_prompt_hint": "Descreva histórico, porte, setor de atuação e principais conquistas da empresa",
    "placeholder": "Descreva o histórico da empresa..."
  }
]

EXEMPLOS DE INPUT:
- "1. Apresentação da Empresa (máx 3000 caracteres)"
- "Descrição do Projeto - até 5000 chars"
- "Equipe Técnica (3000)"
- "Inovação Tecnológica"

ATENÇÃO: Retorne APENAS o JSON array, começando com [ e terminando com ]`;

    const userPrompt = `Analise este texto e extraia os campos do formulário:

${pastedText}`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = result.response;
    const rawText = response.text();

    // ========================================
    // TRACKING DE CUSTO - AI Usage Analytics
    // ========================================
    const usage = extractGeminiUsageMetadata(response)
    if (usage) {
      trackAIUsage({
        operation_type: 'text_generation',
        ai_model: MODEL_NAME,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        module_type: 'grants',
        request_metadata: {
          action: 'parse_form_fields_from_text',
          input_length: pastedText.length,
        }
      }).catch(err => {
        console.warn('[Grants] Falha no tracking de IA:', err)
      })
    }
    // ========================================

    // Sanitizar resposta da IA
    const jsonText = sanitizeAIJsonResponse(rawText);
    console.log('[AI] Resposta sanitizada, tamanho:', jsonText.length);

    // Parse JSON com tratamento de erro robusto
    type ParsedFormField = {
      id: string;
      label: string;
      max_chars: number;
      required: boolean;
      ai_prompt_hint: string;
      placeholder: string;
    };

    const fields = safeJsonParse<ParsedFormField[]>(jsonText, 'parseFormFieldsFromText');

    console.log('[AI] Campos do formulário parseados:', {
      count: fields.length,
      fields: fields.map((f) => ({ label: f.label, max_chars: f.max_chars }))
    });

    return fields;
  } catch (error) {
    console.error('Erro ao parsear campos do formulário:', error);
    throw new Error('Falha ao analisar os campos. Verifique o formato do texto.');
  }
}
