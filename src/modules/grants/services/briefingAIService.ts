/**
 * Briefing AI Service - Geração automática de briefing com IA
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BriefingData, FormField } from '../types';

/**
 * Contexto para geracao de briefing
 */
export interface BriefingGenerationContext {
  companyName?: string;
  projectIdea?: string;
  editalTitle?: string;
  editalText?: string;
  /** Conteudo do documento fonte (PDF, MD, TXT, DOCX) - PRINCIPAL FONTE DE DADOS */
  sourceDocumentContent?: string | null;
  /** Campos dinâmicos do edital para extração */
  formFields?: FormField[];
}

/**
 * Gera briefing completo automaticamente com base no documento fonte
 *
 * IMPORTANTE: Esta funcao EXTRAI informacoes do documento fonte fornecido.
 * NAO inventa dados se o documento nao for fornecido.
 *
 * @param context - Contexto incluindo o documento fonte e campos dinâmicos
 * @returns Briefing extraido do documento (Record<string, string> para campos dinâmicos)
 * @throws Error se documento fonte nao for fornecido ou API falhar
 */
export async function generateAutoBriefing(context: BriefingGenerationContext): Promise<Record<string, string>> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  // VALIDACAO CRITICA: Exigir documento fonte para evitar alucinacao
  const hasSourceDocument = context.sourceDocumentContent && context.sourceDocumentContent.trim().length > 100;
  const hasMinimalContext = context.companyName || context.projectIdea;

  if (!hasSourceDocument && !hasMinimalContext) {
    throw new Error(
      'Documento fonte obrigatório. Faça upload de um arquivo (.pdf, .md, .txt, .docx) com informações do seu projeto antes de usar o preenchimento automático.'
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // Temperatura baixa para ser mais factual e menos criativo
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4000,
      },
    });

    // Construir estrutura JSON dinâmica baseada nos campos do edital
    const formFields = context.formFields || [];
    const jsonStructure = formFields.map(field => {
      const hint = field.ai_prompt_hint || field.label;
      return `  "${field.id}": "Extrair: ${hint}"`;
    }).join(',\n');

    // System prompt focado em EXTRACAO, nao CRIACAO
    const systemPrompt = `Você é um especialista em análise de documentos para editais de fomento no Brasil.

Sua tarefa é EXTRAIR e ORGANIZAR informações de um documento fonte fornecido pelo usuário para preencher um briefing de projeto.

REGRAS CRÍTICAS - SIGA RIGOROSAMENTE:
1. APENAS EXTRAIA informações que estão EXPLICITAMENTE no documento fonte
2. NUNCA invente dados, números, nomes ou informações não presentes no documento
3. Se uma informação não estiver no documento, RETORNE UMA STRING VAZIA "" para o campo. NÃO escreva mensagens como "não encontrado".
4. Use CITAÇÕES DIRETAS do documento quando possível
5. Mantenha a linguagem original do documento
6. Retorne APENAS o JSON, sem texto adicional
${formFields.length > 0 ? `
ESTRUTURA DO JSON:
{
${jsonStructure}
}

