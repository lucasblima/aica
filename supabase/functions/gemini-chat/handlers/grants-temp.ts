// handlers/grants-temp.ts — Grants module handlers (temporary — until gemini-grants Edge Function)
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.21.0'
import { MODELS } from '../../_shared/gemini-helpers.ts'
import { extractJSON } from '../../_shared/model-router.ts'
import type {
  GenerateFieldContentPayload, AnalyzeEditalStructurePayload,
  ParseFormFieldsPayload, ParsedFormField,
  GenerateAutoBriefingPayload, ImproveBriefingFieldPayload,
  ExtractRequiredDocumentsPayload, ExtractTimelinePhasesPayload,
} from '../../_shared/gemini-types.ts'

// ============================================================================
// HANDLERS
// ============================================================================

export async function handleGenerateFieldContent(genAI: GoogleGenerativeAI, payload: GenerateFieldContentPayload): Promise<{ generatedText: string }> {
  const { edital_text, evaluation_criteria, field_config, briefing, previous_responses, source_document_content, edital_text_content, opportunity_documents_content } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: Math.ceil(field_config.max_chars * 2),
    },
  })

  // Build system prompt
  let systemPrompt = `Voce e um especialista em redacao de propostas para editais de fomento a inovacao no Brasil.

Sua tarefa e escrever respostas tecnicas, objetivas e persuasivas para campos de formularios de inscricao em editais.

**CONTEXTO DO EDITAL:**
${edital_text || 'Nao fornecido'}
`

  if (evaluation_criteria && evaluation_criteria.length > 0) {
    systemPrompt += `\n**CRITERIOS DE AVALIACAO:**\nOs avaliadores considerarao os seguintes criterios:\n\n`
    evaluation_criteria.forEach(c => {
      systemPrompt += `- **${c.name}** (Peso: ${c.weight}/10): ${c.description}\n`
    })
  }

  systemPrompt += `\n**DIRETRIZES:**
1. Use linguagem tecnica mas acessivel
2. Seja objetivo e direto
3. Inclua dados quantitativos quando possivel
4. Demonstre conhecimento do mercado
5. Mostre diferenciais competitivos
6. Use paragrafos curtos
`

  // Build user prompt
  let userPrompt = `**CAMPO A SER PREENCHIDO:**
${field_config.label}
${field_config.ai_prompt_hint ? `Dica: ${field_config.ai_prompt_hint}\n` : ''}Limite de caracteres: ${field_config.max_chars}

`

  if (edital_text_content && edital_text_content.trim().length > 0) {
    userPrompt += `**EDITAL OFICIAL:**\n${edital_text_content.substring(0, 20000)}\n\n`
  }

  if (opportunity_documents_content && opportunity_documents_content.trim().length > 0) {
    userPrompt += `**DOCUMENTOS DO EDITAL:**\n${opportunity_documents_content.substring(0, 15000)}\n\n`
  }

  if (source_document_content && source_document_content.trim().length > 0) {
    userPrompt += `**DOCUMENTOS DO PROJETO:**\n${source_document_content.substring(0, 15000)}\n\n`
  }

  userPrompt += `**CONTEXTO DO PROJETO:**\n\n`
  Object.entries(briefing).forEach(([fieldId, content]) => {
    if (content && content.trim().length > 0) {
      const fieldLabel = fieldId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      userPrompt += `**${fieldLabel}:**\n${content}\n\n`
    }
  })

  if (previous_responses && Object.keys(previous_responses).length > 0) {
    userPrompt += `**RESPOSTAS JA FORNECIDAS:**\n`
    Object.entries(previous_responses).forEach(([fieldId, content]) => {
      userPrompt += `${fieldId}: ${content.substring(0, 200)}...\n`
    })
    userPrompt += `\n`
  }

  userPrompt += `**TAREFA:**\nEscreva uma resposta completa e persuasiva para "${field_config.label}", respeitando o limite de ${field_config.max_chars} caracteres.\n\nSua resposta:`

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }, { text: userPrompt }] }
    ],
  })

  let generatedText = result.response.text()

  // Truncate intelligently
  if (generatedText.length > field_config.max_chars) {
    generatedText = generatedText.substring(0, field_config.max_chars - 3) + '...'
  }

  return {
    generatedText,
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleAnalyzeEditalStructure(genAI: GoogleGenerativeAI, payload: AnalyzeEditalStructurePayload): Promise<any> {
  const { editalText } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8000,
    },
  })

  const prompt = `Voce e um especialista em analise de editais de fomento a inovacao no Brasil.

Analise o edital abaixo e retorne um JSON estruturado com TODAS as informacoes.

REGRAS:
1. Retorne APENAS o JSON, sem texto adicional
2. Use aspas duplas em todas as strings
3. Todos os campos sao obrigatorios (use null se nao encontrar)
4. Datas no formato ISO: "YYYY-MM-DD"
5. Valores monetarios como numeros (sem R$)
6. IDs em snake_case sem acentos

ESTRUTURA:
{
  "title": "Titulo completo",
  "funding_agency": "Agencia (FAPERJ, FINEP, etc)",
  "program_name": "Nome do programa",
  "edital_number": "Numero (ex: 32/2025)",
  "min_funding": 375000,
  "max_funding": 600000,
  "counterpart_percentage": 5.0,
  "submission_start": "2025-01-15",
  "submission_deadline": "2025-03-31",
  "result_date": "2025-06-30",
  "eligible_themes": ["Saude", "Biotecnologia"],
  "eligibility_requirements": {
    "min_company_age_years": 2,
    "must_have_cnpj": true,
    "headquarter_location": "Rio de Janeiro"
  },
  "evaluation_criteria": [
    {
      "id": "innovation",
      "name": "Grau de Inovacao",
      "description": "Descricao",
      "weight": 30,
      "min_score": 7,
      "max_score": 10
    }
  ],
  "form_fields": [
    {
      "id": "company_presentation",
      "label": "Apresentacao da Empresa",
      "max_chars": 3000,
      "required": true,
      "ai_prompt_hint": "Descreva historico, porte, setor",
      "placeholder": "Descreva..."
    }
  ],
  "external_system_url": "https://sistema.gov.br"
}

TEXTO DO EDITAL:
${editalText.substring(0, 50000)}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const data = extractJSON(text)

  return {
    ...data,
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleParseFormFields(genAI: GoogleGenerativeAI, payload: ParseFormFieldsPayload): Promise<{ fields: ParsedFormField[] }> {
  const { text } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Voce e um especialista em analise de formularios de editais.

Parsear o texto abaixo e extraia os campos do formulario.

REGRAS:
1. Identifique TODAS as perguntas/campos
2. Extraia limite de caracteres ("max X caracteres", "ate X chars")
3. Se nao houver limite, estime entre 1000-5000
4. Crie ID em snake_case sem acentos
5. Marque required: true por padrao
6. Crie dicas uteis para ai_prompt_hint
7. Retorne APENAS o JSON array

FORMATO:
[
  {
    "id": "company_presentation",
    "label": "Apresentacao da Empresa",
    "max_chars": 3000,
    "required": true,
    "ai_prompt_hint": "Descreva historico, porte, setor",
    "placeholder": "Descreva o historico..."
  }
]

TEXTO:
${text}`

  const result = await model.generateContent(prompt)
  const jsonText = result.response.text()
  const fields = extractJSON<ParsedFormField[]>(jsonText)

  return {
    fields,
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleGenerateAutoBriefing(genAI: GoogleGenerativeAI, payload: GenerateAutoBriefingPayload): Promise<{ briefing: Record<string, string> }> {
  const { companyName, projectIdea, editalTitle, editalText, sourceDocumentContent, formFields } = payload

  const hasSourceDocument = sourceDocumentContent && sourceDocumentContent.trim().length > 100
  const hasMinimalContext = companyName || projectIdea

  if (!hasSourceDocument && !hasMinimalContext) {
    throw new Error('Documento fonte obrigatorio. Faca upload de um arquivo com informacoes do projeto.')
  }

  const model = genAI.getGenerativeModel({
    model: MODELS.smart,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4096,
    },
  })

  const jsonStructure = formFields?.map(f => `  "${f.id}": "Extrair: ${f.ai_prompt_hint || f.label}"`).join(',\n') || ''

  const systemPrompt = `Voce e um especialista em analise de documentos para editais de fomento.

Sua tarefa e EXTRAIR e ORGANIZAR informacoes do documento fonte para preencher um briefing.

REGRAS CRITICAS:
1. APENAS EXTRAIA informacoes EXPLICITAMENTE no documento
2. NUNCA invente dados ou informacoes
3. Se nao encontrar, retorne "" (string vazia)
4. Use CITACOES DIRETAS quando possivel
5. Retorne APENAS o JSON

${formFields && formFields.length > 0 ? `ESTRUTURA:\n{\n${jsonStructure}\n}` : ''}`

  const userPrompt = hasSourceDocument
    ? `DOCUMENTO FONTE:
---
${sourceDocumentContent!.substring(0, 30000)}
---

${editalTitle ? `Edital: ${editalTitle}\n` : ''}${editalText ? `Requisitos: ${editalText.substring(0, 2000)}\n` : ''}
INSTRUCAO: Analise o documento e EXTRAIA as informacoes. NAO INVENTE nada.

Retorne APENAS o JSON.`
    : `INFORMACOES DISPONIVEIS:
${companyName ? `Empresa: ${companyName}\n` : ''}${projectIdea ? `Projeto: ${projectIdea}\n` : ''}${editalTitle ? `Edital: ${editalTitle}\n` : ''}
Documento fonte nao fornecido. Organize as informacoes disponiveis.

Retorne APENAS o JSON.`

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: userPrompt }
  ])

  const jsonText = result.response.text()
  const briefing = extractJSON<Record<string, string>>(jsonText)

  return {
    briefing,
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleImproveBriefingField(genAI: GoogleGenerativeAI, payload: ImproveBriefingFieldPayload): Promise<{ improvedText: string }> {
  const { fieldId, currentContent, allBriefing } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2000,
    },
  })

  const prompt = `Voce e um especialista em redacao de projetos para editais de inovacao.

TAREFA: Melhore e expanda o texto do campo "${fieldId}":

TEXTO ATUAL:
${currentContent}

CONTEXTO ADICIONAL:
${JSON.stringify(allBriefing, null, 2)}

INSTRUCOES:
1. Expanda para 300-500 palavras
2. Adicione detalhes tecnicos e numeros
3. Mantenha coerencia com outros campos
4. Use linguagem profissional
5. Retorne APENAS o texto melhorado

Texto melhorado:`

  const result = await model.generateContent(prompt)
  const improvedText = result.response.text().trim()

  return {
    improvedText,
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleExtractRequiredDocuments(genAI: GoogleGenerativeAI, payload: ExtractRequiredDocumentsPayload): Promise<{ documents: Array<{ name: string; description?: string; dueDate?: string }> }> {
  const { pdfContent } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Analise o edital e extraia TODOS os documentos exigidos.

TEXTO:
${pdfContent.substring(0, 20000)}

FORMATO:
[
  {
    "name": "Certidao Negativa de Debitos",
    "description": "Descricao",
    "dueDate": "2025-12-31"
  }
]

Retorne APENAS o JSON.`

  const result = await model.generateContent(prompt)
  const jsonText = result.response.text()
  const documents = extractJSON(jsonText)

  return {
    documents,
    __usageMetadata: result.response.usageMetadata
  }
}

export async function handleExtractTimelinePhases(genAI: GoogleGenerativeAI, payload: ExtractTimelinePhasesPayload): Promise<{ phases: Array<{ name: string; description?: string; date: string }> }> {
  const { pdfContent } = payload

  const model = genAI.getGenerativeModel({
    model: MODELS.fast,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 4096,
    },
  })

  const prompt = `Extraia o cronograma/timeline do edital com TODAS as datas.

TEXTO:
${pdfContent.substring(0, 20000)}

FORMATO (ORDENADO por data):
[
  {
    "name": "Submissao de Propostas",
    "description": "Descricao",
    "date": "2025-12-15"
  }
]

Use formato ISO (YYYY-MM-DD). Retorne APENAS o JSON.`

  const result = await model.generateContent(prompt)
  const jsonText = result.response.text()
  const phases = extractJSON(jsonText)

  // Sort by date
  phases.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return {
    phases,
    __usageMetadata: result.response.usageMetadata
  }
}