ATENÇÃO: Respeite os limites de caracteres de cada campo:
${formFields.map(f => `- ${f.label}: máximo ${f.max_chars} caracteres${f.required ? ' (OBRIGATÓRIO)' : ''}`).join('\n')}
` : ''}
Se o campo não tiver informação no documento, retorne "".`;

    // User prompt com foco no documento fonte
    const fieldCount = formFields.length;
    const userPrompt = hasSourceDocument
      ? `DOCUMENTO FONTE DO PROJETO:
---
${context.sourceDocumentContent!.substring(0, 30000)}
${context.sourceDocumentContent!.length > 30000 ? '\n[... documento truncado por limite de tokens ...]' : ''}
---

CONTEXTO ADICIONAL:
${context.editalTitle ? `- Edital alvo: ${context.editalTitle}` : ''}
${context.editalText ? `- Requisitos do edital: ${context.editalText.substring(0, 2000)}` : ''}

INSTRUÇÃO: Analise o DOCUMENTO FONTE acima e EXTRAIA as informações para preencher cada campo do briefing.
NÃO INVENTE nenhuma informação. Se algo não estiver no documento, indique claramente.

Retorne APENAS o JSON${fieldCount > 0 ? ` com os ${fieldCount} campos` : ''}.`
      : `INFORMAÇÕES DISPONÍVEIS (sem documento fonte completo):
${context.companyName ? `- Nome/contexto da empresa: ${context.companyName}` : ''}
${context.projectIdea ? `- Ideia do projeto: ${context.projectIdea}` : ''}
${context.editalTitle ? `- Edital: ${context.editalTitle}` : ''}

ATENÇÃO: Documento fonte não foi fornecido.
Organize as poucas informações disponíveis nos campos apropriados.
Para campos sem informação, deixe vazio "".

Retorne APENAS o JSON${fieldCount > 0 ? ` com os ${fieldCount} campos` : ''}.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = result.response;
    let jsonText = response.text();

    // Limpar markdown se existir
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    const data = JSON.parse(jsonText);

    console.log('[Briefing AI] Briefing gerado com sucesso:', {
      fields: Object.keys(data).length,
      totalChars: JSON.stringify(data).length
    });

    // Log detalhado de cada campo para debug
    console.log('[Briefing AI] Campos extraídos:');
    Object.entries(data).forEach(([key, value]) => {
      const preview = typeof value === 'string'
        ? value.substring(0, 100) + (value.length > 100 ? '...' : '')
        : `[TIPO INVÁLIDO: ${typeof value}]`;
      console.log(`  - ${key}: ${preview}`);
    });

    return data as Record<string, string>;
  } catch (error) {
    console.error('Erro ao gerar briefing automático:', error);
    throw new Error('Falha ao gerar briefing. Tente preencher manualmente.');
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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2000,
      },
    });

    const fieldLabels: Record<keyof BriefingData, string> = {
      company_context: 'Contexto da Empresa',
      project_description: 'Descrição do Projeto',
      technical_innovation: 'Inovação Técnica',
      market_differential: 'Diferencial de Mercado',
      team_expertise: 'Expertise da Equipe',
      expected_results: 'Resultados Esperados',
      sustainability: 'Sustentabilidade',
      additional_notes: 'Informações Adicionais'
    };

    const prompt = `Você é um especialista em redação de projetos para editais de inovação.

TAREFA: Melhore e expanda o seguinte texto do campo "${fieldLabels[fieldId] || fieldId}":

TEXTO ATUAL:
${currentContent}

CONTEXTO ADICIONAL (outros campos preenchidos):
${JSON.stringify(allBriefing, null, 2)}

INSTRUÇÕES:
1. Expanda o texto atual para 300-500 palavras
2. Adicione detalhes técnicos e números específicos
3. Mantenha coerência com os outros campos
4. Use linguagem profissional mas acessível
5. Retorne APENAS o texto melhorado, sem introdução ou conclusão

Texto melhorado:`;

    const result = await model.generateContent(prompt);
    const improved = result.response.text().trim();

    return improved;
  } catch (error) {
    console.error('Erro ao melhorar campo:', error);
    throw new Error('Falha ao melhorar o texto.');
  }
}

// ============================================
// FORM FIELDS EXTRACTION
// ============================================

export interface ParsedFormField {
  label: string;
  maxChars?: number;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}

/**
 * Parse form fields from pasted text using AI
 * Extracts question labels, character limits, and requirements
 */
export async function parseFormFieldsFromText(text: string): Promise<ParsedFormField[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY nao configurada');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4000,
      },
    });

    const prompt = `Voce e um especialista em analise de editais de fomento brasileiros.

TAREFA: Extraia os campos/perguntas do formulario de inscricao a partir do texto abaixo.

TEXTO DO FORMULARIO:
---
${text.substring(0, 15000)}
---

INSTRUCOES:
1. Identifique cada pergunta/campo do formulario
2. Extraia o limite de caracteres se mencionado (ex: "max 3000 caracteres")
3. Identifique se e obrigatorio
4. Crie uma dica curta sobre o que responder

Retorne um JSON com array de objetos:
[
  {
    "label": "Nome da pergunta/campo",
    "maxChars": 3000,
    "required": true,
    "hint": "Dica curta sobre o que responder",
    "placeholder": "Exemplo de inicio de resposta..."
  }
]

Retorne APENAS o JSON, sem texto adicional.`;

    const result = await model.generateContent(prompt);
    let jsonText = result.response.text();

    // Clean markdown if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const fields = JSON.parse(jsonText) as ParsedFormField[];

    console.log('[BriefingAI] Parsed form fields:', fields.length);

    return fields;
  } catch (error) {
    console.error('Erro ao extrair campos do formulario:', error);
    throw new Error('Falha ao extrair campos. Tente adicionar manualmente.');
  }
}

// ============================================
// REQUIRED DOCUMENTS EXTRACTION
// ============================================

export interface ExtractedDocument {
  name: string;
  description?: string;
  dueDate?: string;
}

/**
 * Extract required documents list from edital PDF content
 */
export async function extractRequiredDocuments(pdfContent: string): Promise<ExtractedDocument[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY nao configurada');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4000,
      },
    });

    const prompt = `Voce e um especialista em analise de editais de fomento brasileiros.

TAREFA: Extraia a lista de documentos necessarios para habilitacao a partir do edital.

TEXTO DO EDITAL:
---
${pdfContent.substring(0, 20000)}
---

INSTRUCOES:
1. Identifique TODOS os documentos exigidos para inscricao/habilitacao
2. Inclua certidoes, declaracoes, comprovantes, etc.
3. Se houver prazo especifico para algum documento, inclua

Retorne um JSON com array de objetos:
[
  {
    "name": "Nome do documento (ex: Certidao Negativa de Debitos)",
    "description": "Descricao breve ou requisitos especificos",
    "dueDate": "Data limite se mencionada (formato ISO)"
  }
]

Retorne APENAS o JSON, sem texto adicional.`;

    const result = await model.generateContent(prompt);
    let jsonText = result.response.text();

    // Clean markdown if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const docs = JSON.parse(jsonText) as ExtractedDocument[];

    console.log('[BriefingAI] Extracted required documents:', docs.length);

    return docs;
  } catch (error) {
    console.error('Erro ao extrair documentos do edital:', error);
    throw new Error('Falha ao extrair documentos. Adicione manualmente.');
  }
}

// ============================================
// TIMELINE EXTRACTION
// ============================================

export interface ExtractedPhase {
  name: string;
  description?: string;
  date: string;
}

/**
 * Extract timeline phases from edital PDF content
 */
export async function extractTimelinePhases(pdfContent: string): Promise<ExtractedPhase[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY nao configurada');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4000,
      },
    });

    const prompt = `Voce e um especialista em analise de editais de fomento brasileiros.

TAREFA: Extraia o cronograma/timeline do edital com todas as datas importantes.

TEXTO DO EDITAL:
---
${pdfContent.substring(0, 20000)}
---

INSTRUCOES:
1. Identifique TODAS as fases/etapas com datas do processo
2. Inclua: inscricao, avaliacao, resultados, recursos, contratacao, etc.
3. Use formato de data ISO (YYYY-MM-DD)
4. Se houver periodo (inicio-fim), use a data final

Retorne um JSON com array de objetos ORDENADOS por data:
[
  {
    "name": "Nome da fase (ex: Submissao de Propostas)",
    "description": "Descricao breve da fase",
    "date": "2025-12-15"
  }
]

Retorne APENAS o JSON, sem texto adicional.`;

    const result = await model.generateContent(prompt);
    let jsonText = result.response.text();

    // Clean markdown if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const phases = JSON.parse(jsonText) as ExtractedPhase[];

    // Sort by date
    phases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('[BriefingAI] Extracted timeline phases:', phases.length);

    return phases;
  } catch (error) {
    console.error('Erro ao extrair cronograma do edital:', error);
    throw new Error('Falha ao extrair cronograma. Adicione manualmente.');
  }
}
